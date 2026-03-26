-------------------------------------------------------------------------
-- Add conversation threading to contact_messages
-------------------------------------------------------------------------

-- conversation_id links all messages in a thread
-- direction: 'inbound' = contactor→poster, 'outbound' = poster→contactor
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS conversation_id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inbound';

CREATE INDEX IF NOT EXISTS idx_contact_messages_conversation
  ON public.contact_messages (conversation_id, created_at);

-------------------------------------------------------------------------
-- Rewrite: send_contact_message — set direction on initial message
-------------------------------------------------------------------------
DROP FUNCTION IF EXISTS send_contact_message(uuid, text, text, text);

CREATE OR REPLACE FUNCTION send_contact_message(
  p_item_id uuid,
  p_sender_name text,
  p_sender_email text,
  p_message text
)
RETURNS json AS $$
DECLARE
  v_poster_email text;
  v_item_title text;
  v_item_type text;
  v_item_status text;
  v_recent_count_item integer;
  v_recent_count_sender integer;
  v_message_id uuid;
  v_reply_token text;
  v_conversation_id uuid;
BEGIN
  SELECT contact_value, title, type, status
  INTO v_poster_email, v_item_title, v_item_type, v_item_status
  FROM public.items
  WHERE id = p_item_id;

  IF v_poster_email IS NULL OR v_item_status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'item_not_found');
  END IF;

  SELECT count(*) INTO v_recent_count_item
  FROM public.contact_messages
  WHERE item_id = p_item_id
    AND created_at > now() - interval '24 hours';

  IF v_recent_count_item >= 10 THEN
    RETURN json_build_object('success', false, 'error', 'rate_limited');
  END IF;

  SELECT count(*) INTO v_recent_count_sender
  FROM public.contact_messages
  WHERE sender_email = p_sender_email
    AND created_at > now() - interval '24 hours';

  IF v_recent_count_sender >= 20 THEN
    RETURN json_build_object('success', false, 'error', 'rate_limited');
  END IF;

  v_conversation_id := gen_random_uuid();

  INSERT INTO public.contact_messages (item_id, sender_name, sender_email, message, conversation_id, direction)
  VALUES (p_item_id, p_sender_name, p_sender_email, p_message, v_conversation_id, 'inbound')
  RETURNING id, reply_token INTO v_message_id, v_reply_token;

  PERFORM _dispatch_email(json_build_object(
    'type', 'contact_notification',
    'posterEmail', v_poster_email,
    'senderName', p_sender_name,
    'message', p_message,
    'itemTitle', v_item_title,
    'itemType', v_item_type,
    'itemId', p_item_id,
    'replyToken', v_reply_token
  ));

  RETURN json_build_object(
    'success', true,
    'message_id', v_message_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------------------------------------------------------
-- Rewrite: reply_to_message — creates new message row with fresh token
-------------------------------------------------------------------------
DROP FUNCTION IF EXISTS reply_to_message(text, text);

CREATE OR REPLACE FUNCTION reply_to_message(
  p_reply_token text,
  p_reply_text text
)
RETURNS json AS $$
DECLARE
  v_msg record;
  v_new_reply_token text;
  v_new_direction text;
  v_recipient_email text;
  v_recipient_name text;
BEGIN
  -- Get the message this token belongs to
  SELECT cm.*, i.title AS item_title, i.type AS item_type,
         i.contact_value AS poster_email, i.id AS iid
  INTO v_msg
  FROM public.contact_messages cm
  JOIN public.items i ON i.id = cm.item_id
  WHERE cm.reply_token = p_reply_token
    AND cm.replied_at IS NULL
    AND cm.created_at > now() - interval '30 days';

  IF v_msg IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found_or_already_replied');
  END IF;

  -- Mark the current message as replied
  UPDATE public.contact_messages
  SET replied_at = now()
  WHERE reply_token = p_reply_token;

  -- Determine direction and recipient for the new message
  IF v_msg.direction = 'inbound' THEN
    -- Poster is replying to contactor
    v_new_direction := 'outbound';
    v_recipient_email := v_msg.sender_email;
    v_recipient_name := v_msg.sender_name;
  ELSE
    -- Contactor is replying back to poster
    v_new_direction := 'inbound';
    v_recipient_email := v_msg.poster_email;
    v_recipient_name := NULL;
  END IF;

  -- Insert new message in the same conversation with a fresh reply_token
  INSERT INTO public.contact_messages (
    item_id, sender_name, sender_email, message,
    conversation_id, direction
  )
  VALUES (
    v_msg.item_id,
    CASE WHEN v_new_direction = 'outbound' THEN 'Poster' ELSE v_msg.sender_name END,
    CASE WHEN v_new_direction = 'outbound' THEN v_msg.poster_email ELSE v_msg.sender_email END,
    p_reply_text,
    v_msg.conversation_id,
    v_new_direction
  )
  RETURNING reply_token INTO v_new_reply_token;

  -- Dispatch email to the recipient with the new reply token
  PERFORM _dispatch_email(json_build_object(
    'type', 'reply_notification',
    'recipient_email', v_recipient_email,
    'sender_name', CASE WHEN v_msg.direction = 'inbound' THEN 'Poster' ELSE v_msg.sender_name END,
    'item_id', v_msg.item_id,
    'item_title', v_msg.item_title,
    'reply_text', p_reply_text,
    'replyToken', v_new_reply_token
  ));

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------------------------------------------------------
-- Rewrite: get_message_by_token — return conversation history
-------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_message_by_token(text);

CREATE OR REPLACE FUNCTION get_message_by_token(p_reply_token text)
RETURNS json AS $$
DECLARE
  v_msg record;
  v_history json;
BEGIN
  -- Get the target message
  SELECT cm.id, cm.sender_name, cm.message, cm.created_at, cm.replied_at,
         cm.conversation_id, cm.direction,
         i.id AS item_id, i.title AS item_title, i.type AS item_type
  INTO v_msg
  FROM public.contact_messages cm
  JOIN public.items i ON i.id = cm.item_id
  WHERE cm.reply_token = p_reply_token
    AND cm.created_at > now() - interval '30 days';

  IF v_msg IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Get conversation history (all replied messages in same conversation)
  SELECT json_agg(row_to_json(h) ORDER BY h.created_at)
  INTO v_history
  FROM (
    SELECT cm.sender_name, cm.message, cm.created_at, cm.direction
    FROM public.contact_messages cm
    WHERE cm.conversation_id = v_msg.conversation_id
      AND cm.replied_at IS NOT NULL
  ) h;

  RETURN json_build_object(
    'success', true,
    'message_id', v_msg.id,
    'sender_name', v_msg.sender_name,
    'message', v_msg.message,
    'created_at', v_msg.created_at,
    'replied_at', v_msg.replied_at,
    'direction', v_msg.direction,
    'item_id', v_msg.item_id,
    'item_title', v_msg.item_title,
    'item_type', v_msg.item_type,
    'history', COALESCE(v_history, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

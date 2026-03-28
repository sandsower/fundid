-------------------------------------------------------------------------
-- Final messaging model:
-- - Any token in a conversation gives full read-write access
-- - Poster's first reply opens the channel
-- - Max 3 unreplied messages per party per conversation
-- - Conversations live until the item is resolved
-- - Each conversation is isolated
-------------------------------------------------------------------------

DROP FUNCTION IF EXISTS reply_to_message(text, text);

CREATE OR REPLACE FUNCTION reply_to_message(
  p_reply_token text,
  p_reply_text text
)
RETURNS json AS $$
DECLARE
  v_msg record;
  v_contactor_email text;
  v_contactor_name text;
  v_poster_email text;
  v_item_status text;
  v_token_direction text;
  v_new_direction text;
  v_recipient_email text;
  v_sender_label text;
  v_sender_email text;
  v_unreplied_count integer;
  v_new_reply_token text;
BEGIN
  -- Get the message this token belongs to, with item info
  SELECT cm.*, i.title AS item_title, i.type AS item_type,
         i.contact_value AS poster_email, i.status AS item_status
  INTO v_msg
  FROM public.contact_messages cm
  JOIN public.items i ON i.id = cm.item_id
  WHERE cm.reply_token = p_reply_token;

  IF v_msg IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Block if item is resolved
  IF v_msg.item_status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'item_resolved');
  END IF;

  -- Token expiry: 30 days from the token's message creation
  IF v_msg.created_at < now() - interval '30 days' THEN
    RETURN json_build_object('success', false, 'error', 'expired');
  END IF;

  -- Get the original contactor info from the first inbound message
  SELECT cm.sender_email, cm.sender_name
  INTO v_contactor_email, v_contactor_name
  FROM public.contact_messages cm
  WHERE cm.conversation_id = v_msg.conversation_id
    AND cm.direction = 'inbound'
  ORDER BY cm.created_at ASC
  LIMIT 1;

  v_poster_email := v_msg.poster_email;

  -- The person using this token is the RECIPIENT of v_msg.
  -- v_msg.direction tells us who sent the message this token is on.
  -- If v_msg.direction = 'inbound' (contactor sent it), the poster is using this token.
  -- If v_msg.direction = 'outbound' (poster sent it), the contactor is using this token.
  IF v_msg.direction = 'inbound' THEN
    -- Poster is replying
    v_new_direction := 'outbound';
    v_recipient_email := v_contactor_email;
    v_sender_label := 'Poster';
    v_sender_email := v_poster_email;
  ELSE
    -- Contactor is replying
    v_new_direction := 'inbound';
    v_recipient_email := v_poster_email;
    v_sender_label := v_contactor_name;
    v_sender_email := v_contactor_email;
  END IF;

  -- Rate limit: max 3 unreplied messages per party per conversation
  -- Count consecutive messages with this direction that haven't been "answered"
  SELECT count(*) INTO v_unreplied_count
  FROM public.contact_messages cm
  WHERE cm.conversation_id = v_msg.conversation_id
    AND cm.direction = v_new_direction
    AND cm.created_at > COALESCE(
      (SELECT max(cm2.created_at)
       FROM public.contact_messages cm2
       WHERE cm2.conversation_id = v_msg.conversation_id
         AND cm2.direction != v_new_direction),
      '1970-01-01'::timestamptz
    );

  IF v_unreplied_count >= 3 THEN
    RETURN json_build_object('success', false, 'error', 'rate_limited');
  END IF;

  -- Insert new message with fresh reply_token
  INSERT INTO public.contact_messages (
    item_id, sender_name, sender_email, message,
    conversation_id, direction
  )
  VALUES (
    v_msg.item_id,
    v_sender_label,
    v_sender_email,
    p_reply_text,
    v_msg.conversation_id,
    v_new_direction
  )
  RETURNING reply_token INTO v_new_reply_token;

  -- Mark the used token's message as replied (informational only)
  UPDATE public.contact_messages
  SET replied_at = now()
  WHERE reply_token = p_reply_token
    AND replied_at IS NULL;

  -- Dispatch email to the other party
  PERFORM _dispatch_email(json_build_object(
    'type', 'reply_notification',
    'recipient_email', v_recipient_email,
    'sender_name', v_sender_label,
    'item_id', v_msg.item_id,
    'item_title', v_msg.item_title,
    'reply_text', p_reply_text,
    'replyToken', v_new_reply_token
  ));

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------------------------------------------------------
-- Rewrite: get_message_by_token — show full conversation, no replied_at gate
-------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_message_by_token(text);

CREATE OR REPLACE FUNCTION get_message_by_token(p_reply_token text)
RETURNS json AS $$
DECLARE
  v_msg record;
  v_history json;
  v_item_status text;
BEGIN
  -- Get the target message and item status
  SELECT cm.id, cm.sender_name, cm.message, cm.created_at, cm.replied_at,
         cm.conversation_id, cm.direction,
         i.id AS item_id, i.title AS item_title, i.type AS item_type, i.status AS item_status
  INTO v_msg
  FROM public.contact_messages cm
  JOIN public.items i ON i.id = cm.item_id
  WHERE cm.reply_token = p_reply_token;

  IF v_msg IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Get full conversation history
  SELECT json_agg(row_to_json(h) ORDER BY h.created_at)
  INTO v_history
  FROM (
    SELECT cm.sender_name, cm.message, cm.created_at, cm.direction
    FROM public.contact_messages cm
    WHERE cm.conversation_id = v_msg.conversation_id
    ORDER BY cm.created_at
  ) h;

  RETURN json_build_object(
    'success', true,
    'message_id', v_msg.id,
    'sender_name', v_msg.sender_name,
    'message', v_msg.message,
    'created_at', v_msg.created_at,
    'direction', v_msg.direction,
    'item_id', v_msg.item_id,
    'item_title', v_msg.item_title,
    'item_type', v_msg.item_type,
    'item_status', v_msg.item_status,
    'history', COALESCE(v_history, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

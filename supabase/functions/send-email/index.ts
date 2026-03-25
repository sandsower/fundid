const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = 'Fundið <noreply@fundid.is>';
const SITE_URL = Deno.env.get('SITE_URL') || 'https://fundid.is';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();

    if (body.type === 'claim_code') {
      return await sendClaimCodeEmail(body);
    } else if (body.type === 'contact_notification') {
      return await sendContactNotification(body);
    } else if (body.type === 'reply_notification') {
      return await sendReplyNotification(body);
    }

    return new Response(JSON.stringify({ error: 'unknown type' }), { status: 400 });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});

async function sendClaimCodeEmail(body: {
  to: string;
  claimCode: string;
  itemTitle: string;
  itemId: string;
}) {
  const resolveUrl = `${SITE_URL}/item/${body.itemId}/resolve?code=${encodeURIComponent(body.claimCode)}`;

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="display: inline-block; width: 40px; height: 40px; background: #f59e0b; border-radius: 8px; color: white; font-weight: bold; font-size: 18px; line-height: 40px;">F</span>
      </div>

      <h1 style="font-size: 20px; color: #1a1a1a; margin: 0 0 8px;">Your claim code</h1>
      <p style="font-size: 14px; color: #737373; margin: 0 0 24px;">
        You posted <strong>"${escapeHtml(body.itemTitle)}"</strong> on Fundið. Save this code to manage your listing.
      </p>

      <div style="background: #fafafa; border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <p style="font-family: monospace; font-size: 22px; font-weight: bold; letter-spacing: 3px; color: #1a1a1a; margin: 0;">
          ${body.claimCode}
        </p>
      </div>

      <p style="font-size: 14px; color: #737373; margin: 0 0 24px;">
        When the item is returned, click the button below or enter your code on the item page to mark it as resolved.
      </p>

      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${resolveUrl}" style="display: inline-block; background: #22c55e; color: white; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
          Mark as resolved
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
      <p style="font-size: 12px; color: #a3a3a3; margin: 0;">
        You received this because you posted an item on fundid.is. We'll never send you anything else.
      </p>
    </div>
  `;

  return await sendEmail(body.to, `Your Fundið claim code: ${body.claimCode}`, html);
}

async function sendContactNotification(body: {
  posterEmail: string;
  senderName: string;
  message: string;
  itemTitle: string;
  itemType: string;
  itemId: string;
  replyToken: string;
}) {
  const replyUrl = `${SITE_URL}/reply/${body.replyToken}`;
  const itemUrl = `${SITE_URL}/item/${body.itemId}`;

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="display: inline-block; width: 40px; height: 40px; background: #f59e0b; border-radius: 8px; color: white; font-weight: bold; font-size: 18px; line-height: 40px;">F</span>
      </div>

      <h1 style="font-size: 20px; color: #1a1a1a; margin: 0 0 8px;">New message about "${escapeHtml(body.itemTitle)}"</h1>
      <p style="font-size: 14px; color: #737373; margin: 0 0 24px;">
        <strong>${escapeHtml(body.senderName)}</strong> sent you a message through Fundið.
      </p>

      <div style="background: #fafafa; border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 14px; color: #1a1a1a; margin: 0; white-space: pre-wrap;">${escapeHtml(body.message)}</p>
      </div>

      <p style="font-size: 14px; color: #737373; margin: 0 0 24px;">
        If you'd like to respond, click the button below. Your email will not be shared.
      </p>

      <div style="text-align: center; margin-bottom: 16px;">
        <a href="${replyUrl}" style="display: inline-block; background: #f59e0b; color: white; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
          Reply on Fundið
        </a>
      </div>

      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${itemUrl}" style="font-size: 13px; color: #d97706; text-decoration: none;">View listing</a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
      <p style="font-size: 12px; color: #a3a3a3; margin: 0;">
        You received this because someone responded to your listing on fundid.is. We'll never send you anything else.
      </p>
    </div>
  `;

  return await sendEmail(
    body.posterEmail,
    `New message about your ${body.itemType} item: ${escapeHtml(body.itemTitle)}`,
    html
  );
}

async function sendReplyNotification(body: {
  sender_email: string;
  sender_name: string;
  item_id: string;
  item_title: string;
  reply_text: string;
}) {
  const itemUrl = `${SITE_URL}/item/${body.item_id}`;

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="display: inline-block; width: 40px; height: 40px; background: #f59e0b; border-radius: 8px; color: white; font-weight: bold; font-size: 18px; line-height: 40px;">F</span>
      </div>

      <h1 style="font-size: 20px; color: #1a1a1a; margin: 0 0 8px;">Reply about "${escapeHtml(body.item_title)}"</h1>
      <p style="font-size: 14px; color: #737373; margin: 0 0 24px;">
        The poster replied to your message through Fundið.
      </p>

      <div style="background: #fafafa; border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 14px; color: #1a1a1a; margin: 0; white-space: pre-wrap;">${escapeHtml(body.reply_text)}</p>
      </div>

      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${itemUrl}" style="display: inline-block; background: #1a1a1a; color: white; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
          View listing
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
      <p style="font-size: 12px; color: #a3a3a3; margin: 0;">
        You received this because you contacted a listing on fundid.is. We'll never send you anything else.
      </p>
    </div>
  `;

  return await sendEmail(
    body.sender_email,
    `Reply about: ${escapeHtml(body.item_title)}`,
    html
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html })
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

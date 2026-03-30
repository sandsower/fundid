import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

const RATE_LIMIT = 3;
const RATE_WINDOW = 3600;

export const POST: RequestHandler = async ({ request, platform }) => {
	const serviceRoleKey = platform?.env?.SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceRoleKey) {
		return json({ error: 'server_error' }, { status: 500 });
	}

	const kv = platform?.env?.RATE_LIMIT;
	const ip = request.headers.get('cf-connecting-ip') || 'unknown';
	const rlKey = `support:${ip}`;

	// Rate limiting
	if (kv) {
		try {
			const val = await kv.get(rlKey);
			const count = val ? parseInt(val, 10) : 0;
			if (count >= RATE_LIMIT) {
				return json({ error: 'rate_limited' }, { status: 429 });
			}
			await kv.put(rlKey, String(count + 1), { expirationTtl: RATE_WINDOW });
		} catch (e) {
			console.error('Rate limit check failed:', (e as Error).message);
		}
	}

	const body = await request.json().catch(() => null);
	if (!body) return json({ error: 'invalid_body' }, { status: 400 });

	const { item_id, email } = body;
	if (!item_id || !email?.trim()) {
		return json({ error: 'missing_fields' }, { status: 400 });
	}

	const supabase = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey);

	// Verify the item exists
	const { data: item, error: itemError } = await supabase
		.from('items')
		.select('id, title, contact_value, status')
		.eq('id', item_id)
		.single();

	if (itemError || !item) {
		return json({ error: 'item_not_found' }, { status: 404 });
	}

	// Send support email to admin via Supabase edge function
	const { error: rpcError } = await supabase.rpc('send_support_request', {
		p_item_id: item_id,
		p_requester_email: email.trim(),
		p_item_title: item.title,
		p_matches_contact: item.contact_value === email.trim()
	});

	if (rpcError) {
		console.error('send_support_request failed:', rpcError.message);
		return json({ error: 'send_failed' }, { status: 500 });
	}

	return json({ success: true });
};

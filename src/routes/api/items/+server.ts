import { json, error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';
import type { ItemType, ItemCategory } from '$types/item';

const RATE_LIMIT = 5;
const RATE_WINDOW = 3600; // 1 hour

const VALID_TYPES: ItemType[] = ['lost', 'found'];
const VALID_CATEGORIES: ItemCategory[] = [
	'phone', 'wallet', 'keys', 'bag', 'glasses', 'clothing',
	'jewelry', 'documents', 'electronics', 'pet', 'bicycle', 'other'
];

const URL_PATTERN = /https?:\/\/|www\./i;

function generateClaimCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars — divides 256 evenly, no modulo bias
	const segment = () => {
		const bytes = new Uint8Array(4);
		crypto.getRandomValues(bytes);
		return Array.from(bytes, (b) => chars[b % chars.length]).join('');
	};
	return `SKILAD-${segment()}-${segment()}`;
}

async function hashClaimCode(code: string): Promise<string> {
	const normalized = code.toUpperCase().trim();
	const encoded = new TextEncoder().encode(normalized);
	const buffer = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const serviceRoleKey = platform?.env?.SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceRoleKey) throw error(503, 'Service not available');

	// Rate limit: single read, check, validate, then increment with cached count
	const kv = platform?.env?.RATE_LIMIT;
	const ip = request.headers.get('cf-connecting-ip') || 'unknown';
	const rlKey = kv ? `items:${ip}` : '';
	const rlCount = kv ? parseInt((await kv.get(rlKey)) || '0') : 0;
	if (kv && rlCount >= RATE_LIMIT) {
		return json({ error: 'rate_limited' }, { status: 429 });
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	// Honeypot check — silent rejection
	if (body.website) {
		return json({ error: 'submission_failed' }, { status: 400 });
	}

	// Validate required fields
	const type = body.type as string;
	const category = body.category as string;
	const title = body.title as string | undefined;
	const description = body.description as string | undefined;
	const image_url = body.image_url as string | undefined;
	const latitude = body.latitude;
	const longitude = body.longitude;
	const location_name = body.location_name as string | undefined;
	const date_occurred = body.date_occurred as string | undefined;
	const contact_value = body.contact_value as string | undefined;

	if (!title?.trim() || !location_name?.trim() || !contact_value?.trim()) {
		return json({ error: 'missing_fields' }, { status: 400 });
	}

	if (!VALID_TYPES.includes(type as ItemType)) {
		return json({ error: 'invalid_type' }, { status: 400 });
	}

	if (!VALID_CATEGORIES.includes(category as ItemCategory)) {
		return json({ error: 'invalid_category' }, { status: 400 });
	}

	if (typeof latitude !== 'number' || typeof longitude !== 'number') {
		return json({ error: 'invalid_location' }, { status: 400 });
	}

	// URL detection in text fields
	if (URL_PATTERN.test(title) || URL_PATTERN.test(description || '') || URL_PATTERN.test(location_name)) {
		return json({ error: 'url_detected' }, { status: 400 });
	}

	// Increment rate limit after validation passes (uses cached count, single write)
	try {
		if (kv) await kv.put(rlKey, String(rlCount + 1), { expirationTtl: RATE_WINDOW });
	} catch (e) {
		console.error('Rate limit increment failed:', (e as Error).message);
	}

	// Generate claim code server-side
	const claimCode = generateClaimCode();
	const claimCodeHash = await hashClaimCode(claimCode);

	const supabase = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey);

	const { data, error: insertError } = await supabase
		.from('items')
		.insert({
			type,
			category,
			title: title.trim(),
			description: (description || '').trim(),
			image_url: image_url || null,
			latitude,
			longitude,
			location_name: location_name.trim(),
			date_occurred: date_occurred || new Date().toISOString().split('T')[0],
			contact_method: 'email',
			contact_value: contact_value.trim(),
			claim_code_hash: claimCodeHash,
			status: 'active'
		})
		.select('id')
		.single();

	if (insertError) {
		console.error('Item insert failed:', insertError.message);
		return json({ error: 'submission_failed' }, { status: 500 });
	}

	// Send claim code email — surface failure so client can warn user
	let claimCodeSent = true;
	const { error: rpcError } = await supabase.rpc('send_claim_code_email', {
		p_item_id: data.id,
		p_to_email: contact_value.trim(),
		p_claim_code: claimCode,
		p_item_title: title.trim()
	});
	if (rpcError) {
		console.error('send_claim_code_email failed for item', data.id, rpcError.message);
		claimCodeSent = false;
	}

	return json({ id: data.id, claim_code_sent: claimCodeSent });
};

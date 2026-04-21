import { json, error } from '@sveltejs/kit';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_IMAGE_BASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import type { ItemType, ItemCategory } from '$types/item';
import { hashInstitutionToken } from '$utils/institution-token';
import { verifyUploadToken } from '$utils/upload-signing';

const RATE_LIMIT = 5;
const RATE_WINDOW = 3600; // 1 hour

const VALID_TYPES: ItemType[] = ['lost', 'found'];
const VALID_CATEGORIES: ItemCategory[] = [
	'phone', 'wallet', 'keys', 'bag', 'glasses', 'clothing',
	'jewelry', 'documents', 'electronics', 'pet', 'bicycle', 'other'
];
// Pets route through dyr's flow; institutional submissions must not land in
// the pet pipeline without pet_details. Keep in sync with report/inst UI.
const INSTITUTIONAL_CATEGORIES: ItemCategory[] = VALID_CATEGORIES.filter((c) => c !== 'pet');

const URL_PATTERN = /https?:\/\/|www\./i;

// Reject image URLs that don't point at our R2 bucket. The audit page renders
// these images; an external URL would leak the audit_slug via Referer.
function isTrustedImageUrl(url: string | undefined | null): boolean {
	if (!url) return true; // no image is fine
	const base = PUBLIC_IMAGE_BASE_URL?.replace(/\/+$/, '');
	if (!base) return false;
	return url.startsWith(`${base}/`);
}

// Prove the caller uploaded this R2 key via /api/upload by verifying the HMAC
// they were given at upload time AND that the object still exists in R2.
// The HMAC gate blocks cross-item photo spoofing (attaching someone else's
// image to your own item). The existence check blocks the race between the
// retention worker's 24h orphan sweep and a stale form submission: without
// it, a user who uploads and submits > 24h later would create an item whose
// image_url points at a deleted object.
async function verifyImageOwnership(
	image_url: string | undefined,
	upload_token: unknown,
	secret: string,
	bucket: App.Platform['env']['ITEM_IMAGES'] | undefined
): Promise<boolean> {
	if (!image_url) return true; // no image to own
	if (typeof upload_token !== 'string' || !upload_token) return false;
	const base = PUBLIC_IMAGE_BASE_URL?.replace(/\/+$/, '');
	if (!base || !image_url.startsWith(`${base}/`)) return false;
	const key = image_url.slice(base.length + 1);
	if (!key) return false;
	if (!(await verifyUploadToken(key, upload_token, secret))) return false;
	if (!bucket) return true; // dev/test without R2: fall back to HMAC-only
	try {
		const head = await bucket.head(key);
		return head !== null;
	} catch (e) {
		console.error('R2 head failed for', key, (e as Error).message);
		return false;
	}
}

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

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
	const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ secret, response: token, remoteip: ip })
	});
	const data = await res.json() as { success: boolean };
	return data.success;
}

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const serviceRoleKey = platform?.env?.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
	const turnstileSecret = platform?.env?.TURNSTILE_SECRET_KEY ?? env.TURNSTILE_SECRET_KEY;
	if (!serviceRoleKey || !turnstileSecret) throw error(503, 'Service not available');

	const ip = request.headers.get('cf-connecting-ip') || 'unknown';

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	const supabase = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey);

	const turnstileToken = body['cf-turnstile-response'] as string;
	if (!turnstileToken || !(await verifyTurnstile(turnstileToken, turnstileSecret, ip))) {
		return json({ error: 'turnstile_failed' }, { status: 403 });
	}

	// Honeypot — silent rejection. The 24h orphan sweep reclaims any R2 key
	// that never gets referenced by an items row.
	if (body.website) {
		return json({ error: 'submission_failed' }, { status: 400 });
	}

	// Institutional submissions carry `inst` (slug). The bearer token rides on
	// an HttpOnly cookie seeded by `/report/inst` after QR validation; the
	// browser never sees the plaintext. Body `t` stays supported for CLI/Hurl
	// flows that can't carry cookies.
	const instSlug = typeof body.inst === 'string' ? body.inst.trim() : '';
	const bodyToken = typeof body.t === 'string' ? body.t.trim() : '';
	const cookieToken = instSlug ? cookies.get(`inst_session_${instSlug}`) ?? '' : '';
	const instToken = bodyToken || cookieToken;
	if (instSlug) {
		if (!instToken) {
			return json({ error: 'invalid_institution' }, { status: 403 });
		}
		return await handleInstitutionalSubmission(supabase, body, instSlug, instToken, platform, serviceRoleKey);
	}

	return await handlePeerSubmission(supabase, body, platform, ip, serviceRoleKey);
};

async function handlePeerSubmission(
	supabase: SupabaseClient,
	body: Record<string, unknown>,
	platform: App.Platform | undefined,
	ip: string,
	serviceRoleKey: string
) {
	// Rate limit: single read, check, validate, then increment with cached count
	const kv = platform?.env?.RATE_LIMIT;
	const rlKey = kv ? `items:${ip}` : '';
	const rlCount = kv ? parseInt((await kv.get(rlKey)) || '0') : 0;
	if (kv && rlCount >= RATE_LIMIT) {
		return json({ error: 'rate_limited' }, { status: 429 });
	}

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

	if (URL_PATTERN.test(title) || URL_PATTERN.test(description || '') || URL_PATTERN.test(location_name)) {
		return json({ error: 'url_detected' }, { status: 400 });
	}

	if (!(await verifyImageOwnership(image_url, body.upload_token, serviceRoleKey, platform?.env?.ITEM_IMAGES))) {
		return json({ error: 'invalid_upload' }, { status: 400 });
	}

	try {
		if (kv) await kv.put(rlKey, String(rlCount + 1), { expirationTtl: RATE_WINDOW });
	} catch (e) {
		console.error('Rate limit increment failed:', (e as Error).message);
	}

	const claimCode = generateClaimCode();
	const claimCodeHash = await hashClaimCode(claimCode);

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
}

async function handleInstitutionalSubmission(
	supabase: SupabaseClient,
	body: Record<string, unknown>,
	slug: string,
	token: string,
	platform: App.Platform | undefined,
	serviceRoleKey: string
) {
	const { data: inst, error: instError } = await supabase
		.from('institutions')
		.select('id, token_hash')
		.eq('slug', slug)
		.maybeSingle();

	if (instError || !inst) {
		return json({ error: 'invalid_institution' }, { status: 403 });
	}

	const tokenHash = await hashInstitutionToken(token);
	if (tokenHash !== inst.token_hash) {
		return json({ error: 'invalid_institution' }, { status: 403 });
	}

	const category = body.category as string;
	const title = body.title as string | undefined;
	const description = body.description as string | undefined;
	const image_url = body.image_url as string | undefined;

	// Reject image URLs that don't point at our R2 bucket — the audit page
	// would leak audit_slug via Referer if it rendered an external image.
	if (!isTrustedImageUrl(image_url)) {
		return json({ error: 'invalid_image_url' }, { status: 400 });
	}

	if (!title?.trim()) {
		return json({ error: 'missing_fields' }, { status: 400 });
	}

	if (!INSTITUTIONAL_CATEGORIES.includes(category as ItemCategory)) {
		return json({ error: 'invalid_category' }, { status: 400 });
	}

	if (URL_PATTERN.test(title) || URL_PATTERN.test(description || '')) {
		return json({ error: 'url_detected' }, { status: 400 });
	}

	if (!(await verifyImageOwnership(image_url, body.upload_token, serviceRoleKey, platform?.env?.ITEM_IMAGES))) {
		return json({ error: 'invalid_upload' }, { status: 400 });
	}

	const { data: rpcData, error: rpcError } = await supabase.rpc('insert_institutional_item', {
		p_institution_id: inst.id,
		p_category: category,
		p_title: title.trim(),
		p_description: (description || '').trim(),
		p_image_url: image_url || ''
	});

	if (rpcError) {
		console.error('insert_institutional_item failed:', rpcError.message);
		return json({ error: 'submission_failed' }, { status: 500 });
	}

	const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
	if (!row) {
		return json({ error: 'submission_failed' }, { status: 500 });
	}
	if (row.rate_limited) {
		return json({ error: 'rate_limited' }, { status: 429 });
	}
	if (!row.item_id) {
		return json({ error: 'invalid_institution' }, { status: 403 });
	}

	return json({ id: row.item_id, institutional: true });
}

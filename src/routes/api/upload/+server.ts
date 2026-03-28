import { json, error } from '@sveltejs/kit';
import { PUBLIC_IMAGE_BASE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif'];
const RATE_LIMIT = 10; // max uploads per window
const RATE_WINDOW = 3600; // 1 hour in seconds

export const POST: RequestHandler = async ({ request, platform }) => {
	const bucket = platform?.env?.ITEM_IMAGES;
	if (!bucket) throw error(503, 'Storage not available');

	// Rate limit by IP
	const kv = platform?.env?.RATE_LIMIT;
	const ip = request.headers.get('cf-connecting-ip') || 'unknown';
	if (kv) {
		const key = `upload:${ip}`;
		const count = parseInt((await kv.get(key)) || '0');
		if (count >= RATE_LIMIT) throw error(429, 'Too many uploads, try again later');
		await kv.put(key, String(count + 1), { expirationTtl: RATE_WINDOW });
	}

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) throw error(400, 'Missing file');
	if (!ALLOWED_TYPES.includes(file.type)) throw error(400, 'Invalid file type');
	if (file.size > MAX_SIZE) throw error(400, 'File too large (max 2MB)');

	const key = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

	await bucket.put(key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type }
	});

	return json({ url: `${PUBLIC_IMAGE_BASE_URL}/${key}` });
};

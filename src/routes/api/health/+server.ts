import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY } from '$env/static/public';

export const GET: RequestHandler = async ({ platform }) => {
	const start = Date.now();
	const checks: Record<string, { ok: boolean; ms: number; error?: string }> = {};

	// Supabase DB: simple count query
	const dbStart = Date.now();
	try {
		const sb = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
		const { count, error } = await sb
			.from('items')
			.select('*', { count: 'exact', head: true })
			.eq('status', 'active');

		checks.database = {
			ok: !error,
			ms: Date.now() - dbStart,
			...(error && { error: error.message })
		};
	} catch (e) {
		checks.database = { ok: false, ms: Date.now() - dbStart, error: String(e) };
	}

	// R2 Storage: list bucket
	const storageStart = Date.now();
	try {
		const bucket = platform?.env?.ITEM_IMAGES;
		if (!bucket) throw new Error('R2 binding not available');
		await bucket.list({ limit: 1 });

		checks.storage = { ok: true, ms: Date.now() - storageStart };
	} catch (e) {
		checks.storage = { ok: false, ms: Date.now() - storageStart, error: String(e) };
	}

	// Check platform bindings availability
	const bindings = {
		ITEM_IMAGES: !!platform?.env?.ITEM_IMAGES,
		RATE_LIMIT: !!platform?.env?.RATE_LIMIT,
		SUPABASE_SERVICE_ROLE_KEY: !!platform?.env?.SUPABASE_SERVICE_ROLE_KEY
	};

	const allOk = Object.values(checks).every((c) => c.ok);

	return json(
		{
			status: allOk ? 'healthy' : 'degraded',
			total_ms: Date.now() - start,
			checks,
			bindings
		},
		{ status: allOk ? 200 : 503 }
	);
};

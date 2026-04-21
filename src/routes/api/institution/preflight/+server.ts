import { json, error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { hashInstitutionToken } from '$utils/institution-token';
import type { RequestHandler } from './$types';

// Client-side preflight: verify token + category + daily quota before the
// browser uploads an image. Without this, rate-limited submissions would
// still write an image to R2 that no item row ever references. This check
// is best-effort — a concurrent submission can still consume the last slot
// between preflight and commit, but it eliminates the common abuse/retry case.

const ALLOWED_CATEGORIES = new Set([
	'phone', 'wallet', 'keys', 'bag', 'glasses', 'clothing',
	'jewelry', 'documents', 'electronics', 'bicycle', 'other'
]);

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const serviceRoleKey =
		platform?.env?.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceRoleKey) throw error(503, 'Service not available');

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	const slug = typeof body.inst === 'string' ? body.inst.trim() : '';
	const category = typeof body.category === 'string' ? body.category.trim() : '';
	if (!slug) return json({ error: 'invalid_institution' }, { status: 400 });
	if (!ALLOWED_CATEGORIES.has(category)) {
		return json({ error: 'invalid_category' }, { status: 400 });
	}

	const bodyToken = typeof body.t === 'string' ? body.t.trim() : '';
	const cookieToken = cookies.get(`inst_session_${slug}`) ?? '';
	const token = bodyToken || cookieToken;
	if (!token) return json({ error: 'invalid_institution' }, { status: 403 });

	const supabase = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey);

	const { data: inst } = await supabase
		.from('institutions')
		.select('id, token_hash, rate_limit_per_day')
		.eq('slug', slug)
		.maybeSingle();
	if (!inst) return json({ error: 'invalid_institution' }, { status: 403 });

	const tokenHash = await hashInstitutionToken(token);
	if (tokenHash !== inst.token_hash) {
		return json({ error: 'invalid_institution' }, { status: 403 });
	}

	const { data: dailyRow } = await supabase
		.from('institution_submissions_daily')
		.select('count')
		.eq('institution_id', inst.id)
		.eq('date', new Date().toISOString().split('T')[0])
		.maybeSingle();
	const currentCount = dailyRow?.count ?? 0;
	if (currentCount >= inst.rate_limit_per_day) {
		return json({ error: 'rate_limited' }, { status: 429 });
	}

	return json({ ok: true });
};

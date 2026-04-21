import { json, error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const serviceRoleKey =
		platform?.env?.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceRoleKey) throw error(503, 'Service not available');

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
	const auditSlug = typeof body.audit_slug === 'string' ? body.audit_slug.trim() : '';
	const itemId = typeof body.item_id === 'string' ? body.item_id.trim() : '';

	if (!slug || !auditSlug || !itemId) {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	const supabase = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey);

	const { data: inst } = await supabase
		.from('institutions')
		.select('id, audit_slug')
		.eq('slug', slug)
		.maybeSingle();

	if (!inst || inst.audit_slug !== auditSlug) {
		return json({ error: 'unauthorized' }, { status: 403 });
	}

	const { data: expired, error: rpcError } = await supabase.rpc('expire_institutional_item', {
		p_item_id: itemId,
		p_institution_id: inst.id
	});

	if (rpcError) {
		console.error('expire_institutional_item failed:', rpcError.message);
		return json({ error: 'server_error' }, { status: 500 });
	}

	if (!expired) {
		return json({ error: 'not_found' }, { status: 404 });
	}

	return json({ success: true });
};

import { error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { hashInstitutionToken } from '$utils/institution-token';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, platform }) => {
	const slug = url.searchParams.get('inst')?.trim();
	const token = url.searchParams.get('t')?.trim();
	if (!slug || !token) throw error(404, 'Not found');

	const serviceRoleKey =
		platform?.env?.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceRoleKey) throw error(503, 'Service not available');

	const supabase = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey);

	const { data: inst } = await supabase
		.from('institutions')
		.select('slug, name, address, token_hash')
		.eq('slug', slug)
		.maybeSingle();

	if (!inst) throw error(404, 'Not found');

	const tokenHash = await hashInstitutionToken(token);
	if (tokenHash !== inst.token_hash) throw error(404, 'Not found');

	return {
		institution: {
			slug: inst.slug,
			name: inst.name,
			address: inst.address
		},
		token
	};
};

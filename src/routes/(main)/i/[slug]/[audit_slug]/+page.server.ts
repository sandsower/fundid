import { error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';
import type { ItemCategory, ItemStatus } from '$types/item';

export interface AuditItem {
	id: string;
	title: string;
	description: string;
	image_url: string | null;
	category: ItemCategory;
	status: ItemStatus;
	created_at: string;
}

export const load: PageServerLoad = async ({ params, platform }) => {
	const serviceRoleKey =
		platform?.env?.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceRoleKey) throw error(503, 'Service not available');

	const supabase = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey);

	const { data: inst } = await supabase
		.from('institutions')
		.select('id, slug, name, address, phone, audit_slug, rate_limit_per_day')
		.eq('slug', params.slug)
		.maybeSingle();

	if (!inst || inst.audit_slug !== params.audit_slug) throw error(404, 'Not found');

	const { data: items } = await supabase
		.from('items')
		.select('id, title, description, image_url, category, status, created_at')
		.eq('institution_id', inst.id)
		.order('created_at', { ascending: false })
		.limit(50);

	return {
		institution: {
			slug: inst.slug,
			name: inst.name,
			address: inst.address,
			phone: inst.phone,
			rate_limit_per_day: inst.rate_limit_per_day
		},
		auditSlug: params.audit_slug,
		items: (items ?? []) as AuditItem[]
	};
};

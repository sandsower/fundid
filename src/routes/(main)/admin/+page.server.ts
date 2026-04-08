import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { PageServerLoad, Actions } from './$types';

function getServiceClient(platform: App.Platform | undefined) {
	const key = platform?.env?.SUPABASE_SERVICE_ROLE_KEY;
	if (!key) throw new Error('Service not available');
	return createClient(PUBLIC_SUPABASE_URL, key);
}

export const load: PageServerLoad = async ({ platform, url }) => {
	const supabase = getServiceClient(platform);
	const filter = url.searchParams.get('filter') || 'all';

	let query = supabase
		.from('items')
		.select('id, type, category, title, image_url, location_name, date_occurred, status, created_at')
		.order('created_at', { ascending: false });

	if (filter !== 'all') {
		query = query.eq('status', filter);
	}

	const { data: items, error } = await query;

	if (error) {
		console.error('Failed to load items:', error.message);
		return { items: [], filter };
	}

	return { items: items || [], filter };
};

export const actions: Actions = {
	resolve: async ({ request, platform }) => {
		const supabase = getServiceClient(platform);
		const form = await request.formData();
		const itemId = form.get('itemId') as string;

		if (!itemId) return fail(400, { error: 'Missing item ID' });

		const { error } = await supabase
			.from('items')
			.update({ status: 'resolved' })
			.eq('id', itemId);

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	delete: async ({ request, platform }) => {
		const supabase = getServiceClient(platform);
		const form = await request.formData();
		const itemId = form.get('itemId') as string;

		if (!itemId) return fail(400, { error: 'Missing item ID' });

		// Cascade: delete related records first
		await supabase.from('resolve_attempts').delete().eq('item_id', itemId);
		await supabase.from('contact_messages').delete().eq('item_id', itemId);

		const { error } = await supabase
			.from('items')
			.delete()
			.eq('id', itemId);

		if (error) return fail(500, { error: error.message });
		return { success: true };
	}
};

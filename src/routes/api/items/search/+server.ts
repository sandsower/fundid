import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY } from '$env/static/public';
import type { RequestHandler } from './$types';

const PAGE_SIZE = 50;

export const GET: RequestHandler = async ({ url }) => {
	const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);

	const type = url.searchParams.get('type');
	const category = url.searchParams.get('category');
	const q = url.searchParams.get('q')?.trim();
	const cursor = url.searchParams.get('cursor'); // created_at of last item
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '') || PAGE_SIZE, 100);

	let query = supabase
		.from('items')
		.select('id, type, category, title, description, image_url, latitude, longitude, location_name, date_occurred, status, created_at, updated_at')
		.eq('status', 'active')
		.order('created_at', { ascending: false })
		.limit(limit);

	if (type === 'lost' || type === 'found') {
		query = query.eq('type', type);
	}

	if (category && category !== 'all') {
		query = query.eq('category', category);
	}

	if (q) {
		// Use ilike for server-side text search across title, description, location
		query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,location_name.ilike.%${q}%`);
	}

	if (cursor) {
		query = query.lt('created_at', cursor);
	}

	const { data, error } = await query;

	if (error) {
		return json({ items: [], hasMore: false }, { status: 500 });
	}

	return json({
		items: data ?? [],
		hasMore: (data?.length ?? 0) === limit
	});
};

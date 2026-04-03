import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY } from '$env/static/public';

const ITEM_COLUMNS = 'id, type, category, title, description, image_url, latitude, longitude, location_name, date_occurred, status, contact_method, created_at, updated_at';

const categoryLabels: Record<string, { is: string; en: string }> = {
	phone: { is: 'Sími', en: 'Phone' },
	wallet: { is: 'Veski', en: 'Wallet' },
	keys: { is: 'Lyklar', en: 'Keys' },
	bag: { is: 'Taska', en: 'Bag' },
	glasses: { is: 'Gleraugu', en: 'Glasses' },
	clothing: { is: 'Fatnaður', en: 'Clothing' },
	jewelry: { is: 'Skartgripir', en: 'Jewelry' },
	documents: { is: 'Skjöl', en: 'Documents' },
	electronics: { is: 'Raftæki', en: 'Electronics' },
	pet: { is: 'Gæludýr', en: 'Pet' },
	bicycle: { is: 'Hjól', en: 'Bicycle' },
	other: { is: 'Annað', en: 'Other' }
};

export const load: PageServerLoad = async ({ params }) => {
	const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);

	const { data, error } = await supabase
		.from('items')
		.select(ITEM_COLUMNS)
		.eq('id', params.id)
		.single();

	if (error || !data) {
		return { item: null, similarItems: [] };
	}

	// Fetch similar items: opposite type, same category, within 5km
	const oppositeType = data.type === 'lost' ? 'found' : 'lost';
	const { data: similar } = await supabase.rpc('nearby_items', {
		lat: data.latitude,
		lng: data.longitude,
		radius_km: 5,
		item_type: oppositeType,
		item_category: data.category
	});

	// Filter out self, limit to 6
	const similarItems = (similar ?? [])
		.filter((s: { id: string }) => s.id !== data.id)
		.slice(0, 6);

	const typeLabel = data.type === 'lost'
		? { is: 'Týnt', en: 'Lost' }
		: { is: 'Fundið', en: 'Found' };

	const cat = categoryLabels[data.category] ?? categoryLabels.other;

	const ogTitle = `${typeLabel.is}: ${data.title} – Fundið`;
	const ogDescription = `${typeLabel.is} ${cat.is.toLowerCase()} nálægt ${data.location_name}. ${typeLabel.en} ${cat.en.toLowerCase()} near ${data.location_name}.`;

	return {
		item: data,
		similarItems,
		og: {
			title: ogTitle,
			description: ogDescription,
			image: data.image_url || 'https://fundid.is/og-image.png',
			url: `https://fundid.is/item/${data.id}`
		}
	};
};

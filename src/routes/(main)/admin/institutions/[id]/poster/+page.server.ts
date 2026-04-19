import { error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import QRCode from 'qrcode';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, url }) => {
	const key = platform?.env?.SUPABASE_SERVICE_ROLE_KEY;
	if (!key) throw error(503, 'Service not available');

	const supabase = createClient(PUBLIC_SUPABASE_URL, key);
	const { data: inst } = await supabase
		.from('institutions')
		.select('id, slug, name, address, phone')
		.eq('id', params.id)
		.maybeSingle();

	if (!inst) throw error(404, 'Institution not found');

	// Posters cannot be regenerated because the plaintext token was only shown once.
	// Require the token to be passed as a query param so admin can print a poster
	// any time after creation using the URL they saved.
	const token = url.searchParams.get('t');
	if (!token) throw error(400, 'Poster requires the token as a query param: ?t=TOKEN');

	const posterUrl = `${url.origin}/report/inst?inst=${inst.slug}&t=${token}`;
	const qrSvg = await QRCode.toString(posterUrl, {
		type: 'svg',
		errorCorrectionLevel: 'M',
		margin: 1,
		color: { dark: '#2C2520', light: '#FFFFFF' }
	});

	return { institution: inst, posterUrl, qrSvg };
};

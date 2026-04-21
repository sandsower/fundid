import { error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import QRCode from 'qrcode';
import { hashInstitutionToken } from '$utils/institution-token';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, url }) => {
	const key = platform?.env?.SUPABASE_SERVICE_ROLE_KEY;
	if (!key) throw error(503, 'Service not available');

	const supabase = createClient(PUBLIC_SUPABASE_URL, key);
	const { data: inst } = await supabase
		.from('institutions')
		.select('id, slug, name, address, phone, token_hash')
		.eq('id', params.id)
		.maybeSingle();

	if (!inst) throw error(404, 'Institution not found');

	// Posters cannot be regenerated because the plaintext token was only shown once.
	// Require the token as a query param so admin can print any time after creation
	// using the URL they saved, and verify it against the stored hash — otherwise a
	// copied or truncated token would yield a professional-looking but dead poster.
	const token = url.searchParams.get('t');
	if (!token) throw error(400, 'Poster requires the token as a query param: ?t=TOKEN');

	const tokenHash = await hashInstitutionToken(token);
	if (tokenHash !== inst.token_hash) {
		throw error(
			400,
			'Token does not match this institution. Use the exact QR URL saved at creation, or rotate the token and reprint.'
		);
	}

	const posterUrl = `${url.origin}/report/inst?inst=${inst.slug}&t=${token}`;
	const qrSvg = await QRCode.toString(posterUrl, {
		type: 'svg',
		errorCorrectionLevel: 'M',
		margin: 1,
		color: { dark: '#2C2520', light: '#FFFFFF' }
	});

	return { institution: inst, posterUrl, qrSvg };
};

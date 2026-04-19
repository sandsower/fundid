import { error, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { hashInstitutionToken } from '$utils/institution-token';
import type { PageServerLoad } from './$types';

// The poster bearer token never leaves the server. On first load from a QR
// poster URL, the server validates `?t=`, stashes the plaintext in an
// HttpOnly cookie, and redirects to the tokenless URL. `/api/items` reads
// the same cookie server-side to authorize institutional submissions, so the
// token is never serialized into page data or POST bodies.
const COOKIE_PREFIX = 'inst_session_';
const COOKIE_MAX_AGE = 60 * 60; // 1 hour

function cookieName(slug: string) {
	return `${COOKIE_PREFIX}${slug}`;
}

export const load: PageServerLoad = async ({ url, platform, cookies }) => {
	const slug = url.searchParams.get('inst')?.trim();
	const urlToken = url.searchParams.get('t')?.trim();
	const cookieToken = slug ? cookies.get(cookieName(slug)) : undefined;
	const token = urlToken || cookieToken;

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

	// First load via QR: seat the cookie and redirect to the tokenless URL so
	// external resources (fonts, Turnstile, PostHog) never see `?t=` in Referer
	// or analytics, and later refreshes still reload the form from the cookie.
	// Path is `/` so `/api/items` can read it; SameSite=Strict keeps it on
	// same-origin navigations/POSTs only.
	if (urlToken) {
		cookies.set(cookieName(slug), urlToken, {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'strict',
			maxAge: COOKIE_MAX_AGE
		});
		throw redirect(303, `/report/inst?inst=${encodeURIComponent(slug)}`);
	}

	return {
		institution: {
			slug: inst.slug,
			name: inst.name,
			address: inst.address
		}
	};
};

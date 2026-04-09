import { redirect } from '@sveltejs/kit';
import { PUBLIC_ENABLE_PET_SITE } from '$env/static/public';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	// Check cookie first (set by client from localStorage), fall back to env var
	const cookieValue = cookies.get('fundid-pet-site-enabled');
	const enabled = cookieValue !== undefined ? cookieValue === 'true' : PUBLIC_ENABLE_PET_SITE === 'true';

	if (!enabled) {
		redirect(307, '/');
	}
};

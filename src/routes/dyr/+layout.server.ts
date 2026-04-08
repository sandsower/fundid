import { redirect } from '@sveltejs/kit';
import { PET_SITE_ENABLED } from '$utils/features';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	if (!PET_SITE_ENABLED) {
		redirect(307, '/');
	}
};

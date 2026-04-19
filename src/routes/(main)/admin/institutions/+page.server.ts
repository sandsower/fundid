import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import {
	generateInstitutionToken,
	generateAuditSlug,
	hashInstitutionToken
} from '$utils/institution-token';
import type { PageServerLoad, Actions } from './$types';

function getServiceClient(platform: App.Platform | undefined) {
	const key = platform?.env?.SUPABASE_SERVICE_ROLE_KEY;
	if (!key) throw new Error('Service not available');
	return createClient(PUBLIC_SUPABASE_URL, key);
}

export const load: PageServerLoad = async ({ platform }) => {
	const supabase = getServiceClient(platform);
	const { data: institutions } = await supabase
		.from('institutions')
		.select('id, slug, name, address, phone, rate_limit_per_day, audit_slug, created_at')
		.order('created_at', { ascending: false });

	return { institutions: institutions ?? [] };
};

export const actions: Actions = {
	create: async ({ request, platform, url }) => {
		const supabase = getServiceClient(platform);
		const form = await request.formData();

		const slug = (form.get('slug') as string)?.trim().toLowerCase();
		const name = (form.get('name') as string)?.trim();
		const address = (form.get('address') as string)?.trim();
		const latitude = parseFloat(form.get('latitude') as string);
		const longitude = parseFloat(form.get('longitude') as string);
		const phone = ((form.get('phone') as string) || '').trim() || null;
		const hoursRaw = ((form.get('hours_json') as string) || '').trim();
		const contactEmail = (form.get('contact_email') as string)?.trim();
		const rateLimit = parseInt(form.get('rate_limit_per_day') as string) || 20;

		if (!slug || !name || !address || !contactEmail) {
			return fail(400, { error: 'Missing required fields' });
		}
		if (!/^[a-z0-9-]+$/.test(slug)) {
			return fail(400, { error: 'Slug must be lowercase alphanumeric + dashes' });
		}
		if (isNaN(latitude) || isNaN(longitude)) {
			return fail(400, { error: 'Invalid latitude/longitude' });
		}
		// Mirror the DB upper-bound check so the error is friendly instead of
		// a raw Postgres constraint message. Bounds keep the audit page render
		// tractable at 30-day retention.
		if (rateLimit < 1 || rateLimit > 100) {
			return fail(400, { error: 'rate_limit_per_day must be between 1 and 100' });
		}

		let hoursJson = null;
		if (hoursRaw) {
			try {
				hoursJson = JSON.parse(hoursRaw);
			} catch {
				return fail(400, { error: 'hours_json must be valid JSON or empty' });
			}
		}

		const token = generateInstitutionToken();
		const auditSlug = generateAuditSlug();
		const tokenHash = await hashInstitutionToken(token);

		const { data, error } = await supabase
			.from('institutions')
			.insert({
				slug,
				name,
				address,
				latitude,
				longitude,
				phone,
				hours_json: hoursJson,
				contact_email: contactEmail,
				token_hash: tokenHash,
				audit_slug: auditSlug,
				rate_limit_per_day: rateLimit
			})
			.select('id')
			.single();

		if (error) {
			return fail(500, { error: error.message });
		}

		const origin = url.origin;
		return {
			created: {
				id: data.id,
				slug,
				name,
				token,
				auditSlug,
				qrUrl: `${origin}/report/inst?inst=${slug}&t=${token}`,
				auditUrl: `${origin}/i/${slug}/${auditSlug}`
			}
		};
	}
};

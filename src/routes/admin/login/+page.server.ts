import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

async function hashPassword(password: string): Promise<string> {
	const encoded = new TextEncoder().encode(password);
	const buffer = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export const actions: Actions = {
	default: async ({ request, cookies, platform }) => {
		const adminPassword = platform?.env?.ADMIN_PASSWORD;
		if (!adminPassword) return fail(503, { error: 'Service not available' });

		const form = await request.formData();
		const password = form.get('password') as string;

		if (!password || password !== adminPassword) {
			return fail(401, { error: 'Invalid password' });
		}

		const sessionToken = await hashPassword(adminPassword);
		cookies.set('admin_session', sessionToken, {
			path: '/admin',
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 // 24 hours
		});

		redirect(303, '/admin');
	}
};

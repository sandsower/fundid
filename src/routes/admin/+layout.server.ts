import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

async function hashPassword(password: string): Promise<string> {
	const encoded = new TextEncoder().encode(password);
	const buffer = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export const load: LayoutServerLoad = async ({ cookies, platform, url }) => {
	// Don't guard the login page itself
	if (url.pathname === '/admin/login') return;

	const adminPassword = platform?.env?.ADMIN_PASSWORD;
	if (!adminPassword) redirect(303, '/admin/login');

	const session = cookies.get('admin_session');
	const expected = await hashPassword(adminPassword);

	if (!session || session !== expected) {
		redirect(303, '/admin/login');
	}
};

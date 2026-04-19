import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

async function hashAdminPassword(password: string): Promise<string> {
	const encoded = new TextEncoder().encode(password);
	const buffer = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

// Gate every /admin/* request — GET, POST form actions, any method — on the
// admin_session cookie. The layout's load redirect only runs for page renders,
// so form actions like /admin/institutions?/create would otherwise reach their
// service-role handlers before any authorization check.
async function guardAdmin(event: Parameters<Handle>[0]['event']): Promise<Response | null> {
	const { pathname } = event.url;
	if (!pathname.startsWith('/admin') || pathname === '/admin/login') return null;

	const adminPassword = event.platform?.env?.ADMIN_PASSWORD;
	if (!adminPassword) throw redirect(303, '/admin/login');

	const session = event.cookies.get('admin_session');
	const expected = await hashAdminPassword(adminPassword);
	if (!session || session !== expected) throw redirect(303, '/admin/login');

	return null;
}

// Routes whose URLs embed bearer credentials (`?t=` submission/poster tokens,
// `/i/{slug}/{audit_slug}` kill-switch) must never leak the full URL in the
// Referer header to third-party origins that fonts, Turnstile, or analytics
// are fetched from. Client-side URL scrubs run too late to catch the initial
// resource loads.
function needsNoReferrer(pathname: string): boolean {
	return (
		pathname === '/report/inst' ||
		pathname.startsWith('/i/') ||
		/^\/admin\/institutions\/[^/]+\/poster\/?$/.test(pathname)
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	// Detect which site we're serving based on subdomain
	const host = event.request.headers.get('host') || '';
	event.locals.site = host.startsWith('dyr.') ? 'pets' : 'main';

	await guardAdmin(event);

	const response = await resolve(event);

	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set(
		'Referrer-Policy',
		needsNoReferrer(event.url.pathname) ? 'no-referrer' : 'strict-origin-when-cross-origin'
	);
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
	response.headers.set(
		'Content-Security-Policy',
		[
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' https://*.posthog.com https://static.cloudflareinsights.com https://challenges.cloudflare.com",
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
			"img-src 'self' blob: data: https://*.supabase.co https://*.r2.dev https://img.fundid.is https://api.qrserver.com https://tile.openstreetmap.org",
			"font-src 'self' https://fonts.gstatic.com",
			"connect-src 'self' https://*.supabase.co https://nominatim.openstreetmap.org https://api.maptiler.com https://tile.openstreetmap.org https://*.posthog.com https://cloudflareinsights.com",
			"worker-src 'self' blob:",
			"frame-src https://challenges.cloudflare.com",
			"frame-ancestors 'none'",
			"base-uri 'self'",
			"form-action 'self'"
		].join('; ')
	);

	return response;
};

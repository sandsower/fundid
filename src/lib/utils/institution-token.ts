// Institution tokens are bearer credentials embedded in QR posters.
// Stored as SHA-256 hashes; plaintext only survives in the printed URL.
// Rotate by generating a new token + hash and reprinting the poster.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, URL-safe, no I/O/0/1
const TOKEN_LENGTH = 32;
const AUDIT_SLUG_LENGTH = 32;

function randomString(length: number): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function generateInstitutionToken(): string {
	return randomString(TOKEN_LENGTH);
}

export function generateAuditSlug(): string {
	return randomString(AUDIT_SLUG_LENGTH);
}

export async function hashInstitutionToken(token: string): Promise<string> {
	const normalized = token.trim();
	const encoded = new TextEncoder().encode(normalized);
	const buffer = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

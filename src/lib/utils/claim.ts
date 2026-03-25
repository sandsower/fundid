/** Generate a random claim code like SKILAD-7K3X-9M2P */
export function generateClaimCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
	const segment = () =>
		Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
	return `SKILAD-${segment()}-${segment()}`;
}

/** Hash a claim code using SHA-256 (returns hex string) */
export async function hashClaimCode(code: string): Promise<string> {
	const normalized = code.toUpperCase().trim();
	const encoded = new TextEncoder().encode(normalized);
	const buffer = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

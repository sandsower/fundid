// HMAC-signed tokens that bind an uploaded R2 key to the /api/items POST
// that is allowed to clean it up. Without this, cleanup compensation on
// institutional rejects would let a valid-token submitter trigger deletion
// of arbitrary existing R2 images by supplying their URLs on a failing
// submission. Only the server knows SUPABASE_SERVICE_ROLE_KEY, so only
// /api/upload can mint tokens and only /api/items can verify them.

async function hmacHex(secret: string, message: string): Promise<string> {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export function signUploadKey(key: string, secret: string): Promise<string> {
	return hmacHex(secret, key);
}

// Constant-time string compare to avoid timing side-channels on the token.
export async function verifyUploadToken(
	key: string,
	token: string,
	secret: string
): Promise<boolean> {
	if (!key || !token || !secret) return false;
	const expected = await hmacHex(secret, key);
	if (expected.length !== token.length) return false;
	let mismatch = 0;
	for (let i = 0; i < expected.length; i++) {
		mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
	}
	return mismatch === 0;
}

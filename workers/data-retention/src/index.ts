import { createClient } from '@supabase/supabase-js';

interface Env {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_KEY: string;
	IMAGE_BASE_URL: string;
	ITEM_IMAGES: R2Bucket;
	INSTITUTIONAL_EXPIRE_DRY_RUN?: string;
}

// Uploaded R2 keys are `${Date.now()}-${random}.webp`; we can read the upload
// time from the leading numeric prefix without paying for HeadObject metadata.
function readUploadMs(key: string): number | null {
	const match = key.match(/^(\d+)-/);
	if (!match) return null;
	const ms = parseInt(match[1]);
	return Number.isFinite(ms) ? ms : null;
}

async function runPeerCleanup(
	supabase: ReturnType<typeof createClient>,
	bucket: R2Bucket
): Promise<void> {
	const { data, error } = await supabase.rpc('cleanup_expired_items');
	if (error) {
		console.error('Data retention cleanup failed:', error.message);
		return;
	}
	console.log('Data retention cleanup:', JSON.stringify(data));

	const imagePaths: string[] = data.image_paths ?? [];
	if (imagePaths.length === 0) return;
	const keys = imagePaths.map((url: string) => url.split('/').pop()).filter(Boolean) as string[];
	const results = await Promise.allSettled(keys.map((key) => bucket.delete(key)));
	const failed = results.filter((r) => r.status === 'rejected').length;
	if (failed > 0) {
		console.error(`R2 cleanup: ${failed}/${keys.length} deletions failed`);
	} else {
		console.log(`Deleted ${keys.length} images from R2`);
	}
}

// R2 objects uploaded by clients that never completed an /api/items POST
// (connection loss, tab close, abandoned form) have no DB row, so
// cleanup_expired_items never touches them. Sweep keys older than 24h and
// delete any that aren't referenced by an `items.image_url` today.
async function runOrphanUploadSweep(
	supabase: ReturnType<typeof createClient>,
	bucket: R2Bucket,
	baseUrl: string
): Promise<void> {
	const base = baseUrl.replace(/\/+$/, '');
	const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;

	const { data: rows, error } = await supabase
		.from('items')
		.select('image_url')
		.not('image_url', 'is', null);
	if (error) {
		console.error('Orphan sweep: failed to load image_urls:', error.message);
		return;
	}
	const referenced = new Set<string>();
	for (const row of (rows as { image_url: string | null }[]) ?? []) {
		const url = row.image_url;
		if (!url || !url.startsWith(`${base}/`)) continue;
		referenced.add(url.slice(base.length + 1));
	}

	let cursor: string | undefined;
	let deleted = 0;
	let inspected = 0;
	do {
		const page = await bucket.list({ limit: 1000, cursor });
		for (const obj of page.objects) {
			inspected++;
			const uploadedMs = readUploadMs(obj.key);
			if (uploadedMs === null) continue;
			if (uploadedMs > cutoffMs) continue;
			if (referenced.has(obj.key)) continue;
			try {
				await bucket.delete(obj.key);
				deleted++;
			} catch (e) {
				console.error('Orphan sweep delete failed for', obj.key, (e as Error).message);
			}
		}
		cursor = page.truncated ? page.cursor : undefined;
	} while (cursor);

	console.log(`Orphan sweep: inspected=${inspected} deleted=${deleted}`);
}

async function runInstitutionalExpiry(
	supabase: ReturnType<typeof createClient>,
	env: Env
): Promise<void> {
	// Require explicit configuration. A missing or malformed value used to
	// silently default to dry-run, which meant a fresh prod deploy could leave
	// the 30-day expiry contract disabled indefinitely. Skip loudly instead so
	// the absence is visible in worker logs and forces a deploy fix.
	const raw = env.INSTITUTIONAL_EXPIRE_DRY_RUN;
	if (raw !== 'true' && raw !== 'false') {
		console.error(
			'INSTITUTIONAL_EXPIRE_DRY_RUN must be set to "true" or "false"; got',
			JSON.stringify(raw),
			'— skipping institutional auto-expire run.'
		);
		return;
	}
	const dryRun = raw === 'true';
	const { data, error } = await supabase.rpc('expire_old_institutional_items', {
		p_dry_run: dryRun,
		p_threshold_days: 30
	});
	if (error) console.error('Institutional auto-expire failed:', error.message);
	else console.log('Institutional auto-expire:', JSON.stringify(data));
}

export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

		// Each job is isolated: a failure in one must not skip the others.
		// Institutional expiry is a separate availability commitment to partners
		// and cannot be gated on peer cleanup's health.
		await Promise.allSettled([
			runPeerCleanup(supabase, env.ITEM_IMAGES),
			runInstitutionalExpiry(supabase, env),
			runOrphanUploadSweep(supabase, env.ITEM_IMAGES, env.IMAGE_BASE_URL)
		]);
	},

	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === 'POST') {
			await this.scheduled({} as ScheduledEvent, env, ctx);
			return new Response('OK');
		}
		return new Response('fundid-data-retention worker', { status: 200 });
	}
};

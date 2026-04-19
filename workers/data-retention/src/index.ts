import { createClient } from '@supabase/supabase-js';

interface Env {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_KEY: string;
	ITEM_IMAGES: R2Bucket;
	INSTITUTIONAL_EXPIRE_DRY_RUN?: string;
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

async function runInstitutionalExpiry(
	supabase: ReturnType<typeof createClient>,
	env: Env
): Promise<void> {
	const dryRun = env.INSTITUTIONAL_EXPIRE_DRY_RUN !== 'false';
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
			runInstitutionalExpiry(supabase, env)
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

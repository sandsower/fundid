import { createClient } from '@supabase/supabase-js';

interface Env {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_KEY: string;
	ITEM_IMAGES: R2Bucket;
	INSTITUTIONAL_EXPIRE_DRY_RUN?: string;
}

export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

		const { data, error } = await supabase.rpc('cleanup_expired_items');

		if (error) {
			console.error('Data retention cleanup failed:', error.message);
			return;
		}

		console.log('Data retention cleanup:', JSON.stringify(data));

		// Delete orphaned images from R2
		const imagePaths: string[] = data.image_paths ?? [];
		if (imagePaths.length > 0) {
			const keys = imagePaths.map((url: string) => url.split('/').pop()).filter(Boolean) as string[];
			const results = await Promise.allSettled(keys.map((key) => env.ITEM_IMAGES.delete(key)));
			const failed = results.filter((r) => r.status === 'rejected').length;
			if (failed > 0) {
				console.error(`R2 cleanup: ${failed}/${keys.length} deletions failed`);
			} else {
				console.log(`Deleted ${keys.length} images from R2`);
			}
		}

		// Institutional auto-expire at 30 days. Defaults to dry-run; flip
		// INSTITUTIONAL_EXPIRE_DRY_RUN to "false" after the first week of logs look clean.
		const dryRun = env.INSTITUTIONAL_EXPIRE_DRY_RUN !== 'false';
		const { data: instData, error: instError } = await supabase.rpc(
			'expire_old_institutional_items',
			{ p_dry_run: dryRun, p_threshold_days: 30 }
		);
		if (instError) {
			console.error('Institutional auto-expire failed:', instError.message);
		} else {
			console.log('Institutional auto-expire:', JSON.stringify(instData));
		}
	},

	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === 'POST') {
			await this.scheduled({} as ScheduledEvent, env, ctx);
			return new Response('OK');
		}
		return new Response('fundid-data-retention worker', { status: 200 });
	}
};

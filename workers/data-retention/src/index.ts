import { createClient } from '@supabase/supabase-js';

interface Env {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_KEY: string;
	ITEM_IMAGES: R2Bucket;
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
	},

	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === 'POST') {
			await this.scheduled({} as ScheduledEvent, env, ctx);
			return new Response('OK');
		}
		return new Response('fundid-data-retention worker', { status: 200 });
	}
};

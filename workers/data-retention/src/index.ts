import { createClient } from '@supabase/supabase-js';

interface Env {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_KEY: string;
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

		// Delete orphaned images from storage
		const imagePaths: string[] = data.image_paths ?? [];
		if (imagePaths.length > 0) {
			const fileNames = imagePaths.map((url: string) => url.split('/').pop()).filter(Boolean) as string[];
			const { error: storageError } = await supabase.storage.from('item-images').remove(fileNames);
			if (storageError) {
				console.error('Storage cleanup failed:', storageError.message);
			} else {
				console.log(`Deleted ${fileNames.length} images from storage`);
			}
		}
	},

	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Allow manual trigger via HTTP for testing
		if (request.method === 'POST') {
			await this.scheduled({} as ScheduledEvent, env, ctx);
			return new Response('OK');
		}
		return new Response('fundid-data-retention worker', { status: 200 });
	}
};

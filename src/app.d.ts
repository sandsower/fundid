// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface Turnstile {
		render(container: string | HTMLElement, options: {
			sitekey: string;
			callback: (token: string) => void;
			'error-callback'?: () => void;
			'expired-callback'?: () => void;
			appearance?: 'always' | 'execute' | 'interaction-only';
			size?: 'normal' | 'compact' | 'flexible';
		}): string;
		reset(widgetId?: string): void;
		remove(widgetId?: string): void;
	}

	interface Window {
		turnstile?: Turnstile;
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				ITEM_IMAGES: R2Bucket;
				RATE_LIMIT: KVNamespace;
				SUPABASE_SERVICE_ROLE_KEY: string;
				TURNSTILE_SECRET_KEY: string;
			};
		}
	}
}

export {};

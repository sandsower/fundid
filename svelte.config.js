import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			$components: 'src/lib/components',
			$i18n: 'src/lib/i18n',
			$stores: 'src/lib/stores',
			$types: 'src/lib/types',
			$utils: 'src/lib/utils'
		}
	}
};

export default config;

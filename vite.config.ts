import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Fundið - Týnt og Fundið á Íslandi',
				short_name: 'Fundið',
				description: 'Lost and found in Iceland / Týnt og fundið á Íslandi',
				theme_color: '#f59e0b',
				background_color: '#ffffff',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				icons: [
					{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
						handler: 'NetworkFirst',
						options: { cacheName: 'supabase-api', expiration: { maxEntries: 50, maxAgeSeconds: 300 } }
					}
				]
			}
		})
	]
});

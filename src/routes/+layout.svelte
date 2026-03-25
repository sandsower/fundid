<script lang="ts">
	import '../app.css';
	import '$i18n/index';
	import { locale, _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	function toggleLocale() {
		const next = $locale === 'is' ? 'en' : 'is';
		locale.set(next);
		if (browser) localStorage.setItem('fundid-locale', next);
	}
</script>

<div class="min-h-screen flex flex-col">
	<header class="border-b border-[var(--color-border)] bg-white sticky top-0 z-50">
		<nav class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2">
				<img src="/logo-pin-geo.svg" alt="Fundið" class="h-8" />
				<span class="text-lg font-semibold tracking-tight text-[var(--color-ink)]">Fundið</span>
			</a>
			<button
				onclick={toggleLocale}
				class="text-xs font-medium text-[var(--color-muted)] border border-[var(--color-border)] px-2.5 py-1 rounded-full hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-colors"
			>
				{$locale === 'is' ? 'EN' : 'ÍS'}
			</button>
		</nav>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="border-t border-[var(--color-border)] py-8 text-center">
		<p class="text-sm text-[var(--color-muted)]">Fundið &mdash; {$_('common.tagline')}</p>
	</footer>
</div>

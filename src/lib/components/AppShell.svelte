<script lang="ts">
	import { getTranslate, getTolgee } from '@tolgee/svelte';
	import { browser } from '$app/environment';
	import { capture } from '$lib/posthog';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const { t } = getTranslate();
	const tolgeeInstance = getTolgee(['language']);

	function toggleLocale() {
		const from = $tolgeeInstance.getLanguage();
		const next = from === 'is' ? 'en' : 'is';
		$tolgeeInstance.changeLanguage(next);
		if (browser) localStorage.setItem('fundid-locale', next);
		capture('language_changed', { from, to: next });
	}
</script>

<div class="min-h-screen flex flex-col">
	<header class="border-b border-[var(--color-border)] bg-white sticky top-0 z-50">
		<nav class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2">
				<img src="/logo-v2-pin-checkmark.svg" alt="Fundið" class="h-8" />
				<span class="text-lg font-semibold tracking-tight text-[var(--color-ink)]">Fundið</span>
			</a>
			<div class="flex items-center gap-2">
				<a
					href="/about"
					class="text-xs font-medium text-[var(--color-muted)] border border-[var(--color-border)] px-2.5 py-1 rounded-full hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-colors"
				>
					{$t('nav.about')}
				</a>
				<button
					onclick={toggleLocale}
					class="text-xs font-medium text-white bg-[var(--color-ink)] px-2.5 py-1 rounded-full hover:bg-[var(--color-ink-light)] transition-colors"
				>
					{$tolgeeInstance.getLanguage() === 'is' ? 'EN' : 'ÍS'}
				</button>
			</div>
		</nav>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="border-t border-[var(--color-border)] py-8 text-center space-y-2">
		<p class="text-sm text-[var(--color-muted)]">Fundið - {$t('common.tagline')}</p>
		<a href="/about" class="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors">{$t('nav.about')}</a>
	</footer>
</div>

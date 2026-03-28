<script lang="ts">
	import '../app.css';
	import { TolgeeProvider } from '@tolgee/svelte';
	import { tolgee } from '$i18n/index';
	import AppShell from '$components/AppShell.svelte';
	import { initPostHog, capture } from '$lib/posthog';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	onMount(() => {
		initPostHog();
	});

	afterNavigate(() => {
		capture('$pageview');
	});
</script>

<TolgeeProvider {tolgee}>
	<div slot="fallback" class="min-h-screen flex items-center justify-center">
		<p class="text-sm text-[var(--color-muted)]">...</p>
	</div>

	<AppShell>
		{@render children()}
	</AppShell>
</TolgeeProvider>

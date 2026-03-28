<script lang="ts">
	import '../app.css';
	import { TolgeeProvider } from '@tolgee/svelte';
	import { tolgee } from '$i18n/index';
	import AppShell from '$components/AppShell.svelte';
	import { initPostHog, capture } from '$lib/posthog';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const pageTitles: Record<string, string> = {
		'/': 'Fundið – Týnt og fundið á Íslandi',
		'/about': 'Um Fundið'
	};

	let title = $derived.by(() => {
		const path = $page.url.pathname;
		return pageTitles[path] || 'Fundið';
	});
	let ready = $state(false);

	onMount(() => {
		ready = true;
		initPostHog();
		capture('$pageview');
	});

	afterNavigate(({ from }) => {
		if (from) capture('$pageview');
	});
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

{#if browser && ready}
	<TolgeeProvider {tolgee}>
		<AppShell>
			{@render children()}
		</AppShell>
	</TolgeeProvider>
{:else}
	<div class="min-h-screen bg-[var(--color-surface)]"></div>
{/if}

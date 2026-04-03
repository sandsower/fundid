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
	{#if !$page.url.pathname.startsWith('/item/')}
		<meta property="og:type" content="website" />
		<meta property="og:url" content="https://fundid.is" />
		<meta property="og:title" content="Fundið — Týnt og fundið á Íslandi" />
		<meta property="og:description" content="Ókeypis vettvangur fyrir týnda og fundna hluti á Íslandi. Tilkynntu, finndu, tengdu saman." />
		<meta property="og:image" content="https://fundid.is/og-image.png" />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta property="og:image:type" content="image/png" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content="Fundið — Týnt og fundið á Íslandi" />
		<meta name="twitter:description" content="Ókeypis vettvangur fyrir týnda og fundna hluti á Íslandi." />
		<meta name="twitter:image" content="https://fundid.is/og-image.png" />
		<meta name="description" content="Týnt og fundið á Íslandi / Lost and found in Iceland" />
	{/if}
</svelte:head>

{#if browser && ready}
	{#if $page.url.pathname.startsWith('/admin')}
		{@render children()}
	{:else}
		<TolgeeProvider {tolgee}>
			<AppShell>
				{@render children()}
			</AppShell>
		</TolgeeProvider>
	{/if}
{:else}
	<div class="min-h-screen bg-[var(--color-surface)]"></div>
{/if}

<script lang="ts">
	import '../app.css';
	import { TolgeeProvider } from '@tolgee/svelte';
	import { tolgee } from '$i18n/index';
	import AppShell from '$components/AppShell.svelte';
	import { initPostHog, capture } from '$lib/posthog';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	let ready = $state(false);

	onMount(() => {
		ready = true;
		initPostHog();
	});

	afterNavigate(() => {
		capture('$pageview');
	});
</script>

{#if browser && ready}
	<TolgeeProvider {tolgee}>
		<AppShell>
			{@render children()}
		</AppShell>
	</TolgeeProvider>
{:else}
	<div class="min-h-screen bg-[var(--color-surface)]"></div>
{/if}

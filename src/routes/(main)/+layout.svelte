<script lang="ts">
	import AppShell from '$components/AppShell.svelte';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	let isAdmin = $derived($page.url.pathname.startsWith('/admin'));
</script>

{#if isAdmin}
	{@render children()}
{:else}
	<AppShell>
		{@render children()}
	</AppShell>
{/if}

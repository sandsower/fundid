<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { page } from '$app/stores';

	const { t } = getTranslate();
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { capture } from '$lib/posthog';
	import { hashClaimCode } from '$utils/claim';
	import { CheckCircle, XCircle, Loader } from 'lucide-svelte';

	let status: 'verifying' | 'success' | 'error' = $state('verifying');
	let errorMessage = $state('');

	onMount(async () => {
		const code = $page.url.searchParams.get('code');
		const itemId = $page.params.id;

		if (!code) {
			status = 'error';
			errorMessage = $t('claim.invalid');
			return;
		}

		try {
			const codeHash = await hashClaimCode(code);
			const { data, error } = await supabase.rpc('resolve_item', {
				item_id: itemId,
				code_hash: codeHash
			});

			if (error) throw error;
			status = data ? 'success' : 'error';
			if (data) {
				capture('resolve_completed', { item_id: itemId, method: 'claim_link' });
			} else {
				capture('resolve_failed', { item_id: itemId, reason: 'invalid_code', method: 'claim_link' });
				errorMessage = $t('claim.invalid');
			}
		} catch (e: any) {
			status = 'error';
			capture('resolve_failed', { item_id: itemId, reason: 'error', method: 'claim_link' });
			errorMessage = e.message || 'Something went wrong';
		}
	});
</script>

<svelte:head>
	<title>{$t('common.resolved')} – Fundið</title>
</svelte:head>

<section class="max-w-sm mx-auto px-4 py-20 text-center">
	{#if status === 'verifying'}
		<div class="w-16 h-16 bg-[var(--color-surface)] rounded-full flex items-center justify-center mx-auto mb-6">
			<Loader size={32} class="text-[var(--color-amber)] animate-spin" />
		</div>
		<h1 class="text-xl font-bold text-[var(--color-ink)] mb-2">{$t('common.loading')}</h1>
	{:else if status === 'success'}
		<div class="w-16 h-16 bg-[var(--color-found-light)] rounded-full flex items-center justify-center mx-auto mb-6">
			<CheckCircle size={32} class="text-[var(--color-found)]" />
		</div>
		<h1 class="text-xl font-bold text-[var(--color-ink)] mb-2">{$t('resolve.successTitle')}</h1>
		<p class="text-sm text-[var(--color-muted)] mb-6">{$t('resolve.successDescription')}</p>
		<a
			href="/item/{$page.params.id}"
			class="px-5 py-2.5 bg-[var(--color-ink)] text-white rounded-xl font-medium text-sm hover:bg-[var(--color-ink-light)] transition-colors inline-block"
		>
			{$t('resolve.viewItem')}
		</a>
	{:else}
		<div class="w-16 h-16 bg-[var(--color-lost-light)] rounded-full flex items-center justify-center mx-auto mb-6">
			<XCircle size={32} class="text-[var(--color-lost)]" />
		</div>
		<h1 class="text-xl font-bold text-[var(--color-ink)] mb-2">{$t('resolve.errorTitle')}</h1>
		<p class="text-sm text-[var(--color-muted)] mb-6">{errorMessage}</p>
		<a
			href="/item/{$page.params.id}"
			class="px-5 py-2.5 bg-[var(--color-ink)] text-white rounded-xl font-medium text-sm hover:bg-[var(--color-ink-light)] transition-colors inline-block"
		>
			{$t('resolve.viewItem')}
		</a>
	{/if}
</section>

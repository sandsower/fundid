<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ReportForm from '$components/ReportForm.svelte';
	import type { ItemType } from '$types/item';

	let itemType: ItemType = $state(($page.url.searchParams.get('type') as ItemType) || 'lost');
</script>

<section class="max-w-xl mx-auto px-4 py-8">
	<a href="/" class="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors mb-6 inline-block">
		← {$_('common.back')}
	</a>

	<h1 class="text-2xl font-bold mb-1 text-[var(--color-ink)]">
		{itemType === 'lost' ? $_('item.reportLost') : $_('item.reportFound')}
	</h1>
	<p class="text-sm text-[var(--color-muted)] mb-6">
		{itemType === 'lost' ? 'Describe what you lost and where.' : 'Help someone get their item back.'}
	</p>

	<!-- Type toggle -->
	<div class="flex rounded-xl border border-[var(--color-border)] overflow-hidden mb-8">
		<button
			onclick={() => (itemType = 'lost')}
			class="flex-1 py-2.5 text-sm font-medium transition-colors {itemType === 'lost'
				? 'bg-[var(--color-lost)] text-white'
				: 'text-[var(--color-muted)] hover:bg-[var(--color-surface)]'}"
		>
			{$_('common.lost')}
		</button>
		<button
			onclick={() => (itemType = 'found')}
			class="flex-1 py-2.5 text-sm font-medium transition-colors {itemType === 'found'
				? 'bg-[var(--color-found)] text-white'
				: 'text-[var(--color-muted)] hover:bg-[var(--color-surface)]'}"
		>
			{$_('common.found')}
		</button>
	</div>

	<ReportForm type={itemType} onSuccess={(id) => goto(`/item/${id}`)} />
</section>

<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import type { ItemCategory } from '$types/item';

	const { t } = getTranslate();
	import { categoryIcons, allCategories } from '$utils/categories';

	let { selected, onSelect }: { selected: ItemCategory | 'all'; onSelect: (c: ItemCategory | 'all') => void } = $props();
</script>

<div class="flex gap-1.5 overflow-x-auto scrollbar-hide">
	<button
		onclick={() => onSelect('all')}
		class="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5
			{selected === 'all'
				? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
				: 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]'}"
	>
		{$t('common.all')}
	</button>
	{#each allCategories as cat}
		{@const Icon = categoryIcons[cat]}
		<button
			onclick={() => onSelect(cat)}
			class="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5
				{selected === cat
					? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
					: 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]'}"
		>
			<Icon size={14} strokeWidth={2} />
			{$t(`categories.${cat}`)}
		</button>
	{/each}
</div>

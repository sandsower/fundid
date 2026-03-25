<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { Item } from '$types/item';
	import { categoryIcons } from '$utils/categories';
	import { MapPin, Calendar, X, ArrowRight } from 'lucide-svelte';

	let { item, onClose }: { item: Item; onClose: () => void } = $props();

	const CatIcon = $derived(categoryIcons[item.category] || categoryIcons.other);

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('is-IS', {
			year: 'numeric', month: 'long', day: 'numeric'
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
	<button class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick={onClose} aria-label="Close"></button>

	<div class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
		<!-- Close button -->
		<button
			onclick={onClose}
			class="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
		>
			<X size={16} />
		</button>

		<!-- Full image -->
		{#if item.image_url}
			<img src={item.image_url} alt={item.title} class="w-full max-h-[50vh] object-contain bg-[var(--color-surface)]" />
		{:else}
			<div class="w-full h-48 bg-[var(--color-surface)] flex items-center justify-center">
				<CatIcon size={56} strokeWidth={1} class="text-[var(--color-muted)]" />
			</div>
		{/if}

		<!-- Details -->
		<div class="p-5">
			<div class="flex items-center gap-2 mb-2">
				<span
					class="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full
						{item.type === 'lost'
							? 'bg-[var(--color-lost-light)] text-[var(--color-lost)]'
							: 'bg-[var(--color-found-light)] text-[var(--color-found)]'}"
				>
					{item.type === 'lost' ? $_('common.lost') : $_('common.found')}
				</span>
				<span class="text-xs text-[var(--color-muted)] flex items-center gap-1">
					<CatIcon size={12} strokeWidth={2} /> {$_(`categories.${item.category}`)}
				</span>
			</div>

			<h2 class="text-lg font-bold text-[var(--color-ink)] mb-2">{item.title}</h2>

			{#if item.description}
				<p class="text-sm text-[var(--color-ink-light)] mb-3">{item.description}</p>
			{/if}

			<div class="flex flex-col gap-1 text-sm text-[var(--color-muted)] mb-4">
				<p class="flex items-center gap-1.5">
					<MapPin size={13} class="text-[var(--color-amber)] shrink-0" /> {item.location_name}
				</p>
				<p class="flex items-center gap-1.5">
					<Calendar size={13} class="text-[var(--color-amber)] shrink-0" /> {formatDate(item.date_occurred)}
				</p>
			</div>

			<a
				href="/item/{item.id}"
				class="w-full py-2.5 rounded-xl font-medium text-sm bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink-light)] transition-colors inline-flex items-center justify-center gap-1.5"
			>
				{$_('home.viewDetails')} <ArrowRight size={14} />
			</a>
		</div>
	</div>
</div>

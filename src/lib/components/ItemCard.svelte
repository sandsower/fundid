<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import type { Item } from '$types/item';
	import { categoryIcons } from '$utils/categories';
	import { MapPin } from 'lucide-svelte';

	let { item, onSelect }: { item: Item; onSelect?: (item: Item) => void } = $props();

	function timeAgo(dateStr: string): string {
		const diff = Date.now() - new Date(dateStr).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 60) return `${mins}m`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days}d`;
		return `${Math.floor(days / 7)}w`;
	}

	const Icon = $derived(categoryIcons[item.category] || categoryIcons.other);

	function handleClick() {
		if (onSelect) {
			onSelect(item);
		} else {
			goto(`/item/${item.id}`);
		}
	}
</script>

<button
	onclick={handleClick}
	class="group block w-full text-left bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-amber)] hover:shadow-sm transition-all cursor-pointer"
>
	{#if item.image_url}
		<div class="h-44 bg-[var(--color-surface)] overflow-hidden">
			<img
				src={item.image_url}
				alt={item.title}
				class="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
			/>
		</div>
	{:else}
		<div class="h-32 bg-[var(--color-surface)] flex items-center justify-center">
			<Icon size={40} strokeWidth={1.5} class="text-[var(--color-muted)]" />
		</div>
	{/if}
	<div class="p-4">
		<div class="flex items-center gap-2 mb-2">
			<span
				class="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full
					{item.type === 'lost'
						? 'bg-[var(--color-lost-light)] text-[var(--color-lost)]'
						: 'bg-[var(--color-found-light)] text-[var(--color-found)]'}"
			>
				{item.type === 'lost' ? $_('common.lost') : $_('common.found')}
			</span>
			<span class="text-[11px] text-[var(--color-muted)]">{timeAgo(item.created_at)}</span>
		</div>
		<h3 class="font-semibold text-sm text-[var(--color-ink)] line-clamp-1 group-hover:text-[var(--color-amber-dark)] transition-colors">
			{item.title}
		</h3>
		<p class="text-xs text-[var(--color-muted)] mt-1.5 flex items-center gap-1">
			<MapPin size={12} class="text-[var(--color-amber)] shrink-0" />
			<span class="line-clamp-1">{item.location_name}</span>
		</p>
	</div>
</button>

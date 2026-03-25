<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import ItemCard from '$components/ItemCard.svelte';
	import CategoryFilter from '$components/CategoryFilter.svelte';
	import Map from '$components/Map.svelte';
	import ReportForm from '$components/ReportForm.svelte';
	import { items, filters, loading } from '$stores/items';
	import { SearchX, HandHelping, Map as MapIcon, LayoutList, Search, X } from 'lucide-svelte';
	import type { ItemType, ItemCategory } from '$types/item';
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';

	let view: 'map' | 'list' = $state('map');
	let showFoundModal = $state(false);

	onMount(async () => {
		loading.set(true);
		const { data, error } = await supabase
			.from('items')
			.select('id, type, category, title, description, image_url, latitude, longitude, location_name, date_occurred, status, contact_method, created_at, updated_at')
			.eq('status', 'active')
			.order('created_at', { ascending: false })
			.limit(50);

		if (data && !error) items.set(data);
		loading.set(false);
	});

	let filteredItems = $derived.by(() => {
		let result = $items;
		if ($filters.type !== 'all') result = result.filter((i) => i.type === $filters.type);
		if ($filters.category !== 'all') result = result.filter((i) => i.category === $filters.category);
		if ($filters.query) {
			const q = $filters.query.toLowerCase();
			result = result.filter(
				(i) =>
					i.title.toLowerCase().includes(q) ||
					i.description.toLowerCase().includes(q) ||
					i.location_name.toLowerCase().includes(q)
			);
		}
		return result;
	});

	function setType(type: ItemType | 'all') {
		filters.update((f) => ({ ...f, type }));
	}

	function setCategory(category: ItemCategory | 'all') {
		filters.update((f) => ({ ...f, category }));
	}

	function handleFoundSuccess(id: string) {
		showFoundModal = false;
		goto(`/item/${id}`);
	}
</script>

<!-- Map section — full width, the hero IS the map -->
<section class="relative">
	<div class="h-[55vh] md:h-[60vh] w-full">
		<Map items={filteredItems} />
	</div>

	<!-- Floating action buttons over the map -->
	<div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
		<a
			href="/new?type=lost"
			class="bg-[var(--color-lost)] text-white font-medium text-sm px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all inline-flex items-center gap-1.5"
		>
			<SearchX size={16} /> {$_('home.iLostSomething')}
		</a>
		<button
			onclick={() => (showFoundModal = true)}
			class="bg-[var(--color-found)] text-white font-medium text-sm px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all inline-flex items-center gap-1.5"
		>
			<HandHelping size={16} /> {$_('home.iFoundSomething')}
		</button>
	</div>
</section>

<!-- Filters + listings -->
<section class="max-w-6xl mx-auto px-4 py-6">
	<!-- Controls bar -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2">
			{#each ['all', 'lost', 'found'] as type}
				<button
					onclick={() => setType(type as ItemType | 'all')}
					class="text-sm px-3.5 py-1.5 rounded-full font-medium transition-colors
						{$filters.type === type
							? type === 'lost' ? 'bg-[var(--color-lost)] text-white'
							: type === 'found' ? 'bg-[var(--color-found)] text-white'
							: 'bg-[var(--color-ink)] text-white'
						: 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)]'}"
				>
					{type === 'all' ? $_('common.all') : type === 'lost' ? $_('common.lost') : $_('common.found')}
				</button>
			{/each}
		</div>

		<!-- View toggle -->
		<div class="flex border border-[var(--color-border)] rounded-lg overflow-hidden">
			<button
				onclick={() => (view = 'map')}
				class="px-3 py-1.5 transition-colors flex items-center {view === 'map' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-muted)] hover:bg-[var(--color-surface)]'}"
			>
				<MapIcon size={16} />
			</button>
			<button
				onclick={() => (view = 'list')}
				class="px-3 py-1.5 transition-colors flex items-center {view === 'list' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-muted)] hover:bg-[var(--color-surface)]'}"
			>
				<LayoutList size={16} />
			</button>
		</div>
	</div>

	<CategoryFilter selected={$filters.category} onSelect={setCategory} />

	<!-- Search -->
	<div class="mt-3 mb-5">
		<input
			type="text"
			placeholder="{$_('common.search')}..."
			class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent placeholder:text-[var(--color-muted)]"
			oninput={(e) => filters.update((f) => ({ ...f, query: (e.target as HTMLInputElement).value }))}
		/>
	</div>

	{#if $loading}
		<p class="text-center text-[var(--color-muted)] py-12 text-sm">{$_('common.loading')}</p>
	{:else if filteredItems.length === 0}
		<div class="text-center py-16">
			<div class="flex justify-center mb-3"><Search size={40} strokeWidth={1} class="text-[var(--color-muted)]" /></div>
			<p class="text-[var(--color-muted)] text-sm">{$_('common.noResults')}</p>
		</div>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredItems as item (item.id)}
				<ItemCard {item} />
			{/each}
		</div>
	{/if}
</section>

<!-- Found item modal -->
{#if showFoundModal}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center"
		role="dialog"
		aria-modal="true"
	>
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/40 backdrop-blur-sm"
			onclick={() => (showFoundModal = false)}
			aria-label="Close"
		></button>

		<!-- Modal panel -->
		<div class="relative bg-white w-full max-w-lg mx-4 mt-16 mb-8 rounded-2xl shadow-2xl border border-[var(--color-border)] max-h-[calc(100vh-6rem)] overflow-y-auto">
			<div class="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-2xl flex items-center justify-between">
				<div>
					<h2 class="text-lg font-bold text-[var(--color-ink)]">{$_('item.reportFound')}</h2>
					<p class="text-xs text-[var(--color-muted)]">Help someone get their item back.</p>
				</div>
				<button
					onclick={() => (showFoundModal = false)}
					class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
				>
					<X size={18} />
				</button>
			</div>
			<div class="p-6">
				<ReportForm type="found" onSuccess={handleFoundSuccess} onCancel={() => (showFoundModal = false)} />
			</div>
		</div>
	</div>
{/if}


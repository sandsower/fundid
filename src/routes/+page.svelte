<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { goto, replaceState } from '$app/navigation';

	const { t } = getTranslate();
	import { page } from '$app/stores';
	import ItemCard from '$components/ItemCard.svelte';
	import CategoryFilter from '$components/CategoryFilter.svelte';
	import Map from '$components/Map.svelte';
	import ReportForm from '$components/ReportForm.svelte';
	import ItemPreview from '$components/ItemPreview.svelte';
	import SuccessModal from '$components/SuccessModal.svelte';
	import { items, filters, loading } from '$stores/items';
	import { SearchX, HandHelping, Map as MapIcon, LayoutList, Search, X } from 'lucide-svelte';
	import type { Item, ItemType, ItemCategory } from '$types/item';
	import { supabase } from '$lib/supabase';
	import { generateMockItems } from '$utils/mock-data';
	import { dev } from '$app/environment';
	import { onMount } from 'svelte';

	import { capture } from '$lib/posthog';
	import type { MapBounds } from '$components/Map.svelte';

	// Initialize state from URL
	const params = $page.url.searchParams;
	const initialType = params.get('type');
	const initialCategory = params.get('category');
	const initialQuery = params.get('q') || '';
	const initialView = params.get('view');

	let view: 'map' | 'list' = $state(initialView === 'list' ? 'list' : 'map');
	let showReportModal: 'lost' | 'found' | null = $state(null);
	let successItemId: string | null = $state(null);
	let previewItem: import('$types/item').Item | null = $state(null);
	let visibleCount = $state(18);
	let mapBounds: MapBounds | null = $state(null);
	let boundsTimer: ReturnType<typeof setTimeout>;
	let searchSyncTimer: ReturnType<typeof setTimeout>;
	let hasMore = $state(false);
	let loadingMore = $state(false);

	// Set initial filters from URL
	if (initialType === 'lost' || initialType === 'found') {
		filters.update((f) => ({ ...f, type: initialType }));
	}
	if (initialCategory && initialCategory !== 'all') {
		filters.update((f) => ({ ...f, category: initialCategory as ItemCategory }));
	}
	if (initialQuery) {
		filters.update((f) => ({ ...f, query: initialQuery }));
	}

	function syncUrl() {
		const url = new URL($page.url);

		// View
		if (view === 'list') url.searchParams.set('view', 'list');
		else url.searchParams.delete('view');

		// Type
		const f = $filters;
		if (f.type !== 'all') url.searchParams.set('type', f.type);
		else url.searchParams.delete('type');

		// Category
		if (f.category !== 'all') url.searchParams.set('category', f.category);
		else url.searchParams.delete('category');

		// Query
		if (f.query) url.searchParams.set('q', f.query);
		else url.searchParams.delete('q');

		replaceState(url, {});
	}

	function setView(v: 'map' | 'list') {
		view = v;
		visibleCount = 18;
		if (v === 'list') mapBounds = null;
		syncUrl();
		capture('view_toggled', { view: v });
	}

	function handleBoundsChange(bounds: MapBounds) {
		clearTimeout(boundsTimer);
		boundsTimer = setTimeout(() => {
			mapBounds = bounds;
			visibleCount = 18;
		}, 300);
	}

	const USE_MOCK = dev;

	async function fetchItems(cursor?: string) {
		const params = new URLSearchParams();
		if ($filters.type !== 'all') params.set('type', $filters.type);
		if ($filters.category !== 'all') params.set('category', $filters.category);
		if ($filters.query) params.set('q', $filters.query);
		if (cursor) params.set('cursor', cursor);

		const res = await fetch(`/api/items/search?${params}`);
		if (!res.ok) return { items: [] as Item[], hasMore: false };
		return res.json() as Promise<{ items: Item[]; hasMore: boolean }>;
	}

	async function loadItems() {
		loading.set(true);
		const result = await fetchItems();
		items.set(result.items);
		hasMore = result.hasMore;
		loading.set(false);
	}

	async function loadMore() {
		const current = $items;
		if (current.length === 0 || loadingMore) return;
		loadingMore = true;
		const cursor = current[current.length - 1].created_at;
		const result = await fetchItems(cursor);
		items.update((prev) => [...prev, ...result.items]);
		hasMore = result.hasMore;
		loadingMore = false;
	}

	onMount(async () => {
		// Skip if we already have items (e.g. navigating back)
		if ($items.length > 0) return;

		if (USE_MOCK) {
			items.set(generateMockItems(300));
			loading.set(false);
			return;
		}

		await loadItems();
	});

	// Server-side refetch when filters change (skip during mock/dev)
	let lastFilterKey = '';
	$effect(() => {
		const key = `${$filters.type}|${$filters.category}|${$filters.query}`;
		if (key === lastFilterKey) return;
		lastFilterKey = key;
		if (USE_MOCK || $loading) return;
		visibleCount = 18;
		loadItems();
	});

	// In dev, filter mock data client-side; in prod, items are already filtered by the API
	let searchFiltered = $derived.by(() => {
		if (!USE_MOCK) return $items;
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

	// Items visible on the current map viewport — fed to the card grid
	let filteredItems = $derived.by(() => {
		const b = mapBounds;
		if (!b) return searchFiltered;
		return searchFiltered.filter((i) =>
			i.latitude >= b.south &&
			i.latitude <= b.north &&
			i.longitude >= b.west &&
			i.longitude <= b.east
		);
	});

	function setType(type: ItemType | 'all') {
		filters.update((f) => ({ ...f, type }));
		visibleCount = 18;
		syncUrl();
		capture('filter_changed', { filter_type: 'type', value: type });
	}

	function setCategory(category: ItemCategory | 'all') {
		filters.update((f) => ({ ...f, category }));
		visibleCount = 18;
		syncUrl();
		capture('filter_changed', { filter_type: 'category', value: category });
	}

	function handleReportSuccess(id: string) {
		showReportModal = null;
		successItemId = id;
	}
</script>

<!-- Map section — animates between full height and collapsed -->
<section class="relative overflow-hidden transition-all duration-500 ease-in-out" style="height: {view === 'map' ? '60vh' : '0px'};">
	<div class="h-[60vh] w-full">
		<Map items={searchFiltered} onBoundsChange={handleBoundsChange} />
	</div>

	<!-- Floating action buttons over the map -->
	{#if view === 'map'}
		<div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
			<button
				onclick={() => { showReportModal = 'lost'; capture('report_form_opened', { type: 'lost' }); }}
				class="bg-[var(--color-lost)] text-white font-medium text-sm px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all inline-flex items-center gap-1.5"
			>
				<SearchX size={16} /> {$t('home.iLostSomething')}
			</button>
			<button
				onclick={() => { showReportModal = 'found'; capture('report_form_opened', { type: 'found' }); }}
				class="bg-[var(--color-found)] text-white font-medium text-sm px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all inline-flex items-center gap-1.5"
			>
				<HandHelping size={16} /> {$t('home.iFoundSomething')}
			</button>
		</div>
	{/if}
</section>

<!-- Floating buttons when map is hidden -->
{#if view === 'list'}
	<div class="flex justify-center gap-2 py-4 border-b border-[var(--color-border)]">
		<button
			onclick={() => { showReportModal = 'lost'; capture('report_form_opened', { type: 'lost' }); }}
			class="bg-[var(--color-lost)] text-white font-medium text-sm px-5 py-2.5 rounded-full hover:scale-105 transition-all inline-flex items-center gap-1.5"
		>
			<SearchX size={16} /> {$t('home.iLostSomething')}
		</button>
		<button
			onclick={() => { showReportModal = 'found'; capture('report_form_opened', { type: 'found' }); }}
			class="bg-[var(--color-found)] text-white font-medium text-sm px-5 py-2.5 rounded-full hover:scale-105 transition-all inline-flex items-center gap-1.5"
		>
			<HandHelping size={16} /> {$t('home.iFoundSomething')}
		</button>
	</div>
{/if}

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
					{type === 'all' ? $t('common.all') : type === 'lost' ? $t('common.lost') : $t('common.found')}
				</button>
			{/each}
		</div>

		<!-- View toggle -->
		<div class="flex border border-[var(--color-border)] rounded-lg overflow-hidden">
			<button
				onclick={() => setView('map')}
				class="px-3 py-1.5 transition-colors flex items-center {view === 'map' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-muted)] hover:bg-[var(--color-surface)]'}"
			>
				<MapIcon size={16} />
			</button>
			<button
				onclick={() => setView('list')}
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
			placeholder="{$t('common.search')}..."
			class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent placeholder:text-[var(--color-muted)]"
			value={$filters.query}
			oninput={(e) => {
				const q = (e.target as HTMLInputElement).value;
				filters.update((f) => ({ ...f, query: q }));
				visibleCount = 18;
				clearTimeout(searchSyncTimer);
				searchSyncTimer = setTimeout(() => { syncUrl(); if (q) capture('filter_changed', { filter_type: 'search', value: q }); }, 500);
			}}
		/>
	</div>

	{#if $loading}
		<p class="text-center text-[var(--color-muted)] py-12 text-sm">{$t('common.loading')}</p>
	{:else if filteredItems.length === 0}
		<div class="text-center py-16">
			<div class="flex justify-center mb-3"><Search size={40} strokeWidth={1} class="text-[var(--color-muted)]" /></div>
			<p class="text-[var(--color-muted)] text-sm">{$t('common.noResults')}</p>
		</div>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredItems.slice(0, visibleCount) as item (item.id)}
				<ItemCard {item} onSelect={(i) => (previewItem = i)} />
			{/each}
		</div>
		{#if filteredItems.length > visibleCount}
			<div class="text-center mt-6">
				<button
					onclick={() => (visibleCount += 18)}
					class="text-sm font-medium text-[var(--color-amber-dark)] hover:text-[var(--color-amber)] transition-colors px-5 py-2.5 border border-[var(--color-border)] rounded-full hover:border-[var(--color-amber)] inline-flex items-center gap-1.5"
				>
					{$t('home.showMore')} ({filteredItems.length - visibleCount})
				</button>
			</div>
		{:else if hasMore}
			<div class="text-center mt-6">
				<button
					onclick={loadMore}
					disabled={loadingMore}
					class="text-sm font-medium text-[var(--color-amber-dark)] hover:text-[var(--color-amber)] transition-colors px-5 py-2.5 border border-[var(--color-border)] rounded-full hover:border-[var(--color-amber)] inline-flex items-center gap-1.5 disabled:opacity-50"
				>
					{loadingMore ? $t('common.loading') : $t('home.loadMore')}
				</button>
			</div>
		{/if}
	{/if}
</section>

<!-- Report modal (lost or found) -->
{#if showReportModal}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center"
		role="dialog"
		aria-modal="true"
	>
		<button
			class="absolute inset-0 bg-black/40 backdrop-blur-sm"
			onclick={() => (showReportModal = null)}
			aria-label="Close"
		></button>

		<div class="relative bg-white w-full max-w-lg mx-4 mt-4 mb-4 rounded-2xl shadow-2xl border border-[var(--color-border)] max-h-[calc(100vh-2rem)] overflow-y-auto">
			<div class="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-2xl flex items-center justify-between">
				<div>
					<h2 class="text-lg font-bold text-[var(--color-ink)]">
						{showReportModal === 'lost' ? $t('item.reportLost') : $t('item.reportFound')}
					</h2>
					<p class="text-xs text-[var(--color-muted)]">
						{showReportModal === 'lost' ? $t('item.reportLostSub') : $t('item.reportFoundSub')}
					</p>
				</div>
				<button
					onclick={() => (showReportModal = null)}
					class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
				>
					<X size={18} />
				</button>
			</div>
			<div class="p-6">
				<ReportForm type={showReportModal} onSuccess={handleReportSuccess} onCancel={() => (showReportModal = null)} />
			</div>
		</div>
	</div>
{/if}

{#if previewItem}
	<ItemPreview item={previewItem} onClose={() => (previewItem = null)} />
{/if}

{#if successItemId}
	<SuccessModal itemId={successItemId} onClose={() => { goto(`/item/${successItemId}`); successItemId = null; }} />
{/if}


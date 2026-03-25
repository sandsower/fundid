<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { categoryIcons } from '$utils/categories';
	import { ArrowLeft, Printer, MapPin, Calendar } from 'lucide-svelte';
	import type { Item } from '$types/item';

	let item: Item | null = $state(null);
	let loading = $state(true);
	let CatIcon = $derived(item ? (categoryIcons[item.category] || categoryIcons.other) : categoryIcons.other);

	onMount(async () => {
		const { data, error } = await supabase.from('items').select('*').eq('id', $page.params.id).single();
		if (data && !error) item = data;
		loading = false;
	});

	function printFlyer() {
		window.print();
	}

	$effect(() => {
		if (item) document.title = `${item.type === 'lost' ? 'TÝNT' : 'FUNDIÐ'}: ${item.title} — Fundið`;
	});
</script>

{#if loading}
	<p class="text-center text-[var(--color-muted)] py-16 text-sm">{$_('common.loading')}</p>
{:else if !item}
	<p class="text-center text-[var(--color-muted)] py-16 text-sm">{$_('common.noResults')}</p>
{:else}
	<div class="max-w-2xl mx-auto px-4 py-8">
		<div class="no-print mb-4 flex items-center">
			<a href="/item/{item.id}" class="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors inline-flex items-center gap-1.5">
				<ArrowLeft size={14} /> {$_('common.back')}
			</a>
			<button
				onclick={printFlyer}
				class="ml-auto px-5 py-2 bg-[var(--color-ink)] text-white rounded-full text-sm font-medium hover:bg-[var(--color-ink-light)] transition-colors inline-flex items-center gap-1.5"
			>
				<Printer size={14} /> {$_('flyer.printFlyer')}
			</button>
		</div>

		<div class="flyer bg-white border-4 rounded-2xl p-10 text-center {item.type === 'lost' ? 'border-[var(--color-lost)]' : 'border-[var(--color-found)]'}">
			<h1 class="text-6xl font-black tracking-tight mb-1 {item.type === 'lost' ? 'text-[var(--color-lost)]' : 'text-[var(--color-found)]'}">
				{item.type === 'lost' ? $_('flyer.title') : $_('flyer.foundTitle')}
			</h1>

			<p class="text-xl text-[var(--color-muted)] mb-6 flex items-center justify-center gap-2">
				<CatIcon size={24} strokeWidth={1.5} /> {$_(`categories.${item.category}`)}
			</p>

			{#if item.image_url}
				<img src={item.image_url} alt={item.title} class="mx-auto max-h-72 rounded-xl object-cover mb-6" />
			{:else}
				<div class="mb-6 flex justify-center">
					<CatIcon size={80} strokeWidth={0.75} class="text-[var(--color-muted)]" />
				</div>
			{/if}

			<h2 class="text-2xl font-bold text-[var(--color-ink)] mb-2">{item.title}</h2>
			{#if item.description}
				<p class="text-lg text-[var(--color-ink-light)] mb-5">{item.description}</p>
			{/if}

			<div class="text-lg mb-8 space-y-2 text-[var(--color-ink)]">
				<p class="flex items-center justify-center gap-2"><MapPin size={18} class="text-[var(--color-amber)]" /> <strong>{item.location_name}</strong></p>
				<p class="flex items-center justify-center gap-2"><Calendar size={18} class="text-[var(--color-amber)]" /> {new Date(item.date_occurred).toLocaleDateString('is-IS')}</p>
			</div>

			<div class="border-t-2 border-[var(--color-border)] pt-6">
				<p class="text-sm text-[var(--color-muted)] mb-3">{item.type === 'lost' ? $_('flyer.scanLost') : $_('flyer.scanFound')}</p>
				<img
					src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={encodeURIComponent(`https://fundid.is/item/${item.id}`)}"
					alt="QR Code"
					class="mx-auto w-40 h-40"
				/>
				<p class="text-xs text-[var(--color-muted)] mt-2">fundid.is/item/{item.id}</p>
			</div>

			<p class="mt-8 text-sm font-semibold text-[var(--color-amber-dark)]">
				Fundið — {$_('common.tagline')}
			</p>
		</div>
	</div>
{/if}

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { categoryIcons } from '$utils/categories';
	import Map from '$components/Map.svelte';
	import { MapPin, Calendar, Clock, Share2, Printer, ArrowLeft, Mail } from 'lucide-svelte';
	import type { Item } from '$types/item';

	let item: Item | null = $state(null);
	let loading = $state(true);
	let showContact = $state(false);
	let CatIcon = $derived(item ? (categoryIcons[item.category] || categoryIcons.other) : categoryIcons.other);

	onMount(async () => {
		const { data, error } = await supabase.from('items').select('*').eq('id', $page.params.id).single();
		if (data && !error) item = data;
		loading = false;
	});

	function shareItem() {
		if (!item) return;
		const url = window.location.href;
		const text = `${item.type === 'lost' ? '🔴 TÝNT' : '🟢 FUNDIÐ'}: ${item.title} — ${item.location_name}`;
		if (navigator.share) {
			navigator.share({ title: `Fundið — ${item.title}`, text, url });
		} else {
			navigator.clipboard.writeText(`${text}\n${url}`);
		}
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('is-IS', { year: 'numeric', month: 'long', day: 'numeric' });
	}
</script>

<section class="max-w-3xl mx-auto px-4 py-8">
	{#if loading}
		<p class="text-center text-[var(--color-muted)] py-16 text-sm">{$_('common.loading')}</p>
	{:else if !item}
		<p class="text-center text-[var(--color-muted)] py-16 text-sm">{$_('common.noResults')}</p>
	{:else}
		<a href="/" class="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors mb-6 inline-flex items-center gap-1.5">
			<ArrowLeft size={14} /> {$_('common.back')}
		</a>

		<div class="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
			{#if item.image_url}
				<img src={item.image_url} alt={item.title} class="w-full h-72 object-cover" />
			{:else}
				<div class="w-full h-48 bg-[var(--color-surface)] flex items-center justify-center">
					<CatIcon size={64} strokeWidth={1} class="text-[var(--color-muted)]" />
				</div>
			{/if}

			<div class="p-6 md:p-8">
				<div class="flex items-center gap-2 mb-3">
					<span class="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full
						{item.type === 'lost'
							? 'bg-[var(--color-lost-light)] text-[var(--color-lost)]'
							: 'bg-[var(--color-found-light)] text-[var(--color-found)]'}">
						{item.type === 'lost' ? $_('common.lost') : $_('common.found')}
					</span>
					<span class="text-xs text-[var(--color-muted)] flex items-center gap-1">
						<CatIcon size={12} strokeWidth={2} /> {$_(`categories.${item.category}`)}
					</span>
					{#if item.status === 'resolved'}
						<span class="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
							{$_('common.resolved')}
						</span>
					{/if}
				</div>

				<h1 class="text-2xl font-bold text-[var(--color-ink)] mb-3">{item.title}</h1>

				{#if item.description}
					<p class="text-[var(--color-ink-light)] leading-relaxed mb-5">{item.description}</p>
				{/if}

				<div class="flex flex-col gap-1.5 text-sm text-[var(--color-muted)] mb-6">
					<p class="flex items-center gap-2">
						<MapPin size={14} class="text-[var(--color-amber)] shrink-0" /> {item.location_name}
					</p>
					<p class="flex items-center gap-2">
						<Calendar size={14} class="text-[var(--color-amber)] shrink-0" /> {formatDate(item.date_occurred)}
					</p>
					<p class="flex items-center gap-2">
						<Clock size={14} class="text-[var(--color-muted)] shrink-0" />
						{$_('item.posted')} {formatDate(item.created_at)}
					</p>
				</div>

				{#if item.latitude && item.longitude}
					<div class="h-[220px] rounded-xl overflow-hidden border border-[var(--color-border)] mb-6">
						<Map items={[item]} />
					</div>
				{/if}

				<div class="flex gap-2 flex-wrap">
					{#if item.status === 'active'}
						<button
							onclick={() => (showContact = !showContact)}
							class="px-5 py-2.5 rounded-full font-medium text-sm text-white transition-colors
								{item.type === 'lost'
									? 'bg-[var(--color-found)] hover:bg-green-600'
									: 'bg-[var(--color-ink)] hover:bg-[var(--color-ink-light)]'}"
						>
							{item.type === 'lost' ? $_('item.contactOwner') : $_('item.contactFinder')}
						</button>
					{/if}

					<button
						onclick={shareItem}
						class="px-5 py-2.5 border border-[var(--color-border)] rounded-full font-medium text-sm text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors inline-flex items-center gap-1.5"
					>
						<Share2 size={14} /> {$_('common.share')}
					</button>

					<a
						href="/item/{item.id}/flyer"
						class="px-5 py-2.5 border border-[var(--color-border)] rounded-full font-medium text-sm text-[var(--color-ink)] hover:border-[var(--color-amber)] hover:text-[var(--color-amber-dark)] transition-colors inline-flex items-center gap-1.5"
					>
						<Printer size={14} /> {$_('item.generateFlyer')}
					</a>
				</div>

				{#if showContact}
					<div class="mt-4 p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
						{#if item.contact_method === 'email' && item.contact_value}
							<p class="text-sm flex items-center gap-2">
								<Mail size={14} class="text-[var(--color-amber)] shrink-0" /> <a href="mailto:{item.contact_value}" class="text-[var(--color-amber-dark)] hover:underline font-medium">{item.contact_value}</a>
							</p>
						{:else}
							<p class="text-sm text-[var(--color-muted)]">
								Anonymous contact — messaging feature coming soon.
							</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</section>

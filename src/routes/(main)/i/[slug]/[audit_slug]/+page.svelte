<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { Building2, CheckCircle, Trash2, Clock } from 'lucide-svelte';
	import { categoryIcons } from '$utils/categories';
	import { formatDate } from '$utils/date';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	const { t } = getTranslate();
	let { data }: { data: PageData } = $props();

	let expiringId: string | null = $state(null);
	let errorMsg = $state('');

	async function expireItem(itemId: string) {
		expiringId = itemId;
		errorMsg = '';
		try {
			const res = await fetch('/api/institution/expire', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					slug: data.institution.slug,
					audit_slug: data.auditSlug,
					item_id: itemId
				})
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = body.error || 'error';
				return;
			}
			await invalidateAll();
		} catch {
			errorMsg = 'network';
		} finally {
			expiringId = null;
		}
	}

	let activeItems = $derived(data.items.filter((i) => i.status === 'active'));
	let inactiveItems = $derived(data.items.filter((i) => i.status !== 'active'));
</script>

<svelte:head>
	<title>Audit — {data.institution.name} — Fundið</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="max-w-2xl mx-auto px-4 py-8">
	<div class="mb-6 flex items-center gap-3">
		<div class="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center">
			<Building2 size={20} class="text-[var(--color-amber)]" />
		</div>
		<div>
			<p class="text-xs text-[var(--color-muted)]">Audit view</p>
			<h1 class="text-lg font-bold text-[var(--color-ink)]">{data.institution.name}</h1>
		</div>
	</div>

	<div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 mb-6 text-sm text-[var(--color-ink-light)]">
		<p class="mb-2">
			This page lists every Fundið submission tied to your QR poster. If anything looks wrong — not from
			your staff or inappropriate — tap <strong>Remove</strong> and the item disappears from the public map.
		</p>
		<p class="text-xs text-[var(--color-muted)]">
			Keep this URL. It is the only way to reach this audit view. Daily submission limit: {data.institution.rate_limit_per_day}.
		</p>
	</div>

	{#if errorMsg}
		<p class="text-sm text-[var(--color-lost)] mb-4">{errorMsg}</p>
	{/if}

	<h2 class="text-sm font-semibold text-[var(--color-ink)] uppercase tracking-wide mb-3">Active ({activeItems.length})</h2>
	{#if activeItems.length === 0}
		<p class="text-sm text-[var(--color-muted)] mb-8">No active items.</p>
	{:else}
		<ul class="space-y-3 mb-8">
			{#each activeItems as item}
				{@const Icon = categoryIcons[item.category] ?? categoryIcons.other}
				<li class="flex gap-3 items-start rounded-xl border border-[var(--color-border)] p-3 bg-white">
					{#if item.image_url}
						<img src={item.image_url} alt={item.title} class="w-16 h-16 object-cover rounded-lg shrink-0" />
					{:else}
						<div class="w-16 h-16 rounded-lg bg-[var(--color-surface)] flex items-center justify-center shrink-0">
							<Icon size={24} strokeWidth={1.5} class="text-[var(--color-muted)]" />
						</div>
					{/if}
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-1.5 mb-1">
							<Icon size={12} strokeWidth={2} class="text-[var(--color-muted)] shrink-0" />
							<p class="text-xs text-[var(--color-muted)] truncate">{$t(`categories.${item.category}`)}</p>
							<span class="text-xs text-[var(--color-muted)]">·</span>
							<p class="text-xs text-[var(--color-muted)] flex items-center gap-1">
								<Clock size={11} />{formatDate(item.created_at)}
							</p>
						</div>
						<p class="text-sm font-semibold text-[var(--color-ink)] mb-0.5 truncate">{item.title}</p>
						{#if item.description}
							<p class="text-xs text-[var(--color-ink-light)] line-clamp-2">{item.description}</p>
						{/if}
					</div>
					<button
						onclick={() => expireItem(item.id)}
						disabled={expiringId === item.id}
						class="px-3 py-2 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-lost)] hover:border-[var(--color-lost)] transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
					>
						<Trash2 size={12} />
						{expiringId === item.id ? '...' : 'Remove'}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if inactiveItems.length > 0}
		<h2 class="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">Removed / expired ({inactiveItems.length})</h2>
		<ul class="space-y-2">
			{#each inactiveItems as item}
				{@const Icon = categoryIcons[item.category] ?? categoryIcons.other}
				<li class="flex gap-3 items-center rounded-xl border border-[var(--color-border)] p-3 bg-[var(--color-surface)] opacity-60">
					<Icon size={14} strokeWidth={2} class="text-[var(--color-muted)] shrink-0" />
					<p class="text-sm text-[var(--color-ink-light)] flex-1 truncate">{item.title}</p>
					<span class="text-xs text-[var(--color-muted)] flex items-center gap-1">
						<CheckCircle size={11} />{item.status}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>

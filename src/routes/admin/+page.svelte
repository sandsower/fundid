<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Check, Trash2, LogOut } from 'lucide-svelte';

	let { data, form } = $props();

	let confirmDelete: string | null = $state(null);
	let activeFilter = $derived(data.filter);

	function setFilter(filter: string) {
		const url = new URL($page.url);
		if (filter === 'all') url.searchParams.delete('filter');
		else url.searchParams.set('filter', filter);
		goto(url.toString(), { invalidateAll: true });
	}

	const filters = [
		{ key: 'all', label: 'All' },
		{ key: 'active', label: 'Active' },
		{ key: 'resolved', label: 'Resolved' },
		{ key: 'expired', label: 'Expired' }
	];

	const statusColors: Record<string, string> = {
		active: 'bg-[var(--color-found-light)] text-[var(--color-found)]',
		resolved: 'bg-[var(--color-amber-light)] text-[var(--color-amber-dark)]',
		expired: 'bg-gray-100 text-gray-500'
	};
</script>

<div class="min-h-screen bg-[var(--color-surface)]">
	<!-- Header -->
	<div class="bg-white border-b border-[var(--color-border)]">
		<div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<img src="/logo-v2-pin-checkmark.svg" alt="Fundið" class="w-8 h-11" />
				<h1 class="text-lg font-bold text-[var(--color-ink)]">Admin</h1>
			</div>
			<div class="flex items-center gap-4">
				<span class="text-sm text-[var(--color-muted)]">{data.items.length} items</span>
				<a href="/admin/login?logout" class="text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors">
					<LogOut size={18} />
				</a>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="max-w-5xl mx-auto px-4 pt-4">
		<div class="flex gap-2">
			{#each filters as f}
				<button
					onclick={() => setFilter(f.key)}
					class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
						{activeFilter === f.key
							? 'bg-[var(--color-amber)] text-white'
							: 'bg-white border border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-amber)]'}"
				>
					{f.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Table -->
	<div class="max-w-5xl mx-auto px-4 py-4">
		{#if form?.error}
			<div class="mb-4 p-3 bg-[var(--color-lost-light)] text-[var(--color-lost)] text-sm rounded-xl">
				{form.error}
			</div>
		{/if}

		{#if data.items.length === 0}
			<div class="text-center py-16 text-[var(--color-muted)]">
				<p class="text-lg font-medium">No items found</p>
			</div>
		{:else}
			<div class="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-[var(--color-border)] text-left">
								<th class="px-4 py-3 font-semibold text-[var(--color-muted)]">Status</th>
								<th class="px-4 py-3 font-semibold text-[var(--color-muted)]">Type</th>
								<th class="px-4 py-3 font-semibold text-[var(--color-muted)]">Title</th>
								<th class="px-4 py-3 font-semibold text-[var(--color-muted)]">Category</th>
								<th class="px-4 py-3 font-semibold text-[var(--color-muted)]">Location</th>
								<th class="px-4 py-3 font-semibold text-[var(--color-muted)]">Date</th>
								<th class="px-4 py-3 font-semibold text-[var(--color-muted)]">Created</th>
								<th class="px-4 py-3 font-semibold text-[var(--color-muted)]">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each data.items as item (item.id)}
								<tr class="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface)] transition-colors">
									<td class="px-4 py-3">
										<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium {statusColors[item.status] || ''}">
											{item.status}
										</span>
									</td>
									<td class="px-4 py-3 text-[var(--color-ink)]">
										<span class="{item.type === 'lost' ? 'text-[var(--color-lost)]' : 'text-[var(--color-found)]'} font-medium">
											{item.type}
										</span>
									</td>
									<td class="px-4 py-3 text-[var(--color-ink)]">
										<a href="/item/{item.id}" target="_blank" class="hover:text-[var(--color-amber)] transition-colors">
											{item.title}
										</a>
									</td>
									<td class="px-4 py-3 text-[var(--color-muted)]">{item.category}</td>
									<td class="px-4 py-3 text-[var(--color-muted)] max-w-[150px] truncate">{item.location_name}</td>
									<td class="px-4 py-3 text-[var(--color-muted)] whitespace-nowrap">{item.date_occurred}</td>
									<td class="px-4 py-3 text-[var(--color-muted)] whitespace-nowrap">
										{new Date(item.created_at).toLocaleDateString()}
									</td>
									<td class="px-4 py-3">
										<div class="flex gap-2">
											{#if item.status === 'active'}
												<form method="POST" action="?/resolve" use:enhance>
													<input type="hidden" name="itemId" value={item.id} />
													<button
														type="submit"
														title="Resolve"
														class="p-1.5 rounded-lg text-[var(--color-found)] hover:bg-[var(--color-found-light)] transition-colors"
													>
														<Check size={16} />
													</button>
												</form>
											{/if}

											{#if confirmDelete === item.id}
												<form method="POST" action="?/delete" use:enhance>
													<input type="hidden" name="itemId" value={item.id} />
													<button
														type="submit"
														class="px-2 py-1 rounded-lg text-xs font-medium text-white bg-[var(--color-lost)] hover:bg-red-500 transition-colors"
													>
														Confirm
													</button>
												</form>
												<button
													onclick={() => (confirmDelete = null)}
													class="px-2 py-1 rounded-lg text-xs font-medium text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-ink)] transition-colors"
												>
													Cancel
												</button>
											{:else}
												<button
													onclick={() => (confirmDelete = item.id)}
													title="Delete"
													class="p-1.5 rounded-lg text-[var(--color-lost)] hover:bg-[var(--color-lost-light)] transition-colors"
												>
													<Trash2 size={16} />
												</button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</div>

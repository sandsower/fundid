<script lang="ts">
	import { page } from '$app/stores';
	import { PawPrint } from 'lucide-svelte';

	const id = $derived($page.params.id);
</script>

<div class="max-w-2xl mx-auto px-4 py-12">
	<div class="flex items-center gap-3 mb-8">
		<PawPrint size={24} class="text-[var(--color-amber)]" />
		<h1 class="text-2xl font-bold text-[var(--color-ink)]">Pet Details</h1>
	</div>

	<div class="bg-white rounded-2xl border border-[var(--color-border)] p-8">
		<p class="text-sm text-[var(--color-muted)] mb-2">Pet ID: {id}</p>
		<p class="text-sm text-[var(--color-muted)]">
			The pet case tracker is coming soon. This page will show photos, structured attributes, sighting trail, contact info, and match suggestions.
		</p>
	</div>
</div>

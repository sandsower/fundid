<script lang="ts">
	import { page } from '$app/stores';
	import { PawPrint } from 'lucide-svelte';

	const petId = $derived($page.url.searchParams.get('pet'));
</script>

<div class="max-w-2xl mx-auto px-4 py-12">
	<div class="flex items-center gap-3 mb-8">
		<PawPrint size={24} class="text-[var(--color-amber)]" />
		<h1 class="text-2xl font-bold text-[var(--color-ink)]">Report a Sighting</h1>
	</div>

	<div class="bg-white rounded-2xl border border-[var(--color-border)] p-8">
		{#if petId}
			<p class="text-sm text-[var(--color-muted)] mb-2">Reporting sighting for pet: {petId}</p>
		{/if}
		<p class="text-sm text-[var(--color-muted)]">
			The sighting form is coming soon. This will be a lightweight form to report where you spotted a lost pet, with auto-geolocated pin, optional photo, and instant notification to the owner.
		</p>
	</div>
</div>

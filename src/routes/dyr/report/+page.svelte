<script lang="ts">
	import { PawPrint } from 'lucide-svelte';
</script>

<div class="max-w-2xl mx-auto px-4 py-12">
	<div class="flex items-center gap-3 mb-8">
		<PawPrint size={24} class="text-[var(--color-amber)]" />
		<h1 class="text-2xl font-bold text-[var(--color-ink)]">Report a Pet</h1>
	</div>

	<div class="bg-white rounded-2xl border border-[var(--color-border)] p-8">
		<p class="text-sm text-[var(--color-muted)]">
			The pet report wizard is coming soon. This will be a multi-step form to report a lost or found pet with species, breed, color, photos, location, and phone contact.
		</p>
	</div>
</div>

<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { PawPrint, MapPin, Plus } from 'lucide-svelte';

	const { t } = getTranslate();
</script>

<div class="max-w-4xl mx-auto px-4 py-16 text-center">
	<div class="flex justify-center mb-6">
		<div class="w-20 h-20 rounded-full bg-[var(--color-amber-light)] flex items-center justify-center">
			<PawPrint size={40} class="text-[var(--color-amber)]" />
		</div>
	</div>

	<h1 class="text-3xl font-bold text-[var(--color-ink)] mb-3">Fundið Dýr</h1>
	<p class="text-lg text-[var(--color-muted)] mb-8">
		Týnd og fundin dýr á Íslandi — Lost and found pets in Iceland
	</p>

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-12">
		<a
			href="/dyr/report"
			class="flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-white bg-[var(--color-lost)] hover:bg-red-500 transition-colors"
		>
			<Plus size={18} />
			Report Lost Pet
		</a>
		<a
			href="/dyr/report"
			class="flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-white bg-[var(--color-found)] hover:bg-green-600 transition-colors"
		>
			<MapPin size={18} />
			Report Found Pet
		</a>
	</div>

	<div class="bg-white rounded-2xl border border-[var(--color-border)] p-8">
		<p class="text-sm text-[var(--color-muted)]">
			The pet community map is coming soon. This page will show an interactive map with all lost and found pets in Iceland, sighting trails, and smart matching.
		</p>
	</div>
</div>

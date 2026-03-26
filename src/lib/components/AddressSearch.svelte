<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { searchAddress, type GeoResult } from '$utils/geocode';

	const { t } = getTranslate();

	let {
		value = $bindable(''),
		onSelect
	}: {
		value: string;
		onSelect?: (result: GeoResult) => void;
	} = $props();

	let results: GeoResult[] = $state([]);
	let showResults = $state(false);
	let searching = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	function handleInput(e: Event) {
		const query = (e.target as HTMLInputElement).value;
		value = query;

		clearTimeout(debounceTimer);
		if (query.length < 2) {
			results = [];
			showResults = false;
			return;
		}

		debounceTimer = setTimeout(async () => {
			searching = true;
			results = await searchAddress(query);
			showResults = results.length > 0;
			searching = false;
		}, 800);
	}

	function selectResult(result: GeoResult) {
		value = result.name;
		showResults = false;
		results = [];
		if (onSelect) onSelect(result);
	}

	function handleBlur() {
		// Delay to allow click on result
		setTimeout(() => { showResults = false; }, 200);
	}

	function handleFocus() {
		if (results.length > 0) showResults = true;
	}
</script>

<div class="relative">
	<input
		type="text"
		{value}
		oninput={handleInput}
		onblur={handleBlur}
		onfocus={handleFocus}
		placeholder={$t('item.locationPlaceholder')}
		required
		class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent placeholder:text-[var(--color-muted)]"
	/>
	{#if searching}
		<div class="absolute right-3 top-1/2 -translate-y-1/2">
			<div class="w-4 h-4 border-2 border-[var(--color-amber)] border-t-transparent rounded-full animate-spin"></div>
		</div>
	{/if}

	{#if showResults}
		<ul class="absolute z-20 w-full mt-1 bg-white border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden">
			{#each results as result}
				<li>
					<button
						type="button"
						class="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-amber-light)] transition-colors flex items-center gap-2"
						onmousedown={() => selectResult(result)}
					>
						<span class="text-[var(--color-amber)] shrink-0">●</span>
						<span class="line-clamp-1">{result.name}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Copy, Check, ShieldAlert } from 'lucide-svelte';

	let { code, onDismiss }: { code: string; onDismiss: () => void } = $props();

	let copied = $state(false);

	async function copyCode() {
		await navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
	<button class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick={onDismiss} aria-label="Close"></button>

	<div class="relative bg-white rounded-2xl shadow-2xl max-w-sm mx-4 p-6 text-center">
		<div class="w-12 h-12 bg-[var(--color-amber-light)] rounded-full flex items-center justify-center mx-auto mb-4">
			<ShieldAlert size={24} class="text-[var(--color-amber-dark)]" />
		</div>

		<h2 class="text-lg font-bold text-[var(--color-ink)] mb-1">{$_('claim.title')}</h2>
		<p class="text-sm text-[var(--color-muted)] mb-4">{$_('claim.description')}</p>

		<div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-4">
			<p class="font-mono text-lg font-bold tracking-widest text-[var(--color-ink)]">{code}</p>
		</div>

		<button
			onclick={copyCode}
			class="w-full py-2.5 rounded-xl font-medium text-sm border border-[var(--color-border)] hover:border-[var(--color-ink)] transition-colors inline-flex items-center justify-center gap-2 mb-3"
		>
			{#if copied}
				<Check size={16} class="text-[var(--color-found)]" /> {$_('claim.copied')}
			{:else}
				<Copy size={16} /> {$_('claim.copy')}
			{/if}
		</button>

		<p class="text-xs text-[var(--color-lost)] mb-4">{$_('claim.warning')}</p>

		<button
			onclick={onDismiss}
			class="w-full py-2.5 rounded-xl font-semibold text-sm bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink-light)] transition-colors"
		>
			{$_('claim.saved')}
		</button>
	</div>
</div>

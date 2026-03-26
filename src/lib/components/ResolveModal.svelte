<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { X, CheckCircle } from 'lucide-svelte';

	const { t } = getTranslate();
	import { supabase } from '$lib/supabase';
	import { hashClaimCode } from '$utils/claim';

	let { itemId, onResolved, onClose }: {
		itemId: string;
		onResolved: () => void;
		onClose: () => void;
	} = $props();

	let code = $state('');
	let verifying = $state(false);
	let error = $state('');

	async function verify() {
		if (!code.trim()) return;
		verifying = true;
		error = '';

		try {
			const codeHash = await hashClaimCode(code);
			const { data, error: rpcError } = await supabase.rpc('resolve_item', {
				item_id: itemId,
				code_hash: codeHash
			});

			if (rpcError) throw rpcError;
			if (data) {
				onResolved();
			} else {
				error = $t('claim.invalid');
			}
		} catch (e: any) {
			error = e.message || 'Something went wrong';
		} finally {
			verifying = false;
		}
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
	<button class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={onClose} aria-label="Close"></button>

	<div class="relative bg-white rounded-2xl shadow-2xl max-w-sm mx-4 p-6">
		<button
			onclick={onClose}
			class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
		>
			<X size={18} />
		</button>

		<div class="w-12 h-12 bg-[var(--color-found-light)] rounded-full flex items-center justify-center mx-auto mb-4">
			<CheckCircle size={24} class="text-[var(--color-found)]" />
		</div>

		<h2 class="text-lg font-bold text-[var(--color-ink)] text-center mb-1">{$t('claim.resolveTitle')}</h2>
		<p class="text-sm text-[var(--color-muted)] text-center mb-4">{$t('claim.resolveDescription')}</p>

		<form onsubmit={(e) => { e.preventDefault(); verify(); }}>
			<input
				type="text"
				bind:value={code}
				placeholder="SKILAD-XXXX-XXXX"
				class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm font-mono text-center tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-[var(--color-found)] focus:border-transparent placeholder:text-[var(--color-muted)] placeholder:tracking-widest mb-3"
			/>

			{#if error}
				<p class="text-[var(--color-lost)] text-xs text-center mb-3">{error}</p>
			{/if}

			<button
				type="submit"
				disabled={verifying || !code.trim()}
				class="w-full py-2.5 rounded-xl font-semibold text-sm bg-[var(--color-found)] text-white hover:bg-green-600 transition-colors disabled:opacity-50"
			>
				{verifying ? $t('common.loading') : $t('claim.verify')}
			</button>
		</form>
	</div>
</div>

<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { onMount } from 'svelte';
	import { X, CheckCircle, HelpCircle, ArrowLeft } from 'lucide-svelte';

	const { t } = getTranslate();
	import { supabase } from '$lib/supabase';
	import { capture } from '$lib/posthog';
	import { hashClaimCode } from '$utils/claim';

	let { itemId, onResolved, onClose }: {
		itemId: string;
		onResolved: () => void;
		onClose: () => void;
	} = $props();

	onMount(() => { capture('resolve_started', { item_id: itemId }); });

	let code = $state('');
	let verifying = $state(false);
	let error = $state('');

	// Lost code flow
	let showLostCode = $state(false);
	let supportEmail = $state('');
	let sendingSupport = $state(false);
	let supportSent = $state(false);
	let supportError = $state('');

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
				capture('resolve_completed', { item_id: itemId });
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

	async function sendSupportRequest() {
		if (!supportEmail.trim()) return;
		sendingSupport = true;
		supportError = '';

		try {
			const res = await fetch('/api/support', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ item_id: itemId, email: supportEmail.trim() })
			});

			const data = await res.json().catch(() => ({}));

			if (!res.ok) {
				if (data.error === 'rate_limited') supportError = $t('error.rateLimited');
				else supportError = $t('error.submissionFailed');
				return;
			}

			capture('support_request_sent', { item_id: itemId });
			supportSent = true;
		} catch {
			supportError = $t('error.submissionFailed');
		} finally {
			sendingSupport = false;
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

		{#if supportSent}
			<!-- Support request sent confirmation -->
			<div class="text-center">
				<div class="w-12 h-12 bg-[var(--color-found-light)] rounded-full flex items-center justify-center mx-auto mb-4">
					<CheckCircle size={24} class="text-[var(--color-found)]" />
				</div>
				<h2 class="text-lg font-bold text-[var(--color-ink)] mb-1">{$t('resolve.lostCodeSent')}</h2>
				<p class="text-sm text-[var(--color-muted)] mb-4">{$t('resolve.lostCodeSentDescription')}</p>
				<button
					onclick={onClose}
					class="px-5 py-2.5 bg-[var(--color-ink)] text-white rounded-xl font-medium text-sm hover:bg-[var(--color-ink-light)] transition-colors"
				>
					{$t('common.close')}
				</button>
			</div>
		{:else if showLostCode}
			<!-- Lost code: request support -->
			<button
				onclick={() => (showLostCode = false)}
				class="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors mb-4 inline-flex items-center gap-1"
			>
				<ArrowLeft size={14} /> {$t('common.back')}
			</button>

			<div class="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
				<HelpCircle size={24} class="text-[var(--color-amber)]" />
			</div>

			<h2 class="text-lg font-bold text-[var(--color-ink)] text-center mb-1">{$t('resolve.lostCode')}</h2>
			<p class="text-sm text-[var(--color-muted)] text-center mb-4">{$t('resolve.lostCodeDescription')}</p>

			<form onsubmit={(e) => { e.preventDefault(); sendSupportRequest(); }}>
				<input
					type="email"
					bind:value={supportEmail}
					placeholder={$t('contact.emailPlaceholder')}
					required
					class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent placeholder:text-[var(--color-muted)] mb-3"
				/>

				{#if supportError}
					<p class="text-[var(--color-lost)] text-xs text-center mb-3">{supportError}</p>
				{/if}

				<button
					type="submit"
					disabled={sendingSupport || !supportEmail.trim()}
					class="w-full py-2.5 rounded-xl font-semibold text-sm bg-[var(--color-amber)] text-white hover:bg-[var(--color-amber-dark)] transition-colors disabled:opacity-50"
				>
					{sendingSupport ? $t('common.loading') : $t('resolve.lostCodeSubmit')}
				</button>
			</form>
		{:else}
			<!-- Default: enter claim code -->
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

			<button
				onclick={() => (showLostCode = true)}
				class="w-full mt-3 text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors text-center"
			>
				{$t('resolve.lostCode')}
			</button>
		{/if}
	</div>
</div>

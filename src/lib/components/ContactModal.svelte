<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { onMount } from 'svelte';
	import { X, Send, CheckCircle } from 'lucide-svelte';

	const { t } = getTranslate();
	import { supabase } from '$lib/supabase';
	import { capture } from '$lib/posthog';

	let { itemId, itemType, onClose }: {
		itemId: string;
		itemType: 'lost' | 'found';
		onClose: () => void;
	} = $props();

	onMount(() => { capture('contact_modal_opened', { item_id: itemId, item_type: itemType }); });

	let senderName = $state('');
	let senderEmail = $state('');
	let message = $state('');
	let sending = $state(false);
	let sent = $state(false);
	let error = $state('');

	async function handleSend() {
		if (!senderName.trim() || !senderEmail.trim() || !message.trim()) return;
		sending = true;
		error = '';

		try {
			const { data, error: rpcError } = await supabase.rpc('send_contact_message', {
				p_item_id: itemId,
				p_sender_name: senderName.trim(),
				p_sender_email: senderEmail.trim(),
				p_message: message.trim()
			});

			if (rpcError) throw rpcError;

			if (data?.success) {
				capture('contact_message_sent', { item_id: itemId });
				sent = true;
			} else if (data?.error === 'rate_limited') {
				error = $t('contact.rateLimited');
			} else {
				error = $t('contact.failed');
			}
		} catch (e: any) {
			error = e.message || 'Something went wrong';
		} finally {
			sending = false;
		}
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
	<button class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={onClose} aria-label="Close"></button>

	<div class="relative bg-white rounded-2xl shadow-2xl max-w-sm mx-4 p-6 w-full">
		<button
			onclick={onClose}
			class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
		>
			<X size={18} />
		</button>

		{#if sent}
			<div class="text-center py-4">
				<div class="w-12 h-12 bg-[var(--color-found-light)] rounded-full flex items-center justify-center mx-auto mb-4">
					<CheckCircle size={24} class="text-[var(--color-found)]" />
				</div>
				<h2 class="text-lg font-bold text-[var(--color-ink)] mb-1">{$t('contact.sent')}</h2>
				<p class="text-sm text-[var(--color-muted)] mb-4">{$t('contact.sentDescription')}</p>
				<button
					onclick={onClose}
					class="px-5 py-2.5 bg-[var(--color-ink)] text-white rounded-xl font-medium text-sm hover:bg-[var(--color-ink-light)] transition-colors"
				>
					{$t('common.close')}
				</button>
			</div>
		{:else}
			<h2 class="text-lg font-bold text-[var(--color-ink)] mb-1 pr-8">
				{itemType === 'lost' ? $t('contact.titleLost') : $t('contact.titleFound')}
			</h2>
			<p class="text-sm text-[var(--color-muted)] mb-4">{$t('contact.description')}</p>

			<form onsubmit={(e) => { e.preventDefault(); handleSend(); }} class="space-y-3">
				<div>
					<input
						type="text" bind:value={senderName} placeholder={$t('contact.namePlaceholder')} required
						class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent placeholder:text-[var(--color-muted)]"
					/>
				</div>
				<div>
					<input
						type="email" bind:value={senderEmail} placeholder={$t('contact.emailPlaceholder')} required
						class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent placeholder:text-[var(--color-muted)]"
					/>
					<p class="text-xs text-[var(--color-muted)] mt-1">{$t('contact.emailPrivacy')}</p>
				</div>
				<div>
					<textarea
						bind:value={message} placeholder={$t('contact.messagePlaceholder')} rows="3" required maxlength="500"
						class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent resize-none placeholder:text-[var(--color-muted)]"
					></textarea>
					<p class="text-xs text-[var(--color-muted)] mt-1 text-right">{message.length}/500</p>
				</div>

				{#if error}
					<p class="text-[var(--color-lost)] text-xs">{error}</p>
				{/if}

				<button
					type="submit" disabled={sending || !senderName.trim() || !senderEmail.trim() || !message.trim()}
					class="w-full py-2.5 rounded-xl font-semibold text-sm bg-[var(--color-amber)] text-white hover:bg-[var(--color-amber-dark)] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
				>
					<Send size={14} />
					{sending ? $t('common.loading') : $t('contact.send')}
				</button>
			</form>
		{/if}
	</div>
</div>

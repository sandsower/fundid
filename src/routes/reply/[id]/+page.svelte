<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { page } from '$app/stores';

	const { t } = getTranslate();
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { Send, CheckCircle, XCircle, Loader, ArrowLeft, Lock } from 'lucide-svelte';

	let loading = $state(true);
	let msgData: any = $state(null);
	let history: any[] = $state([]);
	let reply = $state('');
	let sending = $state(false);
	let sent = $state(false);
	let error = $state('');

	onMount(async () => {
		const replyId = $page.params.id;
		const { data, error: rpcError } = await supabase.rpc('get_message_by_token', {
			p_reply_token: replyId
		});

		if (data?.success) {
			msgData = data;
			history = data.history || [];
		}
		loading = false;
	});

	async function handleReply() {
		if (!reply.trim()) return;
		sending = true;
		error = '';

		try {
			const { data, error: rpcError } = await supabase.rpc('reply_to_message', {
				p_reply_token: $page.params.id,
				p_reply_text: reply.trim()
			});

			if (rpcError) throw rpcError;

			if (data?.success) {
				sent = true;
			} else if (data?.error === 'rate_limited') {
				error = $t('contact.rateLimited');
			} else if (data?.error === 'item_resolved') {
				error = $t('reply.itemResolved');
			} else {
				error = data?.error || 'Something went wrong';
			}
		} catch (e: any) {
			error = e.message || 'Something went wrong';
		} finally {
			sending = false;
		}
	}

	function formatTime(dateStr: string): string {
		return new Date(dateStr).toLocaleString('is-IS', {
			month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}

	let isResolved = $derived(msgData?.item_status === 'resolved');
</script>

<section class="max-w-md mx-auto px-4 py-12">
	{#if loading}
		<div class="text-center py-16">
			<Loader size={32} class="text-[var(--color-amber)] animate-spin mx-auto mb-4" />
			<p class="text-sm text-[var(--color-muted)]">{$t('common.loading')}</p>
		</div>
	{:else if !msgData}
		<div class="text-center py-16">
			<div class="w-16 h-16 bg-[var(--color-lost-light)] rounded-full flex items-center justify-center mx-auto mb-4">
				<XCircle size={32} class="text-[var(--color-lost)]" />
			</div>
			<h1 class="text-xl font-bold text-[var(--color-ink)] mb-2">{$t('reply.notFound')}</h1>
			<p class="text-sm text-[var(--color-muted)]">{$t('reply.notFoundDescription')}</p>
		</div>
	{:else if sent}
		<div class="text-center py-8">
			<div class="w-16 h-16 bg-[var(--color-found-light)] rounded-full flex items-center justify-center mx-auto mb-4">
				<CheckCircle size={32} class="text-[var(--color-found)]" />
			</div>
			<h1 class="text-xl font-bold text-[var(--color-ink)] mb-2">{$t('reply.sent')}</h1>
			<p class="text-sm text-[var(--color-muted)] mb-6">{$t('reply.sentDescription')}</p>
			<a
				href="/item/{msgData.item_id}"
				class="px-5 py-2.5 bg-[var(--color-ink)] text-white rounded-xl font-medium text-sm hover:bg-[var(--color-ink-light)] transition-colors inline-flex items-center gap-1.5"
			>
				<ArrowLeft size={14} /> {$t('reply.viewItem')}
			</a>
		</div>
	{:else}
		<a href="/item/{msgData.item_id}" class="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors mb-6 inline-flex items-center gap-1.5">
			<ArrowLeft size={14} /> {msgData.item_title}
		</a>

		<h1 class="text-xl font-bold text-[var(--color-ink)] mb-1">{$t('reply.title')}</h1>
		<p class="text-sm text-[var(--color-muted)] mb-6">{$t('reply.description')}</p>

		<!-- Conversation history -->
		{#if history.length > 0}
			<div class="space-y-3 mb-6">
				{#each history as msg}
					<div class="rounded-xl p-3 {msg.direction === 'inbound'
						? 'bg-[var(--color-surface)] border border-[var(--color-border)]'
						: 'bg-[var(--color-amber-light)] border border-[var(--color-amber)]/20'}">
						<div class="flex items-center justify-between mb-1">
							<p class="text-xs font-medium text-[var(--color-muted)]">{msg.sender_name}</p>
							<p class="text-xs text-[var(--color-muted)]">{formatTime(msg.created_at)}</p>
						</div>
						<p class="text-sm text-[var(--color-ink)] whitespace-pre-wrap">{msg.message}</p>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Reply form or resolved notice -->
		{#if isResolved}
			<div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
				<Lock size={20} class="text-blue-500 mx-auto mb-2" />
				<p class="text-sm font-medium text-blue-700">{$t('reply.itemResolved')}</p>
			</div>
		{:else}
			<form onsubmit={(e) => { e.preventDefault(); handleReply(); }} class="space-y-4">
				<textarea
					bind:value={reply} placeholder={$t('reply.placeholder')} rows="4" required maxlength="500"
					class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent resize-none placeholder:text-[var(--color-muted)]"
				></textarea>

				{#if error}
					<p class="text-[var(--color-lost)] text-xs">{error}</p>
				{/if}

				<button
					type="submit" disabled={sending || !reply.trim()}
					class="w-full py-2.5 rounded-xl font-semibold text-sm bg-[var(--color-amber)] text-white hover:bg-[var(--color-amber-dark)] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
				>
					<Send size={14} />
					{sending ? $t('common.loading') : $t('reply.send')}
				</button>
			</form>
		{/if}
	{/if}
</section>

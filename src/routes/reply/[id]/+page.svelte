<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { Send, CheckCircle, XCircle, Loader, ArrowLeft } from 'lucide-svelte';

	let loading = $state(true);
	let msgData: any = $state(null);
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
		}
		loading = false;
	});

	async function handleReply() {
		if (!reply.trim()) return;
		sending = true;
		error = '';

		try {
			// The poster's reply goes back through the Edge Function
			// We need a new RPC that marks the message as replied and returns sender info
			const { data, error: rpcError } = await supabase.rpc('reply_to_message', {
				p_reply_token: $page.params.id,
				p_reply_text: reply.trim()
			});

			if (rpcError) throw rpcError;

			if (data?.success) {
				// Email dispatched server-side by the RPC
				sent = true;
			} else {
				error = data?.error || 'Something went wrong';
			}
		} catch (e: any) {
			error = e.message || 'Something went wrong';
		} finally {
			sending = false;
		}
	}
</script>

<section class="max-w-md mx-auto px-4 py-12">
	{#if loading}
		<div class="text-center py-16">
			<Loader size={32} class="text-[var(--color-amber)] animate-spin mx-auto mb-4" />
			<p class="text-sm text-[var(--color-muted)]">{$_('common.loading')}</p>
		</div>
	{:else if !msgData}
		<div class="text-center py-16">
			<div class="w-16 h-16 bg-[var(--color-lost-light)] rounded-full flex items-center justify-center mx-auto mb-4">
				<XCircle size={32} class="text-[var(--color-lost)]" />
			</div>
			<h1 class="text-xl font-bold text-[var(--color-ink)] mb-2">{$_('reply.notFound')}</h1>
			<p class="text-sm text-[var(--color-muted)]">{$_('reply.notFoundDescription')}</p>
		</div>
	{:else if sent}
		<div class="text-center py-8">
			<div class="w-16 h-16 bg-[var(--color-found-light)] rounded-full flex items-center justify-center mx-auto mb-4">
				<CheckCircle size={32} class="text-[var(--color-found)]" />
			</div>
			<h1 class="text-xl font-bold text-[var(--color-ink)] mb-2">{$_('reply.sent')}</h1>
			<p class="text-sm text-[var(--color-muted)] mb-6">{$_('reply.sentDescription')}</p>
			<a
				href="/item/{msgData.item_id}"
				class="px-5 py-2.5 bg-[var(--color-ink)] text-white rounded-xl font-medium text-sm hover:bg-[var(--color-ink-light)] transition-colors inline-flex items-center gap-1.5"
			>
				<ArrowLeft size={14} /> {$_('reply.viewItem')}
			</a>
		</div>
	{:else if msgData.replied_at}
		<div class="text-center py-8">
			<h1 class="text-xl font-bold text-[var(--color-ink)] mb-2">{$_('reply.alreadyReplied')}</h1>
			<p class="text-sm text-[var(--color-muted)]">{$_('reply.alreadyRepliedDescription')}</p>
		</div>
	{:else}
		<a href="/item/{msgData.item_id}" class="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors mb-6 inline-flex items-center gap-1.5">
			<ArrowLeft size={14} /> {msgData.item_title}
		</a>

		<h1 class="text-xl font-bold text-[var(--color-ink)] mb-1">{$_('reply.title')}</h1>
		<p class="text-sm text-[var(--color-muted)] mb-6">{$_('reply.description')}</p>

		<!-- Original message -->
		<div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-6">
			<p class="text-xs font-medium text-[var(--color-muted)] mb-2">{$_('reply.from')} {msgData.sender_name}</p>
			<p class="text-sm text-[var(--color-ink)] whitespace-pre-wrap">{msgData.message}</p>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleReply(); }} class="space-y-4">
			<textarea
				bind:value={reply} placeholder={$_('reply.placeholder')} rows="4" required maxlength="500"
				class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent resize-none placeholder:text-[var(--color-muted)]"
			></textarea>

			<p class="text-xs text-[var(--color-muted)]">{$_('reply.privacy')}</p>

			{#if error}
				<p class="text-[var(--color-lost)] text-xs">{error}</p>
			{/if}

			<button
				type="submit" disabled={sending || !reply.trim()}
				class="w-full py-2.5 rounded-xl font-semibold text-sm bg-[var(--color-amber)] text-white hover:bg-[var(--color-amber-dark)] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
			>
				<Send size={14} />
				{sending ? $_('common.loading') : $_('reply.send')}
			</button>
		</form>
	{/if}
</section>

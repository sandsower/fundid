<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Camera, X, CheckCircle, Building2 } from 'lucide-svelte';
	import { categoryIcons, allCategories } from '$utils/categories';
	import { compressImage } from '$utils/image';
	import { capture } from '$lib/posthog';
	import type { ItemCategory } from '$types/item';
	import type { PageData } from './$types';

	const TURNSTILE_SITE_KEY = '0x4AAAAAACxkE0y8L31AGx0A';
	const URL_PATTERN = /https?:\/\/|www\./i;

	const { t } = getTranslate();
	let { data }: { data: PageData } = $props();

	let category: ItemCategory = $state('other');
	let title = $state('');
	let description = $state('');
	let imageFile: File | null = $state(null);
	let imagePreview: string | null = $state(null);
	let submitting = $state(false);
	let submitted = $state(false);
	let error = $state('');

	let honeypot = $state('');
	let turnstileToken = $state('');
	let turnstileWidgetId: string | undefined;
	let turnstileContainer: HTMLDivElement = $state()!;

	onMount(() => {
		// Token is stripped server-side via a 303 to the tokenless URL and
		// replayed from an HttpOnly cookie, so the address bar never shows `?t=`.
		capture('institutional_report_opened', { institution: data.institution.slug });

		function renderWidget() {
			if (window.turnstile && turnstileContainer) {
				turnstileWidgetId = window.turnstile.render(turnstileContainer, {
					sitekey: TURNSTILE_SITE_KEY,
					callback: (token: string) => { turnstileToken = token; },
					'error-callback': () => { turnstileToken = ''; },
					'expired-callback': () => { turnstileToken = ''; }
				});
			}
		}

		if (window.turnstile) renderWidget();
		else {
			const interval = setInterval(() => {
				if (window.turnstile) {
					clearInterval(interval);
					renderWidget();
				}
			}, 100);
			return () => clearInterval(interval);
		}
	});

	async function handleImageSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		imageFile = file;
		imagePreview = URL.createObjectURL(file);
	}

	async function handleSubmit() {
		if (!title.trim()) {
			error = $t('error.submissionFailed');
			return;
		}
		if (!turnstileToken) {
			error = $t('error.turnstileFailed');
			return;
		}
		if (honeypot) {
			error = $t('error.submissionFailed');
			return;
		}
		if (URL_PATTERN.test(title) || URL_PATTERN.test(description)) {
			error = $t('error.urlNotAllowed');
			return;
		}

		submitting = true;
		error = '';
		try {
			// Preflight before upload so rate-limited or invalid submissions don't
			// leave an orphaned R2 object. Best-effort — a concurrent submission
			// can still consume the last quota slot between preflight and commit.
			if (imageFile) {
				const pre = await fetch('/api/institution/preflight', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'same-origin',
					body: JSON.stringify({ inst: data.institution.slug, category })
				});
				if (!pre.ok) {
					let pj;
					try { pj = await pre.json(); } catch { pj = {}; }
					if (pj.error === 'rate_limited') error = $t('error.rateLimited');
					else error = $t('error.submissionFailed');
					return;
				}
			}

			let imageUrl: string | null = null;
			let uploadToken: string | null = null;
			if (imageFile) {
				const compressed = await compressImage(imageFile);
				const form = new FormData();
				form.append('file', compressed, 'image.webp');
				const res = await fetch('/api/upload', { method: 'POST', body: form });
				let body;
				try { body = await res.json(); } catch { body = {}; }
				if (!res.ok) throw new Error(body.message || $t('error.submissionFailed'));
				imageUrl = body.url;
				uploadToken = body.upload_token;
			}

			const res = await fetch('/api/items', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify({
					inst: data.institution.slug,
					category,
					title: title.trim(),
					description: description.trim(),
					image_url: imageUrl,
					upload_token: uploadToken,
					website: honeypot,
					'cf-turnstile-response': turnstileToken
				})
			});

			let result;
			try { result = await res.json(); } catch { result = {}; }

			if (!res.ok) {
				if (result.error === 'rate_limited') error = $t('error.rateLimited');
				else if (result.error === 'invalid_institution') error = $t('error.submissionFailed');
				else if (result.error === 'url_detected') error = $t('error.urlNotAllowed');
				else error = $t('error.submissionFailed');
				if (window.turnstile && turnstileWidgetId) {
					window.turnstile.reset(turnstileWidgetId);
					turnstileToken = '';
				}
				return;
			}

			capture('institutional_report_submitted', {
				institution: data.institution.slug,
				category,
				has_photo: !!imageFile
			});
			submitted = true;
		} catch {
			error = $t('error.submissionFailed');
		} finally {
			submitting = false;
		}
	}

	function reset() {
		submitted = false;
		title = '';
		description = '';
		imageFile = null;
		imagePreview = null;
		category = 'other';
		if (window.turnstile && turnstileWidgetId) {
			window.turnstile.reset(turnstileWidgetId);
			turnstileToken = '';
		}
	}
</script>

<svelte:head>
	<title>{$t('institutional.reportTitle')} – {data.institution.name} – Fundið</title>
	<!-- URL carries the submission token; strip it from outbound Referers. -->
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<section class="max-w-md mx-auto px-4 py-8">
	<div class="mb-6 flex items-center gap-3">
		<div class="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center">
			<Building2 size={20} class="text-[var(--color-amber)]" />
		</div>
		<div>
			<p class="text-xs text-[var(--color-muted)]">{$t('institutional.reportContext')}</p>
			<h1 class="text-lg font-bold text-[var(--color-ink)]">{data.institution.name}</h1>
		</div>
	</div>

	{#if submitted}
		<div class="text-center py-10">
			<div class="w-14 h-14 bg-[var(--color-found-light)] rounded-full flex items-center justify-center mx-auto mb-4">
				<CheckCircle size={28} class="text-[var(--color-found)]" />
			</div>
			<h2 class="text-lg font-bold text-[var(--color-ink)] mb-1">{$t('institutional.successTitle')}</h2>
			<p class="text-sm text-[var(--color-muted)] mb-6">{$t('institutional.successDescription')}</p>
			<button
				onclick={reset}
				class="px-5 py-2.5 bg-[var(--color-ink)] text-white rounded-xl font-medium text-sm hover:bg-[var(--color-ink-light)] transition-colors"
			>{$t('institutional.addAnother')}</button>
		</div>
	{:else}
		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-5">
			<fieldset>
				<legend class="text-sm font-semibold text-[var(--color-ink)] mb-3">{$t('item.category')}</legend>
				<div class="grid grid-cols-4 gap-2">
					{#each allCategories.filter((c) => c !== 'pet') as cat}
						{@const Icon = categoryIcons[cat]}
						<button
							type="button"
							onclick={() => (category = cat)}
							class="flex flex-col items-center p-2.5 rounded-xl text-xs font-medium transition-all border
								{category === cat
									? 'border-[var(--color-amber)] bg-[var(--color-amber-light)] text-[var(--color-ink)]'
									: 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-amber)]'}"
						>
							<Icon size={20} strokeWidth={1.5} class="mb-1" />
							{$t(`categories.${cat}`)}
						</button>
					{/each}
				</div>
			</fieldset>

			<div>
				<label class="text-sm font-semibold text-[var(--color-ink)] mb-2 block">{$t('item.photo')}</label>
				{#if imagePreview}
					<div class="relative mb-2">
						<img src={imagePreview} alt="Preview" class="w-full h-40 object-cover rounded-xl" />
						<button
							type="button"
							onclick={() => { imageFile = null; imagePreview = null; }}
							class="absolute top-2 right-2 bg-black/60 text-white w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
						><X size={14} /></button>
					</div>
				{/if}
				<label class="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--color-border)] rounded-xl cursor-pointer hover:border-[var(--color-amber)] transition-colors bg-[var(--color-surface)]">
					<Camera size={18} class="text-[var(--color-muted)]" />
					<span class="text-sm text-[var(--color-muted)]">{$t('item.uploadPhoto')}</span>
					<input type="file" accept="image/*" class="hidden" onchange={handleImageSelect} />
				</label>
			</div>

			<div>
				<label for="inst-title" class="text-sm font-semibold text-[var(--color-ink)] mb-1 block">{$t('item.title')}</label>
				<input
					id="inst-title" type="text" bind:value={title} placeholder={$t('item.titlePlaceholder')} required
					class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent placeholder:text-[var(--color-muted)]"
				/>
			</div>

			<div>
				<label for="inst-desc" class="text-sm font-semibold text-[var(--color-ink)] mb-1 block">{$t('item.description')}</label>
				<textarea
					id="inst-desc" bind:value={description} placeholder={$t('item.descriptionPlaceholder')} rows="2"
					class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent resize-none placeholder:text-[var(--color-muted)]"
				></textarea>
			</div>

			<div style="display:none" aria-hidden="true">
				<input type="text" name="website" bind:value={honeypot} tabindex="-1" autocomplete="off" />
			</div>

			<div bind:this={turnstileContainer}></div>

			{#if error}
				<p class="text-[var(--color-lost)] text-sm">{error}</p>
			{/if}

			<button
				type="submit" disabled={submitting}
				class="w-full py-3 rounded-xl font-semibold text-sm text-white bg-[var(--color-found)] hover:bg-green-600 transition-colors disabled:opacity-50"
			>
				{submitting ? $t('common.loading') : $t('institutional.submit')}
			</button>
		</form>
	{/if}
</section>

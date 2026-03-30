<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { X, CheckCircle } from 'lucide-svelte';

	const { t } = getTranslate();

	let { itemId, onClose }: {
		itemId: string;
		onClose: () => void;
	} = $props();

	const itemUrl = $derived(`https://fundid.is/item/${itemId}`);
	const facebookShareUrl = $derived(
		`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(itemUrl)}`
	);

	function shareOnFacebook() {
		window.open(facebookShareUrl, '_blank', 'width=600,height=400,noopener,noreferrer');
	}


</script>

<div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
	<button class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={onClose} aria-label="Close"></button>

	<div class="relative bg-white rounded-2xl shadow-2xl max-w-sm mx-4 p-6 text-center">
		<button
			onclick={onClose}
			class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
		>
			<X size={18} />
		</button>

		<div class="w-14 h-14 bg-[var(--color-found-light)] rounded-full flex items-center justify-center mx-auto mb-4">
			<CheckCircle size={28} class="text-[var(--color-found)]" />
		</div>

		<h2 class="text-lg font-bold text-[var(--color-ink)] mb-1">{$t('success.title')}</h2>
		<p class="text-sm text-[var(--color-muted)] mb-5">{$t('success.description')}</p>

		<div class="flex flex-col gap-2.5">
			<button
				onclick={shareOnFacebook}
				class="w-full py-2.5 rounded-xl font-semibold text-sm text-white bg-[#1877F2] hover:bg-[#166FE5] transition-colors inline-flex items-center justify-center gap-2"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
					<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
				</svg>
				{$t('success.shareOnFacebook')}
			</button>

			<a
				href="/item/{itemId}"
				class="w-full py-2.5 rounded-xl font-medium text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors inline-block"
			>
				{$t('success.viewItem')} →
			</a>
		</div>
	</div>
</div>

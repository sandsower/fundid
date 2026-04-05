<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { Calendar } from 'lucide-svelte';

	const { t } = getTranslate();

	const updates = [
		{
			date: '2026-04-05',
			title: 'Easier contact flow',
			entries: [
				'You can now contact the finder or owner straight from the item preview. No need to open the full detail page first.',
				'The contact form comes pre-filled with a message based on whether you lost or found the item. Enter your email, hit send.',
				'Name is optional now. We only need your email to relay the conversation.',
				'Added analytics on the report form and contact flow so we can see where people drop off and fix it.'
			]
		},
		{
			date: '2026-03-31',
			title: 'Privacy, safety, and sharing',
			entries: [
				'Content moderation is live on all submissions. An invisible spam filter catches bots, URLs are blocked in item descriptions, and all items are created server-side with validation. No direct database access from the browser.',
				'Cloudflare Turnstile (invisible CAPTCHA) protects the form from automated abuse. You won\'t notice it.',
				'Every item page now has a Facebook share button and a native share button. After posting, you\'re prompted to share it right away. More eyes on your listing, better odds of a match.',
				'Shared links now render properly on Facebook, WhatsApp, and Twitter with the item photo, title, and location as a preview card.',
				'HSTS headers enforced on all pages. HTTPS with strict transport security.',
				'Server-side rendering and search. Items load faster, works better on slow connections.'
			]
		},
		{
			date: '2026-03-28',
			title: 'Launch',
			entries: [
				'Fundið is live. Free, independent lost and found for Iceland. No accounts, no fees, no tracking cookies.',
				'Report a lost or found item with a photo, description, category, and a pin on the map. Search and filter by type, category, or text.',
				'All communication goes through a private email relay. Neither side sees the other\'s email unless they choose to share it. Your email never appears on the site.',
				'Found items get a one-time claim code. It\'s the only way to mark the item as returned, so only the original reporter can close the listing.',
				'Every item page has a "Generate flyer" option. Creates a printable poster with a QR code linking back to the listing. Good for posting near where the item was lost or found.',
				'Map powered by MapLibre with OpenStreetMap tiles. Search for an address, use GPS, or tap to drop a pin. Red markers for lost, green for found.',
				'Available in Icelandic and English. The site remembers your preference.',
				'Data retention is automatic. Listings expire after 6 months if unclaimed, 90 days after being marked as returned. Nothing lingers.'
			]
		}
	];
</script>

<svelte:head>
	<title>{$t('updates.title')} – Fundið</title>
</svelte:head>

<section class="max-w-2xl mx-auto px-4 py-10 space-y-10">
	<h1 class="text-2xl font-bold text-[var(--color-ink)]">{$t('updates.title')}</h1>

	{#each updates as update}
		<div>
			<div class="flex items-center gap-2 mb-2">
				<Calendar size={14} class="text-[var(--color-muted)]" />
				<time class="text-xs text-[var(--color-muted)]" datetime={update.date}>
					{new Date(update.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
				</time>
			</div>
			<h2 class="text-lg font-bold text-[var(--color-ink)] mb-3">{update.title}</h2>
			<ul class="space-y-2">
				{#each update.entries as entry}
					<li class="text-sm text-[var(--color-ink-light)] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[var(--color-amber)]">
						{entry}
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</section>

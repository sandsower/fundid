<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { ChevronDown, MapPin, Eye, MessageCircle, Shield, CheckCircle } from 'lucide-svelte';

	const { t } = getTranslate();

	function linkifyEmails(text: string): string {
		return text.replace(
			/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
			'<a href="mailto:$1" class="text-[var(--color-amber-dark)] hover:text-[var(--color-amber)]">$1</a>'
		);
	}
</script>

<section class="max-w-2xl mx-auto px-4 py-10 space-y-12">
	<!-- Intro -->
	<div>
		<h1 class="text-2xl font-bold text-[var(--color-ink)] mb-4">{$t('about.what.heading')}</h1>
		<p class="text-[var(--color-ink-light)] leading-relaxed">{$t('about.what.body')}</p>
	</div>

	<!-- How it works -->
	<div>
		<h2 class="text-lg font-bold text-[var(--color-ink)] mb-4">{$t('about.how.heading')}</h2>
		<div class="space-y-4">
			{#each [
				{ step: 'step1', icon: MapPin },
				{ step: 'step2', icon: Eye },
				{ step: 'step3', icon: MessageCircle },
				{ step: 'step4', icon: Shield },
				{ step: 'step5', icon: CheckCircle }
			] as { step, icon }, i}
				<div class="flex gap-4">
					<div class="flex-none w-9 h-9 mt-0.5 rounded-full bg-[var(--color-amber-light)] flex items-center justify-center">
						<svelte:component this={icon} size={16} class="text-[var(--color-amber)]" />
					</div>
					<p class="text-sm text-[var(--color-ink-light)] leading-relaxed min-h-9 flex items-center">{$t(`about.how.${step}`)}</p>
				</div>
				{#if i < 4}
					<div class="ml-[18px] h-3 border-l border-dashed border-[var(--color-border)]"></div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Privacy -->
	<div>
		<h2 class="text-lg font-bold text-[var(--color-ink)] mb-4">{$t('about.privacy.heading')}</h2>
		<p class="text-[var(--color-ink)] font-medium mb-4">{$t('about.privacy.intro')}</p>
		<div class="space-y-2 text-sm text-[var(--color-ink-light)] leading-relaxed">
			<p>{$t('about.privacy.collected')}</p>
			<p>{$t('about.privacy.email')}</p>
			<p>{$t('about.privacy.relay')}</p>
			<p>{$t('about.privacy.processors')}</p>
			<p>{$t('about.privacy.analytics')}</p>
			<p>{$t('about.privacy.retention')}</p>
			<p>{@html linkifyEmails($t('about.privacy.rights'))}</p>
			<p class="text-xs text-[var(--color-muted)] pt-1">{$t('about.privacy.complaint')}</p>
		</div>
	</div>

	<!-- FAQ -->
	<div>
		<h2 class="text-lg font-bold text-[var(--color-ink)] mb-4">{$t('about.faq.heading')}</h2>
		<div class="space-y-2">
			{#each [1, 2, 3, 4, 5, 6] as n}
				<details class="group">
					<summary class="flex items-center justify-between py-3 cursor-pointer select-none text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-amber-dark)] transition-colors">
						{$t(`about.faq.q${n}`)}
						<ChevronDown size={16} class="flex-none text-[var(--color-muted)] transition-transform group-open:rotate-180" />
					</summary>
					<p class="pb-3 text-sm text-[var(--color-ink-light)] leading-relaxed">{@html linkifyEmails($t(`about.faq.a${n}`))}</p>
				</details>
			{/each}
		</div>
	</div>

	<!-- Attribution -->
	<p class="text-xs text-[var(--color-muted)] text-center">{@html $t('about.madeBy').replace('Vic', '<a href="http://vicvalenzuela.com" target="_blank" rel="noopener noreferrer" class="hover:text-[var(--color-ink-light)]">Vic</a>')}</p>
</section>

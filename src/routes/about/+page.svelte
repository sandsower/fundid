<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { ChevronDown } from 'lucide-svelte';

	const { t } = getTranslate();
</script>

<section class="max-w-2xl mx-auto px-4 py-10">
	<h1 class="text-2xl font-bold text-[var(--color-ink)] mb-8">{$t('about.title')}</h1>

	<div class="space-y-3">
		<!-- What is Fundið? -->
		<details class="group border border-[var(--color-border)] rounded-xl">
			<summary class="flex items-center justify-between px-5 py-4 cursor-pointer select-none font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface)] rounded-xl transition-colors">
				{$t('about.what.heading')}
				<ChevronDown size={18} class="text-[var(--color-muted)] transition-transform group-open:rotate-180" />
			</summary>
			<div class="px-5 pb-5 text-sm text-[var(--color-ink-light)] leading-relaxed">
				<p>{$t('about.what.body')}</p>
			</div>
		</details>

		<!-- How does it work? -->
		<details class="group border border-[var(--color-border)] rounded-xl">
			<summary class="flex items-center justify-between px-5 py-4 cursor-pointer select-none font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface)] rounded-xl transition-colors">
				{$t('about.how.heading')}
				<ChevronDown size={18} class="text-[var(--color-muted)] transition-transform group-open:rotate-180" />
			</summary>
			<div class="px-5 pb-5 text-sm text-[var(--color-ink-light)] leading-relaxed">
				<ol class="list-decimal list-inside space-y-2">
					<li>{$t('about.how.step1')}</li>
					<li>{$t('about.how.step2')}</li>
					<li>{$t('about.how.step3')}</li>
					<li>{$t('about.how.step4')}</li>
					<li>{$t('about.how.step5')}</li>
				</ol>
			</div>
		</details>

		<!-- Privacy -->
		<details class="group border border-[var(--color-border)] rounded-xl">
			<summary class="flex items-center justify-between px-5 py-4 cursor-pointer select-none font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface)] rounded-xl transition-colors">
				{$t('about.privacy.heading')}
				<ChevronDown size={18} class="text-[var(--color-muted)] transition-transform group-open:rotate-180" />
			</summary>
			<div class="px-5 pb-5 text-sm text-[var(--color-ink-light)] leading-relaxed space-y-3">
				<p class="font-medium text-[var(--color-ink)]">{$t('about.privacy.intro')}</p>
				<p>{$t('about.privacy.collected')}</p>
				<p>{$t('about.privacy.email')}</p>
				<p>{$t('about.privacy.relay')}</p>
				<p>{$t('about.privacy.processors')}</p>
				<p>{$t('about.privacy.retention')}</p>
				<p>{$t('about.privacy.rights')}</p>
				<p class="text-xs text-[var(--color-muted)]">{$t('about.privacy.complaint')}</p>
			</div>
		</details>

		<!-- FAQ -->
		<details class="group border border-[var(--color-border)] rounded-xl">
			<summary class="flex items-center justify-between px-5 py-4 cursor-pointer select-none font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface)] rounded-xl transition-colors">
				{$t('about.faq.heading')}
				<ChevronDown size={18} class="text-[var(--color-muted)] transition-transform group-open:rotate-180" />
			</summary>
			<div class="px-5 pb-5 text-sm text-[var(--color-ink-light)] leading-relaxed space-y-4">
				{#each [1, 2, 3, 4, 5, 6] as n}
					<div>
						<p class="font-medium text-[var(--color-ink)]">{$t(`about.faq.q${n}`)}</p>
						<p class="mt-1">{$t(`about.faq.a${n}`)}</p>
					</div>
				{/each}
			</div>
		</details>
	</div>
</section>

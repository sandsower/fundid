<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Poster — {data.institution.name}</title>
	<meta name="robots" content="noindex, nofollow" />
	<!-- URL carries the submission token; never leak it as Referer. -->
	<meta name="referrer" content="no-referrer" />
	<style>
		@page { size: A4; margin: 0; }
		body { margin: 0; }
		.no-print { display: none; }
		@media screen {
			.no-print { display: block; }
			.poster { box-shadow: 0 4px 24px rgba(0,0,0,0.08); margin: 2rem auto; }
		}
		@media print {
			.no-print { display: none !important; }
		}
	</style>
</svelte:head>

<div class="no-print" style="position: fixed; top: 1rem; right: 1rem; z-index: 10;">
	<button onclick={() => window.print()} style="padding: 0.5rem 1rem; background: #2C2520; color: white; border: 0; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem;">Print A4</button>
</div>

<div class="poster" style="width: 210mm; height: 297mm; padding: 20mm; background: white; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; font-family: system-ui, -apple-system, sans-serif; color: #2C2520;">

	<div style="text-align: center; margin-bottom: 10mm;">
		<p style="margin: 0; font-size: 16pt; color: #9C8B7E; letter-spacing: 0.1em; text-transform: uppercase;">Fundið óskilamuni</p>
		<h1 style="margin: 6mm 0 0; font-size: 44pt; font-weight: 800; line-height: 1;">Skannaðu til að skrá</h1>
		<p style="margin: 4mm 0 0; font-size: 18pt; color: #C87640; font-weight: 600;">Óskilamunur sem barst til {data.institution.name}</p>
	</div>

	<div style="width: 120mm; height: 120mm; margin: 6mm 0;">
		{@html data.qrSvg}
	</div>

	<ol style="font-size: 14pt; line-height: 1.5; margin: 8mm 0 0; padding: 0 10mm; list-style: none; counter-reset: step;">
		<li style="counter-increment: step; padding-left: 12mm; position: relative; margin-bottom: 4mm;">
			<span style="position: absolute; left: 0; top: 0; width: 9mm; height: 9mm; background: #C87640; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13pt;">1</span>
			Opnaðu myndavélina og skannaðu kóðann
		</li>
		<li style="counter-increment: step; padding-left: 12mm; position: relative; margin-bottom: 4mm;">
			<span style="position: absolute; left: 0; top: 0; width: 9mm; height: 9mm; background: #C87640; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13pt;">2</span>
			Taktu mynd af hlutnum og skrifaðu eina línu
		</li>
		<li style="counter-increment: step; padding-left: 12mm; position: relative;">
			<span style="position: absolute; left: 0; top: 0; width: 9mm; height: 9mm; background: #C87640; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13pt;">3</span>
			Smelltu "Skrá" — hann birtist á Fundið.is
		</li>
	</ol>

	<div style="margin-top: auto; padding-top: 10mm; width: 100%; text-align: center; border-top: 1px solid #E8E0D5;">
		<p style="margin: 0; font-size: 12pt; color: #9C8B7E;">Þarf enga skráningu, enga þjálfun. Hluturinn dettur sjálfkrafa út eftir 30 daga.</p>
		<p style="margin: 2mm 0 0; font-size: 11pt; color: #C87640; font-weight: 600;">fundid.is</p>
	</div>
</div>

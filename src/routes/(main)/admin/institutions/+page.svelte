<script lang="ts">
	import { enhance } from '$app/forms';
	import { Building2, Printer, ExternalLink, Copy } from 'lucide-svelte';

	let { data, form } = $props();
	let hoursPreset = $state(
		'{"mon":[["06:30","22:00"]],"tue":[["06:30","22:00"]],"wed":[["06:30","22:00"]],"thu":[["06:30","22:00"]],"fri":[["06:30","22:00"]],"sat":[["08:00","20:00"]],"sun":[["08:00","20:00"]]}'
	);
	let copied = $state<string | null>(null);

	async function copy(text: string, label: string) {
		await navigator.clipboard.writeText(text);
		copied = label;
		setTimeout(() => (copied = null), 1500);
	}
</script>

<div class="min-h-screen bg-[var(--color-surface)]">
	<div class="bg-white border-b border-[var(--color-border)]">
		<div class="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
			<Building2 size={20} class="text-[var(--color-amber)]" />
			<h1 class="text-lg font-bold text-[var(--color-ink)]">Admin · Institutions</h1>
			<a href="/admin" class="ml-auto text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Back to items</a>
		</div>
	</div>

	<div class="max-w-5xl mx-auto px-4 py-6 space-y-6">
		{#if form?.created}
			<div class="rounded-xl border border-[var(--color-found)] bg-[var(--color-found-light)] p-4">
				<p class="text-sm font-semibold text-[var(--color-found)] mb-3">Created: {form.created.name}</p>

				<div class="space-y-2 text-sm">
					<div>
						<p class="text-xs text-[var(--color-muted)] mb-1">QR poster URL (this goes on the A4 poster)</p>
						<div class="flex gap-2 items-center">
							<code class="flex-1 px-2 py-1.5 bg-white border border-[var(--color-border)] rounded text-xs break-all">{form.created.qrUrl}</code>
							<button onclick={() => copy(form.created.qrUrl, 'qr')} class="p-1.5 rounded border border-[var(--color-border)] hover:border-[var(--color-amber)]"><Copy size={14} /></button>
							<a href="/admin/institutions/{form.created.id}/poster" target="_blank" class="px-3 py-1.5 rounded bg-[var(--color-ink)] text-white text-xs font-medium inline-flex items-center gap-1.5"><Printer size={12} /> Print</a>
						</div>
					</div>

					<div>
						<p class="text-xs text-[var(--color-muted)] mb-1">Audit URL (email this to the institution, once)</p>
						<div class="flex gap-2 items-center">
							<code class="flex-1 px-2 py-1.5 bg-white border border-[var(--color-border)] rounded text-xs break-all">{form.created.auditUrl}</code>
							<button onclick={() => copy(form.created.auditUrl, 'audit')} class="p-1.5 rounded border border-[var(--color-border)] hover:border-[var(--color-amber)]"><Copy size={14} /></button>
						</div>
					</div>

					<p class="text-xs text-[var(--color-lost)] mt-3">
						The plaintext token is shown only this once — the DB stores only the hash. If lost, you'll have to rotate (regenerate + reprint).
					</p>
				</div>
			</div>
		{/if}

		{#if form?.error}
			<div class="rounded-xl border border-[var(--color-lost)] bg-[var(--color-lost-light)] p-3 text-sm text-[var(--color-lost)]">
				{form.error}
			</div>
		{/if}

		<details class="bg-white rounded-xl border border-[var(--color-border)] p-4" open={!data.institutions.length}>
			<summary class="text-sm font-semibold text-[var(--color-ink)] cursor-pointer">+ New institution</summary>

			<form method="POST" action="?/create" use:enhance class="grid grid-cols-2 gap-3 mt-4">
				<label class="col-span-2 text-xs text-[var(--color-muted)]">
					Slug (lowercase, dashes)
					<input name="slug" required pattern="[a-z0-9-]+" placeholder="sundhollin" class="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm font-mono" />
				</label>
				<label class="col-span-2 text-xs text-[var(--color-muted)]">
					Name
					<input name="name" required placeholder="Sundhöllin" class="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
				</label>
				<label class="col-span-2 text-xs text-[var(--color-muted)]">
					Address
					<input name="address" required placeholder="Barónsstígur 45, 101 Reykjavík" class="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
				</label>
				<label class="text-xs text-[var(--color-muted)]">
					Latitude
					<input name="latitude" required type="number" step="any" placeholder="64.1433" class="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm font-mono" />
				</label>
				<label class="text-xs text-[var(--color-muted)]">
					Longitude
					<input name="longitude" required type="number" step="any" placeholder="-21.928" class="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm font-mono" />
				</label>
				<label class="text-xs text-[var(--color-muted)]">
					Phone (optional, public)
					<input name="phone" placeholder="411 5300" class="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
				</label>
				<label class="text-xs text-[var(--color-muted)]">
					Contact email (private, onboarding)
					<input name="contact_email" required type="email" placeholder="osk@sundhollin.is" class="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
				</label>
				<label class="text-xs text-[var(--color-muted)]">
					Rate limit / day
					<input name="rate_limit_per_day" type="number" min="1" value="20" class="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm font-mono" />
				</label>
				<div></div>
				<label class="col-span-2 text-xs text-[var(--color-muted)]">
					Hours (JSON, optional) — edit preset as needed
					<textarea name="hours_json" rows="3" bind:value={hoursPreset} class="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-xs font-mono"></textarea>
				</label>
				<button type="submit" class="col-span-2 py-2.5 rounded-lg bg-[var(--color-ink)] text-white font-medium text-sm">Create institution</button>
			</form>
		</details>

		<div class="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
			<table class="w-full text-sm">
				<thead class="bg-[var(--color-surface)] text-left">
					<tr class="border-b border-[var(--color-border)]">
						<th class="px-4 py-2 font-semibold text-[var(--color-muted)]">Slug</th>
						<th class="px-4 py-2 font-semibold text-[var(--color-muted)]">Name</th>
						<th class="px-4 py-2 font-semibold text-[var(--color-muted)]">Address</th>
						<th class="px-4 py-2 font-semibold text-[var(--color-muted)]">Rate/day</th>
						<th class="px-4 py-2 font-semibold text-[var(--color-muted)]">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.institutions as inst}
						<tr class="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface)]">
							<td class="px-4 py-2 font-mono text-xs">{inst.slug}</td>
							<td class="px-4 py-2 font-medium">{inst.name}</td>
							<td class="px-4 py-2 text-[var(--color-muted)] max-w-[240px] truncate">{inst.address}</td>
							<td class="px-4 py-2 font-mono text-xs">{inst.rate_limit_per_day}</td>
							<td class="px-4 py-2">
								<div class="flex gap-2">
									<a href="/admin/institutions/{inst.id}/poster" target="_blank" class="px-2 py-1 rounded text-xs font-medium bg-[var(--color-ink)] text-white inline-flex items-center gap-1"><Printer size={12} /> Poster</a>
									<a href="/i/{inst.slug}/{inst.audit_slug}" target="_blank" class="px-2 py-1 rounded text-xs font-medium border border-[var(--color-border)] inline-flex items-center gap-1"><ExternalLink size={12} /> Audit</a>
								</div>
							</td>
						</tr>
					{:else}
						<tr><td colspan="5" class="px-4 py-8 text-center text-[var(--color-muted)] text-sm">No institutions yet.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if copied}
			<div class="fixed bottom-4 right-4 px-3 py-2 bg-[var(--color-ink)] text-white rounded-lg text-xs shadow-lg">Copied {copied} URL</div>
		{/if}
	</div>
</div>

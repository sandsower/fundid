<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	let submitting = $state(false);
</script>

<div class="min-h-screen bg-[var(--color-surface)] flex items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="text-center mb-8">
			<img src="/logo-v2-pin-checkmark.svg" alt="Fundið" class="w-10 h-14 mx-auto mb-3" />
			<h1 class="text-xl font-bold text-[var(--color-ink)]">Admin</h1>
		</div>

		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					submitting = false;
					await update();
				};
			}}
			class="space-y-4"
		>
			<div>
				<label for="password" class="text-sm font-semibold text-[var(--color-ink)] mb-1 block">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					autocomplete="current-password"
					class="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent"
				/>
			</div>

			{#if form?.error}
				<p class="text-[var(--color-lost)] text-sm">{form.error}</p>
			{/if}

			<button
				type="submit"
				disabled={submitting}
				class="w-full py-2.5 rounded-xl font-semibold text-sm text-white bg-[var(--color-amber)] hover:bg-[var(--color-amber-dark)] transition-colors disabled:opacity-50"
			>
				{submitting ? 'Signing in...' : 'Sign in'}
			</button>
		</form>
	</div>
</div>

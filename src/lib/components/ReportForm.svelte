<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { categoryIcons, allCategories } from '$utils/categories';
	import { extractGps, compressImage } from '$utils/image';
	import { ICELAND_CENTER } from '$utils/geo';
	import LocationPicker from '$components/LocationPicker.svelte';
	import AddressSearch from '$components/AddressSearch.svelte';
	import { Camera, MapPin, X } from 'lucide-svelte';
	import { generateClaimCode, hashClaimCode } from '$utils/claim';
	import type { GeoResult } from '$utils/geocode';
	import type { ItemType, ItemCategory } from '$types/item';

	let { type = 'found' as ItemType, onSuccess, onCancel }: {
		type?: ItemType;
		onSuccess?: (id: string) => void;
		onCancel?: () => void;
	} = $props();

	let category: ItemCategory = $state('other');
	let title = $state('');
	let description = $state('');
	let locationName = $state('');
	let latitude = $state(ICELAND_CENTER.lat);
	let longitude = $state(ICELAND_CENTER.lng);
	let dateOccurred = $state(new Date().toISOString().split('T')[0]);
	let contactValue = $state('');
	let flyToMap: ((lat: number, lng: number) => void) | null = null;
	let imageFile: File | null = $state(null);
	let imagePreview: string | null = $state(null);
	let submitting = $state(false);
	let error = $state('');

	async function handleImageSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		imageFile = file;
		imagePreview = URL.createObjectURL(file);
		const gps = await extractGps(file);
		if (gps) {
			latitude = gps.latitude;
			longitude = gps.longitude;
		}
	}

	let locating = $state(false);

	function useMyLocation() {
		if (!navigator.geolocation) return;
		locating = true;
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				latitude = pos.coords.latitude;
				longitude = pos.coords.longitude;
				flyToMap?.(pos.coords.latitude, pos.coords.longitude);
				locating = false;
			},
			() => {
				locating = false;
				error = $_('item.locationError');
			},
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	}

	function handleAddressSelect(result: GeoResult) {
		latitude = result.lat;
		longitude = result.lng;
		locationName = result.name;
		flyToMap?.(result.lat, result.lng);
	}

	function handleLocationResolved(name: string) {
		locationName = name;
	}

	async function handleSubmit() {
		if (!title.trim() || !locationName.trim() || !contactValue.trim()) {
			error = 'Please fill in title, location, and email';
			return;
		}
		submitting = true;
		error = '';
		try {
			let imageUrl: string | null = null;
			if (imageFile) {
				const compressed = await compressImage(imageFile);
				const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
				const { data: uploadData, error: uploadError } = await supabase.storage
					.from('item-images')
					.upload(fileName, compressed, { contentType: 'image/webp' });
				if (uploadError) throw uploadError;
				const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(uploadData.path);
				imageUrl = urlData.publicUrl;
			}
			const claimCode = generateClaimCode();
			const claimCodeHash = await hashClaimCode(claimCode);

			const { data, error: insertError } = await supabase
				.from('items')
				.insert({
					type,
					category,
					title: title.trim(),
					description: description.trim(),
					image_url: imageUrl,
					latitude,
					longitude,
					location_name: locationName.trim(),
					date_occurred: dateOccurred,
					contact_method: 'email',
					contact_value: contactValue.trim(),
					claim_code_hash: claimCodeHash,
					status: 'active'
				})
				.select()
				.single();
			if (insertError) throw insertError;
			if (data) {
				// Send claim code to poster's email (fire and forget)
				supabase.functions.invoke('send-email', {
					body: {
						type: 'claim_code',
						to: contactValue.trim(),
						claimCode,
						itemTitle: title.trim(),
						itemId: data.id
					}
				});

				if (onSuccess) onSuccess(data.id);
				else goto(`/item/${data.id}`);
			}
		} catch (e: any) {
			error = e.message || 'Something went wrong';
		} finally {
			submitting = false;
		}
	}
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-5">
	<!-- Category -->
	<fieldset>
		<legend class="text-sm font-semibold text-[var(--color-ink)] mb-3">{$_('item.category')}</legend>
		<div class="grid grid-cols-4 gap-2">
			{#each allCategories as cat}
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
					{$_(`categories.${cat}`)}
				</button>
			{/each}
		</div>
	</fieldset>

	<!-- Photo -->
	<div>
		<label class="text-sm font-semibold text-[var(--color-ink)] mb-2 block">{$_('item.photo')}</label>
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
			<span class="text-sm text-[var(--color-muted)]">{$_('item.uploadPhoto')}</span>
			<input type="file" accept="image/*" capture="environment" class="hidden" onchange={handleImageSelect} />
		</label>
	</div>

	<!-- Title -->
	<div>
		<label for="modal-title" class="text-sm font-semibold text-[var(--color-ink)] mb-1 block">{$_('item.title')}</label>
		<input
			id="modal-title" type="text" bind:value={title} placeholder={$_('item.titlePlaceholder')} required
			class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent placeholder:text-[var(--color-muted)]"
		/>
	</div>

	<!-- Description -->
	<div>
		<label for="modal-desc" class="text-sm font-semibold text-[var(--color-ink)] mb-1 block">{$_('item.description')}</label>
		<textarea
			id="modal-desc" bind:value={description} placeholder={$_('item.descriptionPlaceholder')} rows="2"
			class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent resize-none placeholder:text-[var(--color-muted)]"
		></textarea>
	</div>

	<!-- Location -->
	<div>
		<label class="text-sm font-semibold text-[var(--color-ink)] mb-2 block">{$_('item.location')}</label>
		<div class="flex gap-2 mb-2">
			<div class="flex-1 min-w-0">
				<AddressSearch bind:value={locationName} onSelect={handleAddressSelect} />
			</div>
			<button
				type="button" onclick={useMyLocation} disabled={locating}
				class="shrink-0 px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-amber)] transition-colors disabled:opacity-50"
				title="Use my location"
			>{#if locating}<span class="w-[18px] h-[18px] border-2 border-[var(--color-amber)] border-t-transparent rounded-full animate-spin inline-block"></span>{:else}<MapPin size={18} />{/if}</button>
		</div>
		<div>
			<LocationPicker bind:latitude bind:longitude height="200px" onLocationResolved={handleLocationResolved} onReady={(api) => (flyToMap = api.flyTo)} />
		</div>
	</div>

	<!-- Date -->
	<div>
		<label for="modal-date" class="text-sm font-semibold text-[var(--color-ink)] mb-1 block">{$_('item.date')}</label>
		<input
			id="modal-date" type="date" bind:value={dateOccurred} max={new Date().toISOString().split('T')[0]}
			class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent"
		/>
	</div>

	<!-- Contact email -->
	<div>
		<label for="modal-email" class="text-sm font-semibold text-[var(--color-ink)] mb-1 block">{$_('item.email')}</label>
		<input
			id="modal-email" type="email" bind:value={contactValue} placeholder="your@email.com" required
			class="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)] focus:border-transparent placeholder:text-[var(--color-muted)]"
		/>
		<p class="text-xs text-[var(--color-muted)] mt-1.5">{$_('item.emailPrivacy')}</p>
	</div>

	{#if error}
		<p class="text-[var(--color-lost)] text-sm">{error}</p>
	{/if}

	<div class="flex gap-2">
		{#if onCancel}
			<button
				type="button" onclick={onCancel}
				class="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors"
			>
				{$_('common.cancel')}
			</button>
		{/if}
		<button
			type="submit" disabled={submitting}
			class="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50
				{type === 'lost' ? 'bg-[var(--color-lost)] hover:bg-red-500' : 'bg-[var(--color-found)] hover:bg-green-600'}"
		>
			{submitting ? $_('common.loading') : $_('common.submit')}
		</button>
	</div>
</form>

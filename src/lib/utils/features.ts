import { PUBLIC_ENABLE_PET_SITE } from '$env/static/public';
import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const STORAGE_KEY = 'fundid-pet-site-enabled';

function getInitialValue(): boolean {
	if (browser) {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored !== null) return stored === 'true';
	}
	return PUBLIC_ENABLE_PET_SITE === 'true';
}

/** Reactive store for pet site feature flag. Persists to localStorage + cookie. */
export const petSiteEnabled = writable<boolean>(getInitialValue());

if (browser) {
	petSiteEnabled.subscribe((value) => {
		localStorage.setItem(STORAGE_KEY, String(value));
		// Also set a cookie so the server-side guard can read it
		document.cookie = `${STORAGE_KEY}=${value}; path=/; max-age=31536000; SameSite=Lax`;
	});
}

/** Non-reactive check for use in non-component code. */
export function isPetSiteEnabled(): boolean {
	return getInitialValue();
}

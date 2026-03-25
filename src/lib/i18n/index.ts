import { browser } from '$app/environment';
import { init, register, getLocaleFromNavigator } from 'svelte-i18n';

import is from './is.json';
import en from './en.json';

register('is', () => Promise.resolve(is));
register('en', () => Promise.resolve(en));

function getInitialLocale(): string {
	if (!browser) return 'is';
	const saved = localStorage.getItem('fundid-locale');
	if (saved === 'is' || saved === 'en') return saved;
	const nav = getLocaleFromNavigator() || '';
	return nav.startsWith('is') ? 'is' : 'is';
}

init({
	fallbackLocale: 'is',
	initialLocale: getInitialLocale()
});

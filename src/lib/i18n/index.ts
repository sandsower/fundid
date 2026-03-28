import { Tolgee, FormatSimple } from '@tolgee/svelte';
import { browser } from '$app/environment';

import en from './en.json';
import is from './is.json';

function getInitialLocale(): string {
	if (!browser) return 'is';
	const saved = localStorage.getItem('fundid-locale');
	if (saved === 'is' || saved === 'en') return saved;
	return 'is';
}

const initialLocale = getInitialLocale();

export const tolgee = Tolgee()
	.use(FormatSimple())
	.init({
		language: initialLocale,
		fallbackLanguage: 'is',
		staticData: { en, is }
	});


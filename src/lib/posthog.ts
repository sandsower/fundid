import posthog from 'posthog-js';
import { browser } from '$app/environment';

const POSTHOG_KEY = 'phc_BxnLWEgef23Khlrx6Q1z9IRkAu2YKNPN39Gf0EceHHJ';

// Strip bearer-token query params from any URL field sent to analytics.
// /report/inst receives the institution token as `?t=TOKEN` from printed QR
// posters; that URL must never leave the browser.
const REDACT_PARAMS = new Set(['t', 'token']);

function scrubUrl(raw: unknown): unknown {
	if (typeof raw !== 'string' || !raw) return raw;
	try {
		const url = new URL(raw);
		let changed = false;
		for (const key of Array.from(url.searchParams.keys())) {
			if (REDACT_PARAMS.has(key)) {
				url.searchParams.delete(key);
				changed = true;
			}
		}
		return changed ? url.toString() : raw;
	} catch {
		return raw;
	}
}

let initialized = false;

export function initPostHog() {
	if (!browser) return;
	posthog.init(POSTHOG_KEY, {
		api_host: 'https://eu.i.posthog.com',
		ui_host: 'https://eu.posthog.com',
		persistence: 'memory',
		autocapture: false,
		capture_pageview: false,
		capture_pageleave: false,
		disable_session_recording: true,
		advanced_disable_feature_flags: true,
		sanitize_properties: (properties) => {
			if (properties.$current_url) properties.$current_url = scrubUrl(properties.$current_url);
			if (properties.$referrer) properties.$referrer = scrubUrl(properties.$referrer);
			return properties;
		}
	});
	initialized = true;
}

export function capture(event: string, properties?: Record<string, unknown>) {
	if (!initialized) return;
	posthog.capture(event, properties);
}

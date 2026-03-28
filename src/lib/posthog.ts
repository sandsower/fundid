import posthog from 'posthog-js';
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

let initialized = false;

export function initPostHog() {
	if (!browser) return;
	const key = env.PUBLIC_POSTHOG_KEY;
	if (!key) return;
	posthog.init(key, {
		api_host: 'https://eu.i.posthog.com',
		ui_host: 'https://eu.posthog.com',
		persistence: 'memory',
		autocapture: false,
		capture_pageview: false,
		capture_pageleave: false,
		disable_session_recording: true,
		advanced_disable_feature_flags: true
	});
	initialized = true;
}

export function capture(event: string, properties?: Record<string, unknown>) {
	if (!initialized) return;
	posthog.capture(event, properties);
}

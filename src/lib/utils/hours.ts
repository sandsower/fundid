import type { WeekHours, DayOfWeek } from '$types/item';

const DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Strict validator for admin `hours_json` input. Anything that isn't a plain
// object mapping a day key to an array of `[HH:MM, HH:MM]` tuples is rejected.
// Returns the parsed WeekHours on success, null on any shape mismatch.
export function parseWeekHours(input: unknown): WeekHours | null {
	if (input === null || input === undefined) return null;
	if (typeof input !== 'object' || Array.isArray(input)) return null;
	const out: WeekHours = {};
	for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
		if (!DAYS.includes(key as DayOfWeek)) return null;
		if (!Array.isArray(value)) return null;
		const ranges: [string, string][] = [];
		for (const entry of value) {
			if (!Array.isArray(entry) || entry.length !== 2) return null;
			const [open, close] = entry;
			if (typeof open !== 'string' || typeof close !== 'string') return null;
			if (!HHMM.test(open) || !HHMM.test(close)) return null;
			ranges.push([open, close]);
		}
		out[key as DayOfWeek] = ranges;
	}
	return out;
}

const DAY_LABELS_IS: Record<DayOfWeek, string> = {
	mon: 'Mán',
	tue: 'Þri',
	wed: 'Mið',
	thu: 'Fim',
	fri: 'Fös',
	sat: 'Lau',
	sun: 'Sun'
};

const DAY_LABELS_EN: Record<DayOfWeek, string> = {
	mon: 'Mon',
	tue: 'Tue',
	wed: 'Wed',
	thu: 'Thu',
	fri: 'Fri',
	sat: 'Sat',
	sun: 'Sun'
};

export interface FormattedDay {
	label: string;
	hours: string;
}

export function formatWeekHours(
	hours: WeekHours | null | undefined,
	locale: 'is' | 'en'
): FormattedDay[] {
	if (!hours) return [];
	const labels = locale === 'is' ? DAY_LABELS_IS : DAY_LABELS_EN;
	const closed = locale === 'is' ? 'Lokað' : 'Closed';

	return DAYS.map((day) => {
		const ranges = hours[day];
		if (!Array.isArray(ranges) || ranges.length === 0) {
			return { label: labels[day], hours: closed };
		}
		// Tolerate legacy rows or DB-direct edits with malformed entries —
		// render what we can, skip the rest, never throw.
		const formatted = ranges
			.map((entry) => {
				if (!Array.isArray(entry) || entry.length !== 2) return null;
				const [open, close] = entry;
				if (typeof open !== 'string' || typeof close !== 'string') return null;
				return `${open}–${close}`;
			})
			.filter((s): s is string => s !== null);
		return {
			label: labels[day],
			hours: formatted.length > 0 ? formatted.join(', ') : closed
		};
	});
}

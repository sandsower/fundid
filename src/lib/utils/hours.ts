import type { WeekHours, DayOfWeek } from '$types/item';

const DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

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
		if (!ranges || ranges.length === 0) {
			return { label: labels[day], hours: closed };
		}
		return {
			label: labels[day],
			hours: ranges.map(([open, close]) => `${open}–${close}`).join(', ')
		};
	});
}

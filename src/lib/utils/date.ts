/** Format a date string as dd-mm-yyyy */
export function formatDate(dateStr: string): string {
	const d = new Date(dateStr);
	const day = String(d.getDate()).padStart(2, '0');
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const year = d.getFullYear();
	return `${day}-${month}-${year}`;
}

/** Format a date string as dd-mm-yyyy HH:MM */
export function formatDateTime(dateStr: string): string {
	const d = new Date(dateStr);
	const day = String(d.getDate()).padStart(2, '0');
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const year = d.getFullYear();
	const hour = String(d.getHours()).padStart(2, '0');
	const min = String(d.getMinutes()).padStart(2, '0');
	return `${day}-${month}-${year} ${hour}:${min}`;
}

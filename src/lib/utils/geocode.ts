const NOMINATIM = 'https://nominatim.openstreetmap.org';

export interface GeoResult {
	lat: number;
	lng: number;
	name: string;
}

let lastRequest = 0;

async function throttledFetch(url: string): Promise<Response | null> {
	const now = Date.now();
	const wait = Math.max(0, 1100 - (now - lastRequest));
	if (wait > 0) await new Promise((r) => setTimeout(r, wait));
	lastRequest = Date.now();
	try {
		const res = await fetch(url);
		return res.ok ? res : null;
	} catch {
		return null;
	}
}

/** Reverse geocode: coords → address string */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
	const res = await throttledFetch(
		`${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18&accept-language=is,en`
	);
	if (!res) return null;
	const data = await res.json();
	return formatAddress(data) || data.display_name || null;
}

/** Forward geocode: search string → list of results, biased to Iceland */
export async function searchAddress(query: string): Promise<GeoResult[]> {
	if (query.length < 2) return [];
	const res = await throttledFetch(
		`${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=is&viewbox=-24.5,63.3,-13.5,66.6&bounded=0&accept-language=is,en`
	);
	if (!res) return [];
	const data = await res.json();
	return data.map((r: any) => ({
		lat: parseFloat(r.lat),
		lng: parseFloat(r.lon),
		name: formatAddress(r) || r.display_name
	}));
}

function formatAddress(data: any): string | null {
	const a = data.address;
	if (!a) return null;

	const parts: string[] = [];

	if (a.road) {
		parts.push(a.house_number ? `${a.road} ${a.house_number}` : a.road);
	} else if (a.pedestrian || a.path) {
		parts.push(a.pedestrian || a.path);
	}

	if (a.suburb || a.neighbourhood) {
		parts.push(a.suburb || a.neighbourhood);
	}

	const place = a.city || a.town || a.village || a.hamlet;
	if (place) parts.push(place);

	return parts.length > 0 ? parts.join(', ') : null;
}

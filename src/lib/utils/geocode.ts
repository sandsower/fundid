const NOMINATIM = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'Accept-Language': 'is,en', 'User-Agent': 'Fundið/1.0 (fundid.is)' };

export interface GeoResult {
	lat: number;
	lng: number;
	name: string;
}

/** Reverse geocode: coords → address string */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
	try {
		const res = await fetch(
			`${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`,
			{ headers: HEADERS }
		);
		if (!res.ok) return null;
		const data = await res.json();
		return formatAddress(data) || data.display_name || null;
	} catch {
		return null;
	}
}

/** Forward geocode: search string → list of results, biased to Iceland */
export async function searchAddress(query: string): Promise<GeoResult[]> {
	if (query.length < 2) return [];
	try {
		const res = await fetch(
			`${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=is&viewbox=-24.5,63.3,-13.5,66.6&bounded=0`,
			{ headers: HEADERS }
		);
		if (!res.ok) return [];
		const data = await res.json();
		return data.map((r: any) => ({
			lat: parseFloat(r.lat),
			lng: parseFloat(r.lon),
			name: formatAddress(r) || r.display_name
		}));
	} catch {
		return [];
	}
}

function formatAddress(data: any): string | null {
	const a = data.address;
	if (!a) return null;

	const parts: string[] = [];

	// Street + house number
	if (a.road) {
		parts.push(a.house_number ? `${a.road} ${a.house_number}` : a.road);
	} else if (a.pedestrian || a.path) {
		parts.push(a.pedestrian || a.path);
	}

	// Neighborhood / suburb
	if (a.suburb || a.neighbourhood) {
		parts.push(a.suburb || a.neighbourhood);
	}

	// City / town / village
	const place = a.city || a.town || a.village || a.hamlet;
	if (place) parts.push(place);

	return parts.length > 0 ? parts.join(', ') : null;
}

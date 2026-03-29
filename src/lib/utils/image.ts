import imageCompression from 'browser-image-compression';
import exifr from 'exifr';

export interface GpsCoords {
	latitude: number;
	longitude: number;
}

export async function extractGps(file: File): Promise<GpsCoords | null> {
	try {
		const data = await exifr.gps(file);
		if (data?.latitude && data?.longitude) {
			return { latitude: data.latitude, longitude: data.longitude };
		}
		return null;
	} catch {
		return null;
	}
}

export async function compressImage(file: File): Promise<File> {
	// libURL points to a self-hosted copy of the library to avoid CSP-blocked jsdelivr fetch.
	// If you update browser-image-compression, re-copy: cp node_modules/browser-image-compression/dist/browser-image-compression.js static/
	return imageCompression(file, {
		maxSizeMB: 1,
		maxWidthOrHeight: 1200,
		useWebWorker: true,
		libURL: '/browser-image-compression.js',
		fileType: 'image/webp'
	});
}

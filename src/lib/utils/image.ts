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
	return imageCompression(file, {
		maxSizeMB: 1,
		maxWidthOrHeight: 1200,
		useWebWorker: false,
		fileType: 'image/webp'
	});
}

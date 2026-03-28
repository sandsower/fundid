<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getTranslate } from '@tolgee/svelte';
	import { ICELAND_CENTER, DEFAULT_ZOOM } from '$utils/geo';
	import { reverseGeocode } from '$utils/geocode';

	const { t } = getTranslate();

	let {
		latitude = $bindable(ICELAND_CENTER.lat),
		longitude = $bindable(ICELAND_CENTER.lng),
		height = '200px',
		onLocationResolved,
		onReady
	}: {
		latitude: number;
		longitude: number;
		height?: string;
		onLocationResolved?: (name: string) => void;
		onReady?: (api: { flyTo: (lat: number, lng: number) => void }) => void;
	} = $props();

	let container: HTMLDivElement;
	let map: any;
	let markerInstance: any;
	let hasPin = $state(false);

	function tryInit() {
		if (map || !container) return;
		const rect = container.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) {
			requestAnimationFrame(tryInit);
			return;
		}
		doInit();
	}

	async function doInit() {
		const maplibregl = await import('maplibre-gl');
		const hasCustomLocation = latitude !== ICELAND_CENTER.lat || longitude !== ICELAND_CENTER.lng;

		map = new maplibregl.Map({
			container,
			style: {
				version: 8,
				sources: {
					osm: {
						type: 'raster',
						tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
						tileSize: 256,
						attribution: '&copy; OpenStreetMap contributors'
					}
				},
				layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
			},
			center: [longitude, latitude],
			zoom: hasCustomLocation ? 15 : DEFAULT_ZOOM
		});

		map.addControl(new maplibregl.NavigationControl(), 'top-right');

		const geolocate = new maplibregl.GeolocateControl({
			positionOptions: { enableHighAccuracy: true },
			trackUserLocation: false
		});
		map.addControl(geolocate, 'top-right');

		if (hasCustomLocation) {
			placeMarker(maplibregl, longitude, latitude);
		}

		map.on('click', (e: any) => {
			const { lng, lat } = e.lngLat;
			latitude = lat;
			longitude = lng;
			placeMarker(maplibregl, lng, lat);
			resolveAddress(lat, lng);
		});

		geolocate.on('geolocate', (e: any) => {
			if (e.coords) {
				latitude = e.coords.latitude;
				longitude = e.coords.longitude;
				placeMarker(maplibregl, e.coords.longitude, e.coords.latitude);
				resolveAddress(e.coords.latitude, e.coords.longitude);
			}
		});

		if (onReady) onReady({ flyTo });
	}

	function placeMarker(maplibregl: any, lng: number, lat: number) {
		if (markerInstance) markerInstance.remove();

		// Outer wrapper for the drop animation
		const wrapper = document.createElement('div');
		wrapper.style.cssText = `
			width: 40px; height: 52px;
			position: relative;
			cursor: grab;
		`;

		// The pin itself — SVG map pin shape built via DOM
		const pin = document.createElement('div');
		pin.style.cssText = `
			width: 36px; height: 48px;
			position: absolute;
			left: 2px; top: -10px;
			filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
			transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
			transform-origin: center bottom;
		`;

		const svgNS = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(svgNS, 'svg');
		svg.setAttribute('viewBox', '0 0 36 48');
		svg.setAttribute('fill', 'none');

		const body = document.createElementNS(svgNS, 'path');
		body.setAttribute('d', 'M18 0C8.06 0 0 8.06 0 18c0 12.6 16.2 28.4 16.9 29.1a1.5 1.5 0 0 0 2.2 0C19.8 46.4 36 30.6 36 18 36 8.06 27.94 0 18 0Z');
		body.setAttribute('fill', '#E08A50');
		svg.appendChild(body);

		const highlight = document.createElementNS(svgNS, 'path');
		highlight.setAttribute('d', 'M18 0C8.06 0 0 8.06 0 18c0 12.6 16.2 28.4 16.9 29.1a1.5 1.5 0 0 0 2.2 0C19.8 46.4 36 30.6 36 18 36 8.06 27.94 0 18 0Z');
		highlight.setAttribute('fill', 'url(#pin-grad)');
		svg.appendChild(highlight);

		const dot = document.createElementNS(svgNS, 'circle');
		dot.setAttribute('cx', '18');
		dot.setAttribute('cy', '18');
		dot.setAttribute('r', '8');
		dot.setAttribute('fill', 'white');
		svg.appendChild(dot);

		const defs = document.createElementNS(svgNS, 'defs');
		const grad = document.createElementNS(svgNS, 'linearGradient');
		grad.setAttribute('id', 'pin-grad');
		grad.setAttribute('x1', '18');
		grad.setAttribute('y1', '0');
		grad.setAttribute('x2', '18');
		grad.setAttribute('y2', '48');
		grad.setAttribute('gradientUnits', 'userSpaceOnUse');
		const stop1 = document.createElementNS(svgNS, 'stop');
		stop1.setAttribute('offset', '0');
		stop1.setAttribute('stop-color', 'white');
		stop1.setAttribute('stop-opacity', '0.25');
		const stop2 = document.createElementNS(svgNS, 'stop');
		stop2.setAttribute('offset', '1');
		stop2.setAttribute('stop-color', 'black');
		stop2.setAttribute('stop-opacity', '0.1');
		grad.appendChild(stop1);
		grad.appendChild(stop2);
		defs.appendChild(grad);
		svg.appendChild(defs);

		pin.appendChild(svg);
		wrapper.appendChild(pin);

		// Drop-in animation
		pin.style.transform = 'translateY(-60px) scale(0.5)';
		pin.style.opacity = '0';

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				pin.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease';
				pin.style.transform = 'translateY(0) scale(1)';
				pin.style.opacity = '1';

				// Bounce settle
				setTimeout(() => {
					pin.style.transform = 'translateY(-3px) scale(1.05)';
					setTimeout(() => {
						pin.style.transition = 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)';
						pin.style.transform = 'translateY(0) scale(1)';
					}, 150);
				}, 350);
			});
		});

		// Drag physics: lift on grab, drop on release
		wrapper.addEventListener('mousedown', () => {
			pin.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
			pin.style.transform = 'translateY(-12px) scale(1.15)';
			wrapper.style.cursor = 'grabbing';
		});

		wrapper.addEventListener('touchstart', () => {
			pin.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
			pin.style.transform = 'translateY(-12px) scale(1.15)';
		}, { passive: true });

		function dropPin() {
			pin.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
			pin.style.transform = 'translateY(0) scale(1)';
			wrapper.style.cursor = 'grab';
		}

		document.addEventListener('mouseup', dropPin);
		document.addEventListener('touchend', dropPin);

		// Hover wobble
		wrapper.addEventListener('mouseenter', () => {
			if (wrapper.style.cursor !== 'grabbing') {
				pin.style.transition = 'transform 0.2s ease';
				pin.style.transform = 'translateY(-2px) scale(1.05)';
			}
		});
		wrapper.addEventListener('mouseleave', () => {
			if (wrapper.style.cursor !== 'grabbing') {
				pin.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
				pin.style.transform = 'translateY(0) scale(1)';
			}
		});

		markerInstance = new maplibregl.Marker({ element: wrapper, draggable: true, anchor: 'bottom' })
			.setLngLat([lng, lat])
			.addTo(map);

		hasPin = true;

		markerInstance.on('dragend', () => {
			const pos = markerInstance.getLngLat();
			latitude = pos.lat;
			longitude = pos.lng;
			resolveAddress(pos.lat, pos.lng);
		});
	}

	let resolveTimer: ReturnType<typeof setTimeout>;

	function resolveAddress(lat: number, lng: number) {
		if (!onLocationResolved) return;
		clearTimeout(resolveTimer);
		resolveTimer = setTimeout(async () => {
			const name = await reverseGeocode(lat, lng);
			if (name) onLocationResolved(name);
		}, 1500);
	}

	function flyTo(lat: number, lng: number) {
		if (!map) return;
		latitude = lat;
		longitude = lng;
		import('maplibre-gl').then((ml) => {
			placeMarker(ml, lng, lat);
			map.flyTo({ center: [lng, lat], zoom: 15 });
		});
	}

	$effect(() => {
		if (map && markerInstance && latitude && longitude) {
			const pos = markerInstance.getLngLat();
			if (Math.abs(pos.lat - latitude) > 0.0001 || Math.abs(pos.lng - longitude) > 0.0001) {
				markerInstance.setLngLat([longitude, latitude]);
				map.flyTo({ center: [longitude, latitude], zoom: 15 });
			}
		} else if (map && !markerInstance && latitude !== ICELAND_CENTER.lat) {
			import('maplibre-gl').then((ml) => {
				placeMarker(ml, longitude, latitude);
				map.flyTo({ center: [longitude, latitude], zoom: 15 });
			});
		}
	});

	onMount(() => {
		tryInit();
	});

	onDestroy(() => {
		map?.remove();
	});
</script>

<div class="relative rounded-xl overflow-hidden" style="height: {height};">
	<div bind:this={container} style="width: 100%; height: {height};"></div>
	{#if !hasPin}
		<div class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
			<span class="text-xs font-medium text-[var(--color-muted)] bg-white/90 px-3 py-1.5 rounded-full shadow-sm">
				{$t('item.tapMap')}
			</span>
		</div>
	{/if}
</div>

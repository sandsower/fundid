<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ICELAND_CENTER, DEFAULT_ZOOM } from '$utils/geo';
	import type { Item } from '$types/item';

	export interface MapBounds {
		north: number;
		south: number;
		east: number;
		west: number;
	}

	let { items = [], onMarkerClick, onBoundsChange }: {
		items?: Item[];
		onMarkerClick?: (item: Item) => void;
		onBoundsChange?: (bounds: MapBounds) => void;
	} = $props();

	let container: HTMLDivElement;
	let map: any;
	let markers: any[] = [];

	onMount(async () => {
		const maplibregl = await import('maplibre-gl');

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
				layers: [
					{
						id: 'osm',
						type: 'raster',
						source: 'osm',
						minzoom: 0,
						maxzoom: 19
					}
				]
			},
			center: [ICELAND_CENTER.lng, ICELAND_CENTER.lat],
			zoom: DEFAULT_ZOOM
		});

		map.addControl(new maplibregl.NavigationControl(), 'top-right');

		function emitBounds() {
			if (!onBoundsChange || !map) return;
			const b = map.getBounds();
			onBoundsChange({
				north: b.getNorth(),
				south: b.getSouth(),
				east: b.getEast(),
				west: b.getWest()
			});
		}

		map.on('moveend', emitBounds);
		map.on('load', emitBounds);
		map.addControl(
			new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
			'top-right'
		);

		// Fit map to show all items
		map.on('load', () => {
			fitToItems(items);
		});

		updateMarkers(items);
	});

	function fitToItems(itemList: Item[]) {
		if (!map) return;
		const valid = itemList.filter(i => i.latitude && i.longitude);
		if (valid.length === 0) return;
		if (valid.length === 1) {
			map.flyTo({ center: [valid[0].longitude, valid[0].latitude], zoom: 15 });
			return;
		}
		import('maplibre-gl').then(({ LngLatBounds }) => {
			const bounds = new LngLatBounds();
			for (const item of valid) {
				bounds.extend([item.longitude, item.latitude]);
			}
			map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
		});
	}

	function updateMarkers(itemList: Item[]) {
		if (!map) return;

		for (const m of markers) m.remove();
		markers = [];

		import('maplibre-gl').then((maplibregl) => {
			for (const item of itemList) {
				if (!item.latitude || !item.longitude) continue;

				const color = item.type === 'lost' ? '#D9534F' : '#4A9B6A';
				const el = document.createElement('div');
				el.style.cssText = `
					width: 28px; height: 38px;
					cursor: pointer;
				`;
				el.title = item.title;

				const svgNS = 'http://www.w3.org/2000/svg';
				const svg = document.createElementNS(svgNS, 'svg');
				svg.setAttribute('viewBox', '0 0 28 38');
				svg.setAttribute('fill', 'none');
				svg.style.cssText = `
					transition: transform 0.15s ease;
					transform-origin: center bottom;
					filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25));
				`;
				const path = document.createElementNS(svgNS, 'path');
				path.setAttribute('d', 'M14 0C6.27 0 0 6.27 0 14c0 9.8 12.6 22.1 13.15 22.65a1.2 1.2 0 0 0 1.7 0C15.4 36.1 28 23.8 28 14 28 6.27 21.73 0 14 0Z');
				path.setAttribute('fill', color);
				svg.appendChild(path);
				const dot = document.createElementNS(svgNS, 'circle');
				dot.setAttribute('cx', '14');
				dot.setAttribute('cy', '14');
				dot.setAttribute('r', '5');
				dot.setAttribute('fill', 'white');
				svg.appendChild(dot);
				el.appendChild(svg);

				el.onmouseenter = () => (svg.style.transform = 'scale(1.2)');
				el.onmouseleave = () => (svg.style.transform = 'scale(1)');

				const imgHtml = item.image_url
						? `<img src="${item.image_url}" alt="" style="width: 100%; height: 120px; object-fit: cover; border-radius: 10px 10px 0 0; display: block;" />`
						: '';
				const popup = new maplibregl.Popup({ offset: 25, maxWidth: '260px', closeButton: false }).setHTML(
					`<div style="overflow: hidden;">
						${imgHtml}
						<div style="padding: 10px 12px 12px;">
							<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
								<span style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 999px; background: ${item.type === 'lost' ? '#FBF0EF' : '#EEF5F0'}; color: ${item.type === 'lost' ? '#D9534F' : '#4A9B6A'};">${item.type === 'lost' ? 'Lost' : 'Found'}</span>
								<span style="font-size: 11px; color: #9C8B7E;">${item.location_name}</span>
							</div>
							<p style="font-weight: 600; font-size: 14px; margin: 0 0 8px 0; color: #2C2520; line-height: 1.3;">${item.title}</p>
							<a href="/item/${item.id}" style="font-size: 12px; color: #C87640; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">View details <span style="font-size: 14px;">→</span></a>
						</div>
					</div>`
				);

				const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
					.setLngLat([item.longitude, item.latitude])
					.setPopup(popup)
					.addTo(map);

				popup.on('open', () => {
					const px = map.project([item.longitude, item.latitude]);
					const container = map.getContainer();
					const h = container.clientHeight;
					// Offset upward so popup clears the floating action buttons (~80px from bottom)
					const targetY = h * 0.4;
					const offsetY = px.y - targetY;
					if (offsetY > 20) {
						map.panBy([0, offsetY], { duration: 300 });
					}
				});

				if (onMarkerClick) {
					el.addEventListener('click', () => onMarkerClick(item));
				}

				markers.push(marker);
			}

		});
	}

	let initialFitDone = false;

	$effect(() => {
		updateMarkers(items);
		if (!initialFitDone && items.length > 0) {
			initialFitDone = true;
			fitToItems(items);
		}
	});

	onDestroy(() => {
		map?.remove();
	});
</script>

<div bind:this={container} class="w-full h-full"></div>

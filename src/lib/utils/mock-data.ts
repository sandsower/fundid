import type { Item, ItemType, ItemCategory } from '$types/item';

const CATEGORIES: ItemCategory[] = [
	'phone', 'wallet', 'keys', 'bag', 'glasses', 'clothing',
	'jewelry', 'documents', 'electronics', 'pet', 'bicycle', 'other'
];

const LOCATIONS: { name: string; lat: number; lng: number; spread: number }[] = [
	// Reykjavik metro
	{ name: 'Laugavegur', lat: 64.1466, lng: -21.9260, spread: 0.005 },
	{ name: 'Hlemmur', lat: 64.1435, lng: -21.9150, spread: 0.003 },
	{ name: 'Hallgrímskirkja', lat: 64.1418, lng: -21.9268, spread: 0.002 },
	{ name: 'Harpa', lat: 64.1504, lng: -21.9329, spread: 0.003 },
	{ name: 'BSÍ', lat: 64.1388, lng: -21.9406, spread: 0.002 },
	{ name: 'Kringlan', lat: 64.1296, lng: -21.8936, spread: 0.004 },
	{ name: 'Grandi', lat: 64.1545, lng: -21.9520, spread: 0.004 },
	{ name: 'Vesturbæjarlaug', lat: 64.1473, lng: -21.9530, spread: 0.002 },
	{ name: 'Laugardalur', lat: 64.1440, lng: -21.8730, spread: 0.005 },
	{ name: 'Seltjarnarnes', lat: 64.1540, lng: -21.9900, spread: 0.005 },
	{ name: 'Breiðholt', lat: 64.1100, lng: -21.8300, spread: 0.008 },
	{ name: 'Grafarvogur', lat: 64.1600, lng: -21.8400, spread: 0.006 },
	{ name: 'Kópavogur', lat: 64.1100, lng: -21.9100, spread: 0.008 },
	{ name: 'Hafnarfjörður', lat: 64.0667, lng: -21.9500, spread: 0.008 },
	{ name: 'Garðabær', lat: 64.0890, lng: -21.9200, spread: 0.005 },
	{ name: 'Mosfellsbær', lat: 64.1667, lng: -21.7000, spread: 0.008 },
	// North
	{ name: 'Akureyri', lat: 65.6835, lng: -18.0878, spread: 0.01 },
	{ name: 'Dalvík', lat: 65.9700, lng: -18.5300, spread: 0.005 },
	{ name: 'Húsavík', lat: 66.0449, lng: -17.3380, spread: 0.005 },
	{ name: 'Siglufjörður', lat: 66.1511, lng: -18.9110, spread: 0.003 },
	{ name: 'Sauðárkrókur', lat: 65.7467, lng: -19.6394, spread: 0.005 },
	// East
	{ name: 'Egilsstaðir', lat: 65.2533, lng: -14.3948, spread: 0.008 },
	{ name: 'Seyðisfjörður', lat: 65.2600, lng: -14.0100, spread: 0.003 },
	{ name: 'Neskaupstaður', lat: 65.1500, lng: -13.6900, spread: 0.003 },
	// South
	{ name: 'Selfoss', lat: 63.9336, lng: -21.0000, spread: 0.006 },
	{ name: 'Vík í Mýrdal', lat: 63.4186, lng: -19.0060, spread: 0.005 },
	{ name: 'Vestmannaeyjar', lat: 63.4400, lng: -20.2700, spread: 0.004 },
	{ name: 'Höfn', lat: 64.2539, lng: -15.2082, spread: 0.005 },
	{ name: 'Hella', lat: 63.8364, lng: -20.3756, spread: 0.003 },
	// West
	{ name: 'Borgarnes', lat: 64.5383, lng: -21.9200, spread: 0.005 },
	{ name: 'Stykkishólmur', lat: 65.0753, lng: -22.7300, spread: 0.003 },
	{ name: 'Ísafjörður', lat: 66.0750, lng: -23.1350, spread: 0.005 },
	{ name: 'Patreksfjörður', lat: 65.6058, lng: -23.9978, spread: 0.003 },
	// Golden Circle / tourist spots
	{ name: 'Þingvellir', lat: 64.2559, lng: -21.1298, spread: 0.01 },
	{ name: 'Geysir', lat: 64.3104, lng: -20.3023, spread: 0.005 },
	{ name: 'Gullfoss', lat: 64.3271, lng: -20.1199, spread: 0.003 },
	{ name: 'Bláa Lónið', lat: 63.8804, lng: -22.4495, spread: 0.003 },
	{ name: 'Jökulsárlón', lat: 64.0784, lng: -16.2306, spread: 0.005 },
	{ name: 'Skógafoss', lat: 63.5321, lng: -19.5113, spread: 0.002 },
	{ name: 'Seljalandsfoss', lat: 63.6156, lng: -19.9886, spread: 0.002 },
];

const TITLES_LOST: Record<ItemCategory, string[]> = {
	phone: ['Black iPhone 15', 'Samsung Galaxy S24', 'Cracked iPhone', 'Blue Pixel phone', 'Nokia phone with case'],
	wallet: ['Brown leather wallet', 'Red card holder', 'Black bifold wallet', 'Blue wallet with ID', 'Small coin purse'],
	keys: ['Car keys with red fob', 'House keys on ring', 'Keychain with 4 keys', 'Small key with tag', 'Toyota key fob'],
	bag: ['Green backpack', 'Black tote bag', 'Grey hiking pack', 'Red gym bag', 'Canvas shoulder bag'],
	glasses: ['Ray-Ban sunglasses', 'Reading glasses gold frame', 'Prescription glasses black', 'Round sunglasses', 'Children\'s glasses'],
	clothing: ['Black down jacket', 'Red wool scarf', 'Grey beanie hat', 'Blue rain jacket', 'Wool sweater lopapeysa'],
	jewelry: ['Silver ring with stone', 'Gold necklace', 'Charm bracelet', 'Pearl earring (single)', 'Wedding band'],
	documents: ['Icelandic passport', 'Driving licence', 'Bus card', 'Student ID', 'Work badge'],
	electronics: ['iPad Air', 'AirPods case', 'Camera lens cap', 'Kindle reader', 'Bluetooth speaker'],
	pet: ['Orange tabby cat', 'Small brown dog', 'Black cat white paws', 'Golden retriever', 'Grey kitten'],
	bicycle: ['Red city bike', 'Black mountain bike', 'Blue children\'s bike', 'Green e-bike', 'Vintage road bike'],
	other: ['Umbrella black', 'Water bottle blue', 'Sketchbook A5', 'Stuffed toy bear', 'Hiking pole'],
};

const DESCRIPTIONS: string[] = [
	'Left it somewhere around here, not sure exactly when.',
	'Was walking around and noticed it was gone.',
	'Pretty sure I had it at this location.',
	'If found please get in touch.',
	'Very sentimental value.',
	'Lost during the evening, around 18:00.',
	'Might have fallen out of my pocket.',
	'Was in a rush and forgot it behind.',
	'Has some scratches on it.',
	'Reward offered.',
	'',
	'',
];

function rand<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function jitter(base: number, spread: number): number {
	return base + (Math.random() - 0.5) * 2 * spread;
}

function randomDate(daysBack: number): string {
	const d = new Date();
	d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
	return d.toISOString();
}

function uuid(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
	});
}

export function generateMockItems(count: number): Item[] {
	const items: Item[] = [];

	for (let i = 0; i < count; i++) {
		const type: ItemType = Math.random() > 0.45 ? 'lost' : 'found';
		const category = rand(CATEGORIES);
		const loc = rand(LOCATIONS);
		const titles = TITLES_LOST[category];
		const daysAgo = Math.floor(Math.random() * 30);
		const hasImage = Math.random() > 0.3;

		items.push({
			id: uuid(),
			type,
			category,
			title: rand(titles),
			description: rand(DESCRIPTIONS),
			image_url: hasImage ? `https://cataas.com/cat?width=400&height=300&t=${i}` : null,
			latitude: jitter(loc.lat, loc.spread),
			longitude: jitter(loc.lng, loc.spread),
			location_name: loc.name,
			date_occurred: randomDate(daysAgo + 1).split('T')[0],
			status: 'active',
			contact_method: 'email',
			contact_value: null,
			claim_code_hash: null,
			created_at: randomDate(daysAgo),
			updated_at: randomDate(daysAgo),
		});
	}

	return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

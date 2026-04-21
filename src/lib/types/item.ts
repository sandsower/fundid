export type ItemType = 'lost' | 'found';

export type ItemCategory =
	| 'phone'
	| 'wallet'
	| 'keys'
	| 'bag'
	| 'glasses'
	| 'clothing'
	| 'jewelry'
	| 'documents'
	| 'electronics'
	| 'pet'
	| 'bicycle'
	| 'other';

export type ItemStatus = 'active' | 'resolved' | 'expired';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type HoursRange = [string, string]; // ["HH:MM", "HH:MM"]
export type WeekHours = Partial<Record<DayOfWeek, HoursRange[]>>;

export interface Institution {
	id: string;
	slug: string;
	name: string;
	address: string;
	latitude: number;
	longitude: number;
	phone: string | null;
	hours_json: WeekHours | null;
}

export interface Item {
	id: string;
	type: ItemType;
	category: ItemCategory;
	title: string;
	description: string;
	image_url: string | null;
	latitude: number;
	longitude: number;
	location_name: string;
	date_occurred: string;
	status: ItemStatus;
	contact_method: 'email' | 'anonymous';
	contact_value: string | null;
	claim_code_hash: string | null;
	institution_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface NewItem {
	type: ItemType;
	category: ItemCategory;
	title: string;
	description: string;
	latitude: number;
	longitude: number;
	location_name: string;
	date_occurred: string;
	contact_method: 'email' | 'anonymous';
	contact_value: string | null;
}

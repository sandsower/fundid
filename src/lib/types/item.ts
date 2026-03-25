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

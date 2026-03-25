import { writable } from 'svelte/store';
import type { Item, ItemCategory, ItemType } from '$types/item';

export const items = writable<Item[]>([]);
export const loading = writable(false);

export interface ItemFilters {
	type: ItemType | 'all';
	category: ItemCategory | 'all';
	query: string;
}

export const filters = writable<ItemFilters>({
	type: 'all',
	category: 'all',
	query: ''
});

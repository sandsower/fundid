import type { ItemCategory } from '$types/item';
import {
	Smartphone,
	Wallet,
	Key,
	Backpack,
	Glasses,
	Shirt,
	Gem,
	FileText,
	Laptop,
	PawPrint,
	Bike,
	Box
} from 'lucide-svelte';
import type { ComponentType } from 'svelte';

export const categoryIcons: Record<ItemCategory, ComponentType> = {
	phone: Smartphone,
	wallet: Wallet,
	keys: Key,
	bag: Backpack,
	glasses: Glasses,
	clothing: Shirt,
	jewelry: Gem,
	documents: FileText,
	electronics: Laptop,
	pet: PawPrint,
	bicycle: Bike,
	other: Box
};

export const allCategories: ItemCategory[] = [
	'phone',
	'wallet',
	'keys',
	'bag',
	'glasses',
	'clothing',
	'jewelry',
	'documents',
	'electronics',
	'pet',
	'bicycle',
	'other'
];

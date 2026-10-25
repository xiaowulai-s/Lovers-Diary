import type { Database } from '../../lib/database.types';

export type FoodRecord = Database['public']['Tables']['food_records']['Row'];

export type FoodDraft = {
  name: string;
  eatenOn: string;
  eatenAt: string;
  city: string;
  shop: string;
  note: string;
  isFavorite: boolean;
};

export type FoodMonthData = {
  items: FoodRecord[];
  urls: Record<string, string>;
};

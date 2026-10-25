import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { Database } from '../../lib/database.types';
import type { RootTabParamList } from '../../navigation/types';

export type SearchKind = 'anniversary' | 'note' | 'food' | 'todo' | 'photo';

export type SearchResult =
  Database['public']['Functions']['search_content']['Returns'][number];

type SearchKindMeta = {
  label: string;
  tab: keyof RootTabParamList;
  icon: ComponentProps<typeof Feather>['name'];
};

export const SEARCH_KIND_META: Record<SearchKind, SearchKindMeta> = {
  anniversary: { label: '纪念日', tab: 'Anniversaries', icon: 'calendar' },
  note: { label: '小纸条', tab: 'Nest', icon: 'feather' },
  food: { label: '美食', tab: 'Food', icon: 'coffee' },
  todo: { label: '计划', tab: 'Plans', icon: 'check-square' },
  photo: { label: '照片', tab: 'Photos', icon: 'image' },
};

export const SEARCH_KIND_ORDER: readonly SearchKind[] = [
  'anniversary',
  'note',
  'food',
  'todo',
  'photo',
];

export function isSearchKind(value: string): value is SearchKind {
  return value in SEARCH_KIND_META;
}

import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../lib/supabase';
import type { SearchResult } from './types';

export function useSearch(query: string) {
  const normalized = query.trim();

  return useQuery({
    queryKey: ['search', normalized],
    enabled: normalized.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchResult[]> => {
      const { data, error } = await supabase.rpc('search_content', {
        search_query: normalized,
      });

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });
}

export function getSearchErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return '搜索没有完成，请重试。';
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : '';
  const normalized = message.toLowerCase();

  if (code === 'PGRST202' || normalized.includes('search_content')) {
    return '搜索功能还没有启用，请先在 Supabase 执行 Phase 8A 迁移 SQL。';
  }
  if (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('timeout')
  ) {
    return '网络连接失败，请检查网络后重试。';
  }

  return '搜索没有完成，请稍后重试。';
}

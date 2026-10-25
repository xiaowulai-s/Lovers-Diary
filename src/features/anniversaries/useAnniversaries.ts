import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { supabase } from '../../lib/supabase';
import type { AnniversaryDraft } from './types';

const PAGE_SIZE = 20;

export const anniversaryKeys = {
  all: ['anniversaries'] as const,
  list: ['anniversaries', 'list'] as const,
  anchor: ['anniversaries', 'anchor'] as const,
};

export function useAnniversaryList() {
  return useInfiniteQuery({
    queryKey: anniversaryKeys.list,
    initialPageParam: 0,
    staleTime: 60_000,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE;
      const { data, error } = await supabase
        .from('anniversary_feed')
        .select('*')
        .order('next_on', { ascending: true, nullsFirst: false })
        .order('happened_on', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        throw error;
      }

      return data;
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
  });
}

export function useTogetherAnchor() {
  return useQuery({
    queryKey: anniversaryKeys.anchor,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anniversaries')
        .select('*')
        .eq('kind', 'together')
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
  });
}

async function saveAnniversary(id: string | undefined, draft: AnniversaryDraft) {
  const payload = {
    title: draft.title.trim(),
    happened_on: draft.happenedOn,
    kind: draft.kind,
    recurring: draft.recurring,
    note: draft.note.trim() || null,
  };

  if (id) {
    const { error } = await supabase.from('anniversaries').update(payload).eq('id', id);
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.from('anniversaries').insert(payload);
  if (error) {
    throw error;
  }
}

export function useSaveAnniversary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, draft }: { id?: string; draft: AnniversaryDraft }) =>
      saveAnniversary(id, draft),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: anniversaryKeys.all });
    },
  });
}

export function useDeleteAnniversary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('anniversaries').delete().eq('id', id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: anniversaryKeys.all });
    },
  });
}

export function getAnniversaryMutationError(
  error: unknown,
  action: 'save' | 'delete',
): string {
  const fallback = action === 'save' ? '保存失败，请稍后重试。' : '删除失败，请稍后重试。';

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : '';
  const normalized = message.toLowerCase();

  if (code === '23505' || message.includes('anniversaries_single_together_idx')) {
    return '已经有一个“在一起”的日子了，请直接编辑那一条。';
  }
  if (code === '42501' || normalized.includes('row-level security')) {
    return '没有权限修改这条记录。';
  }
  if (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('timeout')
  ) {
    return '网络连接失败，请检查网络后重试。';
  }

  return fallback;
}

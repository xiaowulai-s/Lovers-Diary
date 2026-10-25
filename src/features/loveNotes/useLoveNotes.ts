import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Database } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

export type LoveNote = Database['public']['Tables']['love_notes']['Row'];

export const loveNoteKeys = {
  all: ['love-notes'] as const,
};

export function useLoveNotes() {
  return useQuery({
    queryKey: loveNoteKeys.all,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('love_notes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return data;
    },
  });
}

type SaveLoveNoteVariables = {
  id?: string;
  body: string;
};

export function useSaveLoveNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: SaveLoveNoteVariables) => {
      const payload = { body: body.trim() };

      if (id) {
        const { error } = await supabase.from('love_notes').update(payload).eq('id', id);
        if (error) {
          throw error;
        }
        return;
      }

      const { error } = await supabase.from('love_notes').insert(payload);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: loveNoteKeys.all });
    },
  });
}

export function useDeleteLoveNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('love_notes').delete().eq('id', id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: loveNoteKeys.all });
    },
  });
}

export function getLoveNoteErrorMessage(error: unknown, action: 'save' | 'delete'): string {
  const fallback = action === 'save' ? '纸条没有保存成功，请重试。' : '删除失败，请稍后重试。';

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : '';
  const normalized = message.toLowerCase();

  if (code === '42501' || normalized.includes('row-level security')) {
    return '没有权限修改这张纸条，请重新登录后再试。';
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

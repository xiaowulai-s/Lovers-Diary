import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../lib/supabase';
import type { TodoDraft, TodoItem } from './types';

export const todoKeys = {
  all: ['todos'] as const,
};

export function useTodoItems() {
  return useQuery({
    queryKey: todoKeys.all,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('todo_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) {
        throw error;
      }

      return data;
    },
  });
}

type SaveTodoVariables = {
  id?: string;
  draft: TodoDraft;
};

async function saveTodo({ id, draft }: SaveTodoVariables): Promise<TodoItem> {
  const payload = {
    title: draft.title.trim(),
    note: draft.note.trim() || null,
    due_on: draft.dueOn,
  };

  if (id) {
    const { data, error } = await supabase
      .from('todo_items')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from('todo_items')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export function useSaveTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveTodo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: todoKeys.all });
    },
  });
}

type ToggleTodoVariables = {
  todo: TodoItem;
  done: boolean;
};

export function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ todo, done }: ToggleTodoVariables) => {
      const { error } = await supabase
        .from('todo_items')
        .update({
          is_done: done,
          completed_at: done ? new Date().toISOString() : null,
        })
        .eq('id', todo.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: todoKeys.all });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('todo_items').delete().eq('id', id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: todoKeys.all });
    },
  });
}

export function getTodoErrorMessage(error: unknown, action: 'save' | 'toggle' | 'delete'): string {
  const fallback =
    action === 'save'
      ? '计划没有保存成功，请重试。'
      : action === 'toggle'
        ? '状态没有更新成功，请重试。'
        : '删除失败，请稍后重试。';

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : '';
  const normalized = message.toLowerCase();

  if (code === '42501' || normalized.includes('row-level security')) {
    return '没有权限修改这条计划，请重新登录后再试。';
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

export type { TodoDraft, TodoItem };

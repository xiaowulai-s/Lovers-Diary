import type { Database } from '../../lib/database.types';

export type TodoItem = Database['public']['Tables']['todo_items']['Row'];

export type TodoDraft = {
  title: string;
  note: string;
  dueOn: string | null;
};

import { parseDateOnly, calendarDaysBetween } from '../anniversaries/utils';
import type { TodoItem } from './types';

export function sortPendingTodos(items: readonly TodoItem[]): TodoItem[] {
  return [...items].sort((left, right) => {
    if (left.due_on && right.due_on) {
      return left.due_on.localeCompare(right.due_on);
    }
    if (left.due_on) {
      return -1;
    }
    if (right.due_on) {
      return 1;
    }
    return right.created_at.localeCompare(left.created_at);
  });
}

export function sortCompletedTodos(items: readonly TodoItem[]): TodoItem[] {
  return [...items].sort((left, right) => {
    const leftTime = left.completed_at ?? left.updated_at;
    const rightTime = right.completed_at ?? right.updated_at;
    return rightTime.localeCompare(leftTime);
  });
}

export function todoDueLabel(todo: TodoItem, today: Date): string {
  if (!todo.due_on) {
    return '不设日期';
  }

  const dueDate = parseDateOnly(todo.due_on);
  if (!dueDate) {
    return todo.due_on;
  }

  const days = calendarDaysBetween(today, dueDate);
  const dateText = `${dueDate.getMonth() + 1} 月 ${dueDate.getDate()} 日`;

  if (days === 0) {
    return `今天 · ${dateText}`;
  }
  if (days > 0) {
    return `还有 ${days} 天 · ${dateText}`;
  }
  return `已过 ${Math.abs(days)} 天 · ${dateText}`;
}

export function isTodoOverdue(todo: TodoItem, today: Date): boolean {
  if (todo.is_done || !todo.due_on) {
    return false;
  }

  const dueDate = parseDateOnly(todo.due_on);
  return dueDate ? calendarDaysBetween(today, dueDate) < 0 : false;
}

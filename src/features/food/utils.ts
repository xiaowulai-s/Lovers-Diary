import { toDateKey } from '../../lib/date';

export function foodMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function foodMonthRange(date: Date): { start: string; end: string } {
  return {
    start: toDateKey(new Date(date.getFullYear(), date.getMonth(), 1)),
    end: toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

export function foodTimeValue(value: string): string {
  return value.slice(0, 5);
}

export function buildFoodTime(hourText: string, minuteText: string): string | null {
  if (!/^\d{1,2}$/.test(hourText) || !/^\d{1,2}$/.test(minuteText)) {
    return null;
  }

  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

export function currentFoodTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

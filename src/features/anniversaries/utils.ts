import type { Anniversary, AnniversaryKind } from './types';

export const ANNIVERSARY_KIND_LABELS: Record<AnniversaryKind, string> = {
  together: '在一起',
  birthday: '生日',
  anniversary: '纪念日',
  trip: '旅行',
  custom: '其他',
};

export const ANNIVERSARY_KINDS: readonly AnniversaryKind[] = [
  'together',
  'birthday',
  'anniversary',
  'trip',
  'custom',
];

export function parseDateOnly(value: string): Date | null {
  const parts = value.split('-');
  if (parts.length !== 3) {
    return null;
  }

  const [yearText, monthText, dayText] = parts;
  if (!yearText || !monthText || !dayText) {
    return null;
  }

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatDateLabel(date: Date): string {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

export function formatDateOnly(value: string): string {
  const date = parseDateOnly(value);
  return date ? formatDateLabel(date) : value;
}

export function formatMonthDay(value: string): { month: string; day: string; year: string } {
  const date = parseDateOnly(value);
  if (!date) {
    return { month: '—', day: '—', year: '—' };
  }

  return {
    month: `${date.getMonth() + 1} 月`,
    day: String(date.getDate()),
    year: String(date.getFullYear()),
  };
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayIndex(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round(dayIndex(to) - dayIndex(from));
}

export function daysTogether(happenedOn: string, today: Date): number | null {
  const start = parseDateOnly(happenedOn);
  if (!start) {
    return null;
  }

  const diff = calendarDaysBetween(start, today);
  return diff < 0 ? 0 : diff + 1;
}

export function nextOccurrenceFor(item: Pick<Anniversary, 'happened_on' | 'recurring'>, today: Date): Date | null {
  const original = parseDateOnly(item.happened_on);
  if (!original) {
    return null;
  }

  const todayStart = startOfLocalDay(today);

  if (!item.recurring) {
    return calendarDaysBetween(todayStart, original) >= 0 ? original : null;
  }

  const buildOccurrence = (year: number): Date => {
    const candidate = new Date(year, original.getMonth(), original.getDate());
    if (candidate.getMonth() !== original.getMonth()) {
      return new Date(year, original.getMonth() + 1, 0);
    }
    return candidate;
  };

  let candidate = buildOccurrence(Math.max(today.getFullYear(), original.getFullYear()));
  if (candidate < todayStart) {
    candidate = buildOccurrence(candidate.getFullYear() + 1);
  }

  return candidate;
}

export function countdownLabel(
  item: Pick<Anniversary, 'happened_on' | 'recurring'>,
  today: Date,
): string {
  const next = nextOccurrenceFor(item, today);
  if (!next) {
    return item.recurring ? '每年' : '已记录';
  }

  const daysLeft = calendarDaysBetween(today, next);
  if (daysLeft === 0) {
    return '就是今天';
  }

  return `还有 ${daysLeft} 天`;
}

export type UpcomingAnniversary = {
  item: Anniversary;
  nextDate: Date;
  daysLeft: number;
};

export function findNextAnniversary(
  items: readonly Anniversary[],
  anchor: Anniversary | null,
  today: Date,
): UpcomingAnniversary | null {
  const seen = new Set<string>();
  const all = anchor ? [...items, anchor] : [...items];
  let best: UpcomingAnniversary | null = null;

  for (const item of all) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);

    const nextDate = nextOccurrenceFor(item, today);
    if (!nextDate) {
      continue;
    }

    const daysLeft = calendarDaysBetween(today, nextDate);
    if (!best || daysLeft < best.daysLeft) {
      best = { item, nextDate, daysLeft };
    }
  }

  return best;
}

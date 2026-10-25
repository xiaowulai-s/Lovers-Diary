import type { Json } from '../../lib/database.types';

export type YearCity = {
  city: string;
  count: number;
};

export type YearFavoriteFood = {
  name: string;
  count: number;
};

export type YearAnniversaryItem = {
  id: string;
  title: string;
  happened_on: string;
  kind: string;
  recurring: boolean;
  note: string | null;
};

export type YearNoteItem = {
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
};

export type YearFoodItem = {
  id: string;
  name: string;
  eaten_on: string;
  eaten_at: string;
  city: string | null;
  shop: string | null;
  note: string | null;
  is_favorite: boolean;
  photo_path: string | null;
  thumb_path: string | null;
};

export type YearTodoItem = {
  id: string;
  title: string;
  note: string | null;
  due_on: string | null;
  completed_at: string;
};

export type YearPhotoSample = {
  id: string;
  storage_path: string;
  thumb_path: string | null;
  caption: string | null;
  taken_at: string;
};

export type YearReview = {
  year: number;
  anniversaries: number;
  notes: number;
  food: number;
  todos_completed: number;
  photos: number;
  cities: YearCity[];
  favorite_foods: YearFavoriteFood[];
  anniversary_items: YearAnniversaryItem[];
  note_items: YearNoteItem[];
  food_items: YearFoodItem[];
  todo_items: YearTodoItem[];
  photo_samples: YearPhotoSample[];
};

export type YearReviewData = YearReview & {
  photoUrls: Record<string, string>;
};

function asCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function parseCities(value: unknown): YearCity[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const city = asString(record.city);
    return city ? [{ city, count: asCount(record.count) }] : [];
  });
}

function parseFavoriteFoods(value: unknown): YearFavoriteFood[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const name = asString(record.name);
    return name ? [{ name, count: asCount(record.count) }] : [];
  });
}

function parseAnniversaryItems(value: unknown): YearAnniversaryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const id = asString(record.id);
    const title = asString(record.title);
    const happenedOn = asString(record.happened_on);
    const kind = asString(record.kind);

    if (!id || !title || !happenedOn || !kind) {
      return [];
    }

    return [
      {
        id,
        title,
        happened_on: happenedOn,
        kind,
        recurring: asBoolean(record.recurring),
        note: asString(record.note),
      },
    ];
  });
}

function parseNoteItems(value: unknown): YearNoteItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const id = asString(record.id);
    const body = asString(record.body);
    const createdAt = asString(record.created_at);

    if (!id || !body || !createdAt) {
      return [];
    }

    return [
      {
        id,
        body,
        created_at: createdAt,
        author_name: asString(record.author_name),
      },
    ];
  });
}

function parseFoodItems(value: unknown): YearFoodItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const id = asString(record.id);
    const name = asString(record.name);
    const eatenOn = asString(record.eaten_on);
    const eatenAt = asString(record.eaten_at);

    if (!id || !name || !eatenOn || !eatenAt) {
      return [];
    }

    return [
      {
        id,
        name,
        eaten_on: eatenOn,
        eaten_at: eatenAt,
        city: asString(record.city),
        shop: asString(record.shop),
        note: asString(record.note),
        is_favorite: asBoolean(record.is_favorite),
        photo_path: asString(record.photo_path),
        thumb_path: asString(record.thumb_path),
      },
    ];
  });
}

function parseTodoItems(value: unknown): YearTodoItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const id = asString(record.id);
    const title = asString(record.title);
    const completedAt = asString(record.completed_at);

    if (!id || !title || !completedAt) {
      return [];
    }

    return [
      {
        id,
        title,
        note: asString(record.note),
        due_on: asString(record.due_on),
        completed_at: completedAt,
      },
    ];
  });
}

function parsePhotoSamples(value: unknown): YearPhotoSample[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const id = asString(record.id);
    const storagePath = asString(record.storage_path);
    const takenAt = asString(record.taken_at);

    if (!id || !storagePath || !takenAt) {
      return [];
    }

    return [
      {
        id,
        storage_path: storagePath,
        thumb_path: asString(record.thumb_path),
        caption: asString(record.caption),
        taken_at: takenAt,
      },
    ];
  });
}

export function parseYearReview(value: Json, year: number): YearReview {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('年度回顾数据格式不正确。');
  }

  const record = value as Record<string, unknown>;

  return {
    year: asCount(record.year) || year,
    anniversaries: asCount(record.anniversaries),
    notes: asCount(record.notes),
    food: asCount(record.food),
    todos_completed: asCount(record.todos_completed),
    photos: asCount(record.photos),
    cities: parseCities(record.cities),
    favorite_foods: parseFavoriteFoods(record.favorite_foods),
    anniversary_items: parseAnniversaryItems(record.anniversary_items),
    note_items: parseNoteItems(record.note_items),
    food_items: parseFoodItems(record.food_items),
    todo_items: parseTodoItems(record.todo_items),
    photo_samples: parsePhotoSamples(record.photo_samples),
  };
}

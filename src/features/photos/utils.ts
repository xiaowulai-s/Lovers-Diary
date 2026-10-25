export function formatPhotoDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

export function photoThumbUrl(
  item: { thumb_path: string | null; storage_path: string },
  urls: Record<string, string>,
): string | null {
  return urls[item.thumb_path ?? item.storage_path] ?? null;
}

export function photoFullUrl(
  item: { storage_path: string },
  urls: Record<string, string>,
): string | null {
  return urls[item.storage_path] ?? null;
}

import { supabase } from './supabase';

const DEFAULT_TTL_SECONDS = 60 * 60 * 4;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function createSignedUrlMap(
  paths: readonly string[],
  expiresIn: number = DEFAULT_TTL_SECONDS,
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter((path) => path.length > 0)));
  const urls: Record<string, string> = {};

  for (const batch of chunk(unique, 50)) {
    let pending = batch;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3 && pending.length > 0; attempt += 1) {
      if (attempt > 0) {
        await sleep(350 * attempt);
      }

      const { data, error } = await supabase.storage
        .from('photos')
        .createSignedUrls(pending, expiresIn);

      if (error) {
        lastError = error;
        continue;
      }

      const failed: string[] = [];
      for (const entry of data) {
        if (entry.path && entry.signedUrl) {
          urls[entry.path] = entry.signedUrl;
        } else if (entry.path) {
          failed.push(entry.path);
        }
      }

      lastError = failed.length > 0 ? new Error('部分照片链接生成失败') : null;
      pending = failed;
    }

    if (pending.length > 0 && Object.keys(urls).length === 0) {
      throw lastError ?? new Error('无法生成照片链接');
    }
  }

  return urls;
}

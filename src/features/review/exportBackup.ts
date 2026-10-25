import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { createSignedUrlMap } from '../../lib/signedUrls';
import { supabase } from '../../lib/supabase';

const SIGNED_URL_TTL_SECONDS = 4 * 60 * 60;

export async function exportBackupJson(): Promise<string> {
  const [anniversaries, photoAlbums, photoEntries, loveNotes, foodRecords, todoItems, profiles] =
    await Promise.all([
      supabase.from('anniversaries').select('*').order('created_at', { ascending: true }),
      supabase.from('photo_albums').select('*').order('created_at', { ascending: true }),
      supabase.from('photo_entries').select('*').order('created_at', { ascending: true }),
      supabase.from('love_notes').select('*').order('created_at', { ascending: true }),
      supabase.from('food_records').select('*').order('created_at', { ascending: true }),
      supabase.from('todo_items').select('*').order('created_at', { ascending: true }),
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
    ]);

  const firstError = [
    anniversaries.error,
    photoAlbums.error,
    photoEntries.error,
    loveNotes.error,
    foodRecords.error,
    todoItems.error,
    profiles.error,
  ].find(Boolean);

  if (firstError) {
    throw firstError;
  }

  const photoPaths = (photoEntries.data ?? []).flatMap((photo) =>
    photo.thumb_path ? [photo.storage_path, photo.thumb_path] : [photo.storage_path],
  );
  const signedUrls = await createSignedUrlMap(photoPaths, SIGNED_URL_TTL_SECONDS);

  const payload = {
    app: '爱苏日记',
    schema_version: 1,
    exported_at: new Date().toISOString(),
    signed_url_expires_in_seconds: SIGNED_URL_TTL_SECONDS,
    storage_bucket: 'photos',
    signed_urls: signedUrls,
    tables: {
      anniversaries: anniversaries.data ?? [],
      photo_albums: photoAlbums.data ?? [],
      photo_entries: photoEntries.data ?? [],
      love_notes: loveNotes.data ?? [],
      food_records: foodRecords.data ?? [],
      todo_items: todoItems.data ?? [],
      profiles: profiles.data ?? [],
    },
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = new File(Paths.cache, `lovers-diary-backup-${timestamp}.json`);
  await file.write(JSON.stringify(payload, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('当前设备没有可用的分享方式，无法导出备份。');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: '导出爱苏日记备份',
  });

  return file.uri;
}

export function getBackupErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes('分享方式')) {
    return error.message;
  }

  if (!error || typeof error !== 'object') {
    return '备份没有生成成功，请重试。';
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : '';
  const normalized = message.toLowerCase();

  if (code === '42P01' || normalized.includes('does not exist')) {
    return '备份所需的表还没有准备好，请先执行全部迁移 SQL。';
  }
  if (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('timeout')
  ) {
    return '网络连接失败，请检查网络后重试。';
  }

  return '备份没有生成成功，请稍后重试。';
}

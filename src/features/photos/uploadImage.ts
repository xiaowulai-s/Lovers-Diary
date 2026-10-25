import { File } from 'expo-file-system';

import { supabase } from '../../lib/supabase';
import type { ProcessedPhoto } from './imagePipeline';

const MAX_UPLOAD_BYTES = 500 * 1024;

export type UploadedImage = {
  storagePath: string;
  thumbPath: string;
  width: number;
  height: number;
  sizeBytes: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function uploadBytes(path: string, bytes: Uint8Array, attempt = 0): Promise<void> {
  const { error } = await supabase.storage.from('photos').upload(path, bytes, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  });

  if (!error) {
    return;
  }

  if (attempt < 2) {
    await sleep(400 * (attempt + 1));
    await uploadBytes(path, bytes, attempt + 1);
    return;
  }

  throw error;
}

export async function removeStorageObjects(paths: readonly string[]): Promise<void> {
  const cleanPaths = paths.filter((path) => path.length > 0);

  if (cleanPaths.length === 0) {
    return;
  }

  try {
    const { error } = await supabase.storage.from('photos').remove(cleanPaths);
    if (error && __DEV__) {
      console.warn('[storage] cleanup failed', error);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[storage] cleanup failed', error);
    }
  }
}

export async function uploadProcessedImage(
  processed: ProcessedPhoto,
  userId: string,
  folder = '',
): Promise<UploadedImage> {
  const fullBytes = await new File(processed.uri).bytes();
  const thumbBytes = await new File(processed.thumbUri).bytes();

  if (fullBytes.byteLength === 0 || fullBytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('这张照片没有通过 500KB 压缩校验，请重试。');
  }

  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const prefix = folder ? `${userId}/${folder}` : userId;
  const storagePath = `${prefix}/${token}.jpg`;
  const thumbPath = `${prefix}/${token}-thumb.jpg`;

  await uploadBytes(storagePath, fullBytes);

  try {
    await uploadBytes(thumbPath, thumbBytes);
  } catch (thumbError) {
    await removeStorageObjects([storagePath]);
    throw thumbError;
  }

  return {
    storagePath,
    thumbPath,
    width: processed.width,
    height: processed.height,
    sizeBytes: fullBytes.byteLength,
  };
}

export async function uploadAvatarImage(localUri: string, userId: string): Promise<string> {
  const bytes = await new File(localUri).bytes();

  if (bytes.byteLength === 0 || bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('头像没有通过 500KB 压缩校验，请重试。');
  }

  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const storagePath = `${userId}/profile/avatar-${token}.jpg`;

  await uploadBytes(storagePath, bytes);

  return storagePath;
}

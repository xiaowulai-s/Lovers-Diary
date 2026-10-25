import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ImagePickerAsset } from 'expo-image-picker';

import type { Database } from '../../lib/database.types';
import { createSignedUrlMap } from '../../lib/signedUrls';
import { supabase } from '../../lib/supabase';
import { processPhotoAsset, type ProcessedPhoto } from './imagePipeline';
import type { PhotoAlbum, PhotoEntry, PhotoFeedPage, UploadProgress } from './types';
import { removeStorageObjects, uploadProcessedImage } from './uploadImage';

const FEED_PAGE_SIZE = 12;

export const photoKeys = {
  all: ['photos'] as const,
  albums: ['photos', 'albums'] as const,
  feedRoot: ['photos', 'feed'] as const,
  feed: (albumId: string | null, favoritesOnly = false) =>
    ['photos', 'feed', albumId ?? 'all', favoritesOnly ? 'favorites' : 'all'] as const,
};

async function fetchPhotoPage(
  albumId: string | null,
  page: number,
  favoritesOnly: boolean,
): Promise<PhotoFeedPage> {
  const from = page * FEED_PAGE_SIZE;
  let query = supabase.from('photo_entries').select('*');

  if (albumId) {
    query = query.eq('album_id', albumId);
  }

  if (favoritesOnly) {
    query = query.eq('is_favorite', true);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + FEED_PAGE_SIZE - 1);

  if (error) {
    throw error;
  }

  const paths = data.flatMap((entry) =>
    entry.thumb_path ? [entry.thumb_path, entry.storage_path] : [entry.storage_path],
  );
  const urls = await createSignedUrlMap(paths);

  return { items: data, urls };
}

export function usePhotoFeed(albumId: string | null, favoritesOnly = false) {
  return useInfiniteQuery({
    queryKey: photoKeys.feed(albumId, favoritesOnly),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchPhotoPage(albumId, pageParam, favoritesOnly),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.items.length === FEED_PAGE_SIZE ? allPages.length : undefined,
    staleTime: 3 * 60 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function usePhotoAlbums() {
  return useQuery({
    queryKey: photoKeys.albums,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photo_albums')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data;
    },
  });
}

type SaveAlbumVariables = {
  id?: string;
  name: string;
};

async function saveAlbum({ id, name }: SaveAlbumVariables): Promise<PhotoAlbum> {
  const payload = { name: name.trim() };

  if (id) {
    const { data, error } = await supabase
      .from('photo_albums')
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
    .from('photo_albums')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export function useSaveAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveAlbum,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('photo_albums').delete().eq('id', id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photo: PhotoEntry) => {
      const { error } = await supabase.from('photo_entries').delete().eq('id', photo.id);
      if (error) {
        throw error;
      }

      const paths = [photo.storage_path, photo.thumb_path].filter(
        (path): path is string => Boolean(path),
      );

      await removeStorageObjects(paths);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: photoKeys.feedRoot });
    },
  });
}

type UpdatePhotoMetaVariables = {
  id: string;
  caption?: string | null;
  isFavorite?: boolean;
};

export function useUpdatePhotoMeta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, caption, isFavorite }: UpdatePhotoMetaVariables) => {
      const payload: Database['public']['Tables']['photo_entries']['Update'] = {};

      if (caption !== undefined) {
        payload.caption = caption;
      }
      if (isFavorite !== undefined) {
        payload.is_favorite = isFavorite;
      }

      const { error } = await supabase.from('photo_entries').update(payload).eq('id', id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
  });
}

async function uploadProcessedPhoto(
  processed: ProcessedPhoto,
  albumId: string | null,
  userId: string,
): Promise<void> {
  const uploaded = await uploadProcessedImage(processed, userId);

  const { error } = await supabase.from('photo_entries').insert({
    album_id: albumId,
    storage_path: uploaded.storagePath,
    thumb_path: uploaded.thumbPath,
    taken_at: new Date().toISOString(),
    width: uploaded.width,
    height: uploaded.height,
    size_bytes: uploaded.sizeBytes,
  });

  if (error) {
    await removeStorageObjects([uploaded.storagePath, uploaded.thumbPath]);
    throw error;
  }
}

type UploadVariables = {
  assets: ImagePickerAsset[];
  albumId: string | null;
  userId: string;
  onProgress?: (progress: UploadProgress) => void;
};

export function useUploadPhotos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assets, albumId, userId, onProgress }: UploadVariables) => {
      for (let index = 0; index < assets.length; index += 1) {
        const asset = assets[index];
        if (!asset) {
          continue;
        }

        onProgress?.({
          total: assets.length,
          completed: index,
          label: `正在压缩第 ${index + 1} 张`,
        });

        try {
          const processed = await processPhotoAsset(asset);

          onProgress?.({
            total: assets.length,
            completed: index,
            label: `正在私密上传第 ${index + 1} 张`,
          });

          await uploadProcessedPhoto(processed, albumId, userId);

          onProgress?.({
            total: assets.length,
            completed: index + 1,
            label: `已经收好 ${index + 1} / ${assets.length} 张`,
          });
        } catch (error) {
          const message = getPhotoErrorMessage(error, 'upload');
          throw new Error(
            index === 0 ? message : `已成功上传 ${index} 张，第 ${index + 1} 张失败：${message}`,
          );
        }
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
  });
}

export function getPhotoErrorMessage(
  error: unknown,
  action: 'upload' | 'delete' | 'album' | 'meta' = 'upload',
): string {
  const fallback =
    action === 'upload'
      ? '照片上传失败，请检查网络后重试。'
      : action === 'delete'
        ? '删除失败，请稍后重试。'
        : action === 'meta'
          ? '照片信息没有保存成功，请重试。'
          : '相册操作失败，请稍后重试。';

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : '';
  const normalized = message.toLowerCase();

  if (code === '23505' || normalized.includes('photo_albums_name_unique_idx')) {
    return '已经有同名相册了，换一个名字试试。';
  }
  if (code === '42501' || normalized.includes('row-level security')) {
    return '没有权限操作这些照片，请重新登录后再试。';
  }
  if (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('timeout')
  ) {
    return '网络连接失败，请检查网络后重试。';
  }
  if (message) {
    return message;
  }

  return fallback;
}

export type { PhotoAlbum, PhotoEntry, UploadProgress };

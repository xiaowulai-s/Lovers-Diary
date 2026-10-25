import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ImagePickerAsset } from 'expo-image-picker';

import { createSignedUrlMap } from '../../lib/signedUrls';
import { supabase } from '../../lib/supabase';
import { processPhotoAsset } from '../photos/imagePipeline';
import { removeStorageObjects, uploadProcessedImage } from '../photos/uploadImage';
import type { FoodDraft, FoodMonthData, FoodRecord } from './types';
import { foodMonthKey, foodMonthRange } from './utils';

export const foodKeys = {
  all: ['food'] as const,
  month: (key: string) => ['food', 'month', key] as const,
};

export function useFoodMonth(month: Date) {
  const range = foodMonthRange(month);
  const key = foodMonthKey(month);

  return useQuery({
    queryKey: foodKeys.month(key),
    staleTime: 3 * 60 * 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<FoodMonthData> => {
      const { data, error } = await supabase
        .from('food_records')
        .select('*')
        .gte('eaten_on', range.start)
        .lte('eaten_on', range.end)
        .order('eaten_on', { ascending: true })
        .order('eaten_at', { ascending: true });

      if (error) {
        throw error;
      }

      const paths = data.flatMap((record) => {
        const previewPath = record.thumb_path ?? record.photo_path;
        return previewPath ? [previewPath] : [];
      });
      const urls = await createSignedUrlMap(paths);

      return { items: data, urls };
    },
  });
}

type SaveFoodRecordVariables = {
  id?: string;
  draft: FoodDraft;
  userId: string;
  photoAsset: ImagePickerAsset | null;
  existingPhotoPath: string | null;
  existingThumbPath: string | null;
};

async function saveFoodRecord({
  id,
  draft,
  userId,
  photoAsset,
  existingPhotoPath,
  existingThumbPath,
}: SaveFoodRecordVariables): Promise<FoodRecord> {
  let uploaded: Awaited<ReturnType<typeof uploadProcessedImage>> | null = null;

  if (photoAsset) {
    const processed = await processPhotoAsset(photoAsset);
    uploaded = await uploadProcessedImage(processed, userId, 'food');
  }

  const payload = {
    name: draft.name.trim(),
    eaten_on: draft.eatenOn,
    eaten_at: draft.eatenAt,
    city: draft.city.trim() || null,
    shop: draft.shop.trim() || null,
    note: draft.note.trim() || null,
    is_favorite: draft.isFavorite,
    photo_path: uploaded?.storagePath ?? existingPhotoPath,
    thumb_path: uploaded?.thumbPath ?? existingThumbPath,
  };

  try {
    if (id) {
      const { data, error } = await supabase
        .from('food_records')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (uploaded) {
        await removeStorageObjects(
          [existingPhotoPath, existingThumbPath].filter(
            (path): path is string => Boolean(path),
          ),
        );
      }

      return data;
    }

    const { data, error } = await supabase
      .from('food_records')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    if (uploaded) {
      await removeStorageObjects([uploaded.storagePath, uploaded.thumbPath]);
    }
    throw error;
  }
}

export function useSaveFoodRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveFoodRecord,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: foodKeys.all });
    },
  });
}

export function useDeleteFoodRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: FoodRecord) => {
      const { error } = await supabase.from('food_records').delete().eq('id', record.id);
      if (error) {
        throw error;
      }

      await removeStorageObjects(
        [record.photo_path, record.thumb_path].filter(
          (path): path is string => Boolean(path),
        ),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: foodKeys.all });
    },
  });
}

export function getFoodErrorMessage(
  error: unknown,
  action: 'save' | 'delete' = 'save',
): string {
  const fallback = action === 'save' ? '这一餐没有保存成功，请重试。' : '删除失败，请稍后重试。';

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : '';
  const normalized = message.toLowerCase();

  if (code === '42501' || normalized.includes('row-level security')) {
    return '没有权限保存这条记录，请重新登录后再试。';
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

export type { FoodDraft, FoodRecord };

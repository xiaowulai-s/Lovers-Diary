import { useQuery } from '@tanstack/react-query';

import { createSignedUrlMap } from '../../lib/signedUrls';
import { supabase } from '../../lib/supabase';
import type { YearReviewData } from './types';
import { parseYearReview } from './types';

export const reviewKeys = {
  year: (year: number) => ['year-review', year] as const,
};

export function useYearReview(year: number) {
  return useQuery({
    queryKey: reviewKeys.year(year),
    staleTime: 60_000,
    queryFn: async (): Promise<YearReviewData> => {
      const { data, error } = await supabase.rpc('get_year_review', {
        target_year: year,
      });

      if (error) {
        throw error;
      }

      const review = parseYearReview(data, year);
      const paths = [
        ...review.photo_samples.flatMap((sample) =>
          sample.thumb_path
            ? [sample.thumb_path, sample.storage_path]
            : [sample.storage_path],
        ),
        ...review.food_items.flatMap((item) =>
          item.photo_path
            ? [item.photo_path, ...(item.thumb_path ? [item.thumb_path] : [])]
            : item.thumb_path
              ? [item.thumb_path]
              : [],
        ),
      ];

      let photoUrls: Record<string, string> = {};

      if (paths.length > 0) {
        try {
          photoUrls = await createSignedUrlMap(paths);
        } catch (urlError) {
          if (__DEV__) {
            console.warn('[review] photo signed urls failed', urlError);
          }
        }
      }

      return { ...review, photoUrls };
    },
  });
}

export function getYearReviewErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return '年度回顾没有加载成功，请重试。';
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : '';
  const normalized = message.toLowerCase();

  if (code === 'PGRST202' || normalized.includes('get_year_review')) {
    return '年度回顾还没有启用，请先在 Supabase 执行 Phase 8B SQL。';
  }
  if (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('timeout')
  ) {
    return '网络连接失败，请检查网络后重试。';
  }

  return '年度回顾没有加载成功，请稍后重试。';
}

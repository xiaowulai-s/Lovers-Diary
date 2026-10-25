import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Database } from '../../lib/database.types';
import { createSignedUrlMap } from '../../lib/signedUrls';
import { supabase } from '../../lib/supabase';
import { removeStorageObjects } from '../photos/uploadImage';
import type { Profile } from './types';

export const profileKeys = {
  all: ['profiles'] as const,
};

export type ProfilesData = {
  profiles: Profile[];
  avatarUrls: Record<string, string>;
};

export function useProfiles() {
  return useQuery({
    queryKey: profileKeys.all,
    staleTime: 60_000,
    queryFn: async (): Promise<ProfilesData> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      const profiles = data ?? [];
      const avatarPaths = profiles
        .map((profile) => profile.avatar_path)
        .filter((path): path is string => Boolean(path));

      let avatarUrls: Record<string, string> = {};

      if (avatarPaths.length > 0) {
        try {
          avatarUrls = await createSignedUrlMap(avatarPaths);
        } catch (urlError) {
          if (__DEV__) {
            console.warn('[profiles] avatar signed urls failed', urlError);
          }
        }
      }

      return { profiles, avatarUrls };
    },
  });
}

type SaveProfileVariables = {
  userId: string;
  displayName: string;
  avatarPath?: string;
  previousAvatarPath?: string | null;
};

export function useSaveProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      displayName,
      avatarPath,
      previousAvatarPath,
    }: SaveProfileVariables) => {
      const payload: Database['public']['Tables']['profiles']['Insert'] = {
        user_id: userId,
        display_name: displayName,
      };

      if (avatarPath !== undefined) {
        payload.avatar_path = avatarPath;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) {
        throw error;
      }

      if (
        avatarPath !== undefined &&
        previousAvatarPath &&
        previousAvatarPath !== avatarPath
      ) {
        await removeStorageObjects([previousAvatarPath]);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

export function getProfileErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes('头像')) {
    return error.message;
  }

  if (!error || typeof error !== 'object') {
    return '资料没有保存成功，请重试。';
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : '';
  const normalized = message.toLowerCase();

  if (code === '42P01' || normalized.includes('does not exist')) {
    return '资料表还没有创建，请先在 Supabase 执行 Phase 7 迁移 SQL。';
  }
  if (code === '42501' || normalized.includes('row-level security')) {
    return '没有权限修改这份资料，请重新登录后再试。';
  }
  if (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('timeout')
  ) {
    return '网络连接失败，请检查网络后重试。';
  }
  if (normalized.includes('check constraint')) {
    return '昵称或头像路径不符合要求，请调整后重试。';
  }

  return '资料没有保存成功，请重试。';
}

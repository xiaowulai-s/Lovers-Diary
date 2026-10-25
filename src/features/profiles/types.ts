import type { Database } from '../../lib/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export const PROFILE_NAME_MAX_LENGTH = 24;

export function profileDisplayName(
  profile: Profile | null | undefined,
  fallback: '我' | 'TA',
): string {
  const name = profile?.display_name.trim();
  return name ? name : fallback;
}

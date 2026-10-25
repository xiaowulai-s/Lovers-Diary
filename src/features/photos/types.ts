import type { Database } from '../../lib/database.types';

export type PhotoEntry = Database['public']['Tables']['photo_entries']['Row'];
export type PhotoAlbum = Database['public']['Tables']['photo_albums']['Row'];

export type PhotoFeedPage = {
  items: PhotoEntry[];
  urls: Record<string, string>;
};

export type PhotoViewMode = 'grid' | 'timeline';

export type UploadProgress = {
  total: number;
  completed: number;
  label: string;
};

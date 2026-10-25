export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AnniversaryRow = {
  id: string;
  title: string;
  happened_on: string;
  kind: 'together' | 'birthday' | 'anniversary' | 'trip' | 'custom';
  recurring: boolean;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AnniversaryFeedRow = AnniversaryRow & {
  next_on: string | null;
};

export type ProfileRow = {
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      anniversaries: {
        Row: AnniversaryRow;
        Insert: {
          id?: string;
          title: string;
          happened_on: string;
          kind?: 'together' | 'birthday' | 'anniversary' | 'trip' | 'custom';
          recurring?: boolean;
          note?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          happened_on?: string;
          kind?: 'together' | 'birthday' | 'anniversary' | 'trip' | 'custom';
          recurring?: boolean;
          note?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      food_records: {
        Row: {
          id: string;
          name: string;
          eaten_on: string;
          eaten_at: string;
          city: string | null;
          shop: string | null;
          note: string | null;
          is_favorite: boolean;
          photo_path: string | null;
          thumb_path: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          eaten_on: string;
          eaten_at?: string;
          city?: string | null;
          shop?: string | null;
          note?: string | null;
          is_favorite?: boolean;
          photo_path?: string | null;
          thumb_path?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          eaten_on?: string;
          eaten_at?: string;
          city?: string | null;
          shop?: string | null;
          note?: string | null;
          is_favorite?: boolean;
          photo_path?: string | null;
          thumb_path?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      love_notes: {
        Row: {
          id: string;
          body: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          body: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          body?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      photo_albums: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      photo_entries: {
        Row: {
          id: string;
          album_id: string | null;
          storage_path: string;
          thumb_path: string | null;
          caption: string | null;
          is_favorite: boolean;
          taken_at: string;
          width: number;
          height: number;
          size_bytes: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          album_id?: string | null;
          storage_path: string;
          thumb_path?: string | null;
          caption?: string | null;
          is_favorite?: boolean;
          taken_at?: string;
          width: number;
          height: number;
          size_bytes: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          album_id?: string | null;
          storage_path?: string;
          thumb_path?: string | null;
          caption?: string | null;
          is_favorite?: boolean;
          taken_at?: string;
          width?: number;
          height?: number;
          size_bytes?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'photo_entries_album_id_fkey';
            columns: ['album_id'];
            isOneToOne: false;
            referencedRelation: 'photo_albums';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: ProfileRow;
        Insert: {
          user_id: string;
          display_name?: string;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      todo_items: {
        Row: {
          id: string;
          title: string;
          note: string | null;
          due_on: string | null;
          is_done: boolean;
          completed_at: string | null;
          sort_order: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          note?: string | null;
          due_on?: string | null;
          is_done?: boolean;
          completed_at?: string | null;
          sort_order?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          note?: string | null;
          due_on?: string | null;
          is_done?: boolean;
          completed_at?: string | null;
          sort_order?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      anniversary_feed: {
        Row: AnniversaryFeedRow;
        Relationships: [];
      };
    };
    Functions: {
      is_authorized: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      search_content: {
        Args: {
          search_query: string;
        };
        Returns: {
          kind: string;
          item_id: string;
          title: string;
          subtitle: string;
          happened_at: string;
        }[];
      };
      get_year_review: {
        Args: {
          target_year: number;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type AnniversaryKind = AnniversaryRow['kind'];

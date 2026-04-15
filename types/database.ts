// Generated from Supabase schema.
// Re-run after migrations: pnpm supabase gen types typescript --project-id cgttggkwzdixhsmmqwjv > types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      api_usage: {
        Row: {
          period: string;
          read_count: number;
          updated_at: string;
        };
        Insert: {
          period: string;
          read_count?: number;
          updated_at?: string;
        };
        Update: {
          period?: string;
          read_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          auth_id: string | null;
          email: string;
          username: string;
          name: string;
          avatar_url: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_id?: string | null;
          email: string;
          username: string;
          name?: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string | null;
          email?: string;
          username?: string;
          name?: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      twitter_accounts: {
        Row: {
          id: string;
          handle: string;
          display_name: string;
          bio: string | null;
          avatar_url: string | null;
          twitter_id: string | null;
          last_fetched_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          handle: string;
          display_name: string;
          bio?: string | null;
          avatar_url?: string | null;
          twitter_id?: string | null;
          last_fetched_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          handle?: string;
          display_name?: string;
          bio?: string | null;
          avatar_url?: string | null;
          twitter_id?: string | null;
          last_fetched_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      playlists: {
        Row: {
          id: string;
          curator_id: string;
          name: string;
          description: string | null;
          slug: string;
          cover_emoji: string;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          curator_id: string;
          name: string;
          description?: string | null;
          slug: string;
          cover_emoji?: string;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          curator_id?: string;
          name?: string;
          description?: string | null;
          slug?: string;
          cover_emoji?: string;
          is_public?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      playlist_accounts: {
        Row: {
          playlist_id: string;
          twitter_account_id: string;
          added_at: string;
        };
        Insert: {
          playlist_id: string;
          twitter_account_id: string;
          added_at?: string;
        };
        Update: {
          playlist_id?: string;
          twitter_account_id?: string;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playlist_accounts_playlist_id_fkey";
            columns: ["playlist_id"];
            isOneToOne: false;
            referencedRelation: "playlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "playlist_accounts_twitter_account_id_fkey";
            columns: ["twitter_account_id"];
            isOneToOne: false;
            referencedRelation: "twitter_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      playlist_subscriptions: {
        Row: {
          user_id: string;
          playlist_id: string;
          subscribed_at: string;
          is_active: boolean;
        };
        Insert: {
          user_id: string;
          playlist_id: string;
          subscribed_at?: string;
          is_active?: boolean;
        };
        Update: {
          user_id?: string;
          playlist_id?: string;
          subscribed_at?: string;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "playlist_subscriptions_playlist_id_fkey";
            columns: ["playlist_id"];
            isOneToOne: false;
            referencedRelation: "playlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "playlist_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tweets: {
        Row: {
          id: string;
          twitter_account_id: string;
          twitter_id: string;
          text: string;
          media_urls: string[];
          published_at: string;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          twitter_account_id: string;
          twitter_id: string;
          text: string;
          media_urls?: string[];
          published_at: string;
          fetched_at?: string;
        };
        Update: {
          id?: string;
          twitter_account_id?: string;
          twitter_id?: string;
          text?: string;
          media_urls?: string[];
          published_at?: string;
          fetched_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tweets_twitter_account_id_fkey";
            columns: ["twitter_account_id"];
            isOneToOne: false;
            referencedRelation: "twitter_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      get_user_feed: {
        Args: {
          p_user_id: string;
          p_limit?: number;
          p_cursor_date?: string | null;
          p_cursor_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["tweets"]["Row"][];
      };
      cleanup_stale_subscriptions: {
        Args: {
          p_retention_days?: number;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
}

// Convenience row types
export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type TwitterAccountRow =
  Database["public"]["Tables"]["twitter_accounts"]["Row"];
export type PlaylistRow = Database["public"]["Tables"]["playlists"]["Row"];
export type PlaylistAccountRow =
  Database["public"]["Tables"]["playlist_accounts"]["Row"];
export type PlaylistSubscriptionRow =
  Database["public"]["Tables"]["playlist_subscriptions"]["Row"];
export type TweetRow = Database["public"]["Tables"]["tweets"]["Row"];

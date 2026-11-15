// Generated from the Supabase project (MCP generate_typescript_types), trimmed to the
// Database type. Do not edit by hand:
// regenerate after a migration.
/* eslint-disable @typescript-eslint/no-generated-empty-object-type -- generated shape */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      product_embeddings: {
        Row: {
          content: string;
          content_hash: string;
          embedding: string;
          product_id: number;
          updated_at: string;
        };
        Insert: {
          content: string;
          content_hash: string;
          embedding: string;
          product_id: number;
          updated_at?: string;
        };
        Update: {
          content?: string;
          content_hash?: string;
          embedding?: string;
          product_id?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      match_products: {
        Args: { match_count?: number; query_embedding: string };
        Returns: {
          product_id: number;
          similarity: number;
        }[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

// lib/types/database.ts
// Types matching the SQL schema. In a real build you'd generate these with:
//   npx supabase gen types typescript --project-id YOUR_ID > lib/types/database.ts
// This is a hand-written starter so the app compiles before that step.

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          price_cents: number;
          category_id: string;
          type: 'pdf' | 'spreadsheet';
          preview_url: string | null;
          file_path: string;
          metadata: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      bundle_rules: {
        Row: {
          id: string;
          name: string;
          rule_type: 'tiered_flat' | 'percentage_off';
          config: Record<string, unknown>;
          is_active: boolean;
          priority: number;
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bundle_rules']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['bundle_rules']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          status: 'pending' | 'paid' | 'failed' | 'refunded';
          subtotal_cents: number;
          discount_cents: number;
          total_cents: number;
          bundle_rule_id: string | null;
          stripe_session_id: string | null;
          stripe_payment_intent: string | null;
          customer_email: string;
          created_at: string;
          paid_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          unit_price_cents: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
      };
      download_tokens: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          user_id: string;
          issued_at: string;
          expires_at: string;
          download_count: number;
        };
        Insert: Omit<Database['public']['Tables']['download_tokens']['Row'], 'id' | 'issued_at'>;
        Update: Partial<Database['public']['Tables']['download_tokens']['Insert']>;
      };
    };
  };
};

// Convenience exports
export type Product = Database['public']['Tables']['products']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type BundleRule = Database['public']['Tables']['bundle_rules']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];

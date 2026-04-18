export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      fuel_benefits: {
        Row: {
          brand: string
          conditions: string | null
          created_at: string
          day_of_week: number[]
          discount_description: string
          discount_fixed: number | null
          discount_percent: number | null
          fuel_types: string[]
          id: string
          is_active: boolean
          logo_url: string | null
          payment_method: string
          updated_at: string
        }
        Insert: {
          brand: string
          conditions?: string | null
          created_at?: string
          day_of_week?: number[]
          discount_description: string
          discount_fixed?: number | null
          discount_percent?: number | null
          fuel_types?: string[]
          id?: string
          is_active?: boolean
          logo_url?: string | null
          payment_method: string
          updated_at?: string
        }
        Update: {
          brand?: string
          conditions?: string | null
          created_at?: string
          day_of_week?: number[]
          discount_description?: string
          discount_fixed?: number | null
          discount_percent?: number | null
          fuel_types?: string[]
          id?: string
          is_active?: boolean
          logo_url?: string | null
          payment_method?: string
          updated_at?: string
        }
        Relationships: []
      }
      fuel_price_history: {
        Row: {
          avg_price: number
          created_at: string
          fuel_type: string
          id: string
          max_price: number
          min_price: number
          snapshot_date: string
          station_count: number
        }
        Insert: {
          avg_price: number
          created_at?: string
          fuel_type: string
          id?: string
          max_price: number
          min_price: number
          snapshot_date?: string
          station_count?: number
        }
        Update: {
          avg_price?: number
          created_at?: string
          fuel_type?: string
          id?: string
          max_price?: number
          min_price?: number
          snapshot_date?: string
          station_count?: number
        }
        Relationships: []
      }
      fuel_prices: {
        Row: {
          change_percent: number
          fuel_type: string
          id: string
          name: string | null
          previous_price: number | null
          price: number
          trend: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          change_percent?: number
          fuel_type: string
          id?: string
          name?: string | null
          previous_price?: number | null
          price: number
          trend?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          change_percent?: number
          fuel_type?: string
          id?: string
          name?: string | null
          previous_price?: number | null
          price?: number
          trend?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      gas_stations: {
        Row: {
          address: string
          brand: string
          created_at: string
          ev_connector_types: string[] | null
          ev_operator: string | null
          ev_power_kw: number | null
          has_ev_charging: boolean
          id: string
          is_open: boolean
          lat: number
          lng: number
          name: string
          place_id: string | null
          updated_at: string
        }
        Insert: {
          address: string
          brand: string
          created_at?: string
          ev_connector_types?: string[] | null
          ev_operator?: string | null
          ev_power_kw?: number | null
          has_ev_charging?: boolean
          id?: string
          is_open?: boolean
          lat: number
          lng: number
          name: string
          place_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          brand?: string
          created_at?: string
          ev_connector_types?: string[] | null
          ev_operator?: string | null
          ev_power_kw?: number | null
          has_ev_charging?: boolean
          id?: string
          is_open?: boolean
          lat?: number
          lng?: number
          name?: string
          place_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          fuel_types: string[]
          id: string
          lat: number | null
          lng: number | null
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          fuel_types?: string[]
          id?: string
          lat?: number | null
          lng?: number | null
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          fuel_types?: string[]
          id?: string
          lat?: number | null
          lng?: number | null
          p256dh?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reported_prices: {
        Row: {
          created_at: string
          fuel_type: string
          id: string
          price: number
          station_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fuel_type: string
          id?: string
          price: number
          station_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          fuel_type?: string
          id?: string
          price?: number
          station_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reported_prices_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "gas_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_prices: {
        Row: {
          created_at: string
          fuel_type: string
          id: string
          price: number
          reported_by: string | null
          station_id: string
        }
        Insert: {
          created_at?: string
          fuel_type: string
          id?: string
          price: number
          reported_by?: string | null
          station_id: string
        }
        Update: {
          created_at?: string
          fuel_type?: string
          id?: string
          price?: number
          reported_by?: string | null
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_prices_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "gas_stations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_reported_prices: { Args: never; Returns: undefined }
      get_fuel_price_averages: {
        Args: never
        Returns: {
          avg_price: number
          fuel_type: string
          station_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

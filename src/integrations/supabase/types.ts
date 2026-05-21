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
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          station_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          station_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          station_id?: string
          user_id?: string
        }
        Relationships: []
      }
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
      fuel_logs: {
        Row: {
          created_at: string
          fuel_type: string
          id: string
          liters: number
          logged_at: string
          note: string | null
          odometer_km: number | null
          price_per_liter: number
          station_id: string | null
          total_cost: number
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          fuel_type: string
          id?: string
          liters: number
          logged_at?: string
          note?: string | null
          odometer_km?: number | null
          price_per_liter: number
          station_id?: string | null
          total_cost: number
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          fuel_type?: string
          id?: string
          liters?: number
          logged_at?: string
          note?: string | null
          odometer_km?: number | null
          price_per_liter?: number
          station_id?: string | null
          total_cost?: number
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
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
      price_alerts: {
        Row: {
          active: boolean
          created_at: string
          fuel_type: string
          id: string
          last_known_price: number | null
          notified_read: boolean
          station_id: string
          target_price: number
          triggered: boolean
          triggered_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          fuel_type: string
          id?: string
          last_known_price?: number | null
          notified_read?: boolean
          station_id: string
          target_price: number
          triggered?: boolean
          triggered_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          fuel_type?: string
          id?: string
          last_known_price?: number | null
          notified_read?: boolean
          station_id?: string
          target_price?: number
          triggered?: boolean
          triggered_at?: string | null
          updated_at?: string
          user_id?: string
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
          note: string | null
          photo_path: string | null
          price: number
          station_id: string
          status: string
          user_id: string
          verification_notes: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          fuel_type: string
          id?: string
          note?: string | null
          photo_path?: string | null
          price: number
          station_id: string
          status?: string
          user_id: string
          verification_notes?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          fuel_type?: string
          id?: string
          note?: string | null
          photo_path?: string | null
          price?: number
          station_id?: string
          status?: string
          user_id?: string
          verification_notes?: string | null
          verified_at?: string | null
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
      review_reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          review_id?: string
          user_id?: string
        }
        Relationships: []
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
      station_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          station_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          station_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          station_id?: string
          user_id?: string
        }
        Relationships: []
      }
      station_views: {
        Row: {
          id: string
          station_id: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          station_id: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          station_id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      tag_rates: {
        Row: {
          autopista_name: string
          id: string
          lat: number
          lng: number
          portico_id: string
          portico_name: string | null
          tarifa_baja: number
          tarifa_punta: number
          tarifa_saturacion: number
          updated_at: string
          vehicle_class: string
        }
        Insert: {
          autopista_name: string
          id?: string
          lat: number
          lng: number
          portico_id: string
          portico_name?: string | null
          tarifa_baja: number
          tarifa_punta: number
          tarifa_saturacion: number
          updated_at?: string
          vehicle_class?: string
        }
        Update: {
          autopista_name?: string
          id?: string
          lat?: number
          lng?: number
          portico_id?: string
          portico_name?: string | null
          tarifa_baja?: number
          tarifa_punta?: number
          tarifa_saturacion?: number
          updated_at?: string
          vehicle_class?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_key: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          fuel_log_email_optin: boolean
          id: string
          leaderboard_opt_in: boolean
          low_fuel_threshold_km: number
          notifications_enabled: boolean
          onboarding_completed: boolean
          preferred_fuel: string
          search_radius_km: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fuel_log_email_optin?: boolean
          id?: string
          leaderboard_opt_in?: boolean
          low_fuel_threshold_km?: number
          notifications_enabled?: boolean
          onboarding_completed?: boolean
          preferred_fuel?: string
          search_radius_km?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fuel_log_email_optin?: boolean
          id?: string
          leaderboard_opt_in?: boolean
          low_fuel_threshold_km?: number
          notifications_enabled?: boolean
          onboarding_completed?: boolean
          preferred_fuel?: string
          search_radius_km?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_suspensions: {
        Row: {
          created_at: string
          reason: string | null
          suspended_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          reason?: string | null
          suspended_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          reason?: string | null
          suspended_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_vehicles: {
        Row: {
          brand: string
          color: string
          consumption_kml: number
          created_at: string
          fuel_type: string
          id: string
          is_primary: boolean
          model: string
          nickname: string | null
          tank_size_l: number
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          brand: string
          color?: string
          consumption_kml?: number
          created_at?: string
          fuel_type?: string
          id?: string
          is_primary?: boolean
          model: string
          nickname?: string | null
          tank_size_l?: number
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          brand?: string
          color?: string
          consumption_kml?: number
          created_at?: string
          fuel_type?: string
          id?: string
          is_primary?: boolean
          model?: string
          nickname?: string | null
          tank_size_l?: number
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_reject_report: { Args: { _report_id: string }; Returns: undefined }
      admin_search_users: {
        Args: { _query: string }
        Returns: {
          alerts: number
          created_at: string
          email: string
          favorites: number
          is_admin: boolean
          is_suspended: boolean
          last_sign_in_at: string
          reports: number
          user_id: string
        }[]
      }
      admin_set_user_role: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _target: string
        }
        Returns: undefined
      }
      admin_verify_report: { Args: { _report_id: string }; Returns: undefined }
      aggregate_reported_prices: { Args: never; Returns: undefined }
      get_admin_overview: { Args: never; Returns: Json }
      get_daily_active_users: {
        Args: { _days?: number }
        Returns: {
          day: string
          users: number
        }[]
      }
      get_fuel_price_averages: {
        Args: never
        Returns: {
          avg_price: number
          fuel_type: string
          station_count: number
        }[]
      }
      get_market_avg_price: { Args: { _fuel_type: string }; Returns: number }
      get_monthly_fuel_spend: {
        Args: { _months?: number; _user_id: string }
        Returns: {
          avg_price: number
          liters: number
          month: string
          total_clp: number
        }[]
      }
      get_monthly_leaderboard: {
        Args: never
        Returns: {
          points: number
          reports: number
          user_id: string
        }[]
      }
      get_search_heatmap: {
        Args: never
        Returns: {
          lat: number
          lng: number
          weight: number
        }[]
      }
      get_top_viewed_stations: {
        Args: { _limit?: number }
        Returns: {
          brand: string
          name: string
          station_id: string
          views: number
        }[]
      }
      get_user_consumption_stats: {
        Args: { _user_id: string; _vehicle_id?: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

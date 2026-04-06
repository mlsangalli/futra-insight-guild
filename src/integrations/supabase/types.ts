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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          active: boolean
          answer: string
          created_at: string
          id: string
          order_index: number
          question: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          answer: string
          created_at?: string
          id?: string
          order_index?: number
          question: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          answer?: string
          created_at?: string
          id?: string
          order_index?: number
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          category: Database["public"]["Enums"]["market_category"]
          created_at: string
          created_by: string | null
          description: string
          end_date: string
          featured: boolean
          id: string
          lock_date: string | null
          options: Json
          question: string
          resolution_rules: string | null
          resolution_source: string | null
          resolved_option: string | null
          status: Database["public"]["Enums"]["market_status"]
          total_credits: number
          total_participants: number
          trending: boolean
          type: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["market_category"]
          created_at?: string
          created_by?: string | null
          description?: string
          end_date: string
          featured?: boolean
          id?: string
          lock_date?: string | null
          options?: Json
          question: string
          resolution_rules?: string | null
          resolution_source?: string | null
          resolved_option?: string | null
          status?: Database["public"]["Enums"]["market_status"]
          total_credits?: number
          total_participants?: number
          trending?: boolean
          type?: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["market_category"]
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string
          featured?: boolean
          id?: string
          lock_date?: string | null
          options?: Json
          question?: string
          resolution_rules?: string | null
          resolution_source?: string | null
          resolved_option?: string | null
          status?: Database["public"]["Enums"]["market_status"]
          total_credits?: number
          total_participants?: number
          trending?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          created_at: string
          credits_allocated: number
          id: string
          market_id: string
          reward: number | null
          selected_option: string
          status: Database["public"]["Enums"]["prediction_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_allocated: number
          id?: string
          market_id: string
          reward?: number | null
          selected_option: string
          status?: Database["public"]["Enums"]["prediction_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_allocated?: number
          id?: string
          market_id?: string
          reward?: number | null
          selected_option?: string
          status?: Database["public"]["Enums"]["prediction_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accuracy_rate: number
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          futra_credits: number
          futra_score: number
          global_rank: number
          id: string
          influence_level: Database["public"]["Enums"]["influence_level"]
          resolved_predictions: number
          specialties: string[] | null
          streak: number
          total_predictions: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          accuracy_rate?: number
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          futra_credits?: number
          futra_score?: number
          global_rank?: number
          id?: string
          influence_level?: Database["public"]["Enums"]["influence_level"]
          resolved_predictions?: number
          specialties?: string[] | null
          streak?: number
          total_predictions?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          accuracy_rate?: number
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          futra_credits?: number
          futra_score?: number
          global_rank?: number
          id?: string
          influence_level?: Database["public"]["Enums"]["influence_level"]
          resolved_predictions?: number
          specialties?: string[] | null
          streak?: number
          total_predictions?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          cta_label: string | null
          cta_link: string | null
          id: string
          section_key: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          section_key: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          section_key?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_prediction: {
        Args: {
          p_credits: number
          p_market_id: string
          p_selected_option: string
        }
        Returns: string
      }
      recalculate_global_ranks: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      influence_level: "low" | "medium" | "high" | "elite"
      market_category:
        | "politics"
        | "economy"
        | "crypto"
        | "football"
        | "culture"
        | "technology"
      market_status: "open" | "closed" | "resolved"
      prediction_status: "pending" | "won" | "lost"
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
      influence_level: ["low", "medium", "high", "elite"],
      market_category: [
        "politics",
        "economy",
        "crypto",
        "football",
        "culture",
        "technology",
      ],
      market_status: ["open", "closed", "resolved"],
      prediction_status: ["pending", "won", "lost"],
    },
  },
} as const

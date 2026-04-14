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
      achievements: {
        Row: {
          active: boolean
          category: string
          created_at: string
          criteria_meta: Json | null
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id: string
          key: string
          name: string
          rarity: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          criteria_meta?: Json | null
          criteria_type: string
          criteria_value?: number
          description?: string
          icon?: string
          id?: string
          key: string
          name: string
          rarity?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          criteria_meta?: Json | null
          criteria_type?: string
          criteria_value?: number
          description?: string
          icon?: string
          id?: string
          key?: string
          name?: string
          rarity?: string
        }
        Relationships: []
      }
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
      analytics_events: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          properties: Json | null
          referrer: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          properties?: Json | null
          referrer?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          properties?: Json | null
          referrer?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bracket_entries: {
        Row: {
          champion_pick: string | null
          created_at: string
          id: string
          progress_percent: number
          status: string
          total_score: number
          tournament_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          champion_pick?: string | null
          created_at?: string
          id?: string
          progress_percent?: number
          status?: string
          total_score?: number
          tournament_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          champion_pick?: string | null
          created_at?: string
          id?: string
          progress_percent?: number
          status?: string
          total_score?: number
          tournament_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bracket_entries_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      bracket_entry_group_picks: {
        Row: {
          created_at: string
          entry_id: string
          group_id: string
          id: string
          predicted_position: number
          team_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          group_id: string
          id?: string
          predicted_position: number
          team_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          group_id?: string
          id?: string
          predicted_position?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bracket_entry_group_picks_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "bracket_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_entry_group_picks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tournament_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_entry_group_picks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "tournament_group_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      bracket_entry_knockout_picks: {
        Row: {
          chosen_team_name: string
          created_at: string
          entry_id: string
          id: string
          match_id: string
        }
        Insert: {
          chosen_team_name: string
          created_at?: string
          entry_id: string
          id?: string
          match_id: string
        }
        Update: {
          chosen_team_name?: string
          created_at?: string
          entry_id?: string
          id?: string
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bracket_entry_knockout_picks_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "bracket_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_entry_knockout_picks_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "bracket_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      bracket_matches: {
        Row: {
          away_source: string
          bracket_side: string
          created_at: string
          home_source: string
          id: string
          is_locked: boolean
          match_order: number
          official_winner: string | null
          round: string
          tournament_id: string
        }
        Insert: {
          away_source: string
          bracket_side?: string
          created_at?: string
          home_source: string
          id?: string
          is_locked?: boolean
          match_order: number
          official_winner?: string | null
          round: string
          tournament_id: string
        }
        Update: {
          away_source?: string
          bracket_side?: string
          created_at?: string
          home_source?: string
          id?: string
          is_locked?: boolean
          match_order?: number
          official_winner?: string | null
          round?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bracket_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
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
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          market_id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          market_id: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          market_id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
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
      job_executions: {
        Row: {
          created_at: string
          duration_ms: number
          error_message: string | null
          id: string
          job_name: string
          metrics: Json
          status: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          job_name: string
          metrics?: Json
          status?: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          job_name?: string
          metrics?: Json
          status?: string
        }
        Relationships: []
      }
      market_options: {
        Row: {
          created_at: string | null
          id: string
          label: string
          market_id: string
          percentage: number | null
          total_credits: number | null
          total_votes: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          market_id: string
          percentage?: number | null
          total_credits?: number | null
          total_votes?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          market_id?: string
          percentage?: number | null
          total_credits?: number | null
          total_votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_options_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
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
          image_alt: string | null
          image_source: string | null
          image_url: string | null
          lock_date: string | null
          options: Json
          question: string
          resolution_rules: string | null
          resolution_source: string | null
          resolved_option: string | null
          search_vector: unknown
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
          image_alt?: string | null
          image_source?: string | null
          image_url?: string | null
          lock_date?: string | null
          options?: Json
          question: string
          resolution_rules?: string | null
          resolution_source?: string | null
          resolved_option?: string | null
          search_vector?: unknown
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
          image_alt?: string | null
          image_source?: string | null
          image_url?: string | null
          lock_date?: string | null
          options?: Json
          question?: string
          resolution_rules?: string | null
          resolution_source?: string | null
          resolved_option?: string | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["market_status"]
          total_credits?: number
          total_participants?: number
          trending?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          action_type: string
          active: boolean
          created_at: string
          description: string
          goal_value: number
          id: string
          period: string
          reward_credits: number
          reward_score: number
          title: string
        }
        Insert: {
          action_type: string
          active?: boolean
          created_at?: string
          description: string
          goal_value?: number
          id?: string
          period: string
          reward_credits?: number
          reward_score?: number
          title: string
        }
        Update: {
          action_type?: string
          active?: boolean
          created_at?: string
          description?: string
          goal_value?: number
          id?: string
          period?: string
          reward_credits?: number
          reward_score?: number
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
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
          score_delta: number | null
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
          score_delta?: number | null
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
          score_delta?: number | null
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
          last_daily_bonus: string | null
          onboarding_completed: boolean | null
          referral_code: string | null
          referred_by: string | null
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
          last_daily_bonus?: string | null
          onboarding_completed?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
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
          last_daily_bonus?: string | null
          onboarding_completed?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
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
      push_subscriptions: {
        Row: {
          created_at: string
          fcm_token: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fcm_token: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fcm_token?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_markets: {
        Row: {
          ai_notes: string | null
          category: Database["public"]["Enums"]["market_category"]
          confidence_score: number | null
          created_at: string
          end_date: string | null
          flags: Json | null
          generated_description: string | null
          generated_options: Json | null
          generated_question: string | null
          id: string
          market_id: string | null
          priority_score: number | null
          resolution_source: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          source_topic: string
          status: string
          submitted_by: string | null
          topic_hash: string
        }
        Insert: {
          ai_notes?: string | null
          category: Database["public"]["Enums"]["market_category"]
          confidence_score?: number | null
          created_at?: string
          end_date?: string | null
          flags?: Json | null
          generated_description?: string | null
          generated_options?: Json | null
          generated_question?: string | null
          id?: string
          market_id?: string | null
          priority_score?: number | null
          resolution_source?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: string
          source_topic: string
          status?: string
          submitted_by?: string | null
          topic_hash: string
        }
        Update: {
          ai_notes?: string | null
          category?: Database["public"]["Enums"]["market_category"]
          confidence_score?: number | null
          created_at?: string
          end_date?: string | null
          flags?: Json | null
          generated_description?: string | null
          generated_options?: Json | null
          generated_question?: string | null
          id?: string
          market_id?: string | null
          priority_score?: number | null
          resolution_source?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          source_topic?: string
          status?: string
          submitted_by?: string | null
          topic_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_markets_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
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
      suspicious_events: {
        Row: {
          created_at: string
          description: string
          event_type: string
          id: string
          metadata: Json
          reviewed: boolean
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          event_type: string
          id?: string
          metadata?: Json
          reviewed?: boolean
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          metadata?: Json
          reviewed?: boolean
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      synthetic_market_data: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          market_id: string
          seed: number
          snapshot: Json
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          market_id: string
          seed?: number
          snapshot?: Json
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          market_id?: string
          seed?: number
          snapshot?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "synthetic_market_data_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: true
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_group_teams: {
        Row: {
          created_at: string
          flag_emoji: string
          group_id: string
          id: string
          seed_position: number
          team_code: string
          team_name: string
        }
        Insert: {
          created_at?: string
          flag_emoji?: string
          group_id: string
          id?: string
          seed_position?: number
          team_code: string
          team_name: string
        }
        Update: {
          created_at?: string
          flag_emoji?: string
          group_id?: string
          id?: string
          seed_position?: number
          team_code?: string
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_group_teams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tournament_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_groups: {
        Row: {
          created_at: string
          group_letter: string
          id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          group_letter: string
          id?: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          group_letter?: string
          id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_groups_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          name: string
          scoring_rules: Json
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          name: string
          scoring_rules?: Json
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          name?: string
          scoring_rules?: Json
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_missions: {
        Row: {
          claimed_at: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          current_value: number
          id: string
          mission_id: string
          period_start: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          mission_id: string
          period_start: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          mission_id?: string
          period_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
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
      watchlist: {
        Row: {
          created_at: string
          id: string
          market_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          market_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          accuracy_rate: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          futra_score: number | null
          global_rank: number | null
          id: string | null
          influence_level: Database["public"]["Enums"]["influence_level"] | null
          resolved_predictions: number | null
          specialties: string[] | null
          streak: number | null
          total_predictions: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          accuracy_rate?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          futra_score?: number | null
          global_rank?: number | null
          id?: string | null
          influence_level?:
            | Database["public"]["Enums"]["influence_level"]
            | null
          resolved_predictions?: number | null
          specialties?: string[] | null
          streak?: number | null
          total_predictions?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          accuracy_rate?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          futra_score?: number | null
          global_rank?: number | null
          id?: string | null
          influence_level?:
            | Database["public"]["Enums"]["influence_level"]
            | null
          resolved_predictions?: number | null
          specialties?: string[] | null
          streak?: number | null
          total_predictions?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_user_scores: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      check_achievements: { Args: { p_user_id: string }; Returns: undefined }
      claim_mission_reward: {
        Args: { p_user_mission_id: string }
        Returns: Json
      }
      get_browse_sorted: {
        Args: {
          p_category?: Database["public"]["Enums"]["market_category"]
          p_limit?: number
          p_offset?: number
          p_sort?: string
        }
        Returns: {
          category: Database["public"]["Enums"]["market_category"]
          created_at: string
          created_by: string
          description: string
          end_date: string
          featured: boolean
          id: string
          lock_date: string
          options: Json
          priority_score: number
          question: string
          resolution_rules: string
          resolution_source: string
          resolved_option: string
          status: Database["public"]["Enums"]["market_status"]
          total_count: number
          total_credits: number
          total_participants: number
          trending: boolean
          type: string
        }[]
      }
      get_home_feeds: { Args: never; Returns: Json }
      get_leaderboard: {
        Args: {
          p_category?: Database["public"]["Enums"]["market_category"]
          p_period?: string
        }
        Returns: {
          accuracy_rate: number
          avatar_url: string
          display_name: string
          futra_score: number
          id: string
          influence_level: Database["public"]["Enums"]["influence_level"]
          resolved_predictions: number
          total_predictions: number
          user_id: string
          username: string
        }[]
      }
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
      resolve_market_and_score: {
        Args: { p_market_id: string; p_winning_option: string }
        Returns: Json
      }
      track_mission_progress: {
        Args: { p_action_type: string; p_metadata?: Json }
        Returns: undefined
      }
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

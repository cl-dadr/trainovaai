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
      ad_impressions: {
        Row: {
          ad_slot: string
          created_at: string
          id: string
          impression_type: string
          page: string
          user_id: string | null
        }
        Insert: {
          ad_slot: string
          created_at?: string
          id?: string
          impression_type?: string
          page: string
          user_id?: string | null
        }
        Update: {
          ad_slot?: string
          created_at?: string
          id?: string
          impression_type?: string
          page?: string
          user_id?: string | null
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_url: string
          created_at: string
          id: string
          product_id: string
          product_name: string
          user_id: string | null
        }
        Insert: {
          affiliate_url: string
          created_at?: string
          id?: string
          product_id: string
          product_name: string
          user_id?: string | null
        }
        Update: {
          affiliate_url?: string
          created_at?: string
          id?: string
          product_id?: string
          product_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      battle_participants: {
        Row: {
          battle_id: string
          finished_at: string | null
          form_score: number
          id: string
          joined_at: string
          reps: number
          score: number
          status: string
          user_id: string
        }
        Insert: {
          battle_id: string
          finished_at?: string | null
          form_score?: number
          id?: string
          joined_at?: string
          reps?: number
          score?: number
          status?: string
          user_id: string
        }
        Update: {
          battle_id?: string
          finished_at?: string | null
          form_score?: number
          id?: string
          joined_at?: string
          reps?: number
          score?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_participants_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battles: {
        Row: {
          created_at: string
          creator_id: string
          duration_seconds: number
          ends_at: string | null
          exercise_type: string
          id: string
          is_community: boolean
          max_participants: number
          starts_at: string | null
          status: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          duration_seconds?: number
          ends_at?: string | null
          exercise_type?: string
          id?: string
          is_community?: boolean
          max_participants?: number
          starts_at?: string | null
          status?: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          duration_seconds?: number
          ends_at?: string | null
          exercise_type?: string
          id?: string
          is_community?: boolean
          max_participants?: number
          starts_at?: string | null
          status?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      daily_activity: {
        Row: {
          active_minutes: number | null
          calories: number | null
          created_at: string
          date: string
          distance_km: number | null
          heart_rate_avg: number | null
          id: string
          spo2: number | null
          steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_minutes?: number | null
          calories?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          heart_rate_avg?: number | null
          id?: string
          spo2?: number | null
          steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_minutes?: number | null
          calories?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          heart_rate_avg?: number | null
          id?: string
          spo2?: number | null
          steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          feature: string
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          feature: string
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          feature?: string
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          habit_id: string
          id: string
          user_id: string
          value: number
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date?: string
          habit_id: string
          id?: string
          user_id: string
          value?: number
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          habit_id?: string
          id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          active: boolean
          ai_suggested: boolean
          color: string
          created_at: string
          difficulty: string
          frequency: string
          icon: string
          id: string
          name: string
          reminder_enabled: boolean
          reminder_time: string | null
          target: number
          time_of_day: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          ai_suggested?: boolean
          color?: string
          created_at?: string
          difficulty?: string
          frequency?: string
          icon?: string
          id?: string
          name: string
          reminder_enabled?: boolean
          reminder_time?: string | null
          target?: number
          time_of_day?: string | null
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          ai_suggested?: boolean
          color?: string
          created_at?: string
          difficulty?: string
          frequency?: string
          icon?: string
          id?: string
          name?: string
          reminder_enabled?: boolean
          reminder_time?: string | null
          target?: number
          time_of_day?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      liked_songs: {
        Row: {
          author: string | null
          created_at: string
          duration: string | null
          id: string
          thumbnail: string | null
          title: string
          user_id: string
          video_id: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          thumbnail?: string | null
          title: string
          user_id: string
          video_id: string
        }
        Update: {
          author?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          thumbnail?: string | null
          title?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          date: string
          emoji: string | null
          fats: number
          id: string
          items: string | null
          meal_name: string
          meal_type: string
          protein: number
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          date?: string
          emoji?: string | null
          fats?: number
          id?: string
          items?: string | null
          meal_name: string
          meal_type: string
          protein?: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          date?: string
          emoji?: string | null
          fats?: number
          id?: string
          items?: string | null
          meal_name?: string
          meal_type?: string
          protein?: number
          user_id?: string
        }
        Relationships: []
      }
      nutrition_profiles: {
        Row: {
          activity_level: string
          age: number
          body_goal: string
          carbs_target: number
          created_at: string
          diet_preference: string
          fats_target: number
          gender: string
          height_cm: number
          id: string
          protein_target: number
          tdee_calories: number
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          activity_level?: string
          age: number
          body_goal?: string
          carbs_target?: number
          created_at?: string
          diet_preference?: string
          fats_target?: number
          gender?: string
          height_cm: number
          id?: string
          protein_target?: number
          tdee_calories?: number
          updated_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          activity_level?: string
          age?: number
          body_goal?: string
          carbs_target?: number
          created_at?: string
          diet_preference?: string
          fats_target?: number
          gender?: string
          height_cm?: number
          id?: string
          protein_target?: number
          tdee_calories?: number
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      playlist_songs: {
        Row: {
          added_at: string
          author: string | null
          duration: string | null
          id: string
          playlist_id: string
          thumbnail: string | null
          title: string
          user_id: string
          video_id: string
        }
        Insert: {
          added_at?: string
          author?: string | null
          duration?: string | null
          id?: string
          playlist_id: string
          thumbnail?: string | null
          title: string
          user_id: string
          video_id: string
        }
        Update: {
          added_at?: string
          author?: string | null
          duration?: string | null
          id?: string
          playlist_id?: string
          thumbnail?: string | null
          title?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_songs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      premium_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          body_goal: string | null
          created_at: string
          display_name: string | null
          fitness_level: string
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          body_goal?: string | null
          created_at?: string
          display_name?: string | null
          fitness_level?: string
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          body_goal?: string | null
          created_at?: string
          display_name?: string | null
          fitness_level?: string
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      running_sessions: {
        Row: {
          avg_heart_rate: number | null
          avg_pace: string | null
          calories: number
          created_at: string
          distance_km: number
          duration_seconds: number
          id: string
          route_points: Json | null
          steps: number
          user_id: string
        }
        Insert: {
          avg_heart_rate?: number | null
          avg_pace?: string | null
          calories?: number
          created_at?: string
          distance_km?: number
          duration_seconds?: number
          id?: string
          route_points?: Json | null
          steps?: number
          user_id: string
        }
        Update: {
          avg_heart_rate?: number | null
          avg_pace?: string | null
          calories?: number
          created_at?: string
          distance_km?: number
          duration_seconds?: number
          id?: string
          route_points?: Json | null
          steps?: number
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          id: string
          last_workout_date: string | null
          longest_streak: number
          total_reps: number
          total_workouts: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_workout_date?: string | null
          longest_streak?: number
          total_reps?: number
          total_workouts?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_workout_date?: string | null
          longest_streak?: number
          total_reps?: number
          total_workouts?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          date: string
          glasses: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          date?: string
          glasses?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          date?: string
          glasses?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          calories_burned: number | null
          created_at: string
          duration_seconds: number | null
          exercise_type: string
          form_score: number | null
          id: string
          reps: number
          user_id: string
        }
        Insert: {
          calories_burned?: number | null
          created_at?: string
          duration_seconds?: number | null
          exercise_type: string
          form_score?: number | null
          id?: string
          reps?: number
          user_id: string
        }
        Update: {
          calories_burned?: number | null
          created_at?: string
          duration_seconds?: number | null
          exercise_type?: string
          form_score?: number | null
          id?: string
          reps?: number
          user_id?: string
        }
        Relationships: []
      }
      workout_todos: {
        Row: {
          actual_reps: number | null
          created_at: string
          exercise_type: string
          id: string
          status: string
          target_reps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_reps?: number | null
          created_at?: string
          exercise_type: string
          id?: string
          status?: string
          target_reps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_reps?: number | null
          created_at?: string
          exercise_type?: string
          id?: string
          status?: string
          target_reps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserStats {
  totalReps: number;
  totalWorkouts: number;
  avgFormScore: number;
  longestStreak: number;
  currentStreak: number;
  totalXP: number;
  loading: boolean;
}

export function useUserStats(): UserStats {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalReps: 0,
    totalWorkouts: 0,
    avgFormScore: 0,
    longestStreak: 0,
    currentStreak: 0,
    totalXP: 0,
    loading: true,
  });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      // Fetch workout sessions
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("reps, form_score")
        .eq("user_id", user.id);

      // Fetch streaks
      const { data: streaks } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const totalReps = sessions?.reduce((sum, s) => sum + (s.reps || 0), 0) || 0;
      const totalWorkouts = sessions?.length || 0;
      const avgFormScore = totalWorkouts > 0
        ? Math.round((sessions?.reduce((sum, s) => sum + (s.form_score || 0), 0) || 0) / totalWorkouts)
        : 0;

      setStats({
        totalReps,
        totalWorkouts,
        avgFormScore,
        longestStreak: streaks?.longest_streak || 0,
        currentStreak: streaks?.current_streak || 0,
        totalXP: streaks?.total_xp || 0,
        loading: false,
      });
    };

    fetchStats();
  }, [user]);

  return stats;
}

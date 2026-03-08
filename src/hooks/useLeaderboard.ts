import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  total_xp: number;
  total_workouts: number;
  total_reps: number;
  current_streak: number;
  longest_streak: number;
  battles_won: number;
}

export function useLeaderboard(type: "global" | "friends" = "global", friendIds: string[] = []) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      setLoading(true);

      let query = supabase.from("user_streaks").select("*").order("total_xp", { ascending: false }).limit(50);

      if (type === "friends" && friendIds.length > 0) {
        query = query.in("user_id", [...friendIds, user.id]);
      }

      const { data: streaks } = await query;
      if (!streaks) { setLoading(false); return; }

      const userIds = streaks.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);

      // Count battles won per user
      const { data: completedBattles } = await supabase
        .from("battle_participants")
        .select("user_id, score, battle_id")
        .in("user_id", userIds)
        .eq("status", "finished");

      const winsMap = new Map<string, number>();
      // Simple: count participations with highest score in their battle
      if (completedBattles) {
        const battleScores = new Map<string, { user_id: string; score: number }[]>();
        completedBattles.forEach(p => {
          const list = battleScores.get(p.battle_id) || [];
          list.push({ user_id: p.user_id, score: p.score });
          battleScores.set(p.battle_id, list);
        });
        battleScores.forEach(participants => {
          if (participants.length < 2) return;
          const maxScore = Math.max(...participants.map(p => p.score));
          participants.filter(p => p.score === maxScore).forEach(p => {
            winsMap.set(p.user_id, (winsMap.get(p.user_id) || 0) + 1);
          });
        });
      }

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const result: LeaderboardEntry[] = streaks.map(s => {
        const p = profileMap.get(s.user_id);
        return {
          user_id: s.user_id,
          display_name: p?.display_name || null,
          username: p?.username || null,
          avatar_url: p?.avatar_url || null,
          total_xp: s.total_xp,
          total_workouts: s.total_workouts,
          total_reps: s.total_reps,
          current_streak: s.current_streak,
          longest_streak: s.longest_streak,
          battles_won: winsMap.get(s.user_id) || 0,
        };
      });

      setEntries(result);
      setLoading(false);
    };

    fetch();
  }, [user, type, friendIds.join(",")]);

  return { entries, loading };
}

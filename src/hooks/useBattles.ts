import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Battle {
  id: string;
  creator_id: string;
  title: string;
  type: string;
  exercise_type: string;
  status: string;
  duration_seconds: number;
  max_participants: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  is_community: boolean;
}

export interface BattleParticipant {
  id: string;
  battle_id: string;
  user_id: string;
  status: string;
  score: number;
  reps: number;
  form_score: number;
  joined_at: string;
  finished_at: string | null;
}

export interface BattleWithParticipants extends Battle {
  participants: (BattleParticipant & { profile?: { display_name: string | null; username: string | null; avatar_url: string | null } })[];
}

export function useBattles() {
  const { user } = useAuth();
  const [battles, setBattles] = useState<BattleWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBattles = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: battlesData } = await supabase
      .from("battles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!battlesData) { setLoading(false); return; }

    const battleIds = battlesData.map(b => b.id);
    const { data: participants } = await supabase
      .from("battle_participants")
      .select("*")
      .in("battle_id", battleIds);

    const userIds = [...new Set([
      ...battlesData.map(b => b.creator_id),
      ...(participants?.map(p => p.user_id) || [])
    ])];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const enriched: BattleWithParticipants[] = battlesData.map(b => ({
      ...b,
      participants: (participants || [])
        .filter(p => p.battle_id === b.id)
        .map(p => ({ ...p, profile: profileMap.get(p.user_id) || undefined }))
    }));

    setBattles(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBattles(); }, [fetchBattles]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("battles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "battles" }, () => fetchBattles())
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_participants" }, () => fetchBattles())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchBattles]);

  const createBattle = async (data: {
    title: string;
    type: string;
    exercise_type: string;
    duration_seconds: number;
    is_community: boolean;
  }) => {
    if (!user) return null;

    const { data: battle, error } = await supabase
      .from("battles")
      .insert({
        creator_id: user.id,
        title: data.title,
        type: data.type,
        exercise_type: data.exercise_type,
        duration_seconds: data.duration_seconds,
        is_community: data.is_community,
        status: "pending",
      })
      .select()
      .single();

    if (error) { toast.error("Failed to create battle"); return null; }

    // Creator auto-joins
    await supabase.from("battle_participants").insert({
      battle_id: battle.id,
      user_id: user.id,
      status: "ready",
    });

    toast.success("Battle created! 🔥");
    return battle;
  };

  const joinBattle = async (battleId: string) => {
    if (!user) return;

    const { error } = await supabase.from("battle_participants").insert({
      battle_id: battleId,
      user_id: user.id,
      status: "ready",
    });

    if (error) {
      if (error.code === "23505") toast.error("Already joined!");
      else toast.error("Failed to join");
      return;
    }
    toast.success("Joined the battle! 💪");
  };

  const startBattle = async (battleId: string) => {
    if (!user) return;
    const now = new Date();
    const battle = battles.find(b => b.id === battleId);
    if (!battle) return;

    const endsAt = new Date(now.getTime() + battle.duration_seconds * 1000);

    await supabase.from("battles").update({
      status: "active",
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    }).eq("id", battleId);

    toast.success("Battle started! GO! 🚀");
  };

  const updateScore = async (battleId: string, reps: number, formScore: number) => {
    if (!user) return;
    const score = Math.round(reps * (formScore / 100) * 10);

    await supabase.from("battle_participants").update({
      reps,
      form_score: formScore,
      score,
    }).eq("battle_id", battleId).eq("user_id", user.id);
  };

  const finishBattle = async (battleId: string) => {
    if (!user) return;

    await supabase.from("battle_participants").update({
      status: "finished",
      finished_at: new Date().toISOString(),
    }).eq("battle_id", battleId).eq("user_id", user.id);

    // Check if all participants finished
    const battle = battles.find(b => b.id === battleId);
    if (battle) {
      const allFinished = battle.participants.every(p => p.status === "finished" || p.user_id === user.id);
      if (allFinished) {
        await supabase.from("battles").update({ status: "completed" }).eq("id", battleId);
      }
    }
  };

  const myBattles = battles.filter(b => b.participants.some(p => p.user_id === user?.id));
  const openBattles = battles.filter(b => b.status === "pending" && !b.participants.some(p => p.user_id === user?.id));
  const activeBattles = battles.filter(b => b.status === "active" && b.participants.some(p => p.user_id === user?.id));

  return {
    battles, myBattles, openBattles, activeBattles,
    loading, createBattle, joinBattle, startBattle, updateScore, finishBattle, refetch: fetchBattles,
  };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  target: number;
  unit: string;
  frequency: string;
  time_of_day: string | null;
  difficulty: string;
  reminder_enabled: boolean;
  reminder_time: string | null;
  ai_suggested: boolean;
  active: boolean;
  created_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  value: number;
  completed: boolean;
}

export interface HabitWithCompletion extends Habit {
  todayCompletion: HabitCompletion | null;
  streak: number;
  weekCompletions: boolean[];
  allCompletions: HabitCompletion[];
}

export interface AISuggestion {
  name: string;
  icon: string;
  color: string;
  target: number;
  unit: string;
  reason: string;
}

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<HabitWithCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const fetchHabits = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];
    const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    const [{ data: habitsData }, { data: completionsData }] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true).order("created_at"),
      supabase.from("habit_completions").select("*").eq("user_id", user.id).gte("date", yearAgo).lte("date", today),
    ]);

    const enriched: HabitWithCompletion[] = (habitsData || []).map((h: any) => {
      const hCompletions = (completionsData || []).filter((c: any) => c.habit_id === h.id);
      const todayCompletion = hCompletions.find((c: any) => c.date === today) || null;

      // Calculate streak
      let streak = 0;
      const sortedDates = hCompletions
        .filter((c: any) => c.completed)
        .map((c: any) => c.date)
        .sort()
        .reverse();

      if (sortedDates.length > 0) {
        let checkDate = new Date(today);
        for (const d of sortedDates) {
          const dateStr = checkDate.toISOString().split("T")[0];
          if (d === dateStr) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      // Week completions (last 7 days)
      const weekCompletions: boolean[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
        weekCompletions.push(hCompletions.some((c: any) => c.date === d && c.completed));
      }

      return { ...h, todayCompletion, streak, weekCompletions, allCompletions: hCompletions };
    });

    setHabits(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const toggleHabit = async (habitId: string) => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    if (habit.todayCompletion) {
      const newCompleted = !habit.todayCompletion.completed;
      await supabase
        .from("habit_completions")
        .update({ completed: newCompleted, value: newCompleted ? habit.target : 0 })
        .eq("id", habit.todayCompletion.id);
    } else {
      await supabase.from("habit_completions").insert({
        habit_id: habitId,
        user_id: user.id,
        date: today,
        value: habit.target,
        completed: true,
      });
    }
    await fetchHabits();
  };

  const incrementHabit = async (habitId: string, amount: number = 1) => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    if (habit.todayCompletion) {
      const newValue = Math.max(0, habit.todayCompletion.value + amount);
      const completed = newValue >= habit.target;
      await supabase
        .from("habit_completions")
        .update({ value: newValue, completed })
        .eq("id", habit.todayCompletion.id);
    } else {
      const value = Math.max(0, amount);
      await supabase.from("habit_completions").insert({
        habit_id: habitId,
        user_id: user.id,
        date: today,
        value,
        completed: value >= habit.target,
      });
    }
    await fetchHabits();
  };

  const createHabit = async (habit: Partial<Habit>) => {
    if (!user) return;
    const { error } = await supabase.from("habits").insert({
      user_id: user.id,
      name: habit.name || "New Habit",
      icon: habit.icon || "dumbbell",
      color: habit.color || "neon-green",
      target: habit.target || 1,
      unit: habit.unit || "session",
      frequency: habit.frequency || "daily",
      time_of_day: habit.time_of_day || "anytime",
      difficulty: habit.difficulty || "medium",
      reminder_enabled: habit.reminder_enabled || false,
      reminder_time: habit.reminder_time || null,
      ai_suggested: habit.ai_suggested || false,
    });
    if (error) {
      toast.error("Failed to create habit");
    } else {
      toast.success("Habit created! 🎯");
      await fetchHabits();
    }
  };

  const deleteHabit = async (habitId: string) => {
    if (!user) return;
    await supabase.from("habits").delete().eq("id", habitId);
    toast.success("Habit removed");
    await fetchHabits();
  };

  const fetchSuggestions = async (goals?: string) => {
    if (!user) return;
    setSuggestionsLoading(true);
    try {
      const { data: streakData } = await supabase.from("user_streaks").select("total_workouts").eq("user_id", user.id).maybeSingle();
      const res = await supabase.functions.invoke("habit-suggestions", {
        body: {
          existingHabits: habits.map((h) => ({ name: h.name })),
          workoutCount: streakData?.total_workouts || 0,
          goals: goals || "general fitness",
        },
      });
      if (res.error) throw res.error;
      setSuggestions(res.data?.suggestions || []);
    } catch (e) {
      console.error("Suggestion error:", e);
      toast.error("Couldn't load AI suggestions");
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const completedCount = habits.filter((h) => h.todayCompletion?.completed).length;
  const completionRate = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return {
    habits,
    loading,
    toggleHabit,
    incrementHabit,
    createHabit,
    deleteHabit,
    suggestions,
    suggestionsLoading,
    fetchSuggestions,
    completedCount,
    completionRate,
    refetch: fetchHabits,
  };
}

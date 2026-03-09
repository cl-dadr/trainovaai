import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Dumbbell, Droplets, Moon, Brain, Footprints, Check, Plus, Trophy,
  TrendingUp, Heart, Apple, Timer, Sun, Sparkles, Trash2, Flame, Zap, Target,
  BarChart3, PieChart, Calendar, CheckSquare, Filter, ChevronDown, ChevronUp,
  Clock, Award, Percent, ListChecks, LayoutGrid, Table2, Minus, ChevronLeft,
  ChevronRight, CalendarDays, CalendarRange, Infinity, Medal, Crown, Star, Shield
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useHabits, type AISuggestion } from "@/hooks/useHabits";
import { usePremium } from "@/hooks/usePremium";
import PremiumGate from "@/components/PremiumGate";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
} from "recharts";

const iconMap: Record<string, any> = {
  dumbbell: Dumbbell, droplets: Droplets, moon: Moon, brain: Brain, footprints: Footprints,
  heart: Heart, apple: Apple, stretch: Zap, timer: Timer, sun: Sun,
};

const colorOptions = ["neon-green", "neon-cyan", "neon-purple", "neon-orange", "neon-pink"];
const unitOptions = ["session", "glasses", "hours", "min", "steps", "servings", "reps", "pages", "km"];
const frequencyOptions = ["daily", "weekly"];
const difficultyOptions = ["easy", "medium", "hard"];
const timeOptions = ["morning", "afternoon", "evening", "anytime"];

const CHART_COLORS = [
  "hsl(160, 100%, 50%)", "hsl(180, 100%, 50%)", "hsl(280, 100%, 65%)",
  "hsl(25, 100%, 55%)", "hsl(330, 100%, 60%)",
];

const tooltipStyle = {
  background: "hsl(240, 12%, 8%)",
  border: "1px solid hsl(240, 10%, 20%)",
  borderRadius: "8px",
  fontSize: "11px",
};

// Helper to get date string
const dateStr = (d: Date) => d.toISOString().split("T")[0];
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Streak milestone definitions
const STREAK_MILESTONES = [
  { days: 7, label: "Week Warrior", icon: Shield, emoji: "🛡️", color: "text-neon-cyan", bg: "bg-neon-cyan/15", border: "border-neon-cyan/30", message: "7-day streak! You're building a real habit 🔥" },
  { days: 14, label: "Fortnight Fighter", icon: Star, emoji: "⭐", color: "text-neon-purple", bg: "bg-neon-purple/15", border: "border-neon-purple/30", message: "14 days strong! Discipline is your superpower 💪" },
  { days: 21, label: "Habit Forged", icon: Flame, emoji: "🔥", color: "text-neon-orange", bg: "bg-neon-orange/15", border: "border-neon-orange/30", message: "21 days — habit officially formed! 🧬" },
  { days: 30, label: "Monthly Master", icon: Medal, emoji: "🏅", color: "text-neon-green", bg: "bg-neon-green/15", border: "border-neon-green/30", message: "30-day streak! You're unstoppable 🏅" },
  { days: 50, label: "Half Century", icon: Trophy, emoji: "🏆", color: "text-neon-cyan", bg: "bg-neon-cyan/15", border: "border-neon-cyan/30", message: "50 days! Half a century of consistency 🏆" },
  { days: 100, label: "Centurion", icon: Crown, emoji: "👑", color: "text-neon-orange", bg: "bg-neon-orange/15", border: "border-neon-orange/30", message: "100-DAY STREAK! You are LEGENDARY 👑🔥" },
  { days: 200, label: "Bicentennial", icon: Crown, emoji: "💎", color: "text-neon-purple", bg: "bg-neon-purple/15", border: "border-neon-purple/30", message: "200 days! Diamond-level dedication 💎" },
  { days: 365, label: "Year Beast", icon: Crown, emoji: "🐉", color: "text-neon-green", bg: "bg-neon-green/15", border: "border-neon-green/30", message: "365-DAY STREAK! A FULL YEAR! 🐉👑" },
];

const HabitTrackerPage = () => {
  const navigate = useNavigate();
  const {
    habits, loading, toggleHabit, incrementHabit, createHabit, deleteHabit,
    suggestions, suggestionsLoading, fetchSuggestions,
    completedCount, completionRate,
  } = useHabits();
  const { canUseFeature, getRemainingUses, trackUsage } = usePremium();

  const [showCreate, setShowCreate] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [insightPeriod, setInsightPeriod] = useState<"week" | "month" | "year">("week");
  const [heatmapDays, setHeatmapDays] = useState(30);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const notifiedStreaksRef = useRef<Set<string>>(new Set());

  const [newHabit, setNewHabit] = useState({
    name: "", icon: "dumbbell", color: "neon-green", target: 1,
    unit: "session", frequency: "daily", time_of_day: "anytime", difficulty: "medium",
  });

  // Streak milestone notifications
  useEffect(() => {
    habits.forEach(habit => {
      STREAK_MILESTONES.forEach(milestone => {
        const key = `${habit.id}-${milestone.days}`;
        if (habit.streak >= milestone.days && !notifiedStreaksRef.current.has(key)) {
          notifiedStreaksRef.current.add(key);
          toast(`${milestone.emoji} ${habit.name}: ${milestone.message}`, {
            duration: 6000,
            style: {
              background: "hsl(240 12% 8% / 0.95)",
              border: "1px solid hsl(160 100% 50% / 0.3)",
              color: "hsl(0 0% 95%)",
              boxShadow: "0 0 20px hsl(160 100% 50% / 0.2)",
            },
          });
        }
      });
    });
  }, [habits]);

  const handleCreate = async () => {
    if (!newHabit.name.trim()) return;
    await createHabit(newHabit);
    setNewHabit({ name: "", icon: "dumbbell", color: "neon-green", target: 1, unit: "session", frequency: "daily", time_of_day: "anytime", difficulty: "medium" });
    setShowCreate(false);
  };

  const handleAddSuggestion = async (s: AISuggestion) => {
    await createHabit({ name: s.name, icon: s.icon, color: s.color, target: s.target, unit: s.unit, ai_suggested: true });
  };

  // ========== INSIGHTS DATA ==========
  const insightsData = useMemo(() => {
    const now = new Date();
    let days: number;
    if (insightPeriod === "week") days = 7;
    else if (insightPeriod === "month") days = 30;
    else days = 365;

    // Daily completion rates
    const dailyRates: { date: string; label: string; completed: number; total: number; rate: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const ds = dateStr(d);
      let completed = 0;
      habits.forEach(h => {
        if (h.allCompletions.some(c => c.date === ds && c.completed)) completed++;
      });
      const label = insightPeriod === "year"
        ? (d.getDate() === 1 ? monthLabels[d.getMonth()] : "")
        : insightPeriod === "month"
          ? `${d.getDate()}`
          : dayLabels[d.getDay()];
      dailyRates.push({ date: ds, label, completed, total: habits.length, rate: habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0 });
    }

    // Aggregate weekly data for month/year views
    const aggregated = insightPeriod === "year"
      ? dailyRates.filter((_, i) => i % 7 === 0 || i === dailyRates.length - 1)
      : dailyRates;

    // Per-habit stats for the period
    const habitStats = habits.map(h => {
      const periodCompletions = h.allCompletions.filter(c => {
        const cd = new Date(c.date);
        return cd >= new Date(now.getTime() - days * 86400000) && c.completed;
      });
      return {
        name: h.name.slice(0, 15),
        completions: periodCompletions.length,
        rate: days > 0 ? Math.round((periodCompletions.length / days) * 100) : 0,
        color: CHART_COLORS[habits.indexOf(h) % CHART_COLORS.length],
      };
    });

    // Overall stats
    const totalPossible = habits.length * days;
    const totalCompleted = dailyRates.reduce((sum, d) => sum + d.completed, 0);
    const overallRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    const bestDay = dailyRates.reduce((best, d) => d.completed > best.completed ? d : best, dailyRates[0] || { date: "", completed: 0 });
    const currentStreaks = habits.map(h => h.streak);
    const avgStreak = currentStreaks.length > 0 ? Math.round(currentStreaks.reduce((a, b) => a + b, 0) / currentStreaks.length) : 0;

    return { dailyRates, aggregated, habitStats, overallRate, totalCompleted, totalPossible, bestDay, avgStreak };
  }, [habits, insightPeriod]);

  // ========== HEATMAP DATA (infinite scroll) ==========
  const heatmapData = useMemo(() => {
    const now = new Date();
    const grid: { date: string; dayOfWeek: number; completedCount: number; totalHabits: number; month: number; day: number }[] = [];
    for (let i = heatmapDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const ds = dateStr(d);
      let completed = 0;
      habits.forEach(h => {
        if (h.allCompletions.some(c => c.date === ds && c.completed)) completed++;
      });
      grid.push({ date: ds, dayOfWeek: d.getDay(), completedCount: completed, totalHabits: habits.length, month: d.getMonth(), day: d.getDate() });
    }
    return grid;
  }, [habits, heatmapDays]);

  // Group heatmap into weeks for GitHub-style grid
  const heatmapWeeks = useMemo(() => {
    const weeks: typeof heatmapData[] = [];
    let currentWeek: typeof heatmapData = [];
    // Pad the first week
    if (heatmapData.length > 0) {
      const firstDay = heatmapData[0].dayOfWeek;
      for (let i = 0; i < firstDay; i++) {
        currentWeek.push({ date: "", dayOfWeek: i, completedCount: -1, totalHabits: 0, month: -1, day: 0 });
      }
    }
    heatmapData.forEach(d => {
      currentWeek.push(d);
      if (d.dayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);
    return weeks;
  }, [heatmapData]);

  const getHeatColor = (completed: number, total: number) => {
    if (completed < 0) return "transparent";
    if (total === 0) return "hsl(240, 10%, 12%)";
    const ratio = completed / total;
    if (ratio === 0) return "hsl(240, 10%, 12%)";
    if (ratio < 0.25) return "hsl(160, 100%, 20%)";
    if (ratio < 0.5) return "hsl(160, 100%, 30%)";
    if (ratio < 0.75) return "hsl(160, 100%, 40%)";
    return "hsl(160, 100%, 50%)";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full glass-card flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">Habit Tracker</h1>
            <p className="text-[10px] text-muted-foreground">Track · Analyze · Optimize</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSuggestions(true)} className="h-9 w-9 rounded-full glass-card flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </button>
          <button onClick={() => setShowCreate(true)} className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Plus className="h-4 w-4 text-primary" />
          </button>
        </div>
      </motion.div>

      {/* KPI Row */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative z-10 grid grid-cols-4 gap-2 mb-5">
        {[
          { icon: CheckSquare, label: "Done", value: `${completedCount}/${habits.length}`, color: "text-neon-green", bg: "bg-neon-green/10" },
          { icon: Percent, label: "Rate", value: `${completionRate}%`, color: "text-neon-cyan", bg: "bg-neon-cyan/10" },
          { icon: Flame, label: "Best Streak", value: String(Math.max(...habits.map(h => h.streak), 0)), color: "text-neon-orange", bg: "bg-neon-orange/10" },
          { icon: ListChecks, label: "Total", value: String(habits.length), color: "text-neon-purple", bg: "bg-neon-purple/10" },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card p-3 text-center">
            <div className={`h-7 w-7 rounded-lg ${kpi.bg} flex items-center justify-center mx-auto mb-1.5`}>
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
            </div>
            <p className="text-base font-bold text-foreground">{kpi.value}</p>
            <p className="text-[9px] text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Achievement Badges Section */}
      {habits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative z-10 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-neon-orange" />
            <h3 className="text-xs font-bold text-foreground">Streak Achievements</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {STREAK_MILESTONES.slice(0, 8).map(milestone => {
              const bestStreak = Math.max(...habits.map(h => h.streak), 0);
              const unlocked = bestStreak >= milestone.days;
              const MIcon = milestone.icon;
              return (
                <motion.div
                  key={milestone.days}
                  whileHover={{ scale: 1.05 }}
                  className={`glass-card p-2.5 text-center transition-all ${unlocked ? `${milestone.border} border` : "opacity-40 grayscale"}`}
                >
                  <div className={`h-8 w-8 rounded-lg ${unlocked ? milestone.bg : "bg-secondary/30"} flex items-center justify-center mx-auto mb-1.5`}>
                    <MIcon className={`h-4 w-4 ${unlocked ? milestone.color : "text-muted-foreground"}`} />
                  </div>
                  <p className="text-[9px] font-bold text-foreground">{milestone.label}</p>
                  <p className="text-[8px] text-muted-foreground">{milestone.days}d streak</p>
                  {unlocked && <p className="text-[8px] mt-0.5">{milestone.emoji}</p>}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="todos" className="relative z-10">
        <TabsList className="w-full bg-card/60 border border-border/30 mb-4">
          <TabsTrigger value="todos" className="flex-1 text-[10px] gap-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <CheckSquare className="h-3 w-3" /> To-Do
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="flex-1 text-[10px] gap-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Calendar className="h-3 w-3" /> Heatmap
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex-1 text-[10px] gap-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <BarChart3 className="h-3 w-3" /> Insights
          </TabsTrigger>
        </TabsList>

        {/* ========== TO-DO LIST TAB ========== */}
        <TabsContent value="todos">
          {habits.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <ListChecks className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-2">No habits yet</p>
              <p className="text-xs text-muted-foreground mb-4">Create your first habit or get AI suggestions</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-xs font-semibold">
                  Create Habit
                </button>
                <button onClick={() => setShowSuggestions(true)} className="px-4 py-2 rounded-lg glass-card text-muted-foreground text-xs font-semibold">
                  AI Suggest
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {habits.map((habit) => {
                  const Icon = iconMap[habit.icon] || Dumbbell;
                  const isCompleted = habit.todayCompletion?.completed;
                  const currentValue = habit.todayCompletion?.value || 0;
                  const progress = Math.min(100, Math.round((currentValue / habit.target) * 100));
                  const isCountable = habit.target > 1;

                  return (
                    <motion.div key={habit.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className={`glass-card p-3 transition-all ${isCompleted ? "border-primary/20 bg-primary/[0.03]" : ""}`}>
                      
                      {/* Top row: checkbox + name + delete */}
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleHabit(habit.id)}
                          className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 transition-all border-2 ${isCompleted ? "bg-primary/20 border-primary" : "border-border bg-transparent hover:border-primary/40"}`}>
                          {isCompleted && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`h-5 w-5 rounded bg-${habit.color}/15 flex items-center justify-center shrink-0`}>
                              <Icon className={`h-2.5 w-2.5 text-${habit.color}`} />
                            </div>
                            <p className={`text-xs font-semibold truncate ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {habit.name}
                            </p>
                            {habit.ai_suggested && <Sparkles className="h-2.5 w-2.5 text-primary shrink-0" />}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {habit.streak > 0 && (
                            <span className="text-[10px] text-neon-orange font-bold flex items-center gap-0.5">
                              <Flame className="h-2.5 w-2.5" />{habit.streak}
                            </span>
                          )}
                          <button onClick={() => deleteHabit(habit.id)} className="p-1 opacity-20 hover:opacity-100 transition-opacity">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </div>
                      </div>

                      {/* Counter row for countable habits */}
                      {isCountable && (
                        <div className="mt-2.5 flex items-center gap-3 pl-9">
                          <button onClick={() => incrementHabit(habit.id, -1)}
                            className="h-7 w-7 rounded-lg bg-secondary/60 border border-border/30 flex items-center justify-center hover:bg-secondary transition-colors">
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-muted-foreground">{currentValue} / {habit.target} {habit.unit}</span>
                              <span className={`text-[10px] font-bold ${isCompleted ? "text-primary" : "text-muted-foreground"}`}>{progress}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full bg-${habit.color}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          </div>
                          <button onClick={() => incrementHabit(habit.id, 1)}
                            className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center hover:bg-primary/25 transition-colors">
                            <Plus className="h-3 w-3 text-primary" />
                          </button>
                        </div>
                      )}

                      {/* Info tags */}
                      <div className="mt-2 pl-9 flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground capitalize">{habit.frequency}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground capitalize">{habit.difficulty}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground capitalize flex items-center gap-0.5">
                          <Clock className="h-2 w-2" />{habit.time_of_day || "anytime"}
                        </span>
                        {!isCountable && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${isCompleted ? "bg-primary/15 text-primary" : "bg-secondary/50 text-muted-foreground"}`}>
                            {isCompleted ? "✓ Done" : "Pending"}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Summary footer */}
              <div className="glass-card px-4 py-3 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{habits.length} habits</span>
                <span>{completedCount} completed ({completionRate}%)</span>
                <span>Best: {Math.max(...habits.map(h => h.streak), 0)}🔥</span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ========== INFINITE HEATMAP TAB ========== */}
        <TabsContent value="heatmap">
          <div className="glass-card p-4">
            {/* Day range selector */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground">Activity Heatmap</h3>
              </div>
              <div className="flex items-center gap-1">
                {[
                  { label: "30d", value: 30 },
                  { label: "90d", value: 90 },
                  { label: "180d", value: 180 },
                  { label: "365d", value: 365 },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setHeatmapDays(opt.value)}
                    className={`px-2 py-1 rounded text-[9px] font-medium transition-all ${heatmapDays === opt.value ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary/40 text-muted-foreground border border-transparent"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {habits.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Add habits to see the heatmap</p>
            ) : (
              <>
                {/* GitHub-style heatmap grid */}
                <div className="overflow-x-auto pb-2" ref={heatmapRef}>
                  <div className="flex gap-[2px]" style={{ minWidth: `${heatmapWeeks.length * 14}px` }}>
                    {/* Day labels column */}
                    <div className="flex flex-col gap-[2px] mr-1 shrink-0">
                      {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
                        <div key={i} className="h-[12px] text-[8px] text-muted-foreground flex items-center justify-end pr-1 w-6">{d}</div>
                      ))}
                    </div>
                    {heatmapWeeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-[2px]">
                        {/* Month label on first row */}
                        {week.map((day, di) => (
                          <div key={di} className="relative group">
                            <div
                              className="h-[12px] w-[12px] rounded-[2px] transition-colors"
                              style={{ backgroundColor: getHeatColor(day.completedCount, day.totalHabits) }}
                            />
                            {day.completedCount >= 0 && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 whitespace-nowrap">
                                <div className="bg-card border border-border/50 rounded px-2 py-1 text-[9px] text-foreground shadow-lg">
                                  {day.date}: {day.completedCount}/{day.totalHabits}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  {/* Month markers */}
                  <div className="flex mt-1 ml-7" style={{ minWidth: `${heatmapWeeks.length * 14}px` }}>
                    {heatmapWeeks.map((week, wi) => {
                      const firstDayWithMonth = week.find(d => d.day === 1 && d.completedCount >= 0);
                      return (
                        <div key={wi} className="w-[14px] shrink-0">
                          {firstDayWithMonth && (
                            <span className="text-[8px] text-muted-foreground">{monthLabels[firstDayWithMonth.month]}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
                  <span className="text-[9px] text-muted-foreground">Less</span>
                  <div className="flex items-center gap-[2px]">
                    {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
                      <div key={i} className="h-[10px] w-[10px] rounded-[2px]"
                        style={{ backgroundColor: r === 0 ? "hsl(240, 10%, 12%)" : `hsl(160, 100%, ${20 + r * 30}%)` }} />
                    ))}
                  </div>
                  <span className="text-[9px] text-muted-foreground">More</span>
                </div>

                {/* Per-habit heatmap rows */}
                <div className="mt-4 pt-3 border-t border-border/20 space-y-2">
                  <h4 className="text-[10px] font-semibold text-muted-foreground mb-2">Per Habit (Last 14 days)</h4>
                  {habits.map(habit => {
                    const Icon = iconMap[habit.icon] || Dumbbell;
                    const last14: boolean[] = [];
                    for (let i = 13; i >= 0; i--) {
                      const d = dateStr(new Date(Date.now() - i * 86400000));
                      last14.push(habit.allCompletions.some(c => c.date === d && c.completed));
                    }
                    return (
                      <div key={habit.id} className="flex items-center gap-2">
                        <div className={`h-4 w-4 rounded bg-${habit.color}/15 flex items-center justify-center shrink-0`}>
                          <Icon className={`h-2 w-2 text-${habit.color}`} />
                        </div>
                        <span className="text-[9px] text-foreground truncate w-16 shrink-0">{habit.name}</span>
                        <div className="flex gap-[2px] flex-1">
                          {last14.map((done, i) => (
                            <div key={i} className={`h-[10px] flex-1 rounded-[1px] ${done ? `bg-${habit.color}/60` : "bg-secondary/40"}`} />
                          ))}
                        </div>
                        <span className="text-[9px] text-muted-foreground w-8 text-right shrink-0">{last14.filter(Boolean).length}/14</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ========== INSIGHTS TAB ========== */}
        <TabsContent value="insights">
          {/* Period selector */}
          <div className="flex items-center gap-1 mb-4">
            {(["week", "month", "year"] as const).map(p => (
              <button key={p} onClick={() => setInsightPeriod(p)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${insightPeriod === p ? "bg-primary/20 text-primary border border-primary/30" : "glass-card text-muted-foreground"}`}>
                {p === "week" && <CalendarDays className="h-3 w-3" />}
                {p === "month" && <CalendarRange className="h-3 w-3" />}
                {p === "year" && <Infinity className="h-3 w-3" />}
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-primary">{insightsData.overallRate}%</p>
              <p className="text-[9px] text-muted-foreground">Completion Rate</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-neon-cyan">{insightsData.totalCompleted}</p>
              <p className="text-[9px] text-muted-foreground">Tasks Done</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-neon-orange">{insightsData.avgStreak}</p>
              <p className="text-[9px] text-muted-foreground">Avg Streak</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Completion Rate Trend */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground">Completion Rate Trend</h3>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={insightsData.aggregated}>
                    <defs>
                      <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(160, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 16%)" />
                    <XAxis dataKey="label" tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 9 }} axisLine={false} interval={insightPeriod === "month" ? 4 : "preserveStartEnd"} />
                    <YAxis tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 9 }} axisLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [`${val}%`, "Rate"]} />
                    <Area type="monotone" dataKey="rate" stroke="hsl(160, 100%, 50%)" fill="url(#rateGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Habits Completed Per Day */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-neon-cyan" />
                <h3 className="text-xs font-bold text-foreground">Habits Done Per Day</h3>
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insightsData.aggregated} barSize={insightPeriod === "week" ? 24 : insightPeriod === "month" ? 8 : 4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 16%)" />
                    <XAxis dataKey="label" tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 9 }} axisLine={false} interval={insightPeriod === "month" ? 4 : "preserveStartEnd"} />
                    <YAxis tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 9 }} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="completed" radius={[3, 3, 0, 0]} fill="hsl(180, 100%, 50%)" name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Per-Habit Performance */}
            {insightsData.habitStats.length > 0 && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-4 w-4 text-neon-orange" />
                  <h3 className="text-xs font-bold text-foreground">Habit Performance</h3>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insightsData.habitStats} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 16%)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 9 }} axisLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 8 }} axisLine={false} width={65} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [`${val} days`, "Completed"]} />
                      <Bar dataKey="completions" radius={[0, 4, 4, 0]}>
                        {insightsData.habitStats.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Difficulty & Time Distribution */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <PieChart className="h-3 w-3 text-neon-purple" />
                  <h3 className="text-[10px] font-bold text-foreground">By Difficulty</h3>
                </div>
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Pie
                        data={habits.reduce((acc, h) => {
                          const existing = acc.find(a => a.name === h.difficulty);
                          if (existing) existing.value++;
                          else acc.push({ name: h.difficulty, value: 1 });
                          return acc;
                        }, [] as { name: string; value: number }[])}
                        dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={36} strokeWidth={2} stroke="hsl(240, 15%, 4%)">
                        {habits.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ ...tooltipStyle, fontSize: "9px" }} />
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass-card p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="h-3 w-3 text-neon-cyan" />
                  <h3 className="text-[10px] font-bold text-foreground">By Time</h3>
                </div>
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Pie
                        data={habits.reduce((acc, h) => {
                          const t = h.time_of_day || "anytime";
                          const existing = acc.find(a => a.name === t);
                          if (existing) existing.value++;
                          else acc.push({ name: t, value: 1 });
                          return acc;
                        }, [] as { name: string; value: number }[])}
                        dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={36} strokeWidth={2} stroke="hsl(240, 15%, 4%)">
                        {habits.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ ...tooltipStyle, fontSize: "9px" }} />
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Habit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-card border-border/30 max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display text-sm">Create New Habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Habit Name</label>
              <input value={newHabit.name} onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                placeholder="e.g. Morning Workout" className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Icon</label>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(iconMap).map(([key, Icon]) => (
                  <button key={key} onClick={() => setNewHabit({ ...newHabit, icon: key })}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${newHabit.icon === key ? "bg-primary/20 border border-primary/50" : "bg-secondary/50 border border-border/30"}`}>
                    <Icon className="h-3.5 w-3.5 text-foreground" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Color</label>
              <div className="flex gap-2">
                {colorOptions.map((c) => (
                  <button key={c} onClick={() => setNewHabit({ ...newHabit, color: c })}
                    className={`h-7 w-7 rounded-full bg-${c}/40 border-2 transition-all ${newHabit.color === c ? `border-${c}` : "border-transparent"}`} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Target (count)</label>
                <input type="number" min={1} value={newHabit.target} onChange={(e) => setNewHabit({ ...newHabit, target: Math.max(1, Number(e.target.value)) })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Unit</label>
                <select value={newHabit.unit} onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground">Set target &gt; 1 for countable habits (e.g., 8 glasses of water)</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Frequency</label>
                <select value={newHabit.frequency} onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {frequencyOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Time</label>
                <select value={newHabit.time_of_day} onChange={(e) => setNewHabit({ ...newHabit, time_of_day: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Difficulty</label>
                <select value={newHabit.difficulty} onChange={(e) => setNewHabit({ ...newHabit, difficulty: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {difficultyOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleCreate} disabled={!newHabit.name.trim()}
              className="w-full py-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary font-semibold text-xs disabled:opacity-40 transition-all hover:bg-primary/30">
              Create Habit
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="glass-card border-border/30 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Suggestions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">What's your fitness goal?</label>
              <div className="flex gap-2">
                <input value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="e.g. fat loss, muscle gain..."
                  className="flex-1 bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                {canUseFeature("habits") ? (
                  <button onClick={async () => { await trackUsage("habits"); fetchSuggestions(goalInput || undefined); }}
                    className="px-3 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-semibold">
                    {suggestionsLoading ? "..." : "Get"}
                  </button>
                ) : null}
              </div>
              {!canUseFeature("habits") && <PremiumGate remainingUses={0} feature="AI suggestions" />}
              {canUseFeature("habits") && getRemainingUses("habits") > 0 && <PremiumGate remainingUses={getRemainingUses("habits")} feature="AI suggestions" />}
            </div>
            {suggestions.length > 0 && (
              <div className="space-y-2">
                {suggestions.map((s, i) => {
                  const Icon = iconMap[s.icon] || Sparkles;
                  return (
                    <div key={i} className="glass-card p-3 flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-lg bg-${s.color}/15 flex items-center justify-center shrink-0`}>
                        <Icon className={`h-4 w-4 text-${s.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground">{s.name}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{s.reason}</p>
                        <p className="text-[9px] text-muted-foreground">Target: {s.target} {s.unit}</p>
                      </div>
                      <button onClick={() => handleAddSuggestion(s)}
                        className="px-2 py-1 rounded-lg bg-primary/20 text-primary text-[10px] font-semibold shrink-0">
                        Add
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HabitTrackerPage;

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Dumbbell, Droplets, Moon, Brain, Footprints, Check, Plus, Trophy,
  TrendingUp, Heart, Apple, Timer, Sun, Sparkles, Trash2, Flame, Zap, Target,
  BarChart3, PieChart, Calendar, CheckSquare, Clock, Award, Percent, ListChecks,
  Minus, Medal, Crown, Star, Shield, StickyNote, X, Edit3, Smile, Frown, Meh
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
  PieChart as RPieChart, Pie, Cell, AreaChart, Area,
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

const dateStr = (d: Date) => d.toISOString().split("T")[0];
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const shortDays = ["M", "T", "W", "T", "F", "S", "S"];

const STICKY_COLORS = [
  { bg: "bg-yellow-400/20", border: "border-yellow-400/30", text: "text-yellow-300", label: "☀️" },
  { bg: "bg-pink-400/20", border: "border-pink-400/30", text: "text-pink-300", label: "💖" },
  { bg: "bg-blue-400/20", border: "border-blue-400/30", text: "text-blue-300", label: "💎" },
  { bg: "bg-green-400/20", border: "border-green-400/30", text: "text-green-300", label: "🌿" },
  { bg: "bg-purple-400/20", border: "border-purple-400/30", text: "text-purple-300", label: "✨" },
];

const STREAK_MILESTONES = [
  { days: 7, label: "Week Warrior", emoji: "🛡️", color: "text-neon-cyan", bg: "bg-neon-cyan/15", border: "border-neon-cyan/30" },
  { days: 14, label: "Fortnight", emoji: "⭐", color: "text-neon-purple", bg: "bg-neon-purple/15", border: "border-neon-purple/30" },
  { days: 21, label: "Habit Forged", emoji: "🔥", color: "text-neon-orange", bg: "bg-neon-orange/15", border: "border-neon-orange/30" },
  { days: 30, label: "Monthly", emoji: "🏅", color: "text-neon-green", bg: "bg-neon-green/15", border: "border-neon-green/30" },
  { days: 50, label: "Half Century", emoji: "🏆", color: "text-neon-cyan", bg: "bg-neon-cyan/15", border: "border-neon-cyan/30" },
  { days: 100, label: "Centurion", emoji: "👑", color: "text-neon-orange", bg: "bg-neon-orange/15", border: "border-neon-orange/30" },
];

const MOTIVATIONAL_QUOTES = [
  "no cap, you're actually built different 💪",
  "main character energy fr fr 🔥",
  "slay your goals bestie ✨",
  "it's giving consistency 🏆",
  "you ate and left no crumbs 👑",
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
  const notifiedStreaksRef = useRef<Set<string>>(new Set());

  // Sticky notes state (local)
  const [stickyNotes, setStickyNotes] = useState<{ id: string; text: string; colorIdx: number }[]>(() => {
    try {
      const saved = localStorage.getItem("habit-sticky-notes");
      return saved ? JSON.parse(saved) : [
        { id: "1", text: "drink more water 💧", colorIdx: 0 },
        { id: "2", text: "no phone before sleep 📵", colorIdx: 1 },
      ];
    } catch { return []; }
  });
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState("");

  useEffect(() => {
    localStorage.setItem("habit-sticky-notes", JSON.stringify(stickyNotes));
  }, [stickyNotes]);

  const [newHabit, setNewHabit] = useState({
    name: "", icon: "dumbbell", color: "neon-green", target: 1,
    unit: "session", frequency: "daily", time_of_day: "anytime", difficulty: "medium",
  });

  // Streak notifications
  useEffect(() => {
    habits.forEach(habit => {
      STREAK_MILESTONES.forEach(milestone => {
        const key = `${habit.id}-${milestone.days}`;
        if (habit.streak >= milestone.days && !notifiedStreaksRef.current.has(key)) {
          notifiedStreaksRef.current.add(key);
          toast(`${milestone.emoji} ${habit.name}: ${milestone.days}-day streak!`, { duration: 5000 });
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

  const addStickyNote = () => {
    if (!newNoteText.trim()) return;
    setStickyNotes(prev => [...prev, { id: Date.now().toString(), text: newNoteText, colorIdx: prev.length % STICKY_COLORS.length }]);
    setNewNoteText("");
  };

  const deleteStickyNote = (id: string) => setStickyNotes(prev => prev.filter(n => n.id !== id));

  // Weekly data for habit table
  const weekDates = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { date: dateStr(d), dayLabel: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i], dayNum: d.getDate(), isToday: dateStr(d) === dateStr(today) };
    });
  }, []);

  // Mood emoji for completion rate
  const getMoodEmoji = (rate: number) => {
    if (rate >= 80) return "🔥";
    if (rate >= 60) return "😎";
    if (rate >= 40) return "💪";
    if (rate >= 20) return "🤔";
    return "😴";
  };

  // Weekly completion chart data
  const weeklyChartData = useMemo(() => {
    return weekDates.map(wd => {
      let completed = 0;
      habits.forEach(h => {
        if (h.allCompletions.some(c => c.date === wd.date && c.completed)) completed++;
      });
      return { day: wd.dayLabel, completed, total: habits.length, rate: habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0 };
    });
  }, [habits, weekDates]);

  // Random motivational quote
  const quote = useMemo(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)], []);

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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full glass-card flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
              Habit Tracker <span className="text-sm">✨</span>
            </h1>
            <p className="text-[10px] text-muted-foreground italic">{quote}</p>
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

      {/* Overall Progress Ring + KPIs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative z-10 glass-card p-4 mb-4">
        <div className="flex items-center gap-4">
          {/* Circular Progress */}
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - completionRate / 100)}`}
                strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-foreground">{completionRate}%</span>
              <span className="text-[9px] text-muted-foreground">today</span>
            </div>
          </div>
          {/* KPI Grid */}
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className="text-center">
              <p className="text-lg font-bold text-neon-green">{completedCount}/{habits.length}</p>
              <p className="text-[9px] text-muted-foreground">Done {getMoodEmoji(completionRate)}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-neon-orange">{Math.max(...habits.map(h => h.streak), 0)}</p>
              <p className="text-[9px] text-muted-foreground">Best Streak 🔥</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-neon-cyan">{habits.filter(h => h.streak > 0).length}</p>
              <p className="text-[9px] text-muted-foreground">Active 🏃</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-neon-purple">{habits.length}</p>
              <p className="text-[9px] text-muted-foreground">Total 📋</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="weekly" className="relative z-10">
        <TabsList className="w-full bg-card/60 border border-border/30 mb-4">
          <TabsTrigger value="weekly" className="flex-1 text-[10px] gap-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Calendar className="h-3 w-3" /> Weekly
          </TabsTrigger>
          <TabsTrigger value="tracker" className="flex-1 text-[10px] gap-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <CheckSquare className="h-3 w-3" /> Tracker
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 text-[10px] gap-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <StickyNote className="h-3 w-3" /> Notes
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex-1 text-[10px] gap-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <BarChart3 className="h-3 w-3" /> Stats
          </TabsTrigger>
        </TabsList>

        {/* ========== WEEKLY PLANNER TAB ========== */}
        <TabsContent value="weekly">
          {/* Habit Table - Notion style */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-3 mb-4 overflow-x-auto">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground">This Week's Habits</h3>
              <span className="text-[9px] text-muted-foreground ml-auto">tap to check ✅</span>
            </div>

            {habits.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-2">no habits yet bestie 😭</p>
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-xs font-semibold">
                  + Add First Habit
                </button>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/20">
                    <th className="text-left py-2 pr-3 text-[10px] text-muted-foreground font-medium w-28">Habit</th>
                    {weekDates.map(wd => (
                      <th key={wd.date} className={`text-center py-2 px-1 text-[10px] font-medium min-w-[32px] ${wd.isToday ? "text-primary" : "text-muted-foreground"}`}>
                        <div>{wd.dayLabel}</div>
                        <div className={`text-[9px] ${wd.isToday ? "bg-primary/20 rounded-full w-5 h-5 flex items-center justify-center mx-auto" : ""}`}>{wd.dayNum}</div>
                      </th>
                    ))}
                    <th className="text-center py-2 px-1 text-[10px] text-muted-foreground font-medium">🔥</th>
                  </tr>
                </thead>
                <tbody>
                  {habits.map(habit => {
                    const Icon = iconMap[habit.icon] || Dumbbell;
                    const weekProgress = weekDates.filter(wd => 
                      habit.allCompletions.some(c => c.date === wd.date && c.completed)
                    ).length;
                    const weekRate = Math.round((weekProgress / 7) * 100);

                    return (
                      <tr key={habit.id} className="border-b border-border/10 group hover:bg-primary/[0.02] transition-colors">
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <div className={`h-5 w-5 rounded bg-${habit.color}/15 flex items-center justify-center shrink-0`}>
                              <Icon className={`h-2.5 w-2.5 text-${habit.color}`} />
                            </div>
                            <span className="truncate font-medium text-foreground">{habit.name}</span>
                          </div>
                        </td>
                        {weekDates.map(wd => {
                          const isDone = habit.allCompletions.some(c => c.date === wd.date && c.completed);
                          const isToday = wd.isToday;
                          return (
                            <td key={wd.date} className="text-center py-2 px-1">
                              {isToday ? (
                                <button onClick={() => toggleHabit(habit.id)}
                                  className={`h-6 w-6 rounded-md mx-auto flex items-center justify-center border-2 transition-all ${isDone ? `bg-${habit.color}/20 border-${habit.color}` : "border-border hover:border-primary/40"}`}>
                                  {isDone && <Check className={`h-3 w-3 text-${habit.color}`} />}
                                </button>
                              ) : (
                                <div className={`h-6 w-6 rounded-md mx-auto flex items-center justify-center ${isDone ? `bg-${habit.color}/15` : "bg-secondary/30"}`}>
                                  {isDone && <Check className={`h-3 w-3 text-${habit.color}/60`} />}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center py-2 px-1">
                          <span className="text-[10px] font-bold text-neon-orange">{habit.streak}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </motion.div>

          {/* Weekly Progress Bars */}
          {habits.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-neon-cyan" />
                <h3 className="text-xs font-bold text-foreground">Weekly Vibe Check 📊</h3>
              </div>
              <div className="space-y-2.5">
                {habits.map(habit => {
                  const Icon = iconMap[habit.icon] || Dumbbell;
                  const weekDone = weekDates.filter(wd => 
                    habit.allCompletions.some(c => c.date === wd.date && c.completed)
                  ).length;
                  const weekRate = Math.round((weekDone / 7) * 100);

                  return (
                    <div key={habit.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3 w-3 text-${habit.color}`} />
                          <span className="text-[10px] font-medium text-foreground">{habit.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">{weekDone}/7 {weekRate >= 80 ? "🔥" : weekRate >= 50 ? "💪" : "📈"}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full bg-${habit.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${weekRate}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Streak Badges */}
          {habits.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-neon-orange" />
                <h3 className="text-xs font-bold text-foreground">Streak Badges 🏆</h3>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {STREAK_MILESTONES.map(m => {
                  const bestStreak = Math.max(...habits.map(h => h.streak), 0);
                  const unlocked = bestStreak >= m.days;
                  return (
                    <motion.div key={m.days} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                      className={`text-center p-2 rounded-xl transition-all ${unlocked ? `${m.bg} ${m.border} border` : "bg-secondary/30 opacity-40"}`}>
                      <span className="text-lg block">{unlocked ? m.emoji : "🔒"}</span>
                      <p className="text-[8px] font-bold text-foreground mt-1">{m.days}d</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </TabsContent>

        {/* ========== TRACKER (To-Do) TAB ========== */}
        <TabsContent value="tracker">
          {habits.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <ListChecks className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-2">no habits yet 😴</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-xs font-semibold">+ Create</button>
                <button onClick={() => setShowSuggestions(true)} className="px-4 py-2 rounded-lg glass-card text-muted-foreground text-xs font-semibold">AI Suggest ✨</button>
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
                      className={`glass-card p-3 transition-all ${isCompleted ? "border border-primary/20 bg-primary/[0.03]" : ""}`}>
                      
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleHabit(habit.id)}
                          className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all border-2 ${isCompleted ? "bg-primary/20 border-primary" : "border-border bg-transparent hover:border-primary/40"}`}>
                          {isCompleted && <Check className="h-4 w-4 text-primary" />}
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

                      {/* Countable habits progress */}
                      {isCountable && (
                        <div className="mt-2.5 flex items-center gap-3 pl-10">
                          <button onClick={() => incrementHabit(habit.id, -1)}
                            className="h-7 w-7 rounded-lg bg-secondary/60 border border-border/30 flex items-center justify-center">
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-muted-foreground">{currentValue} / {habit.target} {habit.unit}</span>
                              <span className={`text-[10px] font-bold ${isCompleted ? "text-primary" : "text-muted-foreground"}`}>{progress}%</span>
                            </div>
                            {/* Animated gradient progress bar */}
                            <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full bg-gradient-to-r from-${habit.color} to-primary`}
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </div>
                          <button onClick={() => incrementHabit(habit.id, 1)}
                            className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                            <Plus className="h-3 w-3 text-primary" />
                          </button>
                        </div>
                      )}

                      {/* Week dots */}
                      <div className="mt-2 pl-10 flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {habit.weekCompletions.map((done, i) => (
                            <div key={i} className={`h-2 w-2 rounded-full ${done ? `bg-${habit.color}` : "bg-secondary/50"}`} />
                          ))}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground capitalize">{habit.difficulty}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground capitalize flex items-center gap-0.5">
                            <Clock className="h-2 w-2" />{habit.time_of_day || "anytime"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* ========== STICKY NOTES TAB ========== */}
        <TabsContent value="notes">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Add note input */}
            <div className="glass-card p-3 mb-4 flex gap-2">
              <input value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addStickyNote()}
                placeholder="add a sticky note... 📝"
                className="flex-1 bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
              <button onClick={addStickyNote} className="px-3 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-semibold">
                + Add
              </button>
            </div>

            {/* Sticky notes grid */}
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {stickyNotes.map((note, idx) => {
                  const sc = STICKY_COLORS[note.colorIdx % STICKY_COLORS.length];
                  return (
                    <motion.div key={note.id}
                      initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                      animate={{ opacity: 1, scale: 1, rotate: idx % 2 === 0 ? -1 : 1.5 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      whileHover={{ scale: 1.05, rotate: 0 }}
                      className={`${sc.bg} ${sc.border} border rounded-xl p-4 min-h-[100px] relative group`}>
                      <button onClick={() => deleteStickyNote(note.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <p className={`text-xs ${sc.text} font-medium leading-relaxed`}>{note.text}</p>
                      <span className="absolute bottom-2 right-2 text-[8px] text-muted-foreground">{sc.label}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Quick goal notes */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="bg-neon-green/10 border border-neon-green/20 rounded-xl p-4 min-h-[100px]">
                <p className="text-[10px] font-bold text-neon-green mb-2">👋 Weekly Goals</p>
                <div className="space-y-1.5">
                  {habits.slice(0, 3).map(h => (
                    <div key={h.id} className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${h.todayCompletion?.completed ? "bg-neon-green" : "bg-secondary/50"}`} />
                      <span className="text-[9px] text-foreground truncate">{h.name}</span>
                    </div>
                  ))}
                  {habits.length === 0 && <p className="text-[9px] text-muted-foreground">add habits to see goals 🎯</p>}
                </div>
              </motion.div>

              {/* Today's summary note */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                className="bg-neon-purple/10 border border-neon-purple/20 rounded-xl p-4 min-h-[100px]">
                <p className="text-[10px] font-bold text-neon-purple mb-2">📊 Today's Vibe</p>
                <p className="text-2xl font-bold text-foreground mb-1">{completionRate}%</p>
                <p className="text-[9px] text-muted-foreground">{completedCount}/{habits.length} done {getMoodEmoji(completionRate)}</p>
                <p className="text-[9px] text-neon-purple mt-1 italic">
                  {completionRate >= 80 ? "absolutely slaying!" : completionRate >= 50 ? "keep going bestie!" : "you got this fr 💪"}
                </p>
              </motion.div>
            </div>
          </motion.div>
        </TabsContent>

        {/* ========== STATS/INSIGHTS TAB ========== */}
        <TabsContent value="insights">
          {/* Weekly mini chart */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-neon-cyan" />
              <h3 className="text-xs font-bold text-foreground">This Week 📈</h3>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 16%)" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 10 }} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 9 }} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="completed" radius={[6, 6, 0, 0]} fill="hsl(160, 100%, 50%)" name="Done ✅" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Completion Rate Ring per habit */}
          {habits.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-neon-orange" />
                <h3 className="text-xs font-bold text-foreground">Habit Rings 🎯</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {habits.slice(0, 6).map(habit => {
                  const Icon = iconMap[habit.icon] || Dumbbell;
                  const weekDone = weekDates.filter(wd => 
                    habit.allCompletions.some(c => c.date === wd.date && c.completed)
                  ).length;
                  const rate = Math.round((weekDone / 7) * 100);

                  return (
                    <div key={habit.id} className="text-center">
                      <div className="relative h-14 w-14 mx-auto mb-1">
                        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--secondary))" strokeWidth="10" />
                          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="10"
                            stroke={CHART_COLORS[habits.indexOf(habit) % CHART_COLORS.length]}
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - rate / 100)}`}
                            strokeLinecap="round" className="transition-all duration-700" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Icon className={`h-3.5 w-3.5 text-${habit.color}`} />
                        </div>
                      </div>
                      <p className="text-[9px] font-medium text-foreground truncate">{habit.name}</p>
                      <p className="text-[9px] font-bold text-muted-foreground">{rate}%</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Difficulty & Time split */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="h-3 w-3 text-neon-purple" />
                <h3 className="text-[10px] font-bold text-foreground">Difficulty 💀</h3>
              </div>
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie
                      data={habits.reduce((acc, h) => {
                        const existing = acc.find(a => a.name === h.difficulty);
                        if (existing) existing.value++;
                        else acc.push({ name: h.difficulty, value: 1 });
                        return acc;
                      }, [] as { name: string; value: number }[])}
                      dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={32} strokeWidth={2} stroke="hsl(240, 15%, 4%)">
                      {habits.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ ...tooltipStyle, fontSize: "9px" }} />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="h-3 w-3 text-neon-cyan" />
                <h3 className="text-[10px] font-bold text-foreground">Time ⏰</h3>
              </div>
              <div className="h-20">
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
                      dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={32} strokeWidth={2} stroke="hsl(240, 15%, 4%)">
                      {habits.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ ...tooltipStyle, fontSize: "9px" }} />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Overall stats summary */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-4">
            <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
              <Award className="h-4 w-4 text-neon-green" /> Summary 📋
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Completion Rate", value: `${completionRate}%`, emoji: getMoodEmoji(completionRate), color: "text-primary" },
                { label: "Active Habits", value: habits.length.toString(), emoji: "📋", color: "text-neon-cyan" },
                { label: "Best Streak", value: `${Math.max(...habits.map(h => h.streak), 0)} days`, emoji: "🔥", color: "text-neon-orange" },
                { label: "Today Done", value: `${completedCount}/${habits.length}`, emoji: "✅", color: "text-neon-green" },
              ].map(stat => (
                <div key={stat.label} className="bg-secondary/20 rounded-xl p-3 text-center">
                  <p className="text-lg mb-0.5">{stat.emoji}</p>
                  <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Create Habit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-card border-border/30 max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display text-sm">New Habit ✨</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">what habit? 🎯</label>
              <input value={newHabit.name} onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                placeholder="e.g. Morning Workout" className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">pick an icon</label>
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
              <label className="text-[10px] text-muted-foreground mb-1 block">vibe color 🎨</label>
              <div className="flex gap-2">
                {colorOptions.map((c) => (
                  <button key={c} onClick={() => setNewHabit({ ...newHabit, color: c })}
                    className={`h-7 w-7 rounded-full bg-${c}/40 border-2 transition-all ${newHabit.color === c ? `border-${c}` : "border-transparent"}`} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">target count</label>
                <input type="number" min={1} value={newHabit.target} onChange={(e) => setNewHabit({ ...newHabit, target: Math.max(1, Number(e.target.value)) })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">unit</label>
                <select value={newHabit.unit} onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">freq</label>
                <select value={newHabit.frequency} onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {frequencyOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">time</label>
                <select value={newHabit.time_of_day} onChange={(e) => setNewHabit({ ...newHabit, time_of_day: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">level</label>
                <select value={newHabit.difficulty} onChange={(e) => setNewHabit({ ...newHabit, difficulty: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {difficultyOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleCreate} disabled={!newHabit.name.trim()}
              className="w-full py-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary font-semibold text-xs disabled:opacity-40 transition-all hover:bg-primary/30">
              Create Habit ✨
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="glass-card border-border/30 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Suggestions ✨
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">what's your goal? 🎯</label>
              <div className="flex gap-2">
                <input value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="e.g. fat loss, muscle gain..."
                  className="flex-1 bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                {canUseFeature("habits") ? (
                  <button onClick={async () => { await trackUsage("habits"); fetchSuggestions(goalInput || undefined); }}
                    className="px-3 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-semibold">
                    {suggestionsLoading ? "..." : "Get ✨"}
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
                      </div>
                      <button onClick={() => handleAddSuggestion(s)}
                        className="px-2 py-1 rounded-lg bg-primary/20 text-primary text-[10px] font-semibold shrink-0">
                        + Add
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

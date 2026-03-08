import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Dumbbell, Droplets, Moon, Brain, Footprints, Check, Plus, Trophy,
  TrendingUp, Heart, Apple, Timer, Sun, Sparkles, Trash2, X, Flame, Zap, Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHabits, type AISuggestion } from "@/hooks/useHabits";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const iconMap: Record<string, any> = {
  dumbbell: Dumbbell, droplets: Droplets, moon: Moon, brain: Brain, footprints: Footprints,
  heart: Heart, apple: Apple, stretch: Zap, timer: Timer, sun: Sun,
};

const colorOptions = ["neon-green", "neon-cyan", "neon-purple", "neon-orange", "neon-pink"];
const unitOptions = ["session", "glasses", "hours", "min", "steps", "servings", "reps"];
const frequencyOptions = ["daily", "weekly"];
const difficultyOptions = ["easy", "medium", "hard"];
const timeOptions = ["morning", "afternoon", "evening", "anytime"];

const HabitTrackerPage = () => {
  const navigate = useNavigate();
  const {
    habits, loading, toggleHabit, createHabit, deleteHabit,
    suggestions, suggestionsLoading, fetchSuggestions,
    completedCount, completionRate,
  } = useHabits();

  const [showCreate, setShowCreate] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  // Create form state
  const [newHabit, setNewHabit] = useState({
    name: "", icon: "dumbbell", color: "neon-green", target: 1,
    unit: "session", frequency: "daily", time_of_day: "anytime", difficulty: "medium",
  });

  const handleCreate = async () => {
    if (!newHabit.name.trim()) return;
    await createHabit(newHabit);
    setNewHabit({ name: "", icon: "dumbbell", color: "neon-green", target: 1, unit: "session", frequency: "daily", time_of_day: "anytime", difficulty: "medium" });
    setShowCreate(false);
  };

  const handleAddSuggestion = async (s: AISuggestion) => {
    await createHabit({ name: s.name, icon: s.icon, color: s.color, target: s.target, unit: s.unit, ai_suggested: true });
  };

  const handleFetchSuggestions = () => {
    setShowSuggestions(true);
    fetchSuggestions(goalInput || undefined);
  };

  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full glass-card flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Habit Tracker</h1>
            <p className="text-xs text-muted-foreground">AI-powered consistency engine</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Plus className="h-5 w-5 text-primary" />
        </button>
      </motion.div>

      {/* Daily Score Ring */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="relative z-10 glass-card p-6 mb-6 text-center">
        <div className="relative w-28 h-28 mx-auto mb-3">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--secondary))" strokeWidth="10" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--neon-green))" strokeWidth="10"
              strokeDasharray={`${(completionRate / 100) * 314} 314`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame className="h-4 w-4 text-neon-orange mb-0.5" />
            <span className="text-2xl font-bold text-foreground">{completionRate}%</span>
            <span className="text-[10px] text-muted-foreground">Today</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{completedCount}/{habits.length} habits completed</p>
      </motion.div>

      {/* AI Suggestions Button */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10 mb-6">
        <button onClick={handleFetchSuggestions} className="w-full glass-card p-4 flex items-center gap-3 text-left group hover:border-primary/30 transition-colors">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">AI Habit Suggestions</p>
            <p className="text-xs text-muted-foreground">Get personalized habit recommendations</p>
          </div>
          <Target className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </motion.div>

      {/* Weekly Overview */}
      {habits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="relative z-10 glass-card p-5 mb-6">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-neon-green" /> Weekly Overview
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, di) => (
              <div key={di} className="text-center">
                <p className="text-[10px] text-muted-foreground mb-2">{day}</p>
                {habits.slice(0, 5).map((habit, hi) => (
                  <div key={hi} className={`w-full h-4 rounded-sm mb-1 ${habit.weekCompletions[di] ? `bg-${habit.color}/40` : "bg-secondary"}`} />
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Habits List */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 mb-6">
        <h3 className="font-bold text-foreground mb-3">Today's Habits</h3>
        {habits.length === 0 && (
          <div className="glass-card p-8 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">No habits yet</p>
            <p className="text-xs text-muted-foreground mb-4">Create your first habit or get AI suggestions</p>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-semibold">
              Create Habit
            </button>
          </div>
        )}
        <AnimatePresence>
          {habits.map((habit) => {
            const Icon = iconMap[habit.icon] || Dumbbell;
            const isCompleted = habit.todayCompletion?.completed;
            const progress = isCompleted ? 100 : (habit.todayCompletion ? (habit.todayCompletion.value / habit.target) * 100 : 0);
            return (
              <motion.div key={habit.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                whileTap={{ scale: 0.98 }} className="glass-card p-4 mb-3 flex items-center gap-4">
                <button onClick={() => toggleHabit(habit.id)}
                  className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isCompleted ? `bg-${habit.color}/20 border-2 border-${habit.color}/50` : "bg-secondary border-2 border-border/30"}`}>
                  {isCompleted ? <Check className={`h-5 w-5 text-${habit.color}`} /> : <Icon className="h-5 w-5 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>{habit.name}</p>
                      {habit.ai_suggested && <Sparkles className="h-3 w-3 text-primary" />}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {habit.todayCompletion?.value || 0}/{habit.target} {habit.unit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ delay: 0.3 }}
                      className={`h-full rounded-full bg-${habit.color}`} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground capitalize">{habit.frequency} · {habit.difficulty}</span>
                    {habit.time_of_day !== "anytime" && (
                      <span className="text-[10px] text-muted-foreground capitalize">· {habit.time_of_day}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  {habit.streak > 0 && (
                    <div className="flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-neon-orange" />
                      <span className="text-xs font-bold text-neon-orange">{habit.streak}</span>
                    </div>
                  )}
                  <button onClick={() => deleteHabit(habit.id)} className="p-1 opacity-40 hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Create Habit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-card border-border/30 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display">Create New Habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Habit Name</label>
              <input value={newHabit.name} onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                placeholder="e.g. Morning Workout" className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(iconMap).map(([key, Icon]) => (
                  <button key={key} onClick={() => setNewHabit({ ...newHabit, icon: key })}
                    className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${newHabit.icon === key ? "bg-primary/20 border border-primary/50" : "bg-secondary/50 border border-border/30"}`}>
                    <Icon className="h-4 w-4 text-foreground" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Color</label>
              <div className="flex gap-2">
                {colorOptions.map((c) => (
                  <button key={c} onClick={() => setNewHabit({ ...newHabit, color: c })}
                    className={`h-8 w-8 rounded-full bg-${c}/40 border-2 transition-all ${newHabit.color === c ? `border-${c}` : "border-transparent"}`} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Target</label>
                <input type="number" value={newHabit.target} onChange={(e) => setNewHabit({ ...newHabit, target: Number(e.target.value) })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
                <select value={newHabit.unit} onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                  {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Frequency</label>
                <select value={newHabit.frequency} onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                  {frequencyOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Time</label>
                <select value={newHabit.time_of_day} onChange={(e) => setNewHabit({ ...newHabit, time_of_day: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                  {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Difficulty</label>
                <select value={newHabit.difficulty} onChange={(e) => setNewHabit({ ...newHabit, difficulty: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                  {difficultyOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <button onClick={handleCreate} disabled={!newHabit.name.trim()}
              className="w-full py-3 rounded-xl bg-primary/20 border border-primary/30 text-primary font-semibold text-sm disabled:opacity-40 transition-all hover:bg-primary/30">
              Create Habit
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="glass-card border-border/30 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> AI Suggestions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">What's your fitness goal?</label>
              <div className="flex gap-2">
                <input value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="e.g. fat loss, muscle gain..."
                  className="flex-1 bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                <button onClick={() => fetchSuggestions(goalInput || undefined)}
                  className="px-4 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary text-sm font-semibold">
                  {suggestionsLoading ? "..." : "Ask AI"}
                </button>
              </div>
            </div>

            {suggestionsLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            <AnimatePresence>
              {suggestions.map((s, i) => {
                const SIcon = iconMap[s.icon] || Sparkles;
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="glass-card p-3 flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full bg-${s.color}/20 flex items-center justify-center shrink-0`}>
                      <SIcon className={`h-4 w-4 text-${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.reason}</p>
                      <p className="text-[10px] text-muted-foreground/60">{s.target} {s.unit}</p>
                    </div>
                    <button onClick={() => handleAddSuggestion(s)}
                      className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 hover:bg-primary/30 transition-colors">
                      <Plus className="h-4 w-4 text-primary" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {!suggestionsLoading && suggestions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Enter your goal and tap "Ask AI" to get personalized habit suggestions</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HabitTrackerPage;

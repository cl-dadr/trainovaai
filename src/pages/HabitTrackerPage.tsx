import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Dumbbell, Droplets, Moon, Brain, Footprints, Check, Plus, Trophy, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Habit {
  id: string;
  name: string;
  icon: any;
  color: string;
  target: number;
  unit: string;
  current: number;
  streak: number;
  completed: boolean;
}

const defaultHabits: Habit[] = [
  { id: "workout", name: "Workout", icon: Dumbbell, color: "neon-green", target: 1, unit: "session", current: 1, streak: 7, completed: true },
  { id: "water", name: "Water", icon: Droplets, color: "neon-cyan", target: 8, unit: "glasses", current: 5, streak: 12, completed: false },
  { id: "sleep", name: "Sleep 7h+", icon: Moon, color: "neon-purple", target: 7, unit: "hours", current: 7.5, streak: 3, completed: true },
  { id: "meditation", name: "Meditate", icon: Brain, color: "neon-orange", target: 10, unit: "min", current: 0, streak: 0, completed: false },
  { id: "steps", name: "10K Steps", icon: Footprints, color: "neon-pink", target: 10000, unit: "steps", current: 6420, streak: 5, completed: false },
];

const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
const weekData = [
  [true, true, true, false, true],
  [true, true, false, true, true],
  [true, false, true, true, false],
  [true, true, true, true, true],
  [true, true, true, false, true],
  [false, true, true, true, false],
  [false, false, false, false, false],
];

const HabitTrackerPage = () => {
  const navigate = useNavigate();
  const [habits, setHabits] = useState<Habit[]>(defaultHabits);

  const completedCount = habits.filter((h) => h.completed).length;
  const completionRate = Math.round((completedCount / habits.length) * 100);

  const toggleHabit = (id: string) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, completed: !h.completed, current: !h.completed ? h.target : 0 } : h))
    );
  };

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full glass-card flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Habit Tracker</h1>
          <p className="text-xs text-muted-foreground">Build consistency, build results</p>
        </div>
      </motion.div>

      {/* Daily Score */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="relative z-10 glass-card p-6 mb-6 text-center">
        <div className="relative w-28 h-28 mx-auto mb-3">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--secondary))" strokeWidth="10" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--neon-green))" strokeWidth="10" strokeDasharray={`${(completionRate / 100) * 314} 314`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{completionRate}%</span>
            <span className="text-[10px] text-muted-foreground">Today</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{completedCount}/{habits.length} habits completed</p>
      </motion.div>

      {/* Weekly Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10 glass-card p-5 mb-6">
        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-neon-green" /> Weekly Overview
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, di) => (
            <div key={di} className="text-center">
              <p className="text-[10px] text-muted-foreground mb-2">{day}</p>
              {weekData[di].map((done, hi) => (
                <div key={hi} className={`w-full h-4 rounded-sm mb-1 ${done ? "bg-neon-green/40" : "bg-secondary"}`} />
              ))}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Habits List */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 mb-6">
        <h3 className="font-bold text-foreground mb-3">Today's Habits</h3>
        {habits.map((habit) => {
          const progress = Math.min((habit.current / habit.target) * 100, 100);
          return (
            <motion.div key={habit.id} whileTap={{ scale: 0.98 }} className="glass-card p-4 mb-3 flex items-center gap-4">
              <button onClick={() => toggleHabit(habit.id)} className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all ${habit.completed ? `bg-${habit.color}/20 border-2 border-${habit.color}/50` : "bg-secondary border-2 border-border/30"}`}>
                {habit.completed ? <Check className={`h-5 w-5 text-${habit.color}`} /> : <habit.icon className="h-5 w-5 text-muted-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-sm font-semibold ${habit.completed ? "text-foreground" : "text-muted-foreground"}`}>{habit.name}</p>
                  <span className="text-xs text-muted-foreground">{habit.current}/{habit.target} {habit.unit}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ delay: 0.3 }} className={`h-full rounded-full bg-${habit.color}`} />
                </div>
              </div>
              {habit.streak > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  <Trophy className="h-3 w-3 text-neon-orange" />
                  <span className="text-xs font-bold text-neon-orange">{habit.streak}</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default HabitTrackerPage;

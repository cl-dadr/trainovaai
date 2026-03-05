import { motion } from "framer-motion";
import { Flame, Trophy, TrendingUp, Calendar, Dumbbell, Star, Zap } from "lucide-react";
import { useUserStats } from "@/hooks/useUserStats";

const days = ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"];
const dayStatus = [true, true, false, true, true, true, false];

const levels = [
  { level: 1, name: "Rookie", xpRequired: 0 },
  { level: 2, name: "Beginner", xpRequired: 100 },
  { level: 3, name: "Fighter", xpRequired: 300 },
  { level: 5, name: "Warrior", xpRequired: 800 },
  { level: 10, name: "Champion", xpRequired: 2500 },
];

const StreakPage = () => {
  const { totalReps, totalWorkouts, longestStreak, currentStreak, totalXP, loading } = useUserStats();

  const currentLevel = Math.floor(totalXP / 100) + 1;
  const xpInLevel = totalXP % 100;
  const nextLevelXP = 100;
  const avgRepsPerSession = totalWorkouts > 0 ? Math.round(totalReps / totalWorkouts) : 0;

  const streakStats = [
    { icon: Trophy, value: loading ? "..." : String(longestStreak), label: "Longest Streak", color: "text-neon-cyan" },
    { icon: TrendingUp, value: loading ? "..." : String(totalWorkouts), label: "Total Workouts", color: "text-neon-green" },
    { icon: Calendar, value: loading ? "..." : String(totalReps), label: "Total Reps", color: "text-neon-purple" },
    { icon: Dumbbell, value: loading ? "..." : String(avgRepsPerSession), label: "Avg Reps/Session", color: "text-neon-orange" },
  ];

  const achievements = [
    { reps: 10, label: "First 10", unlocked: totalReps >= 10, icon: "🔥" },
    { reps: 25, label: "Quarter Century", unlocked: totalReps >= 25, icon: "⚡" },
    { reps: 50, label: "Half Century", unlocked: totalReps >= 50, icon: "💪" },
    { reps: 100, label: "Centurion", unlocked: totalReps >= 100, icon: "🏆" },
    { reps: 150, label: "Iron Will", unlocked: totalReps >= 150, icon: "🦾" },
    { reps: 250, label: "Beast Mode", unlocked: totalReps >= 250, icon: "🐺" },
    { reps: 500, label: "Legend", unlocked: totalReps >= 500, icon: "👑" },
    { reps: 1000, label: "Immortal", unlocked: totalReps >= 1000, icon: "⭐" },
  ];

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.h1 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="relative z-10 text-2xl font-display font-bold text-foreground mb-8">
        STREAK
      </motion.h1>

      {/* Streak Circle */}
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="relative z-10 flex justify-center mb-8">
        <div className="relative h-40 w-40 rounded-full gradient-orange neon-glow-orange flex flex-col items-center justify-center">
          <Flame className="h-8 w-8 text-primary-foreground mb-1" />
          <span className="text-5xl font-display font-black text-primary-foreground">{currentStreak}</span>
          <span className="text-xs font-bold text-primary-foreground/70 tracking-widest mt-1">DAYS</span>
        </div>
      </motion.div>

      {/* XP & Level Bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10 glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-neon-green" />
            <span className="text-sm font-bold text-foreground">Level {currentLevel}</span>
          </div>
          <span className="text-xs text-neon-green font-semibold">{xpInLevel} / {nextLevelXP} XP</span>
        </div>
        <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${(xpInLevel / nextLevelXP) * 100}%` }} transition={{ delay: 0.5, duration: 1 }} className="h-full rounded-full gradient-primary" />
        </div>
        <div className="flex justify-between mt-3">
          {levels.map((l) => (
            <div key={l.level} className="text-center">
              <div className={`h-6 w-6 mx-auto rounded-full flex items-center justify-center text-[9px] font-bold ${l.level <= currentLevel ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {l.level}
              </div>
              <p className="text-[8px] text-muted-foreground mt-1">{l.name}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Weekly Calendar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 glass-card p-5 mb-6">
        <h3 className="font-bold text-foreground mb-4">This Week</h3>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d, i) => (
            <div key={d} className="text-center">
              <p className="text-[10px] text-muted-foreground mb-2">{d}</p>
              <div className={`h-10 w-10 mx-auto rounded-lg flex items-center justify-center ${dayStatus[i] ? "gradient-primary neon-glow" : "bg-secondary"}`}>
                {dayStatus[i] ? <Flame className="h-4 w-4 text-primary-foreground" /> : <span className="text-muted-foreground text-sm">—</span>}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative z-10 grid grid-cols-2 gap-3 mb-6">
        {streakStats.map((s) => (
          <div key={s.label} className="glass-card p-5">
            <s.icon className={`h-5 w-5 mb-3 ${s.color}`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Achievements */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="relative z-10 glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-4 w-4 text-neon-orange" />
          <h3 className="font-bold text-foreground">Achievements</h3>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {achievements.map((a) => (
            <motion.div key={a.reps} whileTap={{ scale: 0.95 }} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${a.unlocked ? "bg-neon-green/10 border border-neon-green/20" : "bg-secondary/50 opacity-50"}`}>
              <span className="text-xl">{a.unlocked ? a.icon : "🔒"}</span>
              <span className="text-[10px] font-bold text-foreground">{a.reps}</span>
              <span className="text-[8px] text-muted-foreground text-center leading-tight">{a.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default StreakPage;

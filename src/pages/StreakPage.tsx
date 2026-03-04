import { motion } from "framer-motion";
import { Flame, Trophy, TrendingUp, Calendar, Dumbbell } from "lucide-react";

const days = ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"];

const streakStats = [
  { icon: Trophy, value: "0", label: "Longest Streak", color: "text-neon-cyan" },
  { icon: TrendingUp, value: "0", label: "Total Workouts", color: "text-neon-green" },
  { icon: Calendar, value: "0", label: "Total Reps", color: "text-neon-purple" },
  { icon: Dumbbell, value: "0", label: "Avg Reps/Session", color: "text-neon-orange" },
];

const StreakPage = () => {
  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.h1
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative z-10 text-2xl font-display font-bold text-foreground mb-8"
      >
        STREAK
      </motion.h1>

      {/* Streak Circle */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="relative z-10 flex justify-center mb-10"
      >
        <div className="relative h-40 w-40 rounded-full gradient-orange neon-glow-orange flex flex-col items-center justify-center">
          <Flame className="h-8 w-8 text-primary-foreground mb-1" />
          <span className="text-5xl font-display font-black text-primary-foreground">0</span>
          <span className="text-xs font-bold text-primary-foreground/70 tracking-widest mt-1">DAYS</span>
        </div>
      </motion.div>

      {/* Weekly Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 glass-card p-5 mb-6"
      >
        <h3 className="font-bold text-foreground mb-4">This Week</h3>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => (
            <div key={d} className="text-center">
              <p className="text-[10px] text-muted-foreground mb-2">{d}</p>
              <div className="h-10 w-10 mx-auto rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-muted-foreground text-sm">—</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 grid grid-cols-2 gap-3"
      >
        {streakStats.map((s) => (
          <div key={s.label} className="glass-card p-5">
            <s.icon className={`h-5 w-5 mb-3 ${s.color}`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default StreakPage;

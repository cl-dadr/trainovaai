import { motion } from "framer-motion";
import { Zap, Trophy, Target, Flame, Droplets, SmilePlus, Sparkles } from "lucide-react";

const stats = [
  { icon: Trophy, value: "0", label: "Total Reps", color: "text-neon-cyan" },
  { icon: Target, value: "—", label: "Accuracy", color: "text-neon-purple" },
  { icon: Flame, value: "0", label: "Best Streak", color: "text-neon-orange" },
];

const todayProgress = [
  { emoji: "💪", label: "Workout", value: "", color: "from-neon-green/20 to-neon-cyan/10" },
  { emoji: "💧", label: "0/8", value: "", color: "from-neon-cyan/20 to-neon-cyan/5" },
  { emoji: "🤩", label: "—", value: "", color: "from-neon-orange/20 to-neon-orange/5" },
];

const aiHints = [
  "You're 3 reps away from your best record. 🔥",
  "Try a quick 5 minute workout. 💪",
];

const HomePage = () => {
  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between mb-6"
      >
        <div>
          <p className="text-sm text-neon-green font-medium">Welcome back</p>
          <h1 className="text-2xl font-display font-bold text-foreground">Rookie</h1>
        </div>
        <div className="flex items-center gap-2 glass-card px-3 py-2">
          <Flame className="h-4 w-4 text-neon-orange" />
          <span className="text-sm font-bold text-foreground">0</span>
        </div>
      </motion.div>

      {/* Start Workout CTA */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        whileTap={{ scale: 0.97 }}
        className="relative z-10 w-full rounded-2xl gradient-primary p-8 mb-6 neon-glow"
      >
        <Zap className="mx-auto h-10 w-10 text-primary-foreground mb-2" />
        <h2 className="font-display text-2xl font-black text-primary-foreground tracking-wide">
          START WORKOUT
        </h2>
        <p className="text-primary-foreground/80 text-sm mt-1">Crush your pushups</p>
      </motion.button>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 grid grid-cols-3 gap-3 mb-6"
      >
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <s.icon className={`mx-auto h-5 w-5 mb-2 ${s.color}`} />
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Milestone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 glass-card p-5 mb-6"
      >
        <div className="flex justify-between items-center mb-1">
          <div>
            <p className="text-xs text-muted-foreground">Next Milestone</p>
            <p className="text-lg font-bold text-foreground">10 Reps</p>
          </div>
          <span className="text-sm font-semibold text-neon-orange">10 to go</span>
        </div>
        <div className="h-2 rounded-full bg-secondary mt-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "5%" }}
            transition={{ delay: 0.6, duration: 1 }}
            className="h-full rounded-full gradient-primary"
          />
        </div>
      </motion.div>

      {/* Today's Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 mb-6"
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-foreground">Today's Progress</h3>
          <button className="text-xs text-neon-orange font-semibold">View all &gt;</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {todayProgress.map((p) => (
            <div key={p.label} className="glass-card p-4 text-center">
              <span className="text-2xl">{p.emoji}</span>
              <p className="text-xs text-muted-foreground mt-2">{p.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI Hints */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative z-10"
      >
        {aiHints.map((hint, i) => (
          <div key={i} className="glass-card p-4 mb-3 flex items-start gap-3 border-l-2 border-neon-green/40">
            <Sparkles className="h-4 w-4 text-neon-green mt-0.5 shrink-0" />
            <p className="text-sm text-foreground/80">{hint}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default HomePage;

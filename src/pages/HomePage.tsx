import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Zap, Trophy, Target, Flame, Sparkles, User,
  Footprints, BarChart3, Bot, Bell, PersonStanding,
  Apple, Brain, CheckSquare, TrendingUp, Dumbbell, Swords,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useUserStats";
import { showRandomInspiration, startInspiringNotifications } from "@/lib/inspiringNotifications";

const todayProgress = [
  { emoji: "💪", label: "Workout", subLabel: "Track it!", color: "from-neon-green/20 to-neon-cyan/10" },
  { emoji: "💧", label: "Water", subLabel: "Stay hydrated", color: "from-neon-cyan/20 to-neon-cyan/5" },
  { emoji: "🤩", label: "Mood", subLabel: "Great", color: "from-neon-orange/20 to-neon-orange/5" },
];

const aiHints = [
  "You're getting stronger every session. 🔥",
  "Try a quick 5 minute workout. 💪",
  "Consistency beats intensity — keep showing up!",
];

const quickNav = [
  { icon: Footprints, label: "Activity", path: "/activity", color: "text-neon-green" },
  { icon: PersonStanding, label: "Run", path: "/running", color: "text-neon-cyan" },
  { icon: Bot, label: "AI Coach", path: "/jax", color: "text-neon-purple" },
  { icon: Dumbbell, label: "Planner", path: "/planner", color: "text-neon-orange" },
];

const quickNav2 = [
  { icon: Apple, label: "Nutrition", path: "/nutrition", color: "text-neon-green" },
  { icon: Brain, label: "Wellness", path: "/wellness", color: "text-neon-cyan" },
  { icon: Swords, label: "Battles", path: "/battles", color: "text-neon-pink" },
  { icon: TrendingUp, label: "Progress", path: "/progress", color: "text-neon-purple" },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { totalReps, avgFormScore, longestStreak, currentStreak, loading } = useUserStats();

  useEffect(() => {
    startInspiringNotifications();
  }, []);

  const stats = [
    { icon: Trophy, value: loading ? "..." : String(totalReps), label: "Total Reps", color: "text-neon-cyan" },
    { icon: Target, value: loading ? "..." : `${avgFormScore}%`, label: "Accuracy", color: "text-neon-purple" },
    { icon: Flame, value: loading ? "..." : String(longestStreak), label: "Best Streak", color: "text-neon-orange" },
  ];

  const nextMilestone = [100, 250, 500, 1000, 2500, 5000].find(m => m > totalReps) || 10000;
  const milestoneProgress = Math.min((totalReps / nextMilestone) * 100, 100);

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-neon-green font-medium">Welcome back</p>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {user?.user_metadata?.display_name || "Beast"} 🐺
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => showRandomInspiration()} className="h-10 w-10 rounded-full glass-card flex items-center justify-center">
            <Bell className="h-4 w-4 text-neon-orange" />
          </button>
          <div className="flex items-center gap-1.5 glass-card px-3 py-2">
            <Flame className="h-4 w-4 text-neon-orange" />
            <span className="text-sm font-bold text-foreground">{currentStreak}</span>
          </div>
          <button onClick={() => navigate("/profile")} className="h-10 w-10 rounded-full bg-neon-green/20 border border-neon-green/30 flex items-center justify-center">
            <User className="h-5 w-5 text-neon-green" />
          </button>
        </div>
      </motion.div>

      {/* Start Workout CTA */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/camera")}
        className="relative z-10 w-full rounded-2xl gradient-primary p-8 mb-6 neon-glow text-left"
      >
        <Zap className="h-10 w-10 text-primary-foreground mb-2" />
        <h2 className="font-display text-2xl font-black text-primary-foreground tracking-wide">START WORKOUT</h2>
        <p className="text-primary-foreground/80 text-sm mt-1">AI detects 6 exercises in real-time</p>
      </motion.button>

      {/* Quick Nav */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10 grid grid-cols-4 gap-2 mb-3">
        {quickNav.map((item) => (
          <button key={item.label} onClick={() => navigate(item.path)} className="glass-card p-3 text-center hover:bg-secondary/50 transition-colors">
            <item.icon className={`mx-auto h-5 w-5 mb-1.5 ${item.color}`} />
            <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
          </button>
        ))}
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }} className="relative z-10 grid grid-cols-4 gap-2 mb-6">
        {quickNav2.map((item) => (
          <button key={item.label} onClick={() => navigate(item.path)} className="glass-card p-3 text-center hover:bg-secondary/50 transition-colors">
            <item.icon className={`mx-auto h-5 w-5 mb-1.5 ${item.color}`} />
            <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 grid grid-cols-3 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <s.icon className={`mx-auto h-5 w-5 mb-2 ${s.color}`} />
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Milestone */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="relative z-10 glass-card p-5 mb-6">
        <div className="flex justify-between items-center mb-1">
          <div>
            <p className="text-xs text-muted-foreground">Next Milestone</p>
            <p className="text-lg font-bold text-foreground">{nextMilestone} Reps</p>
          </div>
          <span className="text-sm font-semibold text-neon-orange">{nextMilestone - totalReps} to go</span>
        </div>
        <div className="h-2 rounded-full bg-secondary mt-3 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${milestoneProgress}%` }} transition={{ delay: 0.6, duration: 1 }} className="h-full rounded-full gradient-primary" />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Keep going! You're making progress 🔥</p>
      </motion.div>

      {/* Today's Progress */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative z-10 mb-6">
        <h3 className="font-bold text-foreground mb-3">Today's Progress</h3>
        <div className="grid grid-cols-3 gap-3">
          {todayProgress.map((p) => (
            <div key={p.label} className="glass-card p-4 text-center">
              <span className="text-2xl">{p.emoji}</span>
              <p className="text-xs font-semibold text-foreground mt-2">{p.label}</p>
              <p className="text-[10px] text-muted-foreground">{p.subLabel}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI Hints */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-neon-green" />
          <h3 className="font-bold text-foreground">AI Coach</h3>
        </div>
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

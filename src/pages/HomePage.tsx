import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Zap, Flame, User,
  Footprints, Bot, Bell, PersonStanding,
  Apple, Brain, CheckSquare, TrendingUp, Dumbbell,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useUserStats";
import { showRandomInspiration, startInspiringNotifications } from "@/lib/inspiringNotifications";

const quickNav = [
  { icon: PersonStanding, label: "Run", path: "/running", color: "text-neon-cyan" },
  { icon: Bot, label: "AI Coach", path: "/jax", color: "text-neon-purple" },
  { icon: Dumbbell, label: "Planner", path: "/planner", color: "text-neon-orange" },
  { icon: CheckSquare, label: "Habits", path: "/habits", color: "text-neon-pink" },
];

const quickNav2 = [
  { icon: Apple, label: "Nutrition", path: "/nutrition", color: "text-neon-green" },
  { icon: Brain, label: "Wellness", path: "/wellness", color: "text-neon-cyan" },
  { icon: TrendingUp, label: "Progress", path: "/progress", color: "text-neon-purple" },
  { icon: Footprints, label: "Streak", path: "/streak", color: "text-neon-green" },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentStreak, loading } = useUserStats();

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

    </div>
  );
};

export default HomePage;

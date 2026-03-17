import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Flame, User, Footprints, Bot, Bell, PersonStanding,
  Apple, Brain, CheckSquare, TrendingUp, Dumbbell, ShoppingBag,
  Sparkles, Camera, ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useUserStats";
import { usePremium } from "@/hooks/usePremium";
import { showRandomInspiration } from "@/lib/inspiringNotifications";
import NativeAd from "@/components/monetization/NativeAd";
import RewardedAdCard from "@/components/monetization/RewardedAdCard";
import PremiumUpsellBanner from "@/components/monetization/PremiumUpsellBanner";

const quickNav = [
  { icon: Camera, label: "AI Trainer", path: "/camera", color: "text-neon-green" },
  { icon: PersonStanding, label: "Run", path: "/running", color: "text-neon-cyan" },
  { icon: Bot, label: "AI Coach", path: "/jax", color: "text-neon-purple" },
  { icon: Dumbbell, label: "Planner", path: "/planner", color: "text-neon-orange" },
];

const quickNav2 = [
  { icon: CheckSquare, label: "Habits", path: "/habits", color: "text-neon-pink" },
  { icon: Apple, label: "Nutrition", path: "/nutrition", color: "text-neon-green" },
  { icon: Brain, label: "Wellness", path: "/wellness", color: "text-neon-cyan" },
  { icon: TrendingUp, label: "Progress", path: "/progress", color: "text-neon-purple" },
];

const quickNav3 = [
  { icon: Footprints, label: "Streak", path: "/streak", color: "text-neon-green" },
  { icon: ShoppingBag, label: "Store", path: "/store", color: "text-neon-orange" },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentStreak } = useUserStats();
  const { isPremium } = usePremium();

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center justify-between mb-5">
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

      {/* Premium upsell (free users only) */}
      {!isPremium && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative z-10 mb-4">
          <PremiumUpsellBanner />
        </motion.div>
      )}

      {/* Sponsored ad slot (free users only) */}
      {!isPremium && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="relative z-10 mb-4">
          <NativeAd variant="full" />
        </motion.div>
      )}

      {/* Quick Nav Row 1 */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative z-10 grid grid-cols-4 gap-2 mb-3">
        {quickNav.map((item) => (
          <button key={item.label} onClick={() => navigate(item.path)} className="glass-card p-3 text-center hover:bg-secondary/50 transition-colors">
            <item.icon className={`mx-auto h-5 w-5 mb-1.5 ${item.color}`} />
            <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Quick Nav Row 2 */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="relative z-10 grid grid-cols-4 gap-2 mb-3">
        {quickNav2.map((item) => (
          <button key={item.label} onClick={() => navigate(item.path)} className="glass-card p-3 text-center hover:bg-secondary/50 transition-colors">
            <item.icon className={`mx-auto h-5 w-5 mb-1.5 ${item.color}`} />
            <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Quick Nav Row 3 (Streak + Store) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="relative z-10 grid grid-cols-2 gap-2 mb-5">
        {quickNav3.map((item) => (
          <button key={item.label} onClick={() => navigate(item.path)} className="glass-card p-3 text-center hover:bg-secondary/50 transition-colors">
            <item.icon className={`mx-auto h-5 w-5 mb-1.5 ${item.color}`} />
            <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Rewarded ad (free users only) */}
      {!isPremium && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="relative z-10 mb-4">
          <RewardedAdCard
            rewardLabel="+50 XP Bonus"
            rewardIcon={<Sparkles className="h-5 w-5 text-neon-orange" />}
          />
        </motion.div>
      )}
    </div>
  );
};

export default HomePage;

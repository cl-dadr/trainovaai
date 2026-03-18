import { motion } from "framer-motion";
import { User, Trophy, Target, Dumbbell, Crown, Settings, ChevronRight, Zap, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { totalReps, avgFormScore, totalWorkouts, totalXP, loading } = useUserStats();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const displayName = user?.user_metadata?.display_name || "Champ";

  const level = Math.floor(totalXP / 100) + 1;
  const xpInLevel = totalXP % 100;
  const levelNames = ["Rookie", "Beginner", "Fighter", "Warrior", "Champion", "Legend", "Beast"];
  const levelName = levelNames[Math.min(level - 1, levelNames.length - 1)];

  const profileStats = [
    { icon: Trophy, value: loading ? "..." : String(totalReps), label: "Total Reps", color: "text-neon-cyan" },
    { icon: Target, value: loading ? "..." : `${avgFormScore}%`, label: "Accuracy", color: "text-neon-purple" },
    { icon: Dumbbell, value: loading ? "..." : String(totalWorkouts), label: "Workouts", color: "text-neon-orange" },
    { icon: Crown, value: loading ? "..." : `LV${level}`, label: "Level", color: "text-neon-green" },
  ];

  const achievements = [
    { reps: 10, unlocked: totalReps >= 10, icon: "🔥" },
    { reps: 25, unlocked: totalReps >= 25, icon: "⚡" },
    { reps: 50, unlocked: totalReps >= 50, icon: "💪" },
    { reps: 100, unlocked: totalReps >= 100, icon: "🏆" },
    { reps: 150, unlocked: totalReps >= 150, icon: "🦾" },
    { reps: 250, unlocked: totalReps >= 250, icon: "🐺" },
    { reps: 500, unlocked: totalReps >= 500, icon: "👑" },
    { reps: 1000, unlocked: totalReps >= 1000, icon: "⭐" },
  ];

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="relative z-10 flex items-center justify-between mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">PROFILE</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleSignOut} className="h-9 w-9 rounded-xl glass-card flex items-center justify-center">
            <LogOut className="h-4 w-4 text-destructive" />
          </button>
          <button className="h-9 w-9 rounded-xl glass-card flex items-center justify-center">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </motion.div>

      {/* Avatar */}
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="relative z-10 flex flex-col items-center mb-6">
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-neon-green/20 border-2 border-neon-green/40 flex items-center justify-center neon-glow">
            <User className="h-12 w-12 text-neon-green" />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 gradient-primary px-3 py-0.5 rounded-full">
            <span className="text-[10px] font-bold text-primary-foreground">LV{level}</span>
          </div>
        </div>
        <h2 className="text-lg font-bold text-foreground mt-5">{displayName}</h2>
        <p className="text-xs text-muted-foreground">{user?.email}</p>

        {/* XP Bar */}
        <div className="w-56 mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-neon-green" />
              <span className="text-[10px] text-muted-foreground">LV{level} {levelName}</span>
            </div>
            <span className="text-[10px] text-neon-green font-semibold">{xpInLevel}/100 XP</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${xpInLevel}%` }} transition={{ delay: 0.5, duration: 1 }} className="h-full rounded-full gradient-primary" />
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 grid grid-cols-2 gap-3 mb-6">
        {profileStats.map((s) => (
          <div key={s.label} className="glass-card p-5 text-center">
            <s.icon className={`mx-auto h-5 w-5 mb-2 ${s.color}`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Achievements */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative z-10 glass-card p-5 mb-6">
        <h3 className="font-bold text-foreground mb-4">Achievements</h3>
        <div className="grid grid-cols-4 gap-3">
          {achievements.map((a) => (
            <div key={a.reps} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${a.unlocked ? "bg-neon-green/10 border border-neon-green/20" : "bg-secondary/50 opacity-40"}`}>
              <span className="text-xl">{a.unlocked ? a.icon : "🔒"}</span>
              <span className="text-[10px] font-bold text-foreground">{a.reps}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pro Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="relative z-10 rounded-2xl gradient-purple p-5 text-center" style={{ boxShadow: "0 0 30px hsl(280 100% 65% / 0.3)" }}>
        <Crown className="mx-auto h-8 w-8 text-foreground mb-2" />
        <h3 className="font-display font-bold text-foreground text-lg">Go Pro</h3>
        <p className="text-xs text-foreground/70 mt-1 mb-3">Unlock advanced AI coaching, analytics & custom plans</p>
        <button onClick={() => navigate("/premium")} className="glass-card px-6 py-2 rounded-xl text-sm font-bold text-foreground flex items-center gap-2 mx-auto">Upgrade <ChevronRight className="h-4 w-4" /></button>
      </motion.div>
    </div>
  );
};

export default ProfilePage;

import { motion } from "framer-motion";
import { User, Trophy, Target, Dumbbell, Crown, Lock } from "lucide-react";

const profileStats = [
  { icon: Trophy, value: "0", label: "Total Reps", color: "text-neon-cyan" },
  { icon: Target, value: "—", label: "Accuracy", color: "text-neon-purple" },
  { icon: Dumbbell, value: "0", label: "Workouts", color: "text-neon-orange" },
  { icon: Crown, value: "LV1", label: "Level", color: "text-neon-green" },
];

const milestones = [10, 25, 50, 100, 150, 250, 500, 1050];

const ProfilePage = () => {
  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.h1
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative z-10 text-2xl font-display font-bold text-foreground mb-8"
      >
        PROFILE
      </motion.h1>

      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="relative z-10 flex flex-col items-center mb-6"
      >
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-neon-green/20 border-2 border-neon-green/40 flex items-center justify-center neon-glow">
            <User className="h-12 w-12 text-neon-green" />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 gradient-primary px-3 py-0.5 rounded-full">
            <span className="text-[10px] font-bold text-primary-foreground">LV1</span>
          </div>
        </div>
        <h2 className="text-lg font-bold text-foreground mt-5">Rookie</h2>

        {/* Level Bar */}
        <div className="w-48 mt-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>LV1</span>
            <span>LV2</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "5%" }}
              transition={{ delay: 0.5, duration: 1 }}
              className="h-full rounded-full gradient-primary"
            />
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 grid grid-cols-2 gap-3 mb-6"
      >
        {profileStats.map((s) => (
          <div key={s.label} className="glass-card p-5 text-center">
            <s.icon className={`mx-auto h-5 w-5 mb-2 ${s.color}`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Milestones */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 glass-card p-5 mb-6"
      >
        <h3 className="font-bold text-foreground mb-4">Milestones</h3>
        <div className="grid grid-cols-4 gap-3">
          {milestones.map((m) => (
            <div key={m} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary/50">
              <Lock className="h-5 w-5 text-neon-orange" />
              <span className="text-xs font-semibold text-muted-foreground">{m}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pro Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 rounded-2xl gradient-purple p-5 text-center neon-glow"
        style={{ boxShadow: "0 0 30px hsl(280 100% 65% / 0.3)" }}
      >
        <h3 className="font-display font-bold text-foreground text-lg">Pro Features</h3>
        <p className="text-xs text-foreground/70 mt-1">Unlock advanced AI coaching & analytics</p>
      </motion.div>
    </div>
  );
};

export default ProfilePage;

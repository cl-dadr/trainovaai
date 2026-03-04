import { motion } from "framer-motion";
import { Footprints, Flame, Timer, TrendingUp, Smartphone, Watch, Heart, Activity } from "lucide-react";

const sensorStats = [
  { icon: Footprints, value: "3,247", label: "Steps", target: "10,000", progress: 32, color: "text-neon-green" },
  { icon: Flame, value: "186", label: "Calories", target: "500 kcal", progress: 37, color: "text-neon-orange" },
  { icon: Timer, value: "24", label: "Active Min", target: "60 min", progress: 40, color: "text-neon-cyan" },
];

const hourlySteps = [
  { hour: "6a", steps: 120 },
  { hour: "7a", steps: 450 },
  { hour: "8a", steps: 680 },
  { hour: "9a", steps: 320 },
  { hour: "10a", steps: 200 },
  { hour: "11a", steps: 150 },
  { hour: "12p", steps: 400 },
  { hour: "1p", steps: 280 },
  { hour: "2p", steps: 180 },
  { hour: "3p", steps: 350 },
  { hour: "4p", steps: 117 },
];

const maxSteps = Math.max(...hourlySteps.map((h) => h.steps));

const wearableData = [
  { icon: Heart, label: "Heart Rate", value: "72 bpm", status: "Normal", color: "text-neon-pink" },
  { icon: Activity, label: "SpO2", value: "98%", status: "Healthy", color: "text-neon-cyan" },
];

const ActivityPage = () => {
  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center gap-3 mb-6"
      >
        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
          <Smartphone className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">ACTIVITY</h1>
          <p className="text-xs text-muted-foreground">Phone & sensor tracking</p>
        </div>
      </motion.div>

      {/* Ring-style Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 grid grid-cols-3 gap-3 mb-6"
      >
        {sensorStats.map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className="relative h-16 w-16 mx-auto mb-2">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
                <motion.circle
                  cx="32" cy="32" r="28" fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - s.progress / 100) }}
                  transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
                  className={s.color}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className="text-[9px] text-muted-foreground/60 mt-0.5">/ {s.target}</p>
          </div>
        ))}
      </motion.div>

      {/* Distance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 glass-card p-5 mb-6 flex items-center justify-between"
      >
        <div>
          <p className="text-xs text-muted-foreground">Distance Walked</p>
          <p className="text-3xl font-display font-bold text-foreground mt-1">2.1 <span className="text-sm text-muted-foreground font-sans">km</span></p>
        </div>
        <div className="h-12 w-12 rounded-xl bg-neon-green/10 flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-neon-green" />
        </div>
      </motion.div>

      {/* Hourly Steps Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 glass-card p-5 mb-6"
      >
        <h3 className="font-bold text-foreground mb-4">Steps Today</h3>
        <div className="flex items-end gap-1.5 h-28">
          {hourlySteps.map((h, i) => (
            <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(h.steps / maxSteps) * 100}%` }}
                transition={{ delay: 0.3 + i * 0.04, duration: 0.6 }}
                className="w-full rounded-t-sm gradient-primary min-h-[2px]"
              />
              <span className="text-[8px] text-muted-foreground">{h.hour}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Wearable / Smartwatch Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="relative z-10"
      >
        <div className="flex items-center gap-2 mb-4">
          <Watch className="h-4 w-4 text-neon-purple" />
          <h3 className="font-bold text-foreground">Wearable Data</h3>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green font-semibold">Connected</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {wearableData.map((w) => (
            <div key={w.label} className="glass-card p-4">
              <w.icon className={`h-5 w-5 mb-2 ${w.color}`} />
              <p className="text-xl font-bold text-foreground">{w.value}</p>
              <p className="text-xs text-muted-foreground">{w.label}</p>
              <p className="text-[10px] text-neon-green mt-1">{w.status}</p>
            </div>
          ))}
        </div>
        <div className="glass-card p-4 mt-3 flex items-center gap-3 border-l-2 border-neon-purple/40">
          <Activity className="h-4 w-4 text-neon-purple shrink-0" />
          <p className="text-xs text-muted-foreground">
            Supports Google Fit, Apple Health & Bluetooth devices
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ActivityPage;

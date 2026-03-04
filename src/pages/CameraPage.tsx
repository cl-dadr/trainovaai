import { motion } from "framer-motion";
import { Camera, Crosshair, Activity, Volume2 } from "lucide-react";

const CameraPage = () => {
  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.h1
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative z-10 text-2xl font-display font-bold text-foreground mb-6"
      >
        AI WORKOUT
      </motion.h1>

      {/* Camera Viewfinder */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 aspect-[3/4] rounded-3xl bg-secondary/30 border border-border/50 overflow-hidden mb-6 flex items-center justify-center"
      >
        <div className="absolute inset-4 border-2 border-neon-green/20 rounded-2xl" />
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <div className="glass-card px-3 py-1.5 flex items-center gap-2">
            <Crosshair className="h-3 w-3 text-neon-green" />
            <span className="text-[10px] font-bold text-neon-green">DETECTING</span>
          </div>
          <div className="glass-card px-3 py-1.5 flex items-center gap-2">
            <Volume2 className="h-3 w-3 text-neon-cyan" />
          </div>
        </div>

        <div className="text-center">
          <Camera className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">Position yourself in frame</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Camera access required</p>
        </div>

        {/* Stats overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex gap-3">
          <div className="glass-card flex-1 p-3 text-center">
            <p className="text-2xl font-display font-bold text-neon-green">0</p>
            <p className="text-[10px] text-muted-foreground">REPS</p>
          </div>
          <div className="glass-card flex-1 p-3 text-center">
            <p className="text-2xl font-display font-bold text-neon-cyan">—%</p>
            <p className="text-[10px] text-muted-foreground">FORM</p>
          </div>
        </div>
      </motion.div>

      {/* Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 glass-card p-4 flex items-center gap-3 border-l-2 border-neon-green/40"
      >
        <Activity className="h-5 w-5 text-neon-green shrink-0" />
        <p className="text-sm text-foreground/80">Ready to detect pushups, squats & planks</p>
      </motion.div>

      {/* Start Button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileTap={{ scale: 0.97 }}
        className="relative z-10 w-full mt-6 rounded-2xl gradient-primary p-4 font-display font-bold text-primary-foreground text-lg tracking-wider neon-glow"
      >
        START DETECTION
      </motion.button>
    </div>
  );
};

export default CameraPage;

import { motion } from "framer-motion";
import { Trophy, Target, Award, Flame, Star, Zap, Medal } from "lucide-react";
import WorkoutShareCard from "@/components/WorkoutShareCard";
import { useState } from "react";
import { ACHIEVEMENTS, ALL_EXERCISES } from "./types";

interface SessionReportProps {
  totalReps: number;
  formScore: number;
  liveCalories: number;
  sessionElapsed: number;
  sessionXP: number;
  bestCombo: number;
  bestRepForm: number;
  earnedAchievements: string[];
  exerciseHistory: Record<string, number>;
  avgForm: number;
  onDone: () => void;
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

const SessionReport = ({
  totalReps, liveCalories, sessionElapsed, sessionXP,
  bestCombo, bestRepForm, earnedAchievements, exerciseHistory, avgForm, onDone,
}: SessionReportProps) => {
  const [showShareCard, setShowShareCard] = useState(false);

  return (
    <div className="relative min-h-screen pb-24 px-3 pt-4">
      <div className="ambient-glow" />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10">
        <div className="text-center mb-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
            <Trophy className="mx-auto h-16 w-16 text-neon-orange mb-2" />
          </motion.div>
          <h1 className="text-2xl font-display font-black text-foreground">WORKOUT COMPLETE! 🎉</h1>
          <p className="text-sm text-muted-foreground">Here's your session breakdown</p>
        </div>

        {/* Main stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { val: totalReps, label: "Total Reps", icon: <Target className="h-4 w-4" />, color: "text-primary" },
            { val: `${avgForm}%`, label: "Avg Form", icon: <Award className="h-4 w-4" />, color: "text-neon-cyan" },
            { val: liveCalories.toFixed(1), label: "Calories", icon: <Flame className="h-4 w-4" />, color: "text-neon-orange" },
            { val: `${bestRepForm}%`, label: "⭐ Best Rep", icon: <Star className="h-4 w-4" />, color: "text-neon-orange" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
              className="glass-card p-3 text-center">
              <div className={`${s.color} mb-1 flex justify-center`}>{s.icon}</div>
              <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Gamification */}
        <div className="glass-card p-3 mb-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <Zap className="h-4 w-4 text-neon-orange mx-auto mb-0.5" />
              <p className="text-lg font-black text-neon-orange">{sessionXP}</p>
              <p className="text-[8px] text-muted-foreground">XP EARNED</p>
            </div>
            <div>
              <Star className="h-4 w-4 text-primary mx-auto mb-0.5" />
              <p className="text-lg font-black text-primary">{bestCombo}x</p>
              <p className="text-[8px] text-muted-foreground">BEST COMBO</p>
            </div>
            <div>
              <Medal className="h-4 w-4 text-neon-cyan mx-auto mb-0.5" />
              <p className="text-lg font-black text-neon-cyan">{earnedAchievements.length}</p>
              <p className="text-[8px] text-muted-foreground">ACHIEVEMENTS</p>
            </div>
          </div>
        </div>

        {/* Achievements */}
        {earnedAchievements.length > 0 && (
          <div className="glass-card p-3 mb-3">
            <p className="text-[10px] font-bold text-foreground mb-2">🏆 Achievements Unlocked</p>
            <div className="flex flex-wrap gap-1.5">
              {earnedAchievements.map(id => {
                const a = ACHIEVEMENTS.find(x => x.id === id);
                return a ? (
                  <span key={id} className="bg-primary/20 text-primary text-[10px] px-2 py-1 rounded-full font-bold">
                    {a.icon} {a.label}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Exercise breakdown */}
        {Object.keys(exerciseHistory).length > 0 && (
          <div className="glass-card p-3 mb-3">
            <p className="text-[10px] font-bold text-foreground mb-2">📊 Exercise Breakdown</p>
            {Object.entries(exerciseHistory).map(([ex, count]) => {
              const meta = ALL_EXERCISES.find(e => e.type === ex);
              return (
                <div key={ex} className="flex items-center justify-between py-1 border-b border-border/20 last:border-0">
                  <span className="text-xs text-foreground">{meta?.emoji} {meta?.name || ex}</span>
                  <span className="text-xs font-bold text-primary">{count} reps</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowShareCard(true)}
            className="flex-1 rounded-2xl p-4 font-display font-bold text-lg bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
            📸 Share
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={onDone}
            className="flex-1 rounded-2xl p-4 font-display font-bold text-lg bg-primary text-primary-foreground">
            DONE ✓
          </motion.button>
        </div>

        {showShareCard && (
          <WorkoutShareCard
            totalReps={totalReps}
            avgForm={avgForm}
            calories={liveCalories}
            duration={formatTime(sessionElapsed)}
            xpEarned={sessionXP}
            bestCombo={bestCombo}
            exercises={Object.entries(exerciseHistory).map(([ex, count]) => {
              const meta = ALL_EXERCISES.find(e => e.type === ex);
              return { name: meta?.name || ex, emoji: meta?.emoji || "💪", reps: count };
            })}
            onClose={() => setShowShareCard(false)}
          />
        )}
      </motion.div>
    </div>
  );
};

export default SessionReport;

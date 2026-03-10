import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, ResponsiveContainer } from "recharts";
import { ALL_EXERCISES, type SessionRecord, type BodyGoalId, BODY_GOALS } from "./types";

interface ExerciseStatsTabProps {
  pastSessions: SessionRecord[];
  bodyGoal: BodyGoalId;
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

const ExerciseStatsTab = ({ pastSessions, bodyGoal }: ExerciseStatsTabProps) => {
  const activeGoal = useMemo(() => BODY_GOALS.find(g => g.id === bodyGoal) || BODY_GOALS[2], [bodyGoal]);
  const goalExercises = activeGoal.exercises as readonly string[];

  const exerciseStats = useMemo(() => {
    const stats: Record<string, { totalReps: number; totalCals: number; totalSessions: number; avgForm: number; formSum: number; bestForm: number; totalDuration: number; last7Days: number[] }> = {};
    ALL_EXERCISES.forEach(ex => {
      stats[ex.type] = { totalReps: 0, totalCals: 0, totalSessions: 0, avgForm: 0, formSum: 0, bestForm: 0, totalDuration: 0, last7Days: Array(7).fill(0) };
    });
    pastSessions.forEach(s => {
      const key = s.exercise_type;
      if (!stats[key]) return;
      stats[key].totalReps += s.reps;
      stats[key].totalCals += s.calories_burned || 0;
      stats[key].totalSessions += 1;
      stats[key].formSum += s.form_score || 0;
      stats[key].bestForm = Math.max(stats[key].bestForm, s.form_score || 0);
      stats[key].totalDuration += s.duration_seconds || 0;
      const daysAgo = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000);
      if (daysAgo >= 0 && daysAgo < 7) stats[key].last7Days[6 - daysAgo] += s.reps;
    });
    Object.values(stats).forEach(st => { st.avgForm = st.totalSessions > 0 ? Math.round(st.formSum / st.totalSessions) : 0; });
    return stats;
  }, [pastSessions]);

  return (
    <div className="relative z-10 space-y-3">
      <p className="text-[10px] text-muted-foreground">All {ALL_EXERCISES.length} AI-tracked exercises • Your lifetime stats</p>
      {ALL_EXERCISES.map(ex => {
        const st = exerciseStats[ex.type];
        const isRecommended = goalExercises.includes(ex.type);
        const sparkData = st.last7Days.map((v, i) => ({ day: i, reps: v }));
        return (
          <motion.div key={ex.type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-3 border ${isRecommended ? "border-primary/30" : "border-border/30"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{ex.emoji}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground">{ex.name}</p>
                    {isRecommended && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">REC</span>}
                  </div>
                  <p className="text-[9px] text-muted-foreground">{ex.muscle}</p>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{ex.difficulty}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              <div className="bg-secondary/50 rounded-lg p-1.5 text-center">
                <p className="text-sm font-bold text-primary">{st.totalReps}</p>
                <p className="text-[7px] text-muted-foreground">TOTAL REPS</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-1.5 text-center">
                <p className="text-sm font-bold text-neon-cyan">{st.avgForm}%</p>
                <p className="text-[7px] text-muted-foreground">AVG FORM</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-1.5 text-center">
                <p className="text-sm font-bold text-neon-orange">{Math.round(st.totalCals)}</p>
                <p className="text-[7px] text-muted-foreground">KCAL</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-1.5 text-center">
                <p className="text-sm font-bold text-foreground">{st.totalSessions}</p>
                <p className="text-[7px] text-muted-foreground">SESSIONS</p>
              </div>
            </div>
            <div className="h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sparkData}>
                  <Bar dataKey="reps" fill={isRecommended ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} radius={[2, 2, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[8px] text-muted-foreground text-center mt-0.5">Last 7 days</p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
              <span className="text-[9px] text-muted-foreground">Best Form: <b className="text-primary">{st.bestForm}%</b></span>
              <span className="text-[9px] text-muted-foreground">Total Time: <b className="text-foreground">{formatTime(st.totalDuration)}</b></span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default ExerciseStatsTab;

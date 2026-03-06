import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Target, Dumbbell, Flame, Award, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface WorkoutSession {
  exercise_type: string;
  reps: number;
  form_score: number | null;
  calories_burned: number | null;
  duration_seconds: number | null;
  created_at: string;
}

const COLORS = ["hsl(160,100%,50%)", "hsl(180,100%,50%)", "hsl(25,100%,55%)", "hsl(280,100%,65%)", "hsl(0,85%,60%)", "hsl(45,100%,55%)"];

const HealthReportPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "exercises">("daily");
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchSessions = async () => {
      const { data } = await supabase
        .from("workout_sessions")
        .select("exercise_type, reps, form_score, calories_burned, duration_seconds, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      setSessions(data || []);
      setLoading(false);
    };
    fetchSessions();
  }, [user]);

  const today = new Date().toISOString().split("T")[0];
  const todaySessions = sessions.filter((s) => s.created_at.startsWith(today));
  const todayReps = todaySessions.reduce((a, s) => a + s.reps, 0);
  const todayCalories = todaySessions.reduce((a, s) => a + (s.calories_burned || 0), 0);
  const todayWorkouts = todaySessions.length;
  const todayAvgForm = todaySessions.length > 0
    ? Math.round(todaySessions.reduce((a, s) => a + (s.form_score || 0), 0) / todaySessions.length)
    : 0;

  // Weekly data (last 7 days)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
  const weeklyData = weekDays.map((date) => {
    const daySessions = sessions.filter((s) => s.created_at.startsWith(date));
    return {
      day: new Date(date).toLocaleDateString("en", { weekday: "short" }),
      reps: daySessions.reduce((a, s) => a + s.reps, 0),
      calories: Math.round(daySessions.reduce((a, s) => a + (s.calories_burned || 0), 0)),
    };
  });

  // Weekly totals for progress
  const last4Weeks = Array.from({ length: 4 }, (_, i) => {
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const weekSessions = sessions.filter((s) => {
      const d = new Date(s.created_at);
      return d >= start && d <= end;
    });
    return {
      week: `W${4 - i}`,
      reps: weekSessions.reduce((a, s) => a + s.reps, 0),
    };
  }).reverse();

  // Exercise breakdown
  const exerciseMap: Record<string, { reps: number; sessions: number; avgForm: number; totalForm: number }> = {};
  sessions.forEach((s) => {
    if (!exerciseMap[s.exercise_type]) exerciseMap[s.exercise_type] = { reps: 0, sessions: 0, avgForm: 0, totalForm: 0 };
    exerciseMap[s.exercise_type].reps += s.reps;
    exerciseMap[s.exercise_type].sessions++;
    exerciseMap[s.exercise_type].totalForm += s.form_score || 0;
  });
  const exerciseData = Object.entries(exerciseMap).map(([name, d]) => ({
    name: name.toUpperCase(),
    reps: d.reps,
    sessions: d.sessions,
    avgForm: d.sessions > 0 ? Math.round(d.totalForm / d.sessions) : 0,
  }));
  const pieData = exerciseData.map((e) => ({ name: e.name, value: e.reps }));

  const totalReps = sessions.reduce((a, s) => a + s.reps, 0);
  const totalCalories = Math.round(sessions.reduce((a, s) => a + (s.calories_burned || 0), 0));
  const avgAccuracy = sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + (s.form_score || 0), 0) / sessions.length) : 0;
  const weeklyReps = weeklyData.reduce((a, d) => a + d.reps, 0);
  const activeDays = weeklyData.filter((d) => d.reps > 0).length;

  const dailyReport = [
    { label: "Reps", value: todayReps.toString(), icon: "💪" },
    { label: "Calories", value: `${Math.round(todayCalories)} kcal`, icon: "🔥" },
    { label: "Workouts", value: todayWorkouts.toString(), icon: "🏋️" },
    { label: "Avg Form", value: todayAvgForm > 0 ? `${todayAvgForm}%` : "—", icon: "🎯" },
  ];

  if (loading) {
    return (
      <div className="relative min-h-screen pb-24 px-4 pt-6 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl gradient-orange flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">REPORTS</h1>
          <p className="text-xs text-muted-foreground">Real-time fitness analytics</p>
        </div>
      </motion.div>

      {/* Tab Switcher */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="relative z-10 flex gap-2 mb-6">
        {(["daily", "weekly", "exercises"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all capitalize ${
              activeTab === tab ? "gradient-primary text-primary-foreground neon-glow" : "glass-card text-muted-foreground"
            }`}
          >{tab}</button>
        ))}
      </motion.div>

      {activeTab === "daily" && (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 grid grid-cols-2 gap-3 mb-6">
            {dailyReport.map((item) => (
              <div key={item.label} className="glass-card p-4 text-center">
                <span className="text-2xl">{item.icon}</span>
                <p className="text-lg font-bold text-foreground mt-2">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Goals */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 glass-card p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-neon-orange" />
              <h3 className="font-bold text-foreground">Today's Goals</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: "Rep Goal", current: todayReps, target: 100, unit: "reps", cls: "gradient-primary" },
                { label: "Calorie Goal", current: Math.round(todayCalories), target: 300, unit: "kcal", cls: "gradient-orange" },
                { label: "Workout Goal", current: todayWorkouts, target: 3, unit: "sessions", cls: "gradient-purple" },
              ].map((goal) => (
                <div key={goal.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-foreground font-medium">{goal.label}</span>
                    <span className="text-muted-foreground">{goal.current} / {goal.target} {goal.unit}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }} transition={{ delay: 0.5, duration: 1 }} className={`h-full rounded-full ${goal.cls}`} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* All-Time Stats */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative z-10 glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-4 w-4 text-neon-cyan" />
              <h3 className="font-bold text-foreground">All-Time Stats</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xl font-bold text-neon-green">{totalReps}</p><p className="text-[10px] text-muted-foreground">Total Reps</p></div>
              <div><p className="text-xl font-bold text-neon-cyan">{avgAccuracy}%</p><p className="text-[10px] text-muted-foreground">Avg Form</p></div>
              <div><p className="text-xl font-bold text-neon-orange">{totalCalories}</p><p className="text-[10px] text-muted-foreground">Calories</p></div>
            </div>
          </motion.div>
        </>
      )}

      {activeTab === "weekly" && (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 glass-card p-5 mb-6">
            <h3 className="font-bold text-foreground mb-4">Weekly Reps</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis dataKey="day" tick={{ fill: "hsl(240 5% 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Bar dataKey="reps" fill="hsl(160 100% 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10 glass-card p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-neon-cyan" />
              <h3 className="font-bold text-foreground">Monthly Progress</h3>
            </div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last4Weeks}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 10% 16%)" />
                  <XAxis dataKey="week" tick={{ fill: "hsl(240 5% 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Line type="monotone" dataKey="reps" stroke="hsl(180 100% 50%)" strokeWidth={2} dot={{ fill: "hsl(180 100% 50%)", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 glass-card p-5">
            <h3 className="font-bold text-foreground mb-3">Weekly Summary</h3>
            <div className="space-y-3">
              {[
                { label: "Total Reps", value: weeklyReps.toString() },
                { label: "Avg Accuracy", value: `${avgAccuracy}%` },
                { label: "Active Days", value: `${activeDays}/7` },
                { label: "Calories Burned", value: `${weeklyData.reduce((a, d) => a + d.calories, 0)} kcal` },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <span className="text-sm font-bold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {activeTab === "exercises" && (
        <>
          {exerciseData.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 glass-card p-8 text-center">
              <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No exercise data yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Start a workout on the Camera tab to see analytics</p>
            </motion.div>
          ) : (
            <>
              {/* Pie Chart */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 glass-card p-5 mb-6">
                <h3 className="font-bold text-foreground mb-4">Exercise Distribution</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Exercise Cards */}
              <div className="relative z-10 space-y-3">
                {exerciseData.map((ex, i) => (
                  <motion.div key={ex.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-foreground text-sm">{ex.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full gradient-primary text-primary-foreground font-bold">{ex.sessions} sessions</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div><p className="text-lg font-bold text-neon-green">{ex.reps}</p><p className="text-[10px] text-muted-foreground">Total Reps</p></div>
                      <div><p className="text-lg font-bold text-neon-cyan">{ex.avgForm}%</p><p className="text-[10px] text-muted-foreground">Avg Form</p></div>
                      <div><p className="text-lg font-bold text-neon-orange">{Math.round(ex.reps * 0.5)}</p><p className="text-[10px] text-muted-foreground">Calories</p></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default HealthReportPage;

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, Trophy, Flame, Target, Calendar, BarChart3, Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip, AreaChart, Area } from "recharts";

interface SessionData {
  exercise_type: string;
  reps: number;
  form_score: number | null;
  calories_burned: number | null;
  created_at: string;
}

const ProgressPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"weekly" | "exercises" | "body">("weekly");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data } = await supabase
        .from("workout_sessions")
        .select("exercise_type, reps, form_score, calories_burned, created_at")
        .eq("user_id", user.id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });
      setSessions(data || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Aggregate by day for weekly chart
  const dailyData = (() => {
    const map = new Map<string, { reps: number; cal: number; score: number; count: number }>();
    sessions.forEach((s) => {
      const day = new Date(s.created_at).toLocaleDateString("en-US", { weekday: "short" });
      const prev = map.get(day) || { reps: 0, cal: 0, score: 0, count: 0 };
      map.set(day, {
        reps: prev.reps + s.reps,
        cal: prev.cal + (s.calories_burned || 0),
        score: prev.score + (s.form_score || 0),
        count: prev.count + 1,
      });
    });
    return Array.from(map.entries()).map(([day, d]) => ({
      day,
      reps: d.reps,
      calories: Math.round(d.cal),
      accuracy: d.count > 0 ? Math.round(d.score / d.count) : 0,
    }));
  })();

  // Aggregate by exercise type
  const exerciseData = (() => {
    const map = new Map<string, { reps: number; score: number; count: number }>();
    sessions.forEach((s) => {
      const prev = map.get(s.exercise_type) || { reps: 0, score: 0, count: 0 };
      map.set(s.exercise_type, {
        reps: prev.reps + s.reps,
        score: prev.score + (s.form_score || 0),
        count: prev.count + 1,
      });
    });
    return Array.from(map.entries()).map(([name, d]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      reps: d.reps,
      accuracy: d.count > 0 ? Math.round(d.score / d.count) : 0,
      sessions: d.count,
    })).sort((a, b) => b.reps - a.reps);
  })();

  const totalReps = sessions.reduce((s, d) => s + d.reps, 0);
  const totalCal = Math.round(sessions.reduce((s, d) => s + (d.calories_burned || 0), 0));
  const avgScore = sessions.length > 0 ? Math.round(sessions.reduce((s, d) => s + (d.form_score || 0), 0) / sessions.length) : 0;
  const totalSessions = sessions.length;

  const summaryStats = [
    { icon: Dumbbell, label: "Total Reps", value: totalReps, color: "text-neon-green" },
    { icon: Flame, label: "Calories", value: totalCal, color: "text-neon-orange" },
    { icon: Target, label: "Avg Form", value: `${avgScore}%`, color: "text-neon-cyan" },
    { icon: Trophy, label: "Sessions", value: totalSessions, color: "text-neon-purple" },
  ];

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full glass-card flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Progress Analytics</h1>
          <p className="text-xs text-muted-foreground">Last 30 days performance</p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative z-10 grid grid-cols-2 gap-3 mb-6">
        {summaryStats.map((s) => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <s.icon className={`h-6 w-6 ${s.color}`} />
            <div>
              <p className="text-lg font-bold text-foreground">{loading ? "..." : s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="relative z-10 flex gap-2 mb-6">
        {(["weekly", "exercises", "body"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === t ? "gradient-primary text-primary-foreground" : "glass-card text-muted-foreground"}`}>
            {t === "weekly" ? "Weekly" : t === "exercises" ? "By Exercise" : "Body Stats"}
          </button>
        ))}
      </motion.div>

      {/* Charts */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10">
        {tab === "weekly" && (
          <>
            <div className="glass-card p-5 mb-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Daily Reps</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyData}>
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  <Bar dataKey="reps" fill="hsl(var(--neon-green))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3">Form Accuracy Trend</h4>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={dailyData}>
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  <Area type="monotone" dataKey="accuracy" stroke="hsl(var(--neon-cyan))" fill="hsl(var(--neon-cyan) / 0.15)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {tab === "exercises" && (
          <div className="space-y-3">
            {exerciseData.length === 0 && !loading && (
              <div className="glass-card p-8 text-center">
                <p className="text-muted-foreground text-sm">No workout data yet. Start training!</p>
              </div>
            )}
            {exerciseData.map((ex, i) => (
              <div key={i} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">{ex.name}</p>
                  <span className="text-xs text-muted-foreground">{ex.sessions} sessions</span>
                </div>
                <div className="flex gap-4 mb-2">
                  <div>
                    <p className="text-lg font-bold text-neon-green">{ex.reps}</p>
                    <p className="text-[10px] text-muted-foreground">Total Reps</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-neon-cyan">{ex.accuracy}%</p>
                    <p className="text-[10px] text-muted-foreground">Avg Form</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-neon-green" style={{ width: `${(ex.reps / Math.max(...exerciseData.map(e => e.reps), 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "body" && (
          <div className="glass-card p-5 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h4 className="font-semibold text-foreground mb-2">Body Stats Coming Soon</h4>
            <p className="text-xs text-muted-foreground">Track weight, measurements, and body composition over time. Connect wearable devices for automatic syncing.</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {["Weight", "BMI", "Body Fat"].map((stat) => (
                <div key={stat} className="glass-card p-3">
                  <p className="text-lg font-bold text-muted-foreground">--</p>
                  <p className="text-[10px] text-muted-foreground">{stat}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ProgressPage;

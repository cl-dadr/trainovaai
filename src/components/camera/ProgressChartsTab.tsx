import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, Flame, Award, Zap, Target, Activity, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  AreaChart, Area, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, PieChart, Pie, Cell, Treemap,
} from "recharts";
import { type SessionRecord, ALL_EXERCISES } from "./types";

interface ProgressChartsTabProps {
  pastSessions: SessionRecord[];
}

const CHART_COLORS = [
  "hsl(160,100%,50%)", "hsl(180,100%,50%)", "hsl(25,100%,55%)",
  "hsl(280,80%,60%)", "hsl(340,80%,55%)", "hsl(45,100%,55%)",
  "hsl(200,90%,55%)", "hsl(120,70%,50%)", "hsl(0,85%,60%)",
];

const ProgressChartsTab = ({ pastSessions }: ProgressChartsTabProps) => {
  const [activeView, setActiveView] = useState<"overview" | "heatmap" | "deep">("overview");

  // 7-day chart data
  const dailyData = useMemo(() => {
    const days: Record<string, { date: string; reps: number; calories: number; avgForm: number; formCount: number; sessions: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split("T")[0];
      days[key] = { date: d.toLocaleDateString("en", { weekday: "short" }), reps: 0, calories: 0, avgForm: 0, formCount: 0, sessions: 0 };
    }
    pastSessions.forEach(s => {
      const key = s.created_at.split("T")[0];
      if (days[key]) {
        days[key].reps += s.reps;
        days[key].calories += s.calories_burned || 0;
        days[key].avgForm += s.form_score || 0;
        days[key].formCount += 1;
        days[key].sessions += 1;
      }
    });
    return Object.values(days).map(d => ({
      ...d,
      avgForm: d.formCount > 0 ? Math.round(d.avgForm / d.formCount) : 0,
      calories: Math.round(d.calories),
    }));
  }, [pastSessions]);

  // Heatmap data (30 days)
  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      map[d.toISOString().split("T")[0]] = 0;
    }
    pastSessions.forEach(s => {
      const key = s.created_at.split("T")[0];
      if (map[key] !== undefined) map[key] += s.reps;
    });
    return Object.entries(map).map(([date, reps]) => ({ date, reps, intensity: Math.min(4, Math.floor(reps / 15)) }));
  }, [pastSessions]);

  // Exercise distribution for treemap & pie
  const exerciseDistribution = useMemo(() => {
    const dist: Record<string, { name: string; reps: number; sessions: number; avgForm: number; formSum: number; emoji: string }> = {};
    pastSessions.forEach(s => {
      if (!dist[s.exercise_type]) {
        const meta = ALL_EXERCISES.find(e => e.type === s.exercise_type);
        dist[s.exercise_type] = { name: meta?.name || s.exercise_type, reps: 0, sessions: 0, avgForm: 0, formSum: 0, emoji: meta?.emoji || "🏋️" };
      }
      dist[s.exercise_type].reps += s.reps;
      dist[s.exercise_type].sessions += 1;
      dist[s.exercise_type].formSum += s.form_score || 0;
    });
    return Object.entries(dist).map(([type, d]) => ({
      ...d, type, avgForm: d.sessions > 0 ? Math.round(d.formSum / d.sessions) : 0,
      size: d.reps,
    })).sort((a, b) => b.reps - a.reps);
  }, [pastSessions]);

  // Radar chart data
  const radarData = useMemo(() => {
    const categories = [
      { key: "strength", label: "Strength", exercises: ["pushup", "bicep_curl", "shoulder_press"] },
      { key: "legs", label: "Legs", exercises: ["squat", "lunge", "high_knees"] },
      { key: "core", label: "Core", exercises: ["plank", "situp"] },
      { key: "cardio", label: "Cardio", exercises: ["jumping_jack", "high_knees"] },
      { key: "form", label: "Form", exercises: [] },
      { key: "consistency", label: "Consistency", exercises: [] },
    ];
    const totalReps = pastSessions.reduce((a, s) => a + s.reps, 0) || 1;
    const avgForm = pastSessions.length > 0 ? pastSessions.reduce((a, s) => a + (s.form_score || 0), 0) / pastSessions.length : 0;
    const uniqueDays = new Set(pastSessions.map(s => s.created_at.split("T")[0])).size;

    return categories.map(cat => {
      if (cat.key === "form") return { subject: cat.label, value: Math.round(avgForm), fullMark: 100 };
      if (cat.key === "consistency") return { subject: cat.label, value: Math.min(100, Math.round((uniqueDays / 7) * 100)), fullMark: 100 };
      const catReps = pastSessions.filter(s => cat.exercises.includes(s.exercise_type)).reduce((a, s) => a + s.reps, 0);
      return { subject: cat.label, value: Math.min(100, Math.round((catReps / totalReps) * 200)), fullMark: 100 };
    });
  }, [pastSessions]);

  // Hourly distribution
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, reps: 0 }));
    pastSessions.forEach(s => {
      const h = new Date(s.created_at).getHours();
      hours[h].reps += s.reps;
    });
    return hours.filter(h => h.reps > 0);
  }, [pastSessions]);

  // Summary stats
  const stats = useMemo(() => {
    const totalReps = pastSessions.reduce((a, s) => a + s.reps, 0);
    const totalCals = Math.round(pastSessions.reduce((a, s) => a + (s.calories_burned || 0), 0));
    const avgForm = pastSessions.length > 0 ? Math.round(pastSessions.reduce((a, s) => a + (s.form_score || 0), 0) / pastSessions.length) : 0;
    const totalDuration = pastSessions.reduce((a, s) => a + (s.duration_seconds || 0), 0);
    return { totalReps, totalCals, avgForm, sessions: pastSessions.length, totalDuration };
  }, [pastSessions]);

  const HEAT_COLORS = ["bg-secondary/30", "bg-primary/20", "bg-primary/40", "bg-primary/60", "bg-primary/80"];

  if (pastSessions.length === 0) {
    return (
      <div className="relative z-10 glass-card p-8 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No workout data yet — start training!</p>
      </div>
    );
  }

  return (
    <div className="relative z-10 space-y-3">
      {/* View Switcher */}
      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
        {([
          { key: "overview" as const, label: "Overview", icon: <BarChart3 className="h-3 w-3" /> },
          { key: "heatmap" as const, label: "Heatmap", icon: <Calendar className="h-3 w-3" /> },
          { key: "deep" as const, label: "Deep Dive", icon: <Activity className="h-3 w-3" /> },
        ]).map(v => (
          <button key={v.key} onClick={() => setActiveView(v.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
              activeView === v.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}>{v.icon}{v.label}</button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { val: stats.totalReps.toLocaleString(), label: "TOTAL REPS", color: "text-primary", icon: <Zap className="h-3 w-3" /> },
          { val: `${stats.totalCals}`, label: "KCAL BURNED", color: "text-neon-orange", icon: <Flame className="h-3 w-3" /> },
          { val: `${stats.avgForm}%`, label: "AVG FORM", color: "text-neon-cyan", icon: <Target className="h-3 w-3" /> },
          { val: `${stats.sessions}`, label: "SESSIONS", color: "text-foreground", icon: <Award className="h-3 w-3" /> },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card p-2 text-center">
            <div className={`flex justify-center mb-0.5 ${s.color}`}>{s.icon}</div>
            <p className={`text-sm font-black ${s.color}`}>{s.val}</p>
            <p className="text-[7px] text-muted-foreground font-bold tracking-wider">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeView === "overview" && (
        <>
          {/* Reps Bar Chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
            <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1 font-bold"><TrendingUp className="h-3 w-3" /> DAILY REPS — LAST 7 DAYS</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <defs>
                    <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160,100%,50%)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(160,100%,50%)" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }} />
                  <Bar dataKey="reps" fill="url(#repGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Calories Area + Form Line stacked */}
          <div className="grid grid-cols-2 gap-2">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-3">
              <p className="text-[9px] text-muted-foreground mb-1 font-bold flex items-center gap-1"><Flame className="h-3 w-3 text-neon-orange" /> CALORIES</p>
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs><linearGradient id="calG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(25,100%,55%)" stopOpacity={0.4} /><stop offset="95%" stopColor="hsl(25,100%,55%)" stopOpacity={0} /></linearGradient></defs>
                    <Area type="monotone" dataKey="calories" stroke="hsl(25,100%,55%)" fill="url(#calG)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="glass-card p-3">
              <p className="text-[9px] text-muted-foreground mb-1 font-bold flex items-center gap-1"><Award className="h-3 w-3 text-neon-cyan" /> FORM</p>
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <Line type="monotone" dataKey="avgForm" stroke="hsl(180,100%,50%)" strokeWidth={2} dot={{ fill: "hsl(180,100%,50%)", r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Radar Chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <p className="text-[10px] text-muted-foreground mb-2 font-bold">🕸️ FITNESS RADAR — YOUR BALANCE PROFILE</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" opacity={0.3} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="You" dataKey="value" stroke="hsl(160,100%,50%)" fill="hsl(160,100%,50%)" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Exercise Pie */}
          {exerciseDistribution.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="glass-card p-4">
              <p className="text-[10px] text-muted-foreground mb-2 font-bold">🥧 EXERCISE MIX</p>
              <div className="flex items-center gap-3">
                <div className="h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={exerciseDistribution} dataKey="reps" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={55} strokeWidth={2} stroke="hsl(var(--background))">
                        {exerciseDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1">
                  {exerciseDistribution.slice(0, 5).map((ex, i) => (
                    <div key={ex.type} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-[9px] text-foreground font-bold truncate">{ex.emoji} {ex.name}</span>
                      <span className="text-[8px] text-muted-foreground ml-auto">{ex.reps}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ═══ HEATMAP TAB ═══ */}
      {activeView === "heatmap" && (
        <>
          {/* Activity Heatmap - GitHub Style */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
            <p className="text-[10px] text-muted-foreground mb-3 font-bold">🔥 30-DAY ACTIVITY HEATMAP</p>
            <div className="flex flex-wrap gap-1">
              {heatmapData.map((day, i) => (
                <div key={i} className="relative group">
                  <div className={`w-[18px] h-[18px] rounded-[3px] transition-all ${HEAT_COLORS[day.intensity]} ${day.reps > 0 ? "ring-1 ring-primary/20" : ""}`} />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-2 py-1 text-[8px] text-foreground font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                    {new Date(day.date).toLocaleDateString("en", { month: "short", day: "numeric" })}: {day.reps} reps
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="text-[8px] text-muted-foreground">Less</span>
              {HEAT_COLORS.map((c, i) => <div key={i} className={`w-3 h-3 rounded-[2px] ${c}`} />)}
              <span className="text-[8px] text-muted-foreground">More</span>
            </div>
          </motion.div>

          {/* Peak Hours */}
          {hourlyData.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-4">
              <p className="text-[10px] text-muted-foreground mb-2 font-bold">⏰ PEAK TRAINING HOURS</p>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <XAxis dataKey="hour" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 10 }} />
                    <Bar dataKey="reps" radius={[4, 4, 0, 0]}>
                      {hourlyData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Streaks & Consistency */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="glass-card p-4">
            <p className="text-[10px] text-muted-foreground mb-2 font-bold">📊 WORKOUT CONSISTENCY</p>
            <div className="space-y-2">
              {(() => {
                const last7 = heatmapData.slice(-7);
                const activeDays = last7.filter(d => d.reps > 0).length;
                const consistency = Math.round((activeDays / 7) * 100);
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">This Week</span>
                      <span className={`text-xs font-black ${consistency >= 70 ? "text-primary" : consistency >= 40 ? "text-neon-orange" : "text-destructive"}`}>{consistency}%</span>
                    </div>
                    <div className="w-full h-3 bg-secondary/50 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${consistency}%` }} transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${consistency >= 70 ? "bg-primary" : consistency >= 40 ? "bg-neon-orange" : "bg-destructive"}`} />
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {last7.map((d, i) => (
                        <div key={i} className="text-center">
                          <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-[9px] font-bold ${d.reps > 0 ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground/30"}`}>
                            {d.reps > 0 ? "✓" : "—"}
                          </div>
                          <p className="text-[7px] text-muted-foreground mt-0.5">{new Date(d.date).toLocaleDateString("en", { weekday: "narrow" })}</p>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </motion.div>
        </>
      )}

      {/* ═══ DEEP DIVE TAB ═══ */}
      {activeView === "deep" && (
        <>
          {/* Exercise Breakdown Cards */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <p className="text-[10px] text-muted-foreground font-bold">💪 EXERCISE PERFORMANCE BREAKDOWN</p>
            {exerciseDistribution.map((ex, i) => {
              const formColor = ex.avgForm >= 85 ? "text-primary" : ex.avgForm >= 60 ? "text-neon-orange" : "text-destructive";
              const barWidth = Math.min(100, Math.round((ex.reps / (stats.totalReps || 1)) * 100));
              return (
                <motion.div key={ex.type} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ex.emoji}</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">{ex.name}</p>
                        <p className="text-[8px] text-muted-foreground">{ex.sessions} sessions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-primary">{ex.reps}</p>
                      <p className="text-[8px] text-muted-foreground">total reps</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-secondary/50 rounded-full overflow-hidden mb-1.5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${barWidth}%` }} transition={{ duration: 0.8, delay: i * 0.05 }}
                      className="h-full rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-muted-foreground">{barWidth}% of total volume</span>
                    <span className={`text-[9px] font-bold ${formColor}`}>Form: {ex.avgForm}%</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Sessions per Day Trend */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <p className="text-[10px] text-muted-foreground mb-2 font-bold">📈 SESSIONS PER DAY TREND</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs><linearGradient id="sessG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(280,80%,60%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(280,80%,60%)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 10 }} />
                  <Area type="monotone" dataKey="sessions" stroke="hsl(280,80%,60%)" fill="url(#sessG)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Combined Form + Reps */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="glass-card p-4">
            <p className="text-[10px] text-muted-foreground mb-2 font-bold">🎯 REPS vs FORM QUALITY</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="reps" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={20} />
                  <YAxis yAxisId="form" orientation="right" domain={[0, 100]} tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 10 }} />
                  <Bar yAxisId="reps" dataKey="reps" fill="hsl(160,100%,50%)" radius={[4, 4, 0, 0]} opacity={0.6} />
                  <Line yAxisId="form" type="monotone" dataKey="avgForm" stroke="hsl(25,100%,55%)" strokeWidth={2} dot={{ fill: "hsl(25,100%,55%)", r: 3 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-primary/60" /><span className="text-[8px] text-muted-foreground">Reps</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-neon-orange" /><span className="text-[8px] text-muted-foreground">Form %</span></div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default ProgressChartsTab;

import { useMemo } from "react";
import { BarChart3, TrendingUp, Flame, Award } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  AreaChart, Area, LineChart, Line,
} from "recharts";
import { type SessionRecord } from "./types";

interface ProgressChartsTabProps {
  pastSessions: SessionRecord[];
}

const ProgressChartsTab = ({ pastSessions }: ProgressChartsTabProps) => {
  const progressChartData = useMemo(() => {
    const days: Record<string, { date: string; reps: number; calories: number; avgForm: number; formCount: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split("T")[0];
      days[key] = { date: d.toLocaleDateString("en", { weekday: "short" }), reps: 0, calories: 0, avgForm: 0, formCount: 0 };
    }
    pastSessions.forEach(s => {
      const key = s.created_at.split("T")[0];
      if (days[key]) { days[key].reps += s.reps; days[key].calories += s.calories_burned || 0; days[key].avgForm += s.form_score || 0; days[key].formCount += 1; }
    });
    return Object.values(days).map(d => ({ ...d, avgForm: d.formCount > 0 ? Math.round(d.avgForm / d.formCount) : 0, calories: Math.round(d.calories) }));
  }, [pastSessions]);

  if (pastSessions.length === 0) {
    return (
      <div className="relative z-10 glass-card p-8 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No workout data yet</p>
      </div>
    );
  }

  return (
    <div className="relative z-10 space-y-3">
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { val: pastSessions.reduce((a, s) => a + s.reps, 0), label: "REPS", color: "text-primary" },
          { val: Math.round(pastSessions.reduce((a, s) => a + (s.calories_burned || 0), 0)), label: "KCAL", color: "text-neon-orange" },
          { val: `${pastSessions.length > 0 ? Math.round(pastSessions.reduce((a, s) => a + (s.form_score || 0), 0) / pastSessions.length) : 0}%`, label: "AVG FORM", color: "text-neon-cyan" },
          { val: pastSessions.length, label: "SESSIONS", color: "text-foreground" },
        ].map((s, i) => (
          <div key={i} className="glass-card p-2 text-center">
            <p className={`text-sm font-bold ${s.color}`}>{s.val}</p>
            <p className="text-[7px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-4">
        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> REPS / DAY</p>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="reps" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-4">
        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Flame className="h-3 w-3" /> CALORIES BURNED</p>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={progressChartData}>
              <defs><linearGradient id="calG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(25,100%,55%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(25,100%,55%)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="calories" stroke="hsl(25,100%,55%)" fill="url(#calG)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-4">
        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Award className="h-3 w-3" /> FORM ACCURACY</p>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="avgForm" stroke="hsl(160,100%,50%)" strokeWidth={2} dot={{ fill: "hsl(160,100%,50%)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ProgressChartsTab;

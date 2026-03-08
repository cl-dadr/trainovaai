import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Dumbbell, Droplets, Moon, Brain, Footprints, Check, Plus, Trophy,
  TrendingUp, Heart, Apple, Timer, Sun, Sparkles, Trash2, Flame, Zap, Target,
  BarChart3, PieChart, Calendar, CheckSquare, Filter, ChevronDown, ChevronUp,
  Clock, Award, Percent, ListChecks, LayoutGrid, Table2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHabits, type AISuggestion } from "@/hooks/useHabits";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar,
} from "recharts";

const iconMap: Record<string, any> = {
  dumbbell: Dumbbell, droplets: Droplets, moon: Moon, brain: Brain, footprints: Footprints,
  heart: Heart, apple: Apple, stretch: Zap, timer: Timer, sun: Sun,
};

const colorOptions = ["neon-green", "neon-cyan", "neon-purple", "neon-orange", "neon-pink"];
const unitOptions = ["session", "glasses", "hours", "min", "steps", "servings", "reps"];
const frequencyOptions = ["daily", "weekly"];
const difficultyOptions = ["easy", "medium", "hard"];
const timeOptions = ["morning", "afternoon", "evening", "anytime"];

const CHART_COLORS = [
  "hsl(160, 100%, 50%)", "hsl(180, 100%, 50%)", "hsl(280, 100%, 65%)",
  "hsl(25, 100%, 55%)", "hsl(330, 100%, 60%)",
];

const HabitTrackerPage = () => {
  const navigate = useNavigate();
  const {
    habits, loading, toggleHabit, createHabit, deleteHabit,
    suggestions, suggestionsLoading, fetchSuggestions,
    completedCount, completionRate,
  } = useHabits();

  const [showCreate, setShowCreate] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [sortBy, setSortBy] = useState<"name" | "streak" | "status">("status");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [newHabit, setNewHabit] = useState({
    name: "", icon: "dumbbell", color: "neon-green", target: 1,
    unit: "session", frequency: "daily", time_of_day: "anytime", difficulty: "medium",
  });

  const handleCreate = async () => {
    if (!newHabit.name.trim()) return;
    await createHabit(newHabit);
    setNewHabit({ name: "", icon: "dumbbell", color: "neon-green", target: 1, unit: "session", frequency: "daily", time_of_day: "anytime", difficulty: "medium" });
    setShowCreate(false);
  };

  const handleAddSuggestion = async (s: AISuggestion) => {
    await createHabit({ name: s.name, icon: s.icon, color: s.color, target: s.target, unit: s.unit, ai_suggested: true });
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Sort habits
  const sortedHabits = useMemo(() => {
    const sorted = [...habits].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "streak") return (b.streak || 0) - (a.streak || 0);
      if (sortBy === "status") {
        const aCompleted = a.todayCompletion?.completed ? 1 : 0;
        const bCompleted = b.todayCompletion?.completed ? 1 : 0;
        return bCompleted - aCompleted;
      }
      return 0;
    });
    return sortDir === "asc" ? sorted.reverse() : sorted;
  }, [habits, sortBy, sortDir]);

  // Analytics data
  const completionByDay = useMemo(() => {
    return weekDays.map((day, i) => {
      const completed = habits.filter(h => h.weekCompletions[i]).length;
      return { day, completed, total: habits.length, rate: habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0 };
    });
  }, [habits]);

  const habitsByDifficulty = useMemo(() => {
    const groups: Record<string, number> = {};
    habits.forEach(h => { groups[h.difficulty] = (groups[h.difficulty] || 0) + 1; });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [habits]);

  const habitsByTime = useMemo(() => {
    const groups: Record<string, number> = {};
    habits.forEach(h => { groups[h.time_of_day || "anytime"] = (groups[h.time_of_day || "anytime"] || 0) + 1; });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [habits]);

  const streakData = useMemo(() => {
    return habits.map(h => ({ name: h.name.slice(0, 12), streak: h.streak, fill: CHART_COLORS[habits.indexOf(h) % CHART_COLORS.length] }));
  }, [habits]);

  const toggleSort = (col: "name" | "streak" | "status") => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ChevronDown className="h-3 w-3 text-muted-foreground/40" />;
    return sortDir === "desc" ? <ChevronDown className="h-3 w-3 text-primary" /> : <ChevronUp className="h-3 w-3 text-primary" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full glass-card flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">Habit Dashboard</h1>
            <p className="text-[10px] text-muted-foreground">Track · Analyze · Optimize</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSuggestions(true)} className="h-9 w-9 rounded-full glass-card flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </button>
          <button onClick={() => setShowCreate(true)} className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Plus className="h-4 w-4 text-primary" />
          </button>
        </div>
      </motion.div>

      {/* KPI Cards Row */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative z-10 grid grid-cols-4 gap-2 mb-5">
        {[
          { icon: CheckSquare, label: "Done", value: `${completedCount}/${habits.length}`, color: "text-neon-green", bg: "bg-neon-green/10" },
          { icon: Percent, label: "Rate", value: `${completionRate}%`, color: "text-neon-cyan", bg: "bg-neon-cyan/10" },
          { icon: Flame, label: "Best Streak", value: String(Math.max(...habits.map(h => h.streak), 0)), color: "text-neon-orange", bg: "bg-neon-orange/10" },
          { icon: ListChecks, label: "Total", value: String(habits.length), color: "text-neon-purple", bg: "bg-neon-purple/10" },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card p-3 text-center">
            <div className={`h-7 w-7 rounded-lg ${kpi.bg} flex items-center justify-center mx-auto mb-1.5`}>
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
            </div>
            <p className="text-base font-bold text-foreground">{kpi.value}</p>
            <p className="text-[9px] text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Main Tabs */}
      <Tabs defaultValue="tasks" className="relative z-10">
        <TabsList className="w-full bg-card/60 border border-border/30 mb-4">
          <TabsTrigger value="tasks" className="flex-1 text-xs gap-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Table2 className="h-3 w-3" /> To-Do List
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 text-xs gap-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <BarChart3 className="h-3 w-3" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="flex-1 text-xs gap-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Calendar className="h-3 w-3" /> Heatmap
          </TabsTrigger>
        </TabsList>

        {/* ========== TO-DO LIST TAB (Excel-style) ========== */}
        <TabsContent value="tasks">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")}
                className="glass-card px-3 py-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
                {viewMode === "table" ? <LayoutGrid className="h-3 w-3" /> : <Table2 className="h-3 w-3" />}
                {viewMode === "table" ? "Cards" : "Table"}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">{completedCount} of {habits.length} complete</p>
          </div>

          {habits.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <ListChecks className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-2">No habits yet</p>
              <p className="text-xs text-muted-foreground mb-4">Create your first habit or get AI suggestions</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-xs font-semibold">
                  Create Habit
                </button>
                <button onClick={() => setShowSuggestions(true)} className="px-4 py-2 rounded-lg glass-card text-muted-foreground text-xs font-semibold">
                  AI Suggest
                </button>
              </div>
            </div>
          ) : viewMode === "table" ? (
            /* Excel-style Table View */
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30 bg-secondary/30">
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground w-8">✓</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("name")}>
                        <span className="flex items-center gap-1">Habit <SortIcon col="name" /></span>
                      </th>
                      <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Progress</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("streak")}>
                        <span className="flex items-center justify-center gap-1">Streak <SortIcon col="streak" /></span>
                      </th>
                      <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Schedule</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {sortedHabits.map((habit) => {
                        const Icon = iconMap[habit.icon] || Dumbbell;
                        const isCompleted = habit.todayCompletion?.completed;
                        const progress = isCompleted ? 100 : (habit.todayCompletion ? Math.round((habit.todayCompletion.value / habit.target) * 100) : 0);
                        return (
                          <motion.tr key={habit.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className={`border-b border-border/20 transition-colors ${isCompleted ? "bg-primary/5" : "hover:bg-secondary/20"}`}>
                            <td className="px-3 py-3">
                              <button onClick={() => toggleHabit(habit.id)}
                                className={`h-5 w-5 rounded flex items-center justify-center transition-all border ${isCompleted ? "bg-primary/20 border-primary/50" : "border-border/40 bg-transparent"}`}>
                                {isCompleted && <Check className="h-3 w-3 text-primary" />}
                              </button>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div className={`h-6 w-6 rounded-md bg-${habit.color}/15 flex items-center justify-center`}>
                                  <Icon className={`h-3 w-3 text-${habit.color}`} />
                                </div>
                                <div>
                                  <p className={`font-medium text-xs ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                    {habit.name}
                                  </p>
                                  {habit.ai_suggested && <span className="text-[8px] text-primary">AI</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden min-w-[40px]">
                                  <div className={`h-full rounded-full bg-${habit.color} transition-all`} style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground w-8 text-right">{progress}%</span>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-center">
                              {habit.streak > 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-neon-orange font-bold text-xs">
                                  <Flame className="h-3 w-3" />{habit.streak}
                                </span>
                              ) : <span className="text-muted-foreground/40">—</span>}
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground capitalize">
                                <Clock className="h-2.5 w-2.5" />{habit.frequency}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <button onClick={() => deleteHabit(habit.id)} className="p-1 opacity-30 hover:opacity-100 transition-opacity">
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
              {/* Summary Row */}
              <div className="px-3 py-2.5 bg-secondary/20 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Total: {habits.length} habits</span>
                <span>Completed: {completedCount} ({completionRate}%)</span>
                <span>Best Streak: {Math.max(...habits.map(h => h.streak), 0)} days</span>
              </div>
            </div>
          ) : (
            /* Card View */
            <div className="space-y-2">
              <AnimatePresence>
                {sortedHabits.map((habit) => {
                  const Icon = iconMap[habit.icon] || Dumbbell;
                  const isCompleted = habit.todayCompletion?.completed;
                  const progress = isCompleted ? 100 : (habit.todayCompletion ? Math.round((habit.todayCompletion.value / habit.target) * 100) : 0);
                  return (
                    <motion.div key={habit.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                      className={`glass-card p-3.5 flex items-center gap-3 ${isCompleted ? "border-primary/20" : ""}`}>
                      <button onClick={() => toggleHabit(habit.id)}
                        className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all border ${isCompleted ? `bg-${habit.color}/20 border-${habit.color}/40` : "bg-secondary/50 border-border/30"}`}>
                        {isCompleted ? <Check className={`h-4 w-4 text-${habit.color}`} /> : <Icon className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-xs font-semibold ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>{habit.name}</p>
                          <span className="text-[10px] text-muted-foreground">{habit.todayCompletion?.value || 0}/{habit.target} {habit.unit}</span>
                        </div>
                        <div className="h-1 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full bg-${habit.color} transition-all`} style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-muted-foreground capitalize">{habit.frequency} · {habit.difficulty}</span>
                          {habit.streak > 0 && (
                            <span className="text-[9px] text-neon-orange font-bold flex items-center gap-0.5">
                              <Flame className="h-2.5 w-2.5" />{habit.streak}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => deleteHabit(habit.id)} className="p-1 opacity-30 hover:opacity-100 transition-opacity shrink-0">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* ========== ANALYTICS TAB (PowerBI-style) ========== */}
        <TabsContent value="analytics">
          <div className="space-y-4">
            {/* Completion Rate Over Week */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-neon-green" />
                <h3 className="text-xs font-bold text-foreground">Weekly Completion Rate</h3>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={completionByDay} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 16%)" />
                    <XAxis dataKey="day" tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 10 }} axisLine={false} />
                    <YAxis tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 10 }} axisLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip
                      contentStyle={{ background: "hsl(240, 12%, 8%)", border: "1px solid hsl(240, 10%, 20%)", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(val: number) => [`${val}%`, "Rate"]}
                    />
                    <Bar dataKey="rate" radius={[4, 4, 0, 0]} fill="hsl(160, 100%, 50%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Two Column Charts */}
            <div className="grid grid-cols-2 gap-3">
              {/* By Difficulty */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <PieChart className="h-3.5 w-3.5 text-neon-purple" />
                  <h3 className="text-[10px] font-bold text-foreground">By Difficulty</h3>
                </div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Pie data={habitsByDifficulty} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={40} strokeWidth={2} stroke="hsl(240, 15%, 4%)">
                        {habitsByDifficulty.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(240, 12%, 8%)", border: "1px solid hsl(240, 10%, 20%)", borderRadius: "8px", fontSize: "10px" }}
                      />
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {habitsByDifficulty.map((d, i) => (
                    <span key={d.name} className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* By Time */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Clock className="h-3.5 w-3.5 text-neon-cyan" />
                  <h3 className="text-[10px] font-bold text-foreground">By Time</h3>
                </div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Pie data={habitsByTime} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={40} strokeWidth={2} stroke="hsl(240, 15%, 4%)">
                        {habitsByTime.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(240, 12%, 8%)", border: "1px solid hsl(240, 10%, 20%)", borderRadius: "8px", fontSize: "10px" }}
                      />
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {habitsByTime.map((d, i) => (
                    <span key={d.name} className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: CHART_COLORS[(i + 2) % CHART_COLORS.length] }} />
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Streak Leaderboard */}
            {streakData.length > 0 && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-4 w-4 text-neon-orange" />
                  <h3 className="text-xs font-bold text-foreground">Streak Rankings</h3>
                </div>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={streakData} layout="vertical" barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 16%)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 10 }} axisLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 9 }} axisLine={false} width={70} />
                      <Tooltip
                        contentStyle={{ background: "hsl(240, 12%, 8%)", border: "1px solid hsl(240, 10%, 20%)", borderRadius: "8px", fontSize: "11px" }}
                        formatter={(val: number) => [`${val} days`, "Streak"]}
                      />
                      <Bar dataKey="streak" radius={[0, 4, 4, 0]}>
                        {streakData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Habits completed per day trend */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-neon-green" />
                <h3 className="text-xs font-bold text-foreground">Completed Per Day</h3>
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={completionByDay}>
                    <defs>
                      <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(160, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 16%)" />
                    <XAxis dataKey="day" tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 10 }} axisLine={false} />
                    <YAxis tick={{ fill: "hsl(240, 5%, 50%)", fontSize: 10 }} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(240, 12%, 8%)", border: "1px solid hsl(240, 10%, 20%)", borderRadius: "8px", fontSize: "11px" }}
                    />
                    <Area type="monotone" dataKey="completed" stroke="hsl(160, 100%, 50%)" fill="url(#completedGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ========== HEATMAP TAB ========== */}
        <TabsContent value="heatmap">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-neon-green" />
              <h3 className="text-xs font-bold text-foreground">7-Day Completion Matrix</h3>
            </div>
            {habits.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Add habits to see the heatmap</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr>
                      <th className="text-left px-1 py-1.5 text-muted-foreground font-medium w-24">Habit</th>
                      {weekDays.map(d => (
                        <th key={d} className="text-center px-1 py-1.5 text-muted-foreground font-medium">{d}</th>
                      ))}
                      <th className="text-center px-1 py-1.5 text-muted-foreground font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map((habit) => {
                      const weekTotal = habit.weekCompletions.filter(Boolean).length;
                      return (
                        <tr key={habit.id} className="border-t border-border/10">
                          <td className="px-1 py-2 text-foreground font-medium truncate max-w-[96px]">{habit.name}</td>
                          {habit.weekCompletions.map((done, i) => (
                            <td key={i} className="text-center px-1 py-2">
                              <div className={`h-5 w-5 mx-auto rounded-sm transition-all ${done ? `bg-${habit.color}/50 shadow-[0_0_6px_hsl(var(--${habit.color})/0.3)]` : "bg-secondary/50"}`} />
                            </td>
                          ))}
                          <td className="text-center px-1 py-2">
                            <span className={`font-bold ${weekTotal >= 5 ? "text-neon-green" : weekTotal >= 3 ? "text-neon-orange" : "text-muted-foreground"}`}>
                              {weekTotal}/7
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {/* Legend */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/20">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm bg-secondary/50" />
                <span className="text-[9px] text-muted-foreground">Missed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm bg-neon-green/50" />
                <span className="text-[9px] text-muted-foreground">Completed</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Habit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-card border-border/30 max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display text-sm">Create New Habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Habit Name</label>
              <input value={newHabit.name} onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                placeholder="e.g. Morning Workout" className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Icon</label>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(iconMap).map(([key, Icon]) => (
                  <button key={key} onClick={() => setNewHabit({ ...newHabit, icon: key })}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${newHabit.icon === key ? "bg-primary/20 border border-primary/50" : "bg-secondary/50 border border-border/30"}`}>
                    <Icon className="h-3.5 w-3.5 text-foreground" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Color</label>
              <div className="flex gap-2">
                {colorOptions.map((c) => (
                  <button key={c} onClick={() => setNewHabit({ ...newHabit, color: c })}
                    className={`h-7 w-7 rounded-full bg-${c}/40 border-2 transition-all ${newHabit.color === c ? `border-${c}` : "border-transparent"}`} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Target</label>
                <input type="number" value={newHabit.target} onChange={(e) => setNewHabit({ ...newHabit, target: Number(e.target.value) })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Unit</label>
                <select value={newHabit.unit} onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Frequency</label>
                <select value={newHabit.frequency} onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {frequencyOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Time</label>
                <select value={newHabit.time_of_day} onChange={(e) => setNewHabit({ ...newHabit, time_of_day: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Difficulty</label>
                <select value={newHabit.difficulty} onChange={(e) => setNewHabit({ ...newHabit, difficulty: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {difficultyOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleCreate} disabled={!newHabit.name.trim()}
              className="w-full py-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary font-semibold text-xs disabled:opacity-40 transition-all hover:bg-primary/30">
              Create Habit
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="glass-card border-border/30 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Suggestions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">What's your fitness goal?</label>
              <div className="flex gap-2">
                <input value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="e.g. fat loss, muscle gain..."
                  className="flex-1 bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                <button onClick={() => fetchSuggestions(goalInput || undefined)}
                  className="px-3 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-semibold">
                  {suggestionsLoading ? "..." : "Ask AI"}
                </button>
              </div>
            </div>
            {suggestionsLoading && (
              <div className="flex items-center justify-center py-6">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <AnimatePresence>
              {suggestions.map((s, i) => {
                const SIcon = iconMap[s.icon] || Sparkles;
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="glass-card p-3 flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg bg-${s.color}/20 flex items-center justify-center shrink-0`}>
                      <SIcon className={`h-3.5 w-3.5 text-${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{s.name}</p>
                      <p className="text-[9px] text-muted-foreground">{s.reason}</p>
                    </div>
                    <button onClick={() => handleAddSuggestion(s)}
                      className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                      <Plus className="h-3 w-3 text-primary" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HabitTrackerPage;

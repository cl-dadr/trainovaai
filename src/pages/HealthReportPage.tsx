import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Target, Calendar, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const weeklyData = [
  { day: "Mon", reps: 42, calories: 120 },
  { day: "Tue", reps: 38, calories: 95 },
  { day: "Wed", reps: 55, calories: 150 },
  { day: "Thu", reps: 0, calories: 30 },
  { day: "Fri", reps: 61, calories: 180 },
  { day: "Sat", reps: 45, calories: 130 },
  { day: "Sun", reps: 30, calories: 80 },
];

const progressData = [
  { week: "W1", reps: 120 },
  { week: "W2", reps: 185 },
  { week: "W3", reps: 210 },
  { week: "W4", reps: 271 },
];

const goals = [
  { label: "Steps Goal", current: 3247, target: 10000, unit: "steps", color: "gradient-primary" },
  { label: "Calorie Goal", current: 186, target: 500, unit: "kcal", color: "gradient-orange" },
  { label: "Workout Goal", current: 3, target: 5, unit: "sessions", color: "gradient-purple" },
];

const dailyReport = [
  { label: "Steps", value: "3,247", icon: "👟" },
  { label: "Calories", value: "186 kcal", icon: "🔥" },
  { label: "Workouts", value: "1", icon: "💪" },
  { label: "Streak", value: "3 days", icon: "🔥" },
];

const HealthReportPage = () => {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center gap-3 mb-6"
      >
        <div className="h-10 w-10 rounded-xl gradient-orange flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">REPORTS</h1>
          <p className="text-xs text-muted-foreground">Your fitness analytics</p>
        </div>
      </motion.div>

      {/* Tab Switcher */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 flex gap-2 mb-6"
      >
        {(["daily", "weekly"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize ${
              activeTab === tab
                ? "gradient-primary text-primary-foreground neon-glow"
                : "glass-card text-muted-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </motion.div>

      {activeTab === "daily" ? (
        <>
          {/* Daily Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative z-10 grid grid-cols-2 gap-3 mb-6"
          >
            {dailyReport.map((item) => (
              <div key={item.label} className="glass-card p-4 text-center">
                <span className="text-2xl">{item.icon}</span>
                <p className="text-lg font-bold text-foreground mt-2">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Goals */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 glass-card p-5 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-neon-orange" />
              <h3 className="font-bold text-foreground">Today's Goals</h3>
            </div>
            <div className="space-y-4">
              {goals.map((goal) => (
                <div key={goal.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-foreground font-medium">{goal.label}</span>
                    <span className="text-muted-foreground">{goal.current} / {goal.target} {goal.unit}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                      transition={{ delay: 0.5, duration: 1 }}
                      className={`h-full rounded-full ${goal.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      ) : (
        <>
          {/* Weekly Reps Chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative z-10 glass-card p-5 mb-6"
          >
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

          {/* Progress Trend */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 glass-card p-5 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-neon-cyan" />
              <h3 className="font-bold text-foreground">Monthly Progress</h3>
            </div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 10% 16%)" />
                  <XAxis dataKey="week" tick={{ fill: "hsl(240 5% 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Line type="monotone" dataKey="reps" stroke="hsl(180 100% 50%)" strokeWidth={2} dot={{ fill: "hsl(180 100% 50%)", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Weekly Summary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="relative z-10 glass-card p-5"
          >
            <h3 className="font-bold text-foreground mb-3">Weekly Summary</h3>
            <div className="space-y-3">
              {[
                { label: "Total Reps", value: "271", change: "+18%" },
                { label: "Avg Accuracy", value: "87%", change: "+5%" },
                { label: "Active Days", value: "6/7", change: "" },
                { label: "Calories Burned", value: "785 kcal", change: "+12%" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{s.value}</span>
                    {s.change && <span className="text-[10px] text-neon-green font-semibold">{s.change}</span>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default HealthReportPage;

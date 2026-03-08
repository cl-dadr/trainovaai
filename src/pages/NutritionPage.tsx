import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Apple, Beef, Egg, Droplets, Plus, Sparkles, Loader2, Flame, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface MealPlan {
  content: string;
}

const waterGoal = 8;

const macroTargets = [
  { label: "Protein", value: 120, target: 150, unit: "g", color: "text-neon-cyan", bg: "bg-neon-cyan/20" },
  { label: "Carbs", value: 180, target: 250, unit: "g", color: "text-neon-orange", bg: "bg-neon-orange/20" },
  { label: "Fats", value: 45, target: 65, unit: "g", color: "text-neon-purple", bg: "bg-neon-purple/20" },
];

const mealLog = [
  { time: "8:00 AM", meal: "Breakfast", items: "Oats, banana, whey shake", cal: 420, emoji: "🥣" },
  { time: "1:00 PM", meal: "Lunch", items: "Rice, dal, chicken, salad", cal: 650, emoji: "🍛" },
  { time: "4:00 PM", meal: "Snack", items: "Almonds, protein bar", cal: 280, emoji: "🥜" },
];

const NutritionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [waterCount, setWaterCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [dietPref, setDietPref] = useState<"veg" | "nonveg" | "vegan">("nonveg");
  const [goal, setGoal] = useState<"fat_loss" | "muscle_gain" | "maintenance">("muscle_gain");

  const totalCal = mealLog.reduce((s, m) => s + m.cal, 0);
  const calTarget = 2200;

  const generateMealPlan = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: {
          messages: [
            {
              role: "user",
              content: `Generate a detailed daily Indian meal plan for a person with these preferences:
- Diet: ${dietPref}
- Goal: ${goal.replace("_", " ")}
- Daily calorie target: ${calTarget} kcal
Include breakfast, lunch, dinner, 2 snacks with exact portions, calories, and macros (protein/carbs/fats). Use common Indian foods. Format nicely with emojis.`,
            },
          ],
          coach: "priya",
        },
      });
      if (error) throw error;

      // Handle streaming response
      if (typeof data === "string") {
        setMealPlan({ content: data });
      } else if (data?.choices?.[0]?.message?.content) {
        setMealPlan({ content: data.choices[0].message.content });
      } else {
        setMealPlan({ content: "Could not generate meal plan. Please try again." });
      }
    } catch (e) {
      console.error("Meal plan error:", e);
      setMealPlan({ content: "Error generating meal plan. Please try again later." });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full glass-card flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">AI Nutrition</h1>
          <p className="text-xs text-muted-foreground">Smart meal planning & tracking</p>
        </div>
      </motion.div>

      {/* Calorie Ring */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="relative z-10 glass-card p-6 mb-6 text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--neon-green))" strokeWidth="8" strokeDasharray={`${(totalCal / calTarget) * 314} 314`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame className="h-5 w-5 text-neon-orange mb-1" />
            <span className="text-2xl font-bold text-foreground">{totalCal}</span>
            <span className="text-[10px] text-muted-foreground">/ {calTarget} kcal</span>
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-3">
          {macroTargets.map((m) => (
            <div key={m.label} className="text-center">
              <div className={`h-1.5 rounded-full ${m.bg} mb-2 overflow-hidden`}>
                <div className="h-full rounded-full bg-current" style={{ width: `${(m.value / m.target) * 100}%`, color: `hsl(var(--${m.label === "Protein" ? "neon-cyan" : m.label === "Carbs" ? "neon-orange" : "neon-purple"}))` }} />
              </div>
              <p className={`text-xs font-semibold ${m.color}`}>{m.value}/{m.target}{m.unit}</p>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Water Tracker */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10 glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-neon-cyan" />
            <span className="font-semibold text-foreground">Water Intake</span>
          </div>
          <span className="text-sm text-neon-cyan font-bold">{waterCount}/{waterGoal} glasses</span>
        </div>
        <div className="flex gap-2 mb-2">
          {Array.from({ length: waterGoal }).map((_, i) => (
            <button key={i} onClick={() => setWaterCount(i + 1)} className={`flex-1 h-8 rounded-lg transition-all ${i < waterCount ? "bg-neon-cyan/30 border border-neon-cyan/50" : "bg-secondary border border-border/30"}`}>
              <Droplets className={`h-3 w-3 mx-auto ${i < waterCount ? "text-neon-cyan" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Meal Log */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">Today's Meals</h3>
          <button className="text-xs text-neon-green flex items-center gap-1"><Plus className="h-3 w-3" /> Add meal</button>
        </div>
        {mealLog.map((meal, i) => (
          <div key={i} className="glass-card p-4 mb-3 flex items-center gap-3">
            <span className="text-2xl">{meal.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{meal.meal}</p>
              <p className="text-xs text-muted-foreground">{meal.items}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-neon-orange">{meal.cal}</p>
              <p className="text-[10px] text-muted-foreground">kcal</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* AI Meal Plan Generator */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="relative z-10 glass-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-neon-green" />
          <h3 className="font-bold text-foreground">AI Meal Planner</h3>
        </div>

        <div className="flex gap-2 mb-3">
          {(["veg", "nonveg", "vegan"] as const).map((d) => (
            <button key={d} onClick={() => setDietPref(d)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${dietPref === d ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {d === "nonveg" ? "Non-Veg" : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          {(["fat_loss", "muscle_gain", "maintenance"] as const).map((g) => (
            <button key={g} onClick={() => setGoal(g)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${goal === g ? "bg-neon-orange/20 text-neon-orange border border-neon-orange/30" : "bg-secondary text-muted-foreground"}`}>
              {g.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>

        <button onClick={generateMealPlan} disabled={generating} className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2">
          {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate Meal Plan</>}
        </button>

        {mealPlan && (
          <div className="mt-4 p-4 rounded-xl bg-secondary/50 border border-border/30">
            <div className="prose prose-sm prose-invert max-w-none text-foreground/90 text-xs">
              <ReactMarkdown>{mealPlan.content}</ReactMarkdown>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default NutritionPage;

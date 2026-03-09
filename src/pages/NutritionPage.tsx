import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Droplets, Plus, Sparkles, Loader2, Flame, Trash2, Scale, Ruler, Calendar, Activity, Target, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { usePremium } from "@/hooks/usePremium";
import PremiumGate from "@/components/PremiumGate";

interface NutritionProfile {
  id: string;
  age: number;
  gender: string;
  weight_kg: number;
  height_cm: number;
  activity_level: string;
  body_goal: string;
  diet_preference: string;
  tdee_calories: number;
  protein_target: number;
  carbs_target: number;
  fats_target: number;
}

interface MealLog {
  id: string;
  meal_type: string;
  meal_name: string;
  items: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  emoji: string;
  date: string;
}

interface WaterLog {
  id: string;
  glasses: number;
  date: string;
}

const waterGoal = 8;

const activityLevels = [
  { value: "sedentary", label: "Sedentary", desc: "Desk job, no exercise" },
  { value: "light", label: "Light", desc: "1-2 workouts/week" },
  { value: "moderate", label: "Moderate", desc: "3-5 workouts/week" },
  { value: "active", label: "Active", desc: "6-7 workouts/week" },
  { value: "very_active", label: "Very Active", desc: "Athlete / physical job" },
];

const bodyGoals = [
  { value: "fat_loss", label: "Fat Loss 🔥", desc: "Caloric deficit" },
  { value: "muscle_gain", label: "Muscle Gain 💪", desc: "Caloric surplus" },
  { value: "maintenance", label: "Maintain ⚖️", desc: "Stay where you are" },
  { value: "lean_bulk", label: "Lean Bulk 🏋️", desc: "Slow muscle gain" },
];

const dietPrefs = [
  { value: "veg", label: "🥗 Veg" },
  { value: "nonveg", label: "🍗 Non-Veg" },
  { value: "vegan", label: "🌱 Vegan" },
  { value: "keto", label: "🥑 Keto" },
];

const mealEmojis: Record<string, string> = {
  breakfast: "🥣",
  lunch: "🍛",
  snack: "🥜",
  dinner: "🍽️",
  pre_workout: "⚡",
  post_workout: "🥤",
};

function calculateTDEE(weight: number, height: number, age: number, gender: string, activity: string, goal: string) {
  // Mifflin-St Jeor
  let bmr = gender === "female"
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  let tdee = Math.round(bmr * (multipliers[activity] || 1.55));

  const goalAdj: Record<string, number> = {
    fat_loss: -500, muscle_gain: 400, lean_bulk: 200, maintenance: 0,
  };
  tdee += goalAdj[goal] || 0;

  // Macro split based on goal
  let proteinRatio = 0.3, carbsRatio = 0.4, fatsRatio = 0.3;
  if (goal === "muscle_gain" || goal === "lean_bulk") { proteinRatio = 0.35; carbsRatio = 0.45; fatsRatio = 0.2; }
  if (goal === "fat_loss") { proteinRatio = 0.4; carbsRatio = 0.3; fatsRatio = 0.3; }

  return {
    tdee,
    protein: Math.round((tdee * proteinRatio) / 4),
    carbs: Math.round((tdee * carbsRatio) / 4),
    fats: Math.round((tdee * fatsRatio) / 9),
  };
}

const NutritionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [waterLog, setWaterLog] = useState<WaterLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mealPlan, setMealPlan] = useState<string | null>(null);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Onboarding form state
  const [formAge, setFormAge] = useState(25);
  const [formGender, setFormGender] = useState("male");
  const [formWeight, setFormWeight] = useState(70);
  const [formHeight, setFormHeight] = useState(170);
  const [formActivity, setFormActivity] = useState("moderate");
  const [formGoal, setFormGoal] = useState("maintenance");
  const [formDiet, setFormDiet] = useState("nonveg");

  // Add meal form
  const [newMealType, setNewMealType] = useState("breakfast");
  const [newMealName, setNewMealName] = useState("");
  const [newMealItems, setNewMealItems] = useState("");
  const [newMealCal, setNewMealCal] = useState("");
  const [newMealProtein, setNewMealProtein] = useState("");
  const [newMealCarbs, setNewMealCarbs] = useState("");
  const [newMealFats, setNewMealFats] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [profileRes, mealsRes, waterRes] = await Promise.all([
      supabase.from("nutrition_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("meal_logs").select("*").eq("user_id", user.id).eq("date", today).order("created_at"),
      supabase.from("water_logs").select("*").eq("user_id", user.id).eq("date", today).maybeSingle(),
    ]);
    if (profileRes.data) setProfile(profileRes.data as NutritionProfile);
    if (mealsRes.data) setMeals(mealsRes.data as MealLog[]);
    if (waterRes.data) setWaterLog(waterRes.data as WaterLog);
    setLoading(false);
  }, [user, today]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const calc = calculateTDEE(formWeight, formHeight, formAge, formGender, formActivity, formGoal);
    const profileData = {
      user_id: user.id,
      age: formAge,
      gender: formGender,
      weight_kg: formWeight,
      height_cm: formHeight,
      activity_level: formActivity,
      body_goal: formGoal,
      diet_preference: formDiet,
      tdee_calories: calc.tdee,
      protein_target: calc.protein,
      carbs_target: calc.carbs,
      fats_target: calc.fats,
    };

    const { data, error } = profile
      ? await supabase.from("nutrition_profiles").update(profileData).eq("user_id", user.id).select().single()
      : await supabase.from("nutrition_profiles").insert(profileData).select().single();

    if (error) { toast.error("Failed to save profile"); console.error(error); }
    else { setProfile(data as NutritionProfile); toast.success("Profile saved! 🎯"); }
    setSavingProfile(false);
  };

  const updateWater = async (count: number) => {
    if (!user) return;
    setWaterLog(prev => prev ? { ...prev, glasses: count } : { id: "", glasses: count, date: today });
    if (waterLog?.id) {
      await supabase.from("water_logs").update({ glasses: count }).eq("id", waterLog.id);
    } else {
      const { data } = await supabase.from("water_logs").insert({ user_id: user.id, glasses: count, date: today }).select().single();
      if (data) setWaterLog(data as WaterLog);
    }
  };

  const addMeal = async () => {
    if (!user || !newMealName.trim()) return;
    const { data, error } = await supabase.from("meal_logs").insert({
      user_id: user.id,
      date: today,
      meal_type: newMealType,
      meal_name: newMealName,
      items: newMealItems || null,
      calories: parseFloat(newMealCal) || 0,
      protein: parseFloat(newMealProtein) || 0,
      carbs: parseFloat(newMealCarbs) || 0,
      fats: parseFloat(newMealFats) || 0,
      emoji: mealEmojis[newMealType] || "🍽️",
    }).select().single();
    if (error) { toast.error("Failed to add meal"); return; }
    if (data) setMeals(prev => [...prev, data as MealLog]);
    setNewMealName(""); setNewMealItems(""); setNewMealCal(""); setNewMealProtein(""); setNewMealCarbs(""); setNewMealFats("");
    setShowAddMeal(false);
    toast.success("Meal logged! 🍽️");
  };

  const deleteMeal = async (id: string) => {
    await supabase.from("meal_logs").delete().eq("id", id);
    setMeals(prev => prev.filter(m => m.id !== id));
    toast.success("Meal removed");
  };

  const generateCyclicMealPlan = async () => {
    if (!profile) return;
    setGenerating(true);
    try {
      const dayOfWeek = new Date().toLocaleDateString("en", { weekday: "long" });
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: {
          messages: [{
            role: "user",
            content: `Generate a detailed ${dayOfWeek} meal plan (cyclic weekly plan, this is for ${dayOfWeek}) for:
- Age: ${profile.age}, Gender: ${profile.gender}
- Weight: ${profile.weight_kg}kg, Height: ${profile.height_cm}cm
- Activity: ${profile.activity_level}
- Goal: ${profile.body_goal.replace("_", " ")}
- Diet: ${profile.diet_preference}
- Daily target: ${profile.tdee_calories} kcal
- Macros: Protein ${profile.protein_target}g, Carbs ${profile.carbs_target}g, Fats ${profile.fats_target}g

Create a CYCLIC meal plan that changes daily across the week. Include breakfast, mid-morning snack, lunch, evening snack, dinner, and optional pre/post workout meals.
For each meal: exact portions, calories, protein/carbs/fats. Use common Indian foods matching the diet preference.
Format with emojis and make it visually appealing.`,
          }],
          coach: "jax",
        },
      });
      if (error) throw error;
      if (typeof data === "string") setMealPlan(data);
      else if (data?.choices?.[0]?.message?.content) setMealPlan(data.choices[0].message.content);
      else setMealPlan("Could not generate meal plan. Please try again.");
    } catch (e) {
      console.error(e);
      setMealPlan("Error generating meal plan. Please try again later.");
    } finally {
      setGenerating(false);
    }
  };

  const totalCal = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0);
  const totalFats = meals.reduce((s, m) => s + m.fats, 0);
  const calTarget = profile?.tdee_calories || 2000;
  const waterCount = waterLog?.glasses || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ONBOARDING: No profile yet
  if (!profile) {
    return (
      <div className="relative min-h-screen pb-24 px-4 pt-6">
        <div className="ambient-glow" />
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full glass-card flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Setup Your Nutrition</h1>
            <p className="text-xs text-muted-foreground">Tell us about yourself for personalized plans</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative z-10 space-y-5">
          {/* Gender */}
          <div className="glass-card p-4">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><User className="h-4 w-4 text-primary" /> Gender</label>
            <div className="flex gap-2">
              {["male", "female"].map(g => (
                <button key={g} onClick={() => setFormGender(g)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${formGender === g ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {g === "male" ? "♂ Male" : "♀ Female"}
                </button>
              ))}
            </div>
          </div>

          {/* Age, Weight, Height */}
          <div className="glass-card p-4 grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Calendar className="h-3 w-3" /> Age</label>
              <input type="number" value={formAge} onChange={e => setFormAge(+e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Scale className="h-3 w-3" /> Weight (kg)</label>
              <input type="number" value={formWeight} onChange={e => setFormWeight(+e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Ruler className="h-3 w-3" /> Height (cm)</label>
              <input type="number" value={formHeight} onChange={e => setFormHeight(+e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          {/* Activity Level */}
          <div className="glass-card p-4">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><Activity className="h-4 w-4 text-primary" /> Activity Level</label>
            <div className="space-y-2">
              {activityLevels.map(a => (
                <button key={a.value} onClick={() => setFormActivity(a.value)} className={`w-full text-left px-4 py-3 rounded-xl transition-all ${formActivity === a.value ? "bg-primary/20 border border-primary/40" : "bg-secondary border border-border/20"}`}>
                  <p className={`text-sm font-semibold ${formActivity === a.value ? "text-primary" : "text-foreground"}`}>{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Body Goal */}
          <div className="glass-card p-4">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><Target className="h-4 w-4 text-primary" /> Body Goal</label>
            <div className="grid grid-cols-2 gap-2">
              {bodyGoals.map(g => (
                <button key={g.value} onClick={() => setFormGoal(g.value)} className={`px-4 py-3 rounded-xl text-left transition-all ${formGoal === g.value ? "bg-primary/20 border border-primary/40" : "bg-secondary border border-border/20"}`}>
                  <p className={`text-sm font-semibold ${formGoal === g.value ? "text-primary" : "text-foreground"}`}>{g.label}</p>
                  <p className="text-[10px] text-muted-foreground">{g.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Diet Preference */}
          <div className="glass-card p-4">
            <label className="text-sm font-semibold text-foreground mb-3 block">Diet Preference</label>
            <div className="grid grid-cols-2 gap-2">
              {dietPrefs.map(d => (
                <button key={d.value} onClick={() => setFormDiet(d.value)} className={`py-3 rounded-xl text-sm font-semibold transition-all ${formDiet === d.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* TDEE Preview */}
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Estimated Daily Calories</p>
            <p className="text-3xl font-bold text-primary">{calculateTDEE(formWeight, formHeight, formAge, formGender, formActivity, formGoal).tdee}</p>
            <p className="text-xs text-muted-foreground">kcal/day (auto-calculated)</p>
          </div>

          <button onClick={saveProfile} disabled={savingProfile} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2">
            {savingProfile ? <><Loader2 className="h-5 w-5 animate-spin" /> Calculating...</> : <><Sparkles className="h-5 w-5" /> Start My Nutrition Plan</>}
          </button>
        </motion.div>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full glass-card flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-display font-bold text-foreground">AI Nutrition</h1>
          <p className="text-xs text-muted-foreground">{profile.body_goal.replace("_", " ")} • {profile.tdee_calories} kcal target</p>
        </div>
        <button onClick={() => { setProfile(null); setFormAge(profile.age); setFormGender(profile.gender); setFormWeight(profile.weight_kg); setFormHeight(profile.height_cm); setFormActivity(profile.activity_level); setFormGoal(profile.body_goal); setFormDiet(profile.diet_preference); }} className="text-xs text-primary font-semibold">Edit Profile</button>
      </motion.div>

      {/* Calorie Ring */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="relative z-10 glass-card p-6 mb-6 text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeDasharray={`${Math.min((totalCal / calTarget) * 314, 314)} 314`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame className="h-5 w-5 text-primary mb-1" />
            <span className="text-2xl font-bold text-foreground">{Math.round(totalCal)}</span>
            <span className="text-[10px] text-muted-foreground">/ {calTarget} kcal</span>
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Protein", value: totalProtein, target: profile.protein_target, unit: "g" },
            { label: "Carbs", value: totalCarbs, target: profile.carbs_target, unit: "g" },
            { label: "Fats", value: totalFats, target: profile.fats_target, unit: "g" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div className="h-1.5 rounded-full bg-secondary mb-2 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((m.value / m.target) * 100, 100)}%` }} />
              </div>
              <p className="text-xs font-semibold text-primary">{Math.round(m.value)}/{m.target}{m.unit}</p>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Water Tracker */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10 glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Water Intake</span>
          </div>
          <span className="text-sm text-primary font-bold">{waterCount}/{waterGoal} glasses</span>
        </div>
        <div className="flex gap-2 mb-2">
          {Array.from({ length: waterGoal }).map((_, i) => (
            <button key={i} onClick={() => updateWater(i + 1)} className={`flex-1 h-8 rounded-lg transition-all ${i < waterCount ? "bg-primary/30 border border-primary/50" : "bg-secondary border border-border/30"}`}>
              <Droplets className={`h-3 w-3 mx-auto ${i < waterCount ? "text-primary" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Today's Meals */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">Today's Meals</h3>
          <button onClick={() => setShowAddMeal(!showAddMeal)} className="text-xs text-primary flex items-center gap-1 font-semibold">
            <Plus className="h-3 w-3" /> Log meal
          </button>
        </div>

        {/* Add Meal Form */}
        <AnimatePresence>
          {showAddMeal && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="glass-card p-4 mb-3 space-y-3 overflow-hidden">
              <div className="flex gap-2 flex-wrap">
                {Object.entries(mealEmojis).map(([type, emoji]) => (
                  <button key={type} onClick={() => setNewMealType(type)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${newMealType === type ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {emoji} {type.replace("_", " ")}
                  </button>
                ))}
              </div>
              <input placeholder="Meal name (e.g. Oats & Banana)" value={newMealName} onChange={e => setNewMealName(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground border border-border/30 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <input placeholder="Items (e.g. 50g oats, 1 banana, milk)" value={newMealItems} onChange={e => setNewMealItems(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground border border-border/30 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <div className="grid grid-cols-4 gap-2">
                <input placeholder="Cal" type="number" value={newMealCal} onChange={e => setNewMealCal(e.target.value)} className="bg-secondary rounded-lg px-2 py-2 text-sm text-foreground border border-border/30 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <input placeholder="Protein" type="number" value={newMealProtein} onChange={e => setNewMealProtein(e.target.value)} className="bg-secondary rounded-lg px-2 py-2 text-sm text-foreground border border-border/30 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <input placeholder="Carbs" type="number" value={newMealCarbs} onChange={e => setNewMealCarbs(e.target.value)} className="bg-secondary rounded-lg px-2 py-2 text-sm text-foreground border border-border/30 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <input placeholder="Fats" type="number" value={newMealFats} onChange={e => setNewMealFats(e.target.value)} className="bg-secondary rounded-lg px-2 py-2 text-sm text-foreground border border-border/30 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <button onClick={addMeal} disabled={!newMealName.trim()} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
                + Log Meal
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {meals.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No meals logged today. Start tracking! 🍽️</p>
          </div>
        ) : (
          meals.map((meal) => (
            <div key={meal.id} className="glass-card p-4 mb-3 flex items-center gap-3">
              <span className="text-2xl">{meal.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{meal.meal_name}</p>
                {meal.items && <p className="text-xs text-muted-foreground truncate">{meal.items}</p>}
                <p className="text-[10px] text-muted-foreground mt-0.5">P:{Math.round(meal.protein)}g C:{Math.round(meal.carbs)}g F:{Math.round(meal.fats)}g</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <div>
                  <p className="text-sm font-bold text-primary">{Math.round(meal.calories)}</p>
                  <p className="text-[10px] text-muted-foreground">kcal</p>
                </div>
                <button onClick={() => deleteMeal(meal.id)} className="text-destructive/60 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))
        )}
      </motion.div>

      {/* AI Cyclic Meal Plan */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="relative z-10 glass-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">AI Cyclic Meal Plan</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Personalized for your {profile.body_goal.replace("_", " ")} goal • Changes daily</p>

        <button onClick={generateCyclicMealPlan} disabled={generating} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating today's plan...</> : <><Sparkles className="h-4 w-4" /> Get Today's Meal Plan</>}
        </button>

        {mealPlan && (
          <div className="mt-4 p-4 rounded-xl bg-secondary/50 border border-border/30">
            <div className="prose prose-sm prose-invert max-w-none text-foreground/90 text-xs">
              <ReactMarkdown>{mealPlan}</ReactMarkdown>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default NutritionPage;

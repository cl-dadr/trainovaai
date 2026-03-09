import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Loader2, Dumbbell, Clock, Flame, Target, ChevronRight, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { usePremium } from "@/hooks/usePremium";
import PremiumGate from "@/components/PremiumGate";

const fitnessLevels = ["Beginner", "Intermediate", "Advanced"];
const goals = ["Fat Loss", "Muscle Gain", "Endurance", "Flexibility", "General Fitness"];
const equipment = ["No Equipment", "Dumbbells", "Resistance Bands", "Full Gym", "Pull-up Bar"];
const frequencies = ["3 days/week", "4 days/week", "5 days/week", "6 days/week"];

const todayWorkout = [
  { exercise: "Push-ups", sets: 4, reps: "12-15", rest: "60s", muscle: "Chest", emoji: "💪" },
  { exercise: "Squats", sets: 4, reps: "15-20", rest: "60s", muscle: "Legs", emoji: "🦵" },
  { exercise: "Plank", sets: 3, reps: "45s", rest: "30s", muscle: "Core", emoji: "🧱" },
  { exercise: "Lunges", sets: 3, reps: "12 each", rest: "45s", muscle: "Legs", emoji: "🏃" },
  { exercise: "Burpees", sets: 3, reps: "10", rest: "60s", muscle: "Full Body", emoji: "🔥" },
];

const weekPlan = [
  { day: "Mon", type: "Push Day", emoji: "💪", active: true },
  { day: "Tue", type: "Pull Day", emoji: "🏋️", active: false },
  { day: "Wed", type: "Rest", emoji: "😴", active: false },
  { day: "Thu", type: "Legs", emoji: "🦵", active: false },
  { day: "Fri", type: "HIIT", emoji: "🔥", active: false },
  { day: "Sat", type: "Yoga", emoji: "🧘", active: false },
  { day: "Sun", type: "Rest", emoji: "😴", active: false },
];

const WorkoutPlannerPage = () => {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [aiPlan, setAiPlan] = useState<string | null>(null);
  const [level, setLevel] = useState("Intermediate");
  const [selectedGoal, setSelectedGoal] = useState("Muscle Gain");
  const [selectedEquipment, setSelectedEquipment] = useState("No Equipment");
  const [frequency, setFrequency] = useState("5 days/week");
  const [showConfig, setShowConfig] = useState(false);

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: {
          messages: [{
            role: "user",
            content: `Create a detailed ${frequency} calisthenics workout plan for a ${level.toLowerCase()} level person.
Goal: ${selectedGoal}
Equipment: ${selectedEquipment}
Include for each day: exercise name, sets, reps, rest time, and form tips.
Make it progressive and include warm-up and cool-down. Use emojis and format nicely.`,
          }],
          coach: "arjun",
        },
      });
      if (error) throw error;
      if (typeof data === "string") setAiPlan(data);
      else if (data?.choices?.[0]?.message?.content) setAiPlan(data.choices[0].message.content);
    } catch (e) {
      console.error(e);
      setAiPlan("Error generating plan. Please try again.");
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
          <h1 className="text-xl font-display font-bold text-foreground">Workout Planner</h1>
          <p className="text-xs text-muted-foreground">AI-powered training programs</p>
        </div>
      </motion.div>

      {/* Week Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground flex items-center gap-2"><Calendar className="h-4 w-4 text-neon-cyan" /> This Week</h3>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {weekPlan.map((d, i) => (
            <div key={i} className={`shrink-0 w-16 glass-card p-3 text-center ${d.active ? "border border-neon-green/30 bg-neon-green/5" : ""}`}>
              <p className={`text-[10px] font-semibold mb-1 ${d.active ? "text-neon-green" : "text-muted-foreground"}`}>{d.day}</p>
              <span className="text-lg">{d.emoji}</span>
              <p className="text-[9px] text-muted-foreground mt-1">{d.type}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Today's Workout */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">Today's Workout</h3>
          <span className="text-xs text-neon-orange flex items-center gap-1"><Clock className="h-3 w-3" /> ~35 min</span>
        </div>
        {todayWorkout.map((ex, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }} className="glass-card p-4 mb-3 flex items-center gap-3">
            <span className="text-2xl">{ex.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{ex.exercise}</p>
              <p className="text-xs text-muted-foreground">{ex.muscle}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-neon-cyan">{ex.sets} × {ex.reps}</p>
              <p className="text-[10px] text-muted-foreground">Rest: {ex.rest}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        ))}

        <button onClick={() => navigate("/camera")} className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 mt-2">
          <Dumbbell className="h-4 w-4" /> Start with AI Camera
        </button>
      </motion.div>

      {/* AI Plan Generator */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="relative z-10 glass-card p-5 mb-6">
        <button onClick={() => setShowConfig(!showConfig)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-neon-green" />
            <h3 className="font-bold text-foreground">AI Plan Generator</h3>
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showConfig ? "rotate-90" : ""}`} />
        </button>

        {showConfig && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Fitness Level</p>
              <div className="flex gap-2">
                {fitnessLevels.map((l) => (
                  <button key={l} onClick={() => setLevel(l)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${level === l ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{l}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Goal</p>
              <div className="flex flex-wrap gap-2">
                {goals.map((g) => (
                  <button key={g} onClick={() => setSelectedGoal(g)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedGoal === g ? "bg-neon-orange/20 text-neon-orange border border-neon-orange/30" : "bg-secondary text-muted-foreground"}`}>{g}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Equipment</p>
              <div className="flex flex-wrap gap-2">
                {equipment.map((e) => (
                  <button key={e} onClick={() => setSelectedEquipment(e)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedEquipment === e ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "bg-secondary text-muted-foreground"}`}>{e}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Frequency</p>
              <div className="flex gap-2">
                {frequencies.map((f) => (
                  <button key={f} onClick={() => setFrequency(f)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${frequency === f ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/30" : "bg-secondary text-muted-foreground"}`}>{f}</button>
                ))}
              </div>
            </div>

            <button onClick={generatePlan} disabled={generating} className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2">
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate AI Plan</>}
            </button>
          </motion.div>
        )}

        {aiPlan && (
          <div className="mt-4 p-4 rounded-xl bg-secondary/50 border border-border/30 max-h-96 overflow-y-auto">
            <div className="prose prose-sm prose-invert max-w-none text-foreground/90 text-xs">
              <ReactMarkdown>{aiPlan}</ReactMarkdown>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default WorkoutPlannerPage;

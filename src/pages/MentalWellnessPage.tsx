import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Brain, Heart, Smile, Meh, Frown, Zap, Wind, Sun, Moon, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePremium } from "@/hooks/usePremium";
import PremiumGate from "@/components/PremiumGate";

const moods = [
  { emoji: "😁", label: "Great", value: 5, color: "neon-green" },
  { emoji: "🙂", label: "Good", value: 4, color: "neon-cyan" },
  { emoji: "😐", label: "Okay", value: 3, color: "neon-orange" },
  { emoji: "😔", label: "Low", value: 2, color: "neon-pink" },
  { emoji: "😫", label: "Terrible", value: 1, color: "destructive" },
];

const energyLevels = [
  { label: "High", icon: Zap, value: 3 },
  { label: "Medium", icon: Sun, value: 2 },
  { label: "Low", icon: Moon, value: 1 },
];

const breathingExercises = [
  { name: "Box Breathing", desc: "4-4-4-4 pattern for calm focus", duration: "4 min", emoji: "🫁" },
  { name: "4-7-8 Relaxation", desc: "Deep relaxation technique", duration: "5 min", emoji: "🧘" },
  { name: "Energizing Breath", desc: "Quick energy boost breathing", duration: "2 min", emoji: "⚡" },
];

const recommendations = [
  { title: "Light Yoga Flow", desc: "15 min gentle stretching", icon: "🧘‍♀️", type: "exercise" },
  { title: "Gratitude Journal", desc: "Write 3 things you're grateful for", icon: "📝", type: "mental" },
  { title: "Nature Walk", desc: "20 min outdoor walk", icon: "🌿", type: "exercise" },
  { title: "Body Scan Meditation", desc: "10 min guided relaxation", icon: "🧠", type: "meditation" },
];

const weekMoods = [4, 5, 3, 4, 5, 3, 0]; // 0 = not logged yet
const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MentalWellnessPage = () => {
  const navigate = useNavigate();
  const { canUseFeature, getRemainingUses, trackUsage } = usePremium();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState(5);
  const [showBreathing, setShowBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"idle" | "inhale" | "hold" | "exhale">("idle");
  const [breathCount, setBreathCount] = useState(0);

  const startBreathing = async () => {
    if (!canUseFeature("wellness")) return;
    await trackUsage("wellness");
    setShowBreathing(true);
    setBreathPhase("inhale");
    setBreathCount(0);
    let phase = 0;
    const phases: ("inhale" | "hold" | "exhale")[] = ["inhale", "hold", "exhale"];
    const durations = [4000, 4000, 4000];
    let count = 0;

    const cycle = () => {
      setBreathPhase(phases[phase % 3]);
      if (phase % 3 === 0) {
        count++;
        setBreathCount(count);
      }
      phase++;
      if (count < 5) {
        setTimeout(cycle, durations[(phase - 1) % 3]);
      } else {
        setTimeout(() => {
          setShowBreathing(false);
          setBreathPhase("idle");
        }, 2000);
      }
    };
    cycle();
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
          <h1 className="text-xl font-display font-bold text-foreground">Mental Wellness</h1>
          <p className="text-xs text-muted-foreground">Mind & body balance</p>
        </div>
      </motion.div>

      {/* Breathing Exercise Overlay */}
      <AnimatePresence>
        {showBreathing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center">
            <motion.div
              animate={{
                scale: breathPhase === "inhale" ? 1.5 : breathPhase === "hold" ? 1.5 : 1,
              }}
              transition={{ duration: breathPhase === "inhale" ? 4 : breathPhase === "exhale" ? 4 : 0.1 }}
              className="w-32 h-32 rounded-full border-4 border-neon-cyan/50 flex items-center justify-center mb-8"
            >
              <div className="w-20 h-20 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                <Wind className="h-8 w-8 text-neon-cyan" />
              </div>
            </motion.div>
            <p className="text-2xl font-display font-bold text-foreground mb-2 capitalize">{breathPhase}</p>
            <p className="text-sm text-muted-foreground">Breath {breathCount}/5</p>
            <button onClick={() => { setShowBreathing(false); setBreathPhase("idle"); }} className="mt-8 text-sm text-muted-foreground underline">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Check-in */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative z-10 glass-card p-5 mb-6">
        <h3 className="font-bold text-foreground mb-1">Daily Check-in</h3>
        <p className="text-xs text-muted-foreground mb-4">How are you feeling today?</p>

        <div className="flex justify-between mb-6">
          {moods.map((m) => (
            <button key={m.value} onClick={() => setSelectedMood(m.value)} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${selectedMood === m.value ? `bg-${m.color}/20 border border-${m.color}/30 scale-110` : ""}`}>
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[10px] text-muted-foreground">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Energy Level */}
        <p className="text-xs text-muted-foreground mb-2">Energy Level</p>
        <div className="flex gap-3 mb-4">
          {energyLevels.map((e) => (
            <button key={e.value} onClick={() => setSelectedEnergy(e.value)} className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${selectedEnergy === e.value ? "bg-neon-orange/20 border border-neon-orange/30" : "bg-secondary"}`}>
              <e.icon className={`h-5 w-5 ${selectedEnergy === e.value ? "text-neon-orange" : "text-muted-foreground"}`} />
              <span className="text-[10px] font-medium text-foreground">{e.label}</span>
            </button>
          ))}
        </div>

        {/* Stress Slider */}
        <p className="text-xs text-muted-foreground mb-2">Stress Level: <span className="text-foreground font-semibold">{stressLevel}/10</span></p>
        <input type="range" min={1} max={10} value={stressLevel} onChange={(e) => setStressLevel(+e.target.value)} className="w-full h-2 rounded-full bg-secondary appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon-purple" />
      </motion.div>

      {/* Mood History */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10 glass-card p-5 mb-6">
        <h3 className="font-bold text-foreground mb-3">This Week's Mood</h3>
        <div className="flex items-end justify-between h-24">
          {weekMoods.map((mood, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-8 rounded-t-lg transition-all ${mood > 0 ? "bg-neon-green/30" : "bg-secondary"}`} style={{ height: `${mood > 0 ? mood * 16 : 8}px` }} />
              <span className="text-[10px] text-muted-foreground">{weekLabels[i]}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Breathing Exercises */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 mb-6">
        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
          <Wind className="h-4 w-4 text-neon-cyan" /> Breathing Exercises
        </h3>
        {canUseFeature("wellness") ? (
          <>
            <PremiumGate remainingUses={getRemainingUses("wellness")} feature="sessions" />
            {breathingExercises.map((ex, i) => (
              <button key={i} onClick={startBreathing} className="w-full glass-card p-4 mb-3 flex items-center gap-3 text-left">
                <span className="text-2xl">{ex.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{ex.name}</p>
                  <p className="text-xs text-muted-foreground">{ex.desc}</p>
                </div>
                <span className="text-xs text-neon-cyan">{ex.duration}</span>
              </button>
            ))}
          </>
        ) : (
          <PremiumGate remainingUses={0} feature="sessions" />
        )}
      </motion.div>

      {/* AI Recommendations */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="relative z-10 mb-6">
        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-neon-green" /> Recommended for You
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {recommendations.map((rec, i) => (
            <div key={i} className="glass-card p-4 text-center">
              <span className="text-2xl block mb-2">{rec.icon}</span>
              <p className="text-xs font-semibold text-foreground">{rec.title}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{rec.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default MentalWellnessPage;

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Share2, Trophy, Flame, Clock, Target, Award, Zap, X } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface ExerciseBreakdown {
  name: string;
  emoji: string;
  reps: number;
}

interface WorkoutShareCardProps {
  totalReps: number;
  avgForm: number;
  calories: number;
  duration: string;
  xpEarned: number;
  bestCombo: number;
  exercises: ExerciseBreakdown[];
  onClose: () => void;
}

const WorkoutShareCard = ({
  totalReps, avgForm, calories, duration, xpEarned, bestCombo, exercises, onClose,
}: WorkoutShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const generateImage = async () => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false,
      });
      return canvas;
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    const canvas = await generateImage();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `workout-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Card saved! 📸");
  };

  const handleShare = async () => {
    const canvas = await generateImage();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "workout.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "My Workout 💪", text: "Check out my workout!" });
        } catch { /* user cancelled */ }
      } else {
        // Fallback to download
        const link = document.createElement("a");
        link.download = `workout-${Date.now()}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        toast.success("Card saved! Share it on Instagram 📸");
      }
    }, "image/png");
  };

  const formColor = avgForm >= 80 ? "#00e5ff" : avgForm >= 60 ? "#ff9500" : "#ff4d6a";
  const formLabel = avgForm >= 80 ? "EXCELLENT" : avgForm >= 60 ? "GOOD" : "NEEDS WORK";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="w-full max-w-sm"
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white">
          <X className="h-5 w-5" />
        </button>

        {/* The card to capture */}
        <div
          ref={cardRef}
          className="rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #0a0a0f 0%, #1a0a2e 30%, #0f1a2e 60%, #0a0a0f 100%)",
            padding: "1px",
          }}
        >
          <div
            className="rounded-3xl p-5"
            style={{
              background: "linear-gradient(145deg, #0d0d15 0%, #1a0e30 40%, #0f1525 70%, #0d0d15 100%)",
            }}
          >
            {/* Header */}
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy className="h-5 w-5" style={{ color: "#ff4d6a" }} />
                <span
                  className="text-xs font-bold tracking-[0.3em] uppercase"
                  style={{ color: "#ff4d6a" }}
                >
                  Workout Complete
                </span>
              </div>
              <h2
                className="text-2xl font-black tracking-tight"
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  background: "linear-gradient(135deg, #ff4d6a, #ff9500, #00e5ff)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                SESSION REPORT
              </h2>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { val: totalReps, label: "TOTAL REPS", icon: <Target className="h-4 w-4" />, color: "#ff4d6a" },
                { val: `${avgForm}%`, label: formLabel, icon: <Award className="h-4 w-4" />, color: formColor },
                { val: calories.toFixed(0), label: "CALORIES", icon: <Flame className="h-4 w-4" />, color: "#ff9500" },
                { val: duration, label: "DURATION", icon: <Clock className="h-4 w-4" />, color: "#a78bfa" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3 text-center"
                  style={{
                    background: `linear-gradient(135deg, ${s.color}10, ${s.color}05)`,
                    border: `1px solid ${s.color}30`,
                  }}
                >
                  <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                  <p className="text-xl font-black" style={{ color: s.color, fontFamily: "'Orbitron', sans-serif" }}>{s.val}</p>
                  <p className="text-[8px] font-bold tracking-wider" style={{ color: `${s.color}99` }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* XP & Combo */}
            <div className="flex gap-2 mb-4">
              <div
                className="flex-1 rounded-xl p-2.5 flex items-center gap-2"
                style={{ background: "#ff950015", border: "1px solid #ff950030" }}
              >
                <Zap className="h-4 w-4" style={{ color: "#ff9500" }} />
                <div>
                  <p className="text-sm font-black" style={{ color: "#ff9500", fontFamily: "'Orbitron', sans-serif" }}>{xpEarned} XP</p>
                  <p className="text-[7px] font-bold" style={{ color: "#ff950080" }}>EARNED</p>
                </div>
              </div>
              <div
                className="flex-1 rounded-xl p-2.5 flex items-center gap-2"
                style={{ background: "#00e5ff15", border: "1px solid #00e5ff30" }}
              >
                <Flame className="h-4 w-4" style={{ color: "#00e5ff" }} />
                <div>
                  <p className="text-sm font-black" style={{ color: "#00e5ff", fontFamily: "'Orbitron', sans-serif" }}>{bestCombo}x</p>
                  <p className="text-[7px] font-bold" style={{ color: "#00e5ff80" }}>BEST COMBO</p>
                </div>
              </div>
            </div>

            {/* Exercise Breakdown */}
            {exercises.length > 0 && (
              <div
                className="rounded-xl p-3 mb-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <p className="text-[9px] font-bold tracking-wider mb-2" style={{ color: "#ffffff80" }}>
                  EXERCISE BREAKDOWN
                </p>
                {exercises.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5" style={{ borderBottom: i < exercises.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <span className="text-xs font-medium" style={{ color: "#ffffffcc" }}>
                      {ex.emoji} {ex.name}
                    </span>
                    <span className="text-xs font-black" style={{ color: "#ff4d6a", fontFamily: "'Orbitron', sans-serif" }}>
                      {ex.reps} reps
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Form Score Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-bold tracking-wider" style={{ color: "#ffffff60" }}>FORM ACCURACY</span>
                <span className="text-xs font-black" style={{ color: formColor, fontFamily: "'Orbitron', sans-serif" }}>{avgForm}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${avgForm}%`,
                    background: `linear-gradient(90deg, ${formColor}, ${formColor}80)`,
                    boxShadow: `0 0 10px ${formColor}60`,
                  }}
                />
              </div>
            </div>

            {/* Branding */}
            <div className="text-center">
              <p
                className="text-[10px] font-black tracking-[0.2em]"
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  background: "linear-gradient(90deg, #ff4d6a, #00e5ff)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                NEON REP RHYTHM
              </p>
              <p className="text-[8px] mt-0.5" style={{ color: "#ffffff40" }}>AI-Powered Fitness</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            disabled={generating}
            className="flex-1 rounded-2xl p-3.5 font-bold text-sm flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #ff4d6a, #ff4d6a80)",
              color: "white",
              opacity: generating ? 0.6 : 1,
            }}
          >
            <Download className="h-4 w-4" />
            Save
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            disabled={generating}
            className="flex-1 rounded-2xl p-3.5 font-bold text-sm flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #00e5ff, #00e5ff80)",
              color: "white",
              opacity: generating ? 0.6 : 1,
            }}
          >
            <Share2 className="h-4 w-4" />
            Share
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WorkoutShareCard;

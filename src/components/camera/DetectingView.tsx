import { RefObject } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crosshair, XCircle, RotateCcw, Volume2, VolumeX,
  Zap, Eye, Target, Sparkles, AlertTriangle, CheckCircle, ShieldAlert,
} from "lucide-react";
import { EXERCISE_NAMES, type ExerciseType, type FormCorrection, type DifficultyLevel } from "@/lib/exerciseDetection";
import { ALL_EXERCISES } from "./types";

interface DetectingViewProps {
  webcamRef: RefObject<Webcam>;
  canvasRef: RefObject<HTMLCanvasElement>;
  currentExercise: ExerciseType;
  lockedExercise: ExerciseType | null;
  totalReps: number;
  formScore: number;
  feedback: string;
  corrections: FormCorrection[];
  combo: number;
  sessionXP: number;
  keypointConf: number;
  rom: number;
  difficulty: DifficultyLevel;
  bestRepForm: number;
  liveCalories: number;
  sessionElapsed: number;
  voiceOn: boolean;
  repFlash: string | null;
  exerciseHistory: Record<string, number>;
  onToggleVoice: () => void;
  onReset: () => void;
  onStop: () => void;
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

const correctionIcon = (severity: FormCorrection["severity"]) => {
  if (severity === "good") return <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="h-3.5 w-3.5 text-neon-orange shrink-0" />;
  return <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />;
};

const DetectingView = ({
  webcamRef, canvasRef, currentExercise, lockedExercise,
  totalReps, formScore, feedback, corrections, combo, sessionXP,
  keypointConf, rom, difficulty, bestRepForm, liveCalories,
  sessionElapsed, voiceOn, repFlash, exerciseHistory,
  onToggleVoice, onReset, onStop,
}: DetectingViewProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="relative flex-1">
        <Webcam ref={webcamRef} audio={false} mirrored className="absolute inset-0 w-full h-full object-cover"
          videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
          style={{ opacity: 0 }} />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />

        {/* Rep flash */}
        <AnimatePresence>
          {repFlash && (
            <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
              className={`absolute inset-0 pointer-events-none ${
                repFlash === "perfect" ? "bg-primary/20" : repFlash === "good" ? "bg-neon-cyan/15" : "bg-neon-orange/10"
              }`} />
          )}
        </AnimatePresence>

        {/* Top HUD */}
        <div className="absolute top-0 left-0 right-0 z-10 p-3 safe-area-top">
          <div className="flex justify-between items-start">
            <div className="bg-black/70 backdrop-blur-md rounded-xl px-4 py-2 flex items-center gap-2 border border-primary/40">
              <Crosshair className="h-5 w-5 text-primary animate-pulse" />
              <div>
                <span className="text-base font-bold text-primary tracking-wide">{EXERCISE_NAMES[currentExercise]}</span>
                {lockedExercise && <span className="ml-1 text-[8px] font-bold text-neon-cyan">🔒</span>}
                {combo >= 3 && <span className="ml-2 text-xs font-bold text-neon-orange animate-pulse">{combo}x 🔥</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={onToggleVoice} className="bg-black/70 backdrop-blur-md rounded-xl p-2 border border-white/20">
                {voiceOn ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
              </button>
              <button onClick={onReset} className="bg-black/70 backdrop-blur-md rounded-xl p-2 border border-neon-cyan/40">
                <RotateCcw className="h-4 w-4 text-neon-cyan" />
              </button>
              <button onClick={onStop} className="bg-black/70 backdrop-blur-md rounded-xl p-2 border border-destructive/40">
                <XCircle className="h-4 w-4 text-destructive" />
              </button>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 mt-2">
            <div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-1 flex items-center gap-1 border border-neon-orange/30">
              <Zap className="h-3 w-3 text-neon-orange" />
              <span className="text-[10px] font-bold text-neon-orange">{sessionXP} XP</span>
            </div>
            <div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-1 flex items-center gap-1 border border-neon-cyan/30">
              <Eye className="h-3 w-3 text-neon-cyan" />
              <span className="text-[10px] font-bold text-neon-cyan">Track {Math.round(keypointConf * 100)}%</span>
            </div>
            {rom > 0 && (
              <div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-1 flex items-center gap-1 border border-primary/30">
                <Target className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-primary">ROM {rom}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Big Circular Rep Counter */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <motion.div key={totalReps} initial={{ scale: 1.3, opacity: 0.9 }} animate={{ scale: 1, opacity: 0.85 }}
            transition={{ duration: 0.3, type: "spring" }} className="relative flex items-center justify-center">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="62" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
              <circle cx="70" cy="70" r="62" fill="none"
                stroke={formScore >= 85 ? "hsl(160,100%,50%)" : formScore >= 60 ? "hsl(25,100%,55%)" : "hsl(0,85%,60%)"}
                strokeWidth="4" strokeDasharray={`${(formScore / 100) * 390} 390`}
                strokeLinecap="round" transform="rotate(-90 70 70)" opacity={0.8} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-display font-black text-white drop-shadow-lg">{totalReps}</span>
              <span className="text-[10px] font-bold text-white/70 tracking-widest mt-0.5">{EXERCISE_NAMES[currentExercise]}</span>
            </div>
          </motion.div>
        </div>

        {/* Best Rep Badge */}
        {bestRepForm > 0 && (
          <div className="absolute top-20 right-3 z-10">
            <div className="bg-black/70 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-neon-orange/40">
              <p className="text-[8px] text-neon-orange font-bold">⭐ BEST REP</p>
              <p className="text-sm font-black text-neon-orange text-center">{bestRepForm}%</p>
            </div>
          </div>
        )}

        {/* Difficulty Badge */}
        <div className="absolute top-20 left-3 z-10">
          <div className={`bg-black/70 backdrop-blur-md rounded-lg px-2.5 py-1.5 border ${
            difficulty === "easy" ? "border-primary/40" : difficulty === "strict" ? "border-destructive/40" : "border-neon-cyan/40"
          }`}>
            <p className="text-[8px] text-white/60 font-bold">STRICTNESS</p>
            <p className={`text-[10px] font-black text-center ${
              difficulty === "easy" ? "text-primary" : difficulty === "strict" ? "text-destructive" : "text-neon-cyan"
            }`}>{difficulty.toUpperCase()}</p>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-3 safe-area-bottom bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-12">
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { val: `${formScore > 0 ? formScore : 0}%`, label: "FORM", color: formScore >= 85 ? "text-primary" : formScore >= 60 ? "text-neon-orange" : "text-destructive" },
              { val: liveCalories.toFixed(1), label: "KCAL", color: "text-neon-orange" },
              { val: formatTime(sessionElapsed), label: "TIME", color: "text-neon-cyan" },
              { val: `${combo}x`, label: "COMBO", color: combo >= 5 ? "text-neon-orange" : "text-white/70" },
            ].map((s, i) => (
              <div key={i} className="bg-black/60 backdrop-blur-md rounded-xl py-2 text-center border border-white/10">
                <p className={`text-lg font-display font-black ${s.color} drop-shadow-lg`}>{s.val}</p>
                <p className="text-[9px] font-bold text-white/70 tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Live exercise count */}
          {Object.keys(exerciseHistory).length > 0 && (
            <div className="bg-black/60 backdrop-blur-md rounded-xl p-2.5 mb-2 border border-white/10">
              <p className="text-[8px] text-white/50 font-bold tracking-widest mb-1">LIVE COUNT</p>
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                {Object.entries(exerciseHistory).map(([ex, count]) => {
                  const meta = ALL_EXERCISES.find(e => e.type === ex);
                  return (
                    <div key={ex} className="flex items-center gap-1.5 shrink-0 bg-white/10 rounded-lg px-2 py-1">
                      <span className="text-xs">{meta?.emoji || "🏋️"}</span>
                      <span className="text-[10px] text-white/70">{meta?.name || ex}</span>
                      <span className="text-sm font-black text-primary">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Coach corrections */}
          {corrections.length > 0 && (
            <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 mb-2 border border-primary/30">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-white tracking-wide">AI FORM COACH</span>
                {voiceOn && <Volume2 className="h-3 w-3 text-primary/60" />}
              </div>
              <div className="space-y-1.5">
                {corrections.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {correctionIcon(c.severity)}
                    <span className="text-xs text-white/90"><b className="text-white">{c.joint}:</b> {c.fix}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback bar */}
          <div className={`bg-black/60 backdrop-blur-md rounded-xl p-3 border-l-4 ${
            formScore >= 85 ? "border-primary" : formScore >= 60 ? "border-neon-orange" : "border-destructive"
          }`}>
            <p className="text-sm font-bold text-white drop-shadow">{feedback}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetectingView;

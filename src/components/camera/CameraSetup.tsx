import { RefObject, useMemo, useState } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Shield, Trophy } from "lucide-react";
import { EXERCISE_NAMES, type ExerciseType, type DifficultyLevel } from "@/lib/exerciseDetection";
import { BODY_GOALS, ALL_EXERCISES, type BodyGoalId } from "./types";

interface CameraSetupProps {
  webcamRef: RefObject<Webcam>;
  bodyGoal: BodyGoalId;
  lockedExercise: ExerciseType | null;
  difficulty: DifficultyLevel;
  voiceOn: boolean;
  totalReps: number;
  formScore: number;
  liveCalories: number;
  sessionElapsed: number;
  onUpdateGoal: (goal: BodyGoalId) => void;
  onLockExercise: (ex: ExerciseType | null) => void;
  onChangeDifficulty: (level: DifficultyLevel) => void;
  onToggleVoice: () => void;
  onStart: () => void;
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

const CAMERA_GUIDES: Record<string, string> = {
  pushup: "Place phone on the floor, 4-6 feet away. Side view works best — show your full body from head to feet horizontally.",
  squat: "Stand 5-8 feet from camera. Front or side view — make sure knees & hips are visible. Full body in frame.",
  plank: "Place phone on floor level, 4-6 feet away. Side view — show full body from head to toes horizontally.",
  jumping_jack: "Stand 6-8 feet from camera. Front view — make sure arms & legs are fully visible when spread.",
  lunge: "Stand 5-7 feet from camera. Side or front view — both legs must be visible from hip to ankle.",
  situp: "Place phone on floor level, 4-6 feet away. Side view — show full body lying down to sitting up.",
  bicep_curl: "Stand 4-6 feet from camera. Front view — keep elbows & wrists visible. Upper body focus.",
  shoulder_press: "Stand 4-6 feet from camera. Front view — arms overhead must be visible. Upper body focus.",
  high_knees: "Stand 5-7 feet from camera. Front view — full body visible, knees lifting to hip height.",
};

const CameraSetup = ({
  webcamRef, bodyGoal, lockedExercise, difficulty, voiceOn,
  totalReps, formScore, liveCalories, sessionElapsed,
  onUpdateGoal, onLockExercise, onChangeDifficulty, onToggleVoice, onStart,
}: CameraSetupProps) => {
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const activeGoal = useMemo(() => BODY_GOALS.find(g => g.id === bodyGoal) || BODY_GOALS[2], [bodyGoal]);
  const goalExercises = activeGoal.exercises as readonly string[];
  const isSideView = lockedExercise === "pushup" || lockedExercise === "plank" || lockedExercise === "situp";

  return (
    <>
      {/* Goal picker */}
      <button onClick={() => setShowGoalPicker(!showGoalPicker)}
        className="relative z-10 w-full glass-card p-3 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{activeGoal.emoji}</span>
          <div>
            <p className="text-xs font-bold text-foreground">{activeGoal.label}</p>
            <p className="text-[9px] text-muted-foreground">{activeGoal.desc}</p>
          </div>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">GOAL</span>
      </button>

      <AnimatePresence>
        {showGoalPicker && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden relative z-10 mb-3">
            <div className="grid grid-cols-3 gap-1.5">
              {BODY_GOALS.map(goal => (
                <button key={goal.id} onClick={() => { onUpdateGoal(goal.id); setShowGoalPicker(false); }}
                  className={`glass-card p-2 text-center transition-all ${bodyGoal === goal.id ? "border border-primary/50 bg-primary/10" : ""}`}>
                  <span className="text-lg">{goal.emoji}</span>
                  <p className="text-[9px] font-bold text-foreground mt-0.5">{goal.label}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise selector */}
      <div className="relative z-10 glass-card p-2.5 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[9px] text-muted-foreground">🎯 TAP TO LOCK • TAP AGAIN TO AUTO-DETECT</p>
          {lockedExercise && (
            <button onClick={() => onLockExercise(null)} className="text-[8px] text-neon-cyan underline">Auto-detect</button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_EXERCISES.map(ex => (
            <button key={ex.type} onClick={() => onLockExercise(lockedExercise === ex.type ? null : ex.type)}
              className={`text-[9px] px-2.5 py-1.5 rounded-xl font-bold transition-all ${
                lockedExercise === ex.type ? "bg-primary text-primary-foreground neon-glow" :
                lockedExercise ? "bg-secondary/50 text-muted-foreground/50" :
                goalExercises.includes(ex.type) ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
              {ex.emoji} {ex.name}
            </button>
          ))}
        </div>

        {lockedExercise && CAMERA_GUIDES[lockedExercise] && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="mt-2 bg-primary/5 rounded-xl p-2.5 border border-primary/20">
            <p className="text-[10px] font-bold text-primary mb-1">📷 Camera Setup for {EXERCISE_NAMES[lockedExercise]}</p>
            <p className="text-[9px] text-muted-foreground leading-relaxed">{CAMERA_GUIDES[lockedExercise]}</p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                {isSideView ? "📐 SIDE VIEW" : "👤 FRONT VIEW"}
              </span>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                {isSideView ? "Phone on floor" : "Phone at chest height"}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Difficulty selector */}
      <div className="relative z-10 glass-card p-2.5 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[9px] text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> FORM STRICTNESS</p>
          <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold ${
            difficulty === "easy" ? "bg-primary/20 text-primary" : difficulty === "strict" ? "bg-destructive/20 text-destructive" : "bg-neon-cyan/20 text-neon-cyan"
          }`}>{difficulty === "easy" ? "Relaxed" : difficulty === "strict" ? "Pro" : "Balanced"}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { level: "easy" as DifficultyLevel, label: "Easy", desc: "Counts most reps", icon: "🟢" },
            { level: "medium" as DifficultyLevel, label: "Medium", desc: "Balanced checks", icon: "🟡" },
            { level: "strict" as DifficultyLevel, label: "Strict", desc: "Perfect form only", icon: "🔴" },
          ]).map(d => (
            <button key={d.level} onClick={() => onChangeDifficulty(d.level)}
              className={`p-2 rounded-xl text-center transition-all ${
                difficulty === d.level ? "bg-primary/20 border border-primary/50 ring-1 ring-primary/30" : "bg-secondary/50 border border-transparent"
              }`}>
              <span className="text-base">{d.icon}</span>
              <p className={`text-[10px] font-bold ${difficulty === d.level ? "text-primary" : "text-foreground"}`}>{d.label}</p>
              <p className="text-[7px] text-muted-foreground">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Camera preview */}
      <div className="relative z-10 aspect-[3/4] max-h-[55vh] rounded-2xl bg-secondary/30 border border-border/50 overflow-hidden mb-3 mx-auto">
        <Webcam ref={webcamRef} audio={false} mirrored className="absolute inset-0 w-full h-full object-cover"
          forceScreenshotSourceSize
          videoConstraints={{ facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 30 } }} />
        <div className="absolute inset-3 border-2 border-primary/20 rounded-xl pointer-events-none" />
        {/* Body outline guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          {(!lockedExercise || !isSideView) && (
            <svg width="120" height="240" viewBox="0 0 120 240" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round">
              <circle cx="60" cy="25" r="15" />
              <line x1="60" y1="40" x2="60" y2="120" />
              <line x1="60" y1="60" x2="30" y2="100" />
              <line x1="60" y1="60" x2="90" y2="100" />
              <line x1="60" y1="120" x2="35" y2="200" />
              <line x1="60" y1="120" x2="85" y2="200" />
            </svg>
          )}
          {isSideView && (
            <svg width="240" height="80" viewBox="0 0 240 80" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round">
              <circle cx="30" cy="30" r="12" />
              <line x1="42" y1="30" x2="170" y2="35" />
              <line x1="50" y1="30" x2="30" y2="55" />
              <line x1="170" y1="35" x2="210" y2="55" />
            </svg>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-xl p-2.5 text-center">
          <p className="text-xs text-white font-bold">
            {lockedExercise ? `Position for ${EXERCISE_NAMES[lockedExercise]}` : "Position your full body in frame"}
          </p>
          <p className="text-[9px] text-white/60">
            {lockedExercise
              ? isSideView ? "📐 Side view • Phone at floor level" : "👤 Front view • Full body visible"
              : "9 exercises • AI detection • Voice coaching"
            }
          </p>
        </div>
      </div>

      {/* Last session stats */}
      {totalReps > 0 && (
        <div className="relative z-10 glass-card p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-2"><Trophy className="h-3 w-3 text-neon-orange" /><span className="text-xs font-bold text-foreground">Last Session</span></div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { val: totalReps, label: "Reps", color: "text-primary" },
              { val: `${formScore}%`, label: "Form", color: "text-neon-cyan" },
              { val: liveCalories.toFixed(1), label: "Kcal", color: "text-neon-orange" },
              { val: formatTime(sessionElapsed), label: "Time", color: "text-foreground" },
            ].map((s, i) => (
              <div key={i} className="text-center bg-secondary/50 rounded-lg p-1.5">
                <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                <p className="text-[8px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice + Start */}
      <div className="relative z-10 flex gap-2 mb-2">
        <button onClick={onToggleVoice}
          className={`rounded-xl p-4 border ${voiceOn ? "border-primary/40 bg-primary/10" : "border-border/50 bg-secondary"}`}>
          {voiceOn ? <Volume2 className="h-5 w-5 text-primary" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
        </button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onStart}
          className="flex-1 rounded-2xl p-4 font-display font-bold text-lg tracking-wider bg-primary text-primary-foreground">
          {lockedExercise ? `START ${EXERCISE_NAMES[lockedExercise]} 🔒` : `START AI TRAINER ${activeGoal.emoji}`}
        </motion.button>
      </div>
    </>
  );
};

export default CameraSetup;

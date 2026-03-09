import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Webcam from "react-webcam";
import { Pose } from "@mediapipe/pose";
import * as cam from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { POSE_CONNECTIONS } from "@mediapipe/pose";
import {
  Camera, Crosshair, Activity, XCircle, Zap, Trophy, RotateCcw, Save,
  Target, Flame, TrendingUp, Dumbbell, ChevronDown, ChevronUp, Clock,
  Award, BarChart3, Sparkles, AlertTriangle, CheckCircle, ShieldAlert,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line, Area, AreaChart } from "recharts";
import { detectExercise, resetDetection, EXERCISE_NAMES, calcCaloriesPerSecond, EXERCISE_MET, type ExerciseType, type Landmark, type FormCorrection } from "@/lib/exerciseDetection";
import { showWorkoutFeedback, showRepMilestoneNotification } from "@/lib/genZNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Landmark indices
const LM = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
};

function calcAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const rad = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((rad * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle);
}

function drawAngleLabel(ctx: CanvasRenderingContext2D, landmark: Landmark, angle: number, label: string, w: number, h: number, color: string) {
  const x = (1 - landmark.x) * w;
  const y = landmark.y * h;
  ctx.save();
  ctx.font = "bold 11px monospace";
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 3;
  const text = `${label}: ${angle}°`;
  ctx.strokeText(text, x + 8, y - 5);
  ctx.fillText(text, x + 8, y - 5);
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, (angle / 360) * Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawFormIndicator(ctx: CanvasRenderingContext2D, score: number, w: number) {
  const barW = 120, barH = 8;
  const x = w - barW - 15, y = 25;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.roundRect(x - 5, y - 15, barW + 10, 30, 8);
  ctx.fill();
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "#fff";
  ctx.fillText(`FORM: ${score}%`, x, y - 3);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.roundRect(x, y + 2, barW, barH, 4);
  ctx.fill();
  const color = score >= 85 ? "hsl(160,100%,50%)" : score >= 60 ? "hsl(25,100%,55%)" : "hsl(0,85%,60%)";
  ctx.fillStyle = color;
  ctx.roundRect(x, y + 2, (score / 100) * barW, barH, 4);
  ctx.fill();
  ctx.restore();
}

function drawExerciseCounters(ctx: CanvasRenderingContext2D, history: Record<string, number>, h: number) {
  const entries = Object.entries(history);
  if (entries.length === 0) return;
  ctx.save();
  let yPos = 60;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.roundRect(8, yPos - 12, 110, entries.length * 20 + 8, 8);
  ctx.fill();
  ctx.font = "bold 10px monospace";
  entries.forEach(([ex, count]) => {
    ctx.fillStyle = "hsl(160,100%,50%)";
    ctx.fillText(`${(EXERCISE_NAMES[ex as ExerciseType] || ex).slice(0, 8)}`, 14, yPos);
    ctx.fillStyle = "#fff";
    ctx.fillText(`${count}`, 90, yPos);
    yPos += 20;
  });
  ctx.restore();
}

// Draw calorie counter on canvas
function drawCalorieCounter(ctx: CanvasRenderingContext2D, calories: number, w: number) {
  ctx.save();
  const x = w - 130, y = 60;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.roundRect(x - 5, y - 12, 120, 24, 8);
  ctx.fill();
  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "hsl(25,100%,55%)";
  ctx.fillText(`🔥 ${calories.toFixed(1)} kcal`, x, y + 4);
  ctx.restore();
}

const BODY_GOALS = [
  { id: "lean", label: "Lean & Toned", emoji: "🏃", desc: "Low body fat, defined muscles", exercises: ["pushup", "plank", "jumping_jack", "situp"] },
  { id: "muscular", label: "Muscular", emoji: "💪", desc: "Maximum muscle mass & strength", exercises: ["pushup", "squat", "lunge"] },
  { id: "athletic", label: "Athletic", emoji: "⚡", desc: "Speed, agility & power", exercises: ["squat", "jumping_jack", "lunge", "pushup"] },
  { id: "endurance", label: "Endurance", emoji: "🔥", desc: "Stamina & cardiovascular fitness", exercises: ["jumping_jack", "plank", "squat", "situp"] },
  { id: "flexible", label: "Flexible & Mobile", emoji: "🧘", desc: "Flexibility & body control", exercises: ["lunge", "squat", "plank"] },
  { id: "powerlifter", label: "Powerlifter", emoji: "🏋️", desc: "Raw strength & explosive power", exercises: ["squat", "pushup", "lunge"] },
] as const;

type BodyGoalId = typeof BODY_GOALS[number]["id"];

interface SessionRecord {
  exercise_type: string;
  reps: number;
  form_score: number | null;
  duration_seconds: number | null;
  created_at: string;
  calories_burned: number | null;
}

const CameraPage = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<cam.Camera | null>(null);
  const { user } = useAuth();

  const [isDetecting, setIsDetecting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [reps, setReps] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [formScore, setFormScore] = useState(0);
  const [currentExercise, setCurrentExercise] = useState<ExerciseType>("unknown");
  const [feedback, setFeedback] = useState("Position yourself in frame");
  const [corrections, setCorrections] = useState<FormCorrection[]>([]);
  const [plankTime, setPlankTime] = useState(0);
  const [isPlank, setIsPlank] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, number>>({});
  const [bodyGoal, setBodyGoal] = useState<BodyGoalId>("athletic");
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [pastSessions, setPastSessions] = useState<SessionRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [liveCalories, setLiveCalories] = useState(0);
  const [userWeight, setUserWeight] = useState(70);
  const [showProgress, setShowProgress] = useState(true);

  const plankIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const calorieIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const repFeedbackCounter = useRef(0);
  const sessionStartRef = useRef<Date | null>(null);
  const formScoresRef = useRef<number[]>([]);
  const currentExerciseRef = useRef<ExerciseType>("unknown");

  // Load body goal, weight, and past sessions
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: profile }, { data: sessions }, { data: nutritionProfile }] = await Promise.all([
        supabase.from("profiles").select("body_goal").eq("user_id", user.id).maybeSingle(),
        supabase.from("workout_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("nutrition_profiles").select("weight_kg").eq("user_id", user.id).maybeSingle(),
      ]);
      if (profile?.body_goal) setBodyGoal(profile.body_goal as BodyGoalId);
      if (sessions) setPastSessions(sessions as SessionRecord[]);
      if (nutritionProfile?.weight_kg) setUserWeight(nutritionProfile.weight_kg);
    };
    load();
  }, [user]);

  const activeGoal = useMemo(() => BODY_GOALS.find(g => g.id === bodyGoal) || BODY_GOALS[2], [bodyGoal]);

  const updateBodyGoal = async (goal: BodyGoalId) => {
    setBodyGoal(goal);
    setShowGoalPicker(false);
    if (user) {
      await supabase.from("profiles").update({ body_goal: goal } as any).eq("user_id", user.id);
      toast.success(`Body goal set to ${BODY_GOALS.find(g => g.id === goal)?.label} ${BODY_GOALS.find(g => g.id === goal)?.emoji}`);
    }
  };

  const checkMilestone = useCallback((total: number) => {
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    if (milestones.includes(total)) showRepMilestoneNotification(total);
  }, []);

  // Auto-save session + update daily_activity + update streaks
  const saveSession = async (exerciseType?: string, repCount?: number) => {
    if (!user) return;
    const exType = exerciseType || (currentExercise === "unknown" ? "mixed" : currentExercise);
    const repsToSave = repCount || totalReps;
    if (repsToSave === 0) return;
    setSaving(true);
    const duration = sessionStartRef.current ? Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000) : 0;
    const avgForm = formScoresRef.current.length > 0
      ? Math.round(formScoresRef.current.reduce((a, b) => a + b, 0) / formScoresRef.current.length)
      : formScore;

    const totalCalsBurned = Math.round(liveCalories * 10) / 10 || repsToSave * 0.5;

    const sessionData = {
      user_id: user.id,
      exercise_type: exType,
      reps: repsToSave,
      form_score: avgForm,
      duration_seconds: duration,
      calories_burned: totalCalsBurned,
    };

    const { error } = await supabase.from("workout_sessions").insert(sessionData);
    if (error) {
      toast.error("Failed to save session");
    } else {
      toast.success("Session auto-saved! 💪🔒");
      setPastSessions(prev => [{ ...sessionData, created_at: new Date().toISOString() }, ...prev]);

      // Save per-exercise breakdown
      for (const [ex, count] of Object.entries(exerciseHistory)) {
        if (ex !== exType && count > 0) {
          await supabase.from("workout_sessions").insert({
            user_id: user.id,
            exercise_type: ex,
            reps: count,
            form_score: avgForm,
            duration_seconds: Math.round(duration * (count / repsToSave)),
            calories_burned: Math.round(count * calcCaloriesPerSecond(ex as ExerciseType, userWeight) * 60 * 10) / 10,
          });
        }
      }

      // Auto-save to daily_activity
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("daily_activity")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

      if (existing) {
        await supabase.from("daily_activity").update({
          calories: (existing.calories || 0) + totalCalsBurned,
          active_minutes: (existing.active_minutes || 0) + Math.ceil(duration / 60),
        }).eq("id", existing.id);
      } else {
        await supabase.from("daily_activity").insert({
          user_id: user.id,
          date: today,
          calories: totalCalsBurned,
          active_minutes: Math.ceil(duration / 60),
          steps: 0,
        });
      }

      // Update streak
      const { data: streak } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (streak) {
        const lastDate = streak.last_workout_date;
        const todayStr = today;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        let newStreak = streak.current_streak;
        if (lastDate === yesterday) newStreak += 1;
        else if (lastDate !== todayStr) newStreak = 1;

        await supabase.from("user_streaks").update({
          current_streak: newStreak,
          longest_streak: Math.max(streak.longest_streak, newStreak),
          total_reps: streak.total_reps + repsToSave,
          total_workouts: streak.total_workouts + 1,
          total_xp: streak.total_xp + repsToSave * 10 + Math.round(avgForm / 10),
          last_workout_date: todayStr,
        }).eq("id", streak.id);
      } else {
        await supabase.from("user_streaks").insert({
          user_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          total_reps: repsToSave,
          total_workouts: 1,
          total_xp: repsToSave * 10,
          last_workout_date: today,
        });
      }
    }
    setSaving(false);
  };

  const onResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const w = canvas.width, h = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(results.image, 0, 0, w, h);

    if (results.poseLandmarks) {
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: "hsl(160, 100%, 50%)", lineWidth: 2 });
      drawLandmarks(ctx, results.poseLandmarks, { color: "hsl(180, 100%, 50%)", lineWidth: 1, radius: 3, fillColor: "hsl(160, 100%, 50%)" });

      const landmarks: Landmark[] = results.poseLandmarks.map((lm: any) => ({
        x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility,
      }));

      const ls = landmarks[LM.LEFT_SHOULDER], rs = landmarks[LM.RIGHT_SHOULDER];
      const le = landmarks[LM.LEFT_ELBOW], re = landmarks[LM.RIGHT_ELBOW];
      const lh = landmarks[LM.LEFT_HIP], rh = landmarks[LM.RIGHT_HIP];
      const lk = landmarks[LM.LEFT_KNEE], rk = landmarks[LM.RIGHT_KNEE];

      const result = detectExercise(landmarks);

      const green = "hsl(160,100%,50%)", cyan = "hsl(180,100%,50%)", orange = "hsl(25,100%,55%)";
      drawAngleLabel(ctx, le, result.angles.leftElbow, "L.Elbow", w, h, cyan);
      drawAngleLabel(ctx, re, result.angles.rightElbow, "R.Elbow", w, h, cyan);
      drawAngleLabel(ctx, lk, result.angles.leftKnee, "L.Knee", w, h, green);
      drawAngleLabel(ctx, rk, result.angles.rightKnee, "R.Knee", w, h, green);
      drawAngleLabel(ctx, lh, result.angles.leftHip, "L.Hip", w, h, orange);
      drawAngleLabel(ctx, rh, result.angles.rightHip, "R.Hip", w, h, orange);

      setCurrentExercise(result.exercise);
      currentExerciseRef.current = result.exercise;
      setFormScore(result.formScore);
      setFeedback(result.feedback);
      setCorrections(result.corrections);

      drawFormIndicator(ctx, result.formScore, w);
      drawCalorieCounter(ctx, liveCalories, w);

      setExerciseHistory(prev => {
        drawExerciseCounters(ctx, prev, h);
        return prev;
      });

      if (result.formScore > 0) formScoresRef.current.push(result.formScore);

      if (result.exercise === "plank" && result.state === "hold") {
        if (!isPlank) setIsPlank(true);
      } else {
        if (isPlank) setIsPlank(false);
      }

      if (result.repCompleted) {
        setReps(prev => prev + 1);
        setTotalReps(prev => {
          const newTotal = prev + 1;
          checkMilestone(newTotal);
          return newTotal;
        });
        setExerciseHistory(prev => ({
          ...prev,
          [result.exercise]: (prev[result.exercise] || 0) + 1,
        }));
        repFeedbackCounter.current++;
        if (repFeedbackCounter.current % 5 === 0) showWorkoutFeedback();
      }
    }
    ctx.restore();
  }, [checkMilestone, isPlank, liveCalories]);

  // Plank timer
  useEffect(() => {
    if (isPlank && isDetecting) {
      plankIntervalRef.current = setInterval(() => setPlankTime(p => p + 1), 1000);
    } else {
      if (plankIntervalRef.current) { clearInterval(plankIntervalRef.current); plankIntervalRef.current = null; }
    }
    return () => { if (plankIntervalRef.current) clearInterval(plankIntervalRef.current); };
  }, [isPlank, isDetecting]);

  // Session timer
  useEffect(() => {
    if (isDetecting) {
      timerIntervalRef.current = setInterval(() => setSessionElapsed(p => p + 1), 1000);
    } else {
      if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [isDetecting]);

  // Live calorie counter
  useEffect(() => {
    if (isDetecting) {
      calorieIntervalRef.current = setInterval(() => {
        const cps = calcCaloriesPerSecond(currentExerciseRef.current, userWeight);
        setLiveCalories(prev => prev + cps);
      }, 1000);
    } else {
      if (calorieIntervalRef.current) { clearInterval(calorieIntervalRef.current); calorieIntervalRef.current = null; }
    }
    return () => { if (calorieIntervalRef.current) clearInterval(calorieIntervalRef.current); };
  }, [isDetecting, userWeight]);

  const startDetection = useCallback(() => {
    const video = webcamRef.current?.video;
    if (!video) return;
    const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
    pose.setOptions({ modelComplexity: 2, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
    pose.onResults(onResults);
    const camera = new cam.Camera(video, { onFrame: async () => { await pose.send({ image: video }); }, width: 640, height: 480 });
    camera.start();
    cameraRef.current = camera;
    setIsDetecting(true);
    setCameraReady(true);
    sessionStartRef.current = new Date();
    setSessionElapsed(0);
    setLiveCalories(0);
    formScoresRef.current = [];
    resetDetection();
  }, [onResults]);

  const stopDetection = () => {
    if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
    setIsDetecting(false);
    setCameraReady(false);
    resetDetection();
    if (totalReps > 0 && user) saveSession();
  };

  const resetWorkout = () => {
    setReps(0); setFormScore(0); setPlankTime(0); setTotalReps(0);
    setSessionElapsed(0); setLiveCalories(0); setCorrections([]);
    setCurrentExercise("unknown"); setFeedback("Position yourself in frame");
    setExerciseHistory({});
    formScoresRef.current = [];
    resetDetection(); repFeedbackCounter.current = 0;
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Stats from past sessions
  const exerciseStats = useMemo(() => {
    const stats: Record<string, { totalReps: number; sessions: number; bestForm: number; totalCals: number }> = {};
    pastSessions.forEach(s => {
      if (!stats[s.exercise_type]) stats[s.exercise_type] = { totalReps: 0, sessions: 0, bestForm: 0, totalCals: 0 };
      stats[s.exercise_type].totalReps += s.reps;
      stats[s.exercise_type].sessions += 1;
      stats[s.exercise_type].bestForm = Math.max(stats[s.exercise_type].bestForm, s.form_score || 0);
      stats[s.exercise_type].totalCals += s.calories_burned || 0;
    });
    return stats;
  }, [pastSessions]);

  // Progress chart data — last 7 days
  const progressChartData = useMemo(() => {
    const days: Record<string, { date: string; reps: number; calories: number; sessions: number; avgForm: number; formCount: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en", { weekday: "short" });
      days[key] = { date: label, reps: 0, calories: 0, sessions: 0, avgForm: 0, formCount: 0 };
    }
    pastSessions.forEach(s => {
      const key = s.created_at.split("T")[0];
      if (days[key]) {
        days[key].reps += s.reps;
        days[key].calories += s.calories_burned || 0;
        days[key].sessions += 1;
        days[key].avgForm += s.form_score || 0;
        days[key].formCount += 1;
      }
    });
    return Object.values(days).map(d => ({
      ...d,
      avgForm: d.formCount > 0 ? Math.round(d.avgForm / d.formCount) : 0,
      calories: Math.round(d.calories),
    }));
  }, [pastSessions]);

  const goalExercises = activeGoal.exercises as readonly string[];

  const correctionIcon = (severity: FormCorrection["severity"]) => {
    switch (severity) {
      case "good": return <CheckCircle className="h-3 w-3 text-primary shrink-0" />;
      case "warning": return <AlertTriangle className="h-3 w-3 text-neon-orange shrink-0" />;
      case "critical": return <ShieldAlert className="h-3 w-3 text-destructive shrink-0" />;
    }
  };

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="relative z-10 flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">AI HOME TRAINER</h1>
          {isDetecting && (
            <p className="text-[10px] text-neon-cyan font-mono">
              <Clock className="h-3 w-3 inline mr-1" />{formatTime(sessionElapsed)} • 🔥 {liveCalories.toFixed(1)} kcal
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDetecting && (
            <>
              <button onClick={resetWorkout} className="glass-card p-2 rounded-lg"><RotateCcw className="h-4 w-4 text-neon-cyan" /></button>
              <button onClick={stopDetection} className="glass-card p-2 rounded-lg"><XCircle className="h-4 w-4 text-destructive" /></button>
            </>
          )}
        </div>
      </motion.div>

      {/* Body Goal Selector */}
      {!isDetecting && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mb-4">
          <button onClick={() => setShowGoalPicker(!showGoalPicker)}
            className="w-full glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activeGoal.emoji}</span>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">{activeGoal.label}</p>
                <p className="text-[10px] text-muted-foreground">{activeGoal.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-1 rounded-full bg-primary/20 text-primary font-semibold">BODY GOAL</span>
              {showGoalPicker ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>

          <AnimatePresence>
            {showGoalPicker && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {BODY_GOALS.map(goal => (
                    <button key={goal.id} onClick={() => updateBodyGoal(goal.id)}
                      className={`glass-card p-3 text-left transition-all ${bodyGoal === goal.id ? "border border-primary/50 bg-primary/10" : ""}`}>
                      <span className="text-lg">{goal.emoji}</span>
                      <p className="text-xs font-bold text-foreground mt-1">{goal.label}</p>
                      <p className="text-[10px] text-muted-foreground">{goal.desc}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {goal.exercises.map(ex => (
                          <span key={ex} className="text-[8px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                            {EXERCISE_NAMES[ex as ExerciseType]}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* 7-Day Progress Charts (when not detecting) */}
      {!isDetecting && showProgress && pastSessions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}
          className="relative z-10 glass-card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-xs font-bold text-foreground">7-Day Progress</p>
            </div>
            <button onClick={() => setShowProgress(false)} className="text-[10px] text-muted-foreground">Hide</button>
          </div>

          {/* Reps Chart */}
          <div className="mb-3">
            <p className="text-[10px] text-muted-foreground mb-1">REPS PER DAY</p>
            <div className="h-24">
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

          {/* Calories Chart */}
          <div className="mb-3">
            <p className="text-[10px] text-muted-foreground mb-1">CALORIES BURNED</p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressChartData}>
                  <defs>
                    <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(25,100%,55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(25,100%,55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="calories" stroke="hsl(25,100%,55%)" fill="url(#calGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Form Score Trend */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">AVG FORM SCORE</p>
            <div className="h-24">
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
        </motion.div>
      )}

      {/* Recommended Exercises for Goal */}
      {!isDetecting && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="relative z-10 glass-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-foreground">Recommended for {activeGoal.label}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {goalExercises.map((ex, i) => {
              const stat = exerciseStats[ex];
              return (
                <div key={ex} className="bg-secondary/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-foreground">
                      {i === 0 && "⭐ "}{EXERCISE_NAMES[ex as ExerciseType]}
                    </span>
                  </div>
                  {stat ? (
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground">{stat.totalReps} total reps</p>
                      <p className="text-[10px] text-muted-foreground">Best form: {stat.bestForm}%</p>
                      <p className="text-[10px] text-neon-orange">🔥 {Math.round(stat.totalCals)} cal</p>
                      <div className="h-1 rounded-full bg-secondary overflow-hidden mt-1">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(stat.bestForm, 100)}%` }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/50">No data yet</p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Camera Feed */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
        className="relative z-10 aspect-[3/4] rounded-3xl bg-secondary/30 border border-border/50 overflow-hidden mb-4">
        <Webcam ref={webcamRef} audio={false} mirrored className="absolute inset-0 w-full h-full object-cover"
          videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
          style={{ opacity: isDetecting ? 0 : 1 }} />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)", opacity: isDetecting ? 1 : 0 }} />
        <div className="absolute inset-4 border-2 border-primary/20 rounded-2xl pointer-events-none" />

        {/* Top HUD */}
        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <div className="glass-card px-3 py-1.5 flex items-center gap-2">
            <Crosshair className={`h-3 w-3 ${isDetecting ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
            <span className={`text-[10px] font-bold ${isDetecting ? "text-primary" : "text-muted-foreground"}`}>
              {isDetecting ? EXERCISE_NAMES[currentExercise] : "STANDBY"}
            </span>
          </div>
          {isDetecting && (
            <div className="flex items-center gap-2">
              <div className="glass-card px-3 py-1.5">
                <span className="text-[10px] font-bold text-neon-orange">🔥 {liveCalories.toFixed(1)} kcal</span>
              </div>
              <div className="glass-card px-3 py-1.5">
                <span className="text-[10px] font-bold text-neon-cyan">{activeGoal.emoji} {activeGoal.label.toUpperCase()}</span>
              </div>
            </div>
          )}
        </div>

        {!isDetecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40">
            <div className="text-center">
              <Camera className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">Position yourself in frame</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Full body visible • AI form correction • Live calories</p>
            </div>
          </div>
        )}

        {/* Bottom Stats Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex gap-2 z-10">
          <div className="glass-card flex-1 p-2.5 text-center">
            <p className="text-2xl font-display font-bold text-primary">{totalReps}</p>
            <p className="text-[9px] text-muted-foreground">REPS</p>
          </div>
          <div className="glass-card flex-1 p-2.5 text-center">
            <p className={`text-2xl font-display font-bold ${formScore >= 85 ? "text-primary" : formScore >= 60 ? "text-neon-orange" : "text-destructive"}`}>
              {formScore > 0 ? `${formScore}%` : "—"}
            </p>
            <p className="text-[9px] text-muted-foreground">FORM</p>
          </div>
          <div className="glass-card flex-1 p-2.5 text-center">
            <p className="text-2xl font-display font-bold text-neon-orange">{liveCalories.toFixed(1)}</p>
            <p className="text-[9px] text-muted-foreground">KCAL</p>
          </div>
          <div className="glass-card flex-1 p-2.5 text-center">
            <p className="text-2xl font-display font-bold text-neon-cyan">{formatTime(sessionElapsed)}</p>
            <p className="text-[9px] text-muted-foreground">TIME</p>
          </div>
        </div>
      </motion.div>

      {/* AI Form Corrections Panel */}
      {isDetecting && corrections.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="relative z-10 glass-card p-4 mb-4 border-l-2 border-primary/40">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-foreground">AI Form Coach</p>
          </div>
          <div className="space-y-2">
            {corrections.map((c, i) => (
              <motion.div key={`${c.joint}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-start gap-2 p-2 rounded-lg ${
                  c.severity === "good" ? "bg-primary/10" :
                  c.severity === "warning" ? "bg-neon-orange/10" : "bg-destructive/10"
                }`}>
                {correctionIcon(c.severity)}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-foreground">{c.joint}: {c.issue}</p>
                  <p className="text-[10px] text-muted-foreground">{c.fix}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Feedback */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className={`relative z-10 glass-card p-4 flex items-center gap-3 mb-4 border-l-2 ${
          formScore >= 85 ? "border-primary/40" : formScore >= 60 ? "border-neon-orange/40" : "border-destructive/40"
        }`}>
        <Activity className={`h-5 w-5 shrink-0 ${formScore >= 85 ? "text-primary" : formScore >= 60 ? "text-neon-orange" : "text-destructive"}`} />
        <div>
          <p className="text-sm text-foreground/80">{feedback}</p>
          {isDetecting && currentExercise !== "unknown" && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {EXERCISE_NAMES[currentExercise]} • {totalReps} reps • 🔥 {liveCalories.toFixed(1)} kcal • {formatTime(sessionElapsed)}
            </p>
          )}
        </div>
      </motion.div>

      {/* Live Exercise Breakdown */}
      {isDetecting && Object.keys(exerciseHistory).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 glass-card p-4 mb-4">
          <p className="text-xs font-bold text-foreground mb-3">📊 Live Breakdown</p>
          <div className="space-y-2">
            {Object.entries(exerciseHistory).map(([ex, count]) => {
              const isRecommended = goalExercises.includes(ex);
              return (
                <div key={ex} className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold w-24 ${isRecommended ? "text-primary" : "text-foreground"}`}>
                    {isRecommended && "⭐ "}{EXERCISE_NAMES[ex as ExerciseType]}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((count / Math.max(totalReps, 1)) * 100, 100)}%` }}
                      className={`h-full rounded-full ${isRecommended ? "bg-primary" : "bg-muted-foreground/50"}`} />
                  </div>
                  <span className="text-sm font-bold text-foreground w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Supported Exercises */}
      {isDetecting && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 glass-card p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-2"><Zap className="h-3 w-3 text-primary inline mr-1" />AI tracks with joint angle analysis + form correction:</p>
          <div className="flex flex-wrap gap-2">
            {(["squat", "lunge", "pushup", "plank", "jumping_jack", "situp"] as ExerciseType[]).map((ex) => {
              const isGoal = goalExercises.includes(ex);
              return (
                <span key={ex} className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                  currentExercise === ex ? "bg-primary text-primary-foreground" :
                  isGoal ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                }`}>
                  {isGoal && "⭐ "}{EXERCISE_NAMES[ex]}
                </span>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Start/Stop Button */}
      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        whileTap={{ scale: 0.97 }} onClick={isDetecting ? stopDetection : startDetection}
        className={`relative z-10 w-full rounded-2xl p-4 font-display font-bold text-lg tracking-wider ${
          isDetecting ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
        }`}>
        {isDetecting ? "STOP & AUTO-SAVE" : `START AI TRAINER ${activeGoal.emoji}`}
      </motion.button>

      {/* Session Summary */}
      {!isDetecting && totalReps > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 glass-card p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-neon-orange" />
              <h3 className="font-bold text-foreground">Session Complete</h3>
            </div>
            <button onClick={() => saveSession()} disabled={saving}
              className="glass-card px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-primary">
              <Save className="h-3 w-3" /> {saving ? "Saving..." : "Save Again"}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-center bg-secondary/50 rounded-xl p-2">
              <p className="text-xl font-bold text-primary">{totalReps}</p>
              <p className="text-[9px] text-muted-foreground">Reps</p>
            </div>
            <div className="text-center bg-secondary/50 rounded-xl p-2">
              <p className="text-xl font-bold text-neon-cyan">{formScore}%</p>
              <p className="text-[9px] text-muted-foreground">Form</p>
            </div>
            <div className="text-center bg-secondary/50 rounded-xl p-2">
              <p className="text-xl font-bold text-neon-orange">{liveCalories.toFixed(1)}</p>
              <p className="text-[9px] text-muted-foreground">Kcal</p>
            </div>
            <div className="text-center bg-secondary/50 rounded-xl p-2">
              <p className="text-xl font-bold text-foreground">{formatTime(sessionElapsed)}</p>
              <p className="text-[9px] text-muted-foreground">Time</p>
            </div>
          </div>
          {Object.keys(exerciseHistory).length > 0 && (
            <div className="space-y-1.5 border-t border-border/30 pt-3">
              {Object.entries(exerciseHistory).map(([ex, count]) => (
                <div key={ex} className="flex items-center justify-between">
                  <span className="text-xs text-foreground">{EXERCISE_NAMES[ex as ExerciseType]}</span>
                  <span className="text-xs font-bold text-primary">{count} reps</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-primary mt-3 text-center">✅ Auto-saved to your account + daily activity + streaks</p>
        </motion.div>
      )}

      {/* Exercise History Section */}
      {!isDetecting && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="relative z-10 mt-4">
          <button onClick={() => setShowHistory(!showHistory)}
            className="w-full glass-card p-4 flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Exercise History</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{pastSessions.length}</span>
            </div>
            {showHistory ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-3">
                {Object.entries(exerciseStats).length > 0 && (
                  <div className="glass-card p-4">
                    <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                      <Award className="h-3 w-3 text-neon-orange" /> All-Time Stats
                    </p>
                    <div className="space-y-3">
                      {Object.entries(exerciseStats)
                        .sort((a, b) => b[1].totalReps - a[1].totalReps)
                        .map(([ex, stat]) => {
                          const isGoal = goalExercises.includes(ex);
                          return (
                            <div key={ex} className={`bg-secondary/50 rounded-xl p-3 ${isGoal ? "border border-primary/20" : ""}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-foreground">
                                  {isGoal && "⭐ "}{EXERCISE_NAMES[ex as ExerciseType] || ex}
                                </span>
                                <span className="text-xs text-muted-foreground">{stat.sessions} sessions</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <p className="text-lg font-bold text-primary">{stat.totalReps}</p>
                                  <p className="text-[9px] text-muted-foreground">Total Reps</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-neon-cyan">{stat.bestForm}%</p>
                                  <p className="text-[9px] text-muted-foreground">Best Form</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-neon-orange">{Math.round(stat.totalCals)}</p>
                                  <p className="text-[9px] text-muted-foreground">Calories</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="glass-card p-4">
                  <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                    <Clock className="h-3 w-3 text-neon-cyan" /> Recent Sessions
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {pastSessions.slice(0, 20).map((s, i) => (
                      <div key={i} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs font-bold text-foreground">{EXERCISE_NAMES[s.exercise_type as ExerciseType] || s.exercise_type}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(s.created_at).toLocaleDateString()} • {s.duration_seconds ? formatTime(s.duration_seconds) : "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-bold text-primary">{s.reps}</p>
                            <p className="text-[9px] text-muted-foreground">reps</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-neon-orange">{Math.round(s.calories_burned || 0)}</p>
                            <p className="text-[9px] text-muted-foreground">kcal</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${(s.form_score || 0) >= 85 ? "text-primary" : "text-neon-orange"}`}>{s.form_score || 0}%</p>
                            <p className="text-[9px] text-muted-foreground">form</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pastSessions.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No sessions yet. Start your first workout!</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default CameraPage;

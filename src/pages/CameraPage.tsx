import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Webcam from "react-webcam";
import { Pose } from "@mediapipe/pose";
import * as cam from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { POSE_CONNECTIONS } from "@mediapipe/pose";
import {
  Camera, Crosshair, Activity, XCircle, Zap, Trophy, RotateCcw, Save,
  Target, Flame, TrendingUp, ChevronDown, ChevronUp, Clock,
  Award, BarChart3, Sparkles, AlertTriangle, CheckCircle, ShieldAlert,
  Pencil, Trash2, X, Check,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, AreaChart, Area, LineChart, Line } from "recharts";
import { detectExercise, resetDetection, EXERCISE_NAMES, calcCaloriesPerSecond, type ExerciseType, type Landmark, type FormCorrection } from "@/lib/exerciseDetection";
import { showWorkoutFeedback, showRepMilestoneNotification } from "@/lib/genZNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const LM = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
};

function drawAngleLabel(ctx: CanvasRenderingContext2D, landmark: Landmark, angle: number, label: string, w: number, h: number, color: string) {
  const x = (1 - landmark.x) * w, y = landmark.y * h;
  ctx.save();
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 3;
  const text = `${label}:${angle}°`;
  ctx.strokeText(text, x + 6, y - 4);
  ctx.fillText(text, x + 6, y - 4);
  ctx.restore();
}

function drawFormIndicator(ctx: CanvasRenderingContext2D, score: number, w: number) {
  const barW = 100, barH = 6, x = w - barW - 10, y = 18;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.roundRect(x - 4, y - 12, barW + 8, 24, 6);
  ctx.fill();
  ctx.font = "bold 9px monospace";
  ctx.fillStyle = "#fff";
  ctx.fillText(`FORM ${score}%`, x, y - 2);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.roundRect(x, y + 2, barW, barH, 3);
  ctx.fill();
  const color = score >= 85 ? "hsl(160,100%,50%)" : score >= 60 ? "hsl(25,100%,55%)" : "hsl(0,85%,60%)";
  ctx.fillStyle = color;
  ctx.roundRect(x, y + 2, (score / 100) * barW, barH, 3);
  ctx.fill();
  ctx.restore();
}

const BODY_GOALS = [
  { id: "lean", label: "Lean & Toned", emoji: "🏃", desc: "Low body fat", exercises: ["pushup", "plank", "jumping_jack", "situp"] },
  { id: "muscular", label: "Muscular", emoji: "💪", desc: "Max muscle", exercises: ["pushup", "squat", "lunge"] },
  { id: "athletic", label: "Athletic", emoji: "⚡", desc: "Speed & power", exercises: ["squat", "jumping_jack", "lunge", "pushup"] },
  { id: "endurance", label: "Endurance", emoji: "🔥", desc: "Stamina", exercises: ["jumping_jack", "plank", "squat", "situp"] },
  { id: "flexible", label: "Flexible", emoji: "🧘", desc: "Flexibility", exercises: ["lunge", "squat", "plank"] },
  { id: "powerlifter", label: "Powerlifter", emoji: "🏋️", desc: "Raw strength", exercises: ["squat", "pushup", "lunge"] },
] as const;
type BodyGoalId = typeof BODY_GOALS[number]["id"];

interface SessionRecord {
  id?: string;
  exercise_type: string;
  reps: number;
  form_score: number | null;
  duration_seconds: number | null;
  created_at: string;
  calories_burned: number | null;
  user_id?: string;
}

const CameraPage = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<cam.Camera | null>(null);
  const { user } = useAuth();

  const [isDetecting, setIsDetecting] = useState(false);
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
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [liveCalories, setLiveCalories] = useState(0);
  const [userWeight, setUserWeight] = useState(70);
  const [activeTab, setActiveTab] = useState<"camera" | "progress" | "history">("camera");
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editReps, setEditReps] = useState(0);
  const [editFormScore, setEditFormScore] = useState(0);

  const plankIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const calorieIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const repFeedbackCounter = useRef(0);
  const sessionStartRef = useRef<Date | null>(null);
  const formScoresRef = useRef<number[]>([]);
  const currentExerciseRef = useRef<ExerciseType>("unknown");

  // Load data + subscribe to realtime
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: profile }, { data: sessions }, { data: np }] = await Promise.all([
        supabase.from("profiles").select("body_goal").eq("user_id", user.id).maybeSingle(),
        supabase.from("workout_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("nutrition_profiles").select("weight_kg").eq("user_id", user.id).maybeSingle(),
      ]);
      if (profile?.body_goal) setBodyGoal(profile.body_goal as BodyGoalId);
      if (sessions) setPastSessions(sessions as SessionRecord[]);
      if (np?.weight_kg) setUserWeight(np.weight_kg);
    };
    load();

    // Realtime subscription
    const channel = supabase
      .channel("workout-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "workout_sessions", filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setPastSessions(prev => {
            const exists = prev.some(s => s.id === (payload.new as SessionRecord).id);
            if (exists) return prev;
            return [payload.new as SessionRecord, ...prev];
          });
        } else if (payload.eventType === "UPDATE") {
          setPastSessions(prev => prev.map(s => s.id === (payload.new as SessionRecord).id ? payload.new as SessionRecord : s));
        } else if (payload.eventType === "DELETE") {
          setPastSessions(prev => prev.filter(s => s.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const activeGoal = useMemo(() => BODY_GOALS.find(g => g.id === bodyGoal) || BODY_GOALS[2], [bodyGoal]);

  const updateBodyGoal = async (goal: BodyGoalId) => {
    setBodyGoal(goal); setShowGoalPicker(false);
    if (user) {
      await supabase.from("profiles").update({ body_goal: goal } as any).eq("user_id", user.id);
      toast.success(`Goal: ${BODY_GOALS.find(g => g.id === goal)?.label} ${BODY_GOALS.find(g => g.id === goal)?.emoji}`);
    }
  };

  const checkMilestone = useCallback((total: number) => {
    if ([10, 25, 50, 100, 250, 500, 1000].includes(total)) showRepMilestoneNotification(total);
  }, []);

  const saveSession = async () => {
    if (!user || totalReps === 0) return;
    setSaving(true);
    const exType = currentExercise === "unknown" ? "mixed" : currentExercise;
    const duration = sessionStartRef.current ? Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000) : 0;
    const avgForm = formScoresRef.current.length > 0
      ? Math.round(formScoresRef.current.reduce((a, b) => a + b, 0) / formScoresRef.current.length) : formScore;
    const totalCals = Math.round(liveCalories * 10) / 10 || totalReps * 0.5;

    // Save main session
    await supabase.from("workout_sessions").insert({
      user_id: user.id, exercise_type: exType, reps: totalReps,
      form_score: avgForm, duration_seconds: duration, calories_burned: totalCals,
    });

    // Save per-exercise breakdown
    for (const [ex, count] of Object.entries(exerciseHistory)) {
      if (ex !== exType && count > 0) {
        await supabase.from("workout_sessions").insert({
          user_id: user.id, exercise_type: ex, reps: count, form_score: avgForm,
          duration_seconds: Math.round(duration * (count / totalReps)),
          calories_burned: Math.round(count * calcCaloriesPerSecond(ex as ExerciseType, userWeight) * 60 * 10) / 10,
        });
      }
    }

    // Update daily_activity
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase.from("daily_activity").select("*").eq("user_id", user.id).eq("date", today).maybeSingle();
    if (existing) {
      await supabase.from("daily_activity").update({
        calories: (existing.calories || 0) + totalCals,
        active_minutes: (existing.active_minutes || 0) + Math.ceil(duration / 60),
      }).eq("id", existing.id);
    } else {
      await supabase.from("daily_activity").insert({ user_id: user.id, date: today, calories: totalCals, active_minutes: Math.ceil(duration / 60), steps: 0 });
    }

    // Update streak
    const { data: streak } = await supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (streak) {
      let newStreak = streak.current_streak;
      if (streak.last_workout_date === yesterday) newStreak += 1;
      else if (streak.last_workout_date !== today) newStreak = 1;
      await supabase.from("user_streaks").update({
        current_streak: newStreak, longest_streak: Math.max(streak.longest_streak, newStreak),
        total_reps: streak.total_reps + totalReps, total_workouts: streak.total_workouts + 1,
        total_xp: streak.total_xp + totalReps * 10 + Math.round(avgForm / 10), last_workout_date: today,
      }).eq("id", streak.id);
    } else {
      await supabase.from("user_streaks").insert({
        user_id: user.id, current_streak: 1, longest_streak: 1,
        total_reps: totalReps, total_workouts: 1, total_xp: totalReps * 10, last_workout_date: today,
      });
    }

    toast.success("Workout saved! 💪🔒");
    setSaving(false);
  };

  // Edit & Delete handlers
  const handleEditSession = async (id: string) => {
    const { error } = await supabase.from("workout_sessions").update({ reps: editReps, form_score: editFormScore }).eq("id", id);
    if (error) toast.error("Update failed");
    else toast.success("Workout updated ✏️");
    setEditingSession(null);
  };

  const handleDeleteSession = async (id: string) => {
    const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else toast.success("Workout deleted 🗑️");
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
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: "hsl(160,100%,50%)", lineWidth: 2 });
      drawLandmarks(ctx, results.poseLandmarks, { color: "hsl(180,100%,50%)", lineWidth: 1, radius: 3, fillColor: "hsl(160,100%,50%)" });
      const landmarks: Landmark[] = results.poseLandmarks.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility }));
      const le = landmarks[LM.LEFT_ELBOW], re = landmarks[LM.RIGHT_ELBOW];
      const lh = landmarks[LM.LEFT_HIP], rh = landmarks[LM.RIGHT_HIP];
      const lk = landmarks[LM.LEFT_KNEE], rk = landmarks[LM.RIGHT_KNEE];

      const result = detectExercise(landmarks);
      const green = "hsl(160,100%,50%)", cyan = "hsl(180,100%,50%)", orange = "hsl(25,100%,55%)";
      drawAngleLabel(ctx, le, result.angles.leftElbow, "LE", w, h, cyan);
      drawAngleLabel(ctx, re, result.angles.rightElbow, "RE", w, h, cyan);
      drawAngleLabel(ctx, lk, result.angles.leftKnee, "LK", w, h, green);
      drawAngleLabel(ctx, rk, result.angles.rightKnee, "RK", w, h, green);
      drawAngleLabel(ctx, lh, result.angles.leftHip, "LH", w, h, orange);
      drawAngleLabel(ctx, rh, result.angles.rightHip, "RH", w, h, orange);
      drawFormIndicator(ctx, result.formScore, w);

      setCurrentExercise(result.exercise);
      currentExerciseRef.current = result.exercise;
      setFormScore(result.formScore);
      setFeedback(result.feedback);
      setCorrections(result.corrections);
      if (result.formScore > 0) formScoresRef.current.push(result.formScore);

      if (result.exercise === "plank" && result.state === "hold") { if (!isPlank) setIsPlank(true); }
      else { if (isPlank) setIsPlank(false); }

      if (result.repCompleted) {
        setTotalReps(prev => { const n = prev + 1; checkMilestone(n); return n; });
        setExerciseHistory(prev => ({ ...prev, [result.exercise]: (prev[result.exercise] || 0) + 1 }));
        repFeedbackCounter.current++;
        if (repFeedbackCounter.current % 5 === 0) showWorkoutFeedback();
      }
    }
    ctx.restore();
  }, [checkMilestone, isPlank]);

  useEffect(() => {
    if (isPlank && isDetecting) { plankIntervalRef.current = setInterval(() => setPlankTime(p => p + 1), 1000); }
    else { if (plankIntervalRef.current) { clearInterval(plankIntervalRef.current); plankIntervalRef.current = null; } }
    return () => { if (plankIntervalRef.current) clearInterval(plankIntervalRef.current); };
  }, [isPlank, isDetecting]);

  useEffect(() => {
    if (isDetecting) { timerIntervalRef.current = setInterval(() => setSessionElapsed(p => p + 1), 1000); }
    else { if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; } }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [isDetecting]);

  useEffect(() => {
    if (isDetecting) {
      calorieIntervalRef.current = setInterval(() => {
        setLiveCalories(prev => prev + calcCaloriesPerSecond(currentExerciseRef.current, userWeight));
      }, 1000);
    } else { if (calorieIntervalRef.current) { clearInterval(calorieIntervalRef.current); calorieIntervalRef.current = null; } }
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
    sessionStartRef.current = new Date();
    setSessionElapsed(0); setLiveCalories(0); formScoresRef.current = [];
    resetDetection();
  }, [onResults]);

  const stopDetection = () => {
    if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
    setIsDetecting(false);
    resetDetection();
    if (totalReps > 0 && user) saveSession();
  };

  const resetWorkout = () => {
    setTotalReps(0); setFormScore(0); setPlankTime(0); setSessionElapsed(0); setLiveCalories(0);
    setCorrections([]); setCurrentExercise("unknown"); setFeedback("Position yourself in frame");
    setExerciseHistory({}); formScoresRef.current = []; resetDetection(); repFeedbackCounter.current = 0;
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const progressChartData = useMemo(() => {
    const days: Record<string, { date: string; reps: number; calories: number; avgForm: number; formCount: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split("T")[0];
      days[key] = { date: d.toLocaleDateString("en", { weekday: "short" }), reps: 0, calories: 0, avgForm: 0, formCount: 0 };
    }
    pastSessions.forEach(s => {
      const key = s.created_at.split("T")[0];
      if (days[key]) {
        days[key].reps += s.reps;
        days[key].calories += s.calories_burned || 0;
        days[key].avgForm += s.form_score || 0;
        days[key].formCount += 1;
      }
    });
    return Object.values(days).map(d => ({ ...d, avgForm: d.formCount > 0 ? Math.round(d.avgForm / d.formCount) : 0, calories: Math.round(d.calories) }));
  }, [pastSessions]);

  const goalExercises = activeGoal.exercises as readonly string[];

  const correctionIcon = (severity: FormCorrection["severity"]) => {
    if (severity === "good") return <CheckCircle className="h-3 w-3 text-primary shrink-0" />;
    if (severity === "warning") return <AlertTriangle className="h-3 w-3 text-neon-orange shrink-0" />;
    return <ShieldAlert className="h-3 w-3 text-destructive shrink-0" />;
  };

  // ─── DETECTING VIEW: fullscreen camera ───
  if (isDetecting) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Camera fills screen */}
        <div className="relative flex-1">
          <Webcam ref={webcamRef} audio={false} mirrored className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0 }}
            videoConstraints={{ facingMode: "user", width: 640, height: 480 }} />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />

          {/* Top HUD */}
          <div className="absolute top-2 left-2 right-2 flex justify-between z-10 safe-area-top">
            <div className="glass-card px-2 py-1 flex items-center gap-1">
              <Crosshair className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary">{EXERCISE_NAMES[currentExercise]}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="glass-card px-2 py-1">
                <span className="text-[10px] font-bold text-neon-orange">🔥{liveCalories.toFixed(1)}</span>
              </div>
              <button onClick={resetWorkout} className="glass-card p-1.5"><RotateCcw className="h-3 w-3 text-neon-cyan" /></button>
              <button onClick={stopDetection} className="glass-card p-1.5"><XCircle className="h-3 w-3 text-destructive" /></button>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-2 safe-area-bottom">
            <div className="flex gap-1.5 mb-2">
              <div className="glass-card flex-1 py-2 text-center">
                <p className="text-xl font-display font-bold text-primary">{totalReps}</p>
                <p className="text-[8px] text-muted-foreground">REPS</p>
              </div>
              <div className="glass-card flex-1 py-2 text-center">
                <p className={`text-xl font-display font-bold ${formScore >= 85 ? "text-primary" : formScore >= 60 ? "text-neon-orange" : "text-destructive"}`}>
                  {formScore > 0 ? `${formScore}%` : "—"}
                </p>
                <p className="text-[8px] text-muted-foreground">FORM</p>
              </div>
              <div className="glass-card flex-1 py-2 text-center">
                <p className="text-xl font-display font-bold text-neon-orange">{liveCalories.toFixed(1)}</p>
                <p className="text-[8px] text-muted-foreground">KCAL</p>
              </div>
              <div className="glass-card flex-1 py-2 text-center">
                <p className="text-xl font-display font-bold text-neon-cyan">{formatTime(sessionElapsed)}</p>
                <p className="text-[8px] text-muted-foreground">TIME</p>
              </div>
            </div>

            {/* AI Corrections */}
            {corrections.length > 0 && (
              <div className="glass-card p-2 mb-2">
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[9px] font-bold text-white">AI COACH</span>
                </div>
                <div className="space-y-1">
                  {corrections.slice(0, 2).map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      {correctionIcon(c.severity)}
                      <span className="text-[9px] text-white/80"><b>{c.joint}:</b> {c.fix}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback bar */}
            <div className={`glass-card p-2 border-l-2 ${formScore >= 85 ? "border-primary/60" : formScore >= 60 ? "border-neon-orange/60" : "border-destructive/60"}`}>
              <p className="text-[10px] text-white/90">{feedback}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── NON-DETECTING VIEW: tabs ───
  return (
    <div className="relative min-h-screen pb-24 px-3 pt-4">
      <div className="ambient-glow" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-3">
        <h1 className="text-xl font-display font-bold text-foreground">AI TRAINER</h1>
        <div className="flex items-center gap-1">
          {(["camera", "progress", "history"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-[10px] px-3 py-1.5 rounded-full font-bold transition-all ${
                activeTab === tab ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
              {tab === "camera" ? "🎥" : tab === "progress" ? "📊" : "📋"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── CAMERA TAB ─── */}
      {activeTab === "camera" && (
        <>
          {/* Goal selector compact */}
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
                    <button key={goal.id} onClick={() => updateBodyGoal(goal.id)}
                      className={`glass-card p-2 text-center transition-all ${bodyGoal === goal.id ? "border border-primary/50 bg-primary/10" : ""}`}>
                      <span className="text-lg">{goal.emoji}</span>
                      <p className="text-[9px] font-bold text-foreground mt-0.5">{goal.label}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Camera — centered, fixed aspect ratio */}
          <div className="relative z-10 aspect-[3/4] max-h-[55vh] rounded-2xl bg-secondary/30 border border-border/50 overflow-hidden mb-3 mx-auto">
            <Webcam ref={webcamRef} audio={false} mirrored className="absolute inset-0 w-full h-full object-cover"
              videoConstraints={{ facingMode: "user", width: 640, height: 480 }} />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)", opacity: 0 }} />
            <div className="absolute inset-3 border-2 border-primary/20 rounded-xl pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center bg-background/30">
              <div className="text-center">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Full body in frame</p>
                <p className="text-[9px] text-muted-foreground/60">AI form correction • Live calories</p>
              </div>
            </div>
          </div>

          {/* Session summary (if stopped with reps) */}
          {totalReps > 0 && (
            <div className="relative z-10 glass-card p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5"><Trophy className="h-3 w-3 text-neon-orange" /><span className="text-xs font-bold text-foreground">Last Session</span></div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <div className="text-center bg-secondary/50 rounded-lg p-1.5">
                  <p className="text-lg font-bold text-primary">{totalReps}</p><p className="text-[8px] text-muted-foreground">Reps</p>
                </div>
                <div className="text-center bg-secondary/50 rounded-lg p-1.5">
                  <p className="text-lg font-bold text-neon-cyan">{formScore}%</p><p className="text-[8px] text-muted-foreground">Form</p>
                </div>
                <div className="text-center bg-secondary/50 rounded-lg p-1.5">
                  <p className="text-lg font-bold text-neon-orange">{liveCalories.toFixed(1)}</p><p className="text-[8px] text-muted-foreground">Kcal</p>
                </div>
                <div className="text-center bg-secondary/50 rounded-lg p-1.5">
                  <p className="text-lg font-bold text-foreground">{formatTime(sessionElapsed)}</p><p className="text-[8px] text-muted-foreground">Time</p>
                </div>
              </div>
              <p className="text-[9px] text-primary mt-2 text-center">✅ Auto-saved + synced in real-time</p>
            </div>
          )}

          {/* Start Button */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={startDetection}
            className="relative z-10 w-full rounded-2xl p-4 font-display font-bold text-lg tracking-wider bg-primary text-primary-foreground">
            START AI TRAINER {activeGoal.emoji}
          </motion.button>
        </>
      )}

      {/* ─── PROGRESS TAB ─── */}
      {activeTab === "progress" && (
        <div className="relative z-10 space-y-3">
          {pastSessions.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No workout data yet</p>
              <p className="text-[10px] text-muted-foreground/60">Complete a workout to see progress</p>
            </div>
          ) : (
            <>
              <div className="glass-card p-4">
                <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> REPS / DAY</p>
                <div className="h-28">
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

              <div className="glass-card p-4">
                <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Flame className="h-3 w-3" /> CALORIES BURNED</p>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={progressChartData}>
                      <defs>
                        <linearGradient id="calG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(25,100%,55%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(25,100%,55%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                      <Area type="monotone" dataKey="calories" stroke="hsl(25,100%,55%)" fill="url(#calG)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-4">
                <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Award className="h-3 w-3" /> FORM ACCURACY</p>
                <div className="h-28">
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
            </>
          )}
        </div>
      )}

      {/* ─── HISTORY TAB (editable) ─── */}
      {activeTab === "history" && (
        <div className="relative z-10 space-y-2">
          <p className="text-xs text-muted-foreground mb-1">Tap ✏️ to edit or 🗑️ to delete • Synced in real-time</p>
          {pastSessions.length === 0 && (
            <div className="glass-card p-8 text-center">
              <Clock className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No sessions yet</p>
            </div>
          )}
          {pastSessions.map((s) => (
            <div key={s.id || s.created_at} className="glass-card p-3">
              {editingSession === s.id ? (
                // Edit mode
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">{EXERCISE_NAMES[s.exercise_type as ExerciseType] || s.exercise_type}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-muted-foreground">Reps</label>
                      <input type="number" value={editReps} onChange={e => setEditReps(Number(e.target.value))}
                        className="w-full bg-secondary rounded-lg px-2 py-1.5 text-xs text-foreground border border-border/50" />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">Form %</label>
                      <input type="number" value={editFormScore} onChange={e => setEditFormScore(Number(e.target.value))} min={0} max={100}
                        className="w-full bg-secondary rounded-lg px-2 py-1.5 text-xs text-foreground border border-border/50" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditSession(s.id!)} className="flex-1 bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1">
                      <Check className="h-3 w-3" /> Save
                    </button>
                    <button onClick={() => setEditingSession(null)} className="flex-1 bg-secondary text-foreground rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1">
                      <X className="h-3 w-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">{EXERCISE_NAMES[s.exercise_type as ExerciseType] || s.exercise_type}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()} • {s.duration_seconds ? formatTime(s.duration_seconds) : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{s.reps}</p>
                      <p className="text-[8px] text-muted-foreground">reps</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-neon-orange">{Math.round(s.calories_burned || 0)}</p>
                      <p className="text-[8px] text-muted-foreground">kcal</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${(s.form_score || 0) >= 85 ? "text-primary" : "text-neon-orange"}`}>{s.form_score || 0}%</p>
                      <p className="text-[8px] text-muted-foreground">form</p>
                    </div>
                    <div className="flex flex-col gap-1 ml-1">
                      <button onClick={() => { setEditingSession(s.id!); setEditReps(s.reps); setEditFormScore(s.form_score || 0); }}
                        className="p-1 rounded bg-secondary"><Pencil className="h-3 w-3 text-neon-cyan" /></button>
                      <button onClick={() => handleDeleteSession(s.id!)}
                        className="p-1 rounded bg-secondary"><Trash2 className="h-3 w-3 text-destructive" /></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CameraPage;

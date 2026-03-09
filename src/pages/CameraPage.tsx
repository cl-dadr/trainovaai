import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Webcam from "react-webcam";
import { Pose } from "@mediapipe/pose";
import * as cam from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { POSE_CONNECTIONS } from "@mediapipe/pose";
import {
  Camera, Crosshair, XCircle, Trophy, RotateCcw,
  Flame, TrendingUp, Clock,
  Award, BarChart3, Sparkles, AlertTriangle, CheckCircle, ShieldAlert,
  Pencil, Trash2, X, Check, ListChecks, Plus, SkipForward,
  CircleCheck, Play, Volume2, VolumeX, Star, Zap, Shield, Target,
  Medal, Crown, Eye,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, AreaChart, Area, LineChart, Line } from "recharts";
import { detectExercise, resetDetection, EXERCISE_NAMES, calcCaloriesPerSecond, type ExerciseType, type Landmark, type FormCorrection } from "@/lib/exerciseDetection";
import { speakRepComplete, speakFormCorrection, speakMilestone, speakSessionEnd, speakCombo, setVoiceEnabled, isVoiceEnabled } from "@/lib/voiceCoaching";
import { showWorkoutFeedback, showRepMilestoneNotification } from "@/lib/genZNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import WorkoutShareCard from "@/components/WorkoutShareCard";

const LM = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
};

// ─── Canvas Drawing Helpers ───
function drawAngleLabel(ctx: CanvasRenderingContext2D, landmark: Landmark, angle: number, label: string, w: number, h: number, color: string) {
  const x = (1 - landmark.x) * w, y = landmark.y * h;
  ctx.save();
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.lineWidth = 4;
  const text = `${label}:${angle}°`;
  ctx.strokeText(text, x + 8, y - 6);
  ctx.fillText(text, x + 8, y - 6);
  ctx.restore();
}

function drawFormIndicator(ctx: CanvasRenderingContext2D, score: number, w: number) {
  const barW = 140, barH = 10, x = w - barW - 14, y = 28;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.roundRect(x - 6, y - 18, barW + 12, 36, 8);
  ctx.fill();
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "#fff";
  ctx.fillText(`FORM ${score}%`, x, y - 4);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.roundRect(x, y + 4, barW, barH, 5);
  ctx.fill();
  const color = score >= 85 ? "hsl(160,100%,50%)" : score >= 60 ? "hsl(25,100%,55%)" : "hsl(0,85%,60%)";
  ctx.fillStyle = color;
  ctx.roundRect(x, y + 4, (score / 100) * barW, barH, 5);
  ctx.fill();
  ctx.restore();
}

function drawKeypointConfidence(ctx: CanvasRenderingContext2D, confidence: number, w: number) {
  const x = 10, y = 18;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.roundRect(x, y - 12, 110, 22, 6);
  ctx.fill();
  ctx.font = "bold 10px monospace";
  const color = confidence > 0.8 ? "hsl(160,100%,50%)" : confidence > 0.6 ? "hsl(50,100%,55%)" : "hsl(0,85%,60%)";
  ctx.fillStyle = color;
  ctx.fillText(`👁 TRACKING ${Math.round(confidence * 100)}%`, x + 4, y + 2);
  ctx.restore();
}

function drawRepFlash(ctx: CanvasRenderingContext2D, w: number, h: number, quality: string) {
  ctx.save();
  const colors: Record<string, string> = {
    perfect: "rgba(0,255,128,0.15)",
    good: "rgba(0,200,255,0.12)",
    fair: "rgba(255,165,0,0.1)",
    poor: "rgba(255,50,50,0.1)",
  };
  ctx.fillStyle = colors[quality] || "rgba(255,255,255,0.05)";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

const BODY_GOALS = [
  { id: "lean", label: "Lean & Toned", emoji: "🏃", desc: "Low body fat", exercises: ["pushup", "plank", "jumping_jack", "situp", "high_knees"] },
  { id: "muscular", label: "Muscular", emoji: "💪", desc: "Max muscle", exercises: ["pushup", "squat", "lunge", "bicep_curl", "shoulder_press"] },
  { id: "athletic", label: "Athletic", emoji: "⚡", desc: "Speed & power", exercises: ["squat", "jumping_jack", "lunge", "pushup", "high_knees"] },
  { id: "endurance", label: "Endurance", emoji: "🔥", desc: "Stamina", exercises: ["jumping_jack", "plank", "squat", "situp", "high_knees"] },
  { id: "flexible", label: "Flexible", emoji: "🧘", desc: "Flexibility", exercises: ["lunge", "squat", "plank"] },
  { id: "powerlifter", label: "Powerlifter", emoji: "🏋️", desc: "Raw strength", exercises: ["squat", "pushup", "lunge", "shoulder_press", "bicep_curl"] },
] as const;
type BodyGoalId = typeof BODY_GOALS[number]["id"];

const ALL_EXERCISES: { type: ExerciseType; name: string; emoji: string; muscle: string; difficulty: string }[] = [
  { type: "pushup", name: "Push-Up", emoji: "💪", muscle: "Chest, Triceps, Core", difficulty: "Medium" },
  { type: "squat", name: "Squat", emoji: "🦵", muscle: "Quads, Glutes, Hamstrings", difficulty: "Medium" },
  { type: "plank", name: "Plank", emoji: "🧘", muscle: "Core, Shoulders", difficulty: "Easy" },
  { type: "jumping_jack", name: "Jumping Jack", emoji: "⭐", muscle: "Full Body, Cardio", difficulty: "Easy" },
  { type: "lunge", name: "Lunge", emoji: "🏃", muscle: "Quads, Glutes, Balance", difficulty: "Medium" },
  { type: "situp", name: "Sit-Up", emoji: "🔥", muscle: "Abs, Hip Flexors", difficulty: "Easy" },
  { type: "bicep_curl", name: "Bicep Curl", emoji: "💪", muscle: "Biceps, Forearms", difficulty: "Easy" },
  { type: "shoulder_press", name: "Shoulder Press", emoji: "🏋️", muscle: "Shoulders, Triceps", difficulty: "Medium" },
  { type: "high_knees", name: "High Knees", emoji: "🏃", muscle: "Core, Cardio, Quads", difficulty: "Easy" },
];

// Gamification
const XP_PER_REP = 10;
const XP_FORM_BONUS = { perfect: 5, good: 3, fair: 1, poor: 0, none: 0 };
const COMBO_THRESHOLDS = [3, 5, 10, 15, 20];
const ACHIEVEMENTS = [
  { id: "first_rep", label: "First Rep!", icon: "⭐", condition: (reps: number) => reps >= 1 },
  { id: "ten_reps", label: "Getting Warm", icon: "🔥", condition: (reps: number) => reps >= 10 },
  { id: "twenty_five", label: "Quarter Century", icon: "💪", condition: (reps: number) => reps >= 25 },
  { id: "fifty", label: "Half Century", icon: "🏆", condition: (reps: number) => reps >= 50 },
  { id: "hundred", label: "Centurion", icon: "👑", condition: (reps: number) => reps >= 100 },
  { id: "perfect_form", label: "Perfect Form", icon: "🎯", condition: (_: number, form: number) => form >= 95 },
];

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

interface TodoItem {
  id?: string;
  exercise: ExerciseType;
  targetReps: number;
  status: "pending" | "done" | "skipped";
  actualReps?: number;
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
  const [activeTab, setActiveTab] = useState<"camera" | "exercises" | "progress" | "todo" | "history">("camera");
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editReps, setEditReps] = useState(0);
  const [editFormScore, setEditFormScore] = useState(0);

  // To-do list state
  const [todoList, setTodoList] = useState<TodoItem[]>([]);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodoExercise, setNewTodoExercise] = useState<ExerciseType>("pushup");
  const [newTodoReps, setNewTodoReps] = useState(10);

  // Gamification state
  const [sessionXP, setSessionXP] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [earnedAchievements, setEarnedAchievements] = useState<string[]>([]);
  const [showSessionReport, setShowSessionReport] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [repFlash, setRepFlash] = useState<string | null>(null);
  const [lockedExercise, setLockedExercise] = useState<ExerciseType | null>(null);
  const [keypointConf, setKeypointConf] = useState(0);
  const [rom, setRom] = useState(0);

  const plankIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const calorieIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const repFeedbackCounter = useRef(0);
  const sessionStartRef = useRef<Date | null>(null);
  const formScoresRef = useRef<number[]>([]);
  const currentExerciseRef = useRef<ExerciseType>("unknown");
  const lastCorrectionRef = useRef<string>("");
  const comboRef = useRef(0);

  // Load data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: profile }, { data: sessions }, { data: np }, { data: todos }] = await Promise.all([
        supabase.from("profiles").select("body_goal").eq("user_id", user.id).maybeSingle(),
        supabase.from("workout_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
        supabase.from("nutrition_profiles").select("weight_kg").eq("user_id", user.id).maybeSingle(),
        supabase.from("workout_todos").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      ]);
      if (profile?.body_goal) setBodyGoal(profile.body_goal as BodyGoalId);
      if (sessions) setPastSessions(sessions as SessionRecord[]);
      if (np?.weight_kg) setUserWeight(np.weight_kg);
      if (todos) setTodoList(todos.map((t: any) => ({ id: t.id, exercise: t.exercise_type as ExerciseType, targetReps: t.target_reps, status: t.status, actualReps: t.actual_reps })));
    };
    load();

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

  const exerciseStats = useMemo(() => {
    const stats: Record<string, { totalReps: number; totalCals: number; totalSessions: number; avgForm: number; formSum: number; bestForm: number; totalDuration: number; last7Days: number[] }> = {};
    ALL_EXERCISES.forEach(ex => {
      stats[ex.type] = { totalReps: 0, totalCals: 0, totalSessions: 0, avgForm: 0, formSum: 0, bestForm: 0, totalDuration: 0, last7Days: Array(7).fill(0) };
    });
    pastSessions.forEach(s => {
      const key = s.exercise_type;
      if (!stats[key]) return;
      stats[key].totalReps += s.reps;
      stats[key].totalCals += s.calories_burned || 0;
      stats[key].totalSessions += 1;
      stats[key].formSum += s.form_score || 0;
      stats[key].bestForm = Math.max(stats[key].bestForm, s.form_score || 0);
      stats[key].totalDuration += s.duration_seconds || 0;
      const daysAgo = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000);
      if (daysAgo >= 0 && daysAgo < 7) stats[key].last7Days[6 - daysAgo] += s.reps;
    });
    Object.values(stats).forEach(st => { st.avgForm = st.totalSessions > 0 ? Math.round(st.formSum / st.totalSessions) : 0; });
    return stats;
  }, [pastSessions]);

  const updateBodyGoal = async (goal: BodyGoalId) => {
    setBodyGoal(goal); setShowGoalPicker(false);
    if (user) {
      await supabase.from("profiles").update({ body_goal: goal } as any).eq("user_id", user.id);
      toast.success(`Goal: ${BODY_GOALS.find(g => g.id === goal)?.label}`);
    }
  };

  const checkMilestone = useCallback((total: number) => {
    if ([10, 25, 50, 100, 250, 500, 1000].includes(total)) {
      showRepMilestoneNotification(total);
      speakMilestone(total);
    }
  }, []);

  const checkAchievements = useCallback((reps: number, form: number) => {
    ACHIEVEMENTS.forEach(a => {
      if (!earnedAchievements.includes(a.id) && a.condition(reps, form)) {
        setEarnedAchievements(prev => [...prev, a.id]);
        toast.success(`${a.icon} Achievement: ${a.label}!`);
      }
    });
  }, [earnedAchievements]);

  const saveSession = async () => {
    if (!user || totalReps === 0) return;
    setSaving(true);
    const exType = currentExercise === "unknown" ? "mixed" : currentExercise;
    const duration = sessionStartRef.current ? Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000) : 0;
    const avgForm = formScoresRef.current.length > 0
      ? Math.round(formScoresRef.current.reduce((a, b) => a + b, 0) / formScoresRef.current.length) : formScore;
    const totalCals = Math.round(liveCalories * 10) / 10 || totalReps * 0.5;

    speakSessionEnd(totalReps, avgForm, totalCals);

    // Save each exercise individually with proper names
    const exerciseEntries = Object.entries(exerciseHistory);
    if (exerciseEntries.length > 0) {
      for (const [ex, count] of exerciseEntries) {
        if (count > 0) {
          const exDuration = totalReps > 0 ? Math.round(duration * (count / totalReps)) : 0;
          const exCals = Math.round(count * calcCaloriesPerSecond(ex as ExerciseType, userWeight) * 60 * 10) / 10;
          await supabase.from("workout_sessions").insert({
            user_id: user.id, exercise_type: ex, reps: count, form_score: avgForm,
            duration_seconds: exDuration, calories_burned: exCals,
          });
        }
      }
    } else {
      // Fallback: save as single session
      await supabase.from("workout_sessions").insert({
        user_id: user.id, exercise_type: exType, reps: totalReps,
        form_score: avgForm, duration_seconds: duration, calories_burned: totalCals,
      });
    }

    for (const item of todoList) {
      if (item.status === "pending" && exerciseHistory[item.exercise]) {
        const actual = exerciseHistory[item.exercise] || 0;
        if (actual >= item.targetReps && item.id) {
          await supabase.from("workout_todos").update({ status: "done", actual_reps: actual } as any).eq("id", item.id);
        }
      }
    }
    setTodoList(prev => prev.map(item => {
      if (item.status === "pending" && exerciseHistory[item.exercise]) {
        const actual = exerciseHistory[item.exercise] || 0;
        if (actual >= item.targetReps) return { ...item, status: "done" as const, actualReps: actual };
      }
      return item;
    }));

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

    const { data: streak } = await supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (streak) {
      let newStreak = streak.current_streak;
      if (streak.last_workout_date === yesterday) newStreak += 1;
      else if (streak.last_workout_date !== today) newStreak = 1;
      await supabase.from("user_streaks").update({
        current_streak: newStreak, longest_streak: Math.max(streak.longest_streak, newStreak),
        total_reps: streak.total_reps + totalReps, total_workouts: streak.total_workouts + 1,
        total_xp: streak.total_xp + sessionXP, last_workout_date: today,
      }).eq("id", streak.id);
    } else {
      await supabase.from("user_streaks").insert({
        user_id: user.id, current_streak: 1, longest_streak: 1,
        total_reps: totalReps, total_workouts: 1, total_xp: sessionXP, last_workout_date: today,
      });
    }

    toast.success("Workout saved! 💪");
    setSaving(false);
    setShowSessionReport(true);
  };

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

  // To-do handlers
  const addTodoItem = async () => {
    if (!user) return;
    const { data } = await supabase.from("workout_todos").insert({
      user_id: user.id, exercise_type: newTodoExercise, target_reps: newTodoReps, status: "pending", actual_reps: 0,
    } as any).select().single();
    if (data) setTodoList(prev => [...prev, { id: (data as any).id, exercise: newTodoExercise, targetReps: newTodoReps, status: "pending" }]);
    setShowAddTodo(false);
    toast.success(`Added ${EXERCISE_NAMES[newTodoExercise]} x${newTodoReps}`);
  };

  const skipTodoItem = async (index: number) => {
    const item = todoList[index];
    if (item?.id) await supabase.from("workout_todos").update({ status: "skipped" } as any).eq("id", item.id);
    setTodoList(prev => prev.map((it, i) => i === index ? { ...it, status: "skipped" as const } : it));
  };

  const markTodoDone = async (index: number) => {
    const item = todoList[index];
    if (item?.id) await supabase.from("workout_todos").update({ status: "done", actual_reps: item.targetReps } as any).eq("id", item.id);
    setTodoList(prev => prev.map((it, i) => i === index ? { ...it, status: "done" as const, actualReps: it.targetReps } : it));
  };

  const removeTodoItem = async (index: number) => {
    const item = todoList[index];
    if (item?.id) await supabase.from("workout_todos").delete().eq("id", item.id);
    setTodoList(prev => prev.filter((_, i) => i !== index));
  };

  const resetTodoList = async () => {
    if (!user) return;
    for (const item of todoList) {
      if (item.id) await supabase.from("workout_todos").update({ status: "pending", actual_reps: 0 } as any).eq("id", item.id);
    }
    setTodoList(prev => prev.map(item => ({ ...item, status: "pending" as const, actualReps: undefined })));
  };

  const todoProgress = useMemo(() => {
    if (todoList.length === 0) return 0;
    return Math.round((todoList.filter(t => t.status === "done").length / todoList.length) * 100);
  }, [todoList]);

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoiceEnabled(next);
    toast.success(next ? "Voice coaching ON 🔊" : "Voice coaching OFF 🔇");
  };

  // ─── Pose Results Handler ───
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
      // Draw enhanced skeleton
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: "hsl(160,100%,50%)", lineWidth: 3 });
      drawLandmarks(ctx, results.poseLandmarks, { color: "hsl(180,100%,50%)", lineWidth: 1, radius: 4, fillColor: "hsl(160,100%,50%)" });

      const landmarks: Landmark[] = results.poseLandmarks.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility }));
      const le = landmarks[LM.LEFT_ELBOW], re = landmarks[LM.RIGHT_ELBOW];
      const lh = landmarks[LM.LEFT_HIP], rh = landmarks[LM.RIGHT_HIP];
      const lk = landmarks[LM.LEFT_KNEE], rk = landmarks[LM.RIGHT_KNEE];

      const result = detectExercise(landmarks, lockedExercise);

      // Draw angle labels
      const green = "hsl(160,100%,50%)", cyan = "hsl(180,100%,50%)", orange = "hsl(25,100%,55%)";
      drawAngleLabel(ctx, le, result.angles.leftElbow, "LE", w, h, cyan);
      drawAngleLabel(ctx, re, result.angles.rightElbow, "RE", w, h, cyan);
      drawAngleLabel(ctx, lk, result.angles.leftKnee, "LK", w, h, green);
      drawAngleLabel(ctx, rk, result.angles.rightKnee, "RK", w, h, green);
      drawAngleLabel(ctx, lh, result.angles.leftHip, "LH", w, h, orange);
      drawAngleLabel(ctx, rh, result.angles.rightHip, "RH", w, h, orange);

      // Draw HUD indicators on canvas
      drawFormIndicator(ctx, result.formScore, w);
      drawKeypointConfidence(ctx, result.keypointConfidence, w);

      setCurrentExercise(result.exercise);
      currentExerciseRef.current = result.exercise;
      setFormScore(result.formScore);
      setFeedback(result.feedback);
      setCorrections(result.corrections);
      setKeypointConf(result.keypointConfidence);
      setRom(result.rom);
      if (result.formScore > 0) formScoresRef.current.push(result.formScore);

      // Voice corrections (throttled, only on change)
      if (result.corrections.length > 0) {
        const critCorrection = result.corrections.find(c => c.severity === "critical");
        if (critCorrection && critCorrection.fix !== lastCorrectionRef.current) {
          lastCorrectionRef.current = critCorrection.fix;
          speakFormCorrection(critCorrection.joint, critCorrection.fix, "critical");
        }
      }

      if (result.exercise === "plank" && result.state === "hold") { if (!isPlank) setIsPlank(true); }
      else { if (isPlank) setIsPlank(false); }

      if (result.repCompleted) {
        // Rep flash
        setRepFlash(result.repQuality);
        drawRepFlash(ctx, w, h, result.repQuality);
        setTimeout(() => setRepFlash(null), 300);

        setTotalReps(prev => {
          const n = prev + 1;
          checkMilestone(n);
          checkAchievements(n, result.formScore);
          speakRepComplete(n, EXERCISE_NAMES[result.exercise]);
          return n;
        });

        // XP & combo
        const xpGain = XP_PER_REP + (XP_FORM_BONUS[result.repQuality] || 0);
        setSessionXP(prev => prev + xpGain);

        if (result.formScore >= 75) {
          comboRef.current += 1;
          setCombo(comboRef.current);
          setBestCombo(prev => Math.max(prev, comboRef.current));
          if (COMBO_THRESHOLDS.includes(comboRef.current)) speakCombo(comboRef.current);
        } else {
          comboRef.current = 0;
          setCombo(0);
        }

        setExerciseHistory(prev => ({ ...prev, [result.exercise]: (prev[result.exercise] || 0) + 1 }));
        repFeedbackCounter.current++;
        if (repFeedbackCounter.current % 5 === 0) showWorkoutFeedback();
      }
    }
    ctx.restore();
  }, [checkMilestone, checkAchievements, isPlank, lockedExercise]);

  // Timers
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

  const poseRef = useRef<Pose | null>(null);

  const startDetection = useCallback(() => {
    setIsDetecting(true);
    sessionStartRef.current = new Date();
    setSessionElapsed(0); setLiveCalories(0); setSessionXP(0); setCombo(0); setBestCombo(0);
    setEarnedAchievements([]); setShowSessionReport(false);
    formScoresRef.current = []; comboRef.current = 0;
    resetDetection();
  }, []);

  // Initialize MediaPipe when detecting starts — runs after render so video element is mounted
  useEffect(() => {
    if (!isDetecting) return;
    let cancelled = false;

    const initPose = () => {
      const video = webcamRef.current?.video;
      if (!video || cancelled) return;

      // Wait until video is ready
      if (!video.readyState || video.readyState < 2) {
        video.addEventListener("loadeddata", () => { if (!cancelled) initPose(); }, { once: true });
        return;
      }

      const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
      pose.setOptions({ modelComplexity: 2, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      pose.onResults(onResults);
      poseRef.current = pose;

      const camera = new cam.Camera(video, {
        onFrame: async () => {
          if (poseRef.current) {
            try { await poseRef.current.send({ image: video }); } catch {}
          }
        },
        width: 640,
        height: 480,
      });
      camera.start();
      cameraRef.current = camera;
    };

    // Small delay to ensure Webcam component has mounted and video is streaming
    const timeout = setTimeout(initPose, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [isDetecting, onResults]);

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
    setSessionXP(0); setCombo(0); setBestCombo(0); setEarnedAchievements([]); comboRef.current = 0;
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
      if (days[key]) { days[key].reps += s.reps; days[key].calories += s.calories_burned || 0; days[key].avgForm += s.form_score || 0; days[key].formCount += 1; }
    });
    return Object.values(days).map(d => ({ ...d, avgForm: d.formCount > 0 ? Math.round(d.avgForm / d.formCount) : 0, calories: Math.round(d.calories) }));
  }, [pastSessions]);

  const goalExercises = activeGoal.exercises as readonly string[];

  const correctionIcon = (severity: FormCorrection["severity"]) => {
    if (severity === "good") return <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />;
    if (severity === "warning") return <AlertTriangle className="h-3.5 w-3.5 text-neon-orange shrink-0" />;
    return <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />;
  };

  const TABS = [
    { key: "camera" as const, icon: "🎥", label: "Train" },
    { key: "exercises" as const, icon: "🏋️", label: "Stats" },
    { key: "todo" as const, icon: "📝", label: "Plan" },
    { key: "progress" as const, icon: "📊", label: "Charts" },
    { key: "history" as const, icon: "📋", label: "Log" },
  ];

  // ─── SESSION REPORT MODAL ───
  if (showSessionReport && !isDetecting) {
    const avgForm = formScoresRef.current.length > 0
      ? Math.round(formScoresRef.current.reduce((a, b) => a + b, 0) / formScoresRef.current.length) : formScore;
    return (
      <div className="relative min-h-screen pb-24 px-3 pt-4">
        <div className="ambient-glow" />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10">
          <div className="text-center mb-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
              <Trophy className="mx-auto h-16 w-16 text-neon-orange mb-2" />
            </motion.div>
            <h1 className="text-2xl font-display font-black text-foreground">WORKOUT COMPLETE!</h1>
            <p className="text-sm text-muted-foreground">Session Report</p>
          </div>

          {/* Main stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { val: totalReps, label: "Total Reps", icon: <Target className="h-4 w-4" />, color: "text-primary" },
              { val: `${avgForm}%`, label: "Avg Form", icon: <Award className="h-4 w-4" />, color: "text-neon-cyan" },
              { val: liveCalories.toFixed(1), label: "Calories", icon: <Flame className="h-4 w-4" />, color: "text-neon-orange" },
              { val: formatTime(sessionElapsed), label: "Duration", icon: <Clock className="h-4 w-4" />, color: "text-foreground" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="glass-card p-3 text-center">
                <div className={`${s.color} mb-1 flex justify-center`}>{s.icon}</div>
                <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Gamification stats */}
          <div className="glass-card p-3 mb-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <Zap className="h-4 w-4 text-neon-orange mx-auto mb-0.5" />
                <p className="text-lg font-black text-neon-orange">{sessionXP}</p>
                <p className="text-[8px] text-muted-foreground">XP EARNED</p>
              </div>
              <div>
                <Star className="h-4 w-4 text-primary mx-auto mb-0.5" />
                <p className="text-lg font-black text-primary">{bestCombo}x</p>
                <p className="text-[8px] text-muted-foreground">BEST COMBO</p>
              </div>
              <div>
                <Medal className="h-4 w-4 text-neon-cyan mx-auto mb-0.5" />
                <p className="text-lg font-black text-neon-cyan">{earnedAchievements.length}</p>
                <p className="text-[8px] text-muted-foreground">ACHIEVEMENTS</p>
              </div>
            </div>
          </div>

          {/* Achievements */}
          {earnedAchievements.length > 0 && (
            <div className="glass-card p-3 mb-3">
              <p className="text-[10px] font-bold text-foreground mb-2">🏆 Achievements Unlocked</p>
              <div className="flex flex-wrap gap-1.5">
                {earnedAchievements.map(id => {
                  const a = ACHIEVEMENTS.find(x => x.id === id);
                  return a ? (
                    <span key={id} className="bg-primary/20 text-primary text-[10px] px-2 py-1 rounded-full font-bold">
                      {a.icon} {a.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Exercise breakdown */}
          {Object.keys(exerciseHistory).length > 0 && (
            <div className="glass-card p-3 mb-3">
              <p className="text-[10px] font-bold text-foreground mb-2">Exercise Breakdown</p>
              {Object.entries(exerciseHistory).map(([ex, count]) => {
                const meta = ALL_EXERCISES.find(e => e.type === ex);
                return (
                  <div key={ex} className="flex items-center justify-between py-1 border-b border-border/20 last:border-0">
                    <span className="text-xs text-foreground">{meta?.emoji} {meta?.name || ex}</span>
                    <span className="text-xs font-bold text-primary">{count} reps</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowShareCard(true)}
              className="flex-1 rounded-2xl p-4 font-display font-bold text-lg bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
              📸 Share
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setShowSessionReport(false); resetWorkout(); }}
              className="flex-1 rounded-2xl p-4 font-display font-bold text-lg bg-primary text-primary-foreground">
              DONE ✓
            </motion.button>
          </div>

          {showShareCard && (
            <WorkoutShareCard
              totalReps={totalReps}
              avgForm={avgForm}
              calories={liveCalories}
              duration={formatTime(sessionElapsed)}
              xpEarned={sessionXP}
              bestCombo={bestCombo}
              exercises={Object.entries(exerciseHistory).map(([ex, count]) => {
                const meta = ALL_EXERCISES.find(e => e.type === ex);
                return { name: meta?.name || ex, emoji: meta?.emoji || "💪", reps: count };
              })}
              onClose={() => setShowShareCard(false)}
            />
          )}
        </motion.div>
      </div>
    );
  }

  // ─── DETECTING VIEW: fullscreen camera ───
  if (isDetecting) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="relative flex-1">
          <Webcam ref={webcamRef} audio={false} mirrored className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0 }}
            videoConstraints={{ facingMode: "user", width: 640, height: 480 }} />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />

          {/* Rep flash overlay */}
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
                  {combo >= 3 && (
                    <span className="ml-2 text-xs font-bold text-neon-orange animate-pulse">{combo}x 🔥</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={toggleVoice} className="bg-black/70 backdrop-blur-md rounded-xl p-2 border border-white/20">
                  {voiceOn ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                </button>
                <button onClick={resetWorkout} className="bg-black/70 backdrop-blur-md rounded-xl p-2 border border-neon-cyan/40"><RotateCcw className="h-4 w-4 text-neon-cyan" /></button>
                <button onClick={stopDetection} className="bg-black/70 backdrop-blur-md rounded-xl p-2 border border-destructive/40"><XCircle className="h-4 w-4 text-destructive" /></button>
              </div>
            </div>

            {/* XP + ROM bar */}
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

          {/* Bottom Stats */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-3 safe-area-bottom bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-12">
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { val: totalReps, label: "REPS", color: "text-primary" },
                { val: formScore > 0 ? `${formScore}%` : "—", label: "FORM", color: formScore >= 85 ? "text-primary" : formScore >= 60 ? "text-neon-orange" : "text-destructive" },
                { val: liveCalories.toFixed(1), label: "KCAL", color: "text-neon-orange" },
                { val: formatTime(sessionElapsed), label: "TIME", color: "text-neon-cyan" },
              ].map((s, i) => (
                <div key={i} className="bg-black/60 backdrop-blur-md rounded-xl py-3 text-center border border-white/10">
                  <p className={`text-2xl font-display font-black ${s.color} drop-shadow-lg`}>{s.val}</p>
                  <p className="text-[10px] font-bold text-white/70 tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>

            {Object.keys(exerciseHistory).length > 0 && (
              <div className="bg-black/60 backdrop-blur-md rounded-xl p-2.5 mb-2 border border-white/10">
                <p className="text-[8px] text-white/50 font-bold tracking-widest mb-1">LIVE COUNT</p>
                <div className="flex items-center gap-3 overflow-x-auto">
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

            {corrections.length > 0 && (
              <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 mb-2 border border-primary/30">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-white tracking-wide">AI COACH</span>
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

            <div className={`bg-black/60 backdrop-blur-md rounded-xl p-3 border-l-4 ${formScore >= 85 ? "border-primary" : formScore >= 60 ? "border-neon-orange" : "border-destructive"}`}>
              <p className="text-sm font-bold text-white drop-shadow">{feedback}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── NON-DETECTING VIEW ───
  return (
    <div className="relative min-h-screen pb-24 px-3 pt-4">
      <div className="ambient-glow" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-3">
        <h1 className="text-xl font-display font-bold text-foreground">AI TRAINER</h1>
        <div className="flex items-center gap-0.5">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`text-[10px] px-2 py-1.5 rounded-full font-bold transition-all ${
                activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
              {tab.icon}
            </button>
          ))}
        </div>
      </div>

      {/* ─── CAMERA TAB ─── */}
      {activeTab === "camera" && (
        <>
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

          {/* Exercise selector — tap to lock, tap again to auto-detect */}
          <div className="relative z-10 glass-card p-2.5 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> {lockedExercise ? "LOCKED EXERCISE" : "AUTO-DETECT"} • TAP TO {lockedExercise ? "UNLOCK" : "LOCK"}</p>
              {lockedExercise && (
                <button onClick={() => setLockedExercise(null)} className="text-[8px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-bold">
                  AUTO ✕
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {ALL_EXERCISES.map(ex => (
                <button key={ex.type} onClick={() => setLockedExercise(prev => prev === ex.type ? null : ex.type)}
                  className={`shrink-0 text-[9px] px-2 py-1 rounded-full font-bold transition-all ${
                    lockedExercise === ex.type
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/50 scale-105"
                      : lockedExercise
                        ? "bg-secondary/50 text-muted-foreground/50"
                        : goalExercises.includes(ex.type) ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
                  {ex.emoji} {ex.name}
                </button>
              ))}
            </div>
          </div>

          <div className="relative z-10 aspect-[3/4] max-h-[55vh] rounded-2xl bg-secondary/30 border border-border/50 overflow-hidden mb-3 mx-auto">
            <Webcam ref={webcamRef} audio={false} mirrored className="absolute inset-0 w-full h-full object-cover"
              videoConstraints={{ facingMode: "user", width: 640, height: 480 }} />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)", opacity: 0 }} />
            <div className="absolute inset-3 border-2 border-primary/20 rounded-xl pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center bg-background/30">
              <div className="text-center">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Full body in frame</p>
                <p className="text-[9px] text-muted-foreground/60">33 keypoints • Voice coaching • Gamification</p>
              </div>
            </div>
          </div>

          {totalReps > 0 && (
            <div className="relative z-10 glass-card p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5"><Trophy className="h-3 w-3 text-neon-orange" /><span className="text-xs font-bold text-foreground">Last Session</span></div>
              </div>
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
              <p className="text-[9px] text-primary mt-2 text-center">✅ Auto-saved + synced in real-time</p>
            </div>
          )}

          {/* Voice toggle + Start */}
          <div className="relative z-10 flex gap-2 mb-2">
            <button onClick={toggleVoice}
              className={`rounded-xl p-4 border ${voiceOn ? "border-primary/40 bg-primary/10" : "border-border/50 bg-secondary"}`}>
              {voiceOn ? <Volume2 className="h-5 w-5 text-primary" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
            </button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={startDetection}
              className="flex-1 rounded-2xl p-4 font-display font-bold text-lg tracking-wider bg-primary text-primary-foreground">
              {lockedExercise ? `START ${EXERCISE_NAMES[lockedExercise]} 🔒` : `START AI TRAINER ${activeGoal.emoji}`}
            </motion.button>
          </div>
        </>
      )}

      {/* ─── EXERCISES TAB ─── */}
      {activeTab === "exercises" && (
        <div className="relative z-10 space-y-3">
          <p className="text-[10px] text-muted-foreground">All {ALL_EXERCISES.length} AI-tracked exercises • Your lifetime stats</p>
          {ALL_EXERCISES.map(ex => {
            const st = exerciseStats[ex.type];
            const isRecommended = goalExercises.includes(ex.type);
            const sparkData = st.last7Days.map((v, i) => ({ day: i, reps: v }));
            return (
              <motion.div key={ex.type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`glass-card p-3 border ${isRecommended ? "border-primary/30" : "border-border/30"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{ex.emoji}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-foreground">{ex.name}</p>
                        {isRecommended && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">REC</span>}
                      </div>
                      <p className="text-[9px] text-muted-foreground">{ex.muscle}</p>
                    </div>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{ex.difficulty}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  <div className="bg-secondary/50 rounded-lg p-1.5 text-center">
                    <p className="text-sm font-bold text-primary">{st.totalReps}</p>
                    <p className="text-[7px] text-muted-foreground">TOTAL REPS</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-1.5 text-center">
                    <p className="text-sm font-bold text-neon-cyan">{st.avgForm}%</p>
                    <p className="text-[7px] text-muted-foreground">AVG FORM</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-1.5 text-center">
                    <p className="text-sm font-bold text-neon-orange">{Math.round(st.totalCals)}</p>
                    <p className="text-[7px] text-muted-foreground">KCAL</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-1.5 text-center">
                    <p className="text-sm font-bold text-foreground">{st.totalSessions}</p>
                    <p className="text-[7px] text-muted-foreground">SESSIONS</p>
                  </div>
                </div>
                <div className="h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sparkData}>
                      <Bar dataKey="reps" fill={isRecommended ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} radius={[2, 2, 0, 0]} opacity={0.7} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[8px] text-muted-foreground text-center mt-0.5">Last 7 days</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                  <span className="text-[9px] text-muted-foreground">Best Form: <b className="text-primary">{st.bestForm}%</b></span>
                  <span className="text-[9px] text-muted-foreground">Total Time: <b className="text-foreground">{formatTime(st.totalDuration)}</b></span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── TO-DO TAB ─── */}
      {activeTab === "todo" && (
        <div className="relative z-10 space-y-3">
          <div className="glass-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Workout Plan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-primary">{todoProgress}%</span>
                {todoList.length > 0 && <button onClick={resetTodoList} className="text-[9px] text-muted-foreground underline">Reset</button>}
              </div>
            </div>
            {todoList.length > 0 && (
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${todoProgress}%` }} transition={{ duration: 0.5 }} />
              </div>
            )}
          </div>

          {todoList.length === 0 && !showAddTodo && (
            <div className="glass-card p-6 text-center">
              <ListChecks className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground mb-1">No exercises planned</p>
              <p className="text-[10px] text-muted-foreground/60 mb-3">Add exercises to create your workout plan</p>
              <button onClick={() => setShowAddTodo(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold">
                <Plus className="h-3 w-3 inline mr-1" /> Add Exercise
              </button>
            </div>
          )}

          {todoList.map((item, index) => {
            const exMeta = ALL_EXERCISES.find(e => e.type === item.exercise);
            return (
              <motion.div key={item.id || index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className={`glass-card p-3 border-l-3 ${
                  item.status === "done" ? "border-l-primary/60 opacity-80" :
                  item.status === "skipped" ? "border-l-neon-orange/60 opacity-60" : "border-l-border/50"
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{exMeta?.emoji || "🏋️"}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-bold ${item.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {EXERCISE_NAMES[item.exercise]}
                        </p>
                        {item.status === "done" && <CircleCheck className="h-3 w-3 text-primary" />}
                        {item.status === "skipped" && <SkipForward className="h-3 w-3 text-neon-orange" />}
                      </div>
                      <p className="text-[9px] text-muted-foreground">
                        Target: {item.targetReps} reps
                        {item.actualReps !== undefined && item.actualReps > 0 && ` • Done: ${item.actualReps}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.status === "pending" && (
                      <>
                        <button onClick={() => markTodoDone(index)} className="p-1.5 rounded-lg bg-primary/20"><Check className="h-3 w-3 text-primary" /></button>
                        <button onClick={() => skipTodoItem(index)} className="p-1.5 rounded-lg bg-neon-orange/20"><SkipForward className="h-3 w-3 text-neon-orange" /></button>
                      </>
                    )}
                    <button onClick={() => removeTodoItem(index)} className="p-1.5 rounded-lg bg-secondary"><X className="h-3 w-3 text-muted-foreground" /></button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          <AnimatePresence>
            {showAddTodo && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="glass-card p-3 overflow-hidden">
                <p className="text-xs font-bold text-foreground mb-2">Add Exercise</p>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {ALL_EXERCISES.map(ex => (
                    <button key={ex.type} onClick={() => setNewTodoExercise(ex.type)}
                      className={`p-1.5 rounded-lg text-center text-[9px] font-bold transition-all ${
                        newTodoExercise === ex.type ? "bg-primary/20 border border-primary/50 text-primary" : "bg-secondary text-muted-foreground"
                      }`}>
                      {ex.emoji} {ex.name}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-[9px] text-muted-foreground">Reps:</label>
                  <input type="number" value={newTodoReps} onChange={e => setNewTodoReps(Number(e.target.value))} min={1}
                    className="flex-1 bg-secondary rounded-lg px-2 py-1.5 text-xs text-foreground border border-border/50" />
                </div>
                <div className="flex gap-2">
                  <button onClick={addTodoItem} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-xs font-bold"><Plus className="h-3 w-3 inline mr-1" /> Add</button>
                  <button onClick={() => setShowAddTodo(false)} className="flex-1 bg-secondary text-foreground rounded-lg py-2 text-xs font-bold">Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {todoList.length > 0 && !showAddTodo && (
            <div className="flex gap-2">
              <button onClick={() => setShowAddTodo(true)} className="flex-1 glass-card p-2.5 text-center text-[10px] font-bold text-primary">
                <Plus className="h-3 w-3 inline mr-0.5" /> Add More
              </button>
              <button onClick={() => setActiveTab("camera")} className="flex-1 bg-primary text-primary-foreground rounded-xl p-2.5 text-center text-[10px] font-bold">
                <Play className="h-3 w-3 inline mr-0.5" /> Start Workout
              </button>
            </div>
          )}

          {todoList.length > 0 && (
            <div className="glass-card p-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-sm font-bold text-primary">{todoList.filter(t => t.status === "done").length}</p><p className="text-[8px] text-muted-foreground">DONE</p></div>
                <div><p className="text-sm font-bold text-neon-orange">{todoList.filter(t => t.status === "skipped").length}</p><p className="text-[8px] text-muted-foreground">SKIPPED</p></div>
                <div><p className="text-sm font-bold text-muted-foreground">{todoList.filter(t => t.status === "pending").length}</p><p className="text-[8px] text-muted-foreground">PENDING</p></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── PROGRESS TAB ─── */}
      {activeTab === "progress" && (
        <div className="relative z-10 space-y-3">
          {pastSessions.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No workout data yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { val: pastSessions.reduce((a, s) => a + s.reps, 0), label: "REPS", color: "text-primary" },
                  { val: Math.round(pastSessions.reduce((a, s) => a + (s.calories_burned || 0), 0)), label: "KCAL", color: "text-neon-orange" },
                  { val: `${pastSessions.length > 0 ? Math.round(pastSessions.reduce((a, s) => a + (s.form_score || 0), 0) / pastSessions.length) : 0}%`, label: "AVG FORM", color: "text-neon-cyan" },
                  { val: pastSessions.length, label: "SESSIONS", color: "text-foreground" },
                ].map((s, i) => (
                  <div key={i} className="glass-card p-2 text-center">
                    <p className={`text-sm font-bold ${s.color}`}>{s.val}</p>
                    <p className="text-[7px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

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
                      <defs><linearGradient id="calG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(25,100%,55%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(25,100%,55%)" stopOpacity={0} /></linearGradient></defs>
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

      {/* ─── HISTORY TAB ─── */}
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
                    <button onClick={() => handleEditSession(s.id!)} className="flex-1 bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1"><Check className="h-3 w-3" /> Save</button>
                    <button onClick={() => setEditingSession(null)} className="flex-1 bg-secondary text-foreground rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1"><X className="h-3 w-3" /> Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">{EXERCISE_NAMES[s.exercise_type as ExerciseType] || s.exercise_type}</p>
                    <p className="text-[9px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()} • {s.duration_seconds ? formatTime(s.duration_seconds) : "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right"><p className="text-sm font-bold text-primary">{s.reps}</p><p className="text-[8px] text-muted-foreground">reps</p></div>
                    <div className="text-right"><p className="text-sm font-bold text-neon-orange">{Math.round(s.calories_burned || 0)}</p><p className="text-[8px] text-muted-foreground">kcal</p></div>
                    <div className="text-right"><p className={`text-sm font-bold ${(s.form_score || 0) >= 85 ? "text-primary" : "text-neon-orange"}`}>{s.form_score || 0}%</p><p className="text-[8px] text-muted-foreground">form</p></div>
                    <div className="flex flex-col gap-1 ml-1">
                      <button onClick={() => { setEditingSession(s.id!); setEditReps(s.reps); setEditFormScore(s.form_score || 0); }} className="p-1 rounded bg-secondary"><Pencil className="h-3 w-3 text-neon-cyan" /></button>
                      <button onClick={() => handleDeleteSession(s.id!)} className="p-1 rounded bg-secondary"><Trash2 className="h-3 w-3 text-destructive" /></button>
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

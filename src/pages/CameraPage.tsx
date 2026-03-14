import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Webcam from "react-webcam";
import {
  detectExercise, resetDetection, EXERCISE_NAMES, calcCaloriesPerSecond,
  type ExerciseType, type Landmark, type FormCorrection,
  setDifficulty, getDifficulty, type DifficultyLevel,
  getBestRepScore, resetBestRepScore,
} from "@/lib/exerciseDetection";
import {
  speakRepComplete, speakFormCorrection, speakMilestone,
  speakSessionEnd, speakCombo, setVoiceEnabled, isVoiceEnabled,
} from "@/lib/voiceCoaching";
import { showWorkoutFeedback, showRepMilestoneNotification } from "@/lib/genZNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Sub-components
import DetectingView from "@/components/camera/DetectingView";
import SessionReport from "@/components/camera/SessionReport";
import CameraSetup from "@/components/camera/CameraSetup";
import ExerciseStatsTab from "@/components/camera/ExerciseStatsTab";
import WorkoutTodoTab from "@/components/camera/WorkoutTodoTab";
import ProgressChartsTab from "@/components/camera/ProgressChartsTab";
import WorkoutHistoryTab from "@/components/camera/WorkoutHistoryTab";
import {
  drawAngleLabel, drawFormIndicator, drawKeypointConfidence, drawRepFlash, LM,
} from "@/components/camera/canvasHelpers";
import {
  type SessionRecord, type TodoItem, type BodyGoalId,
  ALL_EXERCISES, XP_PER_REP, XP_FORM_BONUS, COMBO_THRESHOLDS, ACHIEVEMENTS,
} from "@/components/camera/types";

const CameraPage = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRequestRef = useRef<number | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const { user } = useAuth();

  // Core state
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
  const [pastSessions, setPastSessions] = useState<SessionRecord[]>([]);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [liveCalories, setLiveCalories] = useState(0);
  const [userWeight, setUserWeight] = useState(70);
  const [activeTab, setActiveTab] = useState<"camera" | "exercises" | "progress" | "todo" | "history">("camera");

  // To-do list
  const [todoList, setTodoList] = useState<TodoItem[]>([]);

  // Gamification
  const [sessionXP, setSessionXP] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [earnedAchievements, setEarnedAchievements] = useState<string[]>([]);
  const [showSessionReport, setShowSessionReport] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [repFlash, setRepFlash] = useState<string | null>(null);
  const [lockedExercise, setLockedExercise] = useState<ExerciseType | null>(null);
  const [keypointConf, setKeypointConf] = useState(0);
  const [rom, setRom] = useState(0);
  const [difficulty, setDifficultyState] = useState<DifficultyLevel>(getDifficulty());
  const [bestRepForm, setBestRepForm] = useState(0);

  // Refs
  const plankIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const calorieIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const repFeedbackCounter = useRef(0);
  const sessionStartRef = useRef<Date | null>(null);
  const formScoresRef = useRef<number[]>([]);
  const currentExerciseRef = useRef<ExerciseType>("unknown");
  const lastCorrectionRef = useRef<string>("");
  const comboRef = useRef(0);

  // ─── Data Loading ───
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
            return exists ? prev : [payload.new as SessionRecord, ...prev];
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

  // ─── Callbacks ───
  const updateBodyGoal = async (goal: BodyGoalId) => {
    setBodyGoal(goal);
    if (user) {
      await supabase.from("profiles").update({ body_goal: goal } as any).eq("user_id", user.id);
      toast.success(`Goal: ${goal} 🎯`);
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

  const autoSaveHabitFromWorkout = async () => {
    if (!user || Object.keys(exerciseHistory).length === 0) return;
    try {
      const { data: existing } = await supabase.from("habits").select("id").eq("user_id", user.id).eq("name", "Daily Workout").eq("active", true).maybeSingle();
      let habitId = existing?.id;
      if (!habitId) {
        const { data: created } = await supabase.from("habits").insert({
          user_id: user.id, name: "Daily Workout", icon: "dumbbell", color: "neon-green",
          target: 1, unit: "session", frequency: "daily", time_of_day: "anytime", difficulty: "medium", ai_suggested: false,
        }).select("id").single();
        habitId = created?.id;
      }
      if (habitId) {
        const today = new Date().toISOString().split("T")[0];
        const { data: comp } = await supabase.from("habit_completions").select("id").eq("habit_id", habitId).eq("user_id", user.id).eq("date", today).maybeSingle();
        if (!comp) {
          await supabase.from("habit_completions").insert({ habit_id: habitId, user_id: user.id, date: today, value: 1, completed: true });
        } else {
          await supabase.from("habit_completions").update({ completed: true, value: 1 }).eq("id", comp.id);
        }
      }
    } catch (e) { console.error("Auto-save habit error:", e); }
  };

  const saveSession = async () => {
    if (!user || totalReps === 0) return;
    setSaving(true);
    const duration = sessionStartRef.current ? Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000) : 0;
    const avgForm = formScoresRef.current.length > 0
      ? Math.round(formScoresRef.current.reduce((a, b) => a + b, 0) / formScoresRef.current.length) : formScore;
    const totalCals = Math.round(liveCalories * 10) / 10 || totalReps * 0.5;

    speakSessionEnd(totalReps, avgForm, totalCals);

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
      const exType = currentExercise === "unknown" ? "mixed" : currentExercise;
      await supabase.from("workout_sessions").insert({
        user_id: user.id, exercise_type: exType, reps: totalReps,
        form_score: avgForm, duration_seconds: duration, calories_burned: totalCals,
      });
    }

    // Update todos
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

    // Daily activity
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase.from("daily_activity").select("*").eq("user_id", user.id).eq("date", today).maybeSingle();
    if (existing) {
      await supabase.from("daily_activity").update({ calories: (existing.calories || 0) + totalCals, active_minutes: (existing.active_minutes || 0) + Math.ceil(duration / 60) }).eq("id", existing.id);
    } else {
      await supabase.from("daily_activity").insert({ user_id: user.id, date: today, calories: totalCals, active_minutes: Math.ceil(duration / 60), steps: 0 });
    }

    // Streaks
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
    autoSaveHabitFromWorkout();
  };

  // ─── Todo handlers ───
  const addTodoItem = async (exercise: ExerciseType, reps: number) => {
    if (!user) return;
    const { data } = await supabase.from("workout_todos").insert({
      user_id: user.id, exercise_type: exercise, target_reps: reps, status: "pending", actual_reps: 0,
    } as any).select().single();
    if (data) setTodoList(prev => [...prev, { id: (data as any).id, exercise, targetReps: reps, status: "pending" }]);
    toast.success(`Added ${EXERCISE_NAMES[exercise]} x${reps}`);
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

  const handleEditSession = async (id: string, reps: number, formScore: number) => {
    const { error } = await supabase.from("workout_sessions").update({ reps, form_score: formScore }).eq("id", id);
    if (error) toast.error("Update failed");
    else toast.success("Workout updated ✏️");
  };

  const handleDeleteSession = async (id: string) => {
    const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else toast.success("Workout deleted 🗑️");
  };

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoiceEnabled(next);
    toast.success(next ? "Voice coaching ON 🔊" : "Voice coaching OFF 🔇");
  };

  const changeDifficulty = (level: DifficultyLevel) => {
    setDifficultyState(level);
    setDifficulty(level);
    const labels = { easy: "Easy — relaxed form checks", medium: "Medium — balanced", strict: "Strict — only perfect reps count" };
    toast.success(`Difficulty: ${labels[level]}`);
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
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: "hsl(160,100%,50%)", lineWidth: 3 });
      drawLandmarks(ctx, results.poseLandmarks, { color: "hsl(180,100%,50%)", lineWidth: 1, radius: 4, fillColor: "hsl(160,100%,50%)" });

      const landmarks: Landmark[] = results.poseLandmarks.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility }));
      const le = landmarks[LM.LEFT_ELBOW], re = landmarks[LM.RIGHT_ELBOW];
      const lh = landmarks[LM.LEFT_HIP], rh = landmarks[LM.RIGHT_HIP];
      const lk = landmarks[LM.LEFT_KNEE], rk = landmarks[LM.RIGHT_KNEE];

      const result = detectExercise(landmarks, lockedExercise);

      const green = "hsl(160,100%,50%)", cyan = "hsl(180,100%,50%)", orange = "hsl(25,100%,55%)";
      drawAngleLabel(ctx, le, result.angles.leftElbow, "LE", w, h, cyan);
      drawAngleLabel(ctx, re, result.angles.rightElbow, "RE", w, h, cyan);
      drawAngleLabel(ctx, lk, result.angles.leftKnee, "LK", w, h, green);
      drawAngleLabel(ctx, rk, result.angles.rightKnee, "RK", w, h, green);
      drawAngleLabel(ctx, lh, result.angles.leftHip, "LH", w, h, orange);
      drawAngleLabel(ctx, rh, result.angles.rightHip, "RH", w, h, orange);

      drawFormIndicator(ctx, result.formScore, w);
      drawKeypointConfidence(ctx, result.keypointConfidence, w);

      setCurrentExercise(result.exercise);
      currentExerciseRef.current = result.exercise;
      setFormScore(result.formScore);
      setFeedback(result.feedback);
      setCorrections(result.corrections);
      setKeypointConf(result.keypointConfidence);
      setRom(result.rom);
      setBestRepForm(result.bestRepScore);
      if (result.formScore > 0) formScoresRef.current.push(result.formScore);

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

  // ─── Timers ───
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

  // ─── Detection Control ───
  const startDetection = useCallback(() => {
    setIsDetecting(true);
    sessionStartRef.current = new Date();
    setSessionElapsed(0); setLiveCalories(0); setSessionXP(0); setCombo(0); setBestCombo(0);
    setEarnedAchievements([]); setShowSessionReport(false); setBestRepForm(0);
    formScoresRef.current = []; comboRef.current = 0;
    resetDetection(); resetBestRepScore();
  }, []);

  // Auto-save every 60 seconds during detection
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isDetecting && user && totalReps > 0) {
      autoSaveIntervalRef.current = setInterval(() => {
        const duration = sessionStartRef.current ? Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000) : 0;
        const avgF = formScoresRef.current.length > 0
          ? Math.round(formScoresRef.current.reduce((a, b) => a + b, 0) / formScoresRef.current.length) : formScore;
        const entries = Object.entries(exerciseHistory);
        if (entries.length > 0) {
          entries.forEach(([ex, count]) => {
            if (count > 0) {
              supabase.from("workout_sessions").upsert({
                user_id: user.id, exercise_type: ex, reps: count, form_score: avgF,
                duration_seconds: Math.round(duration * (count / totalReps)),
                calories_burned: Math.round(count * calcCaloriesPerSecond(ex as ExerciseType, userWeight) * 60 * 10) / 10,
              }, { onConflict: "user_id,exercise_type" }).then(() => {});
            }
          });
        }
        toast.success("Progress auto-saved 💾", { duration: 1500 });
      }, 60000);
    }
    return () => { if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current); };
  }, [isDetecting, user, totalReps, exerciseHistory, formScore, userWeight]);

  // Preload MediaPipe WASM on mount for instant detection
  const preloadedPoseRef = useRef<Pose | null>(null);
  useEffect(() => {
    try {
      const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}` });
      pose.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });
      // Warm up the model with a blank canvas
      const warmup = document.createElement("canvas");
      warmup.width = 64; warmup.height = 64;
      const wCtx = warmup.getContext("2d");
      if (wCtx) { wCtx.fillStyle = "#000"; wCtx.fillRect(0, 0, 64, 64); }
      pose.send({ image: warmup }).catch(() => {});
      preloadedPoseRef.current = pose;
    } catch (e) { console.warn("Preload failed:", e); }
  }, []);

  useEffect(() => {
    if (!isDetecting) return;
    let cancelled = false;
    let retryCount = 0;

    const initPose = () => {
      if (cancelled) return;
      const video = webcamRef.current?.video;
      if (!video || !video.readyState || video.readyState < 2) {
        retryCount++;
        if (retryCount < 30) setTimeout(initPose, 100);
        else toast.error("Camera not ready. Check permissions.");
        return;
      }

      try {
        // Use preloaded pose if available for instant start
        const pose = preloadedPoseRef.current || new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}` });
        if (!preloadedPoseRef.current) {
          pose.setOptions({
            modelComplexity: 0,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.3,
            minTrackingConfidence: 0.3,
          });
        }
        pose.onResults(onResults);
        poseRef.current = pose;
        preloadedPoseRef.current = null; // consumed

        const camera = new Camera(video, {
          onFrame: async () => {
            if (poseRef.current && video.readyState >= 2) {
              try { await poseRef.current.send({ image: video }); }
              catch (e) { console.warn("Pose send error", e); }
            }
          },
          width: 480, height: 360,
        });
        camera.start();
        cameraRef.current = camera;
        toast.success("⚡ Body detected!", { duration: 1500 });
      } catch (err) {
        console.error("MediaPipe init error:", err);
        if (retryCount++ <= 3) setTimeout(initPose, 300);
        else toast.error("Camera detection failed. Please reload.");
      }
    };

    // Start immediately — no delay
    initPose();
    return () => { cancelled = true; };
  }, [isDetecting, onResults]);

  const stopDetection = () => {
    if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
    if (poseRef.current) { poseRef.current.close(); poseRef.current = null; }
    setIsDetecting(false);
    resetDetection();
    if (totalReps > 0 && user) saveSession();
  };

  const resetWorkout = () => {
    setTotalReps(0); setFormScore(0); setPlankTime(0); setSessionElapsed(0); setLiveCalories(0);
    setCorrections([]); setCurrentExercise("unknown"); setFeedback("Position yourself in frame");
    setExerciseHistory({}); formScoresRef.current = []; resetDetection(); repFeedbackCounter.current = 0;
    setSessionXP(0); setCombo(0); setBestCombo(0); setEarnedAchievements([]); comboRef.current = 0;
    setBestRepForm(0); resetBestRepScore();
  };

  const avgForm = formScoresRef.current.length > 0
    ? Math.round(formScoresRef.current.reduce((a, b) => a + b, 0) / formScoresRef.current.length) : formScore;

  const TABS = [
    { key: "camera" as const, icon: "🎥", label: "Train" },
    { key: "exercises" as const, icon: "🏋️", label: "Stats" },
    { key: "todo" as const, icon: "📝", label: "Plan" },
    { key: "progress" as const, icon: "📊", label: "Charts" },
    { key: "history" as const, icon: "📋", label: "Log" },
  ];

  // ─── Session Report ───
  if (showSessionReport && !isDetecting) {
    return (
      <SessionReport
        totalReps={totalReps} formScore={formScore} liveCalories={liveCalories}
        sessionElapsed={sessionElapsed} sessionXP={sessionXP} bestCombo={bestCombo}
        bestRepForm={bestRepForm} earnedAchievements={earnedAchievements}
        exerciseHistory={exerciseHistory} avgForm={avgForm}
        onDone={() => { setShowSessionReport(false); resetWorkout(); }}
      />
    );
  }

  // ─── Detecting View ───
  if (isDetecting) {
    return (
      <DetectingView
        webcamRef={webcamRef} canvasRef={canvasRef}
        currentExercise={currentExercise} lockedExercise={lockedExercise}
        totalReps={totalReps} formScore={formScore} feedback={feedback}
        corrections={corrections} combo={combo} sessionXP={sessionXP}
        keypointConf={keypointConf} rom={rom} difficulty={difficulty}
        bestRepForm={bestRepForm} liveCalories={liveCalories}
        sessionElapsed={sessionElapsed} voiceOn={voiceOn} repFlash={repFlash}
        exerciseHistory={exerciseHistory}
        onToggleVoice={toggleVoice} onReset={resetWorkout} onStop={stopDetection}
      />
    );
  }

  // ─── Main View ───
  return (
    <div className="relative min-h-screen pb-24 px-3 pt-4">
      <div className="ambient-glow" />

      {/* Header + Tabs */}
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

      {activeTab === "camera" && (
        <CameraSetup
          webcamRef={webcamRef} bodyGoal={bodyGoal} lockedExercise={lockedExercise}
          difficulty={difficulty} voiceOn={voiceOn} totalReps={totalReps}
          formScore={formScore} liveCalories={liveCalories} sessionElapsed={sessionElapsed}
          onUpdateGoal={updateBodyGoal} onLockExercise={setLockedExercise}
          onChangeDifficulty={changeDifficulty} onToggleVoice={toggleVoice} onStart={startDetection}
        />
      )}

      {activeTab === "exercises" && <ExerciseStatsTab pastSessions={pastSessions} bodyGoal={bodyGoal} />}

      {activeTab === "todo" && (
        <WorkoutTodoTab
          todoList={todoList} todoProgress={todoProgress}
          onAdd={addTodoItem} onMarkDone={markTodoDone} onSkip={skipTodoItem}
          onRemove={removeTodoItem} onReset={resetTodoList}
          onSwitchToCamera={() => setActiveTab("camera")}
        />
      )}

      {activeTab === "progress" && <ProgressChartsTab pastSessions={pastSessions} />}

      {activeTab === "history" && (
        <WorkoutHistoryTab pastSessions={pastSessions} onEdit={handleEditSession} onDelete={handleDeleteSession} />
      )}
    </div>
  );
};

export default CameraPage;

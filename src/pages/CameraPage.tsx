import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Webcam from "react-webcam";
import { Pose } from "@mediapipe/pose";
import * as cam from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { POSE_CONNECTIONS } from "@mediapipe/pose";
import { Camera, Crosshair, Activity, Volume2, XCircle, Zap, Trophy, RotateCcw, Save } from "lucide-react";
import { detectExercise, resetDetection, EXERCISE_NAMES, type ExerciseType, type Landmark } from "@/lib/exerciseDetection";
import { showWorkoutFeedback, showRepMilestoneNotification, showStreakNotification } from "@/lib/genZNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  const [plankTime, setPlankTime] = useState(0);
  const [isPlank, setIsPlank] = useState(false);
  const [saving, setSaving] = useState(false);
  const plankIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const repFeedbackCounter = useRef(0);
  const sessionStartRef = useRef<Date | null>(null);

  const checkMilestone = useCallback((total: number) => {
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    if (milestones.includes(total)) {
      showRepMilestoneNotification(total);
    }
  }, []);

  const saveSession = async () => {
    if (!user || totalReps === 0) return;
    setSaving(true);
    const duration = sessionStartRef.current
      ? Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000)
      : 0;

    const { error } = await supabase.from("workout_sessions").insert({
      user_id: user.id,
      exercise_type: currentExercise === "unknown" ? "mixed" : currentExercise,
      reps: totalReps,
      form_score: formScore,
      duration_seconds: duration,
      calories_burned: totalReps * 0.5,
    });

    if (error) {
      toast.error("Failed to save session");
    } else {
      toast("Session saved! Your gains are locked in 🔒💪", {
        duration: 4000,
        style: {
          background: "hsl(240 12% 8% / 0.95)",
          border: "1px solid hsl(160 100% 50% / 0.3)",
          color: "hsl(0 0% 95%)",
        },
      });
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

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: "hsl(160, 100%, 50%)",
        lineWidth: 2,
      });
      drawLandmarks(ctx, results.poseLandmarks, {
        color: "hsl(180, 100%, 50%)",
        lineWidth: 1,
        radius: 3,
        fillColor: "hsl(160, 100%, 50%)",
      });

      const landmarks: Landmark[] = results.poseLandmarks.map((lm: any) => ({
        x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility,
      }));

      const result = detectExercise(landmarks);
      setCurrentExercise(result.exercise);
      setFormScore(result.formScore);
      setFeedback(result.feedback);

      if (result.exercise === "plank" && result.state === "hold") {
        if (!isPlank) setIsPlank(true);
      } else {
        if (isPlank) setIsPlank(false);
      }

      if (result.repCompleted) {
        setReps((prev) => prev + 1);
        setTotalReps((prev) => {
          const newTotal = prev + 1;
          checkMilestone(newTotal);
          return newTotal;
        });
        repFeedbackCounter.current++;
        if (repFeedbackCounter.current % 5 === 0) showWorkoutFeedback();
      }
    }
    ctx.restore();
  }, [checkMilestone, isPlank]);

  useEffect(() => {
    if (isPlank && isDetecting) {
      plankIntervalRef.current = setInterval(() => setPlankTime((prev) => prev + 1), 1000);
    } else {
      if (plankIntervalRef.current) { clearInterval(plankIntervalRef.current); plankIntervalRef.current = null; }
    }
    return () => { if (plankIntervalRef.current) clearInterval(plankIntervalRef.current); };
  }, [isPlank, isDetecting]);

  const startDetection = useCallback(() => {
    const video = webcamRef.current?.video;
    if (!video) return;

    const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    pose.onResults(onResults);

    const camera = new cam.Camera(video, { onFrame: async () => { await pose.send({ image: video }); }, width: 640, height: 480 });
    camera.start();
    cameraRef.current = camera;
    setIsDetecting(true);
    setCameraReady(true);
    sessionStartRef.current = new Date();
    resetDetection();
    showStreakNotification(3);
  }, [onResults]);

  const stopDetection = () => {
    if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
    setIsDetecting(false);
    setCameraReady(false);
    resetDetection();
    // Auto-save when stopping
    if (totalReps > 0 && user) saveSession();
  };

  const resetWorkout = () => {
    setReps(0); setFormScore(0); setPlankTime(0);
    setCurrentExercise("unknown"); setFeedback("Position yourself in frame");
    resetDetection(); repFeedbackCounter.current = 0;
  };

  const formatPlankTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="relative z-10 flex items-center justify-between mb-4">
        <h1 className="text-2xl font-display font-bold text-foreground">AI WORKOUT</h1>
        {isDetecting && (
          <div className="flex items-center gap-2">
            <button onClick={resetWorkout} className="glass-card p-2 rounded-lg"><RotateCcw className="h-4 w-4 text-neon-cyan" /></button>
            <button onClick={stopDetection} className="glass-card p-2 rounded-lg"><XCircle className="h-4 w-4 text-destructive" /></button>
          </div>
        )}
      </motion.div>

      {/* Camera */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="relative z-10 aspect-[3/4] rounded-3xl bg-secondary/30 border border-border/50 overflow-hidden mb-4">
        <Webcam ref={webcamRef} audio={false} mirrored className="absolute inset-0 w-full h-full object-cover" videoConstraints={{ facingMode: "user", width: 640, height: 480 }} style={{ opacity: isDetecting ? 0 : 1 }} />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)", opacity: isDetecting ? 1 : 0 }} />
        <div className="absolute inset-4 border-2 border-neon-green/20 rounded-2xl pointer-events-none" />
        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <div className="glass-card px-3 py-1.5 flex items-center gap-2">
            <Crosshair className={`h-3 w-3 ${isDetecting ? "text-neon-green animate-pulse-neon" : "text-muted-foreground"}`} />
            <span className={`text-[10px] font-bold ${isDetecting ? "text-neon-green" : "text-muted-foreground"}`}>{isDetecting ? EXERCISE_NAMES[currentExercise] : "STANDBY"}</span>
          </div>
          <div className="glass-card px-3 py-1.5 flex items-center gap-2"><Volume2 className="h-3 w-3 text-neon-cyan" /></div>
        </div>
        {!isDetecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40">
            <div className="text-center">
              <Camera className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">Position yourself in frame</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Full body visible for best tracking</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4 flex gap-3 z-10">
          <div className="glass-card flex-1 p-3 text-center">
            <p className="text-2xl font-display font-bold text-neon-green">{reps}</p>
            <p className="text-[10px] text-muted-foreground">REPS</p>
          </div>
          <div className="glass-card flex-1 p-3 text-center">
            <p className={`text-2xl font-display font-bold ${formScore >= 85 ? "text-neon-green" : formScore >= 60 ? "text-neon-orange" : "text-destructive"}`}>{formScore > 0 ? `${formScore}%` : "—"}</p>
            <p className="text-[10px] text-muted-foreground">FORM</p>
          </div>
          {currentExercise === "plank" && (
            <div className="glass-card flex-1 p-3 text-center">
              <p className="text-2xl font-display font-bold text-neon-cyan">{formatPlankTime(plankTime)}</p>
              <p className="text-[10px] text-muted-foreground">HOLD</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Feedback */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`relative z-10 glass-card p-4 flex items-center gap-3 mb-4 border-l-2 ${formScore >= 85 ? "border-neon-green/40" : formScore >= 60 ? "border-neon-orange/40" : "border-destructive/40"}`}>
        <Activity className={`h-5 w-5 shrink-0 ${formScore >= 85 ? "text-neon-green" : formScore >= 60 ? "text-neon-orange" : "text-destructive"}`} />
        <div>
          <p className="text-sm text-foreground/80">{feedback}</p>
          {isDetecting && currentExercise !== "unknown" && <p className="text-[10px] text-muted-foreground mt-0.5">Detecting: {EXERCISE_NAMES[currentExercise]} • Total: {totalReps} reps</p>}
        </div>
      </motion.div>

      {/* Exercise filters */}
      {isDetecting && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 glass-card p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-2"><Zap className="h-3 w-3 text-neon-green inline mr-1" />AI detects: Pushups, Squats, Planks, Lunges, Jumping Jacks, Sit-ups</p>
          <div className="flex flex-wrap gap-2">
            {(["pushup", "squat", "plank", "jumping_jack", "lunge", "situp"] as ExerciseType[]).map((ex) => (
              <span key={ex} className={`text-[10px] px-2 py-1 rounded-full font-semibold ${currentExercise === ex ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{EXERCISE_NAMES[ex]}</span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Start / Stop */}
      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} whileTap={{ scale: 0.97 }} onClick={isDetecting ? stopDetection : startDetection} className={`relative z-10 w-full rounded-2xl p-4 font-display font-bold text-lg tracking-wider ${isDetecting ? "bg-destructive text-destructive-foreground" : "gradient-primary text-primary-foreground neon-glow"}`}>
        {isDetecting ? "STOP & SAVE" : "START DETECTION"}
      </motion.button>

      {/* Session Summary */}
      {!isDetecting && totalReps > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 glass-card p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-neon-orange" />
              <h3 className="font-bold text-foreground">Session Summary</h3>
            </div>
            <button onClick={saveSession} disabled={saving} className="glass-card px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-neon-green">
              <Save className="h-3 w-3" /> {saving ? "Saving..." : "Save Again"}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center"><p className="text-2xl font-bold text-neon-green">{totalReps}</p><p className="text-[10px] text-muted-foreground">Total Reps</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-neon-cyan">{formScore}%</p><p className="text-[10px] text-muted-foreground">Avg Form</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-neon-orange">{reps}</p><p className="text-[10px] text-muted-foreground">Last Set</p></div>
          </div>
          <p className="text-[10px] text-neon-green mt-3 text-center">✅ Auto-saved to your account</p>
        </motion.div>
      )}
    </div>
  );
};

export default CameraPage;

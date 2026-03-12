import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Square, MapPin, Heart, Activity, Timer, Footprints,
  TrendingUp, ArrowLeft, Save, Trash2, ChevronDown, ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
  speed?: number;
}

interface RunSession {
  id: string;
  distance_km: number;
  duration_seconds: number;
  steps: number;
  calories: number;
  avg_pace: string;
  avg_heart_rate: number | null;
  route_points: RoutePoint[];
  created_at: string;
}

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
    : `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

const calcPace = (elapsed: number, distance: number): string => {
  if (distance <= 0 || elapsed <= 0) return "0:00";
  const paceMin = elapsed / 60 / distance;
  const m = Math.floor(paceMin);
  const s = Math.floor((paceMin - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(160,100%,50%)", "hsl(25,100%,55%)"];

const RunningPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [heartRate, setHeartRate] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [steps, setSteps] = useState(0);
  const [pace, setPace] = useState("0:00");
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "acquiring" | "active" | "error">("idle");
  const [saving, setSaving] = useState(false);

  // History
  const [pastRuns, setPastRuns] = useState<RunSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"run" | "history" | "stats">("run");
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const hrIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const elapsedRef = useRef(0);
  const distanceRef = useRef(0);
  const stepsRef = useRef(0);

  // Load past runs
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setHistoryLoading(true);
      const { data } = await supabase
        .from("running_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setPastRuns(data as unknown as RunSession[]);
      setHistoryLoading(false);
    };
    load();
  }, [user]);

  // Haversine distance calc
  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // GPS tracking
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      toast.error("GPS not available on this device");
      return;
    }
    setGpsStatus("acquiring");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const speed = pos.coords.speed || 0;
        const point: RoutePoint = { lat, lng, timestamp: Date.now(), speed };

        if (lastPosRef.current) {
          const d = haversine(lastPosRef.current.lat, lastPosRef.current.lng, lat, lng);
          if (d > 0.002 && d < 0.5) { // filter noise: >2m and <500m jumps
            distanceRef.current += d;
            setDistance(distanceRef.current);
            const newSteps = Math.floor(d * 1300); // ~1300 steps/km
            stepsRef.current += newSteps;
            setSteps(stepsRef.current);
          }
        }
        lastPosRef.current = { lat, lng };
        setRoutePoints(prev => [...prev, point]);
        setGpsStatus("active");
      },
      (err) => {
        console.error("GPS error:", err);
        setGpsStatus("error");
        toast.error("GPS error: " + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }, []);

  const stopGPS = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsStatus("idle");
  }, []);

  // Timer & simulated biometrics
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        setPace(calcPace(elapsedRef.current, distanceRef.current));
      }, 1000);
      hrIntervalRef.current = setInterval(() => {
        setHeartRate(Math.floor(110 + Math.random() * 50));
        setSpo2(Math.floor(95 + Math.random() * 4));
      }, 3000);
      startGPS();
    } else {
      clearInterval(intervalRef.current);
      clearInterval(hrIntervalRef.current);
      stopGPS();
    }
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(hrIntervalRef.current);
    };
  }, [isRunning, startGPS, stopGPS]);

  const calories = distance * 60;

  // Save run
  const saveRun = async () => {
    if (!user || distance < 0.01) {
      toast.error("Run too short to save");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("running_sessions").insert({
      user_id: user.id,
      distance_km: Math.round(distance * 1000) / 1000,
      duration_seconds: elapsed,
      steps,
      calories: Math.round(calories * 10) / 10,
      avg_pace: pace,
      avg_heart_rate: heartRate,
      route_points: routePoints as any,
    }).select().single();

    if (error) {
      toast.error("Failed to save run");
    } else {
      toast.success("Run saved! 🏃‍♂️");
      if (data) setPastRuns(prev => [data as unknown as RunSession, ...prev]);

      // Update daily activity
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase.from("daily_activity").select("*").eq("user_id", user.id).eq("date", today).maybeSingle();
      if (existing) {
        await supabase.from("daily_activity").update({
          calories: (existing.calories || 0) + calories,
          active_minutes: (existing.active_minutes || 0) + Math.ceil(elapsed / 60),
          steps: (existing.steps || 0) + steps,
          distance_km: (existing.distance_km || 0) + distance,
        }).eq("id", existing.id);
      } else {
        await supabase.from("daily_activity").insert({
          user_id: user.id, date: today, calories, active_minutes: Math.ceil(elapsed / 60), steps, distance_km: distance,
        });
      }
    }
    setSaving(false);
  };

  const deleteRun = async (id: string) => {
    await supabase.from("running_sessions").delete().eq("id", id);
    setPastRuns(prev => prev.filter(r => r.id !== id));
    toast.success("Run deleted");
  };

  const reset = () => {
    setIsRunning(false);
    setElapsed(0); setDistance(0); setSteps(0);
    setHeartRate(72); setSpo2(98); setPace("0:00");
    setRoutePoints([]);
    elapsedRef.current = 0; distanceRef.current = 0; stepsRef.current = 0;
    lastPosRef.current = null;
    stopGPS();
  };

  const stopAndSave = () => {
    setIsRunning(false);
    if (distance > 0.01) saveRun();
  };

  const getHRZone = () => {
    if (heartRate < 100) return { zone: "Rest", color: "text-primary" };
    if (heartRate < 130) return { zone: "Fat Burn", color: "text-accent" };
    if (heartRate < 150) return { zone: "Cardio", color: "text-destructive" };
    return { zone: "Peak", color: "text-destructive" };
  };
  const hrZone = getHRZone();

  // Stats calculations
  const totalDistance = pastRuns.reduce((s, r) => s + r.distance_km, 0);
  const totalDuration = pastRuns.reduce((s, r) => s + r.duration_seconds, 0);
  const totalCalories = pastRuns.reduce((s, r) => s + r.calories, 0);
  const avgDistance = pastRuns.length > 0 ? totalDistance / pastRuns.length : 0;
  const weeklyGoal = 20; // km
  const weekProgress = Math.min((totalDistance / weeklyGoal) * 100, 100);

  // Chart data: last 7 runs
  const recentRuns = [...pastRuns].reverse().slice(-7);
  const distanceChartData = recentRuns.map((r, i) => ({
    name: `Run ${i + 1}`,
    distance: Math.round(r.distance_km * 100) / 100,
    calories: Math.round(r.calories),
  }));
  const paceChartData = recentRuns.map((r, i) => ({
    name: `Run ${i + 1}`,
    duration: Math.round(r.duration_seconds / 60),
    steps: r.steps,
  }));

  // Distance distribution pie
  const distBuckets = [
    { name: "<1km", value: pastRuns.filter(r => r.distance_km < 1).length },
    { name: "1-3km", value: pastRuns.filter(r => r.distance_km >= 1 && r.distance_km < 3).length },
    { name: "3-5km", value: pastRuns.filter(r => r.distance_km >= 3 && r.distance_km < 5).length },
    { name: "5km+", value: pastRuns.filter(r => r.distance_km >= 5).length },
  ].filter(b => b.value > 0);

  const TABS = [
    { key: "run" as const, label: "🏃 Run" },
    { key: "history" as const, label: "📋 History" },
    { key: "stats" as const, label: "📊 Stats" },
  ];

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full glass-card flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">RUN TRACKER</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {gpsStatus === "active" ? "GPS Active" : gpsStatus === "acquiring" ? "Acquiring GPS..." : gpsStatus === "error" ? "GPS Error" : "GPS Ready"}
              <span className={`h-2 w-2 rounded-full ${gpsStatus === "active" ? "bg-primary animate-pulse" : gpsStatus === "acquiring" ? "bg-accent animate-pulse" : gpsStatus === "error" ? "bg-destructive" : "bg-muted-foreground"}`} />
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`text-[10px] px-2.5 py-1.5 rounded-full font-bold transition-all ${activeTab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ========== RUN TAB ========== */}
      {activeTab === "run" && (
        <>
          {/* Weekly Goal Progress */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 glass-card p-3 mb-4">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-bold text-foreground">Weekly Goal</p>
              <p className="text-xs text-muted-foreground">{totalDistance.toFixed(1)} / {weeklyGoal} km</p>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${weekProgress}%` }} transition={{ duration: 1 }}
                className="h-full bg-primary rounded-full" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{weekProgress.toFixed(0)}% complete</p>
          </motion.div>

          {/* Big Timer */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 text-center mb-5">
            <p className="text-6xl font-display font-black text-foreground tracking-wider">{formatTime(elapsed)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isRunning ? "Running..." : elapsed > 0 ? "Paused" : "Ready to run"}
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-3 mb-4">
            {[
              { icon: MapPin, val: distance.toFixed(2), label: "km", color: "text-primary" },
              { icon: Timer, val: pace, label: "min/km pace", color: "text-accent" },
              { icon: Footprints, val: steps.toString(), label: "steps", color: "text-foreground" },
              { icon: TrendingUp, val: calories.toFixed(0), label: "cal burned", color: "text-destructive" },
            ].map((s, i) => (
              <div key={i} className="glass-card p-4 text-center">
                <s.icon className={`h-4 w-4 ${s.color} mx-auto mb-1`} />
                <p className="text-2xl font-bold text-foreground">{s.val}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Heart Rate & SpO2 */}
          <div className="relative z-10 grid grid-cols-2 gap-3 mb-5">
            <motion.div animate={{ scale: isRunning ? [1, 1.02, 1] : 1 }} transition={{ repeat: Infinity, duration: 1 }} className="glass-card p-4">
              <Heart className="h-5 w-5 text-destructive mb-2" />
              <p className="text-3xl font-bold text-foreground">{heartRate}</p>
              <p className="text-xs text-muted-foreground">BPM</p>
              <span className={`text-[10px] font-bold ${hrZone.color}`}>{hrZone.zone}</span>
            </motion.div>
            <div className="glass-card p-4">
              <Activity className="h-5 w-5 text-primary mb-2" />
              <p className="text-3xl font-bold text-foreground">{spo2}%</p>
              <p className="text-xs text-muted-foreground">SpO2</p>
              <span className="text-[10px] font-bold text-primary">Healthy</span>
            </div>
          </div>

          {/* Live Route Points Count */}
          {routePoints.length > 0 && (
            <div className="relative z-10 glass-card p-2 mb-4 flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">📍 {routePoints.length} GPS points recorded</p>
              <p className="text-[10px] text-primary font-bold">LIVE</p>
            </div>
          )}

          {/* Controls */}
          <div className="relative z-10 flex items-center justify-center gap-5">
            <motion.button whileTap={{ scale: 0.9 }} onClick={reset}
              className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
              <Square className="h-5 w-5 text-muted-foreground" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsRunning(!isRunning)}
              className={`h-20 w-20 rounded-full flex items-center justify-center ${isRunning ? "bg-destructive" : "bg-primary"}`}>
              {isRunning ? <Pause className="h-8 w-8 text-destructive-foreground" /> : <Play className="h-8 w-8 text-primary-foreground ml-1" />}
            </motion.button>
            {elapsed > 0 && !isRunning && distance > 0.01 && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={saveRun} disabled={saving}
                className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
                <Save className="h-5 w-5 text-primary-foreground" />
              </motion.button>
            )}
            {isRunning && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={stopAndSave}
                className="h-14 w-14 rounded-full bg-accent flex items-center justify-center">
                <Save className="h-5 w-5 text-accent-foreground" />
              </motion.button>
            )}
          </div>
        </>
      )}

      {/* ========== HISTORY TAB ========== */}
      {activeTab === "history" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10">
          <h2 className="text-lg font-bold text-foreground mb-3">Run History</h2>
          {historyLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pastRuns.length === 0 ? (
            <div className="text-center py-10">
              <Footprints className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No runs yet. Start your first run!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pastRuns.map(run => (
                <div key={run.id} className="glass-card overflow-hidden">
                  <button onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                    className="w-full p-3 flex items-center justify-between text-left">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Footprints className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{run.distance_km.toFixed(2)} km</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(run.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-bold text-foreground">{formatTime(run.duration_seconds)}</p>
                        <p className="text-[10px] text-muted-foreground">{run.avg_pace} /km</p>
                      </div>
                      {expandedRun === run.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedRun === run.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-3 pb-3 border-t border-border/50 pt-2">
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            {[
                              { label: "Steps", val: run.steps },
                              { label: "Calories", val: `${run.calories.toFixed(0)} kcal` },
                              { label: "Pace", val: `${run.avg_pace} /km` },
                              { label: "HR", val: run.avg_heart_rate ? `${run.avg_heart_rate} bpm` : "N/A" },
                            ].map((s, i) => (
                              <div key={i} className="text-center bg-secondary/50 rounded-lg p-1.5">
                                <p className="text-xs font-bold text-foreground">{s.val}</p>
                                <p className="text-[8px] text-muted-foreground">{s.label}</p>
                              </div>
                            ))}
                          </div>
                          {(run.route_points as unknown as RoutePoint[])?.length > 0 && (
                            <p className="text-[9px] text-muted-foreground mb-2">📍 {(run.route_points as unknown as RoutePoint[]).length} GPS points recorded</p>
                          )}
                          <button onClick={() => deleteRun(run.id)} className="text-[10px] text-destructive flex items-center gap-1">
                            <Trash2 className="h-3 w-3" /> Delete run
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ========== STATS TAB ========== */}
      {activeTab === "stats" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "Total Distance", val: `${totalDistance.toFixed(1)} km`, icon: "🗺️" },
              { label: "Total Runs", val: pastRuns.length, icon: "🏃" },
              { label: "Total Time", val: formatTime(totalDuration), icon: "⏱️" },
              { label: "Total Calories", val: `${totalCalories.toFixed(0)}`, icon: "🔥" },
            ].map((s, i) => (
              <div key={i} className="glass-card p-3 text-center">
                <span className="text-lg">{s.icon}</span>
                <p className="text-lg font-bold text-foreground">{s.val}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Weekly Progress Bar */}
          <div className="glass-card p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-bold text-foreground">🎯 Weekly Goal Progress</p>
              <p className="text-xs text-primary font-bold">{weekProgress.toFixed(0)}%</p>
            </div>
            <div className="h-4 bg-secondary rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${weekProgress}%` }} transition={{ duration: 1.5 }}
                className="h-full bg-primary rounded-full relative">
                <span className="absolute right-1 top-0 text-[8px] text-primary-foreground font-bold leading-4">{totalDistance.toFixed(1)} km</span>
              </motion.div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{Math.max(0, weeklyGoal - totalDistance).toFixed(1)} km remaining</p>
          </div>

          {/* Distance Chart */}
          {distanceChartData.length > 0 && (
            <div className="glass-card p-4 mb-4">
              <p className="text-sm font-bold text-foreground mb-3">📊 Distance & Calories</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={distanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="distance" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} name="km" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Duration & Steps Chart */}
          {paceChartData.length > 0 && (
            <div className="glass-card p-4 mb-4">
              <p className="text-sm font-bold text-foreground mb-3">⏱️ Duration (min) per Run</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={paceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="duration" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Minutes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distance Distribution Pie */}
          {distBuckets.length > 0 && (
            <div className="glass-card p-4 mb-4">
              <p className="text-sm font-bold text-foreground mb-3">🥧 Run Distance Distribution</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={140}>
                  <PieChart>
                    <Pie data={distBuckets} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30} strokeWidth={2}>
                      {distBuckets.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {distBuckets.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <p className="text-[10px] text-foreground">{b.name}: <span className="font-bold">{b.value}</span></p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Avg Stats */}
          <div className="glass-card p-4">
            <p className="text-sm font-bold text-foreground mb-2">📈 Averages</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Avg Distance", val: `${avgDistance.toFixed(2)} km` },
                { label: "Avg Duration", val: formatTime(pastRuns.length > 0 ? Math.round(totalDuration / pastRuns.length) : 0) },
                { label: "Avg Calories", val: `${pastRuns.length > 0 ? (totalCalories / pastRuns.length).toFixed(0) : 0}` },
              ].map((s, i) => (
                <div key={i} className="text-center bg-secondary/50 rounded-lg p-2">
                  <p className="text-sm font-bold text-foreground">{s.val}</p>
                  <p className="text-[8px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default RunningPage;

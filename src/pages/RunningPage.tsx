import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Square, MapPin, Heart, Activity, Timer, Footprints, TrendingUp } from "lucide-react";

const RunningPage = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [heartRate, setHeartRate] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [steps, setSteps] = useState(0);
  const [pace, setPace] = useState("0:00");
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const hrIntervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
        setDistance((d) => d + 0.002 + Math.random() * 0.001);
        setSteps((s) => s + Math.floor(Math.random() * 3) + 1);
      }, 1000);

      hrIntervalRef.current = setInterval(() => {
        setHeartRate(Math.floor(110 + Math.random() * 50));
        setSpo2(Math.floor(95 + Math.random() * 4));
      }, 3000);
    } else {
      clearInterval(intervalRef.current);
      clearInterval(hrIntervalRef.current);
    }
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(hrIntervalRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    if (elapsed > 0 && distance > 0) {
      const paceMin = elapsed / 60 / distance;
      const m = Math.floor(paceMin);
      const s = Math.floor((paceMin - m) * 60);
      setPace(`${m}:${s.toString().padStart(2, "0")}`);
    }
  }, [elapsed, distance]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
      : `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const reset = () => {
    setIsRunning(false);
    setElapsed(0);
    setDistance(0);
    setSteps(0);
    setHeartRate(72);
    setSpo2(98);
    setPace("0:00");
  };

  const getHRZone = () => {
    if (heartRate < 100) return { zone: "Rest", color: "text-neon-cyan" };
    if (heartRate < 130) return { zone: "Fat Burn", color: "text-neon-green" };
    if (heartRate < 150) return { zone: "Cardio", color: "text-neon-orange" };
    return { zone: "Peak", color: "text-neon-pink" };
  };

  const hrZone = getHRZone();

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
          <Footprints className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">RUN TRACKER</h1>
          <p className="text-xs text-muted-foreground">Real-time GPS tracking</p>
        </div>
      </motion.div>

      {/* Big Timer */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 text-center mb-6">
        <p className="text-6xl font-display font-black text-foreground tracking-wider">{formatTime(elapsed)}</p>
        <p className="text-sm text-muted-foreground mt-2">Elapsed Time</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="relative z-10 grid grid-cols-2 gap-3 mb-6">
        <div className="glass-card p-4 text-center">
          <MapPin className="h-4 w-4 text-neon-green mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{distance.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">km</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Timer className="h-4 w-4 text-neon-cyan mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{pace}</p>
          <p className="text-[10px] text-muted-foreground">min/km pace</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Footprints className="h-4 w-4 text-neon-orange mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{steps}</p>
          <p className="text-[10px] text-muted-foreground">steps</p>
        </div>
        <div className="glass-card p-4 text-center">
          <TrendingUp className="h-4 w-4 text-neon-purple mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{(distance * 60).toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground">cal burned</p>
        </div>
      </div>

      {/* Heart Rate & SpO2 */}
      <div className="relative z-10 grid grid-cols-2 gap-3 mb-6">
        <motion.div animate={{ scale: isRunning ? [1, 1.02, 1] : 1 }} transition={{ repeat: Infinity, duration: 1 }} className="glass-card p-4">
          <Heart className="h-5 w-5 text-neon-pink mb-2" />
          <p className="text-3xl font-bold text-foreground">{heartRate}</p>
          <p className="text-xs text-muted-foreground">BPM</p>
          <span className={`text-[10px] font-bold ${hrZone.color}`}>{hrZone.zone}</span>
        </motion.div>
        <div className="glass-card p-4">
          <Activity className="h-5 w-5 text-neon-cyan mb-2" />
          <p className="text-3xl font-bold text-foreground">{spo2}%</p>
          <p className="text-xs text-muted-foreground">SpO2</p>
          <span className="text-[10px] font-bold text-neon-green">Healthy</span>
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 flex items-center justify-center gap-6">
        <motion.button whileTap={{ scale: 0.9 }} onClick={reset} className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
          <Square className="h-5 w-5 text-muted-foreground" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsRunning(!isRunning)}
          className={`h-20 w-20 rounded-full flex items-center justify-center ${isRunning ? "bg-destructive" : "gradient-primary neon-glow"}`}
        >
          {isRunning ? <Pause className="h-8 w-8 text-foreground" /> : <Play className="h-8 w-8 text-primary-foreground ml-1" />}
        </motion.button>
        <div className="h-14 w-14" /> {/* spacer */}
      </div>
    </div>
  );
};

export default RunningPage;

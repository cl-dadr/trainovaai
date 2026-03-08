import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Sparkles, Dumbbell, Apple, Droplets, Flame,
  Play, ChevronRight, Target, Zap, Timer, ArrowLeft, X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useUserStats";
import ExerciseModel from "@/components/ExerciseModel";

type ExerciseType = "squat" | "pushup" | "lunge" | "plank" | "jumping_jack" | "situp";

type Message = { id: number; role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

const exercises: {
  id: ExerciseType;
  name: string;
  emoji: string;
  muscles: string;
  difficulty: string;
  color: string;
  tips: string[];
  angles: string[];
}[] = [
  {
    id: "squat", name: "Squat", emoji: "🦵", muscles: "Quads · Glutes · Core",
    difficulty: "Beginner", color: "#39ff14",
    tips: ["Keep knees behind toes", "Back straight, chest up", "Hip hinge first", "Feet shoulder-width"],
    angles: ["Hip: 90°–120°", "Knee: 85°–95°", "Ankle: 70°–80°"],
  },
  {
    id: "pushup", name: "Push-up", emoji: "💪", muscles: "Chest · Triceps · Core",
    difficulty: "Beginner", color: "#ff6b35",
    tips: ["Elbows at 45°", "Core tight throughout", "Full range of motion", "Hands shoulder-width"],
    angles: ["Elbow: 90° at bottom", "Body line: 180°", "Wrist: neutral"],
  },
  {
    id: "lunge", name: "Lunge", emoji: "🏃", muscles: "Quads · Hamstrings · Glutes",
    difficulty: "Intermediate", color: "#a855f7",
    tips: ["Front knee over ankle", "Back knee near floor", "Torso upright", "Step far enough"],
    angles: ["Front knee: 90°", "Back knee: 90°", "Hip: 90°–110°"],
  },
  {
    id: "plank", name: "Plank", emoji: "🧱", muscles: "Core · Shoulders · Back",
    difficulty: "Beginner", color: "#06b6d4",
    tips: ["Straight line head to heels", "Don't sag hips", "Engage core", "Breathe steadily"],
    angles: ["Body line: 180°", "Shoulder: 90°", "Hold time based"],
  },
  {
    id: "jumping_jack", name: "Jumping Jack", emoji: "⭐", muscles: "Full Body · Cardio",
    difficulty: "Beginner", color: "#f59e0b",
    tips: ["Land softly on balls of feet", "Full arm extension", "Keep rhythm steady", "Core engaged"],
    angles: ["Arms: 0°–180°", "Legs: together–apart", "Smooth transitions"],
  },
  {
    id: "situp", name: "Sit-up", emoji: "🔄", muscles: "Abs · Hip Flexors",
    difficulty: "Beginner", color: "#ef4444",
    tips: ["Don't pull neck", "Controlled movement", "Exhale on the way up", "Feet anchored"],
    angles: ["Hip flexion: 40°–90°", "Spine curl: gradual", "Neck neutral"],
  },
];

const quickCommands = [
  { icon: Dumbbell, label: "Form tips", message: "Give me detailed form correction tips for squats, pushups and lunges" },
  { icon: Flame, label: "Workout plan", message: "Create a 30-day calisthenics plan for lean muscle" },
  { icon: Apple, label: "Diet plan", message: "Give me a high protein Indian diet for muscle building" },
  { icon: Droplets, label: "Recovery", message: "Best recovery techniques after intense calisthenics" },
];


const AICoachPage = () => {
  const { user } = useAuth();
  const { totalReps, avgFormScore, longestStreak } = useUserStats();
  const [activeTab, setActiveTab] = useState<"exercises" | "chat">("exercises");
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType | null>(null);
  const [previewTimer, setPreviewTimer] = useState(15);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1, role: "assistant",
      content: "Hey! I'm **JAX** 🔥 — your personal AI fitness coach.\n\nI cover **everything**: workouts, form correction, nutrition, diet plans, and recovery. Ask me anything and let's crush your goals! 💪",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // 15-sec preview timer
  useEffect(() => {
    if (isPreviewPlaying && previewTimer > 0) {
      timerRef.current = setTimeout(() => setPreviewTimer((t) => t - 1), 1000);
    } else if (previewTimer === 0) {
      setIsPreviewPlaying(false);
      setPreviewTimer(15);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPreviewPlaying, previewTimer]);

  const startPreview = (ex: ExerciseType) => {
    setSelectedExercise(ex);
    setPreviewTimer(15);
    setIsPreviewPlaying(true);
  };

  const streamChat = useCallback(async (allMessages: Message[]) => {
    const contextMsg = `User stats: ${totalReps} total reps, ${avgFormScore}% avg form, ${longestStreak} day best streak.`;
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        messages: [
          { role: "user", content: contextMsg },
          ...allMessages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!resp.ok || !resp.body) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to connect");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id === -1)
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        return [...prev, { id: -1, role: "assistant", content: assistantSoFar }];
      });
    };

    let done2 = false;
    while (!done2) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });
      let ni: number;
      while ((ni = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, ni);
        textBuffer = textBuffer.slice(ni + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || !line.trim() || !line.startsWith("data: ")) continue;
        const js = line.slice(6).trim();
        if (js === "[DONE]") { done2 = true; break; }
        try {
          const c = JSON.parse(js).choices?.[0]?.delta?.content;
          if (c) upsert(c);
        } catch { textBuffer = line + "\n" + textBuffer; break; }
      }
    }
  }, [totalReps, avgFormScore, longestStreak]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: text.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);
    try { await streamChat(newMsgs); } catch {
      setMessages((p) => [...p, { id: Date.now() + 1, role: "assistant", content: "⚠️ Connection error. Try again!" }]);
    }
    setIsLoading(false);
  };

  const selEx = exercises.find((e) => e.id === selectedExercise);

  return (
    <div className="relative flex flex-col h-screen pb-20">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 px-4 pt-6 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl gradient-purple flex items-center justify-center">
            <Bot className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">AI FITNESS COACH</h1>
            <p className="text-xs text-neon-green flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-green inline-block animate-pulse" />
              3D Exercise Previews + AI Chat
            </p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-2">
          {(["exercises", "chat"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab ? "gradient-primary text-primary-foreground" : "glass-card text-muted-foreground"
              }`}
            >
              {tab === "exercises" ? "🏋️ 3D Exercises" : "💬 AI Chat"}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      {activeTab === "exercises" ? (
        <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-4">
          {/* Exercise Detail Modal */}
          <AnimatePresence>
            {selectedExercise && selEx && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col"
              >
                <div className="flex items-center justify-between px-4 pt-6 pb-2">
                  <button onClick={() => { setSelectedExercise(null); setIsPreviewPlaying(false); }} className="glass-card p-2 rounded-xl">
                    <ArrowLeft className="h-5 w-5 text-foreground" />
                  </button>
                  <h2 className="font-display font-bold text-foreground">{selEx.emoji} {selEx.name}</h2>
                  <button onClick={() => { setSelectedExercise(null); setIsPreviewPlaying(false); }} className="glass-card p-2 rounded-xl">
                    <X className="h-5 w-5 text-foreground" />
                  </button>
                </div>

                {/* 3D Preview */}
                <div className="px-4">
                  <div className="relative glass-card rounded-2xl overflow-hidden" style={{ border: `1px solid ${selEx.color}30` }}>
                    <Suspense fallback={<div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Loading 3D model...</div>}>
                      <ExerciseModel exercise={selEx.id} accentColor={selEx.color} height="280px" />
                    </Suspense>
                    {/* Timer overlay */}
                    <div className="absolute top-3 right-3 glass-card px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Timer className="h-3 w-3" style={{ color: selEx.color }} />
                      <span className="text-xs font-bold text-foreground">{isPreviewPlaying ? `${previewTimer}s` : "15s"}</span>
                    </div>
                    {!isPreviewPlaying && (
                      <button
                        onClick={() => startPreview(selEx.id)}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full flex items-center gap-2"
                        style={{ background: selEx.color }}
                      >
                        <Play className="h-4 w-4 text-background" />
                        <span className="text-xs font-bold text-background">15s Preview</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 overflow-y-auto px-4 mt-4 space-y-3 pb-24">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="glass-card p-3 text-center">
                      <Target className="h-4 w-4 mx-auto mb-1" style={{ color: selEx.color }} />
                      <p className="text-[10px] text-muted-foreground">Muscles</p>
                      <p className="text-xs font-bold text-foreground">{selEx.muscles.split("·")[0].trim()}</p>
                    </div>
                    <div className="glass-card p-3 text-center">
                      <Zap className="h-4 w-4 mx-auto mb-1" style={{ color: selEx.color }} />
                      <p className="text-[10px] text-muted-foreground">Level</p>
                      <p className="text-xs font-bold text-foreground">{selEx.difficulty}</p>
                    </div>
                    <div className="glass-card p-3 text-center">
                      <Sparkles className="h-4 w-4 mx-auto mb-1" style={{ color: selEx.color }} />
                      <p className="text-[10px] text-muted-foreground">AI Tracked</p>
                      <p className="text-xs font-bold text-foreground">Yes</p>
                    </div>
                  </div>

                  {/* Joint Angles */}
                  <div className="glass-card p-4 rounded-xl">
                    <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" style={{ color: selEx.color }} />
                      Key Joint Angles
                    </h3>
                    {selEx.angles.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: selEx.color }} />
                        <span className="text-xs text-foreground/80">{a}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tips */}
                  <div className="glass-card p-4 rounded-xl">
                    <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" style={{ color: selEx.color }} />
                      Pro Tips
                    </h3>
                    {selEx.tips.map((tip, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5">
                        <span className="text-xs" style={{ color: selEx.color }}>✓</span>
                        <span className="text-xs text-foreground/80">{tip}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => { setSelectedExercise(null); setIsPreviewPlaying(false); }}
                    className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground gradient-primary neon-glow"
                  >
                    🎯 Start with AI Camera
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Exercise Grid */}
          <div className="space-y-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-neon-green" />
              Exercise Library — 3D Previews
            </h3>
            {exercises.map((ex, idx) => (
              <motion.button
                key={ex.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                onClick={() => startPreview(ex.id)}
                className="w-full glass-card rounded-2xl overflow-hidden text-left"
                style={{ borderColor: `${ex.color}20` }}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Mini 3D preview */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0" style={{ background: `${ex.color}10` }}>
                    <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-2xl">{ex.emoji}</div>}>
                      <ExerciseModel exercise={ex.id} accentColor={ex.color} height="80px" />
                    </Suspense>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{ex.emoji}</span>
                      <h4 className="font-bold text-foreground text-sm">{ex.name}</h4>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-1.5">{ex.muscles}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${ex.color}20`, color: ex.color }}>
                        {ex.difficulty}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-medium bg-neon-green/10 text-neon-green">AI Tracked</span>
                    </div>
                  </div>
                  <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center" style={{ background: `${ex.color}20` }}>
                    <Play className="h-3 w-3" style={{ color: ex.color }} />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        /* Chat Tab */
        <>
          <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 space-y-3">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user" ? "gradient-primary text-primary-foreground rounded-br-md" : "glass-card text-foreground rounded-bl-md"
                  }`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="h-3 w-3 text-neon-purple" />
                        <span className="text-[10px] font-bold text-neon-purple">AI COACH</span>
                      </div>
                    )}
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_strong]:text-neon-green [&_h3]:text-sm [&_h3]:font-bold [&_ul]:my-1 [&_li]:my-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" style={{ animationDelay: "0.4s" }} />
                </div>
              </motion.div>
            )}
          </div>
          <div className="relative z-10 px-4 py-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {quickCommands.map((cmd) => (
                <button key={cmd.label} onClick={() => sendMessage(cmd.message)} disabled={isLoading}
                  className="shrink-0 glass-card px-3 py-2 flex items-center gap-2 hover:bg-secondary/50 transition-colors disabled:opacity-50">
                  <cmd.icon className="h-3 w-3 text-neon-green" />
                  <span className="text-xs text-foreground whitespace-nowrap">{cmd.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="relative z-10 px-4 pb-2">
            <div className="glass-card flex items-center gap-2 px-4 py-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                placeholder="Ask about workouts, diet, form..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                disabled={isLoading}
              />
              <button onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()}
                className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center disabled:opacity-50">
                <Send className="h-4 w-4 text-primary-foreground" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AICoachPage;

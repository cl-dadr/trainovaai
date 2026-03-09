import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Sparkles, Dumbbell, Apple, Droplets, Flame,
  Play, ChevronLeft, ChevronRight, Target, Zap, Timer, X, Heart, Trophy, Brain,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useUserStats";
import ExerciseModel from "@/components/ExerciseModel";

type ExerciseType = "squat" | "pushup" | "lunge" | "plank" | "jumping_jack" | "situp";
type Message = { id: number; role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

const exercises: {
  id: ExerciseType; name: string; emoji: string; vibe: string;
  muscles: string; difficulty: string; color: string;
  tips: string[]; angles: string[];
}[] = [
  {
    id: "squat", name: "Squat", emoji: "🦵", vibe: "thicc gains incoming 🍑",
    muscles: "Quads · Glutes · Core", difficulty: "Beginner", color: "#39ff14",
    tips: ["Knees behind toes fr fr", "Back straight, chest up bestie", "Hip hinge first always", "Feet shoulder-width apart"],
    angles: ["Hip: 90°–120°", "Knee: 85°–95°", "Ankle: 70°–80°"],
  },
  {
    id: "pushup", name: "Push-up", emoji: "💪", vibe: "chest day is best day 🔥",
    muscles: "Chest · Triceps · Core", difficulty: "Beginner", color: "#ff6b35",
    tips: ["Elbows at 45° no cap", "Core tight the whole time", "Full range or no gains", "Hands shoulder-width"],
    angles: ["Elbow: 90° at bottom", "Body line: 180°", "Wrist: neutral"],
  },
  {
    id: "lunge", name: "Lunge", emoji: "🏃", vibe: "leg day never skipped 💅",
    muscles: "Quads · Hamstrings · Glutes", difficulty: "Intermediate", color: "#a855f7",
    tips: ["Front knee over ankle pls", "Back knee near floor", "Torso upright king/queen", "Step far enough"],
    angles: ["Front knee: 90°", "Back knee: 90°", "Hip: 90°–110°"],
  },
  {
    id: "plank", name: "Plank", emoji: "🧱", vibe: "core so strong it's bussin 🫡",
    muscles: "Core · Shoulders · Back", difficulty: "Beginner", color: "#06b6d4",
    tips: ["Straight line head to heels", "Don't let hips sag bestie", "Engage that core fr", "Breathe steadily"],
    angles: ["Body line: 180°", "Shoulder: 90°", "Hold time based"],
  },
  {
    id: "jumping_jack", name: "Jumping Jack", emoji: "⭐", vibe: "cardio king energy ⚡",
    muscles: "Full Body · Cardio", difficulty: "Beginner", color: "#f59e0b",
    tips: ["Land softly no stomping", "Full arm extension slay", "Keep rhythm steady", "Core engaged always"],
    angles: ["Arms: 0°–180°", "Legs: together–apart", "Smooth transitions"],
  },
  {
    id: "situp", name: "Sit-up", emoji: "🔄", vibe: "abs check loading... 🫠",
    muscles: "Abs · Hip Flexors", difficulty: "Beginner", color: "#ef4444",
    tips: ["Don't pull your neck bro", "Controlled movement only", "Exhale on the way up", "Feet anchored down"],
    angles: ["Hip flexion: 40°–90°", "Spine curl: gradual", "Neck neutral"],
  },
];

const quickCommands = [
  { icon: "🔥", label: "Glow up plan", message: "Give me a 30-day full body glow up workout plan for a lean physique" },
  { icon: "🍗", label: "Protein meals", message: "Give me easy high protein meals I can meal prep this week" },
  { icon: "💪", label: "Form check", message: "How do I know if my squat and pushup form is correct? Give me cues" },
  { icon: "😴", label: "Recovery tips", message: "Best recovery routine after leg day? I'm so sore rn" },
  { icon: "🧠", label: "Motivation", message: "I'm losing motivation to work out. Give me a real talk pep talk" },
];

const AICoachPage = () => {
  const { user } = useAuth();
  const { totalReps, avgFormScore, longestStreak } = useUserStats();
  const [selectedExIdx, setSelectedExIdx] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1, role: "assistant",
      content: "yo what's good! 👋 I'm **JAX** — your AI fitness bestie 🔥\n\nI got you on **workouts, form tips, diet plans, recovery** — literally everything. no cap.\n\nPick an exercise above to see the 3D guide, or just ask me anything below! let's get these gains 💪",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedEx = exercises[selectedExIdx];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
        stream: true,
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
      setMessages((p) => [...p, { id: Date.now() + 1, role: "assistant", content: "⚠️ oops, connection error. try again bestie!" }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="relative flex flex-col h-screen pb-20">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 px-4 pt-5 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl gradient-purple flex items-center justify-center shadow-lg shadow-neon-purple/20">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground tracking-wide">JAX AI</h1>
              <p className="text-[10px] text-neon-green flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-neon-green inline-block animate-pulse" />
                your fitness bestie · always online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="glass-card px-2 py-1 rounded-lg flex items-center gap-1">
              <Trophy className="h-3 w-3 text-neon-orange" />
              <span className="text-[10px] font-bold text-foreground">{longestStreak}🔥</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3D Exercise Carousel */}
      <div className="relative z-10 px-4 mb-2">
        <div className="glass-card rounded-2xl overflow-hidden" style={{ border: `1px solid ${selectedEx.color}25` }}>
          {/* Exercise selector pills */}
          <div className="flex gap-1.5 px-3 pt-3 overflow-x-auto no-scrollbar">
            {exercises.map((ex, i) => (
              <button
                key={ex.id}
                onClick={() => setSelectedExIdx(i)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                  i === selectedExIdx
                    ? "text-background"
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                }`}
                style={i === selectedExIdx ? { background: ex.color } : {}}
              >
                {ex.emoji} {ex.name}
              </button>
            ))}
          </div>

          {/* 3D Model */}
          <div className="relative">
            <Suspense fallback={
              <div className="h-[180px] flex items-center justify-center">
                <span className="text-4xl animate-bounce">{selectedEx.emoji}</span>
              </div>
            }>
              <ExerciseModel exercise={selectedEx.id} accentColor={selectedEx.color} height="180px" />
            </Suspense>
            
            {/* Overlay info */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background/90 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">{selectedEx.emoji} {selectedEx.name}</p>
                  <p className="text-[10px] text-muted-foreground italic">{selectedEx.vibe}</p>
                </div>
                <button
                  onClick={() => setShowDetail(true)}
                  className="px-3 py-1.5 rounded-full text-[10px] font-bold text-background flex items-center gap-1"
                  style={{ background: selectedEx.color }}
                >
                  details <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Nav arrows */}
            <button
              onClick={() => setSelectedExIdx((i) => (i - 1 + exercises.length) % exercises.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full glass-card flex items-center justify-center"
            >
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <button
              onClick={() => setSelectedExIdx((i) => (i + 1) % exercises.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full glass-card flex items-center justify-center"
            >
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Exercise Detail Sheet */}
      <AnimatePresence>
        {showDetail && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 pt-5 pb-2">
              <button onClick={() => setShowDetail(false)} className="glass-card p-2 rounded-xl">
                <ChevronLeft className="h-5 w-5 text-foreground" />
              </button>
              <h2 className="font-display font-bold text-foreground text-sm">{selectedEx.emoji} {selectedEx.name} Guide</h2>
              <button onClick={() => setShowDetail(false)} className="glass-card p-2 rounded-xl">
                <X className="h-5 w-5 text-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-24">
              {/* Big 3D */}
              <div className="glass-card rounded-2xl overflow-hidden" style={{ border: `1px solid ${selectedEx.color}30` }}>
                <Suspense fallback={<div className="h-[260px] flex items-center justify-center text-4xl">{selectedEx.emoji}</div>}>
                  <ExerciseModel exercise={selectedEx.id} accentColor={selectedEx.color} height="260px" />
                </Suspense>
              </div>

              {/* Vibe */}
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">{selectedEx.name}</p>
                <p className="text-xs text-muted-foreground italic">{selectedEx.vibe}</p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="glass-card p-3 rounded-xl text-center">
                  <Target className="h-4 w-4 mx-auto mb-1" style={{ color: selectedEx.color }} />
                  <p className="text-[9px] text-muted-foreground">muscles</p>
                  <p className="text-[11px] font-bold text-foreground">{selectedEx.muscles.split("·")[0].trim()}</p>
                </div>
                <div className="glass-card p-3 rounded-xl text-center">
                  <Zap className="h-4 w-4 mx-auto mb-1" style={{ color: selectedEx.color }} />
                  <p className="text-[9px] text-muted-foreground">level</p>
                  <p className="text-[11px] font-bold text-foreground">{selectedEx.difficulty}</p>
                </div>
                <div className="glass-card p-3 rounded-xl text-center">
                  <Brain className="h-4 w-4 mx-auto mb-1" style={{ color: selectedEx.color }} />
                  <p className="text-[9px] text-muted-foreground">AI tracked</p>
                  <p className="text-[11px] font-bold text-neon-green">yes ✅</p>
                </div>
              </div>

              {/* Joint Angles */}
              <div className="glass-card p-4 rounded-xl">
                <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
                  🎯 Key Joint Angles
                </h3>
                {selectedEx.angles.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: selectedEx.color }} />
                    <span className="text-xs text-foreground/80">{a}</span>
                  </div>
                ))}
              </div>

              {/* Tips */}
              <div className="glass-card p-4 rounded-xl">
                <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
                  💡 Pro Tips (trust me bro)
                </h3>
                {selectedEx.tips.map((tip, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5">
                    <span className="text-xs" style={{ color: selectedEx.color }}>✓</span>
                    <span className="text-xs text-foreground/80">{tip}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowDetail(false)}
                className="w-full py-3 rounded-xl font-bold text-sm text-background neon-glow"
                style={{ background: selectedEx.color }}
              >
                🎯 got it, let's go!
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Section */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 space-y-2.5">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? "gradient-primary text-primary-foreground rounded-br-sm"
                  : "glass-card text-foreground rounded-bl-sm"
              }`}>
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs">🤖</span>
                    <span className="text-[10px] font-bold text-neon-purple">JAX</span>
                    <Sparkles className="h-2.5 w-2.5 text-neon-purple" />
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_strong]:text-neon-green [&_h3]:text-sm [&_h3]:font-bold [&_ul]:my-1 [&_li]:my-0 [&_em]:text-neon-orange/80">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="glass-card rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <span className="text-xs">🤖</span>
              <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
              <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" style={{ animationDelay: "0.15s" }} />
              <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" style={{ animationDelay: "0.3s" }} />
              <span className="text-[10px] text-muted-foreground ml-1">typing...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Commands */}
      <div className="relative z-10 px-4 py-1.5">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {quickCommands.map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => sendMessage(cmd.message)}
              disabled={isLoading}
              className="shrink-0 glass-card px-2.5 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-secondary/50 transition-colors disabled:opacity-50"
            >
              <span className="text-xs">{cmd.icon}</span>
              <span className="text-[10px] text-foreground whitespace-nowrap font-medium">{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="relative z-10 px-4 pb-2">
        <div className="glass-card flex items-center gap-2 px-3 py-2.5 rounded-2xl">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="ask me anything bestie... 💬"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center disabled:opacity-50 shadow-lg shadow-neon-green/20"
          >
            <Send className="h-4 w-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AICoachPage;

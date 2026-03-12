import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Wind, Sparkles, Brain, Send, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const moods = [
  { emoji: "😁", label: "Great", value: 5, color: "bg-primary/20 border-primary/30" },
  { emoji: "🙂", label: "Good", value: 4, color: "bg-accent/20 border-accent/30" },
  { emoji: "😐", label: "Okay", value: 3, color: "bg-secondary border-border" },
  { emoji: "😔", label: "Low", value: 2, color: "bg-destructive/10 border-destructive/20" },
  { emoji: "😫", label: "Terrible", value: 1, color: "bg-destructive/20 border-destructive/30" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

type WellnessMessage = { role: "user" | "assistant"; content: string };

const MentalWellnessPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check-in state
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState(5);
  const [sleepHours, setSleepHours] = useState(7);
  const [notes, setNotes] = useState("");

  // AI chat state
  const [messages, setMessages] = useState<WellnessMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // Breathing state
  const [breathPhase, setBreathPhase] = useState<"idle" | "inhale" | "hold" | "exhale">("idle");
  const [breathCount, setBreathCount] = useState(0);
  const [showBreathing, setShowBreathing] = useState(false);

  // Real-time stats
  const [weekMoods, setWeekMoods] = useState<{ date: string; mood: number; stress: number }[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Workout data for AI context
  const [workoutStats, setWorkoutStats] = useState({ totalWorkouts: 0, avgForm: 0, streak: 0 });

  // Load real-time stats
  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      setStatsLoading(true);
      const [{ data: streaks }, { data: sessions }] = await Promise.all([
        supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("workout_sessions").select("form_score, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);

      const avgForm = sessions && sessions.length > 0
        ? Math.round(sessions.reduce((s, r) => s + (r.form_score || 0), 0) / sessions.length) : 0;

      setWorkoutStats({
        totalWorkouts: streaks?.total_workouts || 0,
        avgForm,
        streak: streaks?.current_streak || 0,
      });
      setStatsLoading(false);
    };
    loadStats();
  }, [user]);

  // AI Insight on mood check-in
  const generateInsight = useCallback(async (mood: number) => {
    if (!user) return;
    setInsightLoading(true);
    try {
      const context = `User mood: ${mood}/5, Stress: ${stressLevel}/10, Sleep: ${sleepHours}h. Workouts: ${workoutStats.totalWorkouts}, Streak: ${workoutStats.streak} days, Avg form: ${workoutStats.avgForm}%. ${notes ? `Notes: ${notes}` : ""}`;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Based on this mental wellness check-in data, give me a brief personalized wellness recommendation (3-4 sentences max). Include one exercise tip and one mental wellness tip. Be warm and motivating. Data: ${context}` }],
        }),
      });

      if (!resp.ok) throw new Error("AI error");
      const data = await resp.json();
      setAiInsight(typeof data === "string" ? data : data.choices?.[0]?.message?.content || "Stay strong! 💪");
    } catch {
      setAiInsight("Keep going! Every check-in matters. Try a quick breathing exercise to center yourself. 🧘");
    } finally {
      setInsightLoading(false);
    }
  }, [user, stressLevel, sleepHours, workoutStats, notes]);

  const handleMoodSelect = (value: number) => {
    setSelectedMood(value);
    generateInsight(value);
  };

  // AI Chat
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: WellnessMessage = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "user", content: `Context: User mood ${selectedMood || "unknown"}/5, stress ${stressLevel}/10, sleep ${sleepHours}h. Focus on mental wellness, mindfulness, and recovery advice.` },
            ...allMessages,
          ],
          stream: true,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Stream failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsertAssistant(c);
          } catch { /* partial */ }
        }
      }
    } catch {
      upsertAssistant("I'm having trouble connecting. Try again in a moment 💙");
    }
    setIsLoading(false);
  };

  // Breathing
  const startBreathing = () => {
    setShowBreathing(true);
    setBreathPhase("inhale");
    setBreathCount(0);
    let phase = 0;
    const phases: ("inhale" | "hold" | "exhale")[] = ["inhale", "hold", "exhale"];
    let count = 0;
    const cycle = () => {
      setBreathPhase(phases[phase % 3]);
      if (phase % 3 === 0) { count++; setBreathCount(count); }
      phase++;
      if (count < 5) setTimeout(cycle, 4000);
      else setTimeout(() => { setShowBreathing(false); setBreathPhase("idle"); toast.success("Great session! 🧘"); }, 2000);
    };
    cycle();
  };

  const moodTrend = weekMoods.length >= 2
    ? weekMoods[weekMoods.length - 1]?.mood > weekMoods[0]?.mood ? "up" : weekMoods[weekMoods.length - 1]?.mood < weekMoods[0]?.mood ? "down" : "stable"
    : "stable";

  const quickPrompts = [
    "How can I reduce stress today?",
    "Give me a 5-min mindfulness exercise",
    "What foods help with anxiety?",
    "How does exercise improve mood?",
  ];

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      {/* Breathing Overlay */}
      <AnimatePresence>
        {showBreathing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center">
            <motion.div
              animate={{ scale: breathPhase === "inhale" ? 1.5 : breathPhase === "hold" ? 1.5 : 1 }}
              transition={{ duration: 4 }}
              className="w-32 h-32 rounded-full border-4 border-primary/50 flex items-center justify-center mb-8"
            >
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Wind className="h-8 w-8 text-primary" />
              </div>
            </motion.div>
            <p className="text-2xl font-display font-bold text-foreground mb-2 capitalize">{breathPhase}</p>
            <p className="text-sm text-muted-foreground">Breath {breathCount}/5</p>
            <button onClick={() => { setShowBreathing(false); setBreathPhase("idle"); }} className="mt-8 text-sm text-muted-foreground underline">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full glass-card flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> Mental Wellness
          </h1>
          <p className="text-xs text-muted-foreground">AI-powered mind & body balance</p>
        </div>
      </motion.div>

      {/* Real-time Stats Bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="relative z-10 glass-card p-3 mb-4 flex justify-between items-center">
        {[
          { label: "Streak", val: `${workoutStats.streak}d`, icon: "🔥" },
          { label: "Workouts", val: workoutStats.totalWorkouts, icon: "💪" },
          { label: "Avg Form", val: `${workoutStats.avgForm}%`, icon: "⚡" },
          { label: "Trend", val: moodTrend === "up" ? "↑" : moodTrend === "down" ? "↓" : "→", icon: moodTrend === "up" ? "📈" : moodTrend === "down" ? "📉" : "📊" },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <span className="text-sm">{s.icon}</span>
            <p className="text-sm font-bold text-foreground">{s.val}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Daily Check-in */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative z-10 glass-card p-5 mb-4">
        <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI Check-in
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Tap your mood — AI will analyze & recommend</p>

        <div className="flex justify-between mb-5">
          {moods.map(m => (
            <button key={m.value} onClick={() => handleMoodSelect(m.value)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all ${selectedMood === m.value ? `${m.color} scale-110 border` : "hover:bg-secondary"}`}>
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[10px] text-muted-foreground">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Stress & Sleep */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Stress: <span className="text-foreground font-bold">{stressLevel}/10</span></p>
            <input type="range" min={1} max={10} value={stressLevel} onChange={e => setStressLevel(+e.target.value)}
              className="w-full h-2 rounded-full bg-secondary appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Sleep: <span className="text-foreground font-bold">{sleepHours}h</span></p>
            <input type="range" min={2} max={12} step={0.5} value={sleepHours} onChange={e => setSleepHours(+e.target.value)}
              className="w-full h-2 rounded-full bg-secondary appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" />
          </div>
        </div>

        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How are you feeling? (optional)"
          className="w-full bg-secondary/50 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground border border-border/50 resize-none h-16 mb-3" />

        {/* AI Insight */}
        <AnimatePresence>
          {insightLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">AI analyzing your wellness data...</p>
            </motion.div>
          )}
          {aiInsight && !insightLoading && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-primary/5 rounded-xl border border-primary/20">
              <p className="text-[10px] font-bold text-primary mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> JAX's Wellness Insight</p>
              <div className="text-xs text-foreground/90 prose prose-sm max-w-none">
                <ReactMarkdown>{aiInsight}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10 grid grid-cols-2 gap-2 mb-4">
        <button onClick={startBreathing} className="glass-card p-4 flex items-center gap-2 text-left">
          <span className="text-xl">🫁</span>
          <div>
            <p className="text-xs font-bold text-foreground">Box Breathing</p>
            <p className="text-[9px] text-muted-foreground">4-4-4 calm focus</p>
          </div>
        </button>
        <button onClick={() => sendMessage("Guide me through a 2-minute body scan meditation right now")} className="glass-card p-4 flex items-center gap-2 text-left">
          <span className="text-xl">🧘</span>
          <div>
            <p className="text-xs font-bold text-foreground">Body Scan</p>
            <p className="text-[9px] text-muted-foreground">AI guided</p>
          </div>
        </button>
      </motion.div>

      {/* AI Wellness Chat */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 glass-card p-4 mb-4">
        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" /> AI Wellness Coach
        </h3>

        {/* Messages */}
        <div className="max-h-60 overflow-y-auto space-y-3 mb-3">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Ask me anything about mental wellness, stress management, or recovery 💙</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none text-xs"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                ) : msg.content}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {quickPrompts.map((p, i) => (
              <button key={i} onClick={() => sendMessage(p)} className="text-[10px] px-2.5 py-1.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask about wellness..."
            className="flex-1 bg-secondary/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground border border-border/50" />
          <button onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()}
            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MentalWellnessPage;

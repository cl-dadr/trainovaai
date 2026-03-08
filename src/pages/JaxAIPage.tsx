import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Sparkles, Dumbbell, Music, Flame, Droplets, Apple, User2, UserCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useUserStats";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

const quickCommands = [
  { icon: Dumbbell, label: "Pushup form tips", message: "How to do perfect pushups with correct elbow angle?" },
  { icon: Flame, label: "Workout plan", message: "Give me a daily calisthenics workout plan for a lean GenZ body" },
  { icon: Apple, label: "Diet plan", message: "Give me a high protein Indian diet plan for muscle building" },
  { icon: Droplets, label: "Recovery tips", message: "How to recover faster after an intense workout?" },
];


const JaxAIPage = () => {
  const { user } = useAuth();
  const { totalReps, avgFormScore, longestStreak } = useUserStats();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hey! I'm **JAX** 🔥 — your personal AI fitness coach.\n\nI cover **everything**: workouts, form correction, nutrition, diet plans, and recovery. Ask me anything and let's crush your goals! 💪",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      }),
    });

    if (!resp.ok || !resp.body) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to connect to AI coach");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id === -1) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { id: -1, role: "assistant", content: assistantSoFar }];
      });
    };

    let streamDone = false;
    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) upsertAssistant(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  }, [totalReps, avgFormScore, longestStreak]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat(newMessages);
    } catch (e) {
      console.error("AI Coach error:", e);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: "⚠️ Sorry, I'm having trouble connecting. Please try again in a moment!" },
      ]);
    }
    setIsLoading(false);
  };

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
            <h1 className="text-xl font-display font-bold text-foreground">JAX AI COACH</h1>
            <p className="text-xs text-neon-green flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-green inline-block animate-pulse-neon" />
              24/7 Fitness Guidance
            </p>
          </div>
        </div>
      </motion.div>

      {/* Chat Messages */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 space-y-3">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "gradient-primary text-primary-foreground rounded-br-md"
                  : "glass-card text-foreground rounded-bl-md"
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
                ) : (
                  msg.content
                )}
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

      {/* Quick Commands */}
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

      {/* Input Bar */}
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
    </div>
  );
};

export default JaxAIPage;

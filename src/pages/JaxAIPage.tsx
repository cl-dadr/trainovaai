import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Mic, Sparkles, Dumbbell, Music, Flame, Droplets, Clock } from "lucide-react";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const quickCommands = [
  { icon: Dumbbell, label: "Start workout", message: "Start workout" },
  { icon: Music, label: "Play gym music", message: "Play gym music" },
  { icon: Flame, label: "Show my streak", message: "Show my streak" },
  { icon: Droplets, label: "Water reminder", message: "Remind me to drink water" },
];

const smartReminders = [
  { icon: Droplets, text: "Drink water — you haven't logged in 2 hours", time: "2h ago" },
  { icon: Clock, text: "Time to move! You've been sitting for 1 hour", time: "45m ago" },
  { icon: Dumbbell, text: "You usually workout at 7pm. Ready?", time: "Just now" },
];

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content: "Hey Rookie! 💪 I'm JAX, your AI fitness coach. I can help you start workouts, play music, track your streak, and give personalized tips. What do you want to do?",
  },
];

const getJaxResponse = (input: string): string => {
  const lower = input.toLowerCase();
  if (lower.includes("start workout")) return "Let's crush it! 🔥 I recommend starting with pushups today. Head to the Camera tab and I'll count your reps and check your form in real-time. You're 3 reps away from your best record!";
  if (lower.includes("play") && lower.includes("music")) return "🎵 Firing up your workout playlist! I've selected high-BPM Phonk tracks to match your energy. Head to the Music tab — Beast Mode by GYM RAT is queued up first!";
  if (lower.includes("streak")) return "🔥 Your current streak is 3 days! Longest streak: 5 days. Keep it up — you're building a solid habit. One more day and you'll unlock the 'Consistent' badge!";
  if (lower.includes("water") || lower.includes("drink")) return "💧 Good call! I'll remind you every hour to hydrate. You've had 3/8 glasses today. Try to finish 2 more before your next workout for peak performance.";
  if (lower.includes("challenge") || lower.includes("10 rep")) return "⚡ 10 Rep Challenge accepted! Head to the Camera tab. I'll count every rep and grade your form. Your average accuracy is 87% — let's beat that!";
  if (lower.includes("tip") || lower.includes("suggest")) return "💡 Based on your history: You perform best in evening workouts (7-8pm). Your pushup form improved 12% this week. Try adding 5 squats between sets for a full-body burn!";
  if (lower.includes("progress") || lower.includes("report")) return "📊 This week: 271 total reps (+18% from last week), 6 active days, 87% avg accuracy. You're on track to hit Level 2 by next week! Check the Reports tab for detailed charts.";
  return "I'm here to help! You can ask me to start a workout, play music, show your streak, or give you personalized tips. Try saying 'Give me a tip' or 'Start a 10 rep challenge'! 💪";
};

const JaxAIPage = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getJaxResponse(text);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: response }]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  };

  return (
    <div className="relative flex flex-col h-screen pb-20">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center gap-3 px-4 pt-6 pb-4"
      >
        <div className="h-10 w-10 rounded-xl gradient-purple flex items-center justify-center">
          <Bot className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">JAX AI</h1>
          <p className="text-xs text-neon-green flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-green inline-block animate-pulse-neon" />
            Online — Your fitness coach
          </p>
        </div>
      </motion.div>

      {/* Smart Reminders */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 px-4 mb-3"
      >
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {smartReminders.map((r, i) => (
            <div key={i} className="shrink-0 glass-card px-3 py-2 flex items-center gap-2 max-w-[200px]">
              <r.icon className="h-3 w-3 text-neon-cyan shrink-0" />
              <p className="text-[10px] text-muted-foreground truncate">{r.text}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Chat Messages */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 space-y-3">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "gradient-primary text-primary-foreground rounded-br-md"
                    : "glass-card text-foreground rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="h-3 w-3 text-neon-purple" />
                    <span className="text-[10px] font-bold text-neon-purple">JAX</span>
                  </div>
                )}
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
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
            <button
              key={cmd.label}
              onClick={() => sendMessage(cmd.message)}
              className="shrink-0 glass-card px-3 py-2 flex items-center gap-2 hover:bg-secondary/50 transition-colors"
            >
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
            placeholder="Ask JAX anything..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
            <Mic className="h-4 w-4 text-neon-purple" />
          </button>
          <button
            onClick={() => sendMessage(input)}
            className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center"
          >
            <Send className="h-4 w-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default JaxAIPage;

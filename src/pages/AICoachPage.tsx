import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Sparkles, Trophy, Play,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useUserStats";
import { searchYouTube, YouTubeVideo } from "@/lib/youtubeService";

type Message = { id: number; role: "user" | "assistant"; content: string; videos?: YouTubeVideo[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

const quickCommands = [
  { icon: "🔥", label: "Glow up plan", message: "Give me a 30-day full body glow up workout plan with video suggestions" },
  { icon: "🍗", label: "Protein meals", message: "Give me easy high protein meals I can meal prep this week" },
  { icon: "💪", label: "Form check", message: "How do I do proper squats and pushups? Show me tutorial videos" },
  { icon: "🏋️", label: "Workout video", message: "Suggest me a good full body workout video I can follow along right now" },
  { icon: "😴", label: "Recovery", message: "Best recovery routine after leg day with stretching videos" },
  { icon: "🧠", label: "Motivation", message: "I'm losing motivation to work out. Give me a real talk pep talk" },
];

// Keywords that should trigger video suggestions
const VIDEO_KEYWORDS = ["workout", "exercise", "form", "how to", "tutorial", "video", "stretch", "yoga", "warm up", "cool down", "cardio", "hiit", "abs", "chest", "leg", "arm", "back", "shoulder", "squat", "pushup", "plank", "lunge", "deadlift", "bench press"];

function shouldSuggestVideos(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kw of VIDEO_KEYWORDS) {
    if (lower.includes(kw)) {
      // Extract a search query from the message
      const parts = lower.split(/[.!?]/);
      const relevant = parts.find(p => p.includes(kw)) || lower;
      return relevant.trim().slice(0, 60) + " workout tutorial";
    }
  }
  return null;
}

const VideoCard = ({ video }: { video: YouTubeVideo }) => (
  <a
    href={`https://www.youtube.com/watch?v=${video.id}`}
    target="_blank"
    rel="noopener noreferrer"
    className="shrink-0 w-52 glass-card rounded-xl overflow-hidden hover:scale-[1.02] transition-transform group"
  >
    <div className="relative">
      <img src={video.thumbnail} alt={video.title} className="w-full h-28 object-cover" />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <div className="h-10 w-10 rounded-full bg-neon-green/90 flex items-center justify-center shadow-lg">
          <Play className="h-5 w-5 text-background fill-current" />
        </div>
      </div>
      <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-1.5 py-0.5 rounded font-mono">
        {video.duration}
      </span>
    </div>
    <div className="p-2">
      <p className="text-[11px] font-bold text-foreground line-clamp-2 leading-tight">{video.title}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{video.author}</p>
    </div>
  </a>
);

const AICoachPage = () => {
  const { user } = useAuth();
  const { totalReps, avgFormScore, longestStreak } = useUserStats();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1, role: "assistant",
      content: "yo what's good! 👋 I'm **JAX** — your AI fitness bestie 🔥\n\nI got you on **workouts, form tips, diet plans, recovery** — literally everything. no cap.\n\nAsk me anything and I'll even pull up **tutorial videos** for you! 🎥💪",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const streamChat = useCallback(async (allMessages: Message[]): Promise<string> => {
    const contextMsg = `User stats: ${totalReps} total reps, ${avgFormScore}% avg form, ${longestStreak} day best streak. IMPORTANT: When the user asks about exercises or workouts, mention that you're pulling up some tutorial videos for them.`;
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
    return assistantSoFar;
  }, [totalReps, avgFormScore, longestStreak]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: text.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);

    try {
      // Start AI response and video search in parallel
      const videoQuery = shouldSuggestVideos(text);
      const [aiContent, videos] = await Promise.all([
        streamChat(newMsgs),
        videoQuery ? searchYouTube(videoQuery).catch(() => [] as YouTubeVideo[]) : Promise.resolve([] as YouTubeVideo[]),
      ]);

      // Attach videos to the assistant message
      if (videos.length > 0) {
        setMessages((prev) => {
          const lastIdx = prev.length - 1;
          if (prev[lastIdx]?.role === "assistant") {
            return prev.map((m, i) => i === lastIdx ? { ...m, id: Date.now(), videos: videos.slice(0, 6) } : m);
          }
          return prev;
        });
      } else {
        // Finalize the message id
        setMessages((prev) => prev.map((m) => m.id === -1 ? { ...m, id: Date.now() } : m));
      }
    } catch {
      setMessages((p) => [...p, { id: Date.now() + 1, role: "assistant", content: "⚠️ oops, connection error. try again bestie!" }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="relative flex flex-col h-screen pb-20">
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 px-4 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-11 w-11 rounded-2xl gradient-purple flex items-center justify-center shadow-lg shadow-neon-purple/20">
              <span className="text-xl">🤖</span>
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
            <div className="glass-card px-2.5 py-1.5 rounded-lg flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-neon-orange" />
              <span className="text-[11px] font-bold text-foreground">{longestStreak}🔥</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Chat Section */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 space-y-3">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[88%] ${msg.role === "user" ? "" : "w-full"}`}>
                <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${
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

                {/* Video suggestions inline */}
                {msg.videos && msg.videos.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-bold text-neon-green mb-1.5 flex items-center gap-1">
                      🎥 Tutorial Videos
                    </p>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {msg.videos.map((v) => (
                        <VideoCard key={v.id} video={v} />
                      ))}
                    </div>
                  </div>
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

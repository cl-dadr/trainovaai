import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Plus, Trophy, Users, Timer, Zap, Target, Search, UserPlus, Check, X, Crown, Flame, Medal, ChevronRight, Dumbbell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useBattles, BattleWithParticipants } from "@/hooks/useBattles";
import { useFriends, FriendProfile } from "@/hooks/useFriends";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuth } from "@/contexts/AuthContext";

const EXERCISE_TYPES = [
  { value: "pushup", label: "Push-ups", icon: "💪" },
  { value: "squat", label: "Squats", icon: "🦵" },
  { value: "plank", label: "Plank Hold", icon: "🧘" },
  { value: "jumping_jack", label: "Jumping Jacks", icon: "⭐" },
  { value: "lunge", label: "Lunges", icon: "🏃" },
  { value: "situp", label: "Sit-ups", icon: "🔥" },
];

const DURATIONS = [
  { value: 60, label: "1 min" },
  { value: 180, label: "3 min" },
  { value: 300, label: "5 min" },
  { value: 600, label: "10 min" },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function BattleCard({ battle, userId, onJoin, onStart }: {
  battle: BattleWithParticipants;
  userId: string;
  onJoin: () => void;
  onStart: () => void;
}) {
  const isCreator = battle.creator_id === userId;
  const hasJoined = battle.participants.some(p => p.user_id === userId);
  const participantCount = battle.participants.length;
  const exercise = EXERCISE_TYPES.find(e => e.value === battle.exercise_type);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (battle.status !== "active" || !battle.ends_at) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(battle.ends_at!).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [battle.status, battle.ends_at]);

  const statusColor = battle.status === "active" ? "text-green-400" : battle.status === "completed" ? "text-yellow-400" : "text-muted-foreground";
  const statusBg = battle.status === "active" ? "bg-green-500/20 border-green-500/30" : battle.status === "completed" ? "bg-yellow-500/20 border-yellow-500/30" : "bg-secondary/50 border-border/30";

  // Sort participants by score for leaderboard
  const sortedParticipants = [...battle.participants].sort((a, b) => b.score - a.score);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`border ${statusBg} bg-card/60 backdrop-blur-sm overflow-hidden`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{exercise?.icon || "💪"}</span>
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">{battle.title}</h3>
                <p className="text-xs text-muted-foreground">{exercise?.label} • {formatTime(battle.duration_seconds)}</p>
              </div>
            </div>
            <Badge variant="outline" className={statusColor}>
              {battle.status === "active" && timeLeft !== null ? formatTime(timeLeft) : battle.status.toUpperCase()}
            </Badge>
          </div>

          {/* Participants */}
          <div className="space-y-1.5">
            {sortedParticipants.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {i === 0 && battle.status === "completed" && <Crown className="h-3 w-3 text-yellow-400" />}
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[8px] bg-secondary">
                      {(p.profile?.display_name || "?")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`${p.user_id === userId ? "text-primary font-semibold" : "text-foreground"}`}>
                    {p.profile?.display_name || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{p.reps} reps</span>
                  <span className="font-display text-primary font-bold">{p.score} pts</span>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {battle.status === "pending" && !hasJoined && (
              <Button size="sm" onClick={onJoin} className="flex-1 h-8 text-xs">
                <Swords className="h-3 w-3 mr-1" /> Accept Challenge
              </Button>
            )}
            {battle.status === "pending" && isCreator && participantCount >= 2 && (
              <Button size="sm" onClick={onStart} className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white">
                <Zap className="h-3 w-3 mr-1" /> Start Battle
              </Button>
            )}
            {battle.status === "active" && hasJoined && (
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-primary/50 text-primary" onClick={() => window.location.href = `/camera?battle=${battle.id}`}>
                <Target className="h-3 w-3 mr-1" /> Go to Workout
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CreateBattleDialog({ onCreated }: { onCreated: () => void }) {
  const { createBattle } = useBattles();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [exerciseType, setExerciseType] = useState("pushup");
  const [duration, setDuration] = useState(180);
  const [isCommunity, setIsCommunity] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createBattle({
      title,
      type: "rep_battle",
      exercise_type: exerciseType,
      duration_seconds: duration,
      is_community: isCommunity,
    });
    setTitle("");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full h-12 font-display text-sm">
          <Plus className="h-4 w-4 mr-2" /> Create Battle
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/30 max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-primary flex items-center gap-2">
            <Swords className="h-5 w-5" /> New Battle
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Battle title..." value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary/50 border-border/30" />

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Exercise</label>
            <div className="grid grid-cols-3 gap-2">
              {EXERCISE_TYPES.map(e => (
                <button key={e.value} onClick={() => setExerciseType(e.value)}
                  className={`p-2 rounded-lg border text-center text-xs transition-colors ${exerciseType === e.value ? "border-primary bg-primary/10 text-primary" : "border-border/30 bg-secondary/30 text-muted-foreground"}`}>
                  <span className="block text-lg">{e.icon}</span>
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map(d => (
                <button key={d.value} onClick={() => setDuration(d.value)}
                  className={`p-2 rounded-lg border text-xs transition-colors ${duration === d.value ? "border-primary bg-primary/10 text-primary" : "border-border/30 bg-secondary/30 text-muted-foreground"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={isCommunity} onChange={e => setIsCommunity(e.target.checked)} className="accent-primary" />
            Community Challenge (open to all)
          </label>

          <Button onClick={handleCreate} disabled={!title.trim()} className="w-full h-10 font-display">
            <Swords className="h-4 w-4 mr-2" /> Create Battle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FriendsPanel() {
  const { friends, pendingRequests, searchUsers, sendRequest, acceptRequest, declineRequest } = useFriends();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendProfile[]>([]);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length >= 2) {
      const r = await searchUsers(q);
      setResults(r);
    } else setResults([]);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by username..." value={query} onChange={e => handleSearch(e.target.value)} className="pl-9 bg-secondary/50 border-border/30" />
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Search Results</h4>
          {results.map(r => (
            <div key={r.user_id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">{(r.display_name || "?")[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{r.display_name}</p>
                  {r.username && <p className="text-xs text-muted-foreground">@{r.username}</p>}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => sendRequest(r.user_id)} className="h-7 text-xs text-primary">
                <UserPlus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-yellow-400">Pending Requests</h4>
          {pendingRequests.map(f => (
            <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-yellow-500/20 text-yellow-400 text-xs">{(f.profile.display_name || "?")[0]}</AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium text-foreground">{f.profile.display_name}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => acceptRequest(f.id)} className="h-7 w-7 p-0 text-green-400"><Check className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => declineRequest(f.id)} className="h-7 w-7 p-0 text-destructive"><X className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground">Friends ({friends.length})</h4>
        {friends.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No friends yet. Search by username to add!</p>}
        {friends.map(f => (
          <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">{(f.profile.display_name || "?")[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{f.profile.display_name}</p>
                {f.profile.username && <p className="text-xs text-muted-foreground">@{f.profile.username}</p>}
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">{f.profile.fitness_level}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardPanel() {
  const { friends } = useFriends();
  const [tab, setTab] = useState<"global" | "friends">("global");
  const friendIds = friends.map(f => f.profile.user_id);
  const { entries, loading } = useLeaderboard(tab, friendIds);
  const { user } = useAuth();

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant={tab === "global" ? "default" : "outline"} onClick={() => setTab("global")} className="flex-1 h-8 text-xs">
          <Trophy className="h-3 w-3 mr-1" /> Global
        </Button>
        <Button size="sm" variant={tab === "friends" ? "default" : "outline"} onClick={() => setTab("friends")} className="flex-1 h-8 text-xs">
          <Users className="h-3 w-3 mr-1" /> Friends
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => {
            const isMe = e.user_id === user?.id;
            const rankIcon = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
            return (
              <motion.div key={e.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div className={`flex items-center justify-between p-3 rounded-lg border ${isMe ? "border-primary/30 bg-primary/5" : "border-border/20 bg-secondary/20"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center">{typeof rankIcon === "string" && rankIcon.startsWith("#") ? <span className="text-xs text-muted-foreground font-display">{rankIcon}</span> : rankIcon}</span>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={`text-xs ${isMe ? "bg-primary/20 text-primary" : "bg-secondary"}`}>
                        {(e.display_name || "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={`text-sm font-medium ${isMe ? "text-primary" : "text-foreground"}`}>{e.display_name || "Unknown"}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span><Flame className="h-2.5 w-2.5 inline text-orange-400" /> {e.current_streak}</span>
                        <span><Swords className="h-2.5 w-2.5 inline text-red-400" /> {e.battles_won}W</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-primary font-bold text-sm">{e.total_xp.toLocaleString()} XP</p>
                    <p className="text-[10px] text-muted-foreground">{e.total_reps} reps</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BattleArenaPage() {
  const { user } = useAuth();
  const { myBattles, openBattles, activeBattles, loading, joinBattle, startBattle, refetch } = useBattles();

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4 relative">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-40 right-0 w-48 h-48 bg-primary/6 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Swords className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Battle Arena</h1>
              <p className="text-xs text-muted-foreground">Challenge friends to fitness battles</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="battles" className="w-full">
          <TabsList className="w-full bg-secondary/50 border border-border/20">
            <TabsTrigger value="battles" className="flex-1 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Swords className="h-3 w-3 mr-1" /> Battles
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Trophy className="h-3 w-3 mr-1" /> Ranks
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex-1 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Users className="h-3 w-3 mr-1" /> Friends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="battles" className="space-y-4 mt-4">
            <CreateBattleDialog onCreated={refetch} />

            {/* Active battles */}
            {activeBattles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-green-400 flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE BATTLES
                </h3>
                {activeBattles.map(b => (
                  <BattleCard key={b.id} battle={b} userId={user!.id} onJoin={() => joinBattle(b.id)} onStart={() => startBattle(b.id)} />
                ))}
              </div>
            )}

            {/* Open challenges */}
            {openBattles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">OPEN CHALLENGES</h3>
                {openBattles.map(b => (
                  <BattleCard key={b.id} battle={b} userId={user!.id} onJoin={() => joinBattle(b.id)} onStart={() => startBattle(b.id)} />
                ))}
              </div>
            )}

            {/* My battles */}
            {myBattles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">MY BATTLES</h3>
                {myBattles.map(b => (
                  <BattleCard key={b.id} battle={b} userId={user!.id} onJoin={() => joinBattle(b.id)} onStart={() => startBattle(b.id)} />
                ))}
              </div>
            )}

            {!loading && myBattles.length === 0 && openBattles.length === 0 && activeBattles.length === 0 && (
              <div className="text-center py-12">
                <Swords className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No battles yet</p>
                <p className="text-xs text-muted-foreground">Create one to challenge your friends!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-4">
            <LeaderboardPanel />
          </TabsContent>

          <TabsContent value="friends" className="mt-4">
            <FriendsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

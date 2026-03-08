import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Music, Play, Pause, Heart, Loader2, Youtube, ChevronRight, Shuffle, SkipBack, SkipForward, Repeat, ChevronDown, MoreHorizontal, X, ListMusic, Flame, Zap, Dumbbell, Wind } from "lucide-react";
import { searchYouTube, type YouTubeVideo } from "@/lib/youtubeService";

const categories = [
  { name: "All", icon: Flame },
  { name: "Workout", icon: Dumbbell },
  { name: "Phonk", icon: Zap },
  { name: "Funk", icon: Music },
  { name: "Running", icon: Wind },
  { name: "High Energy", icon: Flame },
  { name: "Chill", icon: Wind },
  { name: "EDM", icon: Zap },
  { name: "Hardstyle", icon: Flame },
  { name: "Trap", icon: Zap },
  { name: "Hip Hop", icon: Music },
  { name: "Rock", icon: Flame },
];

// Curated playlists
const playlists = [
  { id: "gym-beast", name: "Gym Beast Mode", emoji: "💪", category: "Workout", color: "from-red-500/30 to-orange-500/30" },
  { id: "phonk-drift", name: "Phonk & Drift", emoji: "🏎️", category: "Phonk", color: "from-purple-500/30 to-pink-500/30" },
  { id: "funk-groove", name: "Funk & Groove", emoji: "🕺", category: "Funk", color: "from-yellow-500/30 to-green-500/30" },
  { id: "cardio-run", name: "Cardio Runner", emoji: "🏃", category: "Running", color: "from-blue-500/30 to-cyan-500/30" },
  { id: "chill-recovery", name: "Chill Recovery", emoji: "🧘", category: "Chill", color: "from-teal-500/30 to-emerald-500/30" },
  { id: "edm-drop", name: "EDM Drops", emoji: "🎧", category: "EDM", color: "from-violet-500/30 to-indigo-500/30" },
];

// Favorite artists for gym
const favoriteArtists = [
  { name: "NCS", image: "https://i.ytimg.com/vi/X4C1Dp_ToS0/mqdefault.jpg", query: "NCS gym workout mix" },
  { name: "Phonk Rival", image: "https://i.ytimg.com/vi/mg74FZwG8uo/mqdefault.jpg", query: "Phonk Rival gym phonk" },
  { name: "Power Music", image: "https://i.ytimg.com/vi/eqYi3RXiB90/mqdefault.jpg", query: "Power Music workout" },
  { name: "Gym Hits", image: "https://i.ytimg.com/vi/pvH7jjWOnTw/mqdefault.jpg", query: "gym hits motivational" },
  { name: "Lofi Station", image: "https://i.ytimg.com/vi/BsMbBVZYAi4/mqdefault.jpg", query: "lofi hip hop chill beats" },
  { name: "EDM Nation", image: "https://i.ytimg.com/vi/XRtXayAiluw/mqdefault.jpg", query: "EDM Nation festival mix" },
];

const MusicPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [ytVideos, setYtVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [liked, setLiked] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("yt_liked") || "[]")); } catch { return new Set(); }
  });
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState("");
  const [activeVideoAuthor, setActiveVideoAuthor] = useState("");
  const [activeVideoThumb, setActiveVideoThumb] = useState("");
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState<YouTubeVideo[]>(() => {
    try { return JSON.parse(localStorage.getItem("yt_recent") || "[]"); } catch { return []; }
  });
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const loadCategory = useCallback(async (cat: string) => {
    setLoading(true);
    const query = cat === "All" ? "gym workout music mix 2025" : `${cat} gym workout music`;
    const results = await searchYouTube(query, cat === "All" ? "Workout" : cat);
    setYtVideos(results);
    setLoading(false);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const results = await searchYouTube(searchQuery, activeCategory === "All" ? "Workout" : activeCategory);
    setYtVideos(results);
    setLoading(false);
  }, [searchQuery, activeCategory]);

  const handleArtistClick = useCallback(async (artist: typeof favoriteArtists[0]) => {
    setLoading(true);
    setSearchQuery(artist.name);
    const results = await searchYouTube(artist.query, "Workout");
    setYtVideos(results);
    setLoading(false);
  }, []);

  const handlePlaylistClick = useCallback(async (playlist: typeof playlists[0]) => {
    setActivePlaylist(playlist.id);
    setActiveCategory(playlist.category);
    setLoading(true);
    const results = await searchYouTube(`${playlist.name} music mix`, playlist.category);
    setYtVideos(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategory(activeCategory);
  }, [activeCategory, loadCategory]);

  // Persist likes & recent
  useEffect(() => { localStorage.setItem("yt_liked", JSON.stringify([...liked])); }, [liked]);
  useEffect(() => { localStorage.setItem("yt_recent", JSON.stringify(recentlyPlayed)); }, [recentlyPlayed]);

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleYtPlay = (video: YouTubeVideo) => {
    setActiveVideoId(video.id);
    setActiveVideoTitle(video.title);
    setActiveVideoAuthor(video.author);
    setActiveVideoThumb(video.thumbnail);
    setShowNowPlaying(true);
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(v => v.id !== video.id);
      return [video, ...filtered].slice(0, 15);
    });
  };

  const likedVideos = ytVideos.filter(v => liked.has(v.id));

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      {/* Full-screen Now Playing */}
      <AnimatePresence>
        {showNowPlaying && activeVideoId && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
            style={{ background: "linear-gradient(180deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--background)) 25%)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-12 pb-4">
              <button onClick={() => setShowNowPlaying(false)} className="p-2 rounded-full hover:bg-secondary/50">
                <ChevronDown className="h-5 w-5 text-foreground" />
              </button>
              <p className="text-sm font-bold text-foreground tracking-wide">Now Playing</p>
              <button onClick={() => toggleLike(activeVideoId)} className="p-2 rounded-full hover:bg-secondary/50">
                <Heart className={`h-5 w-5 ${liked.has(activeVideoId) ? "text-destructive fill-current" : "text-muted-foreground"}`} />
              </button>
            </div>

            {/* YouTube Embed */}
            <div className="px-5 mb-4">
              <div className="rounded-2xl overflow-hidden aspect-video border border-border/20" style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.15)" }}>
                <iframe
                  key={activeVideoId}
                  src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full border-0"
                />
              </div>
            </div>

            {/* Track Info */}
            <div className="px-5">
              <h2 className="text-base font-bold text-foreground line-clamp-2">{activeVideoTitle}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <Youtube className="h-3.5 w-3.5 text-destructive" />
                <p className="text-sm text-muted-foreground">{activeVideoAuthor}</p>
              </div>
            </div>

            {/* Waveform */}
            <div className="px-5 mt-4">
              <div className="flex items-end gap-[1.5px] h-8 justify-center">
                {Array.from({ length: 50 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-[2px] rounded-full bg-primary"
                    animate={{ height: [4, 8 + Math.random() * 24, 4] }}
                    transition={{ repeat: Infinity, duration: 0.4 + Math.random() * 0.5, delay: i * 0.015, ease: "easeInOut" }}
                  />
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-8 mt-6 px-5">
              <button className="p-2 text-muted-foreground hover:text-foreground"><Shuffle className="h-5 w-5" /></button>
              <button className="p-2 text-foreground" onClick={() => {
                const idx = ytVideos.findIndex(v => v.id === activeVideoId);
                if (idx > 0) handleYtPlay(ytVideos[idx - 1]);
              }}><SkipBack className="h-6 w-6" /></button>
              <button className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center neon-glow shadow-lg">
                <Play className="h-7 w-7 text-primary-foreground ml-1" />
              </button>
              <button className="p-2 text-foreground" onClick={() => {
                const idx = ytVideos.findIndex(v => v.id === activeVideoId);
                if (idx >= 0 && idx < ytVideos.length - 1) handleYtPlay(ytVideos[idx + 1]);
              }}><SkipForward className="h-6 w-6" /></button>
              <button className="p-2 text-muted-foreground hover:text-foreground"><Repeat className="h-5 w-5" /></button>
            </div>

            {/* Up Next */}
            <div className="px-5 mt-8 pb-8">
              <h3 className="text-sm font-bold text-foreground mb-3">Up Next</h3>
              <div className="space-y-1">
                {ytVideos.filter(v => v.id !== activeVideoId).slice(0, 5).map((video) => (
                  <motion.div key={video.id} whileTap={{ scale: 0.97 }} onClick={() => handleYtPlay(video)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/30 cursor-pointer">
                    <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0">
                      <img src={video.thumbnail} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{video.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{video.author}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{video.duration}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-destructive/20 flex items-center justify-center">
            <Youtube className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">GYM BEATS</h1>
            <p className="text-[10px] text-muted-foreground">YouTube workout music 🔥</p>
          </div>
        </div>
        <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-xl glass-card">
          <Search className="h-4 w-4 text-muted-foreground" />
        </button>
      </motion.div>

      {/* Search */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="relative z-10 mb-4 overflow-hidden">
            <div className="glass-card flex items-center gap-3 px-4 py-3 rounded-xl">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search gym songs, artists..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); loadCategory(activeCategory); }} className="p-1">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              <button onClick={handleSearch} className="gradient-primary px-3 py-1.5 rounded-lg text-xs font-bold text-primary-foreground">GO</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="relative z-10 flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => { setActiveCategory(cat.name); setActivePlaylist(null); setSearchQuery(""); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeCategory === cat.name ? "gradient-primary text-primary-foreground neon-glow" : "glass-card text-muted-foreground"
            }`}
          >
            <cat.icon className="h-3 w-3" />
            {cat.name}
          </button>
        ))}
      </motion.div>

      {/* Playlists */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ListMusic className="h-4 w-4 text-primary" /> Gym Playlists
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {playlists.map((pl) => (
            <motion.div
              key={pl.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePlaylistClick(pl)}
              className={`shrink-0 w-32 p-3 rounded-2xl cursor-pointer border transition-all ${
                activePlaylist === pl.id ? "border-primary/40 neon-glow" : "border-border/10"
              } glass-card`}
            >
              <div className={`h-16 w-full rounded-xl bg-gradient-to-br ${pl.color} flex items-center justify-center mb-2`}>
                <span className="text-2xl">{pl.emoji}</span>
              </div>
              <p className="text-[11px] font-bold text-foreground line-clamp-1">{pl.name}</p>
              <p className="text-[9px] text-muted-foreground">{pl.category}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Favorite Artists */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Heart className="h-4 w-4 text-destructive" /> Favorite Artists
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {favoriteArtists.map((artist) => (
            <motion.div
              key={artist.name}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleArtistClick(artist)}
              className="shrink-0 w-20 cursor-pointer flex flex-col items-center"
            >
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary/20 mb-1.5">
                <img src={artist.image} alt={artist.name} className="h-full w-full object-cover" />
              </div>
              <p className="text-[10px] font-semibold text-foreground text-center line-clamp-1">{artist.name}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Recently Played</h2>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {recentlyPlayed.slice(0, 8).map((video) => (
              <motion.div
                key={video.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleYtPlay(video)}
                className="shrink-0 w-28 cursor-pointer"
              >
                <div className="h-20 w-28 rounded-xl overflow-hidden mb-1.5 border border-border/20 relative">
                  <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
                  <div className="absolute bottom-1 right-1 bg-background/80 px-1 py-0.5 rounded text-[8px] font-bold text-foreground">{video.duration}</div>
                  <div className="absolute inset-0 bg-background/0 hover:bg-background/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="h-5 w-5 text-foreground" />
                  </div>
                </div>
                <p className="text-[10px] font-semibold text-foreground line-clamp-1">{video.title}</p>
                <p className="text-[9px] text-muted-foreground truncate">{video.author}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Liked Songs */}
      {likedVideos.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 text-destructive fill-current" /> Liked Songs
            </h2>
            <span className="text-[10px] text-muted-foreground">{likedVideos.length}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {likedVideos.slice(0, 6).map((video) => (
              <motion.div key={video.id} whileTap={{ scale: 0.95 }} onClick={() => handleYtPlay(video)} className="shrink-0 w-24 cursor-pointer">
                <div className="h-24 w-24 rounded-xl overflow-hidden mb-1.5 border border-destructive/20">
                  <img src={video.thumbnail} alt="" className="h-full w-full object-cover" />
                </div>
                <p className="text-[10px] font-semibold text-foreground line-clamp-1">{video.title}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="relative z-10 flex items-center justify-center py-12">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
          <span className="ml-3 text-sm text-muted-foreground">Finding tracks...</span>
        </div>
      )}

      {/* Track List */}
      {!loading && (
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">
              {searchQuery ? `Results for "${searchQuery}"` : activePlaylist ? playlists.find(p => p.id === activePlaylist)?.name : `${activeCategory} Tracks`}
            </h2>
            <span className="text-[10px] text-muted-foreground">{ytVideos.length} tracks</span>
          </div>

          <div className="space-y-1">
            {ytVideos.map((video, i) => {
              const isActive = activeVideoId === video.id;
              const isLiked = liked.has(video.id);
              return (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(0.03 * i, 0.3) }}
                  onClick={() => handleYtPlay(video)}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer ${
                    isActive ? "glass-card border border-primary/20" : "hover:bg-secondary/30"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-border/10">
                    <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
                    {isActive && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="flex items-end gap-[2px] h-4">
                          {[1,2,3].map(j => (
                            <motion.div key={j} className="w-[2px] bg-primary rounded-full"
                              animate={{ height: [4, 12, 4] }}
                              transition={{ repeat: Infinity, duration: 0.6, delay: j * 0.15 }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>{video.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{video.author}</p>
                  </div>

                  {/* Like */}
                  <button onClick={(e) => { e.stopPropagation(); toggleLike(video.id); }} className="shrink-0 p-1">
                    <Heart className={`h-3.5 w-3.5 transition-colors ${isLiked ? "text-destructive fill-current" : "text-muted-foreground"}`} />
                  </button>

                  {/* Duration & Play */}
                  <span className="text-[10px] text-muted-foreground shrink-0">{video.duration}</span>
                  <button className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                    isActive ? "gradient-primary neon-glow" : "bg-primary/10"
                  }`}>
                    <Play className={`h-3.5 w-3.5 ml-0.5 ${isActive ? "text-primary-foreground" : "text-primary"}`} />
                  </button>
                </motion.div>
              );
            })}
          </div>

          {ytVideos.length === 0 && (
            <div className="text-center py-12">
              <Youtube className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No tracks found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try a different category or search</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom Mini Player */}
      <AnimatePresence>
        {activeVideoId && !showNowPlaying && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-16 left-0 right-0 z-40 px-3"
          >
            <div
              className="max-w-md mx-auto glass-card p-3 rounded-2xl border border-primary/20 cursor-pointer"
              style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.15)" }}
              onClick={() => setShowNowPlaying(true)}
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl overflow-hidden shrink-0 border border-border/10">
                  <img src={activeVideoThumb} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{activeVideoTitle}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{activeVideoAuthor}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleLike(activeVideoId); }} className="p-1">
                  <Heart className={`h-3.5 w-3.5 ${liked.has(activeVideoId) ? "text-destructive fill-current" : "text-muted-foreground"}`} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShowNowPlaying(true); }}
                  className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center neon-glow">
                  <Play className="h-3.5 w-3.5 text-primary-foreground ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MusicPage;

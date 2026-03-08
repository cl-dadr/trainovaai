import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Music, Play, Pause, Heart, Loader2, Youtube, Headphones, ChevronRight, Shuffle, SkipBack, SkipForward, Repeat, ChevronDown, MoreHorizontal, X } from "lucide-react";
import { searchTracks, getTracksForCategory, type Track } from "@/lib/musicService";
import { searchYouTube, type YouTubeVideo } from "@/lib/youtubeService";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

const categories = ["Workout", "Phonk", "Running", "High Energy", "Chill", "Hardstyle", "Trap", "EDM"];

function formatTime(sec: number): string {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const MusicPage = () => {
  const [activeCategory, setActiveCategory] = useState("Workout");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [ytVideos, setYtVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [musicSource, setMusicSource] = useState<"youtube" | "itunes">("youtube");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState("");
  const [activeVideoAuthor, setActiveVideoAuthor] = useState("");
  const [activeVideoThumb, setActiveVideoThumb] = useState("");
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState<YouTubeVideo[]>([]);

  const { currentTrack, isPlaying, progress, currentTime, duration, play, pause, resume, next, prev, seek, stop } = useAudioPlayer();

  const loadCategory = useCallback(async (cat: string) => {
    setLoading(true);
    if (musicSource === "itunes") {
      const results = await getTracksForCategory(cat);
      setTracks(results);
    } else {
      const results = await searchYouTube(`${cat} workout music`, cat);
      setYtVideos(results);
    }
    setLoading(false);
  }, [musicSource]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    if (musicSource === "itunes") {
      const results = await searchTracks(searchQuery, 50);
      setTracks(results);
    } else {
      const results = await searchYouTube(searchQuery, activeCategory);
      setYtVideos(results);
    }
    setLoading(false);
  }, [searchQuery, musicSource, activeCategory]);

  useEffect(() => {
    loadCategory(activeCategory);
  }, [activeCategory, loadCategory]);

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleTrackPress = (track: Track) => {
    if (currentTrack?.id === track.id) {
      isPlaying ? pause() : resume();
    } else {
      play(track, tracks);
    }
  };

  const handleYtPlay = (video: YouTubeVideo) => {
    setActiveVideoId(video.id);
    setActiveVideoTitle(video.title);
    setActiveVideoAuthor(video.author);
    setActiveVideoThumb(video.thumbnail);
    setShowNowPlaying(true);
    // Add to recently played
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(v => v.id !== video.id);
      return [video, ...filtered].slice(0, 10);
    });
  };

  // Waveform bars component
  const WaveformBars = ({ active, count = 40, color = "bg-primary" }: { active: boolean; count?: number; color?: string }) => (
    <div className="flex items-end gap-[1.5px] h-8 justify-center">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`w-[2px] rounded-full ${color}`}
          animate={active ? {
            height: [4, 8 + Math.random() * 24, 4],
          } : { height: 4 }}
          transition={{
            repeat: active ? Infinity : 0,
            duration: 0.4 + Math.random() * 0.5,
            delay: i * 0.015,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );

  return (
    <div className={`relative min-h-screen pb-24 px-4 pt-6`}>
      <div className="ambient-glow" />

      {/* Full-screen Now Playing Overlay (YouTube) */}
      <AnimatePresence>
        {showNowPlaying && activeVideoId && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background"
            style={{
              background: "linear-gradient(180deg, hsl(160 100% 50% / 0.08) 0%, hsl(220 30% 6%) 25%)",
            }}
          >
            {/* Now Playing Header */}
            <div className="flex items-center justify-between px-5 pt-12 pb-4">
              <button onClick={() => setShowNowPlaying(false)} className="p-2 rounded-full hover:bg-secondary/50">
                <ChevronDown className="h-5 w-5 text-foreground" />
              </button>
              <p className="text-sm font-bold text-foreground tracking-wide">Now Playing</p>
              <button className="p-2 rounded-full hover:bg-secondary/50">
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Album Art - Large Circle */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="relative"
                style={{ animationPlayState: "running" }}
              >
                <div className="h-64 w-64 rounded-full overflow-hidden border-4 border-primary/30 shadow-2xl"
                  style={{ boxShadow: "0 0 60px hsl(var(--primary) / 0.3), inset 0 0 30px hsl(var(--primary) / 0.1)" }}
                >
                  {activeVideoThumb ? (
                    <img src={activeVideoThumb} alt={activeVideoTitle} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full gradient-primary flex items-center justify-center">
                      <Music className="h-20 w-20 text-primary-foreground" />
                    </div>
                  )}
                </div>
                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-background border-2 border-primary/50" />
              </motion.div>

              {/* Track Info */}
              <div className="mt-8 text-center w-full px-4">
                <h2 className="text-lg font-bold text-foreground line-clamp-2">{activeVideoTitle}</h2>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <Youtube className="h-3.5 w-3.5 text-destructive" />
                  <p className="text-sm text-muted-foreground">{activeVideoAuthor}</p>
                  <button onClick={() => toggleLike(activeVideoId)} className="p-1">
                    <Heart className={`h-4 w-4 transition-colors ${liked.has(activeVideoId) ? "text-destructive fill-current" : "text-muted-foreground"}`} />
                  </button>
                </div>
              </div>

              {/* Waveform Progress */}
              <div className="w-full mt-6 px-2">
                <WaveformBars active={true} count={50} color="gradient-primary" />
              </div>

              {/* YouTube Embed (hidden but plays audio) */}
              <div className="w-full mt-4 rounded-2xl overflow-hidden aspect-video max-h-48">
                <iframe
                  key={activeVideoId}
                  src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full border-0 rounded-2xl"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-8 mt-6 mb-4">
                <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Shuffle className="h-5 w-5" />
                </button>
                <button className="p-2 text-foreground" onClick={() => {
                  const idx = ytVideos.findIndex(v => v.id === activeVideoId);
                  if (idx > 0) handleYtPlay(ytVideos[idx - 1]);
                }}>
                  <SkipBack className="h-6 w-6" />
                </button>
                <button
                  className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center neon-glow shadow-lg"
                >
                  <Play className="h-7 w-7 text-primary-foreground ml-1" />
                </button>
                <button className="p-2 text-foreground" onClick={() => {
                  const idx = ytVideos.findIndex(v => v.id === activeVideoId);
                  if (idx >= 0 && idx < ytVideos.length - 1) handleYtPlay(ytVideos[idx + 1]);
                }}>
                  <SkipForward className="h-6 w-6" />
                </button>
                <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Repeat className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iTunes Full-screen Now Playing */}
      <AnimatePresence>
        {showNowPlaying && currentTrack && musicSource === "itunes" && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background"
            style={{
              background: "linear-gradient(180deg, hsl(160 100% 50% / 0.08) 0%, hsl(220 30% 6%) 25%)",
            }}
          >
            <div className="flex items-center justify-between px-5 pt-12 pb-4">
              <button onClick={() => setShowNowPlaying(false)} className="p-2 rounded-full hover:bg-secondary/50">
                <ChevronDown className="h-5 w-5 text-foreground" />
              </button>
              <p className="text-sm font-bold text-foreground tracking-wide">Now Playing</p>
              <button className="p-2 rounded-full hover:bg-secondary/50">
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-8">
              {/* Rotating Album Art */}
              <motion.div
                animate={isPlaying ? { rotate: 360 } : {}}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
              >
                <div className="h-64 w-64 rounded-full overflow-hidden border-4 border-primary/30 shadow-2xl"
                  style={{ boxShadow: "0 0 60px hsl(var(--primary) / 0.3)" }}
                >
                  {currentTrack.artworkUrl ? (
                    <img src={currentTrack.artworkUrl} alt={currentTrack.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full gradient-primary flex items-center justify-center">
                      <Music className="h-20 w-20 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-background border-2 border-primary/50" />
              </motion.div>

              {/* Track Info */}
              <div className="mt-8 text-center w-full">
                <h2 className="text-lg font-bold text-foreground">{currentTrack.title}</h2>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <Headphones className="h-3.5 w-3.5 text-primary" />
                  <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
                  <button onClick={() => toggleLike(String(currentTrack.id))} className="p-1">
                    <Heart className={`h-4 w-4 transition-colors ${liked.has(String(currentTrack.id)) ? "text-destructive fill-current" : "text-muted-foreground"}`} />
                  </button>
                </div>
              </div>

              {/* Waveform */}
              <div className="w-full mt-6">
                <WaveformBars active={isPlaying} count={50} color="bg-primary" />
                <div className="flex justify-between mt-2 px-1">
                  <span className="text-[10px] text-muted-foreground">{formatTime(currentTime)}</span>
                  <span className="text-[10px] text-muted-foreground">{formatTime(duration)}</span>
                </div>
                {/* Progress bar */}
                <div
                  className="w-full h-1 rounded-full bg-secondary mt-1 cursor-pointer relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    seek((e.clientX - rect.left) / rect.width);
                  }}
                >
                  <div className="h-full rounded-full gradient-primary" style={{ width: `${progress * 100}%` }} />
                  <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary shadow-md"
                    style={{ left: `${progress * 100}%`, transform: `translate(-50%, -50%)` }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-8 mt-8 mb-8">
                <button className="p-2 text-muted-foreground hover:text-foreground">
                  <Shuffle className="h-5 w-5" />
                </button>
                <button className="p-2 text-foreground" onClick={prev}>
                  <SkipBack className="h-6 w-6" />
                </button>
                <button
                  onClick={isPlaying ? pause : resume}
                  className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center neon-glow shadow-lg"
                >
                  {isPlaying ? (
                    <Pause className="h-7 w-7 text-primary-foreground" />
                  ) : (
                    <Play className="h-7 w-7 text-primary-foreground ml-1" />
                  )}
                </button>
                <button className="p-2 text-foreground" onClick={next}>
                  <SkipForward className="h-6 w-6" />
                </button>
                <button className="p-2 text-muted-foreground hover:text-foreground">
                  <Repeat className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
            <Music className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">BEAST MUSIC</h1>
            <p className="text-[10px] text-muted-foreground">Stream workout tracks 🎵</p>
          </div>
        </div>
        <button className="p-2 rounded-xl glass-card">
          <Search className="h-4 w-4 text-muted-foreground" />
        </button>
      </motion.div>

      {/* Source Toggle */}
      <div className="relative z-10 glass-card p-1 flex mb-4 rounded-xl">
        <button
          onClick={() => setMusicSource("youtube")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            musicSource === "youtube" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"
          }`}
        >
          <Youtube className="h-3.5 w-3.5" /> YouTube
        </button>
        <button
          onClick={() => setMusicSource("itunes")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            musicSource === "itunes" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Headphones className="h-3.5 w-3.5" /> Music
        </button>
      </div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative z-10 mb-4">
        <div className="glass-card flex items-center gap-3 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search songs, artists..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); loadCategory(activeCategory); }} className="p-1">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <button onClick={handleSearch} className="gradient-primary px-3 py-1.5 rounded-lg text-xs font-bold text-primary-foreground">GO</button>
        </div>
      </motion.div>

      {/* Categories */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="relative z-10 flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setSearchQuery(""); }}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCategory === cat ? "gradient-primary text-primary-foreground neon-glow" : "glass-card text-muted-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Recently Played (YouTube) */}
      {musicSource === "youtube" && recentlyPlayed.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Recently Played</h2>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {recentlyPlayed.slice(0, 5).map((video) => (
              <motion.div
                key={video.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleYtPlay(video)}
                className="shrink-0 w-28 cursor-pointer"
              >
                <div className="h-28 w-28 rounded-2xl overflow-hidden mb-2 border border-border/20">
                  <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
                </div>
                <p className="text-[11px] font-semibold text-foreground line-clamp-1">{video.title}</p>
                <p className="text-[9px] text-muted-foreground truncate">{video.author}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="relative z-10 flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <span className="ml-3 text-sm text-muted-foreground">Loading tracks...</span>
        </div>
      )}

      {/* YouTube "You Might Like" List */}
      {!loading && musicSource === "youtube" && (
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">You Might Like</h2>
            <span className="text-[10px] text-muted-foreground">{ytVideos.length} tracks</span>
          </div>

          <div className="space-y-1">
            {ytVideos.map((video, i) => {
              const isActive = activeVideoId === video.id;
              return (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(0.04 * i, 0.4) }}
                  onClick={() => handleYtPlay(video)}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer ${
                    isActive ? "glass-card border border-primary/20" : "hover:bg-secondary/30"
                  }`}
                >
                  {/* Album Art */}
                  <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-border/10">
                    <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
                    {isActive && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="flex items-end gap-[2px] h-4">
                          {[1,2,3].map(i => (
                            <motion.div key={i} className="w-[2px] bg-primary rounded-full"
                              animate={{ height: [4, 12, 4] }}
                              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                      {video.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{video.author}</p>
                  </div>

                  {/* Duration & Play */}
                  <span className="text-[10px] text-muted-foreground shrink-0 mr-1">{video.duration}</span>
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
              <p className="text-sm text-muted-foreground">No videos found</p>
            </div>
          )}
        </div>
      )}

      {/* iTunes/Music List */}
      {!loading && musicSource === "itunes" && (
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">You Might Like</h2>
            <span className="text-[10px] text-muted-foreground">{tracks.length} tracks</span>
          </div>

          <div className="space-y-1">
            {tracks.map((track, i) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(0.04 * i, 0.4) }}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all ${
                    isCurrentTrack ? "glass-card border border-primary/20" : "hover:bg-secondary/30"
                  }`}
                >
                  {/* Album Art */}
                  <button onClick={() => { handleTrackPress(track); if (!isCurrentTrack) setShowNowPlaying(true); }}
                    className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-border/10"
                  >
                    {track.artworkUrl ? (
                      <img src={track.artworkUrl} alt={track.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-secondary flex items-center justify-center">
                        <Music className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    {isCurrentTrack && isPlaying && (
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
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0" onClick={() => { if (isCurrentTrack) setShowNowPlaying(true); else { handleTrackPress(track); setShowNowPlaying(true); } }}>
                    <p className={`text-sm font-semibold truncate ${isCurrentTrack ? "text-primary" : "text-foreground"}`}>
                      {track.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
                  </div>

                  {/* Like */}
                  <button onClick={() => toggleLike(String(track.id))} className="shrink-0 p-1">
                    <Heart className={`h-4 w-4 transition-colors ${liked.has(String(track.id)) ? "text-destructive fill-current" : "text-muted-foreground"}`} />
                  </button>

                  {/* Play Button */}
                  <button
                    onClick={() => { handleTrackPress(track); if (!isCurrentTrack) setShowNowPlaying(true); }}
                    className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                      isCurrentTrack ? "gradient-primary neon-glow" : "bg-primary/10"
                    }`}
                  >
                    {isCurrentTrack && isPlaying ? (
                      <Pause className="h-3.5 w-3.5 text-primary-foreground" />
                    ) : (
                      <Play className={`h-3.5 w-3.5 ml-0.5 ${isCurrentTrack ? "text-primary-foreground" : "text-primary"}`} />
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {tracks.length === 0 && (
            <div className="text-center py-12">
              <Music className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No tracks found</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom Mini Player */}
      <AnimatePresence>
        {((musicSource === "youtube" && activeVideoId && !showNowPlaying) ||
          (musicSource === "itunes" && currentTrack && !showNowPlaying)) && (
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
                {/* Mini Album Art */}
                <div className="h-11 w-11 rounded-xl overflow-hidden shrink-0 border border-border/10">
                  {musicSource === "youtube" ? (
                    <img src={activeVideoThumb} alt="" className="h-full w-full object-cover" />
                  ) : currentTrack?.artworkUrl ? (
                    <img src={currentTrack.artworkUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full gradient-primary" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {musicSource === "youtube" ? activeVideoTitle : currentTrack?.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {musicSource === "youtube" ? activeVideoAuthor : currentTrack?.artist}
                  </p>
                </div>

                {/* Like & Controls */}
                <button onClick={(e) => {
                  e.stopPropagation();
                  const id = musicSource === "youtube" ? activeVideoId! : String(currentTrack?.id);
                  toggleLike(id);
                }} className="p-1">
                  <Heart className={`h-3.5 w-3.5 ${
                    liked.has(musicSource === "youtube" ? activeVideoId! : String(currentTrack?.id))
                      ? "text-destructive fill-current"
                      : "text-muted-foreground"
                  }`} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (musicSource === "itunes") {
                      isPlaying ? pause() : resume();
                    } else {
                      setShowNowPlaying(true);
                    }
                  }}
                  className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center neon-glow"
                >
                  {musicSource === "itunes" && isPlaying ? (
                    <Pause className="h-3.5 w-3.5 text-primary-foreground" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-primary-foreground ml-0.5" />
                  )}
                </button>
              </div>

              {/* Mini progress for iTunes */}
              {musicSource === "itunes" && currentTrack && (
                <div className="mt-2 h-0.5 rounded-full bg-secondary">
                  <div className="h-full rounded-full gradient-primary" style={{ width: `${progress * 100}%` }} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MusicPage;

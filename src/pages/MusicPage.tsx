import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Music, Play, Pause, Heart, Loader2, Youtube, Headphones, X, Maximize2, Minimize2 } from "lucide-react";
import { searchTracks, getTracksForCategory, type Track } from "@/lib/musicService";
import { searchYouTube, getCuratedVideos, getYouTubeAudioUrl, type YouTubeVideo } from "@/lib/youtubeService";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

const categories = ["Phonk", "Workout", "Running", "High Energy", "Chill", "Hardstyle", "Trap", "EDM"];

const MusicPage = () => {
  const [activeCategory, setActiveCategory] = useState("Workout");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [ytVideos, setYtVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [musicSource, setMusicSource] = useState<"youtube" | "itunes">("youtube");
  const [ytLoading, setYtLoading] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [expandedVideo, setExpandedVideo] = useState(false);

  const { currentTrack, isPlaying, play, pause, resume } = useAudioPlayer();

  const loadCategory = useCallback(async (cat: string) => {
    setLoading(true);
    if (musicSource === "itunes") {
      const results = await getTracksForCategory(cat);
      setTracks(results);
    } else {
      // Try search first, falls back to curated in the edge function
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

  const toggleLike = (id: number) => {
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
    // Open embedded YouTube player
    setActiveVideoId(video.id);
    setExpandedVideo(false);
  };

  const handleYtAudioPlay = async (video: YouTubeVideo) => {
    setYtLoading(video.id);
    try {
      const audioUrl = await getYouTubeAudioUrl(video.id);
      if (audioUrl) {
        const track: Track = {
          id: video.id.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0),
          title: video.title,
          artist: video.author,
          album: "YouTube",
          duration: video.duration,
          durationMs: video.lengthSeconds * 1000,
          previewUrl: audioUrl,
          artworkUrl: video.thumbnail,
          genre: "YouTube",
        };
        play(track, []);
      }
    } catch (err) {
      console.error("Failed to play YouTube audio:", err);
    }
    setYtLoading(null);
  };

  return (
    <div className={`relative min-h-screen ${currentTrack ? "pb-44" : "pb-24"} px-4 pt-6`}>
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
          <Music className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">BEAST MUSIC</h1>
          <p className="text-xs text-muted-foreground">Stream workout tracks 🎵</p>
        </div>
      </motion.div>

      {/* Source Toggle */}
      <div className="relative z-10 glass-card p-1 flex mb-4 rounded-xl">
        <button
          onClick={() => setMusicSource("youtube")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            musicSource === "youtube" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"
          }`}
        >
          <Youtube className="h-3.5 w-3.5" /> YouTube Video
        </button>
        <button
          onClick={() => setMusicSource("itunes")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            musicSource === "itunes" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Headphones className="h-3.5 w-3.5" /> Spotify-Style
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
            placeholder={musicSource === "youtube" ? "Search workout videos..." : "Search any song, artist..."}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
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

      {/* Embedded YouTube Player */}
      <AnimatePresence>
        {activeVideoId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-20 mb-5"
          >
            <div className={`glass-card overflow-hidden rounded-2xl border border-neon-green/20 ${expandedVideo ? "" : ""}`}
              style={{ boxShadow: "0 0 30px hsl(160 100% 50% / 0.15)" }}
            >
              {/* Player Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-secondary/50">
                <div className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-bold text-foreground">Now Playing</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setExpandedVideo(!expandedVideo)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    {expandedVideo ? <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" /> : <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => setActiveVideoId(null)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              {/* YouTube Iframe */}
              <div className={`w-full ${expandedVideo ? "aspect-video" : "aspect-square"}`}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                  style={{ border: "none" }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading && (
        <div className="relative z-10 flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-neon-green animate-spin" />
          <span className="ml-3 text-sm text-muted-foreground">Loading tracks...</span>
        </div>
      )}

      {/* YouTube Video Grid */}
      {!loading && musicSource === "youtube" && (
        <div className="relative z-10">
          <p className="text-[10px] text-muted-foreground mb-3 px-1">
            {ytVideos.length} videos • Tap to play
          </p>

          {/* Square Video Cards Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {ytVideos.slice(0, 6).map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                onClick={() => handleYtPlay(video)}
                className={`glass-card rounded-xl overflow-hidden cursor-pointer group transition-all hover:scale-[1.02] ${
                  activeVideoId === video.id ? "border-2 border-destructive ring-2 ring-destructive/20" : "border border-border/30"
                }`}
              >
                {/* Square Thumbnail */}
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-destructive/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <Play className="h-5 w-5 text-destructive-foreground ml-0.5" />
                    </div>
                  </div>
                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-mono text-foreground">
                    {video.duration}
                  </div>
                  {/* YouTube Badge */}
                  <div className="absolute top-2 left-2">
                    <Youtube className="h-4 w-4 text-destructive drop-shadow-lg" />
                  </div>
                </div>
                {/* Info */}
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{video.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{video.author}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Remaining videos as list */}
          {ytVideos.length > 6 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground mb-2 px-1 font-semibold uppercase tracking-wider">More Videos</p>
              {ytVideos.slice(6).map((video, i) => {
                const isActive = activeVideoId === video.id;
                return (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(0.03 * i, 0.3) }}
                    onClick={() => handleYtPlay(video)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors cursor-pointer ${
                      isActive ? "bg-destructive/10 border border-destructive/20" : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="relative h-11 w-11 rounded-lg overflow-hidden shrink-0">
                      <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                        <Play className="h-4 w-4 text-foreground ml-0.5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isActive ? "text-destructive" : "text-foreground"}`}>{video.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{video.author}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{video.duration}</span>
                  </motion.div>
                );
              })}
            </div>
          )}

          {ytVideos.length === 0 && (
            <div className="text-center py-12">
              <Youtube className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No videos found</p>
              <p className="text-[10px] text-muted-foreground mt-1">Try a different search or category</p>
            </div>
          )}
        </div>
      )}

      {/* iTunes/Spotify-style Track List */}
      {!loading && musicSource === "itunes" && (
        <div className="relative z-10 space-y-1">
          <p className="text-[10px] text-muted-foreground mb-3 px-1">{tracks.length} tracks • 30s previews</p>
          <AnimatePresence>
            {tracks.map((track, i) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(0.03 * i, 0.5) }}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                    isCurrentTrack ? "bg-neon-green/5 border border-neon-green/10" : "hover:bg-secondary/50"
                  }`}
                >
                  <button onClick={() => handleTrackPress(track)} className="relative h-11 w-11 rounded-lg overflow-hidden shrink-0">
                    {track.artworkUrl ? (
                      <img src={track.artworkUrl} alt={track.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-secondary" />
                    )}
                    <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                      {isCurrentTrack && isPlaying ? <Pause className="h-4 w-4 text-neon-green" /> : <Play className="h-4 w-4 text-foreground ml-0.5" />}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isCurrentTrack ? "text-neon-green" : "text-foreground"}`}>{track.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  <button onClick={() => toggleLike(track.id)} className="shrink-0 p-1">
                    <Heart className={`h-4 w-4 transition-colors ${liked.has(track.id) ? "text-neon-pink fill-current" : "text-muted-foreground"}`} />
                  </button>
                  <span className="text-[11px] text-muted-foreground shrink-0 w-8 text-right">{track.duration}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {tracks.length === 0 && (
            <div className="text-center py-12">
              <Music className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No tracks found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MusicPage;

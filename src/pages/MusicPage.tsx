import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Music, Play, Pause, Heart, Loader2, Youtube, Headphones } from "lucide-react";
import { searchTracks, getTracksForCategory, type Track } from "@/lib/musicService";
import { searchYouTube, getYouTubeAudioUrl, type YouTubeVideo } from "@/lib/youtubeService";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

const categories = ["Phonk", "Workout", "Running", "High Energy", "Chill", "Hardstyle", "Trap", "EDM"];

const MusicPage = () => {
  const [activeCategory, setActiveCategory] = useState("Workout");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [ytVideos, setYtVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [musicSource, setMusicSource] = useState<"itunes" | "youtube">("youtube");
  const [ytLoading, setYtLoading] = useState<string | null>(null);

  const { currentTrack, isPlaying, play, pause, resume } = useAudioPlayer();

  const loadCategory = useCallback(async (cat: string) => {
    setLoading(true);
    if (musicSource === "itunes") {
      const results = await getTracksForCategory(cat);
      setTracks(results);
    } else {
      const results = await searchYouTube(`${cat} workout music`);
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
      const results = await searchYouTube(searchQuery);
      setYtVideos(results);
    }
    setLoading(false);
  }, [searchQuery, musicSource]);

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

  const handleYtPlay = async (video: YouTubeVideo) => {
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
        const allTracks: Track[] = ytVideos.map(v => ({
          id: v.id.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0),
          title: v.title,
          artist: v.author,
          album: "YouTube",
          duration: v.duration,
          durationMs: v.lengthSeconds * 1000,
          previewUrl: "",
          artworkUrl: v.thumbnail,
          genre: "YouTube",
        }));
        play(track, allTracks);
      }
    } catch (err) {
      console.error("Failed to play YouTube track:", err);
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
          <h1 className="text-xl font-display font-bold text-foreground">GYM LIBRARY</h1>
          <p className="text-xs text-muted-foreground">Stream workout tracks 🎵</p>
        </div>
      </motion.div>

      {/* Source Toggle */}
      <div className="relative z-10 glass-card p-1 flex mb-4 rounded-xl">
        <button
          onClick={() => setMusicSource("youtube")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            musicSource === "youtube" ? "bg-destructive text-foreground" : "text-muted-foreground"
          }`}
        >
          <Youtube className="h-3.5 w-3.5" /> YouTube Music
        </button>
        <button
          onClick={() => setMusicSource("itunes")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            musicSource === "itunes" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Headphones className="h-3.5 w-3.5" /> iTunes Preview
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
            placeholder={musicSource === "youtube" ? "Search YouTube Music..." : "Search any song, artist..."}
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

      {/* Loading */}
      {loading && (
        <div className="relative z-10 flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-neon-green animate-spin" />
          <span className="ml-3 text-sm text-muted-foreground">Loading tracks...</span>
        </div>
      )}

      {/* YouTube Content */}
      {!loading && musicSource === "youtube" && (
        <div className="relative z-10 space-y-1">
          <p className="text-[10px] text-muted-foreground mb-3 px-1">{ytVideos.length} songs found • Full playback via YouTube</p>

          {ytVideos.map((video, i) => {
            const isActive = currentTrack?.title === video.title;
            return (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(0.03 * i, 0.5) }}
                onClick={() => handleYtPlay(video)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors cursor-pointer ${
                  isActive ? "bg-destructive/10 border border-destructive/20" : "hover:bg-secondary/50"
                }`}
              >
                <div className="relative h-11 w-11 rounded-lg overflow-hidden shrink-0">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-secondary flex items-center justify-center">
                      <Youtube className="h-4 w-4 text-destructive" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                    {ytLoading === video.id ? (
                      <Loader2 className="h-4 w-4 text-foreground animate-spin" />
                    ) : isActive && isPlaying ? (
                      <Pause className="h-4 w-4 text-destructive" />
                    ) : (
                      <Play className="h-4 w-4 text-foreground ml-0.5" />
                    )}
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

          {ytVideos.length === 0 && (
            <div className="text-center py-12">
              <Youtube className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No songs found</p>
            </div>
          )}
        </div>
      )}

      {/* iTunes Track List */}
      {!loading && musicSource === "itunes" && (
        <div className="relative z-10 space-y-1">
          <p className="text-[10px] text-muted-foreground mb-3 px-1">{tracks.length} tracks found • 30s previews</p>
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

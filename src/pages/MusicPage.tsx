import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Music, Play, Pause, Heart, Loader2 } from "lucide-react";
import { searchTracks, getTracksForCategory, type Track } from "@/lib/musicService";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

const categories = ["Phonk", "Workout", "Running", "High Energy", "Chill", "Hardstyle", "Trap", "EDM"];

const MusicPage = () => {
  const [activeCategory, setActiveCategory] = useState("Workout");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [liked, setLiked] = useState<Set<number>>(new Set());

  const { currentTrack, isPlaying, play, pause, resume } = useAudioPlayer();

  const loadCategory = useCallback(async (cat: string) => {
    setLoading(true);
    const results = await getTracksForCategory(cat);
    setTracks(results);
    setLoading(false);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const results = await searchTracks(searchQuery, 50);
    setTracks(results);
    setLoading(false);
  }, [searchQuery]);

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

  return (
    <div className={`relative min-h-screen ${currentTrack ? "pb-44" : "pb-24"} px-4 pt-6`}>
      <div className="ambient-glow" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center gap-3 mb-5"
      >
        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
          <Music className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">GYM LIBRARY</h1>
          <p className="text-xs text-muted-foreground">Stream real workout tracks 🎵</p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 mb-4"
      >
        <div className="glass-card flex items-center gap-3 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search any song, artist..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={handleSearch}
            className="gradient-primary px-3 py-1.5 rounded-lg text-xs font-bold text-primary-foreground"
          >
            GO
          </button>
        </div>
      </motion.div>

      {/* Categories */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 flex gap-2 mb-5 overflow-x-auto no-scrollbar"
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setSearchQuery(""); }}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCategory === cat
                ? "gradient-primary text-primary-foreground neon-glow"
                : "glass-card text-muted-foreground"
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

      {/* Track List */}
      {!loading && (
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
                  {/* Album Art + Play */}
                  <button
                    onClick={() => handleTrackPress(track)}
                    className="relative h-11 w-11 rounded-lg overflow-hidden shrink-0"
                  >
                    {track.artworkUrl ? (
                      <img src={track.artworkUrl} alt={track.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-secondary" />
                    )}
                    <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                      {isCurrentTrack && isPlaying ? (
                        <Pause className="h-4 w-4 text-neon-green" />
                      ) : (
                        <Play className="h-4 w-4 text-foreground ml-0.5" />
                      )}
                    </div>
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isCurrentTrack ? "text-neon-green" : "text-foreground"}`}>
                      {track.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
                  </div>

                  {/* Like */}
                  <button onClick={() => toggleLike(track.id)} className="shrink-0 p-1">
                    <Heart
                      className={`h-4 w-4 transition-colors ${
                        liked.has(track.id) ? "text-neon-pink fill-current" : "text-muted-foreground"
                      }`}
                    />
                  </button>

                  {/* Duration */}
                  <span className="text-[11px] text-muted-foreground shrink-0 w-8 text-right">{track.duration}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {tracks.length === 0 && !loading && (
            <div className="text-center py-12">
              <Music className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No tracks found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try a different search</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MusicPage;

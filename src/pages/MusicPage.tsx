import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Music, Play, Pause, SkipForward, SkipBack, Volume2, Heart, Shuffle, Repeat } from "lucide-react";

const categories = ["Phonk", "Workout", "Running", "High Energy", "Chill", "Hardstyle", "Trap", "EDM"];

const tracks = [
  { title: "Possibilities", artist: "Jasmine Jordan", duration: "3:30", bpm: 128 },
  { title: "So Hard", artist: "JekK", duration: "3:38", bpm: 145 },
  { title: "Shine Your Light", artist: "Robert Avellanet", duration: "3:49", bpm: 130 },
  { title: "The One and Only", artist: "Robert Avellanet", duration: "3:59", bpm: 125 },
  { title: "Stay Tuned", artist: "SONIC MYSTERY", duration: "2:42", bpm: 140 },
  { title: "Make Believe", artist: "Felixjd", duration: "4:43", bpm: 120 },
  { title: "Lady", artist: "Le_J_James", duration: "3:20", bpm: 132 },
  { title: "Kind of Light", artist: "Dofhei Project", duration: "4:28", bpm: 110 },
  { title: "Beast Mode", artist: "GYM RAT", duration: "3:15", bpm: 155 },
  { title: "No Mercy", artist: "PHONK KING", duration: "2:55", bpm: 160 },
];

const MusicPage = () => {
  const [activeCategory, setActiveCategory] = useState("Phonk");
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [liked, setLiked] = useState<Set<number>>(new Set());

  const toggleLike = (i: number) => {
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const currentTrack = playingIndex !== null ? tracks[playingIndex] : null;

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
          <p className="text-xs text-muted-foreground">10,000+ workout tracks</p>
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
            placeholder="Search tracks, artists..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button className="gradient-primary px-3 py-1.5 rounded-lg text-xs font-bold text-primary-foreground">
            GO
          </button>
        </div>
      </motion.div>

      {/* Categories */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 flex gap-2 mb-6 overflow-x-auto no-scrollbar"
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
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

      {/* Smart Feature Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18 }}
        className="relative z-10 glass-card px-4 py-2.5 mb-4 flex items-center gap-2 border-l-2 border-neon-cyan/40"
      >
        <Volume2 className="h-3 w-3 text-neon-cyan shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          <span className="text-neon-cyan font-semibold">Smart:</span> Auto-plays high BPM tracks during workouts
        </p>
      </motion.div>

      {/* Track List */}
      <div className="relative z-10 space-y-1">
        <AnimatePresence>
          {tracks.map((track, i) => (
            <motion.div
              key={track.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <button
                onClick={() => setPlayingIndex(playingIndex === i ? null : i)}
                className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${
                  playingIndex === i ? "gradient-primary neon-glow" : "bg-secondary"
                }`}
              >
                {playingIndex === i ? (
                  <Pause className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <Play className="h-4 w-4 text-muted-foreground ml-0.5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${playingIndex === i ? "text-neon-green" : "text-foreground"}`}>
                  {track.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0">{track.bpm} BPM</span>
              <button onClick={() => toggleLike(i)}>
                <Heart className={`h-4 w-4 ${liked.has(i) ? "text-neon-pink fill-neon-pink" : "text-muted-foreground"}`} />
              </button>
              <span className="text-xs text-muted-foreground shrink-0">{track.duration}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Now Playing Bar */}
      <AnimatePresence>
        {currentTrack && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-16 left-0 right-0 z-40 px-3"
          >
            <div className="max-w-md mx-auto glass-card p-4 neon-glow border border-neon-green/20">
              {/* Waveform Animation */}
              <div className="flex items-end gap-[3px] h-6 justify-center mb-3">
                {Array.from({ length: 24 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-[3px] rounded-full gradient-primary"
                    animate={{
                      height: [4, 8 + Math.random() * 16, 4],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.4 + Math.random() * 0.5,
                      delay: i * 0.03,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                {/* Album Art Placeholder */}
                <div className="h-12 w-12 rounded-lg gradient-purple flex items-center justify-center shrink-0">
                  <Music className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{currentTrack.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button><Shuffle className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  <button onClick={() => setPlayingIndex(Math.max(0, (playingIndex ?? 0) - 1))}>
                    <SkipBack className="h-4 w-4 text-foreground" />
                  </button>
                  <button
                    onClick={() => setPlayingIndex(null)}
                    className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center neon-glow"
                  >
                    <Pause className="h-4 w-4 text-primary-foreground" />
                  </button>
                  <button onClick={() => setPlayingIndex(Math.min(tracks.length - 1, (playingIndex ?? 0) + 1))}>
                    <SkipForward className="h-4 w-4 text-foreground" />
                  </button>
                  <button><Repeat className="h-3.5 w-3.5 text-muted-foreground" /></button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">1:24</span>
                <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "40%" }}
                    className="h-full rounded-full gradient-primary"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{currentTrack.duration}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MusicPage;

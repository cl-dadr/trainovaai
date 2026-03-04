import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Music, Play, Pause } from "lucide-react";

const categories = ["Phonk", "Workout", "Running", "High Energy", "Chill"];

const tracks = [
  { title: "Possibilities", artist: "Jasmine Jordan", duration: "3:30" },
  { title: "So Hard", artist: "JekK", duration: "3:38" },
  { title: "Shine Your Light", artist: "Robert Avellanet", duration: "3:49" },
  { title: "The One and Only", artist: "Robert Avellanet", duration: "3:59" },
  { title: "Stay Tuned", artist: "SONIC MYSTERY", duration: "2:42" },
  { title: "Make Believe", artist: "Felixjd", duration: "4:43" },
  { title: "Lady", artist: "Le_J_James", duration: "3:20" },
  { title: "Kind of Light", artist: "Dofhei Project", duration: "4:28" },
  { title: "Beast Mode", artist: "GYM RAT", duration: "3:15" },
  { title: "No Mercy", artist: "PHONK KING", duration: "2:55" },
];

const MusicPage = () => {
  const [activeCategory, setActiveCategory] = useState("Phonk");
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
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
          <h1 className="text-xl font-display font-bold text-foreground">FUNK LIBRARY</h1>
          <p className="text-xs text-muted-foreground">Stream real workout tracks</p>
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
            placeholder="Search tracks..."
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

      {/* Track List */}
      <div className="relative z-10 space-y-1">
        <AnimatePresence>
          {tracks.map((track, i) => (
            <motion.button
              key={track.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => setPlayingIndex(playingIndex === i ? null : i)}
              className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="h-11 w-11 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                {playingIndex === i ? (
                  <Pause className="h-4 w-4 text-neon-green" />
                ) : (
                  <Play className="h-4 w-4 text-muted-foreground ml-0.5" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className={`text-sm font-semibold truncate ${playingIndex === i ? "text-neon-green" : "text-foreground"}`}>
                  {track.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{track.duration}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MusicPage;

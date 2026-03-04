import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, X } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

function formatTime(sec: number): string {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const NowPlayingBar = () => {
  const { currentTrack, isPlaying, progress, currentTime, duration, pause, resume, next, prev, seek, stop } = useAudioPlayer();

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-16 left-0 right-0 z-40 px-3"
      >
        <div className="max-w-md mx-auto glass-card p-3 border border-neon-green/20" style={{ boxShadow: "0 0 20px hsl(160 100% 50% / 0.15)" }}>
          {/* Waveform */}
          <div className="flex items-end gap-[2px] h-5 justify-center mb-2">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-[2px] rounded-full gradient-primary"
                animate={isPlaying ? {
                  height: [3, 6 + Math.random() * 14, 3],
                } : { height: 3 }}
                transition={{
                  repeat: isPlaying ? Infinity : 0,
                  duration: 0.3 + Math.random() * 0.4,
                  delay: i * 0.02,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Album Art */}
            {currentTrack.artworkUrl ? (
              <img src={currentTrack.artworkUrl} alt={currentTrack.title} className="h-11 w-11 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="h-11 w-11 rounded-lg gradient-purple shrink-0" />
            )}

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{currentTrack.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{currentTrack.artist}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              <button onClick={prev} className="p-1">
                <SkipBack className="h-3.5 w-3.5 text-foreground" />
              </button>
              <button
                onClick={isPlaying ? pause : resume}
                className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center neon-glow"
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5 text-primary-foreground" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-primary-foreground ml-0.5" />
                )}
              </button>
              <button onClick={next} className="p-1">
                <SkipForward className="h-3.5 w-3.5 text-foreground" />
              </button>
              <button onClick={stop} className="p-1 ml-1">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] text-muted-foreground w-6 text-right">{formatTime(currentTime)}</span>
            <div
              className="flex-1 h-1 rounded-full bg-secondary cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seek((e.clientX - rect.left) / rect.width);
              }}
            >
              <motion.div
                className="h-full rounded-full gradient-primary absolute left-0 top-0"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground w-6">{formatTime(duration)}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NowPlayingBar;

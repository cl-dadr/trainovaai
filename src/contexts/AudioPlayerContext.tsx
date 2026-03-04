import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import type { Track } from "@/lib/musicService";

interface AudioPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // 0-1
  currentTime: number; // seconds
  duration: number; // seconds
  queue: Track[];
  play: (track: Track, queue?: Track[]) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  seek: (progress: number) => void;
  stop: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerState | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    });
    audio.addEventListener("ended", () => {
      // Auto-play next track
      setIsPlaying(false);
      // We'll handle next in the next() function
    });
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Auto-play next on end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      const currentIdx = queue.findIndex((t) => t.id === currentTrack?.id);
      if (currentIdx >= 0 && currentIdx < queue.length - 1) {
        const nextTrack = queue[currentIdx + 1];
        setCurrentTrack(nextTrack);
        audio.src = nextTrack.previewUrl;
        audio.play().catch(console.error);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [queue, currentTrack]);

  const play = useCallback((track: Track, newQueue?: Track[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (newQueue) setQueue(newQueue);
    setCurrentTrack(track);
    audio.src = track.previewUrl;
    audio.play().catch(console.error);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(console.error);
  }, []);

  const next = useCallback(() => {
    const currentIdx = queue.findIndex((t) => t.id === currentTrack?.id);
    if (currentIdx >= 0 && currentIdx < queue.length - 1) {
      play(queue[currentIdx + 1]);
    }
  }, [queue, currentTrack, play]);

  const prev = useCallback(() => {
    const currentIdx = queue.findIndex((t) => t.id === currentTrack?.id);
    if (currentIdx > 0) {
      play(queue[currentIdx - 1]);
    }
  }, [queue, currentTrack, play]);

  const seek = useCallback((p: number) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = p * audio.duration;
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{ currentTrack, isPlaying, progress, currentTime, duration, queue, play, pause, resume, next, prev, seek, stop }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}

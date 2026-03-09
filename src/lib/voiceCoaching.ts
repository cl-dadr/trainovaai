// Voice coaching engine using Web Speech API
// Provides real-time audio feedback during workouts

let speechQueue: string[] = [];
let isSpeaking = false;
let voiceEnabled = true;
let lastSpokenTime = 0;
const MIN_SPEECH_INTERVAL = 3000; // Don't speak more than once every 3 seconds

export function setVoiceEnabled(enabled: boolean) {
  voiceEnabled = enabled;
  if (!enabled) {
    window.speechSynthesis?.cancel();
    speechQueue = [];
    isSpeaking = false;
  }
}

export function isVoiceEnabled() {
  return voiceEnabled;
}

function processQueue() {
  if (!voiceEnabled || isSpeaking || speechQueue.length === 0) return;
  
  const text = speechQueue.shift()!;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1;
  utterance.pitch = 1.0;
  utterance.volume = 0.9;
  
  // Try to use a natural-sounding voice
  const voices = window.speechSynthesis?.getVoices() || [];
  const preferred = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Alex"));
  if (preferred) utterance.voice = preferred;
  
  utterance.onend = () => { isSpeaking = false; processQueue(); };
  utterance.onerror = () => { isSpeaking = false; processQueue(); };
  
  isSpeaking = true;
  window.speechSynthesis?.speak(utterance);
}

export function speakCoaching(text: string, priority: "low" | "normal" | "high" = "normal") {
  if (!voiceEnabled || !window.speechSynthesis) return;
  
  const now = Date.now();
  if (now - lastSpokenTime < MIN_SPEECH_INTERVAL && priority !== "high") return;
  lastSpokenTime = now;
  
  if (priority === "high") {
    window.speechSynthesis.cancel();
    speechQueue = [];
    isSpeaking = false;
  }
  
  speechQueue.push(text);
  processQueue();
}

// Pre-built coaching phrases
export function speakRepComplete(count: number, exercise: string) {
  if (count % 5 === 0 && count > 0) {
    speakCoaching(`${count} ${exercise}s! Keep going!`, "high");
  } else if (count === 1) {
    speakCoaching(`${exercise} detected. Let's go!`, "high");
  }
}

export function speakFormCorrection(joint: string, fix: string, severity: "good" | "warning" | "critical") {
  if (severity === "critical") {
    speakCoaching(`Watch your ${joint}. ${fix}`, "high");
  } else if (severity === "warning") {
    speakCoaching(fix, "normal");
  }
}

export function speakMilestone(reps: number) {
  const messages: Record<number, string> = {
    10: "10 reps! Great start!",
    25: "25 reps! You're crushing it!",
    50: "50 reps! Halfway to a hundred!",
    100: "One hundred reps! Beast mode activated!",
    250: "250 reps! Incredible endurance!",
    500: "Five hundred! You're unstoppable!",
  };
  if (messages[reps]) speakCoaching(messages[reps], "high");
}

export function speakSessionEnd(totalReps: number, avgForm: number, calories: number) {
  speakCoaching(
    `Workout complete! ${totalReps} reps, ${avgForm} percent form accuracy, ${Math.round(calories)} calories burned. Great job!`,
    "high"
  );
}

export function speakCombo(combo: number) {
  if (combo === 3) speakCoaching("Nice combo! 3 perfect reps!", "normal");
  else if (combo === 5) speakCoaching("5 rep combo! On fire!", "normal");
  else if (combo === 10) speakCoaching("10 rep combo! Unstoppable!", "high");
}

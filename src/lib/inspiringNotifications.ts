import { toast } from "sonner";

const inspiringMessages = [
  { emoji: "🔥", text: "Your muscles are filing a missing persons report. Time to show up!", delay: 0 },
  { emoji: "🏋️", text: "Skipping gym today? Your future abs just unfollowed you 💀", delay: 30000 },
  { emoji: "💪", text: "Remember: every rep is a middle finger to your old self", delay: 60000 },
  { emoji: "🐺", text: "Wolves don't lose sleep over the opinions of sheep. Get up and grind 🐺", delay: 90000 },
  { emoji: "⚡", text: "Your comfort zone called. It misses you. Don't go back.", delay: 120000 },
  { emoji: "🦾", text: "Fun fact: You burn 0 calories making excuses. Just saying.", delay: 150000 },
  { emoji: "🎯", text: "Discipline > Motivation. Motivation ghosts you, discipline stays 🫡", delay: 180000 },
  { emoji: "🚀", text: "NASA called. They detected gains entering your atmosphere 🌍", delay: 210000 },
  { emoji: "👑", text: "Your body is a temple. Stop treating it like a fast food drive-thru 🍔❌", delay: 240000 },
  { emoji: "💎", text: "Pressure makes diamonds. Your workout is the pressure. Shine brighter ✨", delay: 270000 },
];

const toastStyle = {
  background: "hsl(240 12% 8% / 0.95)",
  border: "1px solid hsl(160 100% 50% / 0.3)",
  color: "hsl(0 0% 95%)",
  boxShadow: "0 0 20px hsl(160 100% 50% / 0.2)",
};

let timers: ReturnType<typeof setTimeout>[] = [];

export function startInspiringNotifications() {
  stopInspiringNotifications();
  
  // Show first one immediately
  toast(`${inspiringMessages[0].emoji} ${inspiringMessages[0].text}`, {
    duration: 5000,
    style: toastStyle,
  });

  // Schedule the rest
  for (let i = 1; i < inspiringMessages.length; i++) {
    const timer = setTimeout(() => {
      const msg = inspiringMessages[i];
      toast(`${msg.emoji} ${msg.text}`, {
        duration: 5000,
        style: toastStyle,
      });
    }, inspiringMessages[i].delay);
    timers.push(timer);
  }
}

export function stopInspiringNotifications() {
  timers.forEach(clearTimeout);
  timers = [];
}

export function showRandomInspiration() {
  const msg = inspiringMessages[Math.floor(Math.random() * inspiringMessages.length)];
  toast(`${msg.emoji} ${msg.text}`, {
    duration: 5000,
    style: toastStyle,
  });
}

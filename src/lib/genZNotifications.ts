import { toast } from "sonner";

const streakMessages: Record<number, string[]> = {
  1: [
    "Day 1 locked in 🔒 Main character energy activated",
    "First day? That's literally the hardest part. You ate that 💅",
    "POV: You just started your villain arc 🦹‍♂️",
  ],
  3: [
    "3 days straight?? The aura is immaculate rn 🔮✨",
    "You're giving very much discipline era 💪",
    "Not you being consistent... we stan 👑",
  ],
  5: [
    "5 DAYS. The gym misses you when you leave now 🏋️‍♂️💕",
    "Your aura just went from NPC to main boss 🎮",
    "This is giving protagonist energy fr fr 🔥",
  ],
  7: [
    "A WHOLE WEEK?? You're literally that person now 🐐",
    "7 days and the glow up is already loading... ⏳✨",
    "No cap, you're built different 🧬",
  ],
  10: [
    "10 DAYS LETS GOOO 🚀 ur literally the moment",
    "The dedication is giving... everything 💅🔥",
    "10 day streak? That's not luck, that's aura 🔮",
  ],
  14: [
    "2 WEEKS?! The transformation arc is REAL 📈",
    "You're in your beast era and we're all watching 👀",
    "Slay after slay after slay... iconic behavior 💎",
  ],
  21: [
    "21 days = habit formed. You're literally unstoppable now 🦾",
    "Three weeks of pure sigma grindset 🐺",
    "At this point the gym owes YOU money 💰",
  ],
  30: [
    "30 DAYS. A WHOLE MONTH. This is LEGENDARY 🏆",
    "You just unlocked ultra instinct mode 🔵✨",
    "The character development in this arc is insane 📖🔥",
  ],
};

const repMilestoneMessages: Record<number, string[]> = {
  10: [
    "First 10 reps! Baby gains loading... 🍼💪",
    "10 reps done, infinity to go. You got this bestie 🫶",
  ],
  25: [
    "25 reps?? You just passed the tutorial level 🎮",
    "Quarter century of reps. The grind never stops 😤",
  ],
  50: [
    "FIFTY. REPS. Main character behavior fr 🎬",
    "50 reps unlocked. NPC's could never 🚫",
  ],
  100: [
    "💯 REPS. You literally just went Super Saiyan 🔥⚡",
    "A hundred reps?! This is giving anime training arc energy 🥷",
  ],
  250: [
    "250 reps accumulated. You're in your BEAST era 🐺",
    "Two-fifty! At this rate you'll be jacked by Tuesday 💪😤",
  ],
  500: [
    "HALF A THOUSAND REPS. The glow up is REAL ✨",
    "500 reps. Your muscles have their own fan account now 📱",
  ],
  1000: [
    "1000 REPS?! YOU ARE THE STORM THAT IS APPROACHING ⛈️🔥",
    "A THOUSAND. You didn't just show up, you ATE and left no crumbs 👑",
  ],
};

const workoutFeedback = [
  "That rep was cleaner than your search history 🧹",
  "Form check: immaculate. No notes 📝✨",
  "You just bodied that set respectfully 🫡",
  "The gains are gaining 📈💪",
  "Every rep is a flex on your past self 💅",
  "This is giving Olympic athlete vibes 🏅",
  "Your muscles are writing a thank you letter rn ✉️",
  "Not you making this look easy... suspicious 🤨💪",
  "That form? Chef's kiss 👨‍🍳💋",
  "You're literally built different and it shows 🧬✨",
];

const waterReminders = [
  "Bestie, HYDRATE. Your muscles are literally begging 💧",
  "Water check! Your cells are throwing a drought party rn 🏜️",
  "H2O o'clock! Dehydration is NOT giving 🚫💧",
  "Drink water or your gains will ghost you 👻💧",
  "Hydration is the ultimate aura booster 🔮💧",
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function showStreakNotification(streakDays: number) {
  // Find the closest milestone
  const milestones = Object.keys(streakMessages).map(Number).sort((a, b) => b - a);
  const milestone = milestones.find((m) => streakDays >= m);
  
  if (milestone && streakMessages[milestone]) {
    const msg = randomPick(streakMessages[milestone]);
    toast(msg, {
      duration: 5000,
      style: {
        background: "hsl(240 12% 8% / 0.95)",
        border: "1px solid hsl(160 100% 50% / 0.3)",
        color: "hsl(0 0% 95%)",
        boxShadow: "0 0 20px hsl(160 100% 50% / 0.2)",
      },
    });
  }
}

export function showRepMilestoneNotification(totalReps: number) {
  if (repMilestoneMessages[totalReps]) {
    const msg = randomPick(repMilestoneMessages[totalReps]);
    toast(msg, {
      duration: 5000,
      style: {
        background: "hsl(240 12% 8% / 0.95)",
        border: "1px solid hsl(25 100% 55% / 0.3)",
        color: "hsl(0 0% 95%)",
        boxShadow: "0 0 20px hsl(25 100% 55% / 0.2)",
      },
    });
  }
}

export function showWorkoutFeedback() {
  const msg = randomPick(workoutFeedback);
  toast(msg, {
    duration: 3000,
    style: {
      background: "hsl(240 12% 8% / 0.95)",
      border: "1px solid hsl(180 100% 50% / 0.3)",
      color: "hsl(0 0% 95%)",
      boxShadow: "0 0 20px hsl(180 100% 50% / 0.2)",
    },
  });
}

export function showWaterReminder() {
  const msg = randomPick(waterReminders);
  toast(msg, {
    duration: 4000,
    style: {
      background: "hsl(240 12% 8% / 0.95)",
      border: "1px solid hsl(180 100% 50% / 0.3)",
      color: "hsl(0 0% 95%)",
      boxShadow: "0 0 20px hsl(180 100% 50% / 0.2)",
    },
  });
}

import type { ExerciseType, FormCorrection, DifficultyLevel } from "@/lib/exerciseDetection";

export interface SessionRecord {
  id?: string;
  exercise_type: string;
  reps: number;
  form_score: number | null;
  duration_seconds: number | null;
  created_at: string;
  calories_burned: number | null;
  user_id?: string;
}

export interface TodoItem {
  id?: string;
  exercise: ExerciseType;
  targetReps: number;
  status: "pending" | "done" | "skipped";
  actualReps?: number;
}

export const BODY_GOALS = [
  { id: "lean", label: "Lean & Toned", emoji: "🏃", desc: "Low body fat, defined muscles", exercises: ["pushup", "plank", "jumping_jack", "situp", "high_knees"] },
  { id: "muscular", label: "Muscular", emoji: "💪", desc: "Max muscle growth", exercises: ["pushup", "squat", "lunge", "bicep_curl", "shoulder_press"] },
  { id: "athletic", label: "Athletic", emoji: "⚡", desc: "Speed & power", exercises: ["squat", "jumping_jack", "lunge", "pushup", "high_knees"] },
  { id: "endurance", label: "Endurance", emoji: "🔥", desc: "Stamina king", exercises: ["jumping_jack", "plank", "squat", "situp", "high_knees"] },
  { id: "flexible", label: "Flexible", emoji: "🧘", desc: "Flexibility goals", exercises: ["lunge", "squat", "plank"] },
  { id: "powerlifter", label: "Powerlifter", emoji: "🏋️", desc: "Raw strength", exercises: ["squat", "pushup", "lunge", "shoulder_press", "bicep_curl"] },
] as const;

export type BodyGoalId = typeof BODY_GOALS[number]["id"];

export const ALL_EXERCISES: { type: ExerciseType; name: string; emoji: string; muscle: string; difficulty: string }[] = [
  { type: "pushup", name: "Push-Up", emoji: "💪", muscle: "Chest, Triceps, Core", difficulty: "Medium" },
  { type: "squat", name: "Squat", emoji: "🦵", muscle: "Quads, Glutes, Hamstrings", difficulty: "Medium" },
  { type: "plank", name: "Plank", emoji: "🧘", muscle: "Core, Shoulders", difficulty: "Easy" },
  { type: "jumping_jack", name: "Jumping Jack", emoji: "⭐", muscle: "Full Body, Cardio", difficulty: "Easy" },
  { type: "lunge", name: "Lunge", emoji: "🏃", muscle: "Quads, Glutes, Balance", difficulty: "Medium" },
  { type: "situp", name: "Sit-Up", emoji: "🔥", muscle: "Abs, Hip Flexors", difficulty: "Easy" },
  { type: "bicep_curl", name: "Bicep Curl", emoji: "💪", muscle: "Biceps, Forearms", difficulty: "Easy" },
  { type: "shoulder_press", name: "Shoulder Press", emoji: "🏋️", muscle: "Shoulders, Triceps", difficulty: "Medium" },
  { type: "high_knees", name: "High Knees", emoji: "🏃", muscle: "Core, Cardio, Quads", difficulty: "Easy" },
];

export const XP_PER_REP = 10;
export const XP_FORM_BONUS: Record<string, number> = { perfect: 5, good: 3, fair: 1, poor: 0, none: 0 };
export const COMBO_THRESHOLDS = [3, 5, 10, 15, 20];

export const ACHIEVEMENTS = [
  { id: "first_rep", label: "First Rep!", icon: "⭐", condition: (reps: number) => reps >= 1 },
  { id: "ten_reps", label: "Getting Warm", icon: "🔥", condition: (reps: number) => reps >= 10 },
  { id: "twenty_five", label: "Quarter Century", icon: "💪", condition: (reps: number) => reps >= 25 },
  { id: "fifty", label: "Half Century", icon: "🏆", condition: (reps: number) => reps >= 50 },
  { id: "hundred", label: "Centurion", icon: "👑", condition: (reps: number) => reps >= 100 },
  { id: "perfect_form", label: "Perfect Form", icon: "🎯", condition: (_: number, form: number) => form >= 95 },
];

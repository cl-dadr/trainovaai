// Utility functions for calculating joint angles and detecting exercises

export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

export type ExerciseType = "pushup" | "squat" | "plank" | "jumping_jack" | "lunge" | "situp" | "unknown";

export type ExerciseState = "up" | "down" | "hold" | "idle";

export interface ExerciseResult {
  exercise: ExerciseType;
  state: ExerciseState;
  repCompleted: boolean;
  formScore: number; // 0-100
  feedback: string;
  confidence: number;
}

// MediaPipe Pose landmark indices
const LANDMARK = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

function calcAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

function avgPoint(a: Landmark, b: Landmark): Landmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

function isVisible(landmarks: Landmark[], indices: number[], threshold = 0.5): boolean {
  return indices.every((i) => (landmarks[i]?.visibility ?? 0) > threshold);
}

// Detect body orientation: "side" or "front"
function getOrientation(landmarks: Landmark[]): "side" | "front" {
  const ls = landmarks[LANDMARK.LEFT_SHOULDER];
  const rs = landmarks[LANDMARK.RIGHT_SHOULDER];
  const shoulderDist = Math.abs(ls.x - rs.x);
  return shoulderDist < 0.15 ? "side" : "front";
}

let prevState: ExerciseState = "idle";
let prevExercise: ExerciseType = "unknown";
let stateFrames = 0;
const MIN_FRAMES_FOR_REP = 3;

export function detectExercise(landmarks: Landmark[]): ExerciseResult {
  if (!landmarks || landmarks.length < 33) {
    return { exercise: "unknown", state: "idle", repCompleted: false, formScore: 0, feedback: "No body detected", confidence: 0 };
  }

  const ls = landmarks[LANDMARK.LEFT_SHOULDER];
  const rs = landmarks[LANDMARK.RIGHT_SHOULDER];
  const le = landmarks[LANDMARK.LEFT_ELBOW];
  const re = landmarks[LANDMARK.RIGHT_ELBOW];
  const lw = landmarks[LANDMARK.LEFT_WRIST];
  const rw = landmarks[LANDMARK.RIGHT_WRIST];
  const lh = landmarks[LANDMARK.LEFT_HIP];
  const rh = landmarks[LANDMARK.RIGHT_HIP];
  const lk = landmarks[LANDMARK.LEFT_KNEE];
  const rk = landmarks[LANDMARK.RIGHT_KNEE];
  const la = landmarks[LANDMARK.LEFT_ANKLE];
  const ra = landmarks[LANDMARK.RIGHT_ANKLE];

  const midShoulder = avgPoint(ls, rs);
  const midHip = avgPoint(lh, rh);
  const midKnee = avgPoint(lk, rk);
  const midAnkle = avgPoint(la, ra);

  // Calculate key angles
  const leftElbowAngle = calcAngle(ls, le, lw);
  const rightElbowAngle = calcAngle(rs, re, rw);
  const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

  const leftKneeAngle = calcAngle(lh, lk, la);
  const rightKneeAngle = calcAngle(rh, rk, ra);
  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

  const leftHipAngle = calcAngle(ls, lh, lk);
  const rightHipAngle = calcAngle(rs, rh, rk);
  const avgHipAngle = (leftHipAngle + rightHipAngle) / 2;

  // Body angle (how horizontal the torso is)
  const torsoAngle = Math.atan2(midHip.y - midShoulder.y, midHip.x - midShoulder.x) * (180 / Math.PI);
  const isHorizontal = Math.abs(torsoAngle) > 50 && Math.abs(torsoAngle) < 130;
  const isVertical = Math.abs(torsoAngle) < 40 || Math.abs(torsoAngle) > 140;

  let exercise: ExerciseType = "unknown";
  let state: ExerciseState = "idle";
  let formScore = 70;
  let feedback = "";
  let confidence = 0;

  // ===== PUSHUP DETECTION =====
  // Horizontal body, arms bending
  if (isHorizontal && midShoulder.y > 0.3) {
    exercise = "pushup";
    confidence = 0.8;

    // Check body alignment for form
    const bodyLineDeviation = Math.abs(midShoulder.y - midHip.y) + Math.abs(midHip.y - midAnkle.y);
    
    if (avgElbowAngle < 100) {
      state = "down";
      feedback = bodyLineDeviation < 0.15 ? "Great depth! 💪" : "Keep your body straight!";
      formScore = bodyLineDeviation < 0.15 ? 95 : 65;
    } else if (avgElbowAngle > 150) {
      state = "up";
      feedback = "Strong lockout! 🔥";
      formScore = 90;
    } else {
      state = "hold";
      feedback = "Lower your chest more";
      formScore = 75;
    }
  }

  // ===== SQUAT DETECTION =====
  // Vertical torso, knees bending
  else if (isVertical && avgKneeAngle < 160) {
    exercise = "squat";
    confidence = 0.85;

    const kneesOverToes = Math.abs(midKnee.x - midAnkle.x);

    if (avgKneeAngle < 100) {
      state = "down";
      feedback = kneesOverToes < 0.1 ? "Perfect squat depth! 🔥" : "Watch your knees!";
      formScore = kneesOverToes < 0.1 ? 95 : 60;
    } else if (avgKneeAngle > 160) {
      state = "up";
      feedback = "Stand tall! 💪";
      formScore = 90;
    } else {
      state = "hold";
      feedback = "Go deeper for full range";
      formScore = 75;
    }
  }

  // ===== PLANK DETECTION =====
  // Horizontal body, arms extended, holding still
  else if (isHorizontal && avgElbowAngle > 140 && avgKneeAngle > 150) {
    exercise = "plank";
    confidence = 0.75;
    state = "hold";

    const hipSag = midHip.y - ((midShoulder.y + midAnkle.y) / 2);
    if (Math.abs(hipSag) < 0.05) {
      formScore = 95;
      feedback = "Perfect plank form! Hold it! 🔥";
    } else if (hipSag > 0.05) {
      formScore = 60;
      feedback = "Hips sagging — tighten your core!";
    } else {
      formScore = 70;
      feedback = "Hips too high — lower slightly";
    }
  }

  // ===== JUMPING JACK DETECTION =====
  else if (isVertical && avgKneeAngle > 150) {
    const armSpread = Math.abs(lw.y - ls.y) + Math.abs(rw.y - rs.y);
    const legSpread = Math.abs(la.x - ra.x);

    if (armSpread < 0.2 && legSpread > 0.25) {
      exercise = "jumping_jack";
      state = "up";
      confidence = 0.7;
      formScore = 85;
      feedback = "Arms up! Nice jump! ⭐";
    } else if (legSpread < 0.15) {
      exercise = "jumping_jack";
      state = "down";
      confidence = 0.6;
      formScore = 80;
      feedback = "Ready position";
    }
  }

  // ===== LUNGE DETECTION =====
  else if (isVertical && Math.abs(leftKneeAngle - rightKneeAngle) > 30) {
    exercise = "lunge";
    confidence = 0.7;
    const frontKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);

    if (frontKneeAngle < 100) {
      state = "down";
      formScore = 85;
      feedback = "Deep lunge! Great form! 🦵";
    } else {
      state = "up";
      formScore = 80;
      feedback = "Step forward more";
    }
  }

  // ===== SIT-UP DETECTION =====
  else if (isHorizontal && avgHipAngle < 120) {
    exercise = "situp";
    confidence = 0.65;

    if (avgHipAngle < 70) {
      state = "up";
      formScore = 90;
      feedback = "Full crunch! 🔥";
    } else {
      state = "down";
      formScore = 75;
      feedback = "Engage your core";
    }
  }

  // Determine if rep completed (state transition from down->up or up->down depending on exercise)
  let repCompleted = false;
  if (exercise === prevExercise) {
    if (state === prevState) {
      stateFrames++;
    } else {
      if (stateFrames >= MIN_FRAMES_FOR_REP) {
        if (exercise === "plank") {
          // Plank doesn't count reps
        } else if (
          (prevState === "down" && state === "up") ||
          (exercise === "jumping_jack" && prevState === "up" && state === "down")
        ) {
          repCompleted = true;
        }
      }
      stateFrames = 0;
      prevState = state;
    }
  } else {
    prevExercise = exercise;
    prevState = state;
    stateFrames = 0;
  }

  if (exercise === "unknown") {
    feedback = "Position yourself for an exercise";
    confidence = 0;
  }

  return { exercise, state, repCompleted, formScore, feedback, confidence };
}

export function resetDetection() {
  prevState = "idle";
  prevExercise = "unknown";
  stateFrames = 0;
}

export const EXERCISE_NAMES: Record<ExerciseType, string> = {
  pushup: "PUSHUP",
  squat: "SQUAT",
  plank: "PLANK",
  jumping_jack: "JUMPING JACK",
  lunge: "LUNGE",
  situp: "SIT-UP",
  unknown: "DETECTING...",
};

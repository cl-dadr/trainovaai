// AI Exercise Detection Engine with EMA smoothing, precision thresholds, and detailed form corrections

export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

export type ExerciseType = "pushup" | "squat" | "plank" | "jumping_jack" | "lunge" | "situp" | "unknown";

export type ExerciseState = "up" | "down" | "hold" | "idle";

export interface FormCorrection {
  joint: string;
  issue: string;
  fix: string;
  severity: "good" | "warning" | "critical";
}

export interface ExerciseResult {
  exercise: ExerciseType;
  state: ExerciseState;
  repCompleted: boolean;
  formScore: number;
  feedback: string;
  confidence: number;
  corrections: FormCorrection[];
  angles: {
    leftElbow: number;
    rightElbow: number;
    leftKnee: number;
    rightKnee: number;
    leftHip: number;
    rightHip: number;
  };
}

// MET values for calorie estimation (Metabolic Equivalent of Task)
export const EXERCISE_MET: Record<ExerciseType, number> = {
  pushup: 8.0,
  squat: 5.5,
  plank: 3.8,
  jumping_jack: 8.0,
  lunge: 6.0,
  situp: 4.0,
  unknown: 1.2,
};

// Calories per second = MET * 3.5 * bodyWeightKg / 200 / 60
export function calcCaloriesPerSecond(exercise: ExerciseType, bodyWeightKg = 70): number {
  const met = EXERCISE_MET[exercise] || 1.2;
  return (met * 3.5 * bodyWeightKg) / 200 / 60;
}

// MediaPipe Pose landmark indices
const LM = {
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

// ─── Angle Calculation ───
function calcAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

function avgPoint(a: Landmark, b: Landmark): Landmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

// ─── EMA Smoothing for stable readings ───
const EMA_ALPHA = 0.35;
const smoothedAngles: Record<string, number> = {};

function smoothAngle(key: string, raw: number): number {
  if (!(key in smoothedAngles)) {
    smoothedAngles[key] = raw;
    return raw;
  }
  smoothedAngles[key] = EMA_ALPHA * raw + (1 - EMA_ALPHA) * smoothedAngles[key];
  return smoothedAngles[key];
}

function isVisible(landmarks: Landmark[], indices: number[], threshold = 0.55): boolean {
  return indices.every((i) => (landmarks[i]?.visibility ?? 0) > threshold);
}

// ─── State Machine ───
let prevState: ExerciseState = "idle";
let prevExercise: ExerciseType = "unknown";
let stateFrames = 0;
let exerciseFrames = 0;
const MIN_FRAMES_FOR_REP = 4;
const MIN_EXERCISE_FRAMES = 6;
const CONFIDENCE_THRESHOLD = 0.55;

const formHistory: number[] = [];
const MAX_FORM_HISTORY = 10;

function pushFormScore(score: number): number {
  formHistory.push(score);
  if (formHistory.length > MAX_FORM_HISTORY) formHistory.shift();
  return Math.round(formHistory.reduce((a, b) => a + b, 0) / formHistory.length);
}

// ─── Form Correction Generator ───
function getPushupCorrections(avgElbow: number, bodyLineDeviation: number, hipSag: number): FormCorrection[] {
  const corrections: FormCorrection[] = [];
  if (bodyLineDeviation > 0.18) {
    corrections.push({ joint: "Core", issue: "Body not aligned", fix: "Tighten abs, keep body straight like a plank", severity: "critical" });
  } else if (bodyLineDeviation > 0.12) {
    corrections.push({ joint: "Core", issue: "Slight body sag", fix: "Engage your core more", severity: "warning" });
  } else {
    corrections.push({ joint: "Core", issue: "Body aligned", fix: "Perfect alignment! Keep it up", severity: "good" });
  }
  if (avgElbow > 100 && avgElbow < 155) {
    corrections.push({ joint: "Elbows", issue: "Partial range", fix: "Lower chest closer to the ground", severity: "warning" });
  }
  if (avgElbow < 60) {
    corrections.push({ joint: "Elbows", issue: "Too deep", fix: "Don't over-extend, stop at 90°", severity: "warning" });
  }
  return corrections;
}

function getSquatCorrections(avgKnee: number, kneesOverToes: number, hipAngle: number): FormCorrection[] {
  const corrections: FormCorrection[] = [];
  if (kneesOverToes > 0.2) {
    corrections.push({ joint: "Knees", issue: "Knees past toes", fix: "Push hips back, keep knees behind toes", severity: "critical" });
  } else if (kneesOverToes > 0.12) {
    corrections.push({ joint: "Knees", issue: "Knees slightly forward", fix: "Sit back into the squat more", severity: "warning" });
  } else {
    corrections.push({ joint: "Knees", issue: "Knee tracking good", fix: "Excellent knee position!", severity: "good" });
  }
  if (avgKnee > 110 && avgKnee < 160) {
    corrections.push({ joint: "Depth", issue: "Not deep enough", fix: "Lower until thighs are parallel to floor", severity: "warning" });
  }
  if (avgKnee < 95) {
    corrections.push({ joint: "Depth", issue: "Great depth", fix: "Perfect squat depth! 🔥", severity: "good" });
  }
  return corrections;
}

function getPlankCorrections(hipSag: number): FormCorrection[] {
  const corrections: FormCorrection[] = [];
  if (Math.abs(hipSag) < 0.04) {
    corrections.push({ joint: "Hips", issue: "Perfect alignment", fix: "Hold this position! Core is engaged", severity: "good" });
  } else if (hipSag > 0.04) {
    corrections.push({ joint: "Hips", issue: "Hips sagging", fix: "Lift hips up, squeeze glutes & abs", severity: "critical" });
  } else {
    corrections.push({ joint: "Hips", issue: "Hips too high", fix: "Lower hips to neutral spine position", severity: "warning" });
  }
  return corrections;
}

function getLungeCorrections(frontKnee: number, kneeDiff: number): FormCorrection[] {
  const corrections: FormCorrection[] = [];
  if (frontKnee > 80 && frontKnee < 100) {
    corrections.push({ joint: "Front Knee", issue: "Perfect 90° angle", fix: "Great lunge form!", severity: "good" });
  } else if (frontKnee > 100) {
    corrections.push({ joint: "Front Knee", issue: "Not deep enough", fix: "Lower until front thigh is parallel", severity: "warning" });
  } else if (frontKnee < 80) {
    corrections.push({ joint: "Front Knee", issue: "Too deep", fix: "Don't let knee go past 90°", severity: "warning" });
  }
  return corrections;
}

// ─── Main Detection Function ───
export function detectExercise(landmarks: Landmark[]): ExerciseResult {
  const emptyResult: ExerciseResult = {
    exercise: "unknown", state: "idle", repCompleted: false, formScore: 0,
    feedback: "No body detected", confidence: 0, corrections: [],
    angles: { leftElbow: 0, rightElbow: 0, leftKnee: 0, rightKnee: 0, leftHip: 0, rightHip: 0 },
  };

  if (!landmarks || landmarks.length < 33) return emptyResult;

  const upperBodyVisible = isVisible(landmarks, [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW]);
  const lowerBodyVisible = isVisible(landmarks, [LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE]);

  if (!upperBodyVisible && !lowerBodyVisible) {
    return { ...emptyResult, feedback: "Move fully into frame 📷", confidence: 0.1 };
  }

  const ls = landmarks[LM.LEFT_SHOULDER], rs = landmarks[LM.RIGHT_SHOULDER];
  const le = landmarks[LM.LEFT_ELBOW], re = landmarks[LM.RIGHT_ELBOW];
  const lw = landmarks[LM.LEFT_WRIST], rw = landmarks[LM.RIGHT_WRIST];
  const lh = landmarks[LM.LEFT_HIP], rh = landmarks[LM.RIGHT_HIP];
  const lk = landmarks[LM.LEFT_KNEE], rk = landmarks[LM.RIGHT_KNEE];
  const la = landmarks[LM.LEFT_ANKLE], ra = landmarks[LM.RIGHT_ANKLE];

  const midShoulder = avgPoint(ls, rs);
  const midHip = avgPoint(lh, rh);
  const midKnee = avgPoint(lk, rk);
  const midAnkle = avgPoint(la, ra);

  const leftElbow = smoothAngle("lElbow", calcAngle(ls, le, lw));
  const rightElbow = smoothAngle("rElbow", calcAngle(rs, re, rw));
  const leftKnee = smoothAngle("lKnee", calcAngle(lh, lk, la));
  const rightKnee = smoothAngle("rKnee", calcAngle(rh, rk, ra));
  const leftHip = smoothAngle("lHip", calcAngle(ls, lh, lk));
  const rightHip = smoothAngle("rHip", calcAngle(rs, rh, rk));

  const avgElbow = (leftElbow + rightElbow) / 2;
  const avgKnee = (leftKnee + rightKnee) / 2;
  const avgHip = (leftHip + rightHip) / 2;

  const angles = {
    leftElbow: Math.round(leftElbow), rightElbow: Math.round(rightElbow),
    leftKnee: Math.round(leftKnee), rightKnee: Math.round(rightKnee),
    leftHip: Math.round(leftHip), rightHip: Math.round(rightHip),
  };

  const torsoAngle = Math.atan2(midHip.y - midShoulder.y, midHip.x - midShoulder.x) * (180 / Math.PI);
  const isHorizontal = Math.abs(torsoAngle) > 45 && Math.abs(torsoAngle) < 135;
  const isVertical = Math.abs(torsoAngle) <= 45 || Math.abs(torsoAngle) >= 135;
  const shoulderDist = Math.abs(ls.x - rs.x);
  const isSideView = shoulderDist < 0.12;

  let exercise: ExerciseType = "unknown";
  let state: ExerciseState = "idle";
  let formScore = 70;
  let feedback = "";
  let confidence = 0;
  let corrections: FormCorrection[] = [];

  // ===== PUSHUP DETECTION =====
  if (isHorizontal && midShoulder.y > 0.25) {
    const bodyLineDeviation = Math.abs(midShoulder.y - midHip.y) + Math.abs(midHip.y - midAnkle.y);
    const bodyIsFlat = bodyLineDeviation < 0.2;
    const hipSag = midHip.y - ((midShoulder.y + midAnkle.y) / 2);
    
    if (bodyIsFlat || isSideView) {
      exercise = "pushup";
      confidence = 0.85 + (bodyIsFlat ? 0.1 : 0);
      corrections = getPushupCorrections(avgElbow, bodyLineDeviation, hipSag);

      if (avgElbow < 90) {
        state = "down";
        formScore = bodyLineDeviation < 0.12 ? 95 : bodyLineDeviation < 0.18 ? 80 : 60;
        feedback = formScore >= 85 ? "Great depth! Chest near floor 💪" : "Straighten your body line!";
      } else if (avgElbow > 155) {
        state = "up";
        formScore = bodyLineDeviation < 0.15 ? 92 : 75;
        feedback = "Strong lockout! Arms fully extended 🔥";
      } else {
        state = "hold";
        feedback = "Lower your chest to the ground";
        formScore = 70;
      }
    }
  }

  // ===== SQUAT DETECTION =====
  if (exercise === "unknown" && isVertical && lowerBodyVisible) {
    if (avgKnee < 155) {
      exercise = "squat";
      const kneesOverToes = Math.abs(midKnee.x - midAnkle.x);
      confidence = 0.88;
      corrections = getSquatCorrections(avgKnee, kneesOverToes, avgHip);

      if (avgKnee < 95) {
        state = "down";
        formScore = kneesOverToes < 0.12 ? 95 : kneesOverToes < 0.2 ? 78 : 55;
        feedback = formScore >= 85 ? "Deep squat! Perfect depth! 🔥" : "Watch your knees past toes!";
      } else if (avgKnee > 160) {
        state = "up";
        formScore = 90;
        feedback = "Stand tall! Full extension 💪";
      } else {
        state = "hold";
        formScore = 72;
        feedback = "Go deeper — thighs parallel to floor";
      }
    }
  }

  // ===== PLANK DETECTION =====
  if (exercise === "unknown" && isHorizontal && avgElbow > 135 && avgKnee > 145) {
    exercise = "plank";
    confidence = 0.78;
    state = "hold";
    const hipSag = midHip.y - ((midShoulder.y + midAnkle.y) / 2);
    corrections = getPlankCorrections(hipSag);

    if (Math.abs(hipSag) < 0.04) {
      formScore = 96;
      feedback = "Perfect plank! Core engaged! 🔥";
    } else if (hipSag > 0.04) {
      formScore = Math.max(40, 80 - hipSag * 400);
      feedback = "Hips sagging — tighten your core! 💪";
    } else {
      formScore = Math.max(50, 85 + hipSag * 200);
      feedback = "Hips too high — lower slightly";
    }
  }

  // ===== JUMPING JACK DETECTION =====
  if (exercise === "unknown" && isVertical && avgKnee > 150 && upperBodyVisible) {
    const wristsAboveShoulders = (lw.y < ls.y && rw.y < rs.y);
    const legSpread = Math.abs(la.x - ra.x);

    if (wristsAboveShoulders && legSpread > 0.22) {
      exercise = "jumping_jack";
      state = "up";
      confidence = 0.75;
      formScore = 88;
      feedback = "Arms up! Nice jump! ⭐";
      corrections = [{ joint: "Arms", issue: "Arms overhead", fix: "Great extension!", severity: "good" }];
    } else if (!wristsAboveShoulders && legSpread < 0.15) {
      exercise = "jumping_jack";
      state = "down";
      confidence = 0.65;
      formScore = 82;
      feedback = "Ready position 🏃";
      corrections = [{ joint: "Arms", issue: "Arms at sides", fix: "Jump and spread!", severity: "good" }];
    }
  }

  // ===== LUNGE DETECTION =====
  if (exercise === "unknown" && isVertical && lowerBodyVisible) {
    const kneeDiff = Math.abs(leftKnee - rightKnee);
    if (kneeDiff > 35) {
      exercise = "lunge";
      confidence = 0.75;
      const frontKneeAngle = Math.min(leftKnee, rightKnee);
      const backKneeAngle = Math.max(leftKnee, rightKnee);
      corrections = getLungeCorrections(frontKneeAngle, kneeDiff);

      if (frontKneeAngle < 105 && backKneeAngle > 140) {
        state = "down";
        formScore = frontKneeAngle > 80 && frontKneeAngle < 100 ? 92 : 75;
        feedback = formScore >= 85 ? "Deep lunge! Great form! 🦵" : "Front knee at ~90° is ideal";
      } else {
        state = "up";
        formScore = 80;
        feedback = "Step forward and lower down";
      }
    }
  }

  // ===== SIT-UP DETECTION =====
  if (exercise === "unknown" && isHorizontal && avgHip < 115) {
    exercise = "situp";
    confidence = 0.68;
    corrections = [{ joint: "Core", issue: avgHip < 65 ? "Full crunch" : "Partial crunch", fix: avgHip < 65 ? "Great contraction!" : "Curl up higher, chin to chest", severity: avgHip < 65 ? "good" : "warning" }];

    if (avgHip < 65) {
      state = "up";
      formScore = 90;
      feedback = "Full crunch! 🔥";
    } else {
      state = "down";
      formScore = 72;
      feedback = "Engage your core — curl up!";
    }
  }

  // Apply confidence threshold
  if (confidence < CONFIDENCE_THRESHOLD && exercise !== "unknown") {
    exercise = "unknown";
    state = "idle";
    feedback = "Adjusting... hold your position";
    confidence = 0;
    corrections = [];
  }

  const smoothedFormScore = formScore > 0 ? pushFormScore(formScore) : 0;

  // ─── Rep Counting State Machine ───
  let repCompleted = false;

  if (exercise !== "unknown") {
    if (exercise === prevExercise) {
      exerciseFrames++;
      if (state === prevState) {
        stateFrames++;
      } else {
        if (stateFrames >= MIN_FRAMES_FOR_REP && exerciseFrames >= MIN_EXERCISE_FRAMES) {
          if (exercise !== "plank") {
            if (
              (prevState === "down" && state === "up") ||
              (exercise === "jumping_jack" && prevState === "up" && state === "down")
            ) {
              repCompleted = true;
            }
          }
        }
        stateFrames = 1;
        prevState = state;
      }
    } else {
      exerciseFrames = 1;
      prevExercise = exercise;
      prevState = state;
      stateFrames = 1;
    }
  }

  if (exercise === "unknown") {
    feedback = feedback || "Position yourself for an exercise";
    confidence = 0;
  }

  return { exercise, state, repCompleted, formScore: smoothedFormScore, feedback, confidence, corrections, angles };
}

export function resetDetection() {
  prevState = "idle";
  prevExercise = "unknown";
  stateFrames = 0;
  exerciseFrames = 0;
  formHistory.length = 0;
  Object.keys(smoothedAngles).forEach(k => delete smoothedAngles[k]);
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

// AI Exercise Detection Engine v3 — Hysteresis rep counting, ROM tracking, 
// confidence-weighted form scoring, and detailed corrections

export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

export type ExerciseType = "pushup" | "squat" | "plank" | "jumping_jack" | "lunge" | "situp" | "bicep_curl" | "shoulder_press" | "high_knees" | "unknown";

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
  rom: number;
  keypointConfidence: number;
  repQuality: "perfect" | "good" | "fair" | "poor" | "none";
  bestRepScore: number; // track best rep this session
}

// MET values for calorie estimation
export const EXERCISE_MET: Record<ExerciseType, number> = {
  pushup: 8.0,
  squat: 5.5,
  plank: 3.8,
  jumping_jack: 8.0,
  lunge: 6.0,
  situp: 4.0,
  bicep_curl: 3.5,
  shoulder_press: 5.0,
  high_knees: 8.5,
  unknown: 1.2,
};

export function calcCaloriesPerSecond(exercise: ExerciseType, bodyWeightKg = 70): number {
  const met = EXERCISE_MET[exercise] || 1.2;
  return (met * 3.5 * bodyWeightKg) / 200 / 60;
}

// MediaPipe Pose landmark indices (33 keypoints)
const LM = {
  NOSE: 0,
  LEFT_EYE: 2, RIGHT_EYE: 5,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT: 31, RIGHT_FOOT: 32,
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

// ─── EMA Smoothing ───
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

function isVisible(landmarks: Landmark[], indices: number[], threshold = 0.35): boolean {
  return indices.every((i) => (landmarks[i]?.visibility ?? 0) > threshold);
}

function avgVisibility(landmarks: Landmark[], indices: number[]): number {
  const total = indices.reduce((sum, i) => sum + (landmarks[i]?.visibility ?? 0), 0);
  return total / indices.length;
}

// ─── Hysteresis State Machine for precise rep counting ───
let prevState: ExerciseState = "idle";
let prevExercise: ExerciseType = "unknown";
let stateFrames = 0;
let exerciseFrames = 0;

// Hysteresis thresholds prevent false triggers from oscillation
const HYSTERESIS = {
  pushup: { downEnter: 85, downExit: 100, upEnter: 160, upExit: 145 },
  squat: { downEnter: 95, downExit: 110, upEnter: 160, upExit: 145 },
  lunge: { downEnter: 100, downExit: 115, upEnter: 145, upExit: 130 },
  situp: { downEnter: 70, downExit: 85, upEnter: 55, upExit: 65 },
  jumping_jack: { legSpreadEnter: 0.22, legSpreadExit: 0.18 },
  bicep_curl: { downEnter: 150, downExit: 135, upEnter: 50, upExit: 70 },
  shoulder_press: { downEnter: 90, downExit: 105, upEnter: 160, upExit: 145 },
  high_knees: { upEnter: 70, upExit: 90 },
};

// Rep cooldown to prevent double-counting
let lastRepTime = 0;
const REP_COOLDOWN_MS = 400;

const MIN_FRAMES_FOR_REP = 3;
const MIN_EXERCISE_FRAMES = 5;
const CONFIDENCE_THRESHOLD = 0.4;

// Difficulty / strictness level (Firefly-style mobility accommodation)
export type DifficultyLevel = "easy" | "medium" | "strict";
let currentDifficulty: DifficultyLevel = "medium";

export function setDifficulty(level: DifficultyLevel) {
  currentDifficulty = level;
}

export function getDifficulty(): DifficultyLevel {
  return currentDifficulty;
}

// Difficulty multipliers for form thresholds
function getDifficultyMultiplier(): { depthRelax: number; formBonus: number; cooldown: number } {
  switch (currentDifficulty) {
    case "easy": return { depthRelax: 1.15, formBonus: 10, cooldown: 300 };
    case "strict": return { depthRelax: 0.9, formBonus: -5, cooldown: 500 };
    default: return { depthRelax: 1.0, formBonus: 0, cooldown: 400 };
  }
}

const formHistory: number[] = [];
const MAX_FORM_HISTORY = 12;

// ROM tracking per rep
let repMinAngle = Infinity;
let repMaxAngle = -Infinity;
let bestRepScore = 0; // Track best rep form score this session

export function getBestRepScore(): number { return bestRepScore; }
export function resetBestRepScore() { bestRepScore = 0; }

function pushFormScore(score: number): number {
  formHistory.push(score);
  if (formHistory.length > MAX_FORM_HISTORY) formHistory.shift();
  return Math.round(formHistory.reduce((a, b) => a + b, 0) / formHistory.length);
}

function getRepQuality(score: number): ExerciseResult["repQuality"] {
  if (score >= 90) return "perfect";
  if (score >= 75) return "good";
  if (score >= 55) return "fair";
  if (score > 0) return "poor";
  return "none";
}

// ─── Form Correction Generators ───
function getPushupCorrections(avgElbow: number, bodyLineDeviation: number): FormCorrection[] {
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
  if (avgElbow >= 60 && avgElbow <= 100) {
    corrections.push({ joint: "Depth", issue: "Great depth", fix: "Perfect push-up depth! 💪", severity: "good" });
  }
  return corrections;
}

function getSquatCorrections(avgKnee: number, kneesOverToes: number): FormCorrection[] {
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
  if (avgKnee <= 95) {
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

function getLungeCorrections(frontKnee: number): FormCorrection[] {
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

function getBicepCurlCorrections(avgElbow: number, shoulderStability: number): FormCorrection[] {
  const corrections: FormCorrection[] = [];
  if (shoulderStability > 0.08) {
    corrections.push({ joint: "Shoulders", issue: "Shoulders moving", fix: "Keep upper arms pinned to your sides", severity: "critical" });
  } else {
    corrections.push({ joint: "Shoulders", issue: "Shoulders stable", fix: "Great isolation! Arms locked in place", severity: "good" });
  }
  if (avgElbow < 40) {
    corrections.push({ joint: "Curl", issue: "Full contraction", fix: "Perfect squeeze at the top! 💪", severity: "good" });
  } else if (avgElbow > 150) {
    corrections.push({ joint: "Curl", issue: "Full extension", fix: "Good starting position", severity: "good" });
  }
  return corrections;
}

function getShoulderPressCorrections(avgElbow: number, wristAlignment: number): FormCorrection[] {
  const corrections: FormCorrection[] = [];
  if (avgElbow > 165) {
    corrections.push({ joint: "Arms", issue: "Full lockout", fix: "Great press! Full extension 🔥", severity: "good" });
  } else if (avgElbow < 85) {
    corrections.push({ joint: "Arms", issue: "At bottom", fix: "Press up through full range", severity: "good" });
  }
  if (wristAlignment > 0.15) {
    corrections.push({ joint: "Wrists", issue: "Wrists misaligned", fix: "Keep wrists directly over elbows", severity: "warning" });
  }
  return corrections;
}

// ─── Main Detection Function ───
export function detectExercise(landmarks: Landmark[], lockedExercise?: ExerciseType | null): ExerciseResult {
   const emptyResult: ExerciseResult = {
    exercise: "unknown", state: "idle", repCompleted: false, formScore: 0,
    feedback: "No body detected", confidence: 0, corrections: [],
    angles: { leftElbow: 0, rightElbow: 0, leftKnee: 0, rightKnee: 0, leftHip: 0, rightHip: 0 },
    rom: 0, keypointConfidence: 0, repQuality: "none", bestRepScore,
  };

  if (!landmarks || landmarks.length < 33) return emptyResult;

  const upperBodyVisible = isVisible(landmarks, [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW]);
  const lowerBodyVisible = isVisible(landmarks, [LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE]);

  const keypointConfidence = avgVisibility(landmarks, [
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW,
    LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
  ]);

  if (!upperBodyVisible && !lowerBodyVisible) {
    return { ...emptyResult, feedback: "Move fully into frame 📷", confidence: 0.1, keypointConfidence };
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
  // In screen coords, standing person has torso ~90° (y goes down), lying ~0°/180°
  const isVertical = Math.abs(torsoAngle) > 45 && Math.abs(torsoAngle) < 135;
  const isHorizontal = !isVertical;
  const shoulderDist = Math.abs(ls.x - rs.x);
  const isSideView = shoulderDist < 0.12;

  let exercise: ExerciseType = "unknown";
  let state: ExerciseState = "idle";
  let formScore = 70;
  let feedback = "";
  let confidence = 0;
  let corrections: FormCorrection[] = [];
  let rom = 0;

  // Track ROM for the current movement
  const primaryAngle = isHorizontal ? avgElbow : avgKnee;
  repMinAngle = Math.min(repMinAngle, primaryAngle);
  repMaxAngle = Math.max(repMaxAngle, primaryAngle);
  if (repMaxAngle > repMinAngle) {
    rom = Math.min(100, Math.round(((repMaxAngle - repMinAngle) / 120) * 100));
  }

  // ===== PUSHUP DETECTION =====
  if (isHorizontal && midShoulder.y > 0.25) {
    const bodyLineDeviation = Math.abs(midShoulder.y - midHip.y) + Math.abs(midHip.y - midAnkle.y);
    const bodyIsFlat = bodyLineDeviation < 0.2;

    if (bodyIsFlat || isSideView) {
      exercise = "pushup";
      confidence = 0.88 + (bodyIsFlat ? 0.08 : 0);
      corrections = getPushupCorrections(avgElbow, bodyLineDeviation);

      if (avgElbow < HYSTERESIS.pushup.downEnter) {
        state = "down";
        formScore = bodyLineDeviation < 0.12 ? 95 : bodyLineDeviation < 0.18 ? 80 : 60;
        feedback = formScore >= 85 ? "Great depth! Chest near floor 💪" : "Straighten your body line!";
      } else if (avgElbow > HYSTERESIS.pushup.upEnter) {
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
      confidence = 0.90;
      corrections = getSquatCorrections(avgKnee, kneesOverToes);

      if (avgKnee < HYSTERESIS.squat.downEnter) {
        state = "down";
        formScore = kneesOverToes < 0.12 ? 95 : kneesOverToes < 0.2 ? 78 : 55;
        feedback = formScore >= 85 ? "Deep squat! Perfect depth! 🔥" : "Watch your knees past toes!";
      } else if (avgKnee > HYSTERESIS.squat.upEnter) {
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
    confidence = 0.80;
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

    if (wristsAboveShoulders && legSpread > HYSTERESIS.jumping_jack.legSpreadEnter) {
      exercise = "jumping_jack";
      state = "up";
      confidence = 0.78;
      formScore = 88;
      feedback = "Arms up! Nice jump! ⭐";
      corrections = [{ joint: "Arms", issue: "Arms overhead", fix: "Great extension!", severity: "good" }];
    } else if (!wristsAboveShoulders && legSpread < 0.15) {
      exercise = "jumping_jack";
      state = "down";
      confidence = 0.68;
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
      confidence = 0.78;
      const frontKneeAngle = Math.min(leftKnee, rightKnee);
      const backKneeAngle = Math.max(leftKnee, rightKnee);
      corrections = getLungeCorrections(frontKneeAngle);

      if (frontKneeAngle < HYSTERESIS.lunge.downEnter && backKneeAngle > 140) {
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
    confidence = 0.70;
    corrections = [{ joint: "Core", issue: avgHip < 65 ? "Full crunch" : "Partial crunch", fix: avgHip < 65 ? "Great contraction!" : "Curl up higher, chin to chest", severity: avgHip < 65 ? "good" : "warning" }];

    if (avgHip < HYSTERESIS.situp.upEnter) {
      state = "up";
      formScore = 90;
      feedback = "Full crunch! 🔥";
    } else {
      state = "down";
      formScore = 72;
      feedback = "Engage your core — curl up!";
    }
  }

  // ===== BICEP CURL DETECTION =====
  if (exercise === "unknown" && isVertical && upperBodyVisible && avgKnee > 155) {
    const shoulderStability = Math.abs(ls.y - rs.y);
    const elbowsNearBody = Math.abs(le.x - ls.x) < 0.1 && Math.abs(re.x - rs.x) < 0.1;
    
    if (elbowsNearBody && (avgElbow < 70 || avgElbow > 140)) {
      exercise = "bicep_curl";
      confidence = 0.72;
      corrections = getBicepCurlCorrections(avgElbow, shoulderStability);

      if (avgElbow < HYSTERESIS.bicep_curl.upEnter) {
        state = "up";
        formScore = shoulderStability < 0.05 ? 94 : 78;
        feedback = "Squeeze at the top! 💪";
      } else if (avgElbow > HYSTERESIS.bicep_curl.downEnter) {
        state = "down";
        formScore = 85;
        feedback = "Full extension — controlled!";
      } else {
        state = "hold";
        formScore = 75;
        feedback = "Curl through full range";
      }
    }
  }

  // ===== SHOULDER PRESS DETECTION =====
  if (exercise === "unknown" && isVertical && upperBodyVisible) {
    const wristsAboveHead = lw.y < ls.y - 0.15 && rw.y < rs.y - 0.15;
    const wristsAtShoulders = Math.abs(lw.y - ls.y) < 0.1 && Math.abs(rw.y - rs.y) < 0.1;
    
    if (wristsAboveHead || wristsAtShoulders) {
      const wristAlignment = Math.abs(lw.x - le.x) + Math.abs(rw.x - re.x);
      if (avgElbow > 150 && wristsAboveHead) {
        exercise = "shoulder_press";
        state = "up";
        confidence = 0.70;
        formScore = 90;
        feedback = "Full press! Great lockout! 🔥";
        corrections = getShoulderPressCorrections(avgElbow, wristAlignment);
      } else if (avgElbow < 95 && wristsAtShoulders) {
        exercise = "shoulder_press";
        state = "down";
        confidence = 0.65;
        formScore = 82;
        feedback = "Press up overhead";
        corrections = getShoulderPressCorrections(avgElbow, wristAlignment);
      }
    }
  }

  // ===== HIGH KNEES DETECTION =====
  if (exercise === "unknown" && isVertical && lowerBodyVisible) {
    const leftKneeHigh = lk.y < lh.y + 0.02;
    const rightKneeHigh = rk.y < rh.y + 0.02;
    
    if (leftKneeHigh || rightKneeHigh) {
      exercise = "high_knees";
      confidence = 0.68;
      state = leftKneeHigh || rightKneeHigh ? "up" : "down";
      formScore = (leftKneeHigh && lk.y < lh.y - 0.03) || (rightKneeHigh && rk.y < rh.y - 0.03) ? 92 : 75;
      feedback = formScore >= 85 ? "Knees high! Great cardio! 🏃" : "Drive knees higher — hip level!";
      corrections = [{ joint: "Knees", issue: formScore >= 85 ? "Hip height" : "Below hip", fix: formScore >= 85 ? "Perfect height! 🔥" : "Lift knees to hip level", severity: formScore >= 85 ? "good" : "warning" }];
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

  // Apply locked exercise filter — ignore detections that don't match
  if (lockedExercise && lockedExercise !== "unknown" && exercise !== "unknown" && exercise !== lockedExercise) {
    exercise = "unknown";
    state = "idle";
    feedback = `Locked to ${EXERCISE_NAMES[lockedExercise]} — get in position`;
    confidence = 0;
    corrections = [];
  }

  const smoothedFormScore = formScore > 0 ? pushFormScore(formScore) : 0;

  // ─── Hysteresis Rep Counting State Machine ───
  let repCompleted = false;
  const now = Date.now();

  if (exercise !== "unknown") {
    if (exercise === prevExercise) {
      exerciseFrames++;
      if (state === prevState) {
        stateFrames++;
      } else {
        if (stateFrames >= MIN_FRAMES_FOR_REP && exerciseFrames >= MIN_EXERCISE_FRAMES) {
          if (exercise !== "plank") {
            const timeSinceLastRep = now - lastRepTime;
            if (timeSinceLastRep >= REP_COOLDOWN_MS) {
              if (
                (prevState === "down" && state === "up") ||
                (exercise === "jumping_jack" && prevState === "up" && state === "down") ||
                (exercise === "high_knees" && prevState === "up" && state === "down") ||
                (exercise === "bicep_curl" && prevState === "up" && state === "down")
              ) {
                repCompleted = true;
                lastRepTime = now;
                // Reset ROM tracking for next rep
                repMinAngle = Infinity;
                repMaxAngle = -Infinity;
              }
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

  const repQuality = getRepQuality(smoothedFormScore);

  return {
    exercise, state, repCompleted, formScore: smoothedFormScore, feedback, confidence, corrections, angles,
    rom, keypointConfidence, repQuality,
  };
}

export function resetDetection() {
  prevState = "idle";
  prevExercise = "unknown";
  stateFrames = 0;
  exerciseFrames = 0;
  lastRepTime = 0;
  repMinAngle = Infinity;
  repMaxAngle = -Infinity;
  formHistory.length = 0;
  Object.keys(smoothedAngles).forEach(k => delete smoothedAngles[k]);
}

export const EXERCISE_NAMES: Record<ExerciseType, string> = {
  pushup: "PUSH-UP",
  squat: "SQUAT",
  plank: "PLANK",
  jumping_jack: "JUMPING JACK",
  lunge: "LUNGE",
  situp: "SIT-UP",
  bicep_curl: "BICEP CURL",
  shoulder_press: "SHOULDER PRESS",
  high_knees: "HIGH KNEES",
  unknown: "DETECTING...",
};

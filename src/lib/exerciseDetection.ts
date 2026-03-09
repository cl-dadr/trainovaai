// AI Exercise Detection Engine with EMA smoothing and precision thresholds

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
  formScore: number;
  feedback: string;
  confidence: number;
  angles: {
    leftElbow: number;
    rightElbow: number;
    leftKnee: number;
    rightKnee: number;
    leftHip: number;
    rightHip: number;
  };
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
const EMA_ALPHA = 0.35; // Higher = more responsive, lower = smoother
const smoothedAngles: Record<string, number> = {};

function smoothAngle(key: string, raw: number): number {
  if (!(key in smoothedAngles)) {
    smoothedAngles[key] = raw;
    return raw;
  }
  smoothedAngles[key] = EMA_ALPHA * raw + (1 - EMA_ALPHA) * smoothedAngles[key];
  return smoothedAngles[key];
}

// ─── Visibility Check ───
function isVisible(landmarks: Landmark[], indices: number[], threshold = 0.55): boolean {
  return indices.every((i) => (landmarks[i]?.visibility ?? 0) > threshold);
}

// ─── State Machine ───
let prevState: ExerciseState = "idle";
let prevExercise: ExerciseType = "unknown";
let stateFrames = 0;
let exerciseFrames = 0; // Frames staying on same exercise type
const MIN_FRAMES_FOR_REP = 4;       // Must hold state for 4 frames before counting
const MIN_EXERCISE_FRAMES = 6;     // Must detect same exercise for 6 frames before committing
const CONFIDENCE_THRESHOLD = 0.55;  // Minimum confidence to accept detection

// Form score history for averaging
const formHistory: number[] = [];
const MAX_FORM_HISTORY = 10;

function pushFormScore(score: number): number {
  formHistory.push(score);
  if (formHistory.length > MAX_FORM_HISTORY) formHistory.shift();
  return Math.round(formHistory.reduce((a, b) => a + b, 0) / formHistory.length);
}

// ─── Main Detection Function ───
export function detectExercise(landmarks: Landmark[]): ExerciseResult {
  const emptyResult: ExerciseResult = {
    exercise: "unknown", state: "idle", repCompleted: false, formScore: 0,
    feedback: "No body detected", confidence: 0,
    angles: { leftElbow: 0, rightElbow: 0, leftKnee: 0, rightKnee: 0, leftHip: 0, rightHip: 0 },
  };

  if (!landmarks || landmarks.length < 33) return emptyResult;

  // Check key landmark visibility
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

  // Calculate and smooth all key angles
  const rawLeftElbow = calcAngle(ls, le, lw);
  const rawRightElbow = calcAngle(rs, re, rw);
  const rawLeftKnee = calcAngle(lh, lk, la);
  const rawRightKnee = calcAngle(rh, rk, ra);
  const rawLeftHip = calcAngle(ls, lh, lk);
  const rawRightHip = calcAngle(rs, rh, rk);

  const leftElbow = smoothAngle("lElbow", rawLeftElbow);
  const rightElbow = smoothAngle("rElbow", rawRightElbow);
  const leftKnee = smoothAngle("lKnee", rawLeftKnee);
  const rightKnee = smoothAngle("rKnee", rawRightKnee);
  const leftHip = smoothAngle("lHip", rawLeftHip);
  const rightHip = smoothAngle("rHip", rawRightHip);

  const avgElbow = (leftElbow + rightElbow) / 2;
  const avgKnee = (leftKnee + rightKnee) / 2;
  const avgHip = (leftHip + rightHip) / 2;

  const angles = {
    leftElbow: Math.round(leftElbow),
    rightElbow: Math.round(rightElbow),
    leftKnee: Math.round(leftKnee),
    rightKnee: Math.round(rightKnee),
    leftHip: Math.round(leftHip),
    rightHip: Math.round(rightHip),
  };

  // Torso orientation
  const torsoAngle = Math.atan2(midHip.y - midShoulder.y, midHip.x - midShoulder.x) * (180 / Math.PI);
  const isHorizontal = Math.abs(torsoAngle) > 45 && Math.abs(torsoAngle) < 135;
  const isVertical = Math.abs(torsoAngle) <= 45 || Math.abs(torsoAngle) >= 135;

  // Shoulder width for side/front detection
  const shoulderDist = Math.abs(ls.x - rs.x);
  const isSideView = shoulderDist < 0.12;

  let exercise: ExerciseType = "unknown";
  let state: ExerciseState = "idle";
  let formScore = 70;
  let feedback = "";
  let confidence = 0;

  // ===== PUSHUP DETECTION =====
  if (isHorizontal && midShoulder.y > 0.25) {
    const bodyLineDeviation = Math.abs(midShoulder.y - midHip.y) + Math.abs(midHip.y - midAnkle.y);
    const bodyIsFlat = bodyLineDeviation < 0.2;
    
    if (bodyIsFlat || isSideView) {
      exercise = "pushup";
      confidence = 0.85 + (bodyIsFlat ? 0.1 : 0);

      if (avgElbow < 90) {
        state = "down";
        formScore = bodyLineDeviation < 0.12 ? 95 : bodyLineDeviation < 0.18 ? 80 : 60;
        feedback = formScore >= 85 ? "Great depth! 💪" : "Keep your body in a straight line!";
      } else if (avgElbow > 155) {
        state = "up";
        formScore = bodyLineDeviation < 0.15 ? 92 : 75;
        feedback = "Strong lockout! 🔥";
      } else {
        state = "hold";
        feedback = "Go lower for full rep";
        formScore = 70;
      }
    }
  }

  // ===== SQUAT DETECTION =====
  if (exercise === "unknown" && isVertical && lowerBodyVisible) {
    if (avgKnee < 155) {
      exercise = "squat";
      const kneesOverToes = Math.abs(midKnee.x - midAnkle.x);
      const hipDepth = midHip.y - midKnee.y; // Positive when hips above knees
      confidence = 0.88;

      if (avgKnee < 95) {
        state = "down";
        formScore = kneesOverToes < 0.12 ? 95 : kneesOverToes < 0.2 ? 78 : 55;
        feedback = formScore >= 85 ? "Deep squat! Perfect depth! 🔥" : "Watch your knees past toes!";
      } else if (avgKnee > 160) {
        state = "up";
        formScore = 90;
        feedback = "Stand tall! 💪";
      } else {
        state = "hold";
        formScore = 72;
        feedback = "Go deeper for full range of motion";
      }
    }
  }

  // ===== PLANK DETECTION =====
  if (exercise === "unknown" && isHorizontal && avgElbow > 135 && avgKnee > 145) {
    exercise = "plank";
    confidence = 0.78;
    state = "hold";

    const hipSag = midHip.y - ((midShoulder.y + midAnkle.y) / 2);
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
    } else if (!wristsAboveShoulders && legSpread < 0.15) {
      exercise = "jumping_jack";
      state = "down";
      confidence = 0.65;
      formScore = 82;
      feedback = "Ready position 🏃";
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

  // Apply confidence threshold — reject low-confidence detections
  if (confidence < CONFIDENCE_THRESHOLD && exercise !== "unknown") {
    exercise = "unknown";
    state = "idle";
    feedback = "Adjusting... hold your position";
    confidence = 0;
  }

  // Smooth form score
  const smoothedFormScore = formScore > 0 ? pushFormScore(formScore) : 0;

  // ─── Rep Counting State Machine ───
  let repCompleted = false;

  if (exercise !== "unknown") {
    if (exercise === prevExercise) {
      exerciseFrames++;
      if (state === prevState) {
        stateFrames++;
      } else {
        // State changed — check if we can count a rep
        if (stateFrames >= MIN_FRAMES_FOR_REP && exerciseFrames >= MIN_EXERCISE_FRAMES) {
          if (exercise === "plank") {
            // Plank doesn't count reps
          } else if (
            (prevState === "down" && state === "up") ||
            (exercise === "jumping_jack" && prevState === "up" && state === "down")
          ) {
            repCompleted = true;
          }
        }
        stateFrames = 1;
        prevState = state;
      }
    } else {
      // Exercise changed — require minimum frames before committing
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

  return {
    exercise,
    state,
    repCompleted,
    formScore: smoothedFormScore,
    feedback,
    confidence,
    angles,
  };
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

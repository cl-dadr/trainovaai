

# Fix Camera Detection — Bulletproof Cross-Platform Solution

## Root Cause Analysis

The camera fails because of two critical issues:

1. **CDN scripts load AFTER the React app** — The MediaPipe `<script>` tags are at the bottom of `<body>`, after `<div id="root">`. By the time the component mounts, `window.Pose` may still be `undefined`, causing the "Camera engine failed to load" error.

2. **Preload warmup blocks the constructor** — The `useEffect` on mount creates a Pose instance and calls `pose.send()` on a tiny canvas. If this warmup hasn't finished by the time `startDetection` runs, reusing `preloadedPoseRef.current` can fail because the model is mid-initialization.

3. **`onResults` draws to canvas but `DetectingView` renders its own `<Webcam>`** — When `isDetecting` toggles, React unmounts the CameraSetup webcam and mounts DetectingView's webcam. The new `<video>` element needs time to acquire the stream, but `initPose` starts immediately, finding `video.readyState < 2` and burning through retries.

## Plan

### 1. Move CDN scripts to `<head>` with `defer` (index.html)
- Move all 3 MediaPipe script tags into `<head>` so they load earlier
- This ensures `window.Pose` is available when the component mounts

### 2. Rewrite camera initialization (CameraPage.tsx)
- **Remove the fragile preload warmup** — it causes race conditions
- **Wait for CDN readiness** with a polling check for `window.Pose` before proceeding
- **Wait for video stream properly** — listen for the `loadeddata` event on the video element instead of polling `readyState`
- **Create Pose fresh each time** — don't reuse preloaded instance (avoids state corruption)
- **Add user-visible loading state** — show "Loading AI engine..." while MediaPipe loads

### 3. Fix DetectingView webcam mounting (DetectingView.tsx)
- Ensure webcam `videoConstraints` match CameraSetup for consistent stream acquisition
- Add `onUserMedia` callback to signal when video is truly ready

### 4. Improve exercise detection sensitivity (exerciseDetection.ts)
- Lower `MIN_FRAMES_FOR_REP` from 3 to 2 for faster rep registration
- Lower `MIN_EXERCISE_FRAMES` from 5 to 3 so exercises are recognized faster
- Lower `CONFIDENCE_THRESHOLD` from 0.35 to 0.25 — the current value rejects valid detections
- Relax visibility threshold from 0.3 to 0.2 for better detection in poor lighting
- Make squat detection trigger at `avgKnee < 165` (was 155) so partial squats register
- Make jumping jack leg spread threshold 0.18 (was 0.22) for easier detection
- Make bicep curl detection less strict — remove `elbowsNearBody` requirement
- Make high knees threshold more lenient

### 5. Add loading UI state
- New `cameraStatus` state: `"loading" | "ready" | "error"`
- Show spinner/text overlay while MediaPipe initializes
- Only show "failed" after genuine timeout (10 seconds)

## Technical Details

The key architectural fix is the initialization sequence:

```text
User clicks "Start"
  → isDetecting = true
  → DetectingView mounts with <Webcam>
  → Poll for window.Pose (max 8s)
  → Listen for video "loadeddata" event
  → Create new Pose(), setOptions, onResults
  → Start requestAnimationFrame loop
  → Show "Body detected!" toast
```

This eliminates the race condition between preloading and detection start.


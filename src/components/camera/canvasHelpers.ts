import type { Landmark } from "@/lib/exerciseDetection";

export function drawAngleLabel(ctx: CanvasRenderingContext2D, landmark: Landmark, angle: number, label: string, w: number, h: number, color: string) {
  const x = (1 - landmark.x) * w, y = landmark.y * h;
  ctx.save();
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.lineWidth = 4;
  const text = `${label}:${angle}°`;
  ctx.strokeText(text, x + 8, y - 6);
  ctx.fillText(text, x + 8, y - 6);
  ctx.restore();
}

export function drawFormIndicator(ctx: CanvasRenderingContext2D, score: number, w: number) {
  const barW = 140, barH = 10, x = w - barW - 14, y = 28;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.roundRect(x - 6, y - 18, barW + 12, 36, 8);
  ctx.fill();
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "#fff";
  ctx.fillText(`FORM ${score}%`, x, y - 4);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.roundRect(x, y + 4, barW, barH, 5);
  ctx.fill();
  const color = score >= 85 ? "hsl(160,100%,50%)" : score >= 60 ? "hsl(25,100%,55%)" : "hsl(0,85%,60%)";
  ctx.fillStyle = color;
  ctx.roundRect(x, y + 4, (score / 100) * barW, barH, 5);
  ctx.fill();
  ctx.restore();
}

export function drawKeypointConfidence(ctx: CanvasRenderingContext2D, confidence: number, _w: number) {
  const x = 10, y = 18;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.roundRect(x, y - 12, 110, 22, 6);
  ctx.fill();
  ctx.font = "bold 10px monospace";
  const color = confidence > 0.8 ? "hsl(160,100%,50%)" : confidence > 0.6 ? "hsl(50,100%,55%)" : "hsl(0,85%,60%)";
  ctx.fillStyle = color;
  ctx.fillText(`👁 TRACKING ${Math.round(confidence * 100)}%`, x + 4, y + 2);
  ctx.restore();
}

export function drawRepFlash(ctx: CanvasRenderingContext2D, w: number, h: number, quality: string) {
  ctx.save();
  const colors: Record<string, string> = {
    perfect: "rgba(0,255,128,0.15)",
    good: "rgba(0,200,255,0.12)",
    fair: "rgba(255,165,0,0.1)",
    poor: "rgba(255,50,50,0.1)",
  };
  ctx.fillStyle = colors[quality] || "rgba(255,255,255,0.05)";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export const LM = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
};

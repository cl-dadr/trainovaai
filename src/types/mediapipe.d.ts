// MediaPipe loaded via CDN script tags — global declarations
declare class Pose {
  constructor(config?: { locateFile?: (file: string) => string });
  setOptions(options: Record<string, any>): void;
  onResults(callback: (results: any) => void): void;
  send(inputs: { image: HTMLVideoElement | HTMLCanvasElement }): Promise<void>;
  close(): void;
}

declare const POSE_CONNECTIONS: Array<[number, number]>;

declare function drawConnectors(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  connections: Array<[number, number]>,
  style?: Record<string, any>
): void;

declare function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  style?: Record<string, any>
): void;

declare namespace globalThis {
  class Camera {
    constructor(
      video: HTMLVideoElement,
      config: { onFrame: () => Promise<void>; width?: number; height?: number }
    );
    start(): void;
    stop(): void;
  }
}

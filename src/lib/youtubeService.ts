// YouTube search using Piped API (privacy-friendly YouTube proxy, no API key needed)
export interface YouTubeVideo {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  lengthSeconds: number;
  duration: string;
  audioUrl?: string;
}

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.in.projectsegfau.lt",
  "https://pipedapi.r4fo.com",
];

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

let workingInstance: string | null = null;

async function getWorkingInstance(): Promise<string> {
  if (workingInstance) return workingInstance;
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}/search?q=test&filter=music_songs`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        workingInstance = instance;
        return instance;
      }
    } catch { continue; }
  }
  return PIPED_INSTANCES[0];
}

export async function searchYouTube(query: string): Promise<YouTubeVideo[]> {
  try {
    const instance = await getWorkingInstance();
    const res = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`);
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    return (data.items || [])
      .filter((item: any) => item.type === "stream" && item.duration > 0)
      .slice(0, 30)
      .map((item: any) => ({
        id: item.url?.replace("/watch?v=", "") || "",
        title: item.title || "Unknown",
        author: item.uploaderName || "Unknown",
        thumbnail: item.thumbnail || "",
        lengthSeconds: item.duration || 0,
        duration: formatDuration(item.duration || 0),
      }));
  } catch (error) {
    console.error("YouTube search error:", error);
    return [];
  }
}

export async function getYouTubeAudioUrl(videoId: string): Promise<string | null> {
  try {
    const instance = await getWorkingInstance();
    const res = await fetch(`${instance}/streams/${videoId}`);
    if (!res.ok) throw new Error("Stream fetch failed");
    const data = await res.json();
    // Get best audio stream
    const audioStreams = data.audioStreams || [];
    if (audioStreams.length === 0) return null;
    // Sort by bitrate, pick highest quality
    const best = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    return best?.url || null;
  } catch (error) {
    console.error("Audio URL fetch error:", error);
    return null;
  }
}

// YouTube search using Invidious public API (no API key needed)
export interface YouTubeVideo {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  lengthSeconds: number;
  duration: string;
}

const INVIDIOUS_INSTANCES = [
  "https://vid.puffyan.us",
  "https://invidious.snopyta.org",
  "https://yewtu.be",
  "https://invidious.kavin.rocks",
];

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

async function tryInstance(instance: string, query: string): Promise<YouTubeVideo[]> {
  const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data
    .filter((item: any) => item.type === "video" && item.lengthSeconds > 0)
    .slice(0, 20)
    .map((item: any) => ({
      id: item.videoId,
      title: item.title,
      author: item.author,
      thumbnail: item.videoThumbnails?.[4]?.url || item.videoThumbnails?.[0]?.url || "",
      lengthSeconds: item.lengthSeconds,
      duration: formatDuration(item.lengthSeconds),
    }));
}

export async function searchYouTube(query: string): Promise<YouTubeVideo[]> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      return await tryInstance(instance, query);
    } catch {
      continue;
    }
  }
  return [];
}

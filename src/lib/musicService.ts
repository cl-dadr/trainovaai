// Music service using iTunes Search API - free, no auth needed, 30s previews

export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationMs: number;
  previewUrl: string;
  artworkUrl: string;
  genre: string;
}

const ITUNES_API = "https://itunes.apple.com/search";

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function mapTrack(item: any): Track {
  return {
    id: item.trackId,
    title: item.trackName || "Unknown",
    artist: item.artistName || "Unknown",
    album: item.collectionName || "",
    duration: formatDuration(item.trackTimeMillis || 0),
    durationMs: item.trackTimeMillis || 0,
    previewUrl: item.previewUrl || "",
    artworkUrl: item.artworkUrl100?.replace("100x100", "300x300") || "",
    genre: item.primaryGenreName || "",
  };
}

export async function searchTracks(query: string, limit = 50): Promise<Track[]> {
  try {
    const url = `${ITUNES_API}?term=${encodeURIComponent(query)}&media=music&limit=${limit}&entity=song`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    return (data.results || [])
      .filter((item: any) => item.previewUrl)
      .map(mapTrack);
  } catch (error) {
    console.error("iTunes search error:", error);
    return [];
  }
}

// Pre-defined search queries for categories to simulate a large library
export const categoryQueries: Record<string, string[]> = {
  Phonk: ["phonk music", "phonk drift", "phonk gym"],
  Workout: ["workout music", "gym motivation", "fitness beats", "pump up music"],
  Running: ["running music", "running beats", "jogging playlist"],
  "High Energy": ["high energy edm", "hype music", "electronic dance"],
  Chill: ["chill lofi", "chill workout", "recovery music"],
  Hardstyle: ["hardstyle music", "hard bass", "hard dance"],
  Trap: ["trap music", "trap beats", "bass trap"],
  EDM: ["edm music", "electronic dance music", "festival edm"],
};

export async function getTracksForCategory(category: string): Promise<Track[]> {
  const queries = categoryQueries[category] || [`${category} music`];
  const query = queries[Math.floor(Math.random() * queries.length)];
  return searchTracks(query, 50);
}

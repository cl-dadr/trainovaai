// Client-side YouTube search fallback using YouTube's public suggestion + oEmbed APIs
// Used when server-side search fails (quota exceeded, free APIs blocked)

export interface ClientYouTubeVideo {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  lengthSeconds: number;
  duration: string;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "LIVE";
  const hrs = Math.floor(seconds / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  const sec = seconds % 60;
  if (hrs > 0) return `${hrs}:${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// Use YouTube's public noembed/oembed to get video info
async function getVideoInfo(videoId: string): Promise<{ title: string; author: string } | null> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || "Unknown",
      author: data.author_name || "Unknown",
    };
  } catch {
    return null;
  }
}

// Use Invidious API from client side (some instances allow CORS)
const CLIENT_INVIDIOUS = [
  "https://inv.nadeko.net",
  "https://vid.puffyan.us",
  "https://invidious.lunar.icu",
];

async function searchInvidiousClient(query: string): Promise<ClientYouTubeVideo[]> {
  for (const instance of CLIENT_INVIDIOUS) {
    try {
      const res = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data)) continue;

      const items = data
        .filter((item: any) => item.type === "video" && item.lengthSeconds > 0)
        .slice(0, 15)
        .map((item: any) => ({
          id: item.videoId || "",
          title: item.title || "Unknown",
          author: item.author || "Unknown",
          thumbnail: `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
          lengthSeconds: item.lengthSeconds || 0,
          duration: formatDuration(item.lengthSeconds || 0),
        }))
        .filter((item: ClientYouTubeVideo) => item.id);

      if (items.length > 0) {
        console.log(`Client Invidious success: ${instance}, ${items.length} results`);
        return items;
      }
    } catch {
      // try next instance
    }
  }
  return [];
}

// Use YouTube's public search suggestion endpoint + scrape video IDs from autocomplete
// This is a lightweight approach that doesn't require API keys
async function searchYouTubeSuggestions(query: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const text = await res.text();
    // Parse JSONP response
    const match = text.match(/\((\[.*\])\)/);
    if (!match) return [];
    const data = JSON.parse(match[1]);
    // data[1] contains suggestion arrays
    return (data[1] || []).map((s: any) => (Array.isArray(s) ? s[0] : s)).filter(Boolean).slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Client-side YouTube search fallback.
 * Tries Invidious from browser (different IP than server = may work).
 * Returns empty array if all methods fail.
 */
export async function clientSideYouTubeSearch(query: string): Promise<ClientYouTubeVideo[]> {
  console.log(`Client-side search fallback for: "${query}"`);
  
  // Try Invidious from client (browser IP != server datacenter IP)
  const results = await searchInvidiousClient(query);
  if (results.length > 0) return results;

  console.log("Client-side search: no results from any source");
  return [];
}

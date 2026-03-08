// Client-side YouTube search fallback using multiple free APIs
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

// Expanded list of Invidious instances for client-side search
const CLIENT_INVIDIOUS = [
  "https://inv.nadeko.net",
  "https://vid.puffyan.us",
  "https://invidious.lunar.icu",
  "https://invidious.privacyredirect.com",
  "https://iv.datura.network",
  "https://invidious.nerdvpn.de",
  "https://invidious.fdn.fr",
  "https://invidious.perennialte.ch",
  "https://yt.artemislena.eu",
  "https://invidious.protokoll-11.de",
];

// Piped instances for client-side
const CLIENT_PIPED = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.r4fo.com",
  "https://api.piped.yt",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.drgns.space",
  "https://pipedapi.in.projectsegfau.lt",
];

async function searchInvidiousClient(query: string): Promise<ClientYouTubeVideo[]> {
  for (const instance of CLIENT_INVIDIOUS) {
    try {
      const res = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data)) continue;

      const items = data
        .filter((item: any) => item.type === "video" && item.lengthSeconds > 0)
        .slice(0, 20)
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

async function searchPipedClient(query: string): Promise<ClientYouTubeVideo[]> {
  for (const instance of CLIENT_PIPED) {
    try {
      const res = await fetch(
        `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const rawItems = data.items || data.content || [];
      
      const items = rawItems
        .filter((item: any) => (item.type === "stream" || item.url) && (item.duration > 0 || item.lengthSeconds > 0))
        .slice(0, 20)
        .map((item: any) => {
          const videoId = (item.url || "").replace("/watch?v=", "");
          const secs = item.duration || item.lengthSeconds || 0;
          return {
            id: videoId,
            title: item.title || "Unknown",
            author: item.uploaderName || item.uploader || "Unknown",
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            lengthSeconds: secs,
            duration: formatDuration(secs),
          };
        })
        .filter((item: ClientYouTubeVideo) => item.id);

      if (items.length > 0) {
        console.log(`Client Piped success: ${instance}, ${items.length} results`);
        return items;
      }
    } catch {
      // try next instance
    }
  }
  return [];
}

/**
 * Client-side YouTube search fallback.
 * Races Invidious and Piped from browser (different IP than server).
 */
export async function clientSideYouTubeSearch(query: string): Promise<ClientYouTubeVideo[]> {
  console.log(`Client-side search fallback for: "${query}"`);
  
  // Try both in parallel, return first success
  const [invResults, pipedResults] = await Promise.all([
    searchInvidiousClient(query).catch(() => [] as ClientYouTubeVideo[]),
    searchPipedClient(query).catch(() => [] as ClientYouTubeVideo[]),
  ]);

  if (invResults.length > 0) return invResults;
  if (pipedResults.length > 0) return pipedResults;

  console.log("Client-side search: no results from any source");
  return [];
}

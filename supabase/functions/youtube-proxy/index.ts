import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.r4fo.com",
  "https://pipedapi.adminforge.de",
  "https://api.piped.yt",
  "https://pipedapi.darkness.services",
  "https://pipedapi.drgns.space",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.us.projectsegfau.lt",
];

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.jing.rocks",
  "https://invidious.privacyredirect.com",
  "https://yt.artemislena.eu",
  "https://vid.puffyan.us",
  "https://invidious.lunar.icu",
  "https://invidious.protokoll.earth",
];

// Curated fallback videos by category
const CURATED_VIDEOS: Record<string, Array<{id: string; title: string; author: string; lengthSeconds: number}>> = {
  "Workout": [
    { id: "gC7sFmfQHyo", title: "WORKOUT MUSIC MIX 2024 - Best Gym Motivation", author: "Gym Motivation", lengthSeconds: 3600 },
    { id: "n8X9_MgEdCg", title: "Best Workout Music Mix - Gym Motivation 2024", author: "NCS Workout", lengthSeconds: 2400 },
    { id: "36YnV9STBqc", title: "BEAST MODE ON - Gym Workout Motivation", author: "Fitness Music", lengthSeconds: 1800 },
    { id: "qTypGlqNqhc", title: "Powerful Gym Workout Music Mix 2024", author: "Power Music", lengthSeconds: 3000 },
    { id: "RviOwY0OKyE", title: "Workout Motivation Music Mix 2024", author: "Bass Boost", lengthSeconds: 2700 },
    { id: "Y58BlGOnoGk", title: "Gym Phonk Mix - Workout Beast Mode", author: "Phonk Nation", lengthSeconds: 2100 },
  ],
  "Phonk": [
    { id: "cVLdaGQqx9A", title: "Phonk Music 2024 - Aggressive Drift Phonk", author: "Phonk House", lengthSeconds: 1800 },
    { id: "m0rcVxC5WDk", title: "MURDER IN MY MIND - Phonk", author: "Kordhell", lengthSeconds: 180 },
    { id: "b6Hk_gxF1Bs", title: "Close Eyes - DVRST", author: "DVRST", lengthSeconds: 195 },
    { id: "FGNLBfUiEGs", title: "GHOSTFACE PLAYA - Why Not", author: "GHOSTFACE PLAYA", lengthSeconds: 210 },
    { id: "1HCpIhCVzzA", title: "Gym Phonk Playlist - Beast Mode Mix", author: "Phonk Music", lengthSeconds: 3600 },
    { id: "igVLTttJDnk", title: "Aggressive Phonk Mix for Gym", author: "Phonk Nation", lengthSeconds: 2400 },
  ],
  "Running": [
    { id: "mZtpYMWQxhY", title: "Running Motivation Music 2024 - Best Songs", author: "Run Beats", lengthSeconds: 3600 },
    { id: "kKGKlB_TN9c", title: "Best Running Music Mix - 170 BPM", author: "Running Music", lengthSeconds: 2700 },
    { id: "YoJkFlWx3MI", title: "Running Music Motivation Mix 2024", author: "Fitness Beat", lengthSeconds: 3000 },
    { id: "wVyggTKDcOE", title: "Best Running Music - Top Workout Songs", author: "Sport Music", lengthSeconds: 2400 },
  ],
  "Chill": [
    { id: "lTRiuFIWV54", title: "Lofi Hip Hop Radio - Chill Study Beats", author: "Lofi Girl", lengthSeconds: 3600 },
    { id: "jfKfPfyJRdk", title: "Lofi Girl - Relaxing Music", author: "Lofi Girl", lengthSeconds: 7200 },
    { id: "rUxyKA_-grg", title: "Chill Music Mix - Deep Focus", author: "Chill Nation", lengthSeconds: 3600 },
    { id: "77ZozI0rw7w", title: "Chill Vibes - Relaxing Study Music", author: "The Vibe Guide", lengthSeconds: 2400 },
  ],
  "EDM": [
    { id: "V-QJi3I_uBk", title: "Best EDM Songs & Remixes - Festival Music Mix", author: "NCS", lengthSeconds: 3600 },
    { id: "LLwuGYlmaxQ", title: "EDM Mix 2024 - Best Electro House Music", author: "EDM Nation", lengthSeconds: 2700 },
    { id: "IryIMTbx7Wg", title: "Top EDM Music Mix - Best Drops", author: "Bass Nation", lengthSeconds: 3000 },
  ],
  "High Energy": [
    { id: "n1WpP7iowLc", title: "Eminem - Lose Yourself", author: "Eminem", lengthSeconds: 326 },
    { id: "2X_2IdybTV0", title: "Eye of the Tiger - Survivor", author: "Survivor", lengthSeconds: 245 },
    { id: "btPJPFnesV4", title: "Eye of the Tiger - Gym Remix", author: "Gym Music", lengthSeconds: 240 },
    { id: "fJ9rUzIMcZQ", title: "Bohemian Rhapsody - Queen", author: "Queen", lengthSeconds: 354 },
  ],
  "Hardstyle": [
    { id: "5gDzhrPbULk", title: "Hardstyle Mix 2024 - Best of Hardstyle", author: "Hardstyle Nation", lengthSeconds: 3600 },
    { id: "hnQICAPkjnQ", title: "Best Hardstyle Songs For Gym", author: "Hard Music", lengthSeconds: 2400 },
  ],
  "Trap": [
    { id: "UfcAVejslrU", title: "Trap Music Mix 2024 - Best Bass Boosted", author: "Trap Nation", lengthSeconds: 3600 },
    { id: "5yEhQvUsqH8", title: "Trap Workout Mix - Heavy Gym Music", author: "Trap City", lengthSeconds: 2700 },
  ],
};

async function tryFetch(url: string, timeout = 6000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) return res;
  } catch { /* skip */ }
  return null;
}

async function searchPiped(query: string): Promise<any[]> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await tryFetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`);
      if (res) {
        const data = await res.json();
        const items = (data.items || [])
          .filter((item: any) => item.type === "stream" && item.duration > 0)
          .slice(0, 30)
          .map((item: any) => ({
            id: item.url?.replace("/watch?v=", "") || "",
            title: item.title || "Unknown",
            author: item.uploaderName || "Unknown",
            thumbnail: item.thumbnail || "",
            lengthSeconds: item.duration || 0,
          }));
        if (items.length > 0) return items;
      }
    } catch { /* skip */ }
  }
  return [];
}

async function searchInvidious(query: string): Promise<any[]> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await tryFetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`);
      if (res) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data
            .filter((item: any) => item.type === "video" && item.lengthSeconds > 0)
            .slice(0, 30)
            .map((item: any) => ({
              id: item.videoId || "",
              title: item.title || "Unknown",
              author: item.author || "Unknown",
              thumbnail: `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
              lengthSeconds: item.lengthSeconds || 0,
            }));
        }
      }
    } catch { /* skip */ }
  }
  return [];
}

async function getAudioUrl(videoId: string): Promise<string | null> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await tryFetch(`${instance}/streams/${videoId}`);
      if (res) {
        const data = await res.json();
        const audioStreams = data.audioStreams || [];
        if (audioStreams.length > 0) {
          const best = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
          if (best?.url) return best.url;
        }
      }
    } catch { /* skip */ }
  }
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await tryFetch(`${instance}/api/v1/videos/${videoId}`);
      if (res) {
        const data = await res.json();
        const adaptiveFormats = data.adaptiveFormats || [];
        const audioFormats = adaptiveFormats.filter((f: any) => f.type?.startsWith("audio/"));
        if (audioFormats.length > 0) {
          const best = audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
          if (best?.url) return best.url;
        }
      }
    } catch { /* skip */ }
  }
  return null;
}

function getCuratedVideos(category: string): any[] {
  const cat = Object.keys(CURATED_VIDEOS).find(k => k.toLowerCase() === category.toLowerCase()) || "Workout";
  return (CURATED_VIDEOS[cat] || CURATED_VIDEOS["Workout"]).map(v => ({
    ...v,
    thumbnail: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, videoId, category } = await req.json();

    if (action === "search") {
      // Try APIs first, then fallback to curated
      let results = await searchPiped(query);
      if (results.length === 0) {
        results = await searchInvidious(query);
      }
      if (results.length === 0) {
        // Use curated as fallback
        results = getCuratedVideos(category || query);
      }
      return new Response(JSON.stringify({ items: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "curated") {
      const results = getCuratedVideos(category || "Workout");
      return new Response(JSON.stringify({ items: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "audio") {
      const url = await getAudioUrl(videoId);
      return new Response(JSON.stringify({ url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("youtube-proxy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

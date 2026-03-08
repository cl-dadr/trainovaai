import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Piped API instances (free YouTube frontends)
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.r4fo.com",
  "https://api.piped.yt",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.in.projectsegfau.lt",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.drgns.space",
];

// Invidious API instances (free YouTube frontends)
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://vid.puffyan.us",
  "https://invidious.lunar.icu",
  "https://invidious.privacyredirect.com",
  "https://iv.datura.network",
  "https://invidious.nerdvpn.de",
];

// ── Curated fallback library ──
const CURATED_VIDEOS: Record<string, Array<{id: string; title: string; author: string; lengthSeconds: number}>> = {
  "Workout": [
    { id: "h9EUxjJsMM8", title: "Best Gym Workout Music 2025 🔥 Top Motivational Songs", author: "Trap Music", lengthSeconds: 3600 },
    { id: "aGt0Jj2ps-Q", title: "TOP GYM PHONK 2025 ※ 1 HOUR BADASS FUNKs 🔥", author: "Magic EDM", lengthSeconds: 3600 },
    { id: "or_jhl1429M", title: "1 HOUR BEST PHONK for GYM ※ Aggressive Villain Arc", author: "Phonk House", lengthSeconds: 3600 },
    { id: "gYGqI-m3cGg", title: "Gym Workout Mix 2025 🏋️ Best Pump Up Music", author: "Bass Boost", lengthSeconds: 2400 },
    { id: "n8X9_MgEdCg", title: "WORKOUT MUSIC MIX 💪 Best Gym Motivation 2025", author: "Gym Music", lengthSeconds: 3600 },
    { id: "qdjLFkA2gGI", title: "Best Workout Music Mix 2025 - Gym Motivation", author: "NCS Workout", lengthSeconds: 2700 },
    { id: "36YnV9STBqc", title: "Beast Mode ON 💪 Aggressive Gym Workout Mix", author: "Fitness Beats", lengthSeconds: 3000 },
    { id: "Bz2fEYorVZA", title: "Intense Workout Music Mix 2025 ⚡ EDM Gym Songs", author: "Power Music", lengthSeconds: 2400 },
  ],
  "Phonk": [
    { id: "aGt0Jj2ps-Q", title: "TOP GYM PHONK 2025 ※ BADASS FUNKs 🔥", author: "Magic EDM", lengthSeconds: 3600 },
    { id: "or_jhl1429M", title: "BEST PHONK for GYM ※ Villain Arc Playlist", author: "Phonk House", lengthSeconds: 3600 },
    { id: "B2A5Kd_mCJA", title: "PHONK METAL 🦍 TOXIC GORILLA MODE Workout", author: "theGraveyaard", lengthSeconds: 1355 },
    { id: "nTTq-ryxZ9I", title: "Phonk Gym Motivation 2025 | Dark Vibes", author: "Gym Phonk", lengthSeconds: 2400 },
    { id: "mg74FZwG8uo", title: "THE BEST GYM PHONK 2025 ※ Top Playlist", author: "Phonk Rival", lengthSeconds: 3600 },
    { id: "u9G7hoXLSnA", title: "INSANE PHONK 2025 ※ Aggressive Drift", author: "Phonk Club", lengthSeconds: 2400 },
    { id: "TqVQNzq9-8U", title: "Ultimate PHONK Mix - 1 Hour Hardcore Drift", author: "Maveloop", lengthSeconds: 3750 },
    { id: "PKesv2PfEsc", title: "AURA ♾️ Best Viral Phonk - Drift Mix", author: "PHONK Club", lengthSeconds: 2700 },
  ],
  "Funk": [
    { id: "aGt0Jj2ps-Q", title: "TOP GYM PHONK & FUNK 2025 ※ BADASS FUNKs", author: "Magic EDM", lengthSeconds: 3600 },
    { id: "or_jhl1429M", title: "Brazilian Funk & Phonk Gym Mix 2025", author: "Phonk House", lengthSeconds: 3600 },
    { id: "h9EUxjJsMM8", title: "Funk Workout Music 2025 🔥 Gym Motivation", author: "Trap Music", lengthSeconds: 3600 },
    { id: "gYGqI-m3cGg", title: "Funk Pump Up Mix 2025 🕺 Gym Beats", author: "Bass Boost", lengthSeconds: 2400 },
    { id: "B2A5Kd_mCJA", title: "Funk Metal Gym Mode 🦍 Aggressive Mix", author: "theGraveyaard", lengthSeconds: 1355 },
    { id: "n8X9_MgEdCg", title: "Funky Gym Workout Mix 2025 💃", author: "Gym Music", lengthSeconds: 3600 },
  ],
  "Running": [
    { id: "h9EUxjJsMM8", title: "Running Workout Music 2025 🏃 Best Songs", author: "Trap Music", lengthSeconds: 3600 },
    { id: "n8X9_MgEdCg", title: "Running Music Mix 2025 | 140-160 BPM", author: "Gym Music", lengthSeconds: 3600 },
    { id: "qdjLFkA2gGI", title: "Cardio Running Mix 2025 ⚡ NCS Beats", author: "NCS Workout", lengthSeconds: 2700 },
    { id: "Bz2fEYorVZA", title: "Running EDM Motivation Mix 2025 🏃‍♂️", author: "Power Music", lengthSeconds: 2400 },
    { id: "36YnV9STBqc", title: "Ultimate Running Playlist 2025 - High BPM", author: "Fitness Beats", lengthSeconds: 3000 },
    { id: "gYGqI-m3cGg", title: "Jogging & Running Music 2025 🎵", author: "Bass Boost", lengthSeconds: 2400 },
  ],
  "Chill": [
    { id: "jfKfPfyJRdk", title: "lofi hip hop radio 📚 beats to relax/study to", author: "Lofi Girl", lengthSeconds: 0 },
    { id: "5qap5aO4i9A", title: "lofi hip hop radio 🎵 chill beats to sleep/relax", author: "Lofi Girl", lengthSeconds: 0 },
    { id: "rUxyKA_-grg", title: "2 A.M Study Session 📚 Lofi Hip Hop Chill", author: "Lofi Vibes", lengthSeconds: 7200 },
    { id: "DWcJFNfaw9c", title: "Coffee Shop Vibes ☕ Lofi Hip Hop Mix", author: "Chill Nation", lengthSeconds: 3600 },
    { id: "7NOSDKb0HlU", title: "Peaceful Piano & Soft Rain 🌧 Relaxing Sleep", author: "Soothing Relaxation", lengthSeconds: 10800 },
    { id: "lTRiuFIWV54", title: "Study Music Alpha Waves 📖 Concentration", author: "Yellow Brick Cinema", lengthSeconds: 10800 },
  ],
  "High Energy": [
    { id: "h9EUxjJsMM8", title: "Best Gym Workout 2025 🔥 Motivational", author: "Trap Music", lengthSeconds: 3600 },
    { id: "aGt0Jj2ps-Q", title: "HIGH ENERGY GYM PHONK 2025 ※ BADASS", author: "Magic EDM", lengthSeconds: 3600 },
    { id: "36YnV9STBqc", title: "Beast Mode 💪 High Energy Gym Mix", author: "Fitness Beats", lengthSeconds: 3000 },
    { id: "n8X9_MgEdCg", title: "INSANE Energy Workout Music 2025 ⚡", author: "Gym Music", lengthSeconds: 3600 },
    { id: "gYGqI-m3cGg", title: "Pump Up Music 2025 🔥 Pre-Workout Mix", author: "Bass Boost", lengthSeconds: 2400 },
    { id: "Bz2fEYorVZA", title: "Energy Boost EDM Mix 2025 💥", author: "Power Music", lengthSeconds: 2400 },
  ],
  "EDM": [
    { id: "36YnV9STBqc", title: "Best EDM Mix 2025 🎧 Festival Gym Music", author: "Fitness Beats", lengthSeconds: 3000 },
    { id: "Bz2fEYorVZA", title: "EDM Workout Mix 2025 ⚡ Best Drops", author: "Power Music", lengthSeconds: 2400 },
    { id: "qdjLFkA2gGI", title: "NCS EDM Mix 2025 🎶 No Copyright Gym", author: "NCS Workout", lengthSeconds: 2700 },
    { id: "h9EUxjJsMM8", title: "EDM Gym Workout 2025 🔥 Motivational", author: "Trap Music", lengthSeconds: 3600 },
    { id: "n8X9_MgEdCg", title: "Electronic Dance Workout Mix 2025", author: "Gym Music", lengthSeconds: 3600 },
    { id: "gYGqI-m3cGg", title: "EDM Big Room Festival Mix 2025 🎉", author: "Bass Boost", lengthSeconds: 2400 },
  ],
  "Hardstyle": [
    { id: "36YnV9STBqc", title: "Hardstyle Gym Mix 2025 ⚡ Hard Beats", author: "Fitness Beats", lengthSeconds: 3000 },
    { id: "h9EUxjJsMM8", title: "Hardstyle Workout 2025 🔥 Heavy Lifts", author: "Trap Music", lengthSeconds: 3600 },
    { id: "aGt0Jj2ps-Q", title: "Hard Phonk Gym Mix 2025 ※", author: "Magic EDM", lengthSeconds: 3600 },
    { id: "n8X9_MgEdCg", title: "Hardstyle & Rawstyle Workout 2025 💪", author: "Gym Music", lengthSeconds: 3600 },
    { id: "Bz2fEYorVZA", title: "Hard EDM Gym Motivation 2025", author: "Power Music", lengthSeconds: 2400 },
  ],
  "Trap": [
    { id: "h9EUxjJsMM8", title: "Best Trap Gym Music 2025 🔥 Motivation", author: "Trap Music", lengthSeconds: 3600 },
    { id: "aGt0Jj2ps-Q", title: "Trap & Phonk Gym Mix 2025", author: "Magic EDM", lengthSeconds: 3600 },
    { id: "or_jhl1429M", title: "Trap Villain Arc Mix 2025 😈", author: "Phonk House", lengthSeconds: 3600 },
    { id: "36YnV9STBqc", title: "Trap Beast Mode Mix 2025 💪", author: "Fitness Beats", lengthSeconds: 3000 },
    { id: "n8X9_MgEdCg", title: "Trap Workout Music 2025 - Gym Bangers", author: "Gym Music", lengthSeconds: 3600 },
    { id: "qdjLFkA2gGI", title: "NCS Trap Mix 2025 🎧 No Copyright", author: "NCS Workout", lengthSeconds: 2700 },
  ],
  "Hip Hop": [
    { id: "h9EUxjJsMM8", title: "Hip Hop Gym Mix 2025 🔥 Workout Hits", author: "Trap Music", lengthSeconds: 3600 },
    { id: "n8X9_MgEdCg", title: "Hip Hop Workout Playlist 2025 🎤", author: "Gym Music", lengthSeconds: 3600 },
    { id: "36YnV9STBqc", title: "Rap & Hip Hop Gym Motivation 2025 💪", author: "Fitness Beats", lengthSeconds: 3000 },
    { id: "gYGqI-m3cGg", title: "Hip Hop Bass Boost Gym Mix 2025", author: "Bass Boost", lengthSeconds: 2400 },
    { id: "qdjLFkA2gGI", title: "Hip Hop Workout NCS Mix 2025", author: "NCS Workout", lengthSeconds: 2700 },
  ],
  "Rock": [
    { id: "36YnV9STBqc", title: "Rock & Metal Gym Mix 2025 🎸", author: "Fitness Beats", lengthSeconds: 3000 },
    { id: "h9EUxjJsMM8", title: "Rock Workout Mix 2025 🔥 Pump Up", author: "Trap Music", lengthSeconds: 3600 },
    { id: "n8X9_MgEdCg", title: "Rock Gym Motivation 2025 💪 Heavy", author: "Gym Music", lengthSeconds: 3600 },
    { id: "Bz2fEYorVZA", title: "Alternative Rock Workout 2025 🎸", author: "Power Music", lengthSeconds: 2400 },
    { id: "gYGqI-m3cGg", title: "Rock Bass Boost Gym 2025", author: "Bass Boost", lengthSeconds: 2400 },
  ],
};

// ── Helpers ──

async function tryFetch(url: string, timeout = 8000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) return res;
    // Consume body to prevent leak
    try { await res.text(); } catch {}
  } catch { /* skip */ }
  return null;
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return parseInt(match[1] || "0") * 3600 + parseInt(match[2] || "0") * 60 + parseInt(match[3] || "0");
}

// ── YouTube Data API v3 (quota-limited) ──
async function searchYouTubeAPI(query: string, apiKey: string): Promise<any[]> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(query)}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error("YouTube API error:", res.status, text);
      return [];
    }
    const data = await res.json();
    const videoIds = (data.items || []).map((item: any) => item.id?.videoId).filter(Boolean);
    if (videoIds.length === 0) return [];

    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(",")}&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) { try { await detailsRes.text(); } catch {} return []; }
    const detailsData = await detailsRes.json();

    return (detailsData.items || []).map((item: any) => ({
      id: item.id,
      title: item.snippet?.title || "Unknown",
      author: item.snippet?.channelTitle || "Unknown",
      thumbnail: item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`,
      lengthSeconds: parseDuration(item.contentDetails?.duration || "PT0S"),
    }));
  } catch (e) {
    console.error("YouTube API search error:", e);
    return [];
  }
}

// ── Piped search (try multiple filters for better results) ──
async function searchPiped(query: string): Promise<any[]> {
  const filters = ["music_songs", "videos", "music"];
  
  for (const instance of PIPED_INSTANCES) {
    for (const filter of filters) {
      try {
        const res = await tryFetch(
          `${instance}/search?q=${encodeURIComponent(query)}&filter=${filter}`,
          6000
        );
        if (!res) continue;
        
        const data = await res.json();
        const rawItems = data.items || data.content || [];
        const items = rawItems
          .filter((item: any) => (item.type === "stream" || item.url) && (item.duration > 0 || item.lengthSeconds > 0))
          .slice(0, 20)
          .map((item: any) => {
            const videoId = (item.url || "").replace("/watch?v=", "");
            return {
              id: videoId,
              title: item.title || "Unknown",
              author: item.uploaderName || item.uploader || "Unknown",
              thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
              lengthSeconds: item.duration || item.lengthSeconds || 0,
            };
          })
          .filter((item: any) => item.id);
        
        if (items.length > 0) {
          console.log(`Piped success: ${instance} filter=${filter} results=${items.length}`);
          return items;
        }
      } catch { /* try next */ }
    }
  }
  return [];
}

// ── Invidious search ──
async function searchInvidious(query: string): Promise<any[]> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await tryFetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`,
        6000
      );
      if (!res) continue;
      
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
        }))
        .filter((item: any) => item.id);
      
      if (items.length > 0) {
        console.log(`Invidious success: ${instance} results=${items.length}`);
        return items;
      }
    } catch { /* try next */ }
  }
  return [];
}

// ── Combined free API search with race ──
async function searchFreeAPIs(query: string): Promise<any[]> {
  // Race Piped vs Invidious — first one with results wins
  const result = await Promise.any([
    searchPiped(query).then(r => { if (r.length === 0) throw new Error("empty"); return r; }),
    searchInvidious(query).then(r => { if (r.length === 0) throw new Error("empty"); return r; }),
  ]).catch(() => []);
  
  return result;
}

// ── Curated helpers ──
function getCuratedVideos(category: string): any[] {
  const cat = Object.keys(CURATED_VIDEOS).find(k => k.toLowerCase() === category.toLowerCase()) || "Workout";
  return (CURATED_VIDEOS[cat] || CURATED_VIDEOS["Workout"]).map(v => ({
    ...v,
    thumbnail: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
  }));
}

function getAllCurated(): any[] {
  const seenIds = new Set<string>();
  const all: any[] = [];
  for (const cat of Object.keys(CURATED_VIDEOS)) {
    for (const v of CURATED_VIDEOS[cat]) {
      if (!seenIds.has(v.id)) {
        seenIds.add(v.id);
        all.push({ ...v, thumbnail: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` });
      }
    }
  }
  return all;
}

// ── Main handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, videoId, category } = await req.json();
    const apiKey = Deno.env.get("YOUTUBE_API_KEY");

    if (action === "search") {
      // 1. Try free APIs FIRST (no quota limits)
      console.log(`Searching free APIs for: "${query}"`);
      const freePromise = searchFreeAPIs(query);
      const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 12000));
      const freeResults = await Promise.race([freePromise, timeoutPromise]);
      
      if (freeResults.length > 0) {
        return new Response(JSON.stringify({ items: freeResults, source: "free_api" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Try YouTube Data API v3 as backup
      if (apiKey) {
        console.log("Free APIs failed, trying YouTube Data API...");
        const ytResults = await searchYouTubeAPI(query, apiKey);
        if (ytResults.length > 0) {
          return new Response(JSON.stringify({ items: ytResults, source: "youtube_api" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // 3. Fallback to curated
      console.log("All APIs failed, falling back to curated");
      const curated = getCuratedVideos(category || "Workout");
      return new Response(JSON.stringify({ items: curated, source: "curated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "curated") {
      return new Response(JSON.stringify({ items: getCuratedVideos(category || "Workout") }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "all") {
      return new Response(JSON.stringify({ items: getAllCurated() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "audio") {
      return new Response(JSON.stringify({ url: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("youtube-proxy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
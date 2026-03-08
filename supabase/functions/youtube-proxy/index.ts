import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.r4fo.com",
  "https://api.piped.yt",
];

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://vid.puffyan.us",
  "https://invidious.lunar.icu",
];

// Curated fallback videos by category
const CURATED_VIDEOS: Record<string, Array<{id: string; title: string; author: string; lengthSeconds: number}>> = {
  "Workout": [
    { id: "h9EUxjJsMM8", title: "Best Gym Workout Music 2025 🔥 Top Motivational Songs", author: "Trap Music", lengthSeconds: 3600 },
    { id: "aGt0Jj2ps-Q", title: "TOP GYM PHONK MUSIC 2025 ※ 1 HOUR BADASS FUNKs", author: "Magic EDM", lengthSeconds: 3600 },
    { id: "or_jhl1429M", title: "1 HOUR BEST PHONK for GYM 2025 ※ Aggressive Villain Arc", author: "Phonk House", lengthSeconds: 3600 },
    { id: "eqYi3RXiB90", title: "Best Workout Music 2025 💪 Fitness & Gym", author: "Power Music", lengthSeconds: 3000 },
    { id: "pvH7jjWOnTw", title: "Top Motivational Songs 2025 👊 Best Gym Mix", author: "Gym Hits", lengthSeconds: 2700 },
    { id: "EPII1OglnGg", title: "Hard Gaming Mix 2025 ♫ NCS Music, EDM", author: "NCS", lengthSeconds: 3600 },
  ],
  "Phonk": [
    { id: "aGt0Jj2ps-Q", title: "TOP GYM PHONK 2025 ※ 1 HOUR BADASS FUNKs 🔥", author: "Magic EDM", lengthSeconds: 3600 },
    { id: "or_jhl1429M", title: "BEST PHONK for GYM ※ Aggressive Villain Arc", author: "Phonk House", lengthSeconds: 3600 },
    { id: "B2A5Kd_mCJA", title: "PHONK METAL 🦍 TOXIC GORILLA MODE Workout", author: "theGraveyaard", lengthSeconds: 1355 },
    { id: "nTTq-ryxZ9I", title: "Phonk Gym Motivation 2025 | Dark Vibes", author: "Gym Phonk", lengthSeconds: 2400 },
    { id: "mg74FZwG8uo", title: "THE BEST GYM PHONK 2025 ※ Top Playlist", author: "Phonk Rival", lengthSeconds: 3600 },
  ],
  "Funk": [
    { id: "aGt0Jj2ps-Q", title: "TOP GYM PHONK & FUNK 2025 ※ BADASS FUNKs 🔥", author: "Magic EDM", lengthSeconds: 3600 },
    { id: "or_jhl1429M", title: "Brazilian Funk & Phonk Gym Mix 2025", author: "Phonk House", lengthSeconds: 3600 },
    { id: "h9EUxjJsMM8", title: "Funk Workout Music 2025 🔥 Gym Motivation", author: "Trap Music", lengthSeconds: 3600 },
    { id: "EPII1OglnGg", title: "Funky EDM Mix 2025 - Groovy Gym Beats", author: "NCS Gaming", lengthSeconds: 3600 },
    { id: "pvH7jjWOnTw", title: "Funky Gym Motivational Mix 2025", author: "Gym Hits", lengthSeconds: 2700 },
  ],
  "Running": [
    { id: "h9EUxjJsMM8", title: "Running Workout Music 2025 🔥 Best Songs", author: "Trap Music", lengthSeconds: 3600 },
    { id: "VlvKEOP3kIc", title: "Running Lofi Mix 📚 Chill Running Beats", author: "RE:Lofi", lengthSeconds: 3639 },
    { id: "eqYi3RXiB90", title: "Running Music 2025 💪 Powerful Mix", author: "Power Music", lengthSeconds: 3000 },
    { id: "EPII1OglnGg", title: "Running EDM Mix 2025 ♫ NCS Beats", author: "NCS Gaming", lengthSeconds: 3600 },
  ],
  "Chill": [
    { id: "VlvKEOP3kIc", title: "1 A.M Study Session 📚 Lofi Chill Beats", author: "RE:Lofi", lengthSeconds: 3639 },
    { id: "qPAiYaZOGeQ", title: "Chill Lofi Mix - Lo-fi Hip Hop Beats", author: "Lofi Mix", lengthSeconds: 3600 },
    { id: "BsMbBVZYAi4", title: "LoFi Hip Hop 🎶 Music to Relax & Study", author: "Lofi Station", lengthSeconds: 3600 },
    { id: "KeMDUe-E4nc", title: "Lofi Hip Hop - Snowy Chillhop Beats", author: "Chill Nation", lengthSeconds: 2400 },
  ],
  "High Energy": [
    { id: "h9EUxjJsMM8", title: "Best Gym Workout 2025 🔥 Top Motivational", author: "Trap Music", lengthSeconds: 3600 },
    { id: "aGt0Jj2ps-Q", title: "HIGH ENERGY GYM PHONK 2025 ※ BADASS", author: "Magic EDM", lengthSeconds: 3600 },
    { id: "pvH7jjWOnTw", title: "Top Motivational Songs 2025 - Best Gym", author: "Gym Hits", lengthSeconds: 2700 },
    { id: "eqYi3RXiB90", title: "Best Workout Music 2025 💪 Powerful Mix", author: "Power Music", lengthSeconds: 3000 },
  ],
  "EDM": [
    { id: "EPII1OglnGg", title: "Hard Gaming Mix 2025 ♫ Top 30 NCS", author: "NCS Gaming", lengthSeconds: 3600 },
    { id: "h9EUxjJsMM8", title: "EDM Gym Workout 2025 🔥 Motivational Mix", author: "Trap Music", lengthSeconds: 3600 },
    { id: "eqYi3RXiB90", title: "EDM Workout Music 2025 💪 Best Mix", author: "Power Music", lengthSeconds: 3000 },
    { id: "pvH7jjWOnTw", title: "EDM Gym Hits 2025 - Festival Workout", author: "Gym Hits", lengthSeconds: 2700 },
  ],
  "Hardstyle": [
    { id: "EPII1OglnGg", title: "Hard Gaming Mix 2025 ♫ EDM, Rock", author: "NCS Gaming", lengthSeconds: 3600 },
    { id: "h9EUxjJsMM8", title: "Hardstyle Gym Workout 2025 🔥", author: "Trap Music", lengthSeconds: 3600 },
    { id: "aGt0Jj2ps-Q", title: "Hard Phonk Gym Mix 2025", author: "Magic EDM", lengthSeconds: 3600 },
  ],
  "Trap": [
    { id: "h9EUxjJsMM8", title: "Best Trap Gym Music 2025 🔥 Motivation", author: "Trap Music", lengthSeconds: 3600 },
    { id: "aGt0Jj2ps-Q", title: "Trap & Phonk Gym Mix 2025", author: "Magic EDM", lengthSeconds: 3600 },
    { id: "or_jhl1429M", title: "Trap Villain Arc Phonk 2025", author: "Phonk House", lengthSeconds: 3600 },
  ],
  "Hip Hop": [
    { id: "h9EUxjJsMM8", title: "Hip Hop Gym Mix 2025 🔥 Workout Hits", author: "Trap Music", lengthSeconds: 3600 },
    { id: "pvH7jjWOnTw", title: "Hip Hop Motivational Gym Mix 2025", author: "Gym Hits", lengthSeconds: 2700 },
    { id: "eqYi3RXiB90", title: "Rap & Hip Hop Gym Motivation 2025", author: "Power Music", lengthSeconds: 3000 },
  ],
  "Rock": [
    { id: "EPII1OglnGg", title: "Rock & Metal Gym Mix 2025 ♫", author: "NCS Gaming", lengthSeconds: 3600 },
    { id: "h9EUxjJsMM8", title: "Rock Workout Mix 2025 🔥 Pump Up", author: "Trap Music", lengthSeconds: 3600 },
    { id: "eqYi3RXiB90", title: "Rock Gym Motivation 2025 💪", author: "Power Music", lengthSeconds: 3000 },
  ],
};

async function tryFetch(url: string, timeout = 4000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) return res;
  } catch { /* skip */ }
  return null;
}

// Race all instances in parallel instead of sequential
async function searchAPIs(query: string): Promise<any[]> {
  const promises = [
    ...PIPED_INSTANCES.map(async (instance) => {
      try {
        const res = await tryFetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`);
        if (res) {
          const data = await res.json();
          const items = (data.items || [])
            .filter((item: any) => item.type === "stream" && item.duration > 0)
            .slice(0, 20)
            .map((item: any) => ({
              id: item.url?.replace("/watch?v=", "") || "",
              title: item.title || "Unknown",
              author: item.uploaderName || "Unknown",
              thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.url?.replace("/watch?v=", "") || ""}/mqdefault.jpg`,
              lengthSeconds: item.duration || 0,
            }));
          if (items.length > 0) return items;
        }
      } catch { /* skip */ }
      return [];
    }),
    ...INVIDIOUS_INSTANCES.map(async (instance) => {
      try {
        const res = await tryFetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`);
        if (res) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const items = data
              .filter((item: any) => item.type === "video" && item.lengthSeconds > 0)
              .slice(0, 20)
              .map((item: any) => ({
                id: item.videoId || "",
                title: item.title || "Unknown",
                author: item.author || "Unknown",
                thumbnail: `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
                lengthSeconds: item.lengthSeconds || 0,
              }));
            if (items.length > 0) return items;
          }
        }
      } catch { /* skip */ }
      return [];
    }),
  ];

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.length > 0) return r.value;
  }
  return [];
}

async function getAudioUrl(videoId: string): Promise<string | null> {
  const promises = [
    ...PIPED_INSTANCES.map(async (instance) => {
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
      return null;
    }),
    ...INVIDIOUS_INSTANCES.map(async (instance) => {
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
      return null;
    }),
  ];

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) return r.value;
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
      // Race: curated is instant fallback, APIs run in parallel with 4s timeout
      const curated = getCuratedVideos(category || query);
      
      // Try APIs with a short overall timeout
      const apiPromise = searchAPIs(query);
      const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 8000));
      
      const apiResults = await Promise.race([apiPromise, timeoutPromise]);
      const results = apiResults.length > 0 ? apiResults : curated;

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

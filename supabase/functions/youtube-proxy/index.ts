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
];

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.jing.rocks",
  "https://invidious.privacyredirect.com",
  "https://yt.artemislena.eu",
];

async function tryFetch(url: string, timeout = 8000): Promise<Response | null> {
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
  }
  return [];
}

async function searchInvidious(query: string): Promise<any[]> {
  for (const instance of INVIDIOUS_INSTANCES) {
    const res = await tryFetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`);
    if (res) {
      const data = await res.json();
      return data
        .filter((item: any) => item.type === "video" && item.lengthSeconds > 0)
        .slice(0, 30)
        .map((item: any) => ({
          id: item.videoId || "",
          title: item.title || "Unknown",
          author: item.author || "Unknown",
          thumbnail: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
          lengthSeconds: item.lengthSeconds || 0,
        }));
    }
  }
  return [];
}

async function getAudioUrl(videoId: string): Promise<string | null> {
  // Try Piped first
  for (const instance of PIPED_INSTANCES) {
    const res = await tryFetch(`${instance}/streams/${videoId}`);
    if (res) {
      const data = await res.json();
      const audioStreams = data.audioStreams || [];
      if (audioStreams.length > 0) {
        const best = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (best?.url) return best.url;
      }
    }
  }
  // Try Invidious
  for (const instance of INVIDIOUS_INSTANCES) {
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
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, videoId } = await req.json();

    if (action === "search") {
      // Try Piped first, fallback to Invidious
      let results = await searchPiped(query);
      if (results.length === 0) {
        results = await searchInvidious(query);
      }
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

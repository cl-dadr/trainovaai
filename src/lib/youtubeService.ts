import { supabase } from "@/integrations/supabase/client";

export interface YouTubeVideo {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  lengthSeconds: number;
  duration: string;
  audioUrl?: string;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "LIVE";
  const hrs = Math.floor(seconds / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  const sec = seconds % 60;
  if (hrs > 0) return `${hrs}:${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function mapItems(items: any[]): YouTubeVideo[] {
  return (items || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    author: item.author,
    thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`,
    lengthSeconds: item.lengthSeconds,
    duration: formatDuration(item.lengthSeconds || 0),
  }));
}

export async function searchYouTube(query: string, category?: string): Promise<YouTubeVideo[]> {
  try {
    const { data, error } = await supabase.functions.invoke("youtube-proxy", {
      body: { action: "search", query, category },
    });
    if (error) throw error;
    return mapItems(data?.items);
  } catch (error) {
    console.error("YouTube search error:", error);
    return [];
  }
}

export async function getCuratedVideos(category: string): Promise<YouTubeVideo[]> {
  try {
    const { data, error } = await supabase.functions.invoke("youtube-proxy", {
      body: { action: "curated", category },
    });
    if (error) throw error;
    return mapItems(data?.items);
  } catch (error) {
    console.error("Curated videos error:", error);
    return [];
  }
}

export async function getYouTubeAudioUrl(videoId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("youtube-proxy", {
      body: { action: "audio", videoId },
    });
    if (error) throw error;
    return data?.url || null;
  } catch (error) {
    console.error("Audio URL fetch error:", error);
    return null;
  }
}

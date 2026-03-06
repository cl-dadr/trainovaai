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
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export async function searchYouTube(query: string): Promise<YouTubeVideo[]> {
  try {
    const { data, error } = await supabase.functions.invoke("youtube-proxy", {
      body: { action: "search", query },
    });

    if (error) throw error;
    
    return (data?.items || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      author: item.author,
      thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`,
      lengthSeconds: item.lengthSeconds,
      duration: formatDuration(item.lengthSeconds || 0),
    }));
  } catch (error) {
    console.error("YouTube search error:", error);
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

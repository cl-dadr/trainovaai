import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LikedSong {
  id: string;
  video_id: string;
  title: string;
  author: string | null;
  thumbnail: string | null;
  duration: string | null;
  created_at: string;
}

export function useLikedSongs() {
  const { user } = useAuth();
  const [likedSongs, setLikedSongs] = useState<LikedSong[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchLikedSongs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("liked_songs" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const songs = (data || []) as unknown as LikedSong[];
    setLikedSongs(songs);
    setLikedIds(new Set(songs.map((s) => s.video_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLikedSongs();
  }, [fetchLikedSongs]);

  const toggleLike = useCallback(
    async (video: { id: string; title: string; author: string; thumbnail: string; duration: string }) => {
      if (!user) return;

      const isLiked = likedIds.has(video.id);

      if (isLiked) {
        // Optimistic remove
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(video.id);
          return next;
        });
        setLikedSongs((prev) => prev.filter((s) => s.video_id !== video.id));

        await supabase
          .from("liked_songs" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("video_id", video.id);
      } else {
        // Optimistic add
        const newSong: LikedSong = {
          id: crypto.randomUUID(),
          video_id: video.id,
          title: video.title,
          author: video.author,
          thumbnail: video.thumbnail,
          duration: video.duration,
          created_at: new Date().toISOString(),
        };
        setLikedIds((prev) => new Set(prev).add(video.id));
        setLikedSongs((prev) => [newSong, ...prev]);

        await supabase.from("liked_songs" as any).insert({
          user_id: user.id,
          video_id: video.id,
          title: video.title,
          author: video.author,
          thumbnail: video.thumbnail,
          duration: video.duration,
        } as any);
      }
    },
    [user, likedIds]
  );

  const isLiked = useCallback((videoId: string) => likedIds.has(videoId), [likedIds]);

  return { likedSongs, likedIds, loading, toggleLike, isLiked, refetch: fetchLikedSongs };
}

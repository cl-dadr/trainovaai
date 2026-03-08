import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Playlist {
  id: string;
  name: string;
  emoji: string;
  created_at: string;
  updated_at: string;
  song_count?: number;
}

export interface PlaylistSong {
  id: string;
  playlist_id: string;
  video_id: string;
  title: string;
  author: string | null;
  thumbnail: string | null;
  duration: string | null;
  added_at: string;
}

export interface SongInput {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: string;
}

export function usePlaylists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaylists = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("playlists" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    const pls = (data || []) as unknown as Playlist[];

    // Get song counts
    const { data: songs } = await supabase
      .from("playlist_songs" as any)
      .select("playlist_id")
      .eq("user_id", user.id);

    const counts: Record<string, number> = {};
    ((songs || []) as unknown as { playlist_id: string }[]).forEach((s) => {
      counts[s.playlist_id] = (counts[s.playlist_id] || 0) + 1;
    });

    setPlaylists(pls.map((p) => ({ ...p, song_count: counts[p.id] || 0 })));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const createPlaylist = useCallback(
    async (name: string, emoji = "🎵") => {
      if (!user) return null;
      const { data } = await supabase
        .from("playlists" as any)
        .insert({ user_id: user.id, name, emoji } as any)
        .select()
        .single();

      if (data) {
        const pl = data as unknown as Playlist;
        setPlaylists((prev) => [{ ...pl, song_count: 0 }, ...prev]);
        return pl;
      }
      return null;
    },
    [user]
  );

  const deletePlaylist = useCallback(
    async (playlistId: string) => {
      if (!user) return;
      await supabase.from("playlists" as any).delete().eq("id", playlistId).eq("user_id", user.id);
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    },
    [user]
  );

  const addSongToPlaylist = useCallback(
    async (playlistId: string, song: SongInput) => {
      if (!user) return;
      await supabase.from("playlist_songs" as any).insert({
        playlist_id: playlistId,
        user_id: user.id,
        video_id: song.id,
        title: song.title,
        author: song.author,
        thumbnail: song.thumbnail,
        duration: song.duration,
      } as any);
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlistId ? { ...p, song_count: (p.song_count || 0) + 1 } : p))
      );
    },
    [user]
  );

  const removeSongFromPlaylist = useCallback(
    async (playlistId: string, videoId: string) => {
      if (!user) return;
      await supabase
        .from("playlist_songs" as any)
        .delete()
        .eq("playlist_id", playlistId)
        .eq("video_id", videoId)
        .eq("user_id", user.id);
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlistId ? { ...p, song_count: Math.max(0, (p.song_count || 0) - 1) } : p))
      );
    },
    [user]
  );

  const getPlaylistSongs = useCallback(
    async (playlistId: string): Promise<PlaylistSong[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from("playlist_songs" as any)
        .select("*")
        .eq("playlist_id", playlistId)
        .eq("user_id", user.id)
        .order("added_at", { ascending: false });
      return (data || []) as unknown as PlaylistSong[];
    },
    [user]
  );

  return { playlists, loading, createPlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist, getPlaylistSongs, refetch: fetchPlaylists };
}

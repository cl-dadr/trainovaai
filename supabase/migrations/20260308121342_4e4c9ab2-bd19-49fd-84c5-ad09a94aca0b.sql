
CREATE TABLE public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  emoji text DEFAULT '🎵',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playlists"
  ON public.playlists FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playlists"
  ON public.playlists FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists"
  ON public.playlists FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists"
  ON public.playlists FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.playlist_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  video_id text NOT NULL,
  title text NOT NULL,
  author text,
  thumbnail text,
  duration text,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, video_id)
);

ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playlist songs"
  ON public.playlist_songs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playlist songs"
  ON public.playlist_songs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlist songs"
  ON public.playlist_songs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_playlists_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_playlists_updated_at();

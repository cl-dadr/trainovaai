
CREATE TABLE public.liked_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id text NOT NULL,
  title text NOT NULL,
  author text,
  thumbnail text,
  duration text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);

ALTER TABLE public.liked_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own liked songs"
  ON public.liked_songs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own liked songs"
  ON public.liked_songs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own liked songs"
  ON public.liked_songs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

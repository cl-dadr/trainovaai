
CREATE TABLE public.running_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  distance_km REAL NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  steps INTEGER NOT NULL DEFAULT 0,
  calories REAL NOT NULL DEFAULT 0,
  avg_pace TEXT DEFAULT '0:00',
  avg_heart_rate INTEGER DEFAULT NULL,
  route_points JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.running_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own runs" ON public.running_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own runs" ON public.running_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own runs" ON public.running_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

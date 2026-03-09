
CREATE TABLE public.workout_todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_type TEXT NOT NULL,
  target_reps INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending',
  actual_reps INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own todos" ON public.workout_todos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own todos" ON public.workout_todos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own todos" ON public.workout_todos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own todos" ON public.workout_todos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Allow users to update their own workout sessions
CREATE POLICY "Users can update own sessions"
ON public.workout_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own workout sessions
CREATE POLICY "Users can delete own sessions"
ON public.workout_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for workout_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_sessions;
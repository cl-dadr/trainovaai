
-- Add username to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fitness_level text NOT NULL DEFAULT 'beginner';

-- Friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can insert own friendships" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own friendships" ON public.friendships FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can delete own friendships" ON public.friendships FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Battles table
CREATE TABLE public.battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'rep_battle',
  exercise_type text NOT NULL DEFAULT 'pushup',
  status text NOT NULL DEFAULT 'pending',
  duration_seconds integer NOT NULL DEFAULT 180,
  max_participants integer NOT NULL DEFAULT 2,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_community boolean NOT NULL DEFAULT false
);
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view battles" ON public.battles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create battles" ON public.battles FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update battles" ON public.battles FOR UPDATE TO authenticated USING (auth.uid() = creator_id);

-- Battle participants
CREATE TABLE public.battle_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  score integer NOT NULL DEFAULT 0,
  reps integer NOT NULL DEFAULT 0,
  form_score real NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  UNIQUE(battle_id, user_id)
);
ALTER TABLE public.battle_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participants" ON public.battle_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join battles" ON public.battle_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own participation" ON public.battle_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for battles and participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.battles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_participants;

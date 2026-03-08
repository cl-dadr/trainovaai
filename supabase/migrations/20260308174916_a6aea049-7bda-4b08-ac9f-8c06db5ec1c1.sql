
-- Nutrition profile storing user body stats for TDEE calculation
CREATE TABLE public.nutrition_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL DEFAULT 'male',
  weight_kg REAL NOT NULL,
  height_cm REAL NOT NULL,
  activity_level TEXT NOT NULL DEFAULT 'moderate',
  body_goal TEXT NOT NULL DEFAULT 'maintenance',
  diet_preference TEXT NOT NULL DEFAULT 'nonveg',
  tdee_calories INTEGER NOT NULL DEFAULT 2000,
  protein_target REAL NOT NULL DEFAULT 120,
  carbs_target REAL NOT NULL DEFAULT 250,
  fats_target REAL NOT NULL DEFAULT 65,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nutrition profile" ON public.nutrition_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own nutrition profile" ON public.nutrition_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nutrition profile" ON public.nutrition_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Meal logs for real-time tracking
CREATE TABLE public.meal_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL,
  meal_name TEXT NOT NULL,
  items TEXT,
  calories REAL NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fats REAL NOT NULL DEFAULT 0,
  emoji TEXT DEFAULT '🍽️',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal logs" ON public.meal_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal logs" ON public.meal_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal logs" ON public.meal_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Water intake logs
CREATE TABLE public.water_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  glasses INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own water logs" ON public.water_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own water logs" ON public.water_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own water logs" ON public.water_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);

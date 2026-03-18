-- Create profiles table for user roles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user', -- 'admin' or 'user'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Only admins can update roles
CREATE POLICY "Only admins can update roles"
  ON profiles FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Enable RLS on products table if not already enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can insert products
CREATE POLICY IF NOT EXISTS "Only admins can insert products"
  ON products FOR INSERT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Policy: Only admins can update products
CREATE POLICY IF NOT EXISTS "Only admins can update products"
  ON products FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Policy: Only admins can delete products
CREATE POLICY IF NOT EXISTS "Only admins can delete products"
  ON products FOR DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Policy: Anyone can view products
CREATE POLICY IF NOT EXISTS "Anyone can view products"
  ON products FOR SELECT
  USING (TRUE);
const url = "https://api.supabase.com/v1/projects/xpkwwksgiuwthsmbsjgm/database/query";
const token = "sbp_dce070b21e517cc33d0fbd2d1f08953ba96f2d9b";

const sql = `
-- Drop existing objects just in case
DROP TABLE IF EXISTS public.downloads;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;
DROP TABLE IF EXISTS public.profiles;

-- 1. Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Staff' CHECK (role IN ('Admin', 'Staff', 'Viewer')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create downloads table
CREATE TABLE public.downloads (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_name TEXT NOT NULL,
  email TEXT NOT NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Auto-profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Staff'),
    COALESCE(NEW.raw_user_meta_data->>'status', 'Active')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for profiles
-- Staff can read their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Admin can read all profiles (Using a subquery to avoid infinite recursion if reading from profiles itself)
CREATE POLICY "Admin can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin'
);

-- Admin can update all profiles
CREATE POLICY "Admin can update all profiles" 
ON public.profiles FOR UPDATE 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin'
);

-- 6. RLS Policies for downloads
-- Staff can insert their own download log
CREATE POLICY "Staff can insert own download"
ON public.downloads FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admin can read all downloads
CREATE POLICY "Admin can view all downloads"
ON public.downloads FOR SELECT 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin'
);
`;

fetch(url, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query: sql })
})
.then(res => res.text())
.then(data => {
  console.log("Response DB Setup:", data);
})
.catch(err => console.error(err));

const url = "https://api.supabase.com/v1/projects/xpkwwksgiuwthsmbsjgm/database/query";
const token = "sbp_dce070b21e517cc33d0fbd2d1f08953ba96f2d9b";

const sql = `
-- Drop the recursive policies
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;

-- Create a security definer function to bypass RLS for role checks
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Recreate policies using the function
CREATE POLICY "Admin can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  public.get_my_role() = 'Admin'
);

CREATE POLICY "Admin can update all profiles" 
ON public.profiles FOR UPDATE 
USING (
  public.get_my_role() = 'Admin'
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
  console.log("DB Fix Response:", data);
})
.catch(err => console.error(err));

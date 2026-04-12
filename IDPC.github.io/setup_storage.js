const url = "https://api.supabase.com/v1/projects/xpkwwksgiuwthsmbsjgm/database/query";
const authUrl = "https://xpkwwksgiuwthsmbsjgm.supabase.co/auth/v1/admin/users";
const token = "sbp_dce070b21e517cc33d0fbd2d1f08953ba96f2d9b";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwa3d3a3NnaXV3dGhzbWJzamdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk4MDIxMywiZXhwIjoyMDkxNTU2MjEzfQ.pFkVp3UUwdx-34YBrYa54RN_IF_cNdV1DyV2U2Er5D8";

async function setup() {
  // 1. Create storage bucket via SQL
  const sql = `
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('company_files', 'company_files', true)
  ON CONFLICT (id) DO NOTHING;

  -- Delete existing policies just in case
  DROP POLICY IF EXISTS "Public access to company_files" ON storage.objects;
  DROP POLICY IF EXISTS "Admin upload to company_files" ON storage.objects;

  -- Creates a policy that allows any authenticated user to view the files
  CREATE POLICY "Public access to company_files" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'company_files');

  -- Creates a policy that allows only Admin to upload/update/delete
  CREATE POLICY "Admin upload to company_files" 
  ON storage.objects FOR ALL 
  TO authenticated
  USING (
    bucket_id = 'company_files' AND 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );
  `;

  try {
    const dbRes = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: sql })
    });
    console.log("Storage DB Setup:", await dbRes.text());

    // 2. Create the Admin user
    const userRes = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "admin@innovarch.com",
        password: "AdminPassword123!",
        email_confirm: true,
        user_metadata: {
          full_name: "Executive Admin",
          role: "Admin",
          status: "Active"
        }
      })
    });
    const userData = await userRes.json();
    console.log("Admin User Creation:", JSON.stringify(userData, null, 2));

  } catch (err) {
    console.error(err);
  }
}

setup();

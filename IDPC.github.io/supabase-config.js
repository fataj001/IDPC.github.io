// Core setup
const SUPABASE_URL = 'https://xpkwwksgiuwthsmbsjgm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwa3d3a3NnaXV3dGhzbWJzamdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODAyMTMsImV4cCI6MjA5MTU1NjIxM30.QIkJHBkki0qInnPa67Yh8cdx66XhFTpznEydv_RTwCY';

// Verify the global supabase object exists (loaded via CDN)
if (typeof supabase === 'undefined') {
  console.error("Supabase CDN script not loaded before supabase-config.js");
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.SupabaseApp = {
  client: supabaseClient,

  // Get current user session
  async getSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  // Get current user and their profile data (role, status, full_name)
  async getUserProfile() {
    const session = await this.getSession();
    if (!session) return null;

    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      console.warn("Could not fetch profile", error);
      return { user: session.user, profile: null };
    }
    
    return { user: session.user, profile };
  },

  // Login
  async login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });
    if (error) throw error;
    return data;
  },

  // Logout
  async logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  },

  // Generic guard function for protected pages
  async requireAuth(allowedRoles = []) {
    const userProfile = await this.getUserProfile();
    
    if (!userProfile) {
      window.location.href = 'login.html';
      return null;
    }

    if (userProfile.profile?.status === 'Suspended') {
      await this.logout();
      window.location.href = 'login.html?error=suspended';
      return null;
    }

    if (allowedRoles.length > 0 && userProfile.profile && !allowedRoles.includes(userProfile.profile.role)) {
      if (userProfile.profile.role === 'Admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'portal.html';
      }
      return null;
    }

    return userProfile;
  },

  // Log a download activity
  async logDownload(staffName, email) {
    const { error } = await supabaseClient
      .from('downloads')
      .insert([
        {
          user_id: (await this.getSession()).user.id,
          staff_name: staffName,
          email: email
        }
      ]);
    if (error) console.error("Error logging download:", error);
  },

  // Get public URL for the company profile file
  getCompanyProfileUrl() {
    const { data } = supabaseClient.storage
      .from('company_files')
      .getPublicUrl('innovarch_profile.pdf');
    return data.publicUrl;
  }
};

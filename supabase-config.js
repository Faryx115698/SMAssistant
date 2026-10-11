// supabase-config.js - Centralized Supabase Client Initialization

// 1. Supabase project credentials
const SUPABASE_URL = "https://xlsmuakkcicxwdllyrou.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tgiJGeZyZ2Lz1MWa82Ryig_6z-IKlu2";

// 2. Check configuration
const isConfigured = true;

// 3. Initialize Supabase client
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
window.sb = sb;

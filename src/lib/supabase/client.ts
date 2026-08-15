import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qpjannbvxpqqbvpclllq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwamFubmJ2eHBxcWJ2cGNsbGxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTAwODMsImV4cCI6MjEwMjEyNjA4M30.F0U4NmYvgoeSM3JvaSi_Ca-5V4KFB84MdugsDTYx5KU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

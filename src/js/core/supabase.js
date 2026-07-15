import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// IMPORTANT: Replace these with your actual Supabase project URL and anon key.
const SUPABASE_URL = 'https://dczrntcshmrtabmqpbfv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nJvord-NmH97CW6yxM2Kfw_kRyOh8U-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

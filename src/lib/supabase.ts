import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '').trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.warn('⚠️ Supabase credentials missing or using placeholders. Tactical Real-time features will be disabled.');
  console.warn('👉 FIX: Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your AI Studio Settings (Gear Icon).');
}

if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.error('❌ Invalid VITE_SUPABASE_URL: Must start with https://');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

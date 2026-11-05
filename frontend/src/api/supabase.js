import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_SETUP_MESSAGE =
  'BookBase isn\'t connected to Supabase yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env, then restart.';

if (!url || !anonKey) {
  console.error(SUPABASE_SETUP_MESSAGE);
}

/**
 * The browser's only way to BookBase's data. The anon key is meant to be public: it can only
 * reach what the database grants to signed-out and signed-in visitors, which is its functions.
 * Each portal keeps its own sign-in, even when several are hosted on one domain.
 */
export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: { storageKey: `bb_auth_${import.meta.env.VITE_PORTAL}` },
    })
  : null;

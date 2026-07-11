// A Supabase client, this has
// full backend privileges (bypasses RLS entirely)
//
// Right now only use this for one thing: verifying a user's
// login token (JWT) on incoming requests. Later could also 
// use for admin-only actions, like force-resolving a market.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
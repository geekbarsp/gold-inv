import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and add your credentials.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "ngj-inventory-server" } },
  });
}

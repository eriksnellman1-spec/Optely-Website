import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Service role-klient – går förbi RLS.
 * Får BARA användas i app/api/webhooks/* (och liknande servervägar utan användare).
 * `server-only` gör att bygget fallerar om den importeras i klientkod.
 */
export function createServiceClient() {
  const { url } = requirePublicSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY saknas.");
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

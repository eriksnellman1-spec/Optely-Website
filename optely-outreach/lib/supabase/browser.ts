import { createBrowserClient } from "@supabase/ssr";

import { requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "./types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Supabase-klient för klientkomponenter (live-sök, realtime). Återanvänds. */
export function createClient() {
  if (!client) {
    const { url, anonKey } = requirePublicSupabaseEnv();
    client = createBrowserClient<Database>(url, anonKey);
  }
  return client;
}

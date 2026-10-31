import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Supabase-klient för Server Components, Server Actions och Route Handlers.
 * Kör som den inloggade användaren (RLS gäller).
 */
export async function createClient() {
  // cookies() först – gör anroparen dynamisk så att den aldrig förrenderas vid build.
  const cookieStore = await cookies();
  const { url, anonKey } = requirePublicSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Anropat från en Server Component – proxy.ts förnyar sessionen.
        }
      },
    },
  });
}

/**
 * Publika Supabase-värden. Kan läsas både på servern och i webbläsaren.
 * Returnerar null i stället för att kasta så att bygget och /login fungerar
 * även innan .env.local är ifylld.
 */
export function getPublicSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function requirePublicSupabaseEnv(): { url: string; anonKey: string } {
  const env = getPublicSupabaseEnv();
  if (!env) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_ANON_KEY saknas. Kopiera .env.example till .env.local och fyll i.",
    );
  }
  return env;
}

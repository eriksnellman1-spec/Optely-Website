import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getPublicSupabaseEnv } from "@/lib/env";
import type { Database } from "./types";

const PUBLIC_PATHS = ["/login"];
const PUBLIC_PREFIXES = ["/api/webhooks/"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/** Förnyar Supabase-sessionen och skyddar allt utom /login och /api/webhooks/*. */
export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Webhooks autentiseras med x-optely-secret i routen, inte med cookies.
  if (pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next({ request });
  }

  const env = getPublicSupabaseEnv();
  if (!env) {
    // Inte konfigurerat än – visa login-sidan som förklarar vad som saknas.
    if (isPublic(pathname)) return NextResponse.next({ request });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Viktigt: inget annat mellan createServerClient och getClaims().
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);

  if (!isSignedIn && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return withCookies(NextResponse.redirect(url), response);
  }

  if (isSignedIn && pathname === "/login") {
    return withCookies(NextResponse.redirect(new URL("/", request.url)), response);
  }

  return response;
}

function withCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

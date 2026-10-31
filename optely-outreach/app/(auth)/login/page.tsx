import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { LogoMark } from "@/components/brand/logo";
import { getPublicSupabaseEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Logga in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const configured = getPublicSupabaseEnv() !== null;

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--brand)_10%,transparent),transparent_70%)]"
      />
      <div className="relative w-full max-w-[340px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface">
            <LogoMark className="size-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Optely Outreach Runtime</h1>
            <p className="mt-1 text-sm text-muted-foreground">Logga in för att fortsätta</p>
          </div>
        </div>

        {!configured && (
          <div className="mb-4 rounded-md border border-status-yellow/30 bg-status-yellow/10 px-3 py-2 text-xs text-status-yellow">
            Supabase är inte konfigurerat. Kopiera <code className="font-mono">.env.example</code> till{" "}
            <code className="font-mono">.env.local</code> och fyll i projektets nycklar.
          </div>
        )}

        <LoginForm next={next} />

        <p className="mt-6 text-center text-xs text-subtle">
          Ingen publik registrering. Konton skapas i Supabase.
        </p>
      </div>
    </main>
  );
}

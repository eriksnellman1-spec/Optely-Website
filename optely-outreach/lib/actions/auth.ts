"use server";

import { redirect } from "next/navigation";

import { getPublicSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null; email: string };

function translateAuthError(message: string, status?: number): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Fel e-postadress eller lösenord.";
  if (m.includes("email not confirmed")) return "E-postadressen är inte bekräftad ännu.";
  if (m.includes("rate limit") || status === 429) return "För många försök. Vänta en stund och försök igen.";
  if (m.includes("fetch") || m.includes("network")) return "Kunde inte nå inloggningstjänsten. Kontrollera anslutningen.";
  return "Inloggningen misslyckades. Försök igen.";
}

function safeNext(next: FormDataEntryValue | null): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!getPublicSupabaseEnv()) {
    return { error: "Supabase är inte konfigurerat. Fyll i .env.local först.", email };
  }
  if (!email || !password) {
    return { error: "Fyll i både e-postadress och lösenord.", email };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Det där ser inte ut som en giltig e-postadress.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: translateAuthError(error.message, error.status), email };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/server";

export type NewContactInput = {
  /** Befintligt bolag – eller lämna tomt och ange companyName för nytt bolag. */
  companyId?: string | null;
  companyName?: string;
  companyCity?: string;
  firstName: string;
  lastName?: string;
  role?: string;
  email?: string;
  phone?: string;
};

const clean = (v: string | undefined | null) => {
  const t = (v ?? "").trim();
  return t.length ? t : null;
};

export async function createContact(
  input: NewContactInput,
): Promise<ActionResult<{ companyId: string; contactId: string }>> {
  const firstName = clean(input.firstName);
  const email = clean(input.email);
  if (!firstName) return { ok: false, error: "Förnamn krävs." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Ogiltig e-postadress." };
  }

  const supabase = await createClient();
  let companyId = clean(input.companyId);

  if (!companyId) {
    const name = clean(input.companyName);
    if (!name) return { ok: false, error: "Välj ett bolag eller ange namnet på ett nytt." };
    const { data, error } = await supabase
      .from("companies")
      .insert({ name, city: clean(input.companyCity), source: "manuell" })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "Kunde inte skapa bolaget." };
    companyId = data.id;
  }

  const { count } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      company_id: companyId,
      first_name: firstName,
      last_name: clean(input.lastName),
      role: clean(input.role),
      email,
      phone: clean(input.phone),
      is_primary: (count ?? 0) === 0,
    })
    .select("id")
    .single();

  if (error || !contact) {
    if (error?.code === "23505") return { ok: false, error: "En kontakt med den e-postadressen finns redan." };
    return { ok: false, error: "Kunde inte spara kontakten." };
  }

  revalidatePath("/contacts");
  return { ok: true, data: { companyId, contactId: contact.id } };
}

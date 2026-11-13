"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/server";

export type NewContactInput = {
  /** Befintligt bolag – eller lämna tomt och ange companyName för nytt bolag. */
  companyId?: string | null;
  companyName?: string;
  companyCity?: string;
  companyWebsite?: string;
  /** Lägg till nytt bolag trots att dubblettkontrollen hittade en match. */
  force?: boolean;
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

export type Duplicate = { companyId: string | null; name: string; status: string | null; matchedOn: string };

export type CreateContactResult =
  | ActionResult<{ companyId: string; contactId: string }>
  | { ok: false; error: string; duplicates: Duplicate[] };

export async function createContact(input: NewContactInput): Promise<CreateContactResult> {
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

    // Dubblettkontroll (docs/saljsystem.md §2): namn, e-postdomän, telefon – mot bolag och partner.
    if (!input.force) {
      const { data: dups, error: dupError } = await supabase.rpc("find_company_duplicates", {
        p_name: name,
        p_website: clean(input.companyWebsite) ?? undefined,
        p_email: email ?? undefined,
        p_phone: clean(input.phone) ?? undefined,
      });
      if (dupError) return { ok: false, error: "Dubblettkontrollen misslyckades. Försök igen." };
      if (dups && dups.length > 0) {
        return {
          ok: false,
          error: "Bolaget verkar redan finnas.",
          duplicates: dups.map((d) => ({
            companyId: d.company_id,
            name: d.name ?? "Okänt bolag",
            status: d.status,
            matchedOn: d.matched_on ?? "namn",
          })),
        };
      }
    }

    const { data, error } = await supabase
      .from("companies")
      .insert({ name, city: clean(input.companyCity), website: clean(input.companyWebsite), source: "manuell" })
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

/** Redigera en kontakt direkt i Ringpassets kort. */
export async function updateContact(input: {
  contactId: string;
  firstName: string;
  lastName?: string;
  role?: string;
  phone?: string;
  email?: string;
}): Promise<ActionResult> {
  const firstName = clean(input.firstName);
  const email = clean(input.email);
  if (!firstName) return { ok: false, error: "Förnamn krävs." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Ogiltig e-postadress." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({
      first_name: firstName,
      last_name: clean(input.lastName),
      role: clean(input.role),
      phone: clean(input.phone),
      email: email ? email.toLowerCase() : null,
    })
    .eq("id", input.contactId);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "En annan kontakt har redan den e-postadressen." };
    return { ok: false, error: "Kunde inte spara kontakten." };
  }
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}


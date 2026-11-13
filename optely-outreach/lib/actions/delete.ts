"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { COMPANY_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHUNK = 200;

function validIds(ids: string[]): string[] | null {
  const clean = [...new Set(ids)];
  return clean.length > 0 && clean.every((id) => UUID.test(id)) ? clean : null;
}

/** Raderar bolag med id. Allt som hör till bolaget (kontakter, samtal, mejl, uppgifter, möten, affärer) följer med. */
export async function deleteCompanies(ids: string[]): Promise<ActionResult<{ deleted: number }>> {
  const list = validIds(ids);
  if (!list) return { ok: false, error: "Välj minst ett bolag." };
  const supabase = await createClient();
  let deleted = 0;
  for (let i = 0; i < list.length; i += CHUNK) {
    const { data, error } = await supabase.from("companies").delete().in("id", list.slice(i, i + CHUNK)).select("id");
    if (error) return { ok: false, error: `Kunde inte radera alla – ${deleted} raderades innan felet.` };
    deleted += data.length;
  }
  revalidatePath("/", "layout");
  return { ok: true, data: { deleted } };
}

export type CompanyFilter = {
  offer: "all" | Enums<"offer">;
  status: Enums<"company_status"> | null;
  city: string | null;
  q: string;
};

/** Raderar alla bolag som matchar filtret på Företag (växeln, status, ort, sökning). */
export async function deleteCompaniesMatching(filter: CompanyFilter): Promise<ActionResult<{ deleted: number }>> {
  const supabase = await createClient();
  let query = supabase.from("companies").delete().not("id", "is", null);
  if (filter.offer === "optely" || filter.offer === "sba") query = query.eq("offer", filter.offer);
  if (filter.status && filter.status in COMPANY_STATUS) query = query.eq("status", filter.status);
  if (filter.city) query = query.eq("city", filter.city);
  if (filter.q.trim()) query = query.ilike("name", `%${filter.q.trim().replace(/[%,()*\\]/g, " ")}%`);
  const { data, error } = await query.select("id");
  if (error) return { ok: false, error: "Kunde inte radera bolagen." };
  revalidatePath("/", "layout");
  return { ok: true, data: { deleted: data.length } };
}

/** Raderar partner med id. Check-ins och partneruppgifter följer med; hänvisade bolag finns kvar utan partner. */
export async function deletePartners(ids: string[]): Promise<ActionResult<{ deleted: number }>> {
  const list = validIds(ids);
  if (!list) return { ok: false, error: "Välj minst en partner." };
  const supabase = await createClient();
  let deleted = 0;
  for (let i = 0; i < list.length; i += CHUNK) {
    const { data, error } = await supabase.from("partners").delete().in("id", list.slice(i, i + CHUNK)).select("id");
    if (error) return { ok: false, error: `Kunde inte radera alla – ${deleted} raderades innan felet.` };
    deleted += data.length;
  }
  revalidatePath("/", "layout");
  return { ok: true, data: { deleted } };
}

export async function deleteAllPartners(): Promise<ActionResult<{ deleted: number }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("partners").delete().not("id", "is", null).select("id");
  if (error) return { ok: false, error: "Kunde inte radera partnerna." };
  revalidatePath("/", "layout");
  return { ok: true, data: { deleted: data.length } };
}

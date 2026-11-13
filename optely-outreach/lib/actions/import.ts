"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export type ImportRow = Partial<
  Record<
    | "name"
    | "business_id"
    | "city"
    | "postal_city"
    | "industry"
    | "employees"
    | "revenue_eur"
    | "phone"
    | "website"
    | "email"
    | "ceo_name"
    | "notes"
    | "source",
    string
  >
>;

export type PreviewRow = {
  row: number;
  offer: "optely" | "sba";
  duplicates: { name: string; matched_on: string; status: string | null }[];
};

const MAX_ROWS = 3000;

const str = (v: Json | undefined) => (typeof v === "string" ? v : null);
const isObj = (v: Json | undefined): v is { [key: string]: Json | undefined } =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function toPreviewRow(v: Json, i: number): PreviewRow {
  const o = isObj(v) ? v : {};
  const dups = Array.isArray(o.duplicates) ? o.duplicates : [];
  return {
    row: typeof o.row === "number" ? o.row : i + 1,
    offer: o.offer === "sba" ? "sba" : "optely",
    duplicates: dups.filter(isObj).map((d) => ({
      name: str(d.name) ?? "okänt",
      matched_on: str(d.matched_on) ?? "",
      status: str(d.status),
    })),
  };
}

function clean(rows: ImportRow[]): Json {
  return rows.slice(0, MAX_ROWS).map((r) => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) if (typeof v === "string" && v.trim()) o[k] = v.trim();
    return o;
  });
}

/** Förhandsvisning: erbjudande och dubbletter per rad. */
export async function previewImport(rows: ImportRow[]): Promise<ActionResult<PreviewRow[]>> {
  if (rows.length === 0) return { ok: false, error: "Filen innehåller inga rader." };
  if (rows.length > MAX_ROWS) return { ok: false, error: `Max ${MAX_ROWS} rader per import.` };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_import", { p_rows: clean(rows) });
  if (error || !Array.isArray(data)) return { ok: false, error: "Kunde inte förhandsgranska filen." };
  return { ok: true, data: data.map(toPreviewRow) };
}

/** Import: nya bolag med status Ny (+ VD som kontakt). Dubbletter hoppas över om inget annat väljs. */
export async function importCompanies(
  rows: ImportRow[],
  skipDuplicates: boolean,
): Promise<ActionResult<{ imported: number; skipped: number; contacts: number }>> {
  if (rows.length === 0) return { ok: false, error: "Inga rader att importera." };
  if (rows.length > MAX_ROWS) return { ok: false, error: `Max ${MAX_ROWS} rader per import.` };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_companies", { p_rows: clean(rows), p_skip_duplicates: skipDuplicates });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "Importen misslyckades – inget sparades." };
  }
  revalidatePath("/", "layout");
  return {
    ok: true,
    data: { imported: Number(data.imported ?? 0), skipped: Number(data.skipped ?? 0), contacts: Number(data.contacts ?? 0) },
  };
}

/** Tar bort testbolag och testpartner (.test-adresser). Manus, mallar och inställningar behålls. */
export async function clearTestData(): Promise<ActionResult<{ companies: number; partners: number }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("clear_test_data");
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "Kunde inte tömma testdatan." };
  revalidatePath("/", "layout");
  return { ok: true, data: { companies: Number(data.companies ?? 0), partners: Number(data.partners ?? 0) } };
}

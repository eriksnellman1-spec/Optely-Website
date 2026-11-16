"use server";

import { revalidatePath } from "next/cache";

import type { Duplicate } from "@/lib/actions/contacts";
import type { ActionResult } from "@/lib/actions/types";
import { DEAL_STAGE_LABEL, PIPELINE_STAGES } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type AddToPipelineInput = {
  /** Befintligt bolag – eller tomt och companyName för nytt. */
  companyId?: string | null;
  companyName?: string;
  offer?: Enums<"offer">;
  stage: PipelineStage;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  source: string;
  /** Skapa nytt bolag trots dubblettträff. */
  force?: boolean;
};

export type AddToPipelineResult =
  | ActionResult<{ companyId: string }>
  | { ok: false; error: string; duplicates: Duplicate[] };

const clean = (v: string | undefined | null) => {
  const t = (v ?? "").trim();
  return t.length ? t : null;
};

const today = () =>
  new Intl.DateTimeFormat("fi-FI", { timeZone: "Europe/Helsinki", day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(),
  );

/** Lägger ett befintligt eller nytt bolag i pipelinen, med kontaktperson och källa. */
export async function addToPipeline(input: AddToPipelineInput): Promise<AddToPipelineResult> {
  if (!PIPELINE_STAGES.includes(input.stage)) return { ok: false, error: "Välj ett steg." };
  const source = clean(input.source);
  if (!source) return { ok: false, error: "Välj varifrån affären kom." };
  const email = clean(input.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Ogiltig e-postadress." };
  const phone = clean(input.phone);
  const firstName = clean(input.firstName) ?? (phone || email ? "Kontakt" : null);
  const note = `Lagd i pipeline ${today()} · källa: ${source}`;

  const supabase = await createClient();
  let companyId = clean(input.companyId);

  if (companyId) {
    const { data: company } = await supabase.from("companies").select("id, notes, do_not_contact").eq("id", companyId).maybeSingle();
    if (!company) return { ok: false, error: "Bolaget finns inte längre." };
    if (company.do_not_contact) return { ok: false, error: "Bolaget har Kontakta ej och kan inte läggas i pipelinen." };
    const { data: deals } = await supabase.from("deals").select("stage").eq("company_id", companyId);
    const open = (deals ?? []).find((d) => d.stage !== "kund" && d.stage !== "forlorad");
    if (open) {
      return { ok: false, error: `Bolaget finns redan i pipelinen (${DEAL_STAGE_LABEL[open.stage]}). Flytta det där i stället.` };
    }
    await supabase
      .from("companies")
      .update({ notes: company.notes ? `${company.notes}\n${note}` : note })
      .eq("id", companyId);
  } else {
    const name = clean(input.companyName);
    if (!name) return { ok: false, error: "Skriv bolagets namn." };
    if (!input.force) {
      const { data: dups, error: dupError } = await supabase.rpc("find_company_duplicates", {
        p_name: name,
        p_email: email ?? undefined,
        p_phone: phone ?? undefined,
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
      .insert({ name, offer: input.offer === "sba" ? "sba" : "optely", source, notes: note, phone })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "Kunde inte skapa bolaget." };
    companyId = data.id;
  }

  if (firstName) {
    const { count } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);
    const { error } = await supabase.from("contacts").insert({
      company_id: companyId,
      first_name: firstName,
      last_name: clean(input.lastName),
      phone,
      email: email?.toLowerCase() ?? null,
      is_primary: (count ?? 0) === 0,
    });
    if (error) {
      return {
        ok: false,
        error:
          error.code === "23505"
            ? "En kontakt med den e-postadressen finns redan. Bolaget sparades men lades inte i pipelinen."
            : "Kunde inte spara kontaktpersonen. Bolaget sparades men lades inte i pipelinen.",
      };
    }
  }

  const { error: stageError } = await supabase.rpc("move_deal_stage", { p_company_id: companyId, p_stage: input.stage });
  if (stageError) return { ok: false, error: "Bolaget sparades men kunde inte läggas i pipelinen." };

  revalidatePath("/", "layout");
  return { ok: true, data: { companyId } };
}

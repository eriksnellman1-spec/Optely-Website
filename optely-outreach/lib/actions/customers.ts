"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/server";

export async function saveOptelyCustomer(input: {
  companyId: string;
  project: string;
  invoiced: boolean;
  invoiceNote: string;
  maintenance: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers_optely").upsert(
    {
      company_id: input.companyId,
      project: input.project.trim() || null,
      invoiced: input.invoiced,
      invoice_note: input.invoiceNote.trim() || null,
      maintenance_agreement: input.maintenance,
    },
    { onConflict: "company_id" },
  );
  if (error) return { ok: false, error: "Kunde inte spara kunden." };
  revalidatePath("/customers");
  return { ok: true, data: undefined };
}

/** Bokningar per SBA-kund och månad (manuellt tills GoHighLevel kopplas). */
export async function saveSbaBookings(input: { companyId: string; month: string; bookings: number }): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-01$/.test(input.month)) return { ok: false, error: "Ogiltig månad." };
  const bookings = Math.max(0, Math.round(Number(input.bookings) || 0));
  const supabase = await createClient();
  const { error } = await supabase
    .from("sba_clients")
    .upsert({ company_id: input.companyId, month: input.month, bookings }, { onConflict: "company_id,month" });
  if (error) return { ok: false, error: "Kunde inte spara bokningarna." };
  revalidatePath("/customers");
  return { ok: true, data: undefined };
}

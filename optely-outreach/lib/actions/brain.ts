"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/supabase/types";

export type ContextEntry = Tables<"context_entries">;

export async function saveContextEntry(input: {
  id: string;
  title: string;
  content: string;
  kind: Enums<"context_kind">;
  isActive: boolean;
}): Promise<ActionResult<{ updatedAt: string }>> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Rubriken får inte vara tom." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("context_entries")
    .update({ title, content: input.content, kind: input.kind, is_active: input.isActive })
    .eq("id", input.id)
    .select("updated_at")
    .single();

  if (error || !data) return { ok: false, error: "Kunde inte spara. Försök igen." };
  revalidatePath("/brain");
  return { ok: true, data: { updatedAt: data.updated_at } };
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "post"
  );
}

export async function createContextEntry(input: {
  title: string;
  kind: Enums<"context_kind">;
}): Promise<ActionResult<ContextEntry>> {
  const title = input.title.trim() || "Ny post";
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("context_entries")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("context_entries")
    .insert({
      title,
      kind: input.kind,
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      content: "",
      sort_order: (last?.sort_order ?? 0) + 10,
    })
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: "Kunde inte skapa posten." };
  revalidatePath("/brain");
  return { ok: true, data };
}

export async function deleteContextEntry(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("context_entries").delete().eq("id", id);
  if (error) return { ok: false, error: "Kunde inte ta bort posten." };
  revalidatePath("/brain");
  return { ok: true, data: undefined };
}

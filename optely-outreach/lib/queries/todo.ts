import "server-only";

import type { TodoData } from "@/components/ringpass/todo-panel";
import type { OfferFilter } from "@/lib/offer";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const fullName = (k: { first_name: string; last_name: string | null } | null) =>
  k ? [k.first_name, k.last_name].filter(Boolean).join(" ") : null;

/** "Att göra för hand": SMS, kalenderhändelser och LinkedIn-påminnelser som förfaller i dag. */
export async function loadTodo(supabase: Client, tomorrowIso: string, offer: OfferFilter = "all"): Promise<TodoData> {
  const keep = (c: { offer: string } | null) => offer === "all" || c?.offer === offer;
  const [smsRes, meetingsRes, linkedinRes] = await Promise.all([
    supabase
      .from("sms_messages")
      .select("id, to_phone, body, due_at, template, company:companies(name, offer), contact:contacts(first_name, last_name)")
      .eq("status", "pending")
      .lt("due_at", tomorrowIso)
      .order("due_at"),
    supabase
      .from("meetings")
      .select("id, title, starts_at, ends_at, location, company:companies(name, offer), contact:contacts(first_name, last_name, email, phone)")
      .eq("status", "scheduled")
      .is("calendar_added_at", null)
      .order("starts_at"),
    supabase
      .from("tasks")
      .select("id, title, company:companies(name, offer), contact:contacts(first_name, last_name)")
      .eq("status", "open")
      .eq("type", "linkedin")
      .lt("due_at", tomorrowIso)
      .order("due_at"),
  ]);

  return {
    sms: (smsRes.data ?? []).filter((s) => keep(s.company)).map((s) => ({
      id: s.id,
      toPhone: s.to_phone,
      body: s.body,
      dueAt: s.due_at,
      kind: s.template === "sms-bokat" ? "Bekräftelse" : "Efter obesvarat samtal",
      companyName: s.company?.name ?? "",
      contactName: fullName(s.contact),
    })),
    meetings: (meetingsRes.data ?? []).filter((m) => keep(m.company)).map((m) => ({
      id: m.id,
      title: m.title,
      startsAt: m.starts_at,
      endsAt: m.ends_at,
      location: m.location,
      companyName: m.company?.name ?? "",
      contactName: fullName(m.contact),
      contactEmail: m.contact?.email ?? null,
      contactPhone: m.contact?.phone ?? null,
    })),
    linkedin: (linkedinRes.data ?? []).filter((t) => keep(t.company)).map((t) => ({
      id: t.id,
      title: t.title,
      companyName: t.company?.name ?? "",
      contactName: fullName(t.contact),
    })),
  };
}

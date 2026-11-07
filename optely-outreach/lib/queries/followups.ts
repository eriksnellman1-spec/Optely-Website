import "server-only";

import type { OfferFilter } from "@/lib/offer";
import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type FollowupData = {
  notices: Tables<"notices">[];
  meetings: {
    id: string;
    title: string;
    starts_at: string;
    location: string | null;
    companyName: string;
    offer: "optely" | "sba" | null;
    contactName: string | null;
    phone: string | null;
    isToday: boolean;
  }[];
  partners: Tables<"partners_due">[];
};

/** Dagens uppföljningar på Idag: svar/tips, möten i dag och i morgon, partner att höra (bara Optely). */
export async function loadFollowups(supabase: Client, tomorrowIso: string, offer: OfferFilter): Promise<FollowupData> {
  const dayAfter = new Date(new Date(tomorrowIso).getTime() + 86_400_000).toISOString();

  let noticesQuery = supabase.from("notices").select("*").order("created_at", { ascending: false });
  if (offer !== "all") noticesQuery = noticesQuery.eq("offer", offer);

  const [noticesRes, meetingsRes, partnersRes] = await Promise.all([
    noticesQuery,
    supabase
      .from("meetings")
      .select("id, title, starts_at, location, company:companies(name, offer), contact:contacts(first_name, last_name, phone)")
      .eq("status", "scheduled")
      .lt("starts_at", dayAfter)
      .order("starts_at"),
    offer === "sba"
      ? Promise.resolve({ data: [] as Tables<"partners_due">[], error: null })
      : supabase.from("partners_due").select("*").order("last_checkin_at", { ascending: true, nullsFirst: true }),
  ]);

  return {
    notices: noticesRes.data ?? [],
    meetings: (meetingsRes.data ?? [])
      .filter((m) => offer === "all" || m.company?.offer === offer)
      .map((m) => ({
        id: m.id,
        title: m.title,
        starts_at: m.starts_at,
        location: m.location,
        companyName: m.company?.name ?? m.title,
        offer: m.company?.offer ?? null,
        contactName: m.contact ? [m.contact.first_name, m.contact.last_name].filter(Boolean).join(" ") : null,
        phone: m.contact?.phone ?? null,
        isToday: m.starts_at < tomorrowIso,
      })),
    partners: partnersRes.data ?? [],
  };
}

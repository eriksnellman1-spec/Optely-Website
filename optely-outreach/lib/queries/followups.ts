import "server-only";

import type { OfferFilter } from "@/lib/offer";
import type { createClient } from "@/lib/supabase/server";
import type { NextStep } from "@/components/partners/partner-step";
import { toNextStep } from "@/lib/queries/partner-steps";
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
  partners: NextStep[];
};

/** Dagens uppföljningar på Idag: svar/tips, möten i dag och i morgon, partner att höra (bara Optely). */
export async function loadFollowups(
  supabase: Client,
  tomorrowIso: string,
  offer: OfferFilter,
): Promise<FollowupData> {
  const dayAfter = new Date(
    new Date(tomorrowIso).getTime() + 86_400_000,
  ).toISOString();

  let noticesQuery = supabase
    .from("notices")
    .select("*")
    .order("created_at", { ascending: false });
  if (offer !== "all") noticesQuery = noticesQuery.eq("offer", offer);

  const [noticesRes, meetingsRes, partnersRes] = await Promise.all([
    noticesQuery,
    supabase
      .from("meetings")
      .select(
        "id, title, starts_at, location, company:companies(name, offer), contact:contacts(first_name, last_name, phone)",
      )
      .eq("status", "scheduled")
      .lt("starts_at", dayAfter)
      .order("starts_at"),
    offer === "sba"
      ? Promise.resolve({
          data: [] as Tables<"partner_next_step">[],
          error: null,
        })
      : supabase
          .from("partner_next_step")
          .select("*")
          .lte("sort_rank", 2)
          .order("sort_rank")
          .order("due_date")
          .limit(50),
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
        contactName: m.contact
          ? [m.contact.first_name, m.contact.last_name]
              .filter(Boolean)
              .join(" ")
          : null,
        phone: m.contact?.phone ?? null,
        isToday: m.starts_at < tomorrowIso,
      })),
    partners: (partnersRes.data ?? [])
      .map(toNextStep)
      .filter((x): x is NextStep => x !== null),
  };
}

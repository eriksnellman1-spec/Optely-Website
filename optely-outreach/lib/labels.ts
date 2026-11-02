import type { StatusTone } from "@/components/ui/status-dot";
import type { Enums } from "@/lib/supabase/types";

/** Statusar enligt docs/saljsystem.md §8. */
export const COMPANY_STATUS: Record<Enums<"company_status">, { label: string; tone: StatusTone }> = {
  new: { label: "Ny", tone: "neutral" },
  in_sequence: { label: "I sekvens", tone: "blue" },
  replied: { label: "Svarat", tone: "green" },
  meeting_booked: { label: "Behovssamtal bokat", tone: "brand" },
  meeting_done: { label: "Behovssamtal klart", tone: "brand" },
  solution_shown: { label: "Lösning visad", tone: "brand" },
  quote_sent: { label: "Offert skickad", tone: "brand" },
  customer: { label: "Kund", tone: "brand" },
  nurture: { label: "Vilande", tone: "yellow" },
  no: { label: "Nej", tone: "red" },
  do_not_contact: { label: "Kontakta ej", tone: "red" },
  with_partner: { label: "Hos partner", tone: "green" },
};

export const COMPANY_STATUS_ORDER: Enums<"company_status">[] = [
  "new",
  "in_sequence",
  "replied",
  "meeting_booked",
  "meeting_done",
  "solution_shown",
  "quote_sent",
  "customer",
  "with_partner",
  "nurture",
  "no",
  "do_not_contact",
];

export const CONTEXT_KIND: Record<Enums<"context_kind">, string> = {
  profile: "Profil",
  offer: "Erbjudande",
  icp: "Idealkund",
  case: "Case",
  script: "Manus",
  objection: "Invändningar",
  tone: "Ton & skrivregler",
  template: "Mejlmallar",
  other: "Övrigt",
};

export const CONTEXT_KIND_ORDER: Enums<"context_kind">[] = [
  "profile",
  "offer",
  "icp",
  "case",
  "script",
  "objection",
  "tone",
  "template",
  "other",
];

export const PARTNER_TYPE: Record<Enums<"partner_type">, string> = {
  it: "IT",
  accounting: "Bokföring",
  web: "Webb",
  marketing: "Webb & reklam",
  other: "Affärssystem / övrigt",
};

export const CHANNEL_LABEL: Record<string, string> = {
  email: "Mejl",
  phone: "Ringpass",
  partners: "Partners",
  strategy: "Strategi",
  linkedin: "LinkedIn",
  off: "Ledigt",
};

import type { StatusTone } from "@/components/ui/status-dot";
import type { Enums } from "@/lib/supabase/types";

export const COMPANY_STATUS: Record<Enums<"company_status">, { label: string; tone: StatusTone }> = {
  new: { label: "Ny", tone: "neutral" },
  researching: { label: "Research", tone: "neutral" },
  contacted: { label: "Kontaktad", tone: "blue" },
  replied: { label: "Svarat", tone: "blue" },
  warm: { label: "Varm", tone: "green" },
  meeting_booked: { label: "Möte bokat", tone: "brand" },
  customer: { label: "Kund", tone: "brand" },
  lost: { label: "Förlorad", tone: "red" },
};

export const COMPANY_STATUS_ORDER: Enums<"company_status">[] = [
  "new",
  "researching",
  "contacted",
  "replied",
  "warm",
  "meeting_booked",
  "customer",
  "lost",
];

export const CONTEXT_KIND: Record<Enums<"context_kind">, string> = {
  profile: "Profil",
  offer: "Erbjudande",
  icp: "Idealkund",
  case: "Case",
  script: "Manus",
  objection: "Invändningar",
  tone: "Ton & skrivregler",
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
  "other",
];

export const PARTNER_TYPE: Record<Enums<"partner_type">, string> = {
  it: "IT",
  accounting: "Bokföring",
  web: "Webb",
  marketing: "Marknadsföring",
  other: "Övrigt",
};

export const CHANNEL_LABEL: Record<string, string> = {
  email: "Mejl",
  phone: "Ringpass",
  partners: "Partners",
  strategy: "Strategi",
  linkedin: "LinkedIn",
  off: "Ledigt",
};

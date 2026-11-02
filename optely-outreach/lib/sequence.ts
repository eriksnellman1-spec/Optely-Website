/**
 * Uppföljningssekvensen för kalla samtal. Spegling av SQL-funktionerna i
 * supabase/migrations/0003_ringpass_sequence.sql – databasen är sanningen,
 * den här filen används bara för att visa stegen i UI:t.
 */

export type SequenceChannel = "email" | "phone";

export const SEQUENCE_STEPS: { step: number; channel: SequenceChannel; label: string; short: string }[] = [
  { step: 1, channel: "email", label: "Mejl 1 (Gatekeeper)", short: "Mejl 1" },
  { step: 2, channel: "phone", label: "Samtal 1", short: "Samtal 1" },
  { step: 3, channel: "phone", label: "Samtal 2 + röstmeddelande + \"ringde nyss\"-mejl", short: "Samtal 2" },
  { step: 4, channel: "email", label: "Case-mejl", short: "Case" },
  { step: 5, channel: "phone", label: "Samtal 3", short: "Samtal 3" },
  { step: 6, channel: "phone", label: "Samtal 4 + röstmeddelande", short: "Samtal 4" },
  { step: 7, channel: "email", label: "Avslutsmejl", short: "Avslut" },
  { step: 8, channel: "phone", label: "Sista samtalet", short: "Sista" },
];

export const NURTURE_DAYS = 90;

/** Steg där röstmeddelande är förväntat om ingen svarar. */
export const VOICEMAIL_STEPS = new Set([3, 6]);

export function stepInfo(step: number | null | undefined) {
  return SEQUENCE_STEPS.find((s) => s.step === step) ?? null;
}

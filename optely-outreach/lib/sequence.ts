/**
 * Samtalskanalen (docs/saljsystem.md §4). Logiken ligger i databasen
 * (apply_call_outcome i 0005_sales_engine.sql) – den här filen beskriver bara utfallen för UI:t.
 */

export const MAX_ATTEMPTS = 3;

export type Outcome =
  | "booked"
  | "no_answer"
  | "call_later"
  | "wrong_person"
  | "send_info"
  | "not_now"
  | "no_need"
  | "do_not_call";

export const OUTCOMES: Outcome[] = [
  "booked",
  "no_answer",
  "call_later",
  "wrong_person",
  "send_info",
  "not_now",
  "no_need",
  "do_not_call",
];

/** Vad som händer efter ett obesvarat samtal, beroende på försök. */
export function noAnswerHint(attempt: number | null) {
  if (attempt === 1) return "SMS skickas i morgon bitti och försök 2 läggs nästa ringdag.";
  if (attempt === 2) return "Försök 3 läggs nästa ringdag, på annan tid.";
  if (attempt === 3) return "Sista mejlet skickas (om e-post finns) och bolaget vilar i 2 månader.";
  return "Nytt försök nästa ringdag.";
}

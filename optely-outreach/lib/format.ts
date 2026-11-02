/** Formatering enligt CLAUDE.md: 31.10.2026, 14:05, Europe/Helsinki, 1 250 €. */

export const TIME_ZONE = "Europe/Helsinki";
const LOCALE = "sv-FI";

const dateFmt = new Intl.DateTimeFormat("fi-FI", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("fi-FI", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const weekdayFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, weekday: "long" });
const weekdayKeyFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "long" });

const eurFmt = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

type DateInput = Date | string | number;
const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

/** 31.10.2026 */
export function formatDate(d: DateInput): string {
  return dateFmt.format(toDate(d));
}

/** 14:05 */
export function formatTime(d: DateInput): string {
  return timeFmt.format(toDate(d)).replace(".", ":");
}

/** 31.10.2026 14:05 */
export function formatDateTime(d: DateInput): string {
  return `${formatDate(d)} ${formatTime(d)}`;
}

/** lördag */
export function formatWeekday(d: DateInput = new Date()): string {
  return weekdayFmt.format(toDate(d));
}

/** "saturday" – nyckel i settings.week_plan */
export function weekdayKey(d: DateInput = new Date()): string {
  return weekdayKeyFmt.format(toDate(d)).toLowerCase();
}

/** 1 250 € */
export function formatEur(value: number): string {
  // Intl ger hårt mellanslag (U+00A0/U+202F); normalisera till smalt hårt mellanslag.
  return eurFmt.format(value).replace(/ | /g, " ");
}

/** "i dag", "i går", "3 d sedan", annars datum. */
export function formatRelative(d: DateInput | null | undefined, now: Date = new Date()): string {
  if (!d) return "–";
  const date = toDate(d);
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 0) return formatDate(date);
  if (minutes < 1) return "nyss";
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.round(minutes / 60);
  if (formatDate(date) === formatDate(now)) return `${hours} h sedan`;
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (formatDate(date) === formatDate(yesterday)) return "i går";
  const days = Math.round(diffMs / 86_400_000);
  if (days < 30) return `${days} d sedan`;
  return formatDate(date);
}

/** Början av morgondagen i Helsingfors som ISO-sträng – gränsen för "i dag" i frågor. */
export function startOfTomorrowHelsinki(now: Date = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const offsetH = (Number(parts.hour) % 24 - now.getUTCHours() + 24) % 24; // 2 eller 3 h
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1, -offsetH)).toISOString();
}

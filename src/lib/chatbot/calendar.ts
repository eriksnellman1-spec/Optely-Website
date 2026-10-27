// Google Calendar access for the booking chatbot: free/busy lookup and event creation
// with a Google Meet link. Uses an OAuth refresh token for the calendar owner's account
// (see docs/chatbot-setup.md). All times are offered in Finnish time.

export const TIME_ZONE = "Europe/Helsinki";
export const MEETING_MINUTES = 15;
const DAY_START_HOUR = 8; // first slot 08:00
const DAY_END_HOUR = 16; // last slot ends 16:00
const MIN_NOTICE_MINUTES = 180; // no bookings sooner than 3 hours from now
const MAX_DAYS_AHEAD = 30;

export function calendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
  );
}

const calendarId = () => process.env.GOOGLE_CALENDAR_ID || "primary";

// ---------- time zone helpers (no date library needed) ----------

function offsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Wall-clock time in Helsinki -> UTC Date (handles DST). */
export function helsinkiToUtc(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let result = guess - offsetMinutes(new Date(guess), TIME_ZONE) * 60000;
  result = guess - offsetMinutes(new Date(result), TIME_ZONE) * 60000;
  return new Date(result);
}

/** UTC Date -> { date: "YYYY-MM-DD", time: "HH:MM", weekday: 0-6 (0 = Sunday) } in Helsinki. */
export function utcToHelsinki(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    weekday: weekdays.indexOf(get("weekday")),
  };
}

function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function slotTimes() {
  const times: string[] = [];
  for (let min = DAY_START_HOUR * 60; min + MEETING_MINUTES <= DAY_END_HOUR * 60; min += MEETING_MINUTES) {
    times.push(`${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`);
  }
  return times;
}

// ---------- Google API ----------

let cachedToken: { token: string; expires: number } | null = null;

async function accessToken() {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token error ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function busyIntervals(from: Date, to: Date) {
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      timeZone: TIME_ZONE,
      items: [{ id: calendarId() }],
    }),
  });
  if (!res.ok) throw new Error(`Google freeBusy error ${res.status}`);
  const data = (await res.json()) as {
    calendars: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }>;
  };
  const cal = Object.values(data.calendars)[0];
  if (!cal || cal.errors?.length) throw new Error("Google freeBusy calendar error");
  return (cal.busy ?? []).map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

const overlaps = (s: Date, e: Date, busy: { start: Date; end: Date }[]) =>
  busy.some((b) => s < b.end && e > b.start);

// ---------- what the chatbot tools call ----------

export async function availableSlots(startDate: string | undefined, weekdays: number) {
  const now = new Date();
  const earliest = new Date(now.getTime() + MIN_NOTICE_MINUTES * 60000);
  const latest = new Date(now.getTime() + MAX_DAYS_AHEAD * 86400000);
  const today = utcToHelsinki(now).date;
  let date = startDate && startDate > today ? startDate : today;

  const days: string[] = [];
  for (let i = 0; days.length < weekdays && i < MAX_DAYS_AHEAD + 7; i++) {
    const wd = weekdayOf(date);
    if (wd !== 0 && wd !== 6) days.push(date);
    date = addDays(date, 1);
  }
  if (days.length === 0) return [];

  const from = helsinkiToUtc(days[0], "00:00");
  const to = helsinkiToUtc(addDays(days[days.length - 1], 1), "00:00");
  const busy = await busyIntervals(from, to);
  const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  return days
    .map((d) => ({
      date: d,
      weekday: weekdayNames[weekdayOf(d)],
      times: slotTimes().filter((t) => {
        const s = helsinkiToUtc(d, t);
        const e = new Date(s.getTime() + MEETING_MINUTES * 60000);
        return s >= earliest && s <= latest && !overlaps(s, e, busy);
      }),
    }))
    .filter((d) => d.times.length > 0);
}

export interface BookingRequest {
  date: string;
  time: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  topic?: string;
}

/** Validates the slot again (rules + calendar) and creates the event. Throws a user-safe message. */
export async function bookMeeting(req: BookingRequest) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.date) || !slotTimes().includes(req.time)) {
    throw new BookingError("That time is not a bookable slot.");
  }
  const wd = weekdayOf(req.date);
  if (wd === 0 || wd === 6) throw new BookingError("Meetings can only be booked Monday to Friday.");
  const start = helsinkiToUtc(req.date, req.time);
  const end = new Date(start.getTime() + MEETING_MINUTES * 60000);
  const now = Date.now();
  if (start.getTime() < now + MIN_NOTICE_MINUTES * 60000) {
    throw new BookingError("That time is too soon. Please pick a time at least 3 hours ahead.");
  }
  if (start.getTime() > now + MAX_DAYS_AHEAD * 86400000) {
    throw new BookingError(`Meetings can be booked at most ${MAX_DAYS_AHEAD} days ahead.`);
  }
  if (overlaps(start, end, await busyIntervals(start, end))) {
    throw new BookingError("That time was just taken. Please choose another time.");
  }

  const details = [
    `Namn: ${req.name}`,
    `E-post: ${req.email}`,
    req.phone && `Telefon: ${req.phone}`,
    req.company && `Företag: ${req.company}`,
    req.topic && `Ämne: ${req.topic}`,
  ].filter(Boolean);
  const lines = [...details, "", "Bokat via chatboten på optely.eu."];

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId())}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `Optely: introduktionssamtal med ${req.name}${req.company ? ` (${req.company})` : ""}`,
        description: lines.join("\n"),
        start: { dateTime: start.toISOString(), timeZone: TIME_ZONE },
        end: { dateTime: end.toISOString(), timeZone: TIME_ZONE },
        attendees: [{ email: req.email, displayName: req.name }],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Google insert error ${res.status}`);
  const event = (await res.json()) as { hangoutLink?: string };
  return {
    date: req.date,
    time: req.time,
    durationMinutes: MEETING_MINUTES,
    meetLink: event.hangoutLink ?? null,
  };
}

export class BookingError extends Error {}

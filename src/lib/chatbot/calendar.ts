// Google Calendar access for the booking chatbot: availability lookup and event creation
// with a Google Meet link. Uses an OAuth refresh token for the calendar owner's account
// (see docs/chatbot-setup.md). All times are offered in Finnish time.

export const TIME_ZONE = "Europe/Helsinki";
export const MEETING_MINUTES = 15;
export const DAY_START_HOUR = 6; // first slot 06:00
export const DAY_END_HOUR = 22; // last slot ends 22:00 (every day of the week)
const MIN_NOTICE_MINUTES = 180; // no bookings sooner than 3 hours from now
const MAX_DAYS_AHEAD = 30;
const BUFFER_MINUTES = 15; // free time required before and after every other event
// Times that are never bookable on weekdays, in Finnish time (school lunch break)
const DAILY_BLOCKS = [{ start: "10:50", end: "11:45" }];

export function calendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
  );
}

const calendarId = () => process.env.GOOGLE_CALENDAR_ID || "primary";

// Which events block a booking (owner's rules):
// - Every timed event in the other calendars shown in Google Calendar (e.g. imported
//   Wilma school timetables). New imports count automatically; needs the
//   calendar.calendarlist.readonly scope, otherwise only GOOGLE_BUSY_CALENDAR_IDS is used.
// - In the owner's own calendar only meetings with other people (events with guests,
//   which includes meetings this bot books) and work shifts (titles in WORK_TITLE).
//   Gym, calls, reminders etc. can be moved, so they don't block.
// - All-day events and events marked "Free" never block.
const WORK_TITLE = /^(?!deep work$).*\bwork$/i; // "Work", "Safercuts work" - not "Deep work"
const CALENDAR_LIST_TTL_MS = 10 * 60_000;
let cachedCalendarList: { ids: string[]; primaryId: string | null; expires: number } | null = null;

async function calendarList() {
  if (cachedCalendarList && cachedCalendarList.expires > Date.now()) return cachedCalendarList;
  const ids: string[] = [];
  let primaryId: string | null = null;
  let pageToken = "";
  do {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
      { headers: { Authorization: `Bearer ${await accessToken()}` } }
    );
    if (res.status === 403) return { ids: [], primaryId: null }; // token lacks the calendar-list scope
    if (!res.ok) throw new Error(`Google calendarList error ${res.status}`);
    const data = (await res.json()) as {
      items?: { id: string; primary?: boolean; selected?: boolean; hidden?: boolean; deleted?: boolean }[];
      nextPageToken?: string;
    };
    for (const c of data.items ?? []) {
      if (c.primary) primaryId = c.id;
      // Only calendars switched on in Google Calendar; holiday calendars never block
      else if (c.selected && !c.hidden && !c.deleted && !c.id.endsWith("#holiday@group.v.calendar.google.com")) {
        ids.push(c.id);
      }
    }
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  cachedCalendarList = { ids, primaryId, expires: Date.now() + CALENDAR_LIST_TTL_MS };
  return cachedCalendarList;
}

/** Other calendars (all their timed events block), excluding the owner's own calendar. */
async function otherCalendarIds() {
  const { ids, primaryId } = await calendarList();
  const own = new Set([calendarId(), primaryId].filter(Boolean));
  const extra = (process.env.GOOGLE_BUSY_CALENDAR_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return Array.from(new Set([...ids, ...extra])).filter((id) => !own.has(id));
}

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

interface CalEvent {
  summary?: string;
  status?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; resource?: boolean }[];
}

async function listEvents(id: string, from: Date, to: Date) {
  const events: CalEvent[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: "true",
      maxResults: "250",
      fields: "items(summary,status,transparency,start,end,attendees(self,resource)),nextPageToken",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events?${params}`,
      { headers: { Authorization: `Bearer ${await accessToken()}` } }
    );
    // Fail closed: if a calendar can't be read we can't know the time is free
    if (!res.ok) throw new Error(`Google events error ${res.status} for ${id}`);
    const data = (await res.json()) as { items?: CalEvent[]; nextPageToken?: string };
    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return events;
}

const isTimedBusy = (e: CalEvent) =>
  e.status !== "cancelled" && e.transparency !== "transparent" && !!e.start?.dateTime && !!e.end?.dateTime;

const hasGuests = (e: CalEvent) => (e.attendees ?? []).some((a) => !a.self && !a.resource);

async function busyIntervals(from: Date, to: Date) {
  const pad = BUFFER_MINUTES * 60000;
  const qFrom = new Date(from.getTime() - pad);
  const qTo = new Date(to.getTime() + pad);
  const [own, ...others] = await Promise.all([
    listEvents(calendarId(), qFrom, qTo),
    ...(await otherCalendarIds()).map((id) => listEvents(id, qFrom, qTo)),
  ]);
  const blocking = [
    ...own.filter((e) => isTimedBusy(e) && (hasGuests(e) || WORK_TITLE.test((e.summary ?? "").trim()))),
    ...others.flat().filter(isTimedBusy),
  ];
  const events = blocking.map((e) => ({ start: new Date(e.start!.dateTime!), end: new Date(e.end!.dateTime!) }));
  const blocks: { start: Date; end: Date }[] = [];
  const lastDate = utcToHelsinki(to).date;
  for (let date = utcToHelsinki(from).date; date <= lastDate; date = addDays(date, 1)) {
    const wd = weekdayOf(date);
    if (wd === 0 || wd === 6) continue;
    for (const b of DAILY_BLOCKS) {
      blocks.push({ start: helsinkiToUtc(date, b.start), end: helsinkiToUtc(date, b.end) });
    }
  }
  return [
    ...events.map((b) => ({ start: new Date(b.start.getTime() - pad), end: new Date(b.end.getTime() + pad) })),
    ...blocks,
  ];
}

const overlaps = (s: Date, e: Date, busy: { start: Date; end: Date }[]) =>
  busy.some((b) => s < b.end && e > b.start);

// ---------- what the chatbot tools call ----------

export async function availableSlots(startDate: string | undefined, count: number) {
  const now = new Date();
  const earliest = new Date(now.getTime() + MIN_NOTICE_MINUTES * 60000);
  const latest = new Date(now.getTime() + MAX_DAYS_AHEAD * 86400000);
  const today = utcToHelsinki(now).date;
  let date = startDate && startDate > today ? startDate : today;

  const days: string[] = [];
  for (let i = 0; i < count && i <= MAX_DAYS_AHEAD; i++) {
    days.push(date);
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

"""Läser kalendern (iCal/ICS) och hittar lediga reseluckor.

Google Kalender: Inställningar → din kalender → "Hemlig adress i iCal-format".
Apple/iCloud: dela kalendern som offentlig och använd webcal-länken (byt till https).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path

import holidays
import httpx
import icalendar
import recurring_ical_events

from .models import TravelWindow


@dataclass(frozen=True)
class CalendarEvent:
    start: datetime
    end: datetime
    summary: str
    all_day: bool
    busy: bool  # False om händelsen är markerad som "Ledig"/TRANSPARENT


def fetch_ics(source: str, timeout: float = 20.0) -> str:
    """Hämtar en ICS från en URL (webcal:// stöds) eller läser en lokal fil."""
    if source.startswith("webcal://"):
        source = "https://" + source[len("webcal://") :]
    if source.startswith(("http://", "https://")):
        resp = httpx.get(source, timeout=timeout, follow_redirects=True)
        resp.raise_for_status()
        return resp.text
    return Path(source).read_text(encoding="utf-8")


def _to_datetime(value: date | datetime) -> datetime:
    if isinstance(value, datetime):
        # Lokal "väggklocka" räcker för att avgöra vilka dagar som är upptagna.
        return value.replace(tzinfo=None) if value.tzinfo is None else value.astimezone().replace(tzinfo=None)
    return datetime.combine(value, time.min)


def parse_events(ics_text: str, start: date, end: date) -> list[CalendarEvent]:
    cal = icalendar.Calendar.from_ical(ics_text)
    events: list[CalendarEvent] = []
    for comp in recurring_ical_events.of(cal).between(start, end + timedelta(days=1)):
        dtstart = comp.get("DTSTART").dt
        dtend_prop = comp.get("DTEND")
        all_day = not isinstance(dtstart, datetime)
        if dtend_prop is not None:
            dtend = dtend_prop.dt
        elif all_day:
            dtend = dtstart + timedelta(days=1)
        else:
            dtend = dtstart + (comp.get("DURATION").dt if comp.get("DURATION") else timedelta(hours=1))
        transp = str(comp.get("TRANSP", "OPAQUE")).upper()
        events.append(
            CalendarEvent(
                start=_to_datetime(dtstart),
                end=_to_datetime(dtend),
                summary=str(comp.get("SUMMARY", "")),
                all_day=all_day,
                busy=transp != "TRANSPARENT",
            )
        )
    return events


def _days_covered(event: CalendarEvent) -> list[date]:
    first = event.start.date()
    # Slut är exklusivt; en händelse som slutar 00:00 täcker inte den dagen.
    last = (event.end - timedelta(microseconds=1)).date() if event.end > event.start else first
    return [first + timedelta(days=i) for i in range((last - first).days + 1)]


def find_travel_windows(
    events: list[CalendarEvent],
    today: date,
    months_ahead: int = 3,
    vacation_keywords: list[str] | None = None,
    min_nights: int = 1,
    max_nights: int = 16,
    country: str = "SE",
) -> list[TravelWindow]:
    """Hittar sammanhängande lediga block (helger, röda dagar, semester) och
    returnerar dem som resefönster. Block där kalendern har en upptagen händelse
    hoppas över."""
    horizon = today + timedelta(days=round(months_ahead * 30.5))
    keywords = [k.lower() for k in (vacation_keywords or [])]
    years = range(today.year, horizon.year + 1)
    public = holidays.country_holidays(country, years=years)
    if country == "SE":  # "de facto"-lediga aftnar i Sverige
        for y in years:
            public.setdefault(date(y, 12, 24), "Julafton")
            public.setdefault(date(y, 12, 31), "Nyårsafton")
            for day, name in list(public.items()):
                if name == "Midsommardagen":
                    public.setdefault(day - timedelta(days=1), "Midsommarafton")

    vacation_days: set[date] = set()
    busy_days: set[date] = set()
    for ev in events:
        is_vacation = ev.all_day and any(k in ev.summary.lower() for k in keywords)
        for d in _days_covered(ev):
            if is_vacation:
                vacation_days.add(d)
            elif ev.busy:
                busy_days.add(d)

    def is_off(d: date) -> bool:
        return d.weekday() >= 5 or d in public or d in vacation_days

    def label_for(days: list[date]) -> str:
        if any(d in vacation_days for d in days):
            return "Semester"
        names = sorted({str(public.get(d)) for d in days if d in public})
        if names:
            return "Långhelg (" + ", ".join(names) + ")"
        return "Helg"

    windows: list[TravelWindow] = []
    d = today + timedelta(days=1)
    while d <= horizon:
        if not is_off(d):
            d += timedelta(days=1)
            continue
        block = [d]
        while block[-1] + timedelta(days=1) <= horizon and is_off(block[-1] + timedelta(days=1)):
            block.append(block[-1] + timedelta(days=1))
        d = block[-1] + timedelta(days=1)

        if any(day in busy_days for day in block):
            continue
        depart_day = block[0] - timedelta(days=1)  # kvällen innan
        if depart_day <= today:
            depart_day = block[0]
        window = TravelWindow(depart_day=depart_day, return_day=block[-1], label=label_for(block))
        if min_nights <= window.nights <= max_nights:
            windows.append(window)
    return windows


def load_windows(sources: list[str], today: date, **kwargs) -> list[TravelWindow]:
    """Läser alla kalendrar och returnerar lediga resefönster. Utan kalender
    används enbart helger och röda dagar."""
    horizon = today + timedelta(days=round(kwargs.get("months_ahead", 3) * 30.5))
    events: list[CalendarEvent] = []
    for src in sources:
        events.extend(parse_events(fetch_ics(src), today, horizon))
    return find_travel_windows(events, today, **kwargs)

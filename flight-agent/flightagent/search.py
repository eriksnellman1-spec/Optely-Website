"""Flexibel sökning: tur-och-retur med avresa vilken dag som helst inom
`months_ahead` och en längd på `min_nights`–`max_nights` nätter.

Varje källa levererar förslag via `round_trips(...)`:
* Ryanair – billigaste pris per dag och rutt, kombineras till alla längder.
* Aviasales – cachade tur-och-retur-priser per månad.
* Google Flights – Explore med flexibla datum (billigaste datum per resmål),
  roterande inom en daglig sökbudget.
Resultatet filtreras mot dina preferenser och de billigaste datumen per
resmål behålls.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta

from .config import Preferences
from .models import Flight, Trip
from .windows import is_day_off, make_window  # noqa: F401 (make_window används av källorna)

log = logging.getLogger(__name__)

# Flygplatser i samma stad räknas som "hemma" – inga resor dit.
METRO = [
    {"ARN", "BMA", "NYO", "VST"},  # Stockholm
    {"HEL"},                       # Helsingfors
    {"CPH", "MMX"},                # Köpenhamn/Malmö
    {"OSL", "TRF", "RYG"},         # Oslo
    {"GOT"},                       # Göteborg
    {"TKU"},                       # Åbo
]


def home_area(homes: list[str]) -> set[str]:
    area = set(homes)
    for group in METRO:
        if area & group:
            area |= group
    return area


def search_range(prefs: Preferences, today: date | None = None) -> tuple[date, date]:
    today = today or date.today()
    return today + timedelta(days=1), today + timedelta(days=round(prefs.months_ahead * 30.5))


def flight_ok(flight: Flight, prefs: Preferences, after_hour: int | None = None) -> bool:
    if flight.depart.hour < max(prefs.earliest_departure_hour, after_hour or 0):
        return False
    if prefs.latest_arrival_hour is not None and flight.arrive is not None:
        # Ankomst efter midnatt (nästa dag) räknas som för sent.
        if flight.arrive.date() > flight.depart.date() or flight.arrive.hour >= prefs.latest_arrival_hour:
            return False
    return True


def outbound_ok(flight: Flight, prefs: Preferences) -> bool:
    """På en arbetsdag kan man åka först efter jobbet (`after_work_hour`)."""
    return flight_ok(flight, prefs, None if is_day_off(flight.depart.date()) else prefs.after_work_hour)


def combine(out_by_day: dict[date, Flight], in_by_day: dict[date, Flight], prefs: Preferences,
            start: date, end: date) -> list[Trip]:
    """Bygger alla tur-och-retur-kombinationer (min–max nätter) av dagspriser."""
    trips: list[Trip] = []
    for day, out in out_by_day.items():
        if not (start <= day <= end) or not outbound_ok(out, prefs):
            continue
        for nights in range(prefs.min_nights, prefs.max_nights + 1):
            back = in_by_day.get(day + timedelta(days=nights))
            if back is None or back.depart.date() > end or not flight_ok(back, prefs):
                continue
            if back.depart <= (out.arrive or out.depart):
                continue
            trips.append(Trip(window=make_window(day, back.depart.date()), outbound=out, inbound=back))
    return trips


def cheapest_by_day(flights: list[Flight]) -> dict[date, Flight]:
    best: dict[date, Flight] = {}
    for f in flights:
        d = f.depart.date()
        if d not in best or f.price < best[d].price:
            best[d] = f
    return best


def notes(trip: Trip) -> None:
    out, back = trip.outbound, trip.inbound
    if back and not trip.bundled:
        if trip.mixed_carriers:
            trip.notes.append(f"Kombinerar {out.airline or out.provider} + {back.airline or back.provider}")
        if trip.different_return_airport:
            trip.notes.append(f"Landar på {back.destination} i stället för {out.origin}")
    if out.cached or (back and back.cached):
        trip.notes.append("Cachat pris från Aviasales – kontrollera innan du bokar")
    stops = out.stops + (back.stops if back else 0)
    if stops:
        trip.notes.append(f"{stops} byte totalt")


def _best_per_destination(trips: list[Trip], per_destination: int) -> list[Trip]:
    """Behåller de billigaste förslagen per resmål, med olika avresedagar."""
    kept: list[Trip] = []
    seen: dict[str, set[date]] = {}
    for t in sorted(trips, key=lambda t: t.total_price):
        days = seen.setdefault(t.destination, set())
        if t.window.depart_day in days or len(days) >= per_destination:
            continue
        days.add(t.window.depart_day)
        kept.append(t)
    return kept


def search_all(prefs: Preferences, providers: list, today: date | None = None) -> list[Trip]:
    start, end = search_range(prefs, today)
    home = home_area(prefs.home_airports)
    trips: list[Trip] = []
    for p in providers:
        try:
            trips += p.round_trips(prefs, start, end)
        except Exception as exc:  # en trasig källa ska inte stoppa hela sökningen
            log.warning("%s misslyckades: %s", p.name, exc)
    if any(getattr(p, "budget_hit", False) for p in providers):
        log.info("Google Flights: dagens sökbudget är använd – sparade priser används för resten")

    wanted = set(prefs.destinations)
    filtered = []
    for t in trips:
        if t.destination in home or (wanted and t.destination not in wanted):
            continue
        if not (prefs.min_nights <= t.window.nights <= prefs.max_nights):
            continue
        if t.window.depart_day < start or t.window.return_day > end:
            continue
        if not t.notes:
            notes(t)
        filtered.append(t)
    # Alla resor returneras (fynd får aldrig klippas bort); max_results gäller bara visningen.
    per_dest = max(prefs.per_destination, 10) if wanted else prefs.per_destination
    return _best_per_destination(filtered, per_dest)


def deals(trips: list[Trip], prefs: Preferences) -> list[Trip]:
    return [t for t in trips if t.total_price <= prefs.deal_threshold]


def deal_key(trip: Trip) -> str:
    return f"{trip.window.depart_day}|{trip.window.return_day}|{trip.destination}"


def money(amount: float, currency: str) -> str:
    """19.99 EUR → "19,99 €"; 460 SEK → "460 kr"."""
    if currency.upper() == "EUR":
        return f"{amount:,.2f} €".replace(",", " ").replace(".", ",")
    if currency.upper() == "SEK":
        return f"{amount:,.0f} kr".replace(",", " ")
    return f"{amount:,.2f} {currency}"


def fmt_dt(dt: datetime) -> str:
    days = ["mån", "tis", "ons", "tor", "fre", "lör", "sön"]
    return f"{days[dt.weekday()]} {dt.day}/{dt.month} {dt:%H:%M}"


def nights_text(n: int) -> str:
    return "1 natt" if n == 1 else f"{n} nätter"


def fmt_day(d: date) -> str:
    days = ["mån", "tis", "ons", "tor", "fre", "lör", "sön"]
    return f"{days[d.weekday()]} {d.day}/{d.month}"

"""Kombinerar resefönster, källor och preferenser till rankade resor.

Flöde per resefönster:
1. Radar: källor som kan söka "vart som helst" (Ryanair, Aviasales) hämtar
   utresor, och Google Travel Explore ger t/r-priser till alla resmål.
2. Kontroll: för de resmål som ser ut som fynd hämtar Google Flights exakta
   avgångar (sparar SerpApi-budget).
3. Hemresan söks i alla källor till alla hemmaflygplatser → billigaste
   kombinationen, även med olika flygbolag eller annan hemmaflygplats.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta

from .config import Preferences
from .models import ExploreHit, Flight, TravelWindow, Trip
from .providers import FlightProvider
from .providers.google_flights import BudgetExceeded

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


def flight_ok(flight: Flight, prefs: Preferences, after_hour: int | None = None) -> bool:
    if flight.depart.hour < max(prefs.earliest_departure_hour, after_hour or 0):
        return False
    if prefs.latest_arrival_hour is not None and flight.arrive is not None:
        # Ankomst efter midnatt (nästa dag) räknas som för sent.
        if flight.arrive.date() > flight.depart.date() or flight.arrive.hour >= prefs.latest_arrival_hour:
            return False
    return True


def _outbound_ok(flight: Flight, window: TravelWindow, prefs: Preferences) -> bool:
    # Avresedagen är en arbetsdag om den ligger före ledigheten → åk efter jobbet.
    is_workday_evening = (
        flight.depart.date() == window.depart_day
        and window.depart_day.weekday() < 5
    )
    return flight_ok(flight, prefs, prefs.after_work_hour if is_workday_evening else None)


def _query(provider: FlightProvider, origins: list[str], destinations: list[str | None],
           date_from: date, date_to: date, currency: str) -> list[Flight]:
    """Anropar en källa och samlar ihop fel så att en trasig källa inte stoppar sökningen."""
    multi = getattr(provider, "multi_airport", False)
    origin_groups = [",".join(origins)] if multi else origins
    dest_groups = [",".join(d for d in destinations if d)] if multi and all(destinations) else destinations
    flights: list[Flight] = []
    for origin in origin_groups:
        for dest in dest_groups:
            try:
                flights += provider.search_one_way(origin, dest, date_from, date_to, currency)
            except BudgetExceeded as exc:
                log.info("%s: %s", provider.name, exc)
                return flights
            except Exception as exc:
                log.warning("%s misslyckades (%s→%s): %s", provider.name, origin, dest, exc)
    return flights


def _explore(providers: list[FlightProvider], window: TravelWindow, prefs: Preferences) -> list[ExploreHit]:
    hits: list[ExploreHit] = []
    for p in providers:
        if not hasattr(p, "explore"):
            continue
        try:
            hits += p.explore(prefs.home_airports, window.depart_day, window.return_day, prefs.currency)
        except BudgetExceeded as exc:
            log.info("%s: %s", p.name, exc)
        except Exception as exc:
            log.warning("%s explore misslyckades: %s", p.name, exc)
    return hits


def _pick_for_verification(outbound: list[Flight], hits: list[ExploreHit], prefs: Preferences) -> list[str]:
    """Väljer resmål att kontrollera med exakta tider (kostar SerpApi-sökningar)."""
    if prefs.destinations:
        return list(prefs.destinations)
    indicative: dict[str, float] = {}
    for h in hits:
        indicative[h.destination] = min(indicative.get(h.destination, h.price), h.price)
    for f in outbound:  # grov uppskattning: enkelresa × 2
        indicative[f.destination] = min(indicative.get(f.destination, f.price * 2), f.price * 2)
    limit = prefs.deal_threshold * prefs.verify_margin
    ranked = sorted((p, d) for d, p in indicative.items() if p <= limit)
    return [d for _, d in ranked[: prefs.verify_top_n]]


def _notes(trip: Trip) -> None:
    out, back = trip.outbound, trip.inbound
    if trip.mixed_carriers:
        trip.notes.append(f"Kombinerar {out.airline or out.provider} + {back.airline or back.provider}")
    if trip.different_return_airport:
        trip.notes.append(f"Landar på {back.destination} i stället för {out.origin}")
    if out.cached or (back and back.cached):
        trip.notes.append("Cachat pris från Aviasales – kontrollera innan du bokar")
    stops = out.stops + (back.stops if back else 0)
    if stops:
        trip.notes.append(f"{stops} byte totalt")


def search_window(window: TravelWindow, prefs: Preferences, providers: list[FlightProvider]) -> list[Trip]:
    homes = prefs.home_airports
    first_full_day = window.depart_day + timedelta(days=1)
    anywhere = [p for p in providers if not getattr(p, "needs_destination", False)]
    targeted = [p for p in providers if getattr(p, "needs_destination", False)]
    wanted: list[str | None] = list(prefs.destinations) or [None]

    # 1. Radar
    outbound: list[Flight] = []
    for p in anywhere:
        outbound += _query(p, homes, wanted, window.depart_day, first_full_day, prefs.currency)
    home = home_area(homes)
    outbound = [f for f in outbound if f.destination not in home]
    hits = [h for h in (_explore(targeted, window, prefs) if not prefs.destinations else [])
            if h.destination not in home]

    # 2. Kontroll med exakta tider
    verify = _pick_for_verification(outbound, hits, prefs) if targeted else []
    for p in targeted:
        for dest in verify:
            outbound += _query(p, homes, [dest], window.depart_day, first_full_day, prefs.currency)

    outbound = [f for f in outbound if f.destination not in home and _outbound_ok(f, window, prefs)]
    best_out: dict[str, Flight] = {}
    for f in sorted(outbound, key=lambda f: f.price):
        best_out.setdefault(f.destination, f)

    # 3. Hemresa – sökningarna per resmål körs parallellt.
    def inbound_for(dest: str) -> list[Flight]:
        flights: list[Flight] = []
        for p in anywhere:
            if getattr(p, "cheap_anywhere", False):  # ett anrop "vart som helst", filtrera hemma
                flights += [f for f in _query(p, [dest], [None], window.return_day, window.return_day,
                                               prefs.currency) if f.destination in homes]
            else:
                flights += _query(p, [dest], list(homes), window.return_day, window.return_day, prefs.currency)
        if dest in verify:
            for p in targeted:
                flights += _query(p, [dest], list(homes), window.return_day, window.return_day, prefs.currency)
        return flights

    with ThreadPoolExecutor(max_workers=4) as pool:
        inbound_by_dest = dict(zip(best_out, pool.map(inbound_for, best_out)))

    trips: list[Trip] = []
    for dest, out in best_out.items():
        inbound = [f for f in inbound_by_dest[dest] if flight_ok(f, prefs) and f.depart > (out.arrive or out.depart)]
        if not inbound:
            continue
        trip = Trip(window=window, outbound=out, inbound=min(inbound, key=lambda f: f.price))
        _notes(trip)
        trips.append(trip)

    # Explore-träffar som inte kunde kontrolleras visas som indikativa priser.
    covered = {t.destination for t in trips}
    for h in sorted(hits, key=lambda h: h.price):
        if h.destination in covered:
            continue
        covered.add(h.destination)
        placeholder = Flight(
            provider=h.provider, origin="/".join(homes), destination=h.destination,
            depart=datetime.combine(window.depart_day, datetime.min.time()), price=h.price,
            currency=h.currency, destination_name=h.destination_name, booking_url=h.booking_url,
            airline=h.airline, stops=h.stops,
        )
        trips.append(Trip(
            window=window, outbound=placeholder, indicative=True, indicative_price=h.price,
            notes=[f"Indikativt t/r-pris från Google Flights ({h.airline or 'flera bolag'}"
                   f"{', direkt' if not h.stops else f', {h.stops} byte'}) – tider ej kontrollerade"],
        ))
    return sorted(trips, key=lambda t: t.total_price)


def search_all(windows: list[TravelWindow], prefs: Preferences, providers: list[FlightProvider]) -> list[Trip]:
    trips: list[Trip] = []
    for window in windows:
        trips += search_window(window, prefs, providers)
    trips.sort(key=lambda t: t.total_price)
    return trips[: prefs.max_results]


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

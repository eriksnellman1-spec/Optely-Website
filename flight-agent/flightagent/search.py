"""Kombinerar resefönster, leverantörer och preferenser till rankade resor."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from .config import Preferences
from .models import Flight, TravelWindow, Trip
from .providers import FlightProvider

log = logging.getLogger(__name__)


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
    is_workday_evening = flight.depart.date() == window.depart_day and window.label != "Semester" and (
        window.depart_day.weekday() < 5
    )
    return flight_ok(flight, prefs, prefs.after_work_hour if is_workday_evening else None)


def _safe_search(provider: FlightProvider, *args) -> list[Flight]:
    try:
        return provider.search_one_way(*args)
    except Exception as exc:  # en trasig leverantör ska inte stoppa hela sökningen
        log.warning("%s misslyckades: %s", provider.name, exc)
        return []


def search_window(window: TravelWindow, prefs: Preferences, providers: list[FlightProvider]) -> list[Trip]:
    first_full_day = window.depart_day + timedelta(days=1)
    outbound: list[Flight] = []
    for provider in providers:
        for origin in prefs.home_airports:
            for dest in prefs.destinations or [None]:
                outbound += _safe_search(provider, origin, dest, window.depart_day, first_full_day, prefs.currency)
    outbound = [f for f in outbound if _outbound_ok(f, window, prefs)]

    # Billigaste utresa per destination.
    best_out: dict[str, Flight] = {}
    for f in sorted(outbound, key=lambda f: f.price):
        best_out.setdefault(f.destination, f)

    trips: list[Trip] = []
    for dest, out in best_out.items():
        inbound: list[Flight] = []
        for provider in providers:  # hemresa med valfritt bolag → kombinera flygbolag
            for home in prefs.home_airports:  # och valfri hemmaflygplats
                inbound += _safe_search(provider, dest, home, window.return_day, window.return_day, prefs.currency)
        inbound = [f for f in inbound if flight_ok(f, prefs) and f.depart > (out.arrive or out.depart)]
        if not inbound:
            continue
        back = min(inbound, key=lambda f: f.price)
        trip = Trip(window=window, outbound=out, inbound=back)
        if trip.mixed_carriers:
            trip.notes.append(f"Kombinerar {out.provider} + {back.provider}")
        if trip.different_return_airport:
            trip.notes.append(f"Landar på {back.destination} i stället för {out.origin}")
        trips.append(trip)
    return sorted(trips, key=lambda t: t.total_price)


def search_all(windows: list[TravelWindow], prefs: Preferences, providers: list[FlightProvider]) -> list[Trip]:
    trips: list[Trip] = []
    for window in windows:
        trips += search_window(window, prefs, providers)
    trips.sort(key=lambda t: t.total_price)
    return trips[: prefs.max_results]


def deals(trips: list[Trip], prefs: Preferences) -> list[Trip]:
    return [t for t in trips if t.total_price <= prefs.deal_threshold]


def fmt_dt(dt: datetime) -> str:
    days = ["mån", "tis", "ons", "tor", "fre", "lör", "sön"]
    return f"{days[dt.weekday()]} {dt.day}/{dt.month} {dt:%H:%M}"

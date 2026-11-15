"""Ryanair – priser direkt från flygbolagets eget pris-API (samma som deras
lågpriskalender på ryanair.com använder). Ingen mellanhand, inga påslag.

OBS: API:t är inofficiellt och kan ändras utan förvarning. Använd det
återhållsamt (on-demand, några få anrop per sökning) för privat bruk.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import date, datetime, timedelta

import httpx

from ..models import Flight

API = "https://services-api.ryanair.com/farfnd/v4/oneWayFares"
BOOKING = (
    "https://www.ryanair.com/se/sv/trip/flights/select?adults=1&teens=0&children=0&infants=0"
    "&dateOut={date}&isConnectedFlight=false&isReturn=false&discount=0"
    "&originIata={origin}&destinationIata={dest}"
)


def parse_fares(payload: dict) -> list[Flight]:
    flights: list[Flight] = []
    for fare in payload.get("fares") or []:
        out = fare.get("outbound") or {}
        price = out.get("price") or {}
        dep = out.get("departureAirport") or {}
        arr = out.get("arrivalAirport") or {}
        if not (dep.get("iataCode") and arr.get("iataCode") and out.get("departureDate")):
            continue
        depart = datetime.fromisoformat(out["departureDate"])
        flights.append(
            Flight(
                provider="ryanair",
                airline="Ryanair",
                origin=dep["iataCode"],
                destination=arr["iataCode"],
                depart=depart,
                arrive=datetime.fromisoformat(out["arrivalDate"]) if out.get("arrivalDate") else None,
                price=float(price.get("value", 0.0)),
                currency=price.get("currencyCode", ""),
                origin_name=(dep.get("city") or {}).get("name") or dep.get("name", ""),
                destination_name=(arr.get("city") or {}).get("name") or arr.get("name", ""),
                flight_number=out.get("flightNumber", ""),
                booking_url=BOOKING.format(
                    date=depart.date().isoformat(), origin=dep["iataCode"], dest=arr["iataCode"]
                ),
            )
        )
    return flights


class RyanairProvider:
    name = "ryanair"
    needs_destination = False
    multi_airport = False
    cheap_anywhere = True  # svar "vart som helst" innehåller alla resmål

    def __init__(self, client: httpx.Client | None = None, market: str = "sv-se"):
        self._client = client or httpx.Client(
            timeout=20.0, headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0"}
        )
        self._market = market

    def search_one_way(self, origin: str, destination: str | None, date_from: date, date_to: date, currency: str):
        params = {
            "departureAirportIataCode": origin,
            "outboundDepartureDateFrom": date_from.isoformat(),
            "outboundDepartureDateTo": date_to.isoformat(),
            "currency": currency,
            "market": self._market,
        }
        if destination:
            params["arrivalAirportIataCode"] = destination
        resp = self._client.get(API, params=params)
        resp.raise_for_status()
        return parse_fares(resp.json())


PER_DAY = "https://services-api.ryanair.com/farfnd/v4/oneWayFares/{origin}/{dest}/cheapestPerDay"


def parse_per_day(payload: dict, origin: str, dest: str, currency: str) -> list[Flight]:
    flights = []
    for fare in (payload.get("outbound") or {}).get("fares") or []:
        price = fare.get("price") or {}
        if fare.get("unavailable") or fare.get("soldOut") or not fare.get("departureDate") or price.get("value") is None:
            continue
        depart = datetime.fromisoformat(fare["departureDate"])
        flights.append(Flight(
            provider="ryanair", airline="Ryanair", origin=origin, destination=dest, depart=depart,
            arrive=datetime.fromisoformat(fare["arrivalDate"]) if fare.get("arrivalDate") else None,
            price=float(price["value"]), currency=price.get("currencyCode", currency),
            booking_url=BOOKING.format(date=depart.date().isoformat(), origin=origin, dest=dest),
        ))
    return flights


def _months(start: date, end: date) -> list[date]:
    months, d = [], start.replace(day=1)
    while d <= end:
        months.append(d)
        d = (d.replace(day=28) + timedelta(days=4)).replace(day=1)
    return months


def _round_trips(self, prefs, start: date, end: date):
    """Hittar resmål från varje hemmaflygplats, hämtar billigaste pris per dag åt
    båda hållen och kombinerar till alla reslängder."""
    from ..search import cheapest_by_day, combine, home_area

    home = home_area(prefs.home_airports)
    # 1. Upptäck resmål (ett anrop per hemmaflygplats för hela perioden).
    found: list[Flight] = []
    for origin in prefs.home_airports:
        found += self.search_one_way(origin, None, start, end, prefs.currency)
    cheapest: dict[str, float] = {}
    names: dict[str, str] = {}
    for f in found:
        if f.destination in home:
            continue
        cheapest[f.destination] = min(cheapest.get(f.destination, f.price), f.price)
        names[f.destination] = f.destination_name
    # Utresan ensam får inte redan vara dyrare än fyndgränsen – men ta alltid med de 15 billigaste.
    ranked = sorted(cheapest, key=cheapest.get)
    if prefs.destinations:  # du har sagt vart du vill → alla de resmål Ryanair flyger till
        dests = [d for d in ranked if d in prefs.destinations]
    else:
        dests = [d for i, d in enumerate(ranked) if i < 15 or cheapest[d] <= prefs.deal_threshold]

    # 2. Dagspriser åt båda hållen, parallellt.
    months = _months(start, end + timedelta(days=prefs.max_nights))
    jobs = [(o, d, m) for d in dests for o in prefs.home_airports for m in months]
    jobs += [(d, h, m) for d in dests for h in prefs.home_airports for m in months]

    def fetch(job):
        origin, dest, month = job
        try:
            resp = self._client.get(PER_DAY.format(origin=origin, dest=dest),
                                    params={"outboundMonthOfDate": month.isoformat(), "currency": prefs.currency})
            if resp.status_code != 200:  # rutten finns inte åt det hållet
                return []
            return parse_per_day(resp.json(), origin, dest, prefs.currency)
        except (httpx.HTTPError, ValueError):
            return []

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = dict(zip(jobs, pool.map(fetch, jobs)))

    # 3. Kombinera per resmål: utresa från valfri hemmaflygplats, hem till valfri.
    trips = []
    for dest in dests:
        out = [f for (o, d, _), fl in results.items() if d == dest and o in prefs.home_airports for f in fl]
        back = [f for (o, d, _), fl in results.items() if o == dest and d in prefs.home_airports for f in fl]
        out = [replace(f, destination_name=names.get(dest, dest)) for f in out]
        for trip in combine(cheapest_by_day(out), cheapest_by_day(back), prefs, start, end):
            trips.append(trip)
    return trips


RyanairProvider.round_trips = _round_trips

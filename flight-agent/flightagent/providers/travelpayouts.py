"""Aviasales/Travelpayouts Data API – gratis, täcker hundratals flygbolag och
resebyråer, och kan söka "vart som helst".

OBS: priserna är *cachade* (från andras sökningar de senaste dagarna), inte
live. De används som radar för att hitta resmål – kontrollera alltid priset
innan du bokar. Gratis token: travelpayouts.com → Profil → API-token.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

import httpx

from ..models import Flight

API = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates"


def parse_prices(payload: dict, currency: str) -> list[Flight]:
    flights = []
    for row in payload.get("data") or []:
        try:
            depart = datetime.fromisoformat(row["departure_at"]).replace(tzinfo=None)
        except (KeyError, ValueError):
            continue
        duration = row.get("duration_to") or row.get("duration")
        link = row.get("link", "")
        flights.append(
            Flight(
                provider="aviasales",
                origin=row.get("origin_airport") or row.get("origin", ""),
                destination=row.get("destination_airport") or row.get("destination", ""),
                depart=depart,
                arrive=depart + timedelta(minutes=int(duration)) if duration else None,
                price=float(row["price"]),
                currency=currency,
                flight_number=f"{row.get('airline', '')}{row.get('flight_number', '')}",
                booking_url=("https://www.aviasales.com" + link) if link.startswith("/") else link,
                airline=row.get("airline", ""),
                stops=int(row.get("transfers") or 0),
                cached=True,
            )
        )
    return flights


class TravelpayoutsProvider:
    name = "aviasales"
    needs_destination = False
    multi_airport = False

    def __init__(self, token: str, client: httpx.Client | None = None):
        self._client = client or httpx.Client(timeout=30.0)
        self._token = token

    def search_one_way(self, origin: str, destination: str | None, date_from: date, date_to: date, currency: str):
        flights: list[Flight] = []
        day = date_from
        while day <= date_to:
            params = {"origin": origin, "departure_at": day.isoformat(), "one_way": "true",
                      "sorting": "price", "limit": 1000, "currency": currency.lower()}
            if destination:
                params["destination"] = destination
            resp = self._client.get(API, params=params, headers={"X-Access-Token": self._token})
            resp.raise_for_status()
            flights += parse_prices(resp.json(), currency)
            day += timedelta(days=1)
        # API:t kan returnera närliggande datum – behåll bara de efterfrågade.
        return [f for f in flights if date_from <= f.depart.date() <= date_to]


def parse_round_trips(payload: dict, currency: str, home: str):
    """Tur-och-retur-rader (en biljett, ett pris) → Trip."""
    from ..models import Trip
    from ..search import make_window

    trips = []
    for row in payload.get("data") or []:
        try:
            dep = datetime.fromisoformat(row["departure_at"]).replace(tzinfo=None)
            ret = datetime.fromisoformat(row["return_at"]).replace(tzinfo=None)
        except (KeyError, TypeError, ValueError):
            continue
        dest = row.get("destination_airport") or row.get("destination", "")
        origin = row.get("origin_airport") or home
        link = row.get("link", "")
        url = ("https://www.aviasales.com" + link) if link.startswith("/") else link
        duration_to, duration_back = row.get("duration_to"), row.get("duration_back")
        out = Flight(provider="aviasales", origin=origin, destination=dest, depart=dep,
                     arrive=dep + timedelta(minutes=int(duration_to)) if duration_to else None,
                     price=float(row["price"]), currency=currency, airline=row.get("airline", ""),
                     flight_number=f"{row.get('airline', '')}{row.get('flight_number', '')}",
                     stops=int(row.get("transfers") or 0), booking_url=url, cached=True)
        back = Flight(provider="aviasales", origin=dest, destination=origin, depart=ret,
                      arrive=ret + timedelta(minutes=int(duration_back)) if duration_back else None,
                      price=0.0, currency=currency, airline=row.get("airline", ""),
                      stops=int(row.get("return_transfers") or 0), booking_url=url, cached=True)
        trips.append(Trip(window=make_window(dep.date(), ret.date()), outbound=out, inbound=back, bundled=True))
    return trips


def _months(start: date, end: date) -> list[date]:
    months, d = [], start.replace(day=1)
    while d <= end:
        months.append(d)
        d = (d.replace(day=28) + timedelta(days=4)).replace(day=1)
    return months


def _round_trips(self, prefs, start: date, end: date):
    from ..search import flight_ok, outbound_ok

    trips = []
    for home in prefs.home_airports:
        months = _months(start, end)
        for m in months:
            nxt = (m.replace(day=28) + timedelta(days=4)).replace(day=1)
            for ret_month in (m, nxt):  # hemresan samma eller nästa månad
                params = {"origin": home, "departure_at": f"{m:%Y-%m}", "return_at": f"{ret_month:%Y-%m}",
                          "one_way": "false", "unique": "false", "sorting": "price", "limit": 1000,
                          "currency": prefs.currency.lower()}
                resp = self._client.get(API, params=params, headers={"X-Access-Token": self._token})
                resp.raise_for_status()
                trips += parse_round_trips(resp.json(), prefs.currency, home)
    return [t for t in trips if outbound_ok(t.outbound, prefs) and flight_ok(t.inbound, prefs)]


TravelpayoutsProvider.round_trips = _round_trips

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

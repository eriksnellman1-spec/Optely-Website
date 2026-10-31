"""Ryanair – priser direkt från flygbolagets eget pris-API (samma som deras
lågpriskalender på ryanair.com använder). Ingen mellanhand, inga påslag.

OBS: API:t är inofficiellt och kan ändras utan förvarning. Använd det
återhållsamt (on-demand, några få anrop per sökning) för privat bruk.
"""

from __future__ import annotations

from datetime import date, datetime

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

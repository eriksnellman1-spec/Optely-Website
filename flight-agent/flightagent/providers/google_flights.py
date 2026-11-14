"""Google Flights via SerpApi – i princip alla flygbolag (SAS, Norwegian,
Wizz Air, Lufthansa, KLM, Finnair, Vueling …) med livepriser.

Två lägen:
* `explore`  – Google Travel Explore: billigaste resmål "vart som helst" för en
  period, ett anrop. Ger t/r-pris men inte exakta tider.
* `search_one_way` – exakta avgångar för ett specifikt resmål.

Gratisnivån hos SerpApi är 250 sökningar/månad, så varje anrop räknas mot en
budget (se config: serpapi_max_per_run, serpapi_monthly_budget).
"""

from __future__ import annotations

import logging
from datetime import date, datetime

import httpx

from ..models import ExploreHit, Flight
from ..state import State

log = logging.getLogger(__name__)
API = "https://serpapi.com/search.json"


class BudgetExceeded(RuntimeError):
    pass


def _dt(value: str | None) -> datetime | None:
    return datetime.strptime(value, "%Y-%m-%d %H:%M") if value else None


def parse_flights(payload: dict, currency: str) -> list[Flight]:
    url = (payload.get("search_metadata") or {}).get("google_flights_url", "")
    flights: list[Flight] = []
    for itin in (payload.get("best_flights") or []) + (payload.get("other_flights") or []):
        segs = itin.get("flights") or []
        if not segs or itin.get("price") is None:
            continue
        first, last = segs[0], segs[-1]
        airlines = list(dict.fromkeys(s.get("airline", "") for s in segs if s.get("airline")))
        flights.append(
            Flight(
                provider="google_flights",
                origin=first["departure_airport"]["id"],
                destination=last["arrival_airport"]["id"],
                depart=_dt(first["departure_airport"]["time"]),
                arrive=_dt(last["arrival_airport"].get("time")),
                price=float(itin["price"]),
                currency=currency,
                origin_name=first["departure_airport"].get("name", ""),
                destination_name=last["arrival_airport"].get("name", ""),
                flight_number=" + ".join(s.get("flight_number", "") for s in segs),
                booking_url=url,
                airline=" + ".join(airlines),
                stops=len(segs) - 1,
            )
        )
    return flights


def parse_explore(payload: dict, currency: str, checked: str = "") -> list[ExploreHit]:
    hits = []
    for d in payload.get("destinations") or []:
        code = (d.get("destination_airport") or {}).get("code")
        if not code or d.get("flight_price") is None:
            continue
        hits.append(
            ExploreHit(
                provider="google_flights",
                destination=code,
                destination_name=d.get("name", code),
                price=float(d["flight_price"]),
                currency=currency,
                airline=d.get("airline", ""),
                stops=int(d.get("number_of_stops") or 0),
                booking_url=d.get("link", ""),
                checked=checked,
            )
        )
    return hits


class GoogleFlightsProvider:
    name = "google_flights"
    needs_destination = True  # search_one_way kräver resmål; explore täcker "vart som helst"
    # Kommaseparerade flygplatser ger ofta tomma svar (särskilt över landsgränser),
    # så varje hemmaflygplats söks för sig.
    multi_airport = False

    def __init__(self, api_key: str, max_per_run: int = 40, monthly_budget: int = 240,
                 state: State | None = None, client: httpx.Client | None = None, daily_budget: int = 8):
        self._key = api_key
        self._client = client or httpx.Client(timeout=60.0)
        self._state = state or State()
        self._max_per_run = max_per_run
        self._monthly_budget = monthly_budget
        self._daily_budget = daily_budget
        self.calls = 0
        self.budget_hit = False

    @property
    def state(self) -> State:
        return self._state

    def budget_left(self) -> int:
        return max(0, min(
            self._max_per_run - self.calls,
            self._monthly_budget - self._state.serpapi_used(),
            self._daily_budget - self._state.serpapi_used_today(),
        ))

    def _get(self, params: dict) -> dict:
        if self.budget_left() <= 0:
            self.budget_hit = True
            raise BudgetExceeded("SerpApi-budgeten för den här körningen/månaden är slut")
        params = {**params, "api_key": self._key, "hl": "sv", "gl": "se"}
        resp = self._client.get(API, params=params)
        self.calls += 1
        self._state.add_serpapi()
        resp.raise_for_status()
        data = resp.json()
        if data.get("error"):
            # "hasn't returned any results" är inget fel, bara ett tomt svar.
            if "any results" in data["error"] or "Empty results" in data["error"]:
                return {}
            raise RuntimeError(f"SerpApi: {data['error']}")
        return data

    def search_one_way(self, origin: str, destination: str | None, date_from: date, date_to: date, currency: str):
        if not destination:
            return []
        flights: list[Flight] = []
        day = date_from
        while day <= date_to:
            data = self._get({"engine": "google_flights", "type": 2, "departure_id": origin,
                              "arrival_id": destination, "outbound_date": day.isoformat(), "currency": currency})
            flights += parse_flights(data, currency)
            day = date.fromordinal(day.toordinal() + 1)
        return flights

    def explore(self, origins: list[str], outbound: date, inbound: date, currency: str) -> list[ExploreHit]:
        best: dict[str, ExploreHit] = {}
        for origin in origins:
            try:
                data = self._get({"engine": "google_travel_explore", "type": 1, "departure_id": origin,
                                  "outbound_date": outbound.isoformat(), "return_date": inbound.isoformat(),
                                  "currency": currency, "travel_mode": 1})
            except BudgetExceeded:
                if best:
                    break
                raise
            for hit in parse_explore(data, currency, checked=date.today().isoformat()):
                if hit.destination not in best or hit.price < best[hit.destination].price:
                    best[hit.destination] = hit
        return list(best.values())

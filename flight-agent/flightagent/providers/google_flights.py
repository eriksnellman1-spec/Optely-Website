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
from datetime import date, datetime, timedelta

import httpx

from ..models import ExploreHit, Flight, Trip
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
                start_date=d.get("start_date", ""),
                end_date=d.get("end_date", ""),
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


DURATIONS = {1: (1, 3), 2: (6, 8)}  # travel_duration → ungefärligt antal nätter (helg, en vecka)


def _months_between(start: date, end: date) -> list[date]:
    months, d = [], start.replace(day=1)
    while d <= end:
        months.append(d)
        d = (d.replace(day=28) + timedelta(days=4)).replace(day=1)
    return months


def _explore_round_trips(self, prefs, start: date, end: date):
    """Google Explore med flexibla datum: billigaste datum per resmål för varje
    (hemmaflygplats, månad, reslängd). Budgeten räcker inte till alla
    kombinationer varje dag, så de som kollades längst sedan uppdateras först
    och övriga använder sparade priser (högst `explore_cache_days` gamla)."""
    from ..search import make_window

    combos = [(home, m, dur)
              for home in prefs.home_airports
              for m in _months_between(start, end)[:6]
              for dur, (lo, hi) in DURATIONS.items()
              if hi >= prefs.min_nights and lo <= prefs.max_nights]
    key = lambda c: f"flex|{c[0]}|{prefs.currency}|{c[1]:%Y-%m}|{c[2]}"
    combos.sort(key=lambda c: (self.state.explore_checked(key(c)) or "", c[1]))

    hits: list[tuple[str, ExploreHit]] = []
    for combo in combos:
        home, month, dur = combo
        fresh = None
        if self.budget_left() > 0:
            try:
                data = self._get({"engine": "google_travel_explore", "departure_id": home, "type": 1,
                                  "month": month.month, "travel_duration": dur,
                                  "currency": prefs.currency, "travel_mode": 1})
                fresh = parse_explore(data, prefs.currency, checked=date.today().isoformat())
                self.state.store_explore(key(combo), fresh)
            except BudgetExceeded:
                pass
        found = fresh if fresh is not None else (self.state.cached_explore(key(combo), prefs.explore_cache_days) or [])
        hits += [(home, h) for h in found]

    trips = []
    for home, h in hits:
        if not (h.start_date and h.end_date):
            continue
        dep, ret = date.fromisoformat(h.start_date), date.fromisoformat(h.end_date)
        placeholder = Flight(
            provider="google_flights", origin=home, destination=h.destination,
            depart=datetime.combine(dep, datetime.min.time()), price=h.price, currency=h.currency,
            destination_name=h.destination_name, booking_url=h.booking_url, airline=h.airline, stops=h.stops,
        )
        when = "" if h.checked == date.today().isoformat() else f", pris från {h.checked}"
        trips.append(Trip(
            window=make_window(dep, ret), outbound=placeholder, indicative=True, indicative_price=h.price,
            notes=[f"Google Flights ({h.airline or 'flera bolag'}{', direkt' if not h.stops else f', {h.stops} byte'}"
                   f"{when}) – tider ej kontrollerade"],
        ))
    return trips




def parse_calendar(payload: dict) -> dict[date, float]:
    prices: dict[date, float] = {}
    for row in payload.get("prices") or []:
        if row.get("price") is None or not row.get("outbound_date"):
            continue
        prices[date.fromisoformat(row["outbound_date"])] = float(row["price"])
    return prices


def _calendar(self, origin: str, dest: str, start: date, end: date, currency: str) -> dict[date, float]:
    """Enkelresepris för varje avresedag i perioden (Google Flights datumkalender).
    Försöker hela perioden i ett anrop; vid fel delas den upp per månad."""
    params = {"engine": "google_flights_calendar", "type": 2, "departure_id": origin, "arrival_id": dest,
              "currency": currency}
    try:
        return parse_calendar(self._get({**params, "date_range_start": start.isoformat(),
                                         "date_range_end": end.isoformat()}))
    except RuntimeError as exc:
        if isinstance(exc, BudgetExceeded):
            raise
        log.info("Kalendern för %s→%s i ett anrop gick inte (%s) – delar upp per månad", origin, dest, exc)
    prices: dict[date, float] = {}
    for m in _months_between(start, end):
        chunk_start = max(start, m)
        chunk_end = min(end, (m.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1))
        prices.update(parse_calendar(self._get({**params, "date_range_start": chunk_start.isoformat(),
                                                 "date_range_end": chunk_end.isoformat()})))
    return prices


def _calendar_round_trips(self, prefs, start: date, end: date):
    """När du angett resmål: hämta Googles pris för varje dag åt båda hållen
    och kombinera till alla reslängder. Kalendrar som kollades längst sedan
    uppdateras först; övriga använder sparade priser."""
    from ..search import home_area, make_window

    home = home_area(prefs.home_airports)
    dests = [d for d in prefs.destinations if d not in home]
    last_day = end + timedelta(days=prefs.max_nights)
    jobs = [(h, d) for d in dests for h in prefs.home_airports] + [(d, h) for d in dests for h in prefs.home_airports]
    store = self.state.data.setdefault("calendar", {})
    key = lambda j: f"{j[0]}>{j[1]}|{prefs.currency}"
    jobs.sort(key=lambda j: (store.get(key(j)) or {}).get("checked", ""))

    prices: dict[tuple[str, str], dict[date, float]] = {}
    today = date.today().isoformat()
    for job in jobs:
        cached = store.get(key(job))
        fresh = None
        if self.budget_left() > 0:
            try:
                fresh = _calendar(self, job[0], job[1], start, last_day, prefs.currency)
                store[key(job)] = {"checked": today, "prices": {d.isoformat(): p for d, p in fresh.items()}}
                self.state.save()
            except BudgetExceeded:
                pass
            except Exception as exc:
                log.warning("Google-kalender %s→%s misslyckades: %s", job[0], job[1], exc)
        if fresh is not None:
            prices[job] = fresh
        elif cached and (date.today() - date.fromisoformat(cached["checked"])).days <= prefs.explore_cache_days:
            prices[job] = {date.fromisoformat(d): p for d, p in cached["prices"].items()}

    trips = []
    for d in dests:
        for h in prefs.home_airports:
            out = prices.get((h, d))
            if not out:
                continue
            # Hem till valfri hemmaflygplats: billigaste per dag.
            back: dict[date, tuple[float, str]] = {}
            for h2 in prefs.home_airports:
                for day, p in (prices.get((d, h2)) or {}).items():
                    if day not in back or p < back[day][0]:
                        back[day] = (p, h2)
            for day, p_out in out.items():
                if not (start <= day <= end):
                    continue
                for nights in range(prefs.min_nights, prefs.max_nights + 1):
                    ret = day + timedelta(days=nights)
                    if ret not in back:
                        continue
                    p_back, h_back = back[ret]
                    url = (f"https://www.google.com/travel/flights?hl=sv&curr={prefs.currency}"
                           f"&q=Flights%20from%20{h}%20to%20{d}%20on%20{day.isoformat()}%20through%20{ret.isoformat()}")
                    placeholder = Flight(provider="google_flights", origin=h, destination=d,
                                         depart=datetime.combine(day, datetime.min.time()), price=p_out,
                                         currency=prefs.currency, destination_name=prefs.destination_names.get(d, d),
                                         booking_url=url)
                    note = "Google Flights datumkalender – tider ej kontrollerade"
                    if h_back != h:
                        note += f", hem till {h_back}"
                    trips.append(Trip(window=make_window(day, ret), outbound=placeholder, indicative=True,
                                      indicative_price=p_out + p_back, notes=[note]))
    return trips


def _round_trips(self, prefs, start: date, end: date):
    trips = []
    if prefs.destinations:  # utvalda resmål först: varje dag, alla reslängder
        trips += _calendar_round_trips(self, prefs, start, end)
    trips += _explore_round_trips(self, prefs, start, end)  # resterande budget: utforska
    return trips


GoogleFlightsProvider.round_trips = _round_trips

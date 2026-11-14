from datetime import date, datetime

import httpx

from flightagent.cli import schedule_plist
from flightagent.config import Preferences
from flightagent.models import ExploreHit, Flight, TravelWindow
from flightagent.providers.google_flights import BudgetExceeded, GoogleFlightsProvider, parse_explore, parse_flights
from flightagent.providers.travelpayouts import parse_prices
from flightagent.search import search_window
from flightagent.state import State

GF = {
    "search_metadata": {"google_flights_url": "https://www.google.com/travel/flights?x"},
    "best_flights": [{"flights": [
        {"departure_airport": {"name": "Arlanda", "id": "ARN", "time": "2026-12-04 18:05"},
         "arrival_airport": {"name": "Kastrup", "id": "CPH", "time": "2026-12-04 19:15"},
         "airline": "SAS", "flight_number": "SK 1417"},
        {"departure_airport": {"name": "Kastrup", "id": "CPH", "time": "2026-12-04 20:00"},
         "arrival_airport": {"name": "El Prat", "id": "BCN", "time": "2026-12-04 23:05"},
         "airline": "Vueling", "flight_number": "VY 1381"}], "price": 812}],
    "other_flights": [{"flights": [], "price": 1}],
}


def test_parse_google_flights():
    [f] = parse_flights(GF, "SEK")
    assert (f.origin, f.destination, f.price, f.stops) == ("ARN", "BCN", 812.0, 1)
    assert f.airline == "SAS + Vueling" and f.depart == datetime(2026, 12, 4, 18, 5)
    assert f.arrive == datetime(2026, 12, 4, 23, 5)


def test_parse_explore():
    payload = {"destinations": [
        {"name": "Riga", "destination_airport": {"code": "RIX"}, "flight_price": 640, "airline": "airBaltic",
         "number_of_stops": 0, "link": "https://g.co/x"},
        {"name": "Utan pris", "destination_airport": {"code": "XXX"}}]}
    [h] = parse_explore(payload, "SEK")
    assert (h.destination, h.price, h.airline) == ("RIX", 640.0, "airBaltic")


def test_parse_travelpayouts():
    payload = {"data": [{"origin": "STO", "destination": "BCN", "origin_airport": "ARN", "destination_airport": "BCN",
                         "price": 731, "airline": "VY", "flight_number": "1272", "departure_at": "2026-12-04T19:10:00+01:00",
                         "transfers": 0, "duration_to": 220, "link": "/search/STO0412BCN1"}]}
    [f] = parse_prices(payload, "SEK")
    assert f.cached and f.flight_number == "VY1272" and f.arrive == datetime(2026, 12, 4, 22, 50)
    assert f.booking_url == "https://www.aviasales.com/search/STO0412BCN1"


def test_serpapi_budget_and_usage(tmp_path):
    calls = []

    def handler(request):
        calls.append(dict(request.url.params))
        return httpx.Response(200, json=GF)

    state = State(tmp_path / "s.json")
    p = GoogleFlightsProvider("KEY", max_per_run=1, state=state, client=httpx.Client(transport=httpx.MockTransport(handler)))
    assert p.search_one_way("ARN,NYO", "BCN", date(2026, 12, 4), date(2026, 12, 4), "SEK")
    assert calls[0]["departure_id"] == "ARN,NYO" and calls[0]["type"] == "2" and calls[0]["gl"] == "se"
    assert state.serpapi_used() == 1
    try:
        p.search_one_way("ARN", "BCN", date(2026, 12, 4), date(2026, 12, 4), "SEK")
        raise AssertionError("budget borde ha tagit slut")
    except BudgetExceeded:
        pass


class FakeTargeted:
    name = "google_flights"
    needs_destination = True
    multi_airport = True

    def __init__(self):
        self.searched = []

    def explore(self, origins, outbound, inbound, currency):
        return [ExploreHit("google_flights", "RIX", "Riga", 500, "SEK", airline="airBaltic"),
                ExploreHit("google_flights", "TFS", "Teneriffa", 900, "SEK"),
                ExploreHit("google_flights", "JFK", "New York", 5000, "SEK")]

    def search_one_way(self, origin, destination, date_from, date_to, currency):
        self.searched.append((origin, destination))
        if destination == "RIX":
            return [Flight("google_flights", "ARN", "RIX", datetime(2026, 12, 4, 18, 0), 250, "SEK", airline="airBaltic")]
        if origin == "RIX":
            return [Flight("google_flights", "RIX", "ARN", datetime(2026, 12, 6, 17, 0), 260, "SEK", airline="airBaltic")]
        return []


def test_explore_then_verify_only_promising_destinations():
    gf = FakeTargeted()
    prefs = Preferences(home_airports=["ARN", "NYO"], deal_threshold=1000, verify_top_n=3, verify_margin=1.3)
    trips = search_window(TravelWindow(date(2026, 12, 4), date(2026, 12, 6), "Helg"), prefs, [gf])
    # JFK (5000) är för dyrt för att kontrolleras; RIX och TFS kontrolleras.
    assert ("ARN,NYO", "RIX") in gf.searched and ("ARN,NYO", "TFS") in gf.searched
    assert all(d != "JFK" for _, d in gf.searched)
    assert ("RIX", "ARN,NYO") in gf.searched  # hemresa till valfri hemmaflygplats i ett anrop
    rix = next(t for t in trips if t.destination == "RIX")
    assert not rix.indicative and rix.total_price == 510
    # TFS och JFK gav inga exakta flyg → visas som indikativa
    assert {t.destination for t in trips if t.indicative} == {"TFS", "JFK"}


def test_dedupe_notifications(tmp_path):
    s = State(tmp_path / "s.json")
    assert s.should_notify("k", 800)
    s.mark_sent("k", 800)
    assert not s.should_notify("k", 790) and s.should_notify("k", 700)
    assert State(tmp_path / "s.json").data["sent"]["k"] == 800  # sparas på disk


def test_schedule_plist():
    p = schedule_plist(3)
    assert p["StartInterval"] == 10800 and p["ProgramArguments"][-2:] == ["flightagent.cli", "scan"]

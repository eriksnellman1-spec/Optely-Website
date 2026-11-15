from datetime import date, datetime

import httpx

from flightagent.cli import schedule_plist
from flightagent.config import Preferences
from flightagent.providers.google_flights import BudgetExceeded, GoogleFlightsProvider, parse_explore, parse_flights
from flightagent.providers.travelpayouts import parse_prices, parse_round_trips
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


def test_dedupe_notifications(tmp_path):
    s = State(tmp_path / "s.json")
    assert s.should_notify("k", 800)
    s.mark_sent("k", 800)
    assert not s.should_notify("k", 790) and s.should_notify("k", 700)
    assert State(tmp_path / "s.json").data["sent"]["k"] == 800  # sparas på disk


def test_schedule_plist():
    p = schedule_plist(3)
    assert p["StartInterval"] == 10800 and p["ProgramArguments"][-2:] == ["flightagent.cli", "scan"]


def test_explore_searches_each_home_airport_and_empty_is_not_error(tmp_path):
    seen = []

    def handler(request):
        origin = request.url.params["departure_id"]
        seen.append(origin)
        if origin == "HEL":
            return httpx.Response(200, json={"error": 'Empty results for departure_id: "HEL".'})
        return httpx.Response(200, json={"destinations": [
            {"name": "Riga", "destination_airport": {"code": "RIX"}, "flight_price": 40}]})

    p = GoogleFlightsProvider("KEY", state=State(tmp_path / "s.json"),
                              client=httpx.Client(transport=httpx.MockTransport(handler)))
    hits = p.explore(["HEL", "ARN"], date(2026, 12, 4), date(2026, 12, 6), "EUR")
    assert seen == ["HEL", "ARN"] and [h.destination for h in hits] == ["RIX"]


def test_google_flexible_round_trips_rotate_and_reuse_cache(tmp_path):
    asked = []

    def handler(request):
        p = request.url.params
        asked.append((p["month"], p["travel_duration"]))
        return httpx.Response(200, json={"destinations": [
            {"name": "Riga", "destination_airport": {"code": "RIX"}, "flight_price": 40,
             "start_date": "2026-12-08", "end_date": "2026-12-11", "airline": "airBaltic"}]})

    state = State(tmp_path / "s.json")
    prefs = Preferences(home_airports=["HEL"], min_nights=1, max_nights=7)

    def run():
        gf = GoogleFlightsProvider("KEY", daily_budget=3, state=state,
                                   client=httpx.Client(transport=httpx.MockTransport(handler)))
        return gf.round_trips(prefs, date(2026, 12, 1), date(2027, 1, 31))

    trips = run()
    assert asked == [("12", "1"), ("12", "2"), ("1", "1")]       # 3 av 4 kombinationer idag
    assert len(trips) == 3 and trips[0].window.nights == 3 and trips[0].indicative
    state.data["serpapi_day"] = {}                                  # ny dag
    asked.clear()
    trips = run()
    assert asked[0] == ("1", "2")                                   # aldrig kollad först
    assert len(trips) == 4                                          # resten från sparade priser


def test_travelpayouts_round_trip_is_one_ticket():
    payload = {"data": [{"origin_airport": "HEL", "destination_airport": "BCN", "price": 120, "airline": "AY",
                         "flight_number": "1651", "departure_at": "2026-12-08T07:10:00+02:00",
                         "return_at": "2026-12-12T18:00:00+01:00", "transfers": 0, "return_transfers": 0,
                         "link": "/search/HEL0812BCN12121"}]}
    [t] = parse_round_trips(payload, "EUR", "HEL")
    assert t.bundled and t.total_price == 120 and t.window.nights == 4
    assert t.inbound.destination == "HEL" and t.outbound.cached



def test_google_calendar_every_day_both_ways(tmp_path):
    asked = []

    def handler(request):
        p = request.url.params
        asked.append((p["engine"], p["departure_id"], p["arrival_id"]))
        if p["engine"] == "google_travel_explore":
            return httpx.Response(200, json={"destinations": []})
        if p["departure_id"] == "HEL":   # utresor 8–10 dec
            prices = [{"outbound_date": f"2026-12-{d:02d}", "price": 30 + d} for d in (8, 9, 10)]
        else:                            # hemresor 9–20 dec
            prices = [{"outbound_date": f"2026-12-{d:02d}", "price": 20} for d in range(9, 21)]
        return httpx.Response(200, json={"prices": prices})

    state = State(tmp_path / "s.json")
    prefs = Preferences(home_airports=["HEL"], destinations=["BCN"], destination_names={"BCN": "Barcelona"},
                        min_nights=1, max_nights=7)
    gf = GoogleFlightsProvider("KEY", daily_budget=2, state=state,
                               client=httpx.Client(transport=httpx.MockTransport(handler)))
    trips = gf.round_trips(prefs, date(2026, 12, 1), date(2027, 1, 31))
    assert asked == [("google_flights_calendar", "HEL", "BCN"), ("google_flights_calendar", "BCN", "HEL")]
    assert len(trips) == 3 * 7                                 # 3 avresedagar × 7 reslängder
    best = min(trips, key=lambda t: t.total_price)
    assert best.total_price == 58 and best.destination_name == "Barcelona" and best.indicative

    # Nästa körning samma dag: budgeten är slut → sparade kalendrar används.
    gf2 = GoogleFlightsProvider("KEY", daily_budget=2, state=state,
                                client=httpx.Client(transport=httpx.MockTransport(handler)))
    assert len(gf2.round_trips(prefs, date(2026, 12, 1), date(2027, 1, 31))) == 21
    assert len(asked) == 2


def test_google_calendar_falls_back_to_monthly_chunks(tmp_path):
    asked = []

    def handler(request):
        p = request.url.params
        asked.append((p["date_range_start"], p["date_range_end"]))
        if len(asked) == 1:
            return httpx.Response(200, json={"error": "date range too long"})
        return httpx.Response(200, json={"prices": [{"outbound_date": p["date_range_start"], "price": 10}]})

    from flightagent.providers.google_flights import _calendar
    gf = GoogleFlightsProvider("KEY", state=State(tmp_path / "s.json"),
                               client=httpx.Client(transport=httpx.MockTransport(handler)))
    prices = _calendar(gf, "HEL", "BCN", date(2026, 12, 15), date(2027, 2, 10), "EUR")
    assert asked[1:] == [("2026-12-15", "2026-12-31"), ("2027-01-01", "2027-01-31"), ("2027-02-01", "2027-02-10")]
    assert len(prices) == 3

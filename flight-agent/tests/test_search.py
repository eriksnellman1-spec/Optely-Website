from datetime import date, datetime

from flightagent.config import Preferences
from flightagent.models import Flight, TravelWindow
from flightagent.search import deals, search_all, search_window

WINDOW = TravelWindow(date(2026, 11, 6), date(2026, 11, 8), "Helg")


def fl(provider, o, d, dep, price, arr=None):
    return Flight(provider, o, d, dep, price, "SEK", arrive=arr)


class FakeProvider:
    def __init__(self, name, flights):
        self.name, self.flights = name, flights

    def search_one_way(self, origin, destination, date_from, date_to, currency):
        return [f for f in self.flights if f.origin == origin and (destination is None or f.destination == destination)
                and date_from <= f.depart.date() <= date_to]


def test_filters_early_and_before_work_and_combines_carriers():
    a = FakeProvider("a", [
        fl("a", "ARN", "BCN", datetime(2026, 11, 7, 5, 30), 100),   # för tidigt
        fl("a", "ARN", "BCN", datetime(2026, 11, 6, 12, 0), 150),   # fredag före jobbslut
        fl("a", "ARN", "BCN", datetime(2026, 11, 6, 18, 0), 400),
        fl("a", "BCN", "ARN", datetime(2026, 11, 8, 15, 0), 900),
    ])
    b = FakeProvider("b", [fl("b", "BCN", "NYO", datetime(2026, 11, 8, 19, 0), 300)])
    prefs = Preferences(home_airports=["ARN", "NYO"], earliest_departure_hour=7, after_work_hour=17)
    trips = search_window(WINDOW, prefs, [a, b])
    assert len(trips) == 1
    t = trips[0]
    assert t.outbound.price == 400 and t.inbound.price == 300 and t.total_price == 700
    assert t.mixed_carriers and t.different_return_airport and len(t.notes) == 2


def test_failing_provider_does_not_break_search_and_deals():
    class Broken:
        name = "broken"

        def search_one_way(self, *a):
            raise RuntimeError("boom")

    ok = FakeProvider("a", [
        fl("a", "ARN", "LIS", datetime(2026, 11, 7, 9, 0), 300),
        fl("a", "LIS", "ARN", datetime(2026, 11, 8, 9, 0), 300),
    ])
    prefs = Preferences(deal_threshold=650)
    trips = search_all([WINDOW], prefs, [Broken(), ok])
    assert [t.total_price for t in deals(trips, prefs)] == [600]


def test_late_arrival_is_rejected():
    p = FakeProvider("a", [
        fl("a", "ARN", "ATH", datetime(2026, 11, 7, 21, 0), 100, arr=datetime(2026, 11, 8, 1, 0)),
        fl("a", "ATH", "ARN", datetime(2026, 11, 8, 10, 0), 100),
    ])
    assert search_window(WINDOW, Preferences(latest_arrival_hour=23), [p]) == []

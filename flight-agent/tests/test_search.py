from datetime import date, datetime

from flightagent.config import Preferences
from flightagent.models import Flight, Trip
from flightagent.search import cheapest_by_day, combine, deals, search_all
from flightagent.windows import make_window

TODAY = date(2026, 11, 30)


def fl(o, d, dep, price, arr=None, provider="a"):
    return Flight(provider, o, d, dep, price, "EUR", arrive=arr)


def test_combine_builds_all_lengths_any_weekday():
    out = cheapest_by_day([fl("HEL", "RIX", datetime(2026, 12, 8, 10), 20)])          # tisdag
    back = cheapest_by_day([fl("RIX", "HEL", datetime(2026, 12, d, 12), 10 + d) for d in (9, 10, 15, 20)])
    prefs = Preferences(home_airports=["HEL"], min_nights=1, max_nights=7, after_work_hour=0, earliest_departure_hour=0)
    trips = combine(out, back, prefs, date(2026, 12, 1), date(2027, 2, 28))
    assert sorted(t.window.nights for t in trips) == [1, 2, 7]  # 20/12 = 12 nätter → utanför
    assert min(trips, key=lambda t: t.total_price).total_price == 39


def test_after_work_rule_only_on_workdays():
    early_tue = fl("HEL", "RIX", datetime(2026, 12, 8, 9), 5)
    early_sat = fl("HEL", "RIX", datetime(2026, 12, 12, 9), 5)
    back = cheapest_by_day([fl("RIX", "HEL", datetime(2026, 12, d, 12), 5) for d in (10, 14)])
    prefs = Preferences(home_airports=["HEL"], after_work_hour=17, earliest_departure_hour=0)
    trips = combine(cheapest_by_day([early_tue, early_sat]), back, prefs, date(2026, 12, 1), date(2027, 1, 31))
    assert {t.window.depart_day for t in trips} == {date(2026, 12, 12)}


def test_late_arrival_is_rejected():
    out = cheapest_by_day([fl("HEL", "ATH", datetime(2026, 12, 12, 21), 10, arr=datetime(2026, 12, 13, 1))])
    back = cheapest_by_day([fl("ATH", "HEL", datetime(2026, 12, 14, 10), 10)])
    prefs = Preferences(home_airports=["HEL"], latest_arrival_hour=23, earliest_departure_hour=0)
    assert combine(out, back, prefs, date(2026, 12, 1), date(2027, 1, 31)) == []


class FakeProvider:
    name = "fake"

    def __init__(self, trips):
        self.trips = trips

    def round_trips(self, prefs, start, end):
        return self.trips


def trip(dest, dep, ret, price, origin="HEL"):
    out = fl(origin, dest, datetime.combine(dep, datetime.min.time().replace(hour=12)), price)
    back = fl(dest, origin, datetime.combine(ret, datetime.min.time().replace(hour=12)), 0)
    return Trip(window=make_window(dep, ret), outbound=out, inbound=back)


def test_search_all_filters_home_areas_lengths_and_keeps_best_dates():
    class Broken:
        name = "broken"

        def round_trips(self, *a):
            raise RuntimeError("boom")

    d = date(2026, 12, 8)
    trips = [
        trip("ARN", d, date(2026, 12, 10), 5),            # Stockholm är inte hem längre men…
        trip("NYO", d, date(2026, 12, 10), 5),
        trip("RIX", d, date(2026, 12, 20), 5),            # 12 nätter → för lång
        *[trip("RIX", date(2026, 12, day), date(2026, 12, day + 2), 30 + day) for day in range(8, 14)],
        trip("TLL", d, date(2026, 12, 9), 99),
    ]
    prefs = Preferences(home_airports=["HEL", "ARN"], per_destination=3, deal_threshold=50)
    result = search_all(prefs, [Broken(), FakeProvider(trips)], today=TODAY)
    assert [t.destination for t in result] == ["RIX", "RIX", "RIX", "TLL"]
    assert [t.window.depart_day.day for t in result[:3]] == [8, 9, 10]
    assert len(deals(result, prefs)) == 3

from datetime import date

from flightagent.windows import find_travel_windows

TODAY = date(2026, 11, 2)  # måndag


def test_weekend_window_departs_friday():
    w = find_travel_windows(TODAY, months_ahead=2)[0]
    assert (w.depart_day, w.return_day, w.label) == (date(2026, 11, 6), date(2026, 11, 8), "Helg")


def test_christmas_long_weekend_includes_julafton():
    xmas = [w for w in find_travel_windows(TODAY, months_ahead=2) if "Juldagen" in w.label]
    assert xmas and xmas[0].depart_day == date(2026, 12, 23) and xmas[0].return_day == date(2026, 12, 27)


def test_midsommarafton_is_off():
    w = [w for w in find_travel_windows(date(2027, 6, 1), months_ahead=1) if "Midsommarafton" in w.label]
    assert w and w[0].depart_day == date(2027, 6, 24)

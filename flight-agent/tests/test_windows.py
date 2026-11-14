from datetime import date

from flightagent.windows import make_window


def test_labels():
    assert make_window(date(2026, 12, 4), date(2026, 12, 6)).label == "Helg"
    assert make_window(date(2026, 12, 8), date(2026, 12, 9)).label == "Vardagar"
    assert make_window(date(2026, 12, 8), date(2026, 12, 11)).label == "2 lediga dagar behövs"
    xmas = make_window(date(2026, 12, 23), date(2026, 12, 27)).label
    assert "Julafton" in xmas and "Juldagen" in xmas
    assert "Midsommarafton" in make_window(date(2027, 6, 24), date(2027, 6, 27)).label

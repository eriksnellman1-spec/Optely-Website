from datetime import date

from flightagent.calendar_sync import find_travel_windows, parse_events

ICS = """BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:1
DTSTART;VALUE=DATE:20261214
DTEND;VALUE=DATE:20261219
SUMMARY:Semester
END:VEVENT
BEGIN:VEVENT
UID:2
DTSTART:20261121T100000
DTEND:20261121T120000
SUMMARY:Bröllop
END:VEVENT
BEGIN:VEVENT
UID:3
DTSTART:20261128T100000
DTEND:20261128T110000
SUMMARY:Tips (ledig tid)
TRANSP:TRANSPARENT
END:VEVENT
END:VCALENDAR
"""

TODAY = date(2026, 11, 2)  # måndag


def windows():
    events = parse_events(ICS, TODAY, date(2027, 1, 31))
    return find_travel_windows(events, TODAY, months_ahead=2, vacation_keywords=["semester"])


def test_weekend_window_departs_friday():
    w = windows()[0]
    assert (w.depart_day, w.return_day, w.label) == (date(2026, 11, 6), date(2026, 11, 8), "Helg")


def test_busy_weekend_is_skipped_but_transparent_is_not():
    starts = {w.depart_day for w in windows()}
    assert date(2026, 11, 20) not in starts  # bröllop lör 21/11
    assert date(2026, 11, 27) in starts      # "ledig tid" blockerar inte


def test_vacation_merges_with_weekends():
    vac = [w for w in windows() if w.label == "Semester"]
    assert vac and vac[0].depart_day == date(2026, 12, 11) and vac[0].return_day == date(2026, 12, 20)


def test_public_holidays_make_long_weekend():
    xmas = [w for w in windows() if "Juldagen" in w.label]
    assert xmas and xmas[0].depart_day == date(2026, 12, 23)

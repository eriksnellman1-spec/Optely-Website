"""Hittar lediga reseperioder: helger och svenska röda dagar
(inklusive jul-, nyårs- och midsommarafton)."""

from __future__ import annotations

from datetime import date, timedelta

import holidays

from .models import TravelWindow


def swedish_days_off(years: range) -> dict[date, str]:
    public = dict(holidays.country_holidays("SE", years=years))
    for y in years:  # "de facto"-lediga aftnar
        public.setdefault(date(y, 12, 24), "Julafton")
        public.setdefault(date(y, 12, 31), "Nyårsafton")
    for day, name in list(public.items()):
        if name == "Midsommardagen":
            public.setdefault(day - timedelta(days=1), "Midsommarafton")
    return public


def find_travel_windows(today: date, months_ahead: int = 3, min_nights: int = 1, max_nights: int = 16) -> list[TravelWindow]:
    """Sammanhängande lediga block → resefönster. Avresa kvällen innan blocket."""
    horizon = today + timedelta(days=round(months_ahead * 30.5))
    public = swedish_days_off(range(today.year, horizon.year + 1))

    def is_off(d: date) -> bool:
        return d.weekday() >= 5 or d in public

    windows: list[TravelWindow] = []
    d = today + timedelta(days=1)
    while d <= horizon:
        if not is_off(d):
            d += timedelta(days=1)
            continue
        block = [d]
        while block[-1] + timedelta(days=1) <= horizon and is_off(block[-1] + timedelta(days=1)):
            block.append(block[-1] + timedelta(days=1))
        d = block[-1] + timedelta(days=1)

        names = sorted({public[x] for x in block if x in public})
        label = "Långhelg (" + ", ".join(names) + ")" if names else "Helg"
        depart_day = block[0] - timedelta(days=1)
        if depart_day <= today:
            depart_day = block[0]
        window = TravelWindow(depart_day=depart_day, return_day=block[-1], label=label)
        if min_nights <= window.nights <= max_nights:
            windows.append(window)
    return windows

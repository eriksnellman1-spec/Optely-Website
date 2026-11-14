"""Svenska lediga dagar och etiketter för resans datum."""

from __future__ import annotations

from datetime import date, timedelta
from functools import lru_cache

import holidays

from .models import TravelWindow


@lru_cache(maxsize=8)
def swedish_days_off(year: int) -> dict[date, str]:
    public = dict(holidays.country_holidays("SE", years=year))
    public.setdefault(date(year, 12, 24), "Julafton")
    public.setdefault(date(year, 12, 31), "Nyårsafton")
    for day, name in list(public.items()):
        if name == "Midsommardagen":
            public.setdefault(day - timedelta(days=1), "Midsommarafton")
    return public


def is_day_off(d: date) -> bool:
    return d.weekday() >= 5 or d in swedish_days_off(d.year)


def make_window(depart: date, ret: date) -> TravelWindow:
    """Etikett: "Helg" om resan ryms i en helg, "Långhelg (…)" med röda dagar,
    annars "Vardagar" (antal lediga dagar du behöver ta)."""
    days = [depart + timedelta(days=i) for i in range((ret - depart).days + 1)]
    names = sorted({swedish_days_off(d.year)[d] for d in days if d in swedish_days_off(d.year)})
    # Avresedagen och hemresedagen räknas inte som lediga dagar man behöver ta.
    workdays = [d for d in days[1:-1] if not is_day_off(d)]
    if not workdays:
        label = "Långhelg (" + ", ".join(names) + ")" if names else ("Helg" if any(d.weekday() >= 5 for d in days) else "Vardagar")
    else:
        n = len(workdays)
        label = f"{n} ledig dag behövs" if n == 1 else f"{n} lediga dagar behövs"
    return TravelWindow(depart_day=depart, return_day=ret, label=label)

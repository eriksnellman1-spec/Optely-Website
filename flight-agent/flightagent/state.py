"""Liten lokal lagring: SerpApi-förbrukning per månad och redan skickade fynd
(så att schemalagda körningar inte skickar samma resa om och om igen)."""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import date
from pathlib import Path

from .config import ROOT

STATE_FILE = ROOT / ".state" / "state.json"


class State:
    def __init__(self, path: Path = STATE_FILE):
        self.path = path
        try:
            self.data = json.loads(path.read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError):
            self.data = {}

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.data, indent=2, ensure_ascii=False), encoding="utf-8")

    # SerpApi-budget
    def serpapi_used(self, today: date | None = None) -> int:
        month = (today or date.today()).strftime("%Y-%m")
        return self.data.get("serpapi", {}).get(month, 0)

    def serpapi_used_today(self, today: date | None = None) -> int:
        return self.data.get("serpapi_day", {}).get((today or date.today()).isoformat(), 0)

    def add_serpapi(self, n: int = 1, today: date | None = None) -> None:
        today = today or date.today()
        usage = self.data.setdefault("serpapi", {})
        usage[today.strftime("%Y-%m")] = usage.get(today.strftime("%Y-%m"), 0) + n
        # Behåll bara dagens räknare.
        self.data["serpapi_day"] = {today.isoformat(): self.serpapi_used_today(today) + n}
        self.save()

    # Sparade Google Explore-resultat per resefönster
    def explore_checked(self, key: str) -> str | None:
        return (self.data.get("explore", {}).get(key) or {}).get("checked")

    def cached_explore(self, key: str, max_age_days: int, today: date | None = None):
        from .models import ExploreHit

        entry = self.data.get("explore", {}).get(key)
        if not entry:
            return None
        age = ((today or date.today()) - date.fromisoformat(entry["checked"])).days
        if age > max_age_days:
            return None
        return [ExploreHit(**h) for h in entry["hits"]]

    def store_explore(self, key: str, hits, today: date | None = None) -> None:
        checked = (today or date.today()).isoformat()
        store = self.data.setdefault("explore", {})
        store[key] = {"checked": checked, "hits": [asdict(h) for h in hits]}
        # Rensa fönster som redan passerat (nyckeln innehåller hemresedatum sist).
        for k in [k for k in store if k.rsplit("|", 1)[-1] < checked]:
            del store[k]
        self.save()

    # Skickade fynd: nyckel → lägsta pris vi redan notifierat om.
    def should_notify(self, key: str, price: float) -> bool:
        previous = self.data.get("sent", {}).get(key)
        return previous is None or price < previous * 0.95  # ny resa eller >5 % billigare

    def mark_sent(self, key: str, price: float) -> None:
        self.data.setdefault("sent", {})[key] = price
        self.save()

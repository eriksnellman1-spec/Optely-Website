"""Liten lokal lagring: SerpApi-förbrukning per månad och redan skickade fynd
(så att schemalagda körningar inte skickar samma resa om och om igen)."""

from __future__ import annotations

import json
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

    def add_serpapi(self, n: int = 1, today: date | None = None) -> None:
        month = (today or date.today()).strftime("%Y-%m")
        usage = self.data.setdefault("serpapi", {})
        usage[month] = usage.get(month, 0) + n
        self.save()

    # Skickade fynd: nyckel → lägsta pris vi redan notifierat om.
    def should_notify(self, key: str, price: float) -> bool:
        previous = self.data.get("sent", {}).get(key)
        return previous is None or price < previous * 0.95  # ny resa eller >5 % billigare

    def mark_sent(self, key: str, price: float) -> None:
        self.data.setdefault("sent", {})[key] = price
        self.save()

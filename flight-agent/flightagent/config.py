from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent


@dataclass
class Preferences:
    home_airports: list[str] = field(default_factory=lambda: ["ARN"])
    # Tom lista = "vart som helst" (om leverantören stödjer det).
    destinations: list[str] = field(default_factory=list)
    currency: str = "SEK"
    months_ahead: int = 3
    # Inga avgångar före denna timme (t.ex. inga 05:00-flyg).
    earliest_departure_hour: int = 7
    # Ingen ankomst efter denna timme (None = ingen gräns).
    latest_arrival_hour: int | None = 23
    # På en arbetsdag (kvällen innan ledigheten) – åk tidigast denna timme.
    after_work_hour: int = 17
    # Tur och retur under detta pris = "fynd" som skickas som notis.
    deal_threshold: float = 1000.0
    max_results: int = 25
    providers: list[str] = field(default_factory=lambda: ["demo"])
    # Ord i heldagshändelser som markerar semester/ledighet.
    vacation_keywords: list[str] = field(
        default_factory=lambda: ["semester", "ledig", "vacation", "holiday", "resa"]
    )
    min_nights: int = 1
    max_nights: int = 16


@dataclass
class Secrets:
    anthropic_api_key: str | None
    claude_model: str
    claude_effort: str
    telegram_bot_token: str | None
    telegram_chat_id: str | None
    discord_webhook_url: str | None
    calendar_ics_urls: list[str]


def load_preferences(path: str | Path | None = None) -> Preferences:
    path = Path(path) if path else ROOT / "config.yaml"
    if not path.exists():
        path = ROOT / "config.example.yaml"
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    known = Preferences.__dataclass_fields__.keys()
    unknown = set(data) - set(known)
    if unknown:
        raise ValueError(f"Okända inställningar i {path.name}: {', '.join(sorted(unknown))}")
    prefs = Preferences(**data)
    prefs.home_airports = [a.upper() for a in prefs.home_airports]
    prefs.destinations = [a.upper() for a in prefs.destinations]
    return prefs


def load_secrets() -> Secrets:
    load_dotenv(ROOT / ".env")

    def env(name: str) -> str | None:
        value = os.getenv(name, "").strip()
        return value or None

    return Secrets(
        anthropic_api_key=env("ANTHROPIC_API_KEY"),
        claude_model=env("CLAUDE_MODEL") or "claude-opus-5-5",
        claude_effort=env("CLAUDE_EFFORT") or "low",
        telegram_bot_token=env("TELEGRAM_BOT_TOKEN"),
        telegram_chat_id=env("TELEGRAM_CHAT_ID"),
        discord_webhook_url=env("DISCORD_WEBHOOK_URL"),
        calendar_ics_urls=[u.strip() for u in (env("CALENDAR_ICS_URLS") or "").split(",") if u.strip()],
    )

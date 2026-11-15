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
    # Beskriv fritt vart du vill, t.ex. "varmt i Spanien" eller "Barcelona eller Lissabon".
    # Tomt = vart som helst. Flygplatskoder ("BCN, AGP") fungerar också.
    where: str = ""
    # Flygplatskoder (fylls i automatiskt från `where`).
    destinations: list[str] = field(default_factory=list)
    destination_names: dict[str, str] = field(default_factory=dict)  # kod → stad (från `where`)
    currency: str = "EUR"
    months_ahead: int = 3
    # Inga avgångar före denna timme (t.ex. inga 05:00-flyg).
    earliest_departure_hour: int = 7
    # Ingen ankomst efter denna timme (None = ingen gräns).
    latest_arrival_hour: int | None = 23
    # På en arbetsdag (kvällen innan ledigheten) – åk tidigast denna timme.
    after_work_hour: int = 17
    # Tur och retur under detta pris = "fynd" som skickas som notis.
    deal_threshold: float = 100.0
    # Fler nya fynd än så här i en sökning → ett samlat meddelande i stället för ett per resa.
    digest_after: int = 5
    max_results: int = 25  # antal som visas i appen; notiser skickas för alla fynd
    providers: list[str] = field(default_factory=lambda: ["demo"])
    # Högst så här många förslag per resmål (olika datum).
    per_destination: int = 3
    serpapi_max_per_run: int = 40
    serpapi_monthly_budget: int = 240
    # Gratisnivån räcker till ca 8 sökningar/dag. Google kontrollerar de
    # resefönster som kollades längst sedan; övriga använder sparade priser.
    serpapi_daily_budget: int = 8
    explore_cache_days: int = 7
    min_nights: int = 1
    max_nights: int = 7


@dataclass
class Secrets:
    anthropic_api_key: str | None
    claude_model: str
    claude_effort: str
    telegram_bot_token: str | None
    telegram_chat_id: str | None
    discord_webhook_url: str | None
    serpapi_key: str | None = None
    travelpayouts_token: str | None = None


def load_preferences(path: str | Path | None = None) -> Preferences:
    path = Path(path) if path else ROOT / "config.yaml"
    if not path.exists():
        path = ROOT / "config.example.yaml"
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    for removed in ("vacation_keywords", "verify_top_n", "verify_margin"):  # borttagna inställningar ignoreras
        data.pop(removed, None)
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
        serpapi_key=env("SERPAPI_KEY"),
        travelpayouts_token=env("TRAVELPAYOUTS_TOKEN"),
    )

"""Kommandorad: python -m flightagent.cli <kommando>

  test-notify     skicka ett testmeddelande till Telegram/Discord
  telegram-chatid visa chat-id:n som skrivit till din bot
  scan            kör en hel sökning och skicka fynd som notiser
"""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import date

from . import notify
from .calendar_sync import load_windows
from .config import load_preferences, load_secrets
from .providers import build_providers
from .search import deals, search_all


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="flightagent")
    parser.add_argument("command", choices=["test-notify", "telegram-chatid", "scan"])
    parser.add_argument("--config", help="sökväg till config.yaml")
    parser.add_argument("--dry-run", action="store_true", help="scan: skriv ut i stället för att skicka")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    secrets = load_secrets()

    if args.command == "test-notify":
        sent = notify.notify(secrets, "✅ Optely Flight Agent är ansluten! Här kommer dina flygfynd.")
        print("Skickat till:", ", ".join(sent))
        return 0

    if args.command == "telegram-chatid":
        if not secrets.telegram_bot_token:
            print("Sätt TELEGRAM_BOT_TOKEN i .env först.")
            return 1
        chats = notify.telegram_find_chat_id(secrets.telegram_bot_token)
        if not chats:
            print("Inga meddelanden hittades. Skicka 'hej' till din bot i Telegram och kör igen.")
            return 1
        for chat_id, name in chats:
            print(f"TELEGRAM_CHAT_ID={chat_id}   ({name})")
        return 0

    prefs = load_preferences(args.config)
    windows = load_windows(
        secrets.calendar_ics_urls, date.today(), months_ahead=prefs.months_ahead,
        vacation_keywords=prefs.vacation_keywords, min_nights=prefs.min_nights, max_nights=prefs.max_nights,
    )
    print(f"{len(windows)} lediga resefönster hittades")
    trips = search_all(windows, prefs, build_providers(prefs.providers))
    found = deals(trips, prefs)
    print(f"{len(trips)} resor, varav {len(found)} under {prefs.deal_threshold:.0f} {prefs.currency}")
    for trip in found:
        if args.dry_run:
            print("\n" + notify.trip_text(trip))
        else:
            notify.notify_trip(secrets, trip)
    return 0


def run() -> int:
    try:
        return main()
    except RuntimeError as exc:
        print(f"Fel: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(run())

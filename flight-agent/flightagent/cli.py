"""Kommandorad: python -m flightagent.cli <kommando>

  sources           visa vilka källor som är aktiva och SerpApi-förbrukning
  test-notify       skicka ett testmeddelande till Telegram/Discord
  telegram-chatid   visa chat-id:n som skrivit till din bot
  scan              kör en hel sökning och skicka nya fynd som notiser
  install-schedule  (Mac) kör scan automatiskt var N:e timme
  remove-schedule   (Mac) stäng av den automatiska körningen
"""

from __future__ import annotations

import argparse
import logging
import plistlib
import subprocess
import sys
from pathlib import Path

from . import notify
from .config import ROOT, load_preferences, load_secrets
from .providers import REGISTRY, build_providers
from .search import deals, fmt_day, money, search_all, search_range
from .state import State

LABEL = "se.optely.flightagent"
PLIST = Path.home() / "Library" / "LaunchAgents" / f"{LABEL}.plist"


def schedule_plist(hours: int) -> dict:
    log = str(ROOT / ".state" / "scan.log")
    return {
        "Label": LABEL,
        "ProgramArguments": [sys.executable, "-m", "flightagent.cli", "scan"],
        "WorkingDirectory": str(ROOT),
        "StartInterval": hours * 3600,
        "RunAtLoad": True,
        "StandardOutPath": log,
        "StandardErrorPath": log,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="flightagent")
    parser.add_argument("command", choices=["sources", "test-notify", "telegram-chatid", "scan",
                                            "install-schedule", "remove-schedule"])
    parser.add_argument("--config", help="sökväg till config.yaml")
    parser.add_argument("--dry-run", action="store_true", help="scan: skriv ut i stället för att skicka")
    parser.add_argument("--hours", type=int, default=4, help="install-schedule: intervall i timmar")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    secrets = load_secrets()

    if args.command == "sources":
        prefs = load_preferences(args.config)
        keys = {"SERPAPI_KEY": secrets.serpapi_key, "TRAVELPAYOUTS_TOKEN": secrets.travelpayouts_token}
        for name, (desc, key) in REGISTRY.items():
            on = name in prefs.providers
            ready = key is None or bool(keys.get(key))
            status = "✅ aktiv" if on and ready else ("⚠️ saknar " + key if on else "– av")
            print(f"{name:15} {status:24} {desc}")
        used = State().serpapi_used()
        print(f"\nSerpApi idag: {State().serpapi_used_today()}/{prefs.serpapi_daily_budget}, "
              f"denna månad: {used}/{prefs.serpapi_monthly_budget} sökningar")
        return 0

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

    if args.command == "install-schedule":
        if sys.platform != "darwin":
            print("Automatisk körning är bara inbyggd för Mac.")
            return 1
        (ROOT / ".state").mkdir(exist_ok=True)
        PLIST.parent.mkdir(parents=True, exist_ok=True)
        PLIST.write_bytes(plistlib.dumps(schedule_plist(args.hours)))
        subprocess.run(["launchctl", "unload", str(PLIST)], capture_output=True)
        subprocess.run(["launchctl", "load", "-w", str(PLIST)], check=True)
        print(f"Klart! Sökningen körs nu var {args.hours}:e timme (även direkt efter att Macen vaknat).")
        print(f"Logg: {ROOT / '.state' / 'scan.log'}")
        return 0

    if args.command == "remove-schedule":
        if PLIST.exists():
            subprocess.run(["launchctl", "unload", "-w", str(PLIST)], capture_output=True)
            PLIST.unlink()
        print("Automatisk körning avstängd.")
        return 0

    prefs = load_preferences(args.config)
    state = State()
    start, end = search_range(prefs)
    print(f"Söker tur och retur från {', '.join(prefs.home_airports)}: avresa {fmt_day(start)}–{fmt_day(end)}, "
          f"{prefs.min_nights}–{prefs.max_nights} nätter")
    providers, _ = build_providers(prefs.providers, secrets, prefs, state)
    if not providers:
        raise RuntimeError("Inga källor är aktiva – kontrollera providers i config.yaml och nycklarna i .env")
    trips = search_all(prefs, providers)
    found = deals(trips, prefs)
    per_source: dict[str, int] = {}
    for t in trips:
        per_source[t.outbound.provider] = per_source.get(t.outbound.provider, 0) + 1
    print("Per källa:", ", ".join(f"{k} {v}" for k, v in sorted(per_source.items())) or "inga")
    print(f"{len(trips)} resor, varav {len(found)} under {money(prefs.deal_threshold, prefs.currency)}")
    print(f"SerpApi idag: {state.serpapi_used_today()}/{prefs.serpapi_daily_budget}, "
          f"denna månad: {state.serpapi_used()}/{prefs.serpapi_monthly_budget}")
    if args.dry_run:
        for trip in found:
            print("\n" + notify.trip_text(trip))
    else:
        print(f"{notify.notify_new_deals(secrets, found, state, prefs.digest_after)} nya fynd skickades")
    return 0


def run() -> int:
    try:
        return main()
    except RuntimeError as exc:
        print(f"Fel: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(run())

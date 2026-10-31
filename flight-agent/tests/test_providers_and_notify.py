import json

import httpx

from flightagent.models import TravelWindow
from flightagent.notify import send_discord, send_telegram, trip_text
from flightagent.providers.demo import DemoProvider
from flightagent.providers.ryanair import parse_fares
from flightagent.search import search_window
from flightagent.config import Preferences
from datetime import date

RYANAIR = {"fares": [{"outbound": {
    "departureAirport": {"iataCode": "NYO", "name": "Stockholm Skavsta", "city": {"name": "Stockholm"}},
    "arrivalAirport": {"iataCode": "BGY", "name": "Milano Bergamo", "city": {"name": "Milano"}},
    "departureDate": "2026-11-06T18:10:00", "arrivalDate": "2026-11-06T20:45:00",
    "price": {"value": 349.0, "currencyCode": "SEK"}, "flightNumber": "FR4111"}}]}


def test_parse_ryanair():
    [f] = parse_fares(RYANAIR)
    assert (f.origin, f.destination, f.price, f.destination_name) == ("NYO", "BGY", 349.0, "Milano")
    assert "dateOut=2026-11-06" in f.booking_url and "destinationIata=BGY" in f.booking_url


def _trip():
    prefs = Preferences(home_airports=["ARN"])
    return search_window(TravelWindow(date(2026, 11, 6), date(2026, 11, 8), "Helg"), prefs, [DemoProvider()])[0]


def test_telegram_payload_has_booking_buttons():
    seen = {}

    def handler(request):
        seen["url"], seen["body"] = str(request.url), json.loads(request.content)
        return httpx.Response(200, json={"ok": True})

    t = _trip()
    send_telegram("TOKEN", "42", trip_text(t), [{"text": "Boka", "url": "https://x.se"}],
                  client=httpx.Client(transport=httpx.MockTransport(handler)))
    assert seen["url"].endswith("/botTOKEN/sendMessage")
    assert seen["body"]["chat_id"] == "42"
    assert seen["body"]["reply_markup"]["inline_keyboard"][0][0]["url"] == "https://x.se"


def test_discord_embeds_links():
    seen = {}

    def handler(request):
        seen["body"] = json.loads(request.content)
        return httpx.Response(204)

    send_discord("https://discord.test/hook", "hej", [{"text": "Boka", "url": "https://x.se"}],
                 client=httpx.Client(transport=httpx.MockTransport(handler)))
    assert "[Boka](https://x.se)" in seen["body"]["embeds"][0]["description"]

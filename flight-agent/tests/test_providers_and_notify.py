import json

import httpx

from flightagent.notify import send_discord, send_telegram, trip_text
from flightagent.providers.demo import DemoProvider
from flightagent.providers.ryanair import RyanairProvider, parse_fares, parse_per_day
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
    prefs = Preferences(home_airports=["HEL"])
    return DemoProvider().round_trips(prefs, date(2026, 12, 1), date(2026, 12, 20))[0]


def test_parse_ryanair_per_day():
    payload = {"outbound": {"fares": [
        {"day": "2026-12-01", "departureDate": None, "price": None, "unavailable": True},
        {"day": "2026-12-03", "departureDate": "2026-12-03T15:05:00", "arrivalDate": "2026-12-03T16:45:00",
         "price": {"value": 40.98, "currencyCode": "EUR"}, "soldOut": False, "unavailable": False}]}}
    [f] = parse_per_day(payload, "ARN", "WMI", "EUR")
    assert f.price == 40.98 and f.depart.day == 3 and "dateOut=2026-12-03" in f.booking_url


def test_ryanair_round_trips_combines_daily_prices():
    def handler(request):
        path = request.url.path
        if path.endswith("/oneWayFares"):
            return httpx.Response(200, json={"fares": [{"outbound": {
                "departureAirport": {"iataCode": "HEL"}, "arrivalAirport": {"iataCode": "RIX", "city": {"name": "Riga"}},
                "departureDate": "2026-12-08T10:00:00", "price": {"value": 15, "currencyCode": "EUR"}}}]})
        origin = path.split("/")[-3]
        day = "08" if origin == "HEL" else "11"
        return httpx.Response(200, json={"outbound": {"fares": [{
            "departureDate": f"2026-12-{day}T12:00:00", "arrivalDate": f"2026-12-{day}T13:00:00",
            "price": {"value": 15 if origin == "HEL" else 18, "currencyCode": "EUR"}}]}})

    p = RyanairProvider(client=httpx.Client(transport=httpx.MockTransport(handler)))
    prefs = Preferences(home_airports=["HEL"], earliest_departure_hour=0, after_work_hour=0)
    [t] = p.round_trips(prefs, date(2026, 12, 1), date(2027, 1, 31))
    assert (t.destination_name, t.window.nights, t.total_price) == ("Riga", 3, 33)


def test_bundled_trip_text_hides_leg_prices():
    from flightagent.notify import trip_text
    payload = {"data": [{"origin_airport": "HEL", "destination_airport": "BCN", "price": 120, "airline": "AY",
                         "departure_at": "2026-12-08T07:10:00", "return_at": "2026-12-12T18:00:00"}]}
    from flightagent.providers.travelpayouts import parse_round_trips
    [t] = parse_round_trips(payload, "EUR", "HEL")
    text = trip_text(t)
    assert "120,00 €" in text and text.count("€") == 1


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


def test_many_new_deals_become_one_digest(tmp_path, monkeypatch):
    from flightagent import notify as n
    from flightagent.state import State

    sent = []
    monkeypatch.setattr(n, "notify", lambda secrets, text, buttons=None: sent.append((text, buttons)) or ["Telegram"])
    trips = DemoProvider().round_trips(Preferences(home_airports=["HEL"]), date(2026, 12, 1), date(2026, 12, 31))[:40]
    state = State(tmp_path / "s.json")
    assert n.notify_new_deals(None, trips, state, digest_after=5) == 40
    [(text, buttons)] = sent
    assert text.startswith("🔥 40 nya flygfynd") and "och 25 till" in text and len(buttons) == 3
    assert n.notify_new_deals(None, trips, state, digest_after=5) == 0      # redan skickade
    assert len(sent) == 1


def test_discord_accepts_button_rows():
    seen = {}

    def handler(request):
        seen["body"] = json.loads(request.content)
        return httpx.Response(204)

    send_discord("https://discord.test/hook", "hej", [[{"text": "A", "url": "https://a.se"}], [{"text": "B", "url": "https://b.se"}]],
                 client=httpx.Client(transport=httpx.MockTransport(handler)))
    assert "[B](https://b.se)" in seen["body"]["embeds"][0]["description"]

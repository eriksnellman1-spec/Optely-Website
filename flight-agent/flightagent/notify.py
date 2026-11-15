"""Notiser till Telegram och Discord."""

from __future__ import annotations

import html

import httpx

from .models import Trip
from .search import fmt_day, fmt_dt, money, nights_text


def trip_text(trip: Trip) -> str:
    out, back = trip.outbound, trip.inbound
    if trip.indicative:
        return "\n".join([
            f"✈️ {out.origin} → {trip.destination_name} ({trip.destination}) – ca {money(trip.total_price, trip.currency)} t/r",
            f"🗓 {fmt_day(trip.window.depart_day)} – {fmt_day(trip.window.return_day)}, {nights_text(trip.window.nights)} ({trip.window.label})",
            *[f"💡 {n}" for n in trip.notes],
        ])
    lines = [
        f"✈️ {out.origin} → {trip.destination_name} ({trip.destination}) – {money(trip.total_price, trip.currency)} t/r",
        f"🗓 {nights_text(trip.window.nights)} ({trip.window.label})",
        f"Ut: {fmt_dt(out.depart)} {out.flight_number + ' ' if out.flight_number else ''}({out.airline or out.provider})"
        + ("" if trip.bundled else f" – {money(out.price, out.currency)}"),
    ]
    if back:
        lines.append(
            f"Hem: {fmt_dt(back.depart)} {back.flight_number + ' ' if back.flight_number else ''}({back.airline or back.provider}) → {back.destination}"
            + ("" if trip.bundled else f" – {money(back.price, back.currency)}")
        )
    lines += [f"💡 {n}" for n in trip.notes]
    return "\n".join(lines)


def _buttons(trip: Trip) -> list[dict]:
    buttons = []
    if trip.indicative and trip.outbound.booking_url:
        return [{"text": "Visa på Google Flights", "url": trip.outbound.booking_url}]
    if trip.outbound.booking_url:
        buttons.append({"text": "Boka resan" if trip.bundled else "Boka utresa", "url": trip.outbound.booking_url})
    if trip.inbound and trip.inbound.booking_url and not trip.bundled:
        buttons.append({"text": "Boka hemresa", "url": trip.inbound.booking_url})
    return buttons


def send_telegram(token: str, chat_id: str, text: str, buttons: list[dict] | None = None, client: httpx.Client | None = None) -> None:
    payload: dict = {"chat_id": chat_id, "text": html.escape(text), "parse_mode": "HTML", "disable_web_page_preview": True}
    if buttons:
        # En lista med knappar = en rad; en lista med listor = flera rader.
        rows = buttons if isinstance(buttons[0], list) else [buttons]
        payload["reply_markup"] = {"inline_keyboard": rows}
    c = client or httpx.Client(timeout=15.0)
    resp = c.post(f"https://api.telegram.org/bot{token}/sendMessage", json=payload)
    if resp.status_code != 200:
        raise RuntimeError(f"Telegram svarade {resp.status_code}: {resp.text[:300]}")


def send_discord(webhook_url: str, text: str, buttons: list[dict] | None = None, client: httpx.Client | None = None) -> None:
    # Vanliga webhooks kan inte ha knappar – länkarna läggs i en embed i stället.
    flat = [b for row in (buttons or []) for b in (row if isinstance(row, list) else [row])]
    links = "\n".join(f"[{b['text']}]({b['url']})" for b in flat)
    payload: dict = {"content": text[:2000]}
    if links:
        payload["embeds"] = [{"description": links, "color": 0x2F80ED}]
    c = client or httpx.Client(timeout=15.0)
    resp = c.post(webhook_url, json=payload)
    if resp.status_code not in (200, 204):
        raise RuntimeError(f"Discord svarade {resp.status_code}: {resp.text[:300]}")


def notify(secrets, text: str, buttons: list[dict] | None = None) -> list[str]:
    """Skickar till alla konfigurerade kanaler. Returnerar vilka som fick meddelandet."""
    sent = []
    if secrets.telegram_bot_token and secrets.telegram_chat_id:
        send_telegram(secrets.telegram_bot_token, secrets.telegram_chat_id, text, buttons)
        sent.append("Telegram")
    if secrets.discord_webhook_url:
        send_discord(secrets.discord_webhook_url, text, buttons)
        sent.append("Discord")
    if not sent:
        raise RuntimeError("Ingen notiskanal konfigurerad – fyll i TELEGRAM_* eller DISCORD_WEBHOOK_URL i .env")
    return sent


def notify_trip(secrets, trip: Trip) -> list[str]:
    return notify(secrets, "🔥 Flygfynd!\n" + trip_text(trip), _buttons(trip))


def digest_text(trips: list[Trip], top: int = 15) -> str:
    best = sorted(trips, key=lambda t: t.total_price)[:top]
    lines = [f"🔥 {len(trips)} nya flygfynd! De {len(best)} billigaste:", ""]
    for t in best:
        ca = "ca " if t.indicative else ""
        lines.append(f"{ca}{money(t.total_price, t.currency)} – {t.destination_name} ({t.destination}), "
                     f"{fmt_day(t.window.depart_day)}–{fmt_day(t.window.return_day)}, {nights_text(t.window.nights)}")
    if len(trips) > len(best):
        lines += ["", f"…och {len(trips) - len(best)} till. Se alla i appen."]
    return "\n".join(lines)


def notify_new_deals(secrets, trips: list[Trip], state, digest_after: int = 5) -> int:
    """Skickar bara fynd som inte redan skickats (eller blivit >5 % billigare).
    Fler än `digest_after` nya fynd samlas i ett enda meddelande."""
    from .search import deal_key

    new = [t for t in trips if state.should_notify(deal_key(t), t.total_price)]
    if not new:
        return 0
    if len(new) <= digest_after:
        for trip in new:
            notify_trip(secrets, trip)
    else:
        best = sorted(new, key=lambda t: t.total_price)[:3]
        buttons = [[{"text": f"{money(t.total_price, t.currency)} {t.destination_name}"[:60],
                     "url": t.outbound.booking_url}] for t in best if t.outbound.booking_url]
        notify(secrets, digest_text(new), buttons)
    for trip in new:
        state.mark_sent(deal_key(trip), trip.total_price)
    return len(new)


def telegram_find_chat_id(token: str, client: httpx.Client | None = None) -> list[tuple[str, str]]:
    """Hjälp vid uppsättning: skriv något till din bot först, kör sedan detta."""
    c = client or httpx.Client(timeout=15.0)
    resp = c.get(f"https://api.telegram.org/bot{token}/getUpdates")
    resp.raise_for_status()
    chats = {}
    for upd in resp.json().get("result", []):
        msg = upd.get("message") or upd.get("channel_post") or {}
        chat = msg.get("chat") or {}
        if "id" in chat:
            chats[str(chat["id"])] = chat.get("title") or chat.get("first_name") or chat.get("username") or ""
    return list(chats.items())

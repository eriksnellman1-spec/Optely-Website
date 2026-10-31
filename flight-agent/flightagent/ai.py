"""AI-analys med Claude: rangordnar fynden mot dina preferenser och föreslår
smarta alternativ (annan flygplats, tåg sista biten, kombinerade bolag)."""

from __future__ import annotations

import json

import anthropic

from .config import Preferences, Secrets
from .models import Trip

# Modeller som stödjer server-side fallback vid avböjda förfrågningar.
_FALLBACK_MODELS = {"claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"}

SYSTEM = """Du är en privat reseagent som bara arbetar för användaren – inga provisioner, inga sponsrade val.
Du får riktiga sökresultat (priser hämtade direkt från flygbolagen) och användarens preferenser.

Gör så här, kort och konkret på svenska:
1. Topp 3 resor och varför (pris, tider, antal nätter).
2. Smarta alternativ: närliggande flygplatser, tåg/buss sista biten, att kombinera bolag eller landa på en annan hemmaflygplats.
   Skilj tydligt på vad som finns i datan och vad som är en idé som användaren själv måste kontrollera – hitta aldrig på priser eller avgångar.
3. Varningar: väskavgifter (lågprisbolag tar extra), sena ankomster, avlägsna flygplatser.
Svara i Markdown, max ca 250 ord."""


def _trip_dict(t: Trip) -> dict:
    def f(fl):
        return None if fl is None else {
            "bolag": fl.provider, "från": fl.origin, "till": fl.destination, "stad": fl.destination_name,
            "avgång": fl.depart.isoformat(timespec="minutes"),
            "ankomst": fl.arrive.isoformat(timespec="minutes") if fl.arrive else None,
            "pris": fl.price, "valuta": fl.currency, "flyg": fl.flight_number,
        }
    return {"period": t.window.label, "nätter": t.window.nights, "totalpris": t.total_price,
            "ut": f(t.outbound), "hem": f(t.inbound), "noteringar": t.notes}


def analyze(trips: list[Trip], prefs: Preferences, secrets: Secrets, client: anthropic.Anthropic | None = None) -> str:
    if not trips:
        return "Inga resor hittades att analysera."
    client = client or anthropic.Anthropic(api_key=secrets.anthropic_api_key)
    payload = {
        "preferenser": {
            "hemmaflygplatser": prefs.home_airports,
            "tidigaste_avgång": f"{prefs.earliest_departure_hour}:00",
            "senaste_ankomst": f"{prefs.latest_arrival_hour}:00" if prefs.latest_arrival_hour else None,
            "fyndgräns": prefs.deal_threshold, "valuta": prefs.currency,
        },
        "resor": [_trip_dict(t) for t in trips[:15]],
    }
    kwargs: dict = {}
    if secrets.claude_model in _FALLBACK_MODELS:
        kwargs = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}
    response = client.beta.messages.create(
        model=secrets.claude_model,
        max_tokens=4000,
        system=SYSTEM,
        output_config={"effort": secrets.claude_effort},
        messages=[{"role": "user", "content": json.dumps(payload, ensure_ascii=False)}],
        **kwargs,
    )
    if response.stop_reason == "refusal":
        return "AI-analysen avböjdes den här gången – resultaten ovan gäller fortfarande."
    return "".join(b.text for b in response.content if b.type == "text").strip()

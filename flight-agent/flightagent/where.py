"""Tolkar en fri beskrivning av vart du vill ("varmt i Spanien", "Barcelona
eller Lissabon", "grekiska öarna") till en lista med flygplatskoder.

Claude gör tolkningen. Svaret sparas lokalt per beskrivning, så samma text
kostar bara en gång. Utan ANTHROPIC_API_KEY går det att skriva flygplatskoder
direkt, t.ex. "BCN, AGP, PMI".
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

import anthropic

from .config import Secrets
from .state import State

_FALLBACK_MODELS = {"claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"}
MAX_AIRPORTS = 25

SYSTEM = """Du översätter en resenärs fria beskrivning av vart hen vill resa till flygplatser med reguljärflyg.
Resenären flyger från {homes}.

Regler:
- Ta med alla rimliga flygplatser som matchar beskrivningen, även mindre flygplatser som lågprisbolag
  använder (t.ex. Girona och Reus för Barcelona-området, Bergamo för Milano), max {max} stycken.
- Vid ett land eller en region: välj de flygplatser som har flest förbindelser från Norden först.
- Använd endast giltiga IATA-koder med tre bokstäver. Hitta aldrig på koder.
- Ta inte med resenärens hemmaflygplatser.
- `summary` är en kort svensk sammanfattning av hur du tolkade beskrivningen."""

SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "airports": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"code": {"type": "string"}, "city": {"type": "string"}, "country": {"type": "string"}},
                "required": ["code", "city", "country"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["summary", "airports"],
    "additionalProperties": False,
}


@dataclass
class Where:
    text: str
    summary: str
    airports: list[dict]  # [{"code": "BCN", "city": "Barcelona", "country": "Spanien"}]

    @property
    def codes(self) -> list[str]:
        return [a["code"] for a in self.airports]


def _codes_only(text: str) -> list[str] | None:
    """"BCN, AGP pmi" → ["BCN", "AGP", "PMI"]; None om texten inte bara är koder."""
    tokens = [t for t in re.split(r"[\s,;/]+", text.strip()) if t]
    if tokens and all(re.fullmatch(r"[A-Za-z]{3}", t) for t in tokens):
        return [t.upper() for t in tokens]
    return None


def resolve(text: str, homes: list[str], secrets: Secrets, state: State | None = None,
            client: anthropic.Anthropic | None = None) -> Where | None:
    text = (text or "").strip()
    if not text:
        return None
    codes = _codes_only(text)
    if codes:
        return Where(text, "Flygplatskoder: " + ", ".join(codes), [{"code": c, "city": c, "country": ""} for c in codes])

    state = state or State()
    cache_key = f"{text.lower()}|{','.join(homes)}"
    cached = state.data.get("where", {}).get(cache_key)
    if cached:
        return Where(text, cached["summary"], cached["airports"])

    if not secrets.anthropic_api_key and client is None:
        raise RuntimeError(
            "För att beskriva resmål fritt behövs ANTHROPIC_API_KEY i .env. "
            "Utan nyckel kan du skriva flygplatskoder, t.ex. \"BCN, AGP, PMI\"."
        )
    client = client or anthropic.Anthropic(api_key=secrets.anthropic_api_key)
    kwargs: dict = {}
    if secrets.claude_model in _FALLBACK_MODELS:
        kwargs = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}
    response = client.beta.messages.create(
        model=secrets.claude_model,
        max_tokens=4000,
        system=SYSTEM.format(homes=", ".join(homes), max=MAX_AIRPORTS),
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": SCHEMA}},
        messages=[{"role": "user", "content": text}],
        **kwargs,
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Claude kunde inte tolka beskrivningen – prova att formulera om den.")
    raw = next(b.text for b in response.content if b.type == "text")
    data = json.loads(raw)
    seen, airports = set(homes), []
    for a in data.get("airports", []):
        code = str(a.get("code", "")).upper()
        if re.fullmatch(r"[A-Z]{3}", code) and code not in seen:
            seen.add(code)
            airports.append({"code": code, "city": a.get("city", ""), "country": a.get("country", "")})
    airports = airports[:MAX_AIRPORTS]
    if not airports:
        raise RuntimeError("Hittade inga flygplatser för beskrivningen – prova att vara lite mer specifik.")
    state.data.setdefault("where", {})[cache_key] = {"summary": data.get("summary", ""), "airports": airports}
    state.save()
    return Where(text, data.get("summary", ""), airports)

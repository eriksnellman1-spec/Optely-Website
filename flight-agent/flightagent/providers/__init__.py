from __future__ import annotations

import logging

from .base import FlightProvider
from .demo import DemoProvider
from .google_flights import GoogleFlightsProvider
from .ryanair import RyanairProvider
from .travelpayouts import TravelpayoutsProvider

log = logging.getLogger(__name__)

# Namn → (beskrivning, nyckel som krävs i .env eller None)
REGISTRY = {
    "google_flights": ("Google Flights via SerpApi – nästan alla flygbolag, live", "SERPAPI_KEY"),
    "ryanair": ("Ryanair direkt – live, gratis", None),
    "aviasales": ("Aviasales/Travelpayouts – brett, gratis, cachade priser", "TRAVELPAYOUTS_TOKEN"),
    "demo": ("Påhittade priser för test", None),
}


def build_providers(names: list[str], secrets=None, prefs=None, state=None) -> tuple[list[FlightProvider], list[str]]:
    """Returnerar (leverantörer, varningar). Källor som saknar nyckel hoppas över."""
    providers: list[FlightProvider] = []
    warnings: list[str] = []
    for name in names:
        if name not in REGISTRY:
            raise ValueError(f"Okänd källa: {name}. Tillgängliga: {', '.join(REGISTRY)}")
        if name == "demo":
            providers.append(DemoProvider())
        elif name == "ryanair":
            providers.append(RyanairProvider())
        elif name == "google_flights":
            if not (secrets and secrets.serpapi_key):
                warnings.append("google_flights hoppades över – SERPAPI_KEY saknas i .env")
                continue
            kwargs = {}
            if prefs:
                kwargs = {"max_per_run": prefs.serpapi_max_per_run, "monthly_budget": prefs.serpapi_monthly_budget,
                          "daily_budget": prefs.serpapi_daily_budget}
            providers.append(GoogleFlightsProvider(secrets.serpapi_key, state=state, **kwargs))
        elif name == "aviasales":
            if not (secrets and secrets.travelpayouts_token):
                warnings.append("aviasales hoppades över – TRAVELPAYOUTS_TOKEN saknas i .env")
                continue
            providers.append(TravelpayoutsProvider(secrets.travelpayouts_token))
    for w in warnings:
        log.warning(w)
    return providers, warnings


__all__ = ["FlightProvider", "build_providers", "REGISTRY"]

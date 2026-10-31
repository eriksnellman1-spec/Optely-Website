from __future__ import annotations

from .base import FlightProvider
from .demo import DemoProvider
from .ryanair import RyanairProvider

REGISTRY = {"demo": DemoProvider, "ryanair": RyanairProvider}


def build_providers(names: list[str]) -> list[FlightProvider]:
    unknown = [n for n in names if n not in REGISTRY]
    if unknown:
        raise ValueError(f"Okänd leverantör: {', '.join(unknown)}. Tillgängliga: {', '.join(REGISTRY)}")
    return [REGISTRY[n]() for n in names]


__all__ = ["FlightProvider", "build_providers", "REGISTRY"]

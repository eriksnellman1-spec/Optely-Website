from __future__ import annotations

from datetime import date
from typing import Protocol

from ..models import Flight


class FlightProvider(Protocol):
    name: str

    def search_one_way(
        self,
        origin: str,
        destination: str | None,
        date_from: date,
        date_to: date,
        currency: str,
    ) -> list[Flight]:
        """Returnerar enkelresor. `destination=None` betyder "vart som helst"."""
        ...

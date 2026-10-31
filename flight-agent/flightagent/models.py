from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime


@dataclass(frozen=True)
class TravelWindow:
    """En ledig period i kalendern. `depart_day` är dagen man kan åka (ofta kvällen
    före en ledig dag), `return_day` den sista lediga dagen."""

    depart_day: date
    return_day: date
    label: str

    @property
    def nights(self) -> int:
        return (self.return_day - self.depart_day).days


@dataclass(frozen=True)
class Flight:
    provider: str
    origin: str
    destination: str
    depart: datetime
    price: float
    currency: str
    arrive: datetime | None = None
    origin_name: str = ""
    destination_name: str = ""
    flight_number: str = ""
    booking_url: str = ""


@dataclass
class Trip:
    window: TravelWindow
    outbound: Flight
    inbound: Flight | None = None
    notes: list[str] = field(default_factory=list)

    @property
    def total_price(self) -> float:
        return self.outbound.price + (self.inbound.price if self.inbound else 0.0)

    @property
    def currency(self) -> str:
        return self.outbound.currency

    @property
    def destination(self) -> str:
        return self.outbound.destination

    @property
    def destination_name(self) -> str:
        return self.outbound.destination_name or self.outbound.destination

    @property
    def mixed_carriers(self) -> bool:
        return bool(self.inbound) and self.inbound.provider != self.outbound.provider

    @property
    def different_return_airport(self) -> bool:
        return bool(self.inbound) and self.inbound.destination != self.outbound.origin

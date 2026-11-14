from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime


@dataclass(frozen=True)
class TravelWindow:
    """En ledig period (helg eller röd dag). `depart_day` är dagen man kan åka (ofta kvällen
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
    airline: str = ""
    stops: int = 0
    # Cachat pris (t.ex. Aviasales) – kan ha ändrats sedan det sparades.
    cached: bool = False


@dataclass(frozen=True)
class ExploreHit:
    """Indikativt tur-och-retur-pris för ett resmål (utan exakta tider)."""

    provider: str
    destination: str
    destination_name: str
    price: float
    currency: str
    airline: str = ""
    stops: int = 0
    booking_url: str = ""
    checked: str = ""  # datum (ÅÅÅÅ-MM-DD) då priset hämtades från Google


@dataclass
class Trip:
    window: TravelWindow
    outbound: Flight
    inbound: Flight | None = None
    notes: list[str] = field(default_factory=list)
    # Sant när tiderna inte är kontrollerade (bara ett t/r-pris från Explore).
    indicative: bool = False
    indicative_price: float | None = None

    @property
    def total_price(self) -> float:
        if self.indicative_price is not None:
            return self.indicative_price
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
        if not self.inbound:
            return False
        a, b = self.outbound.airline, self.inbound.airline
        return a != b if a and b else self.inbound.provider != self.outbound.provider

    @property
    def different_return_airport(self) -> bool:
        return bool(self.inbound) and self.inbound.destination != self.outbound.origin

"""Demo-leverantör med påhittade men deterministiska priser – så att appen,
rankningen och notiserna kan testas utan nätverk."""

from __future__ import annotations

import hashlib
from datetime import date, datetime, time, timedelta

from ..models import Flight

DESTINATIONS = {
    "BCN": "Barcelona", "LIS": "Lissabon", "BER": "Berlin", "MXP": "Milano",
    "AGP": "Málaga", "CPH": "Köpenhamn", "ATH": "Aten", "KRK": "Kraków",
    "DUB": "Dublin", "BUD": "Budapest",
}
ORIGINS = {"ARN": "Stockholm Arlanda", "NYO": "Stockholm Skavsta", "GOT": "Göteborg", "CPH": "Köpenhamn"}


def _rand(*parts: object) -> int:
    return int(hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()[:8], 16)


class DemoProvider:
    name = "demo"

    def search_one_way(self, origin, destination, date_from, date_to, currency):
        targets = [destination] if destination else [d for d in DESTINATIONS if d != origin]
        flights: list[Flight] = []
        day = date_from
        while day <= date_to:
            for dest in targets:
                for slot in range(3):
                    r = _rand(origin, dest, day, slot)
                    if r % 3 == 0:
                        continue
                    hour = 5 + (r >> 4) % 17  # 05–21
                    depart = datetime.combine(day, time(hour, (r >> 9) % 4 * 15))
                    price = 199 + (r >> 12) % 1400
                    flights.append(
                        Flight(
                            provider=self.name,
                            origin=origin,
                            destination=dest,
                            depart=depart,
                            arrive=depart + timedelta(hours=2, minutes=(r >> 6) % 4 * 15),
                            price=float(price),
                            currency=currency,
                            origin_name=ORIGINS.get(origin, DESTINATIONS.get(origin, origin)),
                            destination_name=DESTINATIONS.get(dest, ORIGINS.get(dest, dest)),
                            flight_number=f"DM{r % 9000 + 1000}",
                            booking_url="https://example.com/demo-booking",
                        )
                    )
            day += timedelta(days=1)
        return flights

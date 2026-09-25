from dataclasses import dataclass
from datetime import datetime, date


@dataclass
class SaleEvent:
    date: date
    discount: int
    price: float
    regular: float


def dt(v):
    if isinstance(v, datetime):
        return v
    if isinstance(v, date):
        return datetime.combine(v, datetime.min.time())
    return datetime.fromisoformat(str(v).replace("Z", "+00:00"))


def _amount(value):
    if isinstance(value, dict):
        return value.get("amount")
    return value


def parse_history(raw):
    if isinstance(raw, dict):
        raw = (
            raw.get("history")
            or raw.get("data")
            or raw.get("prices")
            or []
        )

    out = []

    for x in raw:
        try:
            timestamp = x.get("timestamp") or x.get("time") or x.get("date")
            if not timestamp:
                continue

            deal = x.get("deal") or x

            price = _amount(deal.get("price"))
            regular = _amount(deal.get("regular"))

            if price is None or regular is None:
                continue

            price = float(price)
            regular = float(regular)

            if regular <= 0:
                continue

            discount = deal.get("discount")

            if discount is None:
                discount = x.get("discount")

            if discount is None:
                discount = round((1 - price / regular) * 100)

            out.append(
                SaleEvent(
                    date=dt(timestamp).date(),
                    discount=int(round(float(discount))),
                    price=price,
                    regular=regular,
                )
            )

        except (ValueError, TypeError, KeyError, AttributeError):
            continue

    return sorted(out, key=lambda e: e.date)


def create_sale_events(records):
    events = []
    previous_discount = 0

    for record in records:
        discount = record.discount

        if discount > 0 and previous_discount == 0:
            events.append(record)

        elif discount > 0 and discount > previous_discount + 5:
            events.append(record)

        previous_discount = discount

    return events
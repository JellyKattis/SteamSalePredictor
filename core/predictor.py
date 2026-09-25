from dataclasses import dataclass
from datetime import date

from .api import search_games, get_history
from .history import parse_history, create_sale_events
from .model import optimize, distribution, confidence, estimate_next_sale


@dataclass
class Prediction:
    title: str
    current: float | None
    regular: float | None
    currency: str
    events: list
    records: list
    probs: dict
    likely: int
    conf: int
    conf_label: str
    backtest: dict
    weights: dict
    next_start: date | None
    next_end: date | None


def predict(title, game_id=None):

    if game_id is None:
        results = search_games(title)

        if not results:
            raise RuntimeError("Spelet hittades inte.")

        game = results[0]
    else:
        results = search_games(title)

        game = None

        for result in results:
            if str(result.get("id")) == str(game_id):
                game = result
                break

        if game is None:
            game = {
                "id": game_id,
                "title": title
            }

    game_id = str(game.get("id"))

    name = (
        game.get("title")
        or game.get("name")
        or title
    )

    if game_id == "None":
        raise RuntimeError("Inget spel-ID hittades.")

    # Hämta prishistorik
    raw_history = get_history(game_id)

    records = parse_history(raw_history)
    events = create_sale_events(records)

    if len(events) < 4:
        raise RuntimeError(
            f"För lite historik ({len(events)} rea-händelser)."
        )

    # Senaste historiska pris
    latest_record = records[-1] if records else None

    # Försök hämta aktuellt pris
    current = None
    regular = None
    currency = "EUR"

    try:
        from .api import get_current_price

        current_info = get_current_price(game_id)

        if current_info:
            current = current_info.get("price")
            regular = current_info.get("regular")
            currency = current_info.get("currency") or "EUR"

    except Exception:
        pass

    # Fallback till senaste historiska pris
    if current is None and latest_record:
        current = latest_record.price
        regular = latest_record.regular

    # Optimera modellen
    weights, backtest = optimize(events)

    # Hitta nästa rea
    next_sale = estimate_next_sale(events)

    if next_sale:
        target_date = next_sale["start"]
        next_start = next_sale["start"]
        next_end = next_sale["end"]
    else:
        target_date = date.today()
        next_start = None
        next_end = None

    # Rabattprognos
    probs = distribution(
        events,
        target_date,
        weights
    )

    likely = max(
        probs,
        key=probs.get
    )

    conf_score, conf_label = confidence(
        events,
        backtest,
        probs
    )

    return Prediction(
        title=name,
        current=current,
        regular=regular,
        currency=currency,
        events=events,
        records=records,
        probs=probs,
        likely=likely,
        conf=conf_score,
        conf_label=conf_label,
        backtest=backtest,
        weights=weights,
        next_start=next_start,
        next_end=next_end,
    )
from collections import Counter
from datetime import date, timedelta
import math
import random
import statistics


DISCOUNTS = [
    10, 15, 20, 25, 30, 33, 40,
    50, 60, 66, 75, 80, 90
]

FEATURES = [
    "frequency",
    "similarity",
    "recency",
    "interval",
    "season"
]

OPTIMIZATION_TRIALS = 500


# ============================================================
# STEAM SALE CALENDAR
# ============================================================

STEAM_SALES = [
    {
        "name": "Autumn Sale 2026",
        "start": date(2026, 10, 1),
        "end": date(2026, 10, 8),
    },
    {
        "name": "Winter Sale 2026",
        "start": date(2026, 12, 17),
        "end": date(2027, 1, 4),
    },
    {
        "name": "Spring Sale 2027",
        "start": date(2027, 3, 18),
        "end": date(2027, 3, 25),
    },
    {
        "name": "Summer Sale 2027",
        "start": date(2027, 6, 24),
        "end": date(2027, 7, 8),
    },
]


# ============================================================
# INTERVALS
# ============================================================

def get_intervals(events):

    if len(events) < 2:
        return []

    dates = [e.date for e in events]

    intervals = []

    for i in range(1, len(dates)):
        days = (dates[i] - dates[i - 1]).days

        if days > 0:
            intervals.append(days)

    return intervals


# ============================================================
# FEATURES
# ============================================================

def frequency_score(candidate, events):

    if not events:
        return 0

    exact = sum(
        1
        for event in events
        if event.discount == candidate
    )

    return exact / len(events)


def similarity_score(candidate, events):

    if not events:
        return 0

    scores = []

    for event in events:

        distance = abs(
            candidate - event.discount
        )

        score = math.exp(
            -(distance ** 2) / (2 * 7 ** 2)
        )

        scores.append(score)

    return statistics.mean(scores)


def recency_score(candidate, events, as_of):

    matching = [
        event
        for event in events
        if event.discount == candidate
    ]

    if not matching:
        return 0

    latest = max(
        event.date
        for event in matching
    )

    days = (
        as_of - latest
    ).days

    if days < 0:
        days = 0

    return math.exp(-days / 365)


def interval_score(events, as_of):

    intervals = get_intervals(events)

    if not intervals:
        return 0.5

    median_interval = statistics.median(
        intervals
    )

    latest = max(
        events,
        key=lambda e: e.date
    )

    expected = (
        latest.date
        + timedelta(days=median_interval)
    )

    difference = abs(
        (as_of - expected).days
    )

    return math.exp(
        -difference / 90
    )


def seasonal_score(as_of):

    best = 0

    for sale in STEAM_SALES:

        if (
            sale["start"]
            <= as_of
            <= sale["end"]
        ):
            best = max(best, 1.0)

        else:

            distance = abs(
                (sale["start"] - as_of).days
            )

            if distance <= 14:
                best = max(best, 0.8)

            elif distance <= 30:
                best = max(best, 0.5)

    return best


# ============================================================
# CANDIDATES
# ============================================================

def get_candidates(events):

    observed = {
        event.discount
        for event in events
        if event.discount > 0
    }

    common_steam_discounts = {
        10, 15, 20, 25, 30, 33,
        40, 50, 60, 66, 75, 80, 90
    }

    candidates = (
        observed
        | common_steam_discounts
    )

    return sorted(
        x
        for x in candidates
        if 5 <= x <= 90
    )


# ============================================================
# RANDOM WEIGHTS
# ============================================================

def random_weights():

    values = [
        random.random()
        for _ in FEATURES
    ]

    total = sum(values)

    return {
        key: value / total
        for key, value in zip(
            FEATURES,
            values
        )
    }


# ============================================================
# DISTRIBUTION
# ============================================================

def distribution(events, target_date, weights):

    if not events:
        return {
            d: 0
            for d in DISCOUNTS
        }

    candidates = get_candidates(events)

    season = seasonal_score(target_date)
    interval = interval_score(
        events,
        target_date
    )

    results = {}

    for candidate in candidates:

        frequency = frequency_score(
            candidate,
            events
        )

        similarity = similarity_score(
            candidate,
            events
        )

        recency = recency_score(
            candidate,
            events,
            target_date
        )

        score = (
            frequency
            * weights["frequency"]

            + similarity
            * weights["similarity"]

            + recency
            * weights["recency"]

            + interval
            * weights["interval"]

            + season
            * weights["season"]
        )

        results[candidate] = max(
            score,
            0
        )

    total = sum(results.values())

    if total <= 0:
        return {
            d: 0
            for d in DISCOUNTS
        }

    return {
        d: results.get(d, 0) / total
        for d in DISCOUNTS
    }


# ============================================================
# BACKTEST
# ============================================================

def evaluate(events, weights):

    MIN_HISTORY = 3

    if len(events) <= MIN_HISTORY:
        return {
            "mae": None,
            "within5": None,
            "within10": None,
            "exact": None,
            "tests": 0
        }

    errors = []

    exact = 0
    within5 = 0
    within10 = 0

    for i in range(
        MIN_HISTORY,
        len(events)
    ):

        training = events[:i]
        actual = events[i]

        probabilities = distribution(
            training,
            actual.date,
            weights
        )

        predicted = max(
            probabilities,
            key=probabilities.get
        )

        difference = abs(
            predicted
            - actual.discount
        )

        errors.append(difference)

        if difference == 0:
            exact += 1

        if difference <= 5:
            within5 += 1

        if difference <= 10:
            within10 += 1

    if not errors:
        return {
            "mae": None,
            "within5": None,
            "within10": None,
            "exact": None,
            "tests": 0
        }

    mae = statistics.mean(errors)

    return {
        "mae": mae,
        "exact": exact / len(errors),
        "within5": within5 / len(errors),
        "within10": within10 / len(errors),
        "tests": len(errors)
    }


# ============================================================
# OPTIMIZE
# ============================================================

def optimize(events, trials=OPTIMIZATION_TRIALS):

    base = {
        key: 1 / len(FEATURES)
        for key in FEATURES
    }

    best_weights = base
    best_result = evaluate(
        events,
        base
    )

    def score(result):

        if result["mae"] is None:
            return -999

        return (
            -result["mae"]
            + result["exact"] * 5
            + result["within5"] * 2
        )

    for _ in range(trials):

        weights = random_weights()

        result = evaluate(
            events,
            weights
        )

        if score(result) > score(best_result):

            best_weights = weights
            best_result = result

    return best_weights, best_result


# ============================================================
# NEXT STEAM SALE
# ============================================================

def estimate_next_sale(events):

    today = date.today()

    future = [
        sale
        for sale in STEAM_SALES
        if sale["end"] >= today
    ]

    seasonal = None

    if future:
        seasonal = min(
            future,
            key=lambda x: x["start"]
        )

    intervals = get_intervals(events)

    historical_date = None

    if intervals:

        median_interval = statistics.median(
            intervals
        )

        latest = max(
            events,
            key=lambda e: e.date
        )

        historical_date = (
            latest.date
            + timedelta(
                days=median_interval
            )
        )

    if seasonal and historical_date:

        distance = abs(
            (
                seasonal["start"]
                - historical_date
            ).days
        )

        if distance <= 45:

            return {
                "name": seasonal["name"],
                "start": seasonal["start"],
                "end": seasonal["end"],
                "source":
                    "Steam calendar + historical intervals"
            }

    if seasonal:

        return {
            "name": seasonal["name"],
            "start": seasonal["start"],
            "end": seasonal["end"],
            "source": "Steam calendar"
        }

    if historical_date:

        return {
            "name": "Historiskt uppskattad rea",
            "start": historical_date,
            "end": historical_date,
            "source": "historiska intervall"
        }

    return None


# ============================================================
# CONFIDENCE
# ============================================================

def confidence(events, backtest, probabilities):

    n = min(
        1,
        len(events) / 20
    )

    if backtest["mae"] is None:
        b = 0
    else:
        b = max(
            0,
            min(
                1,
                1 - backtest["mae"] / 30
            )
        )

    entropy = -sum(
        p * math.log(p + 1e-12)
        for p in probabilities.values()
    )

    concentration = (
        1
        - entropy / math.log(
            len(probabilities)
        )
    )

    score = round(
        100 * (
            0.45 * n
            + 0.35 * b
            + 0.20 * concentration
        )
    )

    label = (
        "Hög"
        if score >= 70
        else "Medel"
        if score >= 45
        else "Låg"
    )

    return score, label
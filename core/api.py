import os
from datetime import datetime, timezone, timedelta

import requests
from dotenv import load_dotenv


load_dotenv()


BASE_URL = "https://api.isthereanydeal.com"
STEAM_SHOP_ID = 61
COUNTRY = "SE"


class APIError(RuntimeError):
    pass


def key():
    k = os.getenv(
        "ITAD_API_KEY",
        ""
    ).strip()

    if not k or k == "DIN_API_NYCKEL":
        raise APIError(
            "ITAD_API_KEY saknas i .env"
        )

    return k


def search_games(title):
    r = requests.get(
        f"{BASE_URL}/games/search/v1",
        params={
            "key": key(),
            "title": title,
            "results": 10
        },
        timeout=20
    )

    if not r.ok:
        raise APIError(
            f"ITAD search-fel: HTTP {r.status_code}"
        )

    return r.json()


def get_steam_appids(game_ids):
    """
    Hämtar Steam AppID från ITAD game ID.

    Exempel:

    ITAD ID
        ↓
    app/413150
        ↓
    Steam AppID = 413150
    """

    if not game_ids:
        return {}


    clean_ids = [
        str(game_id)
        for game_id in game_ids
        if game_id
    ]


    if not clean_ids:
        return {}


    r = requests.post(
        f"{BASE_URL}/lookup/shop/{STEAM_SHOP_ID}/id/v1",
        headers={
            "Content-Type": "application/json"
        },
        json=clean_ids,
        timeout=20
    )


    if not r.ok:
        raise APIError(
            "ITAD Steam-ID lookup-fel: "
            f"HTTP {r.status_code}"
        )


    data = r.json()

    result = {}


    for game_id in clean_ids:

        shop_ids = data.get(
            game_id,
            []
        )


        if not isinstance(
            shop_ids,
            list
        ):
            continue


        app_id = None


        for shop_id in shop_ids:

            if not isinstance(
                shop_id,
                str
            ):
                continue


            if shop_id.startswith(
                "app/"
            ):

                app_id = shop_id.split(
                    "/",
                    1
                )[1]

                break


        if app_id:
            result[game_id] = app_id


    return result


def get_history(
    game_id,
    years=5
):

    since = (
        datetime.now(
            timezone.utc
        )
        - timedelta(
            days=365 * years
        )
    ).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )


    r = requests.get(
        f"{BASE_URL}/games/history/v2",
        params={
            "key": key(),
            "id": game_id,
            "country": COUNTRY,
            "shops": STEAM_SHOP_ID,
            "since": since
        },
        timeout=30
    )


    if not r.ok:
        raise APIError(
            f"ITAD history-fel: HTTP {r.status_code}"
        )


    return r.json()


def get_current_price(
    game_id
):
    """
    Hämtar aktuellt Steam-pris för spelet.
    """

    r = requests.post(
        f"{BASE_URL}/games/overview/v2",
        headers={
            "ITAD-API-Key": key()
        },
        params={
            "country": COUNTRY,
            "shops": STEAM_SHOP_ID,
        },
        json=[
            game_id
        ],
        timeout=20,
    )


    if not r.ok:
        raise APIError(
            f"ITAD prisfel: HTTP {r.status_code}"
        )


    data = r.json()


    prices = (
        data.get(
            "prices",
            []
        )
        if isinstance(
            data,
            dict
        )
        else data
    )


    if not prices:
        return None


    current = prices[0].get(
        "current"
    )


    if not current:
        return None


    price = current.get(
        "price"
    ) or {}


    regular = current.get(
        "regular"
    ) or {}


    return {
        "price":
            price.get(
                "amount"
            ),

        "regular":
            regular.get(
                "amount"
            ),

        "currency":
            price.get(
                "currency"
            ),

        "cut":
            current.get(
                "cut",
                0
            ),

        "shop":
            current.get(
                "shop",
                {}
            ).get(
                "name"
            ),
    }
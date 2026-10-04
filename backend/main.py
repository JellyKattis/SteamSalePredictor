from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

import requests

from core.api import (
    search_games,
    get_steam_appids
)

from core.predictor import predict
from core.steam import get_owned_games, get_game_details
from core.proton import check_proton


app = FastAPI(
    title="Steam Sale Predictor",
    version="0.9"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return FileResponse(
        "frontend/index.html"
    )


@app.get("/how-it-works")
def how_it_works():
    return FileResponse(
        "frontend/how-it-works.html"
    )


@app.get("/about")
def about():
    return FileResponse(
        "frontend/about.html"
    )


@app.get("/privacy")
def privacy():
    return FileResponse(
        "frontend/privacy.html"
    )


@app.get("/404")
def page_not_found():
    return FileResponse(
        "frontend/404.html"
    )


@app.get("/error")
def error_page():
    return FileResponse(
        "frontend/error.html"
    )


@app.get("/api")
def api_home():
    return {
        "message":
            "Steam Sale Predictor API fungerar!",
        "version":
            "0.9"
    }


@app.get("/health")
def health():
    return {
        "status":
            "ok",
        "version":
            "0.9"
    }


@app.get("/exchange-rate")
def exchange_rate(
    base: str = "EUR",
    target: str = "SEK"
):
    base = base.upper()
    target = target.upper()

    if base == target:
        return {
            "base":
                base,
            "target":
                target,
            "rate":
                1,
            "date":
                None
        }

    try:
        response = requests.get(
            f"https://api.frankfurter.dev/v2/rate/"
            f"{base.lower()}/{target.lower()}",
            timeout=10
        )
        response.raise_for_status()
        data = response.json()

        return {
            "base":
                data["base"],
            "target":
                data["quote"],
            "rate":
                data["rate"],
            "date":
                data["date"]
        }

    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail=
                "Valutakursen kunde inte hämtas just nu."
        )


@app.get("/search")
def search(query: str):
    if not query.strip():
        return {
            "games": []
        }

    try:
        games = search_games(
            query
        )

        game_ids = [
            str(
                game.get("id")
            )
            for game in games
            if game.get("id")
        ]

        steam_appids = get_steam_appids(
            game_ids
        )

    except Exception as error:
        print(
            "Search error:",
            error
        )
        raise HTTPException(
            status_code=503,
            detail=
                "Spel kunde inte hämtas just nu. "
                "Kontrollera internetanslutningen "
                "och försök igen."
        )

    results = []

    for game in games:
        itad_id = str(
            game.get("id")
        )

        assets = game.get(
            "assets",
            {}
        )

        results.append({
            "id":
                itad_id,
            "steam_appid":
                steam_appids.get(
                    itad_id
                ),
            "title":
                game.get("title")
                or game.get("name")
                or "Okänt spel",
            "assets":
                assets
        })

    return {
        "games":
            results
    }


@app.get("/predict")
def prediction(
    title: str,
    game_id: str
):
    try:
        result = predict(
            title,
            game_id
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail=
                "Ett oväntat fel uppstod "
                "när spelet analyserades."
        )

    history = []

    for record in result.records:
        history.append({
            "date":
                record.date.isoformat(),
            "price":
                record.price,
            "regular":
                record.regular,
            "discount":
                record.discount
        })

    sales = []

    for event in result.events:
        sales.append({
            "date":
                event.date.isoformat(),
            "price":
                event.price,
            "regular":
                event.regular,
            "discount":
                event.discount
        })

    best_discount = None
    lowest_price = None
    lowest_price_date = None
    last_sale = None

    if result.events:
        best_discount = max(
            event.discount
            for event in result.events
        )
        last_sale = result.events[-1]

    if result.records:
        lowest_record = min(
            result.records,
            key=lambda record:
                record.price
        )

        lowest_price = (
            lowest_record.price
        )

        lowest_price_date = (
            lowest_record.date.isoformat()
        )

    return {
        "title":
            result.title,
        "current":
            result.current,
        "regular":
            result.regular,
        "currency":
            result.currency,
        "likely":
            result.likely,
        "confidence":
            result.conf,
        "confidence_label":
            result.conf_label,
        "probabilities":
            result.probs,
        "events":
            len(result.events),
        "history":
            history,
        "sales":
            sales,
        "backtest":
            result.backtest,
        "weights":
            result.weights,
        "next_start":
            result.next_start.isoformat()
            if result.next_start
            else None,
        "next_end":
            result.next_end.isoformat()
            if result.next_end
            else None,
        "best_discount":
            best_discount,
        "lowest_price":
            lowest_price,
        "lowest_price_date":
            lowest_price_date,
        "last_sale": {
            "date":
                last_sale.date.isoformat(),
            "price":
                last_sale.price,
            "discount":
                last_sale.discount
        }
        if last_sale
        else None
    }


@app.get("/proton-check")
def proton_check(
    appid: str
):
    try:
        result = check_proton(
            appid
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error)
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail=
                "Ett oväntat fel uppstod "
                "när ProtonDB kontrollerades."
        )

    return {
        "appid":
            result.appid,
        "status":
            result.status,
        "confidence":
            result.confidence,
        "score":
            result.score,
        "reports":
            result.reports,
        "trending":
            result.trending,
        "best_reported":
            result.best_reported,
        "protondb_url":
            result.protondb_url
    }


@app.get("/steam/library")
def steam_library():
    try:
        games = get_owned_games()

        return {
            "count":
                len(games),
            "games":
                games
        }

    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=
                f"Steam Library kunde inte hämtas: {error}"
        )


@app.get("/steam/game")
def steam_game(
    appid: str
):
    try:
        return get_game_details(
            appid
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error)
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail=
                "Ett oväntat fel uppstod "
                "när Steam-informationen hämtades."
        )


app.mount(
    "/static",
    StaticFiles(
        directory="frontend"
    ),
    name="static"
)


@app.exception_handler(404)
async def not_found(
    request: Request,
    exc
):
    if request.url.path.startswith(
        "/api"
    ):
        return JSONResponse(
            status_code=404,
            content={
                "detail":
                    "API-adressen kunde inte hittas."
            }
        )

    return FileResponse(
        "frontend/404.html",
        status_code=404
    )


@app.exception_handler(500)
async def server_error(
    request: Request,
    exc
):
    if request.url.path.startswith(
        "/api"
    ):
        return JSONResponse(
            status_code=500,
            content={
                "detail":
                    "Ett internt serverfel uppstod."
            }
        )

    return FileResponse(
        "frontend/error.html",
        status_code=500
    )
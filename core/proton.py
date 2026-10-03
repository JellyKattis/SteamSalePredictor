from dataclasses import dataclass

import requests


PROTONDB_URL = (
    "https://www.protondb.com/api/v1/reports/summaries/"
)


@dataclass
class ProtonCheck:
    appid: str
    status: str
    confidence: str
    score: float
    reports: int
    trending: str
    best_reported: str
    protondb_url: str


def check_proton(appid):

    if not appid:
        raise ValueError(
            "Steam AppID saknas."
        )

    appid = str(appid)

    url = (
        f"{PROTONDB_URL}"
        f"{appid}.json"
    )

    protondb_url = (
        f"https://www.protondb.com/app/{appid}"
    )

    try:

        response = requests.get(
            url,
            timeout=15,
            headers={
                "User-Agent":
                    "SteamSalePredictor/0.9"
            }
        )

    except requests.RequestException as error:

        raise RuntimeError(
            f"Kunde inte ansluta till ProtonDB: {error}"
        )


    if response.status_code == 404:

        return ProtonCheck(
            appid=appid,
            status="unknown",
            confidence="inadequate",
            score=0.0,
            reports=0,
            trending="unknown",
            best_reported="unknown",
            protondb_url=protondb_url,
        )


    if not response.ok:

        raise RuntimeError(
            "ProtonDB kunde inte hämta "
            f"kompatibilitetsdata "
            f"(HTTP {response.status_code})."
        )


    try:

        data = response.json()

    except ValueError:

        raise RuntimeError(
            "ProtonDB skickade ogiltig data."
        )


    status = (
        data.get("tier")
        or data.get("provisionalTier")
        or "unknown"
    )


    if status == "pending":

        status = (
            data.get("provisionalTier")
            or "unknown"
        )


    trending = (
        data.get("trendingTier")
        or data.get("trending_tier")
        or "unknown"
    )


    return ProtonCheck(
        appid=appid,

        status=status,

        confidence=(
            data.get("confidence")
            or "unknown"
        ),

        score=float(
            data.get("score") or 0
        ),

        reports=int(
            data.get("total") or 0
        ),

        trending=trending,

        best_reported=(
            data.get("bestReportedTier")
            or "unknown"
        ),

        protondb_url=protondb_url,
    )
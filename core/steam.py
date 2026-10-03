import os
from pathlib import Path

import requests
from dotenv import load_dotenv


load_dotenv()


STEAM_LIBRARY_FILE = (
    Path.home()
    / ".steam"
    / "steam"
    / "steamapps"
    / "libraryfolders.vdf"
)


IGNORED_APPIDS = {
    "1070560",
    "1391110",
    "1493710",
    "1628350",
    "228980",
    "4183110",
}


def _read_manifest(manifest):
    name = None
    installdir = None
    state = None

    text = manifest.read_text(
        encoding="utf-8",
        errors="ignore"
    )

    for line in text.splitlines():
        line = line.strip()

        if line.startswith('"name"'):
            parts = line.split('"')

            if len(parts) >= 4:
                name = parts[3]

        elif line.startswith('"installdir"'):
            parts = line.split('"')

            if len(parts) >= 4:
                installdir = parts[3]

        elif line.startswith('"StateFlags"'):
            parts = line.split('"')

            if len(parts) >= 4:
                state = parts[3]

    return name, installdir, state


def get_steam_libraries():
    libraries = []

    if not STEAM_LIBRARY_FILE.exists():
        return libraries

    text = STEAM_LIBRARY_FILE.read_text(
        encoding="utf-8",
        errors="ignore"
    )

    for line in text.splitlines():
        line = line.strip()

        if line.startswith('"path"'):
            parts = line.split('"')

            if len(parts) >= 4:
                path = parts[3]

                if path not in libraries:
                    libraries.append(path)

    return libraries


def _get_steam_app_details(appid):
    url = (
        "https://store.steampowered.com/api/appdetails"
        "?appids="
        + str(appid)
    )

    try:
        response = requests.get(
            url,
            timeout=15,
            headers={
                "User-Agent": "SteamSalePredictor/0.9"
            }
        )
    except requests.RequestException:
        return None

    if not response.ok:
        return None

    try:
        data = response.json()
    except ValueError:
        return None

    app_data = data.get(str(appid))

    if not isinstance(app_data, dict):
        return None

    if not app_data.get("success"):
        return None

    details = app_data.get("data")

    if not isinstance(details, dict):
        return None

    return details


def _get_fullgame_from_details(details):
    if not isinstance(details, dict):
        return None

    fullgame = details.get("fullgame")

    if not isinstance(fullgame, dict):
        return None

    appid = fullgame.get("appid")

    if not appid:
        return None

    return str(appid)


def get_installed_games():
    games = []

    for library in get_steam_libraries():
        steamapps = Path(library) / "steamapps"

        if not steamapps.exists():
            continue

        for manifest in steamapps.glob("appmanifest_*.acf"):
            appid = manifest.stem.replace(
                "appmanifest_",
                ""
            )

            if appid in IGNORED_APPIDS:
                continue

            name, installdir, state = _read_manifest(
                manifest
            )

            if not name:
                continue

            games.append(
                {
                    "appid": appid,
                    "name": name,
                    "library": library,
                    "installdir": installdir,
                    "state": state,
                }
            )

    games.sort(
        key=lambda game: game["name"].lower()
    )

    return games


def _get_owned_appids():
    api_key = os.getenv(
        "STEAM_API_KEY",
        ""
    ).strip()

    steam_id = os.getenv(
        "STEAM_ID",
        ""
    ).strip()

    if not api_key:
        raise RuntimeError(
            "STEAM_API_KEY saknas i .env"
        )

    if not steam_id:
        raise RuntimeError(
            "STEAM_ID saknas i .env"
        )

    url = (
        "https://api.steampowered.com/"
        "IPlayerService/GetOwnedGames/v0001/"
    )

    params = {
        "key": api_key,
        "steamid": steam_id,
        "format": "json",
        "include_appinfo": 1,
        "include_played_free_games": 1,
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=20
        )
    except requests.RequestException as error:
        raise RuntimeError(
            f"Kunde inte ansluta till Steam: {error}"
        )

    if not response.ok:
        raise RuntimeError(
            "Steam API kunde inte hämta "
            f"biblioteket (HTTP {response.status_code})."
        )

    try:
        data = response.json()
    except ValueError:
        raise RuntimeError(
            "Steam API skickade ogiltig data."
        )

    response_data = data.get(
        "response",
        {}
    )

    games = response_data.get(
        "games",
        []
    )

    return {
        str(game.get("appid"))
        for game in games
        if game.get("appid")
    }


def _get_owned_games_from_steam():
    api_key = os.getenv(
        "STEAM_API_KEY",
        ""
    ).strip()

    steam_id = os.getenv(
        "STEAM_ID",
        ""
    ).strip()

    if not api_key:
        raise RuntimeError(
            "STEAM_API_KEY saknas i .env"
        )

    if not steam_id:
        raise RuntimeError(
            "STEAM_ID saknas i .env"
        )

    url = (
        "https://api.steampowered.com/"
        "IPlayerService/GetOwnedGames/v0001/"
    )

    params = {
        "key": api_key,
        "steamid": steam_id,
        "format": "json",
        "include_appinfo": 1,
        "include_played_free_games": 1,
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=20
        )
    except requests.RequestException as error:
        raise RuntimeError(
            f"Kunde inte ansluta till Steam: {error}"
        )

    if not response.ok:
        raise RuntimeError(
            "Steam API kunde inte hämta "
            f"biblioteket (HTTP {response.status_code})."
        )

    try:
        data = response.json()
    except ValueError:
        raise RuntimeError(
            "Steam API skickade ogiltig data."
        )

    response_data = data.get(
        "response",
        {}
    )

    return response_data.get(
        "games",
        []
    )


def _create_installed_dlc(
    appid,
    name,
    library,
    installdir,
    state,
    metadata_cache
):
    appid = str(appid)

    if appid in metadata_cache:
        details = metadata_cache[appid]
    else:
        details = _get_steam_app_details(appid)
        metadata_cache[appid] = details

    if not details:
        return None

    if details.get("type") != "dlc":
        return None

    parent_appid = _get_fullgame_from_details(
        details
    )

    return {
        "appid": appid,
        "name": name,
        "library": library,
        "installdir": installdir,
        "state": state,
        "installed": True,
        "playtime_minutes": 0,
        "last_played": 0,
        "icon": None,
        "type": "dlc",
        "parent_appid": parent_appid,
    }


def get_owned_games():
    games = _get_owned_games_from_steam()

    installed_games = get_installed_games()

    installed_appids = {
        str(game["appid"])
        for game in installed_games
    }

    metadata_cache = {}

    result = []

    for game in games:
        appid = str(
            game.get("appid")
        )

        if appid in IGNORED_APPIDS:
            continue

        result.append(
            {
                "appid": appid,
                "name": game.get(
                    "name",
                    "Okänt spel"
                ),
                "installed": (
                    appid in installed_appids
                ),
                "playtime_minutes": game.get(
                    "playtime_forever",
                    0
                ),
                "last_played": game.get(
                    "rtime_last_played",
                    0
                ),
                "icon": game.get(
                    "img_icon_url"
                ),
                "type": "game",
                "parent_appid": None,
            }
        )

    installed_dlc = []

    for game in installed_games:
        appid = str(
            game["appid"]
        )

        if appid in IGNORED_APPIDS:
            continue

        if appid in {
            str(item["appid"])
            for item in result
        }:
            continue

        dlc = _create_installed_dlc(
            appid=appid,
            name=game["name"],
            library=game["library"],
            installdir=game["installdir"],
            state=game["state"],
            metadata_cache=metadata_cache,
        )

        if dlc:
            installed_dlc.append(dlc)

    result.extend(installed_dlc)

    result.sort(
        key=lambda game: (
            str(game.get("type", ""))
            != "game",
            str(
                game.get(
                    "name",
                    ""
                )
            ).lower()
        )
    )

    return result


def _get_dlc_for_game(appid):
    details = _get_steam_app_details(
        appid
    )

    if not details:
        return []

    dlc_ids = details.get(
        "dlc",
        []
    )

    if not isinstance(
        dlc_ids,
        list
    ):
        return []

    return [
        str(dlc_id)
        for dlc_id in dlc_ids
        if dlc_id
    ]


def add_app_metadata(games):
    owned_appids = {
        str(game["appid"])
        for game in games
    }

    metadata_cache = {}

    def get_details(appid):
        appid = str(appid)

        if appid not in metadata_cache:
            metadata_cache[appid] = (
                _get_steam_app_details(
                    appid
                )
            )

        return metadata_cache[appid]

    result = []

    for game in games:
        appid = str(
            game["appid"]
        )

        details = get_details(
            appid
        )

        if details:
            game["type"] = details.get(
                "type",
                "unknown"
            )
        else:
            game["type"] = "unknown"

        game["parent_appid"] = None

        result.append(game)

    parent_games = [
        game
        for game in result
        if game.get("type") == "game"
    ]

    known_appids = {
        str(game["appid"])
        for game in result
    }

    dlc_games = []

    for parent in parent_games:
        parent_appid = str(
            parent["appid"]
        )

        dlc_ids = _get_dlc_for_game(
            parent_appid
        )

        for dlc_appid in dlc_ids:
            if dlc_appid not in owned_appids:
                continue

            if dlc_appid in known_appids:
                continue

            dlc_details = get_details(
                dlc_appid
            )

            if not dlc_details:
                continue

            if dlc_details.get("type") != "dlc":
                continue

            dlc_game = {
                "appid": dlc_appid,
                "name": dlc_details.get(
                    "name",
                    "Okänd DLC"
                ),
                "library": None,
                "installdir": None,
                "state": None,
                "installed": False,
                "playtime_minutes": 0,
                "last_played": 0,
                "icon": None,
                "type": "dlc",
                "parent_appid": parent_appid,
            }

            dlc_games.append(
                dlc_game
            )

            known_appids.add(
                dlc_appid
            )

    result.extend(
        dlc_games
    )

    return result
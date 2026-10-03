const API = "";

const TARGET_CURRENCY = "SEK";


/* =====================================================
   ELEMENTS
===================================================== */

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const searchButtonText =
    document.getElementById("searchButtonText");

const searchButtonSpinner =
    document.getElementById("searchButtonSpinner");

const searchStatus =
    document.getElementById("searchStatus");

const resultsSection =
    document.getElementById("resultsSection");

const resultsGrid =
    document.getElementById("resultsGrid");

const loadingSection =
    document.getElementById("loadingSection");

const gameSection =
    document.getElementById("gameSection");

const errorSection =
    document.getElementById("errorSection");

const errorTitle =
    document.getElementById("errorTitle");

const errorMessage =
    document.getElementById("errorMessage");

const newSearchButton =
    document.getElementById("newSearchButton");

const gameTitle =
    document.getElementById("gameTitle");

const gameSubtitle =
    document.getElementById("gameSubtitle");

const gameHero =
    document.getElementById("gameHero");

const currentPrice =
    document.getElementById("currentPrice");

const regularPrice =
    document.getElementById("regularPrice");

const likelyDiscount =
    document.getElementById("likelyDiscount");

const predictedPrice =
    document.getElementById("predictedPrice");

const nextSale =
    document.getElementById("nextSale");

const nextSaleText =
    document.getElementById("nextSaleText");

const confidence =
    document.getElementById("confidence");

const confidenceLabel =
    document.getElementById("confidenceLabel");

const bestDiscount =
    document.getElementById("bestDiscount");

const lowestPrice =
    document.getElementById("lowestPrice");

const lastSale =
    document.getElementById("lastSale");

const saleCount =
    document.getElementById("saleCount");

const probabilityList =
    document.getElementById("probabilityList");

const modelScore =
    document.getElementById("modelScore");

const steamLibrarySection =
    document.getElementById("steamLibrarySection");

const steamLibraryGrid =
    document.getElementById("steamLibraryGrid");

const steamLibraryCount =
    document.getElementById("steamLibraryCount");


/* =====================================================
   PROTONDB ELEMENTS
===================================================== */

const protonSection =
    document.getElementById("protonSection");

const protonLoading =
    document.getElementById("protonLoading");

const protonContent =
    document.getElementById("protonContent");

const protonEmpty =
    document.getElementById("protonEmpty");

const protonStatus =
    document.getElementById("protonStatus");

const protonConfidence =
    document.getElementById("protonConfidence");

const protonScore =
    document.getElementById("protonScore");

const protonReports =
    document.getElementById("protonReports");

const protonTrending =
    document.getElementById("protonTrending");

const protonBest =
    document.getElementById("protonBest");

const protonDBLink =
    document.getElementById("protonDBLink");


let priceChart = null;


/* =====================================================
   STEAM LIBRARY
===================================================== */

let steamLibrary = new Map();


async function loadSteamLibrary() {

    if (
        !steamLibraryCount ||
        !steamLibraryGrid
    ) {
        console.warn(
            "Steam Library HTML-element saknas."
        );

        return;
    }

    steamLibraryCount.textContent =
        "Läser bibliotek...";

    try {

        const response =
            await fetch(
                `${API}/steam/library`
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        steamLibrary =
            new Map(
                (data.games || []).map(
                    game => [
                        String(game.appid),
                        game
                    ]
                )
            );

        console.log(
            "Steam Library laddad:",
            steamLibrary.size,
            "spel"
        );

        renderSteamLibrary();

    }
    catch (error) {

        console.error(
            "Kunde inte läsa Steam Library:",
            error
        );

        steamLibrary =
            new Map();

        steamLibraryCount.textContent =
            "Kunde inte läsa biblioteket";

        steamLibraryGrid.innerHTML = `
            <div class="steam-library-empty">
                Steam-biblioteket kunde inte läsas.
            </div>
        `;
    }
}


/* =====================================================
   STEAM LIBRARY VISIBILITY
===================================================== */

function hideSteamLibrary() {

    if (!steamLibrarySection) {
        return;
    }

    steamLibrarySection.classList.add(
        "hidden"
    );
}


function showSteamLibrary() {

    if (!steamLibrarySection) {
        return;
    }

    steamLibrarySection.classList.remove(
        "hidden"
    );
}


/* =====================================================
   STEAM LIBRARY MATCHING
===================================================== */

function isGameInstalled(game) {

    if (
        !game ||
        game.steam_appid === undefined ||
        game.steam_appid === null
    ) {
        return false;
    }

    return steamLibrary.has(
        String(game.steam_appid)
    );
}


function getInstalledGame(game) {

    if (
        !game ||
        game.steam_appid === undefined ||
        game.steam_appid === null
    ) {
        return null;
    }

    return (
        steamLibrary.get(
            String(game.steam_appid)
        ) || null
    );
}


/* =====================================================
   STEAM LIBRARY STATUS
===================================================== */

function getSteamLibraryStatus(game) {

    if (!game) {

        return {
            className: "not-installed",
            text: "🔴 EJ INSTALLERAD"
        };
    }


    const type =
        String(
            game.type || "game"
        ).toLowerCase();


    /*
     * DLC har alltid blå status.
     *
     * Backend behöver skicka:
     * type: "dlc"
     */
    if (type === "dlc") {

        return {
            className: "dlc",
            text: "🔵 DLC"
        };
    }


    /*
     * Ägt men inte installerat.
     */
    if (!game.installed) {

        return {
            className: "not-installed",
            text: "🔴 EJ INSTALLERAD"
        };
    }


    /*
     * last_played kommer från Steam API
     * och anges som Unix timestamp.
     */
    const lastPlayed =
        Number(
            game.last_played || 0
        );


    if (
        Number.isFinite(lastPlayed) &&
        lastPlayed > 0
    ) {

        const now =
            Date.now() / 1000;

        const daysSinceLastPlayed =
            (
                now -
                lastPlayed
            ) / 86400;


        /*
         * Spelat inom de senaste 30 dagarna.
         */
        if (
            daysSinceLastPlayed >= 0 &&
            daysSinceLastPlayed < 30
        ) {

            return {
                className: "recent",
                text: "🟢 SPELAD NYLIGEN"
            };
        }
    }


    /*
     * Installerad men inte spelad nyligen.
     */
    return {
        className: "installed",
        text: "🟡 INSTALLERAD"
    };
}


/* =====================================================
   OPEN GAME FROM STEAM LIBRARY
===================================================== */

async function openLibraryGame(
    libraryGame
) {

    if (
        !libraryGame ||
        !libraryGame.appid
    ) {
        return;
    }

    hideError();

    hideSteamLibrary();

    loadingSection.classList.remove(
        "hidden"
    );

    gameSection.classList.add(
        "hidden"
    );

    resultsSection.classList.add(
        "hidden"
    );

    loadingSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });


    try {

        searchStatus.textContent =
            `Hämtar analys för ${libraryGame.name}...`;


        const data =
            await fetchJSON(
                `${API}/search?query=${encodeURIComponent(libraryGame.name)}`
            );


        if (
            !data.games ||
            data.games.length === 0
        ) {

            throw new Error(
                "Spelet hittades inte i prisdatabasen."
            );
        }


        let matchingGame =
            data.games.find(
                game =>
                    game.steam_appid &&
                    String(game.steam_appid) ===
                        String(libraryGame.appid)
            );


        if (!matchingGame) {

            matchingGame =
                data.games.find(
                    game =>
                        String(
                            game.title || ""
                        ).toLowerCase() ===
                        String(
                            libraryGame.name || ""
                        ).toLowerCase()
                );
        }


        if (!matchingGame) {

            matchingGame =
                data.games[0];
        }


        await analyzeGame(
            matchingGame
        );

    }
    catch (error) {

        loadingSection.classList.add(
            "hidden"
        );

        showError(
            "Kunde inte öppna spelet",
            error.message
        );
    }
    finally {

        searchStatus.textContent =
            "";
    }
}


/* =====================================================
   HELPERS
===================================================== */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function formatPrice(
    value,
    currency = "SEK"
) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(
            Number(value)
        )
    ) {
        return "–";
    }

    return new Intl.NumberFormat(
        "sv-SE",
        {
            style: "currency",
            currency,
            maximumFractionDigits: 2
        }
    ).format(
        Number(value)
    );
}


function formatDate(value) {

    if (!value) {
        return "–";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "sv-SE",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    ).format(date);
}


function formatDateRange(
    start,
    end
) {

    if (!start) {
        return "–";
    }

    if (!end) {
        return formatDate(start);
    }

    return (
        formatDate(start)
        + " – "
        + formatDate(end)
    );
}


/* =====================================================
   PROTONDB HELPERS
===================================================== */

function formatProtonTier(
    tier
) {

    if (!tier) {
        return "Okänd";
    }

    const normalized =
        String(tier)
            .trim()
            .toLowerCase();

    const names = {
        platinum: "Platinum",
        gold: "Gold",
        silver: "Silver",
        bronze: "Bronze",
        borked: "Borked",
        pending: "Pending",
        unknown: "Okänd",
        native: "Native"
    };

    return (
        names[normalized] ||
        tier
    );
}


function formatProtonConfidence(
    value
) {

    if (!value) {
        return "Okänd säkerhet";
    }

    const normalized =
        String(value)
            .trim()
            .toLowerCase();

    const names = {
        strong: "Stark datamängd",
        good: "Bra datamängd",
        weak: "Svag datamängd",
        inadequate: "Otillräcklig datamängd",
        unknown: "Okänd säkerhet"
    };

    return (
        names[normalized] ||
        value
    );
}


function formatProtonScore(
    value
) {

    const score =
        Number(value);

    if (
        !Number.isFinite(
            score
        )
    ) {
        return "–";
    }

    return score.toFixed(2);
}


/* =====================================================
   PROTONDB RESET
===================================================== */

function resetProtonPanel() {

    if (!protonSection) {
        return;
    }

    protonLoading.classList.remove(
        "hidden"
    );

    protonContent.classList.add(
        "hidden"
    );

    protonEmpty.classList.add(
        "hidden"
    );

    protonStatus.textContent =
        "–";

    protonConfidence.textContent =
        "–";

    protonScore.textContent =
        "–";

    protonReports.textContent =
        "–";

    protonTrending.textContent =
        "–";

    protonBest.textContent =
        "–";

    protonDBLink.classList.add(
        "hidden"
    );

    protonDBLink.href =
        "#";
}


/* =====================================================
   PROTONDB RENDER
===================================================== */

function renderProtonCheck(
    data
) {

    if (!protonSection) {
        return;
    }

    protonLoading.classList.add(
        "hidden"
    );

    if (
        !data ||
        !data.status
    ) {

        protonContent.classList.add(
            "hidden"
        );

        protonEmpty.classList.remove(
            "hidden"
        );

        return;
    }


    protonContent.classList.remove(
        "hidden"
    );

    protonEmpty.classList.add(
        "hidden"
    );


    protonStatus.textContent =
        formatProtonTier(
            data.status
        );


    protonConfidence.textContent =
        formatProtonConfidence(
            data.confidence
        );


    protonScore.textContent =
        formatProtonScore(
            data.score
        );


    protonReports.textContent =
        Number.isFinite(
            Number(data.reports)
        )
            ? Number(data.reports).toLocaleString(
                "sv-SE"
            )
            : "–";


    protonTrending.textContent =
        formatProtonTier(
            data.trending
        );


    protonBest.textContent =
        formatProtonTier(
            data.best_reported
        );


    if (
        data.protondb_url
    ) {

        protonDBLink.href =
            data.protondb_url;

        protonDBLink.classList.remove(
            "hidden"
        );
    }
}


/* =====================================================
   PROTONDB LOAD
===================================================== */

async function loadProtonCheck(
    game
) {

    resetProtonPanel();


    if (
        !game ||
        !game.steam_appid
    ) {

        protonLoading.classList.add(
            "hidden"
        );

        protonEmpty.classList.remove(
            "hidden"
        );

        return;
    }


    try {

        const data =
            await fetchJSON(
                `${API}/proton-check?appid=${encodeURIComponent(game.steam_appid)}`
            );


        renderProtonCheck(
            data
        );

    }
    catch (error) {

        console.warn(
            "ProtonDB kunde inte hämtas:",
            error
        );

        protonLoading.classList.add(
            "hidden"
        );

        protonContent.classList.add(
            "hidden"
        );

        protonEmpty.classList.remove(
            "hidden"
        );
    }
}


/* =====================================================
   GAME IMAGE
===================================================== */

function getGameImage(game) {

    const assets =
        game?.assets;

    if (!assets) {
        return null;
    }

    if (
        typeof assets.banner600 === "string" &&
        /^https?:\/\//i.test(
            assets.banner600
        )
    ) {
        return assets.banner600;
    }

    if (
        typeof assets.banner400 === "string" &&
        /^https?:\/\//i.test(
            assets.banner400
        )
    ) {
        return assets.banner400;
    }

    if (
        typeof assets.banner300 === "string" &&
        /^https?:\/\//i.test(
            assets.banner300
        )
    ) {
        return assets.banner300;
    }

    if (
        typeof assets.boxart === "string" &&
        /^https?:\/\//i.test(
            assets.boxart
        )
    ) {
        return assets.boxart;
    }


    function findImage(value) {

        if (!value) {
            return null;
        }

        if (
            typeof value === "string" &&
            /^https?:\/\//i.test(
                value
            )
        ) {
            return value;
        }

        if (
            typeof value === "object"
        ) {

            for (
                const key of Object.keys(value)
            ) {

                const result =
                    findImage(
                        value[key]
                    );

                if (result) {
                    return result;
                }
            }
        }

        return null;
    }


    return findImage(
        assets
    );
}


/* =====================================================
   GAME HERO IMAGE
===================================================== */

function setGameHeroImage(
    image
) {

    if (
        !gameHero ||
        !image
    ) {
        return;
    }

    const safeImage =
        image.replaceAll(
            '"',
            '\\"'
        );

    gameHero.style.setProperty(
        "--game-image",
        `url("${safeImage}")`
    );
}


/* =====================================================
   ERROR HANDLING
===================================================== */

function showError(
    title,
    message
) {

    errorTitle.textContent =
        title ||
        "Något gick fel";

    errorMessage.textContent =
        message ||
        "Försök igen.";

    errorSection.classList.remove(
        "hidden"
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function hideError() {

    errorSection.classList.add(
        "hidden"
    );
}


async function fetchJSON(
    url
) {

    let response;

    try {

        response =
            await fetch(
                url
            );

    }
    catch (error) {

        throw new Error(
            "Kunde inte ansluta till servern."
        );
    }

    let data = null;

    try {

        data =
            await response.json();

    }
    catch {

        data = null;
    }

    if (!response.ok) {

        throw new Error(
            data?.detail ||
            "Servern kunde inte slutföra begäran."
        );
    }

    return data;
}


/* =====================================================
   SEARCH BUTTON STATE
===================================================== */

function setSearchLoading(
    loading
) {

    searchButton.disabled =
        loading;

    if (loading) {

        searchButtonText.classList.add(
            "hidden"
        );

        searchButtonSpinner.classList.remove(
            "hidden"
        );

    }
    else {

        searchButtonText.classList.remove(
            "hidden"
        );

        searchButtonSpinner.classList.add(
            "hidden"
        );
    }
}


/* =====================================================
   STEAM LIBRARY RENDERING
===================================================== */

function renderSteamLibrary() {

    if (
        !steamLibraryGrid ||
        !steamLibraryCount
    ) {
        return;
    }


    const games =
        Array.from(
            steamLibrary.values()
        ).sort(
            (a, b) =>
                String(a.name || "")
                    .localeCompare(
                        String(b.name || ""),
                        "sv"
                    )
        );


    steamLibraryCount.textContent =
        `${games.length} spel i biblioteket`;


    if (games.length === 0) {

        steamLibraryGrid.innerHTML = `
            <div class="steam-library-empty">
                Inga Steam-spel hittades.
            </div>
        `;

        return;
    }


    steamLibraryGrid.innerHTML =
        games.map(
            game => {

                const status =
                    getSteamLibraryStatus(
                        game
                    );


                return `
                    <button
                        type="button"
                        class="steam-library-card"
                        data-steam-appid="${escapeHTML(game.appid)}"
                    >

                        <h3>
                            ${escapeHTML(
                                game.name ||
                                "Okänt spel"
                            )}
                        </h3>


                        <span class="${status.className}">
                            ${status.text}
                        </span>


                        <span class="steam-library-card-arrow">
                            →
                        </span>

                    </button>
                `;
            }
        )
        .join("");


    steamLibraryGrid
        .querySelectorAll(
            ".steam-library-card"
        )
        .forEach(
            card => {

                card.addEventListener(
                    "click",
                    () => {

                        const appid =
                            card.dataset.steam_appid ||
                            card.dataset.steamAppid;


                        const libraryGame =
                            steamLibrary.get(
                                String(appid)
                            );


                        if (!libraryGame) {
                            return;
                        }


                        openLibraryGame(
                            libraryGame
                        );
                    }
                );
            }
        );
}


/* =====================================================
   SEARCH
===================================================== */

async function searchGames() {

    const query =
        searchInput.value.trim();

    hideError();

    if (!query) {

        searchStatus.textContent =
            "Skriv namnet på ett spel först.";

        return;
    }

    setSearchLoading(
        true
    );

    searchStatus.textContent =
        "Söker...";

    resultsGrid.innerHTML =
        "";

    resultsSection.classList.add(
        "hidden"
    );

    gameSection.classList.add(
        "hidden"
    );


    try {

        const data =
            await fetchJSON(
                `${API}/search?query=${encodeURIComponent(query)}`
            );


        if (
            !data.games ||
            data.games.length === 0
        ) {

            showError(
                "Inga spel hittades",
                `Vi kunde inte hitta något spel som matchar "${query}".`
            );

            searchStatus.textContent =
                "";

            return;
        }


        renderSearchResults(
            data.games
        );

        searchStatus.textContent =
            `${data.games.length} resultat hittades.`;

    }
    catch (error) {

        showError(
            "Kunde inte söka",
            error.message
        );

        searchStatus.textContent =
            "";

    }
    finally {

        setSearchLoading(
            false
        );
    }
}


/* =====================================================
   SEARCH RESULTS
===================================================== */

function renderSearchResults(
    games
) {

    resultsGrid.innerHTML =
        "";


    games.forEach(
        game => {

            const card =
                document.createElement(
                    "button"
                );

            card.type =
                "button";

            card.className =
                "game-result-card";


            const image =
                getGameImage(
                    game
                );


            if (image) {

                card.style.backgroundImage =
                    `url("${image.replaceAll('"', '\\"')}")`;
            }


            const installed =
                isGameInstalled(
                    game
                );


            const installedBadge =
                installed
                    ? `
                        <span class="game-library-status">
                            ✓ INSTALLERAD
                        </span>
                    `
                    : `
                        <span class="game-library-status not-installed">
                            INTE I BIBLIOTEKET
                        </span>
                    `;


            card.innerHTML = `
                <div class="game-result-overlay">

                    <div>

                        <span class="game-result-small">
                            STEAM
                        </span>

                        <h3>
                            ${escapeHTML(
                                game.title
                            )}
                        </h3>

                        ${installedBadge}

                    </div>

                    <span class="game-result-arrow">
                        →
                    </span>

                </div>
            `;


            card.addEventListener(
                "click",
                () => {

                    analyzeGame(
                        game
                    );
                }
            );


            resultsGrid.appendChild(
                card
            );
        }
    );


    resultsSection.classList.remove(
        "hidden"
    );

    resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =====================================================
   ANALYZE GAME
===================================================== */

async function analyzeGame(
    game
) {

    hideError();

    /*
     * När ett spel analyseras ska
     * Steam-biblioteket inte längre
     * ligga kvar på sidan.
     */
    hideSteamLibrary();

    resultsSection.classList.add(
        "hidden"
    );

    gameSection.classList.add(
        "hidden"
    );

    loadingSection.classList.remove(
        "hidden"
    );

    loadingSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });


    try {

        const data =
            await fetchJSON(
                `${API}/predict?title=${encodeURIComponent(game.title)}&game_id=${encodeURIComponent(game.id)}`
            );


        await loadExchangeRate(
            data
        );


        const image =
            getGameImage(
                game
            );


        if (image) {

            setGameHeroImage(
                image
            );
        }


        renderPrediction(
            data
        );


        loadingSection.classList.add(
            "hidden"
        );

        gameSection.classList.remove(
            "hidden"
        );


        gameSection.scrollIntoView({
            behavior:
                "smooth",
            block:
                "start"
        });


        /*
         * ProtonDB laddas efter att
         * själva analysen har visats.
         *
         * Detta fungerar även för spel
         * som inte är installerade.
         */

        loadProtonCheck(
            game
        );

    }
    catch (error) {

        loadingSection.classList.add(
            "hidden"
        );

        showError(
            "Analysen kunde inte slutföras",
            error.message
        );
    }
}


/* =====================================================
   EXCHANGE RATE
===================================================== */

async function loadExchangeRate(
    data
) {

    if (
        !data.current &&
        !data.regular
    ) {
        return;
    }


    if (
        !data.currency ||
        data.currency === TARGET_CURRENCY
    ) {
        return;
    }


    try {

        const rateData =
            await fetchJSON(
                `${API}/exchange-rate?base=${encodeURIComponent(data.currency)}&target=${TARGET_CURRENCY}`
            );


        const rate =
            Number(
                rateData.rate
            );


        if (
            !Number.isFinite(
                rate
            )
        ) {
            return;
        }


        if (
            data.current !== null
        ) {

            data.current =
                Number(data.current) *
                rate;
        }


        if (
            data.regular !== null
        ) {

            data.regular =
                Number(data.regular) *
                rate;
        }


        if (
            data.lowest_price !== null &&
            data.lowest_price !== undefined
        ) {

            data.lowest_price =
                Number(data.lowest_price) *
                rate;
        }


        data.currency =
            TARGET_CURRENCY;

    }
    catch {

        /* Fortsätt med originalvalutan. */

    }
}


/* =====================================================
   RENDER PREDICTION
===================================================== */

function renderPrediction(
    data
) {

    gameTitle.textContent =
        data.title ||
        "Okänt spel";


    gameSubtitle.textContent =
        `${data.events || 0} identifierade rea-händelser`;


    currentPrice.textContent =
        formatPrice(
            data.current,
            data.currency
        );


    if (
        data.regular !== null &&
        data.regular !== undefined
    ) {

        regularPrice.textContent =
            `Ordinarie pris: ${formatPrice(data.regular, data.currency)}`;

    }
    else {

        regularPrice.textContent =
            "Ordinarie pris saknas";
    }


    likelyDiscount.textContent =
        data.likely !== null
            ? `${data.likely}%`
            : "–";


    if (
        data.regular !== null &&
        data.likely !== null
    ) {

        const predicted =
            Number(data.regular) *
            (
                1 -
                Number(data.likely) / 100
            );


        predictedPrice.textContent =
            `Prognostiserat pris: ${formatPrice(predicted, data.currency)}`;

    }
    else {

        predictedPrice.textContent =
            "Pris kunde inte beräknas";
    }


    nextSale.textContent =
        formatDateRange(
            data.next_start,
            data.next_end
        );


    confidence.textContent =
        data.confidence !== null
            ? `${data.confidence}%`
            : "–";


    confidenceLabel.textContent =
        data.confidence_label ||
        "Ingen bedömning";


    modelScore.textContent =
        data.confidence !== null
            ? `${data.confidence}%`
            : "–";


    bestDiscount.textContent =
        data.best_discount !== null &&
        data.best_discount !== undefined
            ? `${data.best_discount}%`
            : "–";


    lowestPrice.textContent =
        data.lowest_price !== null &&
        data.lowest_price !== undefined
            ? formatPrice(
                data.lowest_price,
                data.currency
            )
            : "–";


    if (
        data.last_sale &&
        data.last_sale.date
    ) {

        lastSale.textContent =
            formatDate(
                data.last_sale.date
            );

    }
    else {

        lastSale.textContent =
            "–";
    }


    saleCount.textContent =
        data.events ?? "–";


    renderProbabilities(
        data
    );

    renderChart(
        data
    );
}


/* =====================================================
   PROBABILITIES
===================================================== */

function renderProbabilities(
    data
) {

    probabilityList.innerHTML =
        "";


    if (
        !data.probabilities
    ) {

        probabilityList.innerHTML = `
            <div class="empty-state">
                Ingen prognosdata finns.
            </div>
        `;

        return;
    }


    const entries =
        Object.entries(
            data.probabilities
        )
        .sort(
            (
                a,
                b
            ) =>
                Number(b[1])
                -
                Number(a[1])
        );


    entries.forEach(
        ([discount, probability]) => {

            const value =
                Number(
                    probability
                );


            const percentage =
                Math.max(
                    0,
                    Math.min(
                        100,
                        value * 100
                    )
                );


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "probability-row";


            row.innerHTML = `
                <div class="probability-top">

                    <span>
                        ${escapeHTML(discount)}% rabatt
                    </span>

                    <strong>
                        ${percentage.toFixed(1)}%
                    </strong>

                </div>

                <div class="probability-bar">

                    <div
                        class="probability-fill"
                        style="width:${percentage}%"
                    ></div>

                </div>
            `;


            probabilityList.appendChild(
                row
            );
        }
    );
}


/* =====================================================
   CHART
===================================================== */

function renderChart(
    data
) {

    const canvas =
        document.getElementById(
            "priceChart"
        );


    if (!canvas) {
        return;
    }


    if (priceChart) {

        priceChart.destroy();

        priceChart = null;
    }


    const history =
        data.history || [];


    if (
        history.length === 0
    ) {
        return;
    }


    const labels =
        history.map(
            item =>
                formatDate(
                    item.date
                )
        );


    const prices =
        history.map(
            item =>
                Number(
                    item.price
                )
        );


    const regular =
        history.map(
            item =>
                Number(
                    item.regular
                )
        );


    const salePrices =
        history.map(
            item =>
                item.discount > 0
                    ? Number(item.price)
                    : null
        );


    priceChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Pris",

                            data:
                                prices,

                            tension:
                                0.25,

                            borderWidth:
                                2,

                            pointRadius:
                                3
                        },

                        {
                            label:
                                "Ordinarie pris",

                            data:
                                regular,

                            tension:
                                0.25,

                            borderWidth:
                                1,

                            pointRadius:
                                0
                        },

                        {
                            label:
                                "Reapris",

                            data:
                                salePrices,

                            tension:
                                0.25,

                            borderWidth:
                                3,

                            pointRadius:
                                4
                        }
                    ]
                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false
                    },


                    plugins: {

                        legend: {

                            labels: {

                                color:
                                    "#d6d7d8"
                            }
                        }
                    },


                    scales: {

                        x: {

                            ticks: {

                                color:
                                    "#8f98a0",

                                maxRotation:
                                    45
                            },


                            grid: {

                                color:
                                    "rgba(255,255,255,.05)"
                            }
                        },


                        y: {

                            ticks: {

                                color:
                                    "#8f98a0",

                                callback:
                                    value =>
                                        formatPrice(
                                            value,
                                            data.currency
                                        )
                            },


                            grid: {

                                color:
                                    "rgba(255,255,255,.05)"
                            }
                        }
                    }
                }
            }
        );
}


/* =====================================================
   NEW SEARCH
===================================================== */

function resetSearch() {

    gameSection.classList.add(
        "hidden"
    );

    resultsSection.classList.add(
        "hidden"
    );

    loadingSection.classList.add(
        "hidden"
    );

    hideError();


    resetProtonPanel();

    showSteamLibrary();


    searchInput.value =
        "";


    searchStatus.textContent =
        "";


    searchInput.focus();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =====================================================
   EVENTS
===================================================== */

searchButton.addEventListener(
    "click",
    searchGames
);


newSearchButton.addEventListener(
    "click",
    resetSearch
);


searchInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            searchGames();
        }
    }
);


/* =====================================================
   INITIALIZATION
===================================================== */

loadSteamLibrary();


/* =====================================================
   STEAM SALE PREDICTOR
   v0.95
===================================================== */
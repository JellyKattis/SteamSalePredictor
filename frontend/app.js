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

let priceChart = null;


/* =====================================================
   HELPERS
===================================================== */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatPrice(
    value,
    currency = "SEK"
) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
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
    ).format(Number(value));
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


function getGameImage(game) {

    const assets =
        game?.assets;


    if (!assets) {
        return null;
    }


    function findImage(
        value
    ) {

        if (!value) {
            return null;
        }


        if (
            typeof value === "string" &&
            /^https?:\/\//i.test(value)
        ) {
            return value;
        }


        if (
            typeof value === "object"
        ) {

            for (
                const key
                of Object.keys(value)
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
            await fetch(url);

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


            card.innerHTML = `

                <div class="game-result-overlay">

                    <div>

                        <span class="game-result-small">
                            STEAM
                        </span>

                        <h3>
                            ${escapeHTML(game.title)}
                        </h3>

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
            behavior: "smooth",
            block: "start"
        });


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
            Number(rateData.rate);


        if (
            !Number.isFinite(rate)
        ) {
            return;
        }


        if (data.current !== null) {

            data.current =
                Number(data.current) * rate;

        }


        if (data.regular !== null) {

            data.regular =
                Number(data.regular) * rate;

        }


        if (
            data.lowest_price !== null &&
            data.lowest_price !== undefined
        ) {

            data.lowest_price =
                Number(data.lowest_price) * rate;

        }


        data.currency =
            TARGET_CURRENCY;


    }

    catch {

        // Om valuta-API:t inte fungerar
        // fortsätter sidan med originalvalutan.

    }

}


/* =====================================================
   RENDER PREDICTION
===================================================== */

function renderPrediction(
    data
) {

    gameTitle.textContent =
        data.title || "Okänt spel";


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
            Number(data.regular)
            *
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
                Number(probability);


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
                Number(item.price)
        );


    const regular =
        history.map(
            item =>
                Number(item.regular)
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
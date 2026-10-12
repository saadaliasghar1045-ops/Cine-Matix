"use strict";

/* =========================================
   CINEMATIX — FIND MOVIES
========================================= */

// Change this URL if you deploy your FastAPI backend.
const API_BASE_URL = "http://127.0.0.1:8000";

const MATCH_TITLE_URL = `${API_BASE_URL}/match_title`;
const RECOMMEND_URL = `${API_BASE_URL}/recommend`;

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TITLE_DEBOUNCE_MS = 350;

// DOM elements
const searchForm = document.getElementById("movie-search-form");
const modeButtons = document.querySelectorAll(".mode-button");

const descriptionField = document.getElementById("description-field");
const descriptionInput = document.getElementById("description-input");
const descriptionCounter = document.getElementById("description-counter");

const titleField = document.getElementById("title-field");
const titleInput = document.getElementById("title-input");
const titleSuggestions = document.getElementById("title-suggestions");
const clearTitleButton = document.getElementById("clear-title");
const selectedTitleNote = document.getElementById("selected-title-note");
const selectedTitleText = document.getElementById("selected-title-text");

const recommendationCount = document.getElementById("recommendation-count");
const yearFilter = document.getElementById("year-filter");

const searchSubmit = document.getElementById("search-submit");
const submitLabel = document.getElementById("submit-label");

const searchWelcome = document.getElementById("search-welcome");
const resultsSection = document.getElementById("recommendation-results");
const resultsHeading = document.getElementById("results-heading");
const resultsSummary = document.getElementById("results-summary");
const resultsCount = document.getElementById("results-count");
const resultsStatus = document.getElementById("results-status");
const movieResultsGrid = document.getElementById("movie-results-grid");

const exploreButton = document.createElement("button");


// Application state
let currentMode = "description";
let selectedTitle = null;
let debounceTimer = null;
let matchRequestController = null;
let recommendationRequestController = null;
let matchRequestNumber = 0;


/* =========================================
   HELPERS
========================================= */

function setStatus(message) {
    resultsStatus.textContent = message;
}

function setLoading(isLoading, label = "Find Movies") {
    searchSubmit.disabled = isLoading;
    submitLabel.textContent = isLoading ? "Finding Movies..." : label;
}

async function postJSON(url, body, signal) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        signal
    });

    if (!response.ok) {
        let detail = "";

        try {
            const errorData = await response.json();
            detail = errorData.detail
                ? `: ${typeof errorData.detail === "string"
                    ? errorData.detail
                    : JSON.stringify(errorData.detail)}`
                : "";
        } catch {
            // The response may not contain JSON.
        }

        throw new Error(
            `Request failed (${response.status})${detail}`
        );
    }

    return response.json();
}

function getMovieTitle(movie) {
    if (typeof movie === "string") {
        return movie;
    }

    return (
        movie.title ??
        movie.movie_title ??
        movie.name ??
        "Untitled Movie"
    );
}

function getMovieYear(movie) {
    const rawYear =
        movie.year ??
        movie.release_year ??
        movie.release_date ??
        movie.releaseDate;

    if (rawYear === null || rawYear === undefined || rawYear === "") {
        return "";
    }

    const match = String(rawYear).match(/\b(18|19|20|21)\d{2}\b/);
    return match ? match[0] : "";
}

function getMovieGenres(movie) {
    const rawGenres = movie.genres ?? movie.genre ?? "";

    if (Array.isArray(rawGenres)) {
        return rawGenres
            .map(genre => {
                if (typeof genre === "string") return genre;
                return genre?.name ?? "";
            })
            .filter(Boolean);
    }

    if (typeof rawGenres === "string") {
        return rawGenres
            .split(/[|,]/)
            .map(genre => genre.trim())
            .filter(Boolean);
    }

    return [];
}

function getMovieOverview(movie) {
    return (
        movie.overview ??
        movie.description ??
        movie.plot ??
        ""
    );
}

/*
 * Accepts full image URLs or TMDB-style relative poster paths.
 * A tmdbId by itself is not an image path, so it is not used here.
 */
function getPosterURL(movie) {
    const possiblePoster =
        movie.poster_url ??
        movie.posterUrl ??
        movie.poster_path ??
        movie.poster ??
        movie.image_url ??
        movie.image;

    if (typeof possiblePoster !== "string" || !possiblePoster.trim()) {
        return "";
    }

    const poster = possiblePoster.trim();

    if (/^https?:\/\//i.test(poster)) {
        return poster;
    }

    if (poster.startsWith("/")) {
        return `${TMDB_IMAGE_BASE}${poster}`;
    }

    return "";
}

/*
 * Your pipeline returns cosine similarity in similarity_score.
 * This displays that score as a percentage; it is NOT a probability
 * that the viewer will enjoy the movie.
 */
function getMatchPercentage(movie) {
    const score = Number(movie.similarity_score);

    if (!Number.isFinite(score)) {
        return null;
    }

    return Math.round(Math.max(0, Math.min(1, score)) * 100);
}

function hideSuggestions() {
    titleSuggestions.hidden = true;
    titleInput.setAttribute("aria-expanded", "false");
}

function clearSelectedTitle() {
    selectedTitle = null;
    selectedTitleNote.hidden = true;
    selectedTitleText.textContent = "";
}

function clearRecommendations() {
    movieResultsGrid.replaceChildren();
    resultsCount.textContent = "";
    resultsSummary.textContent = "";
    setStatus("");
    resultsSection.hidden = true;
}

function showError(message) {
    resultsSection.hidden = false;
    movieResultsGrid.replaceChildren();
    resultsCount.textContent = "";
    setStatus(message);
}


/* =========================================
   SEARCH MODE
========================================= */



/* =========================================
   SEARCH MODE
========================================= */

function setMode(mode) {
    if (mode !== "description" && mode !== "title") {
        console.error("Invalid search mode:", mode);
        return;
    }

    currentMode = mode;

    // Update the selected button.
    modeButtons.forEach(button => {
        const active = button.dataset.mode === mode;

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });

    // Show only the selected search field.
    descriptionField.hidden = mode !== "description";
    titleField.hidden = mode !== "title";

    // Only the active field is required.
    descriptionInput.required = mode === "description";
    titleInput.required = mode === "title";

    // Clear old validation errors.
    descriptionInput.setCustomValidity("");
    titleInput.setCustomValidity("");

    // Cancel pending title searches.
    clearTimeout(debounceTimer);
    matchRequestNumber++;

    if (matchRequestController) {
        matchRequestController.abort();
        matchRequestController = null;
    }

    hideSuggestions();
    clearSelectedTitle();
    clearRecommendations();

    // Update the submit button label.
    submitLabel.textContent =
        mode === "description"
            ? "Find Movies"
            : "Find Similar Movies";
}

// IMPORTANT: This listener must be OUTSIDE setMode().
modeButtons.forEach(button => {
    button.addEventListener("click", () => {
        setMode(button.dataset.mode);
    });
});

// Initialize the page without triggering a button click.
setMode("description");


/* =========================================
   DESCRIPTION INPUT
========================================= */

descriptionInput.addEventListener("input", () => {
    descriptionInput.setCustomValidity("");
    descriptionCounter.textContent =
        `${descriptionInput.value.length} / 1500`;
});

document.querySelectorAll(".example-chip").forEach(button => {
    button.addEventListener("click", () => {
        setMode("description");
        descriptionInput.value = button.dataset.example ?? "";
        descriptionCounter.textContent =
            `${descriptionInput.value.length} / 1500`;

        descriptionInput.focus();
        descriptionInput.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });
});


/* =========================================
   TITLE MATCHING
========================================= */

function renderTitleSuggestions(titles) {
    titleSuggestions.replaceChildren();

    if (!Array.isArray(titles) || titles.length === 0) {
        const emptyMessage = document.createElement("div");
        emptyMessage.className = "suggestion-help";
        emptyMessage.textContent =
            "No matching titles were returned. Try another spelling.";
        titleSuggestions.appendChild(emptyMessage);
        titleSuggestions.hidden = false;
        titleInput.setAttribute("aria-expanded", "true");
        return;
    }

    titles.forEach(item => {
        const title = getMovieTitle(item);

        const option = document.createElement("button");
        option.type = "button";
        option.className = "title-suggestion";
        option.setAttribute("role", "option");

        const symbol = document.createElement("span");
        symbol.className = "suggestion-symbol";
        symbol.setAttribute("aria-hidden", "true");
        symbol.textContent = "▶";

        const text = document.createElement("span");
        text.className = "suggestion-title";
        text.textContent = title;

        option.append(symbol, text);

        option.addEventListener("click", () => {
            selectedTitle = title;
            titleInput.value = title;

            selectedTitleText.textContent = `Selected movie: ${title}`;
            selectedTitleNote.hidden = false;
            clearTitleButton.hidden = false;

            hideSuggestions();
            clearRecommendations();

            submitLabel.textContent = "Find Similar Movies";
            titleInput.focus();
        });

        titleSuggestions.appendChild(option);
    });

    titleSuggestions.hidden = false;
    titleInput.setAttribute("aria-expanded", "true");
}

async function fetchTitleMatches(query, requestNumber) {
    if (matchRequestController) {
        matchRequestController.abort();
    }

    matchRequestController = new AbortController();

    try {
        const matches = await postJSON(
            MATCH_TITLE_URL,
            { title: query },
            matchRequestController.signal
        );

        // Ignore results from an older query.
        if (
            requestNumber !== matchRequestNumber ||
            currentMode !== "title"
        ) {
            return;
        }

        renderTitleSuggestions(matches);
    } catch (error) {
        if (error.name === "AbortError") return;

        if (requestNumber !== matchRequestNumber) return;

        titleSuggestions.replaceChildren();

        const errorMessage = document.createElement("div");
        errorMessage.className = "suggestion-help";
        errorMessage.textContent =
            "Couldn't load matching titles. Check that the API is running and try again.";

        titleSuggestions.appendChild(errorMessage);
        titleSuggestions.hidden = false;
        titleInput.setAttribute("aria-expanded", "true");

        console.error("Title matching error:", error);
    }
}

titleInput.addEventListener("input", () => {

    titleInput.setCustomValidity("");
    const query = titleInput.value.trim();

    clearTitleButton.hidden = query.length === 0;
    clearSelectedTitle();
    clearRecommendations();

    clearTimeout(debounceTimer);
    matchRequestNumber++;

    const thisRequestNumber = matchRequestNumber;

    if (matchRequestController) {
        matchRequestController.abort();
        matchRequestController = null;
    }

    if (query.length < 2) {
        hideSuggestions();
        return;
    }

    titleSuggestions.replaceChildren();

    const loadingMessage = document.createElement("div");
    loadingMessage.className = "suggestion-help";
    loadingMessage.textContent = "Searching movie titles...";
    titleSuggestions.appendChild(loadingMessage);

    titleSuggestions.hidden = false;
    titleInput.setAttribute("aria-expanded", "true");

    debounceTimer = setTimeout(() => {
        fetchTitleMatches(query, thisRequestNumber);
    }, TITLE_DEBOUNCE_MS);
});

clearTitleButton.addEventListener("click", () => {
    titleInput.value = "";
    clearTitleButton.hidden = true;
    clearSelectedTitle();
    hideSuggestions();
    clearRecommendations();
    titleInput.focus();
});

document.addEventListener("click", event => {
    if (
        !titleField.contains(event.target) &&
        !titleSuggestions.contains(event.target)
    ) {
        hideSuggestions();
    }
});

titleInput.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        hideSuggestions();
    }

    /*
     * Prevent Enter from submitting an unselected title.
     * The user must first choose one of the suggestions.
     */
    if (event.key === "Enter" && !selectedTitle) {
        event.preventDefault();

        const firstSuggestion =
            titleSuggestions.querySelector(".title-suggestion");

        if (firstSuggestion && !titleSuggestions.hidden) {
            firstSuggestion.click();
        }
    }
});


/* =========================================
   MOVIE CARDS
========================================= */

function createPoster(movie, title) {
    const wrap = document.createElement("div");
    wrap.className = "result-poster-wrap";

    const posterURL = getPosterURL(movie);

    if (posterURL) {
        const image = document.createElement("img");
        image.className = "result-poster";
        image.src = posterURL;
        image.alt = `Poster for ${title}`;
        image.loading = "lazy";

        image.addEventListener("error", () => {
            const placeholder = createPosterPlaceholder(title);
            wrap.replaceChildren(placeholder);
        }, { once: true });

        wrap.appendChild(image);
    } else {
        wrap.appendChild(createPosterPlaceholder(title));
    }

    const percentage = getMatchPercentage(movie);

    if (percentage !== null) {
        const badge = document.createElement("div");
        badge.className = "match-badge";

        const star = document.createElement("span");
        star.textContent = "✦";

        badge.append(
            star,
            document.createTextNode(`${percentage}% Match`)
        );

        badge.title =
            "Content similarity score, not a probability of liking this movie.";

        wrap.appendChild(badge);
    }

    return wrap;
}

function createPosterPlaceholder(title) {
    const placeholder = document.createElement("div");
    placeholder.className = "poster-placeholder";

    const symbol = document.createElement("span");
    symbol.className = "poster-placeholder-symbol";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = "✦";

    const name = document.createElement("span");
    name.className = "poster-placeholder-title";
    name.textContent = title;

    placeholder.append(symbol, name);
    return placeholder;
}


function createMovieCard(movie) {
    const card = document.createElement("article");
    card.className = "result-card";

    const title = getMovieTitle(movie);
    const year = getMovieYear(movie);
    const genres = getMovieGenres(movie);
    const overview = getMovieOverview(movie);

    card.appendChild(createPoster(movie, title));

    const body = document.createElement("div");
    body.className = "result-card-body";

    const heading = document.createElement("h3");
    heading.className = "result-title";
    heading.textContent = title;
    body.appendChild(heading);

    if (year) {
        const yearElement = document.createElement("p");
        yearElement.className = "result-year";
        yearElement.textContent = year;
        body.appendChild(yearElement);
    }

    if (genres.length > 0) {
        const genreContainer = document.createElement("div");
        genreContainer.className = "result-genres";

        genres.slice(0, 3).forEach(genre => {
            const chip = document.createElement("span");
            chip.className = "genre-chip";
            chip.textContent = genre;
            genreContainer.appendChild(chip);
        });

        body.appendChild(genreContainer);
    }

    if (overview) {
        const description = document.createElement("p");
        description.className = "result-overview";
        description.textContent = overview;
        body.appendChild(description);
    }

    // Explore button
    const exploreButton = document.createElement("button");
    exploreButton.type = "button";
    exploreButton.className = "explore-movie-button";
    exploreButton.textContent = "Explore movie";

    const tmdbId = movie.tmdbId ?? movie.tmdb_id ?? movie.tmdbID;

    if (tmdbId != null && /^\d+$/.test(String(tmdbId))) {
        exploreButton.dataset.tmdbId = String(tmdbId);
    } else {
        exploreButton.disabled = true;
        exploreButton.title = "TMDB ID is not available for this movie";
    }

    body.appendChild(exploreButton);

    card.appendChild(body);

    return card;
}

function renderMovies(movies) {
    movieResultsGrid.replaceChildren();

    if (!Array.isArray(movies) || movies.length === 0) {
        resultsCount.textContent = "0 movies";
        setStatus(
            "No recommendations were returned for this search. Try a different description, title, or year filter."
        );
        return;
    }

    const fragment = document.createDocumentFragment();

    movies.forEach(movie => {
        fragment.appendChild(createMovieCard(movie));
    });

    movieResultsGrid.appendChild(fragment);

    resultsCount.textContent =
        `${movies.length} ${movies.length === 1 ? "movie" : "movies"}`;

    setStatus("");
}


/* =========================================
   RECOMMENDATIONS
========================================= */

searchForm.addEventListener("submit", async event => {
    event.preventDefault();

    let searchText = "";

    if (currentMode === "description") {
        searchText = descriptionInput.value.trim();

        if (!searchText) {
            descriptionInput.focus();
            descriptionInput.setCustomValidity(
                "Enter a description of the movie you want to discover."
            );
            descriptionInput.reportValidity();
            return;
        }

        descriptionInput.setCustomValidity("");
    } else {
        if (!selectedTitle) {
            titleInput.setCustomValidity(
                "Search for a movie and select one of the matching titles first."
            );
            titleInput.reportValidity();
            return;
        }

        titleInput.setCustomValidity("");
        searchText = selectedTitle;
    }

    // Cancel any earlier recommendation request.
    if (recommendationRequestController) {
        recommendationRequestController.abort();
    }

    recommendationRequestController = new AbortController();

    const requestBody = {
        inp_text: searchText,
        n_recoms: Number(recommendationCount.value),
        limit_year: yearFilter.value
            ? Number(yearFilter.value)
            : null,
        by_description: currentMode === "description"
    };

    const searchDescription = currentMode === "description"
        ? `Description: “${searchText}”`
        : `Movies similar to “${searchText}”`;

    searchWelcome.hidden = true;
    resultsSection.hidden = false;
    resultsHeading.textContent = "Recommended for you";
    resultsSummary.textContent = searchDescription;
    resultsCount.textContent = "";
    movieResultsGrid.replaceChildren();

    setStatus("Finding movies that match your search...");
    setLoading(true);

    resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    try {
        const movies = await postJSON(
            RECOMMEND_URL,
            requestBody,
            recommendationRequestController.signal
        );

        renderMovies(movies);
    } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Recommendation request error:", error);

        showError(
            "We couldn't load recommendations. Make sure your FastAPI backend is running, then try again."
        );
    } finally {
        if (
            recommendationRequestController &&
            !recommendationRequestController.signal.aborted
        ) {
            setLoading(false);
        }
    }
});


/* =========================================
   INITIAL STATE
========================================= */

descriptionField.hidden = false;
titleField.hidden = true;

descriptionInput.required = true;
titleInput.required = false;

descriptionCounter.textContent =
    `${descriptionInput.value.length} / 1500`;

submitLabel.textContent = "Find Movies";
descriptionCounter.textContent =
    `${descriptionInput.value.length} / 1500`;
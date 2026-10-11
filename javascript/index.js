
/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE_URL = "http://127.0.0.1:8000";
const TRENDING_URL = `${API_BASE_URL}/trending`;

const MOVIES_PER_PAGE = 20;
const AUTOPLAY_DELAY = 5000;

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

/* =========================================================
   STATE
========================================================= */

let trendingMovies = [];
let currentPage = 1;
let featuredIndex = 0;
let autoplayTimer = null;

const preloadedImages = new Set();

/* =========================================================
   DOM ELEMENTS
========================================================= */

const movieGrid = document.getElementById("movie-grid");
const trendingStatus = document.getElementById("trending-status");
const resultsCount = document.getElementById("results-count");

const pagePrev = document.getElementById("page-prev");
const pageNext = document.getElementById("page-next");
const pageInfo = document.getElementById("page-info");

const heroTitle = document.getElementById("hero-title");
const heroDescription = document.getElementById("hero-description");
const heroBackdrop = document.getElementById("hero-backdrop");
const heroCounter = document.getElementById("hero-counter");

const heroPrev = document.getElementById("hero-prev");
const heroNext = document.getElementById("hero-next");
const heroDetails = document.getElementById("hero-details");

/* =========================================================
   MOVIE DATA HELPERS
========================================================= */

function getMovieTitle(movie) {
    return movie.title
        ?? movie.movie_title
        ?? movie.name
        ?? "Untitled Movie";
}

function getMovieDescription(movie) {
    return movie.overview
        ?? movie.description
        ?? movie.plot
        ?? "Discover this movie and explore more recommendations.";
}

function getMovieYear(movie) {
    return movie.year
        ?? movie.release_year
        ?? movie.release_date?.slice(0, 4)
        ?? "";
}

/* =========================================================
   TMDB IMAGE URL HELPERS
========================================================= */

function resolveImageUrl(path, baseUrl) {
    if (typeof path !== "string" || !path.trim()) {
        return "";
    }

    const value = path.trim();

    // Already a complete image URL.
    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    // Handle paths that contain the TMDB image domain.
    if (value.startsWith("//")) {
        return `https:${value}`;
    }

    return `${baseUrl}/${value.replace(/^\/+/, "")}`;
}

function getPosterUrl(movie) {
    return resolveImageUrl(
        movie.poster_path ?? movie.poster_url ?? movie.poster ?? "",
        TMDB_IMAGE_BASE
    );
}

function getBackdropUrl(movie) {
    return resolveImageUrl(
        movie.backdrop_path
            ?? movie.backdrop_url
            ?? movie.backdrop
            ?? movie.poster_path
            ?? "",
        TMDB_BACKDROP_BASE
    );
}

/* =========================================================
   IMAGE PRELOADING
========================================================= */

function preloadBackdrop(url) {
    if (!url || preloadedImages.has(url)) {
        return;
    }

    preloadedImages.add(url);

    const image = new Image();
    image.decoding = "async";
    image.src = url;
}

/* =========================================================
   FETCH TRENDING MOVIES
========================================================= */

async function loadTrendingMovies() {
    trendingStatus.textContent = "Loading trending movies...";

    try {
        const response = await fetch(TRENDING_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            throw new Error(`API returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Expected an array of movies from the API.");
        }

        trendingMovies = data;
        currentPage = 1;
        featuredIndex = 0;

        if (trendingMovies.length === 0) {
            trendingStatus.textContent = "No trending movies were found.";
            resultsCount.textContent = "";
            movieGrid.replaceChildren();

            updatePagination();
            updateHero();
            stopAutoplay();
            return;
        }

        trendingStatus.textContent = "";
        resultsCount.textContent = `${trendingMovies.length} movies`;

        renderTrendingMovies();
        updateHero();
        startAutoplay();

    } catch (error) {
        console.error("Failed to load trending movies:", error);

        trendingStatus.textContent =
            "Could not load movies. Check your FastAPI server, API address, and CORS settings.";
    }
}

/* =========================================================
   TRENDING MOVIE CARDS
========================================================= */

function createPosterPlaceholder(title) {
    const placeholder = document.createElement("div");

    placeholder.className = "poster-placeholder";
    placeholder.textContent = title;

    return placeholder;
}

function renderTrendingMovies() {
    movieGrid.replaceChildren();

    const start = (currentPage - 1) * MOVIES_PER_PAGE;

    const moviesOnPage = trendingMovies.slice(
        start,
        start + MOVIES_PER_PAGE
    );

    moviesOnPage.forEach((movie) => {
        const card = document.createElement("article");
        card.className = "movie-card";
        card.tabIndex = 0;

        const title = getMovieTitle(movie);
        const posterUrl = getPosterUrl(movie);
        const year = getMovieYear(movie);

        if (posterUrl) {
            const poster = document.createElement("img");

            poster.className = "movie-poster";
            poster.src = posterUrl;
            poster.alt = `${title} poster`;
            poster.loading = "lazy";
            poster.decoding = "async";

            poster.addEventListener("error", () => {
                poster.replaceWith(createPosterPlaceholder(title));
            }, { once: true });

            card.appendChild(poster);
        } else {
            card.appendChild(createPosterPlaceholder(title));
        }

        const titleElement = document.createElement("h3");

        titleElement.className = "movie-title";
        titleElement.textContent = title;

        card.appendChild(titleElement);

        if (year) {
            const yearElement = document.createElement("p");

            yearElement.className = "movie-meta";
            yearElement.textContent = year;

            card.appendChild(yearElement);
        }

        movieGrid.appendChild(card);
    });

    updatePagination();
}

/* =========================================================
   PAGINATION
========================================================= */

function updatePagination() {
    const totalPages = Math.ceil(
        trendingMovies.length / MOVIES_PER_PAGE
    );

    pagePrev.disabled = currentPage <= 1;
    pageNext.disabled =
        totalPages === 0 || currentPage >= totalPages;

    pageInfo.textContent =
        `Page ${totalPages === 0 ? 0 : currentPage} of ${totalPages}`;
}

pagePrev.addEventListener("click", () => {
    if (currentPage <= 1) return;

    currentPage--;

    renderTrendingMovies();

    document.getElementById("trending").scrollIntoView({
        behavior: "smooth"
    });
});

pageNext.addEventListener("click", () => {
    const totalPages = Math.ceil(
        trendingMovies.length / MOVIES_PER_PAGE
    );

    if (currentPage >= totalPages) return;

    currentPage++;

    renderTrendingMovies();

    document.getElementById("trending").scrollIntoView({
        behavior: "smooth"
    });
});

/* =========================================================
   FEATURED CAROUSEL
========================================================= */

function updateHero() {
    if (trendingMovies.length === 0) {
        heroTitle.textContent = "Discover Your Next Movie";
        heroDescription.textContent =
            "Explore movies selected for you.";

        heroCounter.textContent = "0 / 0";
        heroBackdrop.style.backgroundImage = "none";

        return;
    }

    featuredIndex =
        (featuredIndex + trendingMovies.length) % trendingMovies.length;

    const movie = trendingMovies[featuredIndex];
    const backdropUrl = getBackdropUrl(movie);

    // Update text immediately without waiting for image downloads.
    heroTitle.textContent = getMovieTitle(movie);
    heroDescription.textContent = getMovieDescription(movie);

    heroCounter.textContent =
        `${featuredIndex + 1} / ${trendingMovies.length}`;

    if (backdropUrl) {
        // Preload before applying the new background.
        preloadBackdrop(backdropUrl);

        heroBackdrop.style.backgroundImage =
            `url("${backdropUrl.replace(/"/g, '\\"')}")`;
    } else {
        heroBackdrop.style.backgroundImage = "none";
    }

    // Prepare the following slide in advance.
    const nextIndex =
        (featuredIndex + 1) % trendingMovies.length;

    preloadBackdrop(getBackdropUrl(trendingMovies[nextIndex]));
}

function nextFeaturedMovie() {
    if (trendingMovies.length < 2) return;

    featuredIndex =
        (featuredIndex + 1) % trendingMovies.length;

    updateHero();
}

function previousFeaturedMovie() {
    if (trendingMovies.length < 2) return;

    featuredIndex =
        (featuredIndex - 1 + trendingMovies.length)
        % trendingMovies.length;

    updateHero();
}

/* =========================================================
   AUTOPLAY
========================================================= */

function stopAutoplay() {
    if (autoplayTimer !== null) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
    }
}

function startAutoplay() {
    stopAutoplay();

    if (trendingMovies.length < 2 || document.hidden) {
        return;
    }

    autoplayTimer = setInterval(() => {
        nextFeaturedMovie();
    }, AUTOPLAY_DELAY);
}

heroPrev.addEventListener("click", () => {
    previousFeaturedMovie();
    startAutoplay();
});

heroNext.addEventListener("click", () => {
    nextFeaturedMovie();
    startAutoplay();
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        stopAutoplay();
    } else {
        startAutoplay();
    }
});

/* =========================================================
   FEATURED MOVIE BUTTON
========================================================= */

heroDetails.addEventListener("click", () => {
    document.getElementById("trending").scrollIntoView({
        behavior: "smooth"
    });
});

/* =========================================================
   INITIALIZE APPLICATION
========================================================= */

loadTrendingMovies();

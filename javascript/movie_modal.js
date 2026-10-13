"use strict";

(() => {
    const API_BASE_URL = "http://127.0.0.1:8000";
    const MODAL_HTML_URL = new URL(
    "../pages/movie_modal.html",
    document.querySelector('script[src*="movie_modal.js"]')?.src
        || window.location.href
    );
    const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";
    const mount = document.getElementById("movie-modal-mount");

    if (!mount) {
        console.error("Movie modal mount element was not found.");
        return;
    }

    let modal = null;
    let lastFocusedElement = null;
    let activeController = null;
    let currentMovie = null;
    const $ = (selector) => modal?.querySelector(selector);

    function setText(selector, value, fallback = "Not available") {
        const element = $(selector);
        if (element) element.textContent = value == null || value === "" ? fallback : String(value);
    }

    function imageURL(path, size = "w500") {
        if (typeof path !== "string" || !path.startsWith("/")) return "";
        return `${IMAGE_BASE_URL}${size}${path}`;
    }

    function setBackground(element, path, size = "w1280") {
        const url = imageURL(path, size);
        if (!element || !url) {
            if (element) element.style.backgroundImage = "";
            return;
        }
        element.style.backgroundImage = `url("${new URL(url).href}")`;
    }

    function formatNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number.toLocaleString() : "";
    }

    function formatMoney(value) {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount <= 0) return "";
        return new Intl.NumberFormat("en-US", {
            style: "currency", currency: "USD", maximumFractionDigits: 0,
            notation: amount >= 1_000_000_000 ? "compact" : "standard"
        }).format(amount);
    }

    function formatRuntime(value) {
        const minutes = Number(value);
        if (!Number.isFinite(minutes) || minutes <= 0) return "";
        const hours = Math.floor(minutes / 60);
        const remaining = minutes % 60;
        return hours ? `${hours}h ${remaining}m` : `${remaining} min`;
    }

    function makeMetaItem(text) {
        const item = document.createElement("span");
        item.className = "movie-modal__meta-item";
        item.textContent = text;
        return item;
    }

    function renderMeta(movie) {
        const container = $("#modal-meta");
        if (!container) return;
        container.replaceChildren();

        const values = [
            movie.release_date ? movie.release_date.slice(0, 4) : "",
            formatRuntime(movie.runtime),
            movie.status && movie.status !== "Released" ? movie.status : ""
        ].filter(Boolean);

        values.forEach((value, index) => {
            if (index) {
                const dot = document.createElement("span");
                dot.className = "movie-modal__meta-dot";
                dot.setAttribute("aria-hidden", "true");
                dot.textContent = "·";
                container.appendChild(dot);
            }
            container.appendChild(makeMetaItem(value));
        });
    }

    function renderGenres(genres = []) {
        const container = $("#modal-genres");
        if (!container) return;
        container.replaceChildren();

        genres.filter(genre => genre && genre.name).forEach(genre => {
            const chip = document.createElement("span");
            chip.className = "movie-genre";
            chip.textContent = genre.name;
            container.appendChild(chip);
        });
        container.hidden = genres.length === 0;
    }

    function renderRating(movie) {
        const score = Number(movie.vote_average);
        const hasScore = movie.vote_average != null && Number.isFinite(score) && Number(movie.vote_count || 0) > 0;
        const stars = $("#modal-stars");
        if (stars) {
            stars.replaceChildren();
            // Convert TMDB's 10-point rating to a five-star visual scale.
            const starRating = hasScore ? Math.max(0, Math.min(5, score / 2)) : 0;
            for (let index = 1; index <= 5; index += 1) {
                const star = document.createElement("span");
                star.className = `movie-modal__star${index <= Math.round(starRating) ? "" : " movie-modal__star--empty"}`;
                star.textContent = "★";
                stars.appendChild(star);
            }
        }
        setText("#modal-rating-score", hasScore ? score.toFixed(1) : "—");
        const votes = Number(movie.vote_count);
        setText("#modal-vote-count", votes > 0 ? `${formatNumber(votes)} ratings` : "No ratings yet");
    }

    function createFact(label, value) {
        const card = document.createElement("div");
        card.className = "movie-modal__fact";
        const heading = document.createElement("span");
        heading.className = "movie-modal__fact-label";
        heading.textContent = label;
        const content = document.createElement("span");
        content.className = "movie-modal__fact-value";
        content.textContent = value || "Not available";
        card.append(heading, content);
        return card;
    }

    function renderFacts(movie) {
        const container = $("#modal-facts");
        if (!container) return;

        const releaseDate = movie.release_date || "";
        const languages = Array.isArray(movie.spoken_languages)
            ? movie.spoken_languages.map(language => language.english_name || language.name).filter(Boolean).join(", ")
            : "";
        const countries = Array.isArray(movie.production_countries)
            ? movie.production_countries.map(country => country.name).filter(Boolean).join(", ")
            : "";
        const companies = Array.isArray(movie.production_companies)
            ? movie.production_companies.map(company => company.name).filter(Boolean).join(", ")
            : "";
        const genres = Array.isArray(movie.genres)
            ? movie.genres.map(genre => genre.name).filter(Boolean).join(", ")
            : "";

        const facts = [
            ["Release date", releaseDate],
            ["Runtime", formatRuntime(movie.runtime)],
            ["Original title", movie.original_title],
            ["Original language", movie.original_language ? movie.original_language.toUpperCase() : ""],
            ["Spoken languages", languages],
            ["Production countries", countries],
            ["Genres", genres],
            ["Budget", formatMoney(movie.budget)],
            ["Box office", formatMoney(movie.revenue)],
            ["Production companies", companies],
            ["TMDB popularity", Number.isFinite(Number(movie.popularity)) && movie.popularity != null
                ? Number(movie.popularity).toFixed(1) : ""],
            ["Release status", movie.status]
        ];

        container.replaceChildren(...facts.map(([label, value]) => createFact(label, value)));
    }

    function renderDirector(movie) {
        const container = $("#modal-director");
        if (!container) return;
        const crew = movie.credits?.crew || [];
        const directors = crew.filter(person => person.job === "Director").map(person => person.name).filter(Boolean);
        if (!directors.length) {
            container.hidden = true;
            container.replaceChildren();
            return;
        }
        container.replaceChildren();
        const label = document.createElement("strong");
        label.textContent = "Director: ";
        container.append(label, document.createTextNode(directors.join(", ")));
        container.hidden = false;
    }

    function renderCast(cast = []) {
        const section = $("#modal-cast-section");
        const container = $("#modal-cast");
        if (!section || !container) return;
        container.replaceChildren();

        cast.slice(0, 12).forEach(actor => {
            const card = document.createElement("article");
            card.className = "movie-modal__cast-card";
            const src = imageURL(actor.profile_path, "w185");

            if (src) {
                const image = document.createElement("img");
                image.src = src;
                image.alt = actor.name || "Cast member";
                image.loading = "lazy";
                image.addEventListener("error", () => {
                    const placeholder = document.createElement("div");
                    placeholder.className = "movie-modal__cast-placeholder";
                    placeholder.textContent = "✦";
                    image.replaceWith(placeholder);
                }, { once: true });
                card.appendChild(image);
            } else {
                const placeholder = document.createElement("div");
                placeholder.className = "movie-modal__cast-placeholder";
                placeholder.textContent = "✦";
                card.appendChild(placeholder);
            }

            const info = document.createElement("div");
            info.className = "movie-modal__cast-info";
            const name = document.createElement("p");
            name.className = "movie-modal__cast-name";
            name.textContent = actor.name || "Unknown actor";
            const character = document.createElement("p");
            character.className = "movie-modal__cast-character";
            character.textContent = actor.character || "";
            info.append(name, character);
            card.appendChild(info);
            container.appendChild(card);
        });

        renderDirector(currentMovie || {});
        section.hidden = cast.length === 0 && !($("#modal-director") && !$("#modal-director").hidden);
    }

    function renderCompanies(companies = []) {
        const section = $("#modal-companies-section");
        const container = $("#modal-companies");
        if (!section || !container) return;
        container.replaceChildren();

        companies.filter(company => company && company.name).slice(0, 12).forEach(company => {
            const item = document.createElement("span");
            item.className = "movie-modal__company";
            item.textContent = company.name;
            container.appendChild(item);
        });
        section.hidden = container.childElementCount === 0;
    }

    function renderImages(images = {}) {
        const section = $("#modal-images-section");
        const container = $("#modal-images");
        if (!section || !container) return;
        container.replaceChildren();

        const paths = (images.backdrops || []).map(image => image.file_path).filter(Boolean).slice(0, 12);
        paths.forEach((path, index) => {
            const image = document.createElement("img");
            image.src = imageURL(path, "w780");
            image.alt = `Movie still ${index + 1}`;
            image.loading = "lazy";
            container.appendChild(image);
        });
        section.hidden = paths.length === 0;
    }

    function findTrailer(videos = {}) {
        const list = Array.isArray(videos.results) ? videos.results : [];
        return list.find(video => video.site === "YouTube" && video.type === "Trailer" && video.official && video.key)
            || list.find(video => video.site === "YouTube" && video.type === "Trailer" && video.key)
            || list.find(video => video.site === "YouTube" && video.key)
            || null;
    }

    function stopTrailer() {
        $("#modal-video")?.replaceChildren();
        if ($("#modal-video")) $("#modal-video").hidden = true;
        if ($("#modal-video-art")) $("#modal-video-art").hidden = false;
    }

    function renderTrailer(movie) {
        const button = $("#modal-trailer-button");
        const section = $("#modal-video-section");
        const art = $("#modal-video-art");
        const player = $("#modal-video");
        const play = $("#modal-video-play");
        if (!button || !section || !art || !player || !play) return;

        const trailer = findTrailer(movie.videos || {});
        const posterOrBackdrop = movie.backdrop_path || movie.poster_path;
        setBackground(art, posterOrBackdrop, "w1280");
        setText("#modal-video-caption-title", trailer?.name || "Official trailer", "Official trailer");
        setText("#modal-trailer-label", trailer?.official ? "Official trailer" : "Movie preview", "Movie preview");
        button.hidden = !trailer;
        section.hidden = !trailer;
        stopTrailer();

        const playTrailer = () => {
            if (!trailer) return;
            const iframe = document.createElement("iframe");
            iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}?autoplay=1&rel=0`;
            iframe.title = `${movie.title || "Movie"} trailer`;
            iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share";
            iframe.allowFullscreen = true;
            iframe.referrerPolicy = "strict-origin-when-cross-origin";
            player.replaceChildren(iframe);
            player.hidden = false;
            art.hidden = true;
        };

        button.onclick = () => {
            section.hidden = false;
            section.scrollIntoView({ behavior: "smooth", block: "start" });
            playTrailer();
        };
        play.onclick = playTrailer;
    }

    function renderMovie(movie) {
        currentMovie = movie;
        setText("#modal-title", movie.title, "Untitled movie");
        setText("#modal-tagline", movie.tagline, "");
        $("#modal-tagline").hidden = !movie.tagline;
        renderMeta(movie);
        renderRating(movie);
        renderGenres(movie.genres || []);
        setText("#modal-overview", movie.overview, "No overview is available for this movie.");
        setBackground($("#modal-hero"), movie.backdrop_path || movie.poster_path);

        const tmdbLink = $("#modal-tmdb-link");
        if (tmdbLink && movie.id) {
            tmdbLink.href = `https://www.themoviedb.org/movie/${encodeURIComponent(movie.id)}`;
            tmdbLink.hidden = false;
        } else if (tmdbLink) {
            tmdbLink.hidden = true;
        }

        renderFacts(movie);
        renderCast(movie.credits?.cast || []);
        renderCompanies(movie.production_companies || []);
        renderImages(movie.images || {});
        renderTrailer(movie);
    }

    async function openMovie(tmdbId, trigger) {
        if (!modal || !/^\d+$/.test(String(tmdbId ?? ""))) {
            console.error("This card does not have a valid TMDB ID.");
            return;
        }

        lastFocusedElement = trigger;
        modal.hidden = false;
        document.body.style.overflow = "hidden";
        setText("#modal-status", "Loading movie information…", "");
        setText("#modal-title", "Loading movie…");
        setText("#modal-overview", "Fetching movie information…");
        setText("#modal-tagline", "", "");
        $("#modal-tagline").hidden = true;
        $("#modal-trailer-button").hidden = true;
        $("#modal-video-section").hidden = true;
        $("#modal-cast-section").hidden = true;
        $("#modal-images-section").hidden = true;
        $("#modal-companies-section").hidden = true;
        $("#modal-facts").replaceChildren();
        $("#modal-genres").replaceChildren();
        $("#modal-stars").replaceChildren();
        $("#modal-hero").style.backgroundImage = "";
        stopTrailer();

        if (activeController) activeController.abort();
        activeController = new AbortController();

        try {
            const response = await fetch(
                `${API_BASE_URL}/movie_info/${encodeURIComponent(tmdbId)}`,
                { signal: activeController.signal }
            );
            if (!response.ok) {
                let detail = "";
                try {
                    const errorBody = await response.json();
                    detail = errorBody.detail || "";
                } catch (_) {}
                throw new Error(detail || (response.status === 404
                    ? "Movie details were not found."
                    : `Movie API returned ${response.status}.`));
            }

            const movie = await response.json();
            if (!modal || modal.hidden) return;
            renderMovie(movie);
            setText("#modal-status", "", "");
            $(".movie-modal__close")?.focus();
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error("Could not load movie details:", error);
            setText("#modal-status", error.message || "Could not load movie details. Check your API and try again.");
            setText("#modal-overview", "Movie information is temporarily unavailable.");
        }
    }

    function closeModal() {
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        document.body.style.overflow = "";
        activeController?.abort();
        activeController = null;
        stopTrailer();
        if (lastFocusedElement?.isConnected) lastFocusedElement.focus();
    }

    async function initialize() {
        try {
            // This file is expected in pages/, next to find_movies.html.
            const response = await fetch(MODAL_HTML_URL);
            if (!response.ok) throw new Error(`Could not load modal HTML (${response.status}).`);

            const html = await response.text();
            const template = new DOMParser().parseFromString(html, "text/html")
                .querySelector("#movie-modal-template");
            if (!template) throw new Error("Movie modal template was not found.");

            mount.appendChild(document.importNode(template.content, true));
            modal = mount.querySelector("#movie-modal");

            modal.addEventListener("click", event => {
                if (event.target.closest("[data-close-modal]")) closeModal();
            });

            document.addEventListener("keydown", event => {
                if (event.key === "Escape" && modal && !modal.hidden) closeModal();
            });

            // Cards are created dynamically, so use event delegation.
            
            // Handle Explore buttons on both Trending and Find Movies pages.
            
            // Handle Explore buttons on Trending and Find Movies pages,
            // plus the featured movie button.
            document.addEventListener("click", event => {
                const button = event.target.closest(
                    ".explore-movie-button, #hero-details"
                );

                if (!button || button.disabled) return;

                const isHeroButton = button.id === "hero-details";
                const isMovieCard = button.closest(
                    "#movie-grid, #movie-results-grid"
                );

                if (!isHeroButton && !isMovieCard) return;

                const tmdbId = button.dataset.tmdbId;

                console.log("Explore clicked. TMDB ID:", tmdbId);

                if (!tmdbId || !/^\d+$/.test(String(tmdbId))) {
                    console.error("Invalid or missing TMDB ID:", tmdbId);
                    return;
                }

                event.preventDefault();
                openMovie(tmdbId, button);
            });


        } catch (error) {
            console.error("Movie modal initialization failed:", error);
        }
    }

    initialize();
})();

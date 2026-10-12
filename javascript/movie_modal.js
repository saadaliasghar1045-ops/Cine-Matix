
"use strict";

(() => {
    const API_BASE_URL = "http://127.0.0.1:8000";
    const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";

    const mount = document.getElementById("movie-modal-mount");

    if (!mount) {
        console.error("Movie modal mount element was not found.");
        return;
    }

    let modal = null;
    let lastFocusedElement = null;
    let activeController = null;

    const $ = (selector) => modal?.querySelector(selector);

    function setText(selector, value, fallback = "Not available") {
        const element = $(selector);
        if (element) {
            element.textContent = value || fallback;
        }
    }

    function setImageBackground(element, path, size = "w1280") {
        if (!element || typeof path !== "string" || !path.startsWith("/")) {
            return;
        }

        const imageURL = `${IMAGE_BASE_URL}${size}${path}`;

        // Use a URL value, not raw API text as CSS.
        const safeURL = new URL(imageURL);
        if (safeURL.protocol === "https:") {
            element.style.backgroundImage = `url("${safeURL.href}")`;
        }
    }

    function getImageURL(path, size = "w500") {
        if (typeof path !== "string" || !path.startsWith("/")) {
            return "";
        }

        return `${IMAGE_BASE_URL}${size}${path}`;
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

        const genres = Array.isArray(movie.genres)
            ? movie.genres.map(item => item.name).filter(Boolean).join(", ")
            : "";

        const releaseYear = movie.release_date?.slice(0, 4) || "";
        const runtime = movie.runtime ? `${movie.runtime} min` : "";
        const rating = Number.isFinite(Number(movie.vote_average))
            && movie.vote_average !== null
            ? `${Number(movie.vote_average).toFixed(1)} / 10`
            : "";
        const votes = movie.vote_count != null
            ? Number(movie.vote_count).toLocaleString()
            : "";

        container.replaceChildren(
            createFact("Release year", releaseYear),
            createFact("Runtime", runtime),
            createFact("Rating", rating),
            createFact("Votes", votes),
            createFact("Genres", genres),
            createFact("Language", movie.original_language?.toUpperCase())
        );
    }

    function renderCast(cast = []) {
        const section = $("#modal-cast-section");
        const container = $("#modal-cast");
        if (!section || !container) return;

        container.replaceChildren();

        cast.slice(0, 10).forEach(actor => {
            const card = document.createElement("article");
            card.className = "movie-modal__cast-card";

            const imageURL = getImageURL(actor.profile_path, "w185");

            if (imageURL) {
                const image = document.createElement("img");
                image.src = imageURL;
                image.alt = actor.name || "Cast member";
                image.loading = "lazy";

                image.addEventListener("error", () => {
                    const placeholder = document.createElement("div");
                    placeholder.className = "movie-modal__cast-placeholder";
                    placeholder.textContent = "♟";
                    image.replaceWith(placeholder);
                }, { once: true });

                card.appendChild(image);
            } else {
                const placeholder = document.createElement("div");
                placeholder.className = "movie-modal__cast-placeholder";
                placeholder.textContent = "♟";
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

        section.hidden = cast.length === 0;
    }

    function renderImages(images = {}) {
        const section = $("#modal-images-section");
        const container = $("#modal-images");
        if (!section || !container) return;

        container.replaceChildren();

        const paths = (images.backdrops || [])
            .map(image => image.file_path)
            .filter(Boolean)
            .slice(0, 10);

        paths.forEach(path => {
            const image = document.createElement("img");
            image.src = getImageURL(path, "w780");
            image.alt = "Movie backdrop";
            image.loading = "lazy";
            container.appendChild(image);
        });

        section.hidden = paths.length === 0;
    }

    function renderTrailer(videos = {}) {
        const button = $("#modal-trailer-button");
        const section = $("#modal-video-section");
        const container = $("#modal-video");

        if (!button || !section || !container) return;

        // Prefer an official YouTube trailer when available.
        const availableVideos = videos.results || [];
        const trailer = availableVideos.find(video =>
            video.site === "YouTube"
            && video.type === "Trailer"
            && video.key
        ) || availableVideos.find(video =>
            video.site === "YouTube"
            && video.key
        );

        container.replaceChildren();
        section.hidden = true;
        button.hidden = !trailer;

        button.onclick = () => {
            if (!trailer) return;

            const iframe = document.createElement("iframe");
            iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}?autoplay=1&rel=0`;
            iframe.title = `${$("#modal-title")?.textContent || "Movie"} trailer`;
            iframe.allow =
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
            iframe.allowFullscreen = true;
            iframe.referrerPolicy = "strict-origin-when-cross-origin";

            container.replaceChildren(iframe);
            section.hidden = false;
            section.scrollIntoView({ behavior: "smooth", block: "start" });
        };
    }

    function renderMovie(movie) {
        setText("#modal-title", movie.title);
        setText("#modal-meta", [
            movie.release_date?.slice(0, 4),
            movie.runtime ? `${movie.runtime} min` : "",
            movie.genres?.map(genre => genre.name).filter(Boolean).join(" · ")
        ].filter(Boolean).join("  •  "), "");

        setText("#modal-overview", movie.overview, "No overview is available for this movie.");
        setImageBackground($("#modal-hero"), movie.backdrop_path || movie.poster_path);

        const tmdbLink = $("#modal-tmdb-link");
        if (tmdbLink && movie.id) {
            tmdbLink.href = `https://www.themoviedb.org/movie/${encodeURIComponent(movie.id)}`;
            tmdbLink.hidden = false;
        }

        renderFacts(movie);
        renderCast(movie.credits?.cast || movie.cast || []);
        renderImages(movie.images || {});
        renderTrailer(movie.videos || {});
    }

    async function openMovie(tmdbId, trigger) {
        if (!modal) {
            console.error("Movie modal template is not ready yet.");
            return;
        }

        if (!/^\d+$/.test(String(tmdbId))) {
            console.error("This card does not have a valid TMDB ID.");
            return;
        }

        lastFocusedElement = trigger;
        modal.hidden = false;
        document.body.style.overflow = "hidden";
        $("#modal-status").textContent = "Loading movie information…";

        setText("#modal-title", "Loading movie…");
        setText("#modal-overview", "Fetching movie information…");
        $("#modal-trailer-button").hidden = true;
        $("#modal-video-section").hidden = true;
        $("#modal-cast-section").hidden = true;
        $("#modal-images-section").hidden = true;
        $("#modal-facts").replaceChildren();

        $("#modal-hero").style.backgroundImage = "";
        $("#modal-video").replaceChildren();

        $("#modal-close")?.focus();

        if (activeController) activeController.abort();
        activeController = new AbortController();

        try {
            const response = await fetch(
                `${API_BASE_URL}/movie_info/${encodeURIComponent(tmdbId)}`,
                { signal: activeController.signal }
            );

            if (!response.ok) {
                throw new Error(
                    response.status === 404
                        ? "Movie details were not found."
                        : `Movie API returned ${response.status}.`
                );
            }

            const movie = await response.json();

            if (!modal || modal.hidden) return;

            renderMovie(movie);
            $("#modal-status").textContent = "";
        } catch (error) {
            if (error.name === "AbortError") return;

            console.error("Could not load movie details:", error);
            $("#modal-status").textContent =
                "Could not load movie details. Check your API and try again.";
            setText("#modal-overview", "Movie information is temporarily unavailable.");
        }
    }

    function closeModal() {
        if (!modal || modal.hidden) return;

        modal.hidden = true;
        document.body.style.overflow = "";
        activeController?.abort();
        activeController = null;

        $("#modal-video")?.replaceChildren();

        if (lastFocusedElement?.isConnected) {
            lastFocusedElement.focus();
        }
    }

    async function initialize() {
        try {
            // This path is relative to pages/find_movies.html.
            const response = await fetch("./movie_modal.html");

            if (!response.ok) {
                throw new Error(`Could not load modal HTML (${response.status}).`);
            }

            const html = await response.text();
            const documentTemplate = new DOMParser()
                .parseFromString(html, "text/html")
                .querySelector("#movie-modal-template");

            if (!documentTemplate) {
                throw new Error("Movie modal template was not found.");
            }

            mount.appendChild(document.importNode(documentTemplate.content, true));
            modal = mount.querySelector("#movie-modal");

            modal.addEventListener("click", event => {
                if (event.target.closest("[data-close-modal]")) {
                    closeModal();
                }
            });

            document.addEventListener("keydown", event => {
                if (event.key === "Escape") closeModal();
            });

            // Event delegation works even when recommendation cards are created later.
            const resultsGrid = document.getElementById("movie-results-grid");

            resultsGrid?.addEventListener("click", event => {
                const button = event.target.closest(".explore-movie-button");
                if (!button) return;

                openMovie(button.dataset.tmdbId, button);
            });
        } catch (error) {
            console.error("Movie modal initialization failed:", error);
        }
    }

    initialize();
})();

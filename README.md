# 🎬 CineMatix — Content-Based Movie Recommender

**Discover your next favorite movie with CineMatix.**

CineMatix is a movie discovery and recommendation web application that helps users explore trending movies and find films based on their interests. It combines a vanilla HTML, CSS, and JavaScript frontend with a FastAPI backend and a content-based machine learning recommendation system.

The project focuses on bringing machine learning beyond notebooks into a complete web application with a user interface, API integration, movie metadata, and personalized discovery based on movie content.

## ✨ Features

### 🏠 Trending Movies
- Explore trending movies on the homepage.
- Browse movie artwork and available movie information.
- Open a movie's details popup to learn more about it.

### 🔎 Find Movies
CineMatix supports two content-based recommendation modes:

**1. Description-Based Recommendations**
- Describe the kind of movie you want to watch.
- Submit your description to the recommendation API.
- Receive movies whose content is relevant to your description.

**2. Title-Based Recommendations**
- Enter a movie title.
- Find matching movie titles when searching.
- Select a matching movie to discover similar films.

Additional options include the number of recommendations and an optional release-year limit.

### 🎞️ Movie Details Popup
Explore additional information about supported movies through a reusable movie details modal.

Depending on the available TMDB metadata, the popup can display:
- Movie posters and backdrop artwork
- Movie title and tagline
- Overview or synopsis
- Average rating and vote count
- Genres displayed as labels
- Release date and runtime
- Budget and revenue
- Original language and production countries
- Movie status
- Director information
- Cast members, actor portraits, and character names
- Production companies
- Trailer player and additional movie images

The information displayed depends on the availability of metadata and media for each movie.

### 🌓 Dark and Light Themes
- Switch between dark and light appearances.
- Use a consistent theme across the website.
- Store the selected theme using browser local storage.

### 📱 Responsive Interface
- Responsive layouts for desktop and smaller screens.
- Shared navigation and footer components.
- Interactive movie cards and details popup.

## 🧠 How the Recommendation System Works

CineMatix uses **content-based filtering** to recommend movies based on similarities in their content.

Rather than relying on a user's rating history or other users' preferences, the system uses movie information represented in a vector space.

A simplified workflow is:

1. Movie content is prepared during preprocessing.
2. Text features are transformed into numerical vectors using TF-IDF.
3. The recommendation pipeline compares the user's selected movie or description with movie representations.
4. Movies with stronger content similarity are returned as recommendations.
5. The frontend displays the resulting movies.

The two recommendation modes use different inputs:

- **Description mode:** Uses a text description of the movie the user wants.
- **Title mode:** Matches a movie title first, then uses the selected title to find similar movies.

The exact results depend on the available dataset, preprocessing, and fitted vectorizers or matrices.

## 🏗️ Project Architecture

CineMatix separates the frontend from the backend.

```text
CineMatix
│
├── Frontend
│   ├── HTML pages
│   ├── CSS stylesheets
│   └── JavaScript modules
│
├── FastAPI Backend
│   ├── Recommendation API
│   ├── Title matching API
│   ├── Trending movies API
│   └── Movie information API
│
├── Machine Learning
│   ├── Content preprocessing
│   ├── TF-IDF vectorization
│   └── Content similarity
│
└── TMDB Integration
    ├── Movie metadata
    ├── Posters and backdrops
    ├── Cast and production information
    └── Available trailers and images
```

### Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Web page structure |
| CSS3 | Styling, responsive layouts, and themes |
| Vanilla JavaScript | UI interactions and API requests |
| Python | Backend and machine learning |
| FastAPI | REST API |
| TF-IDF | Text feature representation |
| Content-based filtering | Movie recommendations |
| TMDB API | Movie metadata and artwork |
| Git and GitHub | Version control and source hosting |
| GitHub Pages | Frontend hosting |

## 📂 Frontend Structure

```text
Gamma-Frame-content-based-movie-recommender/
│
├── README.md
│
├── assets/
│   └── icons/
│       └── favicon.svg
│
├── javascript/
│   ├── about.js
│   ├── find_movies.js
│   ├── footer.js
│   ├── index.js
│   ├── movie_modal.js
│   └── navbar.js
│
├── pages/
│   ├── about.html
│   ├── find_movies.html
│   ├── index.html
│   └── movie_modal.html
│
└── stylesheets/
    ├── about.css
    ├── find_movies.css
    ├── footer.css
    ├── index.css
    ├── movie_modal.css
    └── navbar.css
```

### Main Files

- `pages/index.html` — Homepage and trending movies.
- `pages/find_movies.html` — Movie search and recommendation interface.
- `pages/about.html` — About page.
- `pages/movie_modal.html` — Reusable movie details popup markup.
- `javascript/index.js` — Homepage interactions and trending movie loading.
- `javascript/find_movies.js` — Search and recommendation workflows.
- `javascript/movie_modal.js` — Movie details popup and related interactions.
- `javascript/navbar.js` — Navigation and theme-related interactions.
- `javascript/footer.js` — Shared footer functionality.
- `stylesheets/` — Page-specific and shared styling.

## 🔌 Backend API

The frontend communicates with a FastAPI backend through HTTP requests.

| Endpoint | Method | Purpose |
|---|---|---|
| `/trending` | POST | Retrieve trending movies |
| `/match_title` | POST | Find matching movie titles |
| `/recommend` | POST | Generate content-based recommendations |
| `/movie_info/{tmdb_id}` | GET | Retrieve movie information using its TMDB ID |

### Title Matching

Example request:

```json
{
  "title": "Inception"
}
```

The API returns matching titles for the user to select.

### Description-Based Recommendations

Example request:

```json
{
  "inp_text": "A science-fiction movie involving dreams and mystery",
  "n_recoms": 20,
  "limit_year": null,
  "by_description": true
}
```

### Title-Based Recommendations

After selecting a matching movie, the frontend submits a recommendation request using the selected title and `by_description: false`.

The exact response fields depend on the backend implementation.

## 🎥 TMDB Integration

CineMatix uses The Movie Database (TMDB) to retrieve supplementary movie information and media.

TMDB integration can provide:
- Posters and backdrop images
- Movie ratings and vote counts
- Genres and release information
- Cast and crew information
- Production details
- Available trailers and additional images

The recommendation system and TMDB serve different purposes: the recommendation pipeline identifies relevant movies, while TMDB supplies supplementary information and artwork.

Some metadata or media may be unavailable for individual movies.

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/saadaliasghar1045-ops/Gamma-Frame-content-based-movie-recommender.git
```

Navigate to the project directory:

```bash
cd Gamma-Frame-content-based-movie-recommender
```

### 2. Run the Frontend

The frontend consists of static HTML, CSS, and JavaScript files.

You can open the pages using a local development server, such as the Live Server extension in Visual Studio Code.

For example, if using a local server, open the homepage at its corresponding local URL.

Because the HTML pages are inside the `pages/` directory, ensure the server and navigation paths point to the correct files.

### 3. Configure the Backend

The frontend requires the FastAPI backend to be running and accessible.

The current development API base URL is:

```javascript
const API_BASE_URL = "http://127.0.0.1:8000";
```

This address works only when the backend is running on the same computer as the browser.

For a deployed frontend, replace it with the public HTTPS URL of your deployed backend.

### 4. Configure CORS

Configure the FastAPI backend to allow requests from the frontend's origin.

For the GitHub Pages deployment, the frontend origin is:

```text
https://saadaliasghar1045-ops.github.io
```

Add the appropriate origin to the existing FastAPI CORS middleware configuration. CORS permission does not make a locally running backend publicly accessible.

### 5. Configure TMDB Credentials

If the backend uses authenticated TMDB API requests, configure the required credentials through environment variables on the backend hosting service.

Do not expose private API credentials in frontend JavaScript or commit secret values to GitHub.

## 🌐 Deployment

### Frontend — GitHub Pages

CineMatix's static frontend can be hosted on GitHub Pages.

Repository:

[Gamma-Frame-content-based-movie-recommender](https://github.com/saadaliasghar1045-ops/Gamma-Frame-content-based-movie-recommender)

The project currently keeps its HTML pages inside `pages/`. Configure the publishing workflow to produce the correct site structure, including the HTML pages and their required `javascript/`, `stylesheets/`, and `assets/` files.

Ensure the published site has an `index.html` at its root and that all relative paths work under the repository's GitHub Pages URL.

### Backend — FastAPI

The backend must be deployed separately to a service that supports Python applications.

After deployment:

1. Obtain the public HTTPS API URL.
2. Update the frontend API base URL.
3. Configure CORS for the deployed frontend origin.
4. Ensure required model artifacts, datasets, and environment variables are available.
5. Test each API endpoint from the live website.

**Current status:** The frontend is being deployed through GitHub Pages, while the FastAPI backend is currently running locally at `127.0.0.1:8000`. Public recommendation functionality requires the backend to be deployed and accessible online.

## 🔮 Future Improvements

Potential improvements include:

- Better recommendation evaluation and relevance testing
- Improved search and filtering options
- More robust API error handling and loading states
- Improved accessibility and keyboard navigation
- Additional movie discovery features
- Production deployment and monitoring
- Further optimization of model artifacts and API response times

## 🎯 Project Goals

CineMatix is a practical project for exploring how machine learning can be integrated into a complete web application.

It brings together content-based recommendation techniques, API development, frontend engineering, external movie metadata, and deployment workflows in one project.

## 📄 License

No license has been specified yet. Add a `LICENSE` file if you intend to publish the project under a particular open-source license.

## 🙌 Acknowledgements

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for movie metadata and media.
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework.
- [GitHub Pages](https://pages.github.com/) for static website hosting.

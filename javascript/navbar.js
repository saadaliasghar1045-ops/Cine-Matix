
const root = document.documentElement;

const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");
const navItems = document.querySelectorAll(".nav-link");

// ---------- Theme switcher ----------

function applyTheme(theme) {
    root.dataset.theme = theme;

    const isDark = theme === "dark";

    themeIcon.textContent = isDark ? "☾" : "☀";
    themeToggle.setAttribute(
        "aria-label",
        isDark ? "Switch to light theme" : "Switch to dark theme"
    );

    document.querySelector('meta[name="theme-color"]')
        .setAttribute("content", isDark ? "#090909" : "#ffffff");
}

// Restore the saved theme when the page loads.
let savedTheme = "dark";

try {
    savedTheme = localStorage.getItem("movie-theme") || "dark";
} catch {
    // The app still works if storage is unavailable.
}

applyTheme(savedTheme);

themeToggle.addEventListener("click", () => {
    const newTheme =
        root.dataset.theme === "dark" ? "light" : "dark";

    applyTheme(newTheme);

    try {
        localStorage.setItem("movie-theme", newTheme);
    } catch {
        // Theme changes still work for the current page.
    }
});

// ---------- Mobile navigation ----------

menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation"
    );
});

// Close the mobile menu when a link is selected.
navItems.forEach((link) => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");

        navItems.forEach((item) => {
            item.classList.remove("active");
        });

        link.classList.add("active");
    });
});

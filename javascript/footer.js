
/* ---------- CineMatix Footer ---------- */

document.addEventListener("DOMContentLoaded", () => {
    const yearElement = document.getElementById("footer-year");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});

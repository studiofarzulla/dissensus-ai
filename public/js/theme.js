/* Shared chrome script — link it in <head> WITHOUT defer on every page.
   Two jobs, both load-bearing:

   1. Adds `js` to <html>. site.css gates the reveal-on-scroll hiding rule on
      html.js, so no-JS visitors get fully visible content. Removing this class
      does not disable the animation — it hides every [data-reveal] element
      permanently. See commit b21d046.
   2. window.toggleNav() for the mobile hamburger (button.nav__burger controls
      #nav-menu), plus Escape to close.

   The theme toggle that used to live here was removed in Aug 2026: the button
   came out of the nav, and the site is now a single light palette with no
   [data-theme] selectors in any stylesheet. The old build persisted a
   `fz-theme` key in localStorage; nothing reads it now, so a returning visitor
   who once chose dark simply gets the light site. */
(function () {
  document.documentElement.classList.add("js");

  /* mobile nav dropdown */
  window.toggleNav = function (btn) {
    var menu = document.getElementById("nav-menu");
    if (!menu) return;
    var open = menu.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  };
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var menu = document.getElementById("nav-menu");
    var btn = document.querySelector(".nav__burger");
    if (menu && menu.classList.contains("is-open")) {
      menu.classList.remove("is-open");
      if (btn) { btn.setAttribute("aria-expanded", "false"); btn.focus(); }
    }
  });
})();

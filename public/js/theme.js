/* Shared theme toggle — light default, dark via [data-theme="dark"], persisted.
   Inline this in <head> (before <body>) on every page to avoid a flash of the wrong theme,
   or link it in <head> without defer. Add a button: <button class="toggle" onclick="toggleTheme()">◐ theme</button>
   Also hosts toggleNav() for the mobile hamburger (button.nav__burger controls #nav-menu). */
(function () {
  /* mark JS as available — site.css gates reveal-on-scroll hiding on html.js
     so no-JS visitors get fully visible content */
  document.documentElement.classList.add("js");
  var KEY = "fz-theme";
  function apply(t) {
    if (t === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#0b0b0d" : "#faf8f5");
  }
  apply(localStorage.getItem(KEY) || "light");
  window.toggleTheme = function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    apply(next);
    localStorage.setItem(KEY, next);
  };

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

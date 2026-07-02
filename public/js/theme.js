/* Shared theme toggle — dark default, light via [data-theme="light"], persisted.
   Inline this in <head> (before <body>) on every page to avoid a flash of the wrong theme,
   or link it in <head> without defer. Add a button: <button class="toggle" onclick="toggleTheme()">◐ theme</button> */
(function () {
  var KEY = "fz-theme";
  function apply(t) {
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }
  apply(localStorage.getItem(KEY) || "dark");
  window.toggleTheme = function () {
    var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    apply(next);
    localStorage.setItem(KEY, next);
  };
})();

/* Shared motion layer — scroll-reveal, scroll-progress, count-up on view.
   Vanilla, zero-dependency. Lifted from the homepage prototype so every page
   inherits the same behaviour. All effects are guarded by prefers-reduced-motion:
   reveals show immediately, the progress bar does not animate, counters snap to
   their target. Requires: <div id="progress"></div> for the progress bar,
   [data-reveal] on elements to reveal, .count[data-to] for count-ups. Any of
   these being absent on a page is fine — the relevant block simply no-ops. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── scroll progress ── */
  var bar = document.getElementById('progress');
  if (bar && !reduce) {
    var onScroll = function () {
      var h = document.documentElement;
      var pct = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      bar.style.width = (pct * 100).toFixed(2) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── reveal engine (staggers siblings sharing a parent) ── */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    if (reduce) {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
      revealEls.forEach(function (el) {
        var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) {
          return c.hasAttribute('data-reveal');
        });
        var idx = sibs.indexOf(el);
        el.style.transitionDelay = (Math.min(idx, 6) * 0.07) + 's';
        io.observe(el);
      });
    }
  }

  /* ── count-ups ── */
  var counters = document.querySelectorAll('.count');
  if (counters.length) {
    var runCount = function (el) {
      var target = parseInt(el.getAttribute('data-to'), 10);
      if (reduce) { el.textContent = target; return; }
      var start = null, dur = 1100;
      var step = function (ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }
})();

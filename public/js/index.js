/* Homepage-only interaction: the moving-optima canvas (#optima). The generic
   scroll polish (reveal, progress bar, count-ups) lives in the shared motion.js.

   The publications ribbon went in Aug 2026 along with the credibility strip's
   duplication of it: the ribbon's ten chips restated the strip's four arXiv IDs,
   its Digital Finance accept and its under-review venues, as an auto-scrolling
   marquee that ran a requestAnimationFrame loop for the life of the page.

   The hero friction-network canvas (#net) was removed in the Aug 2026 diet. It
   recomputed every pairwise distance between up to 60 nodes on every frame —
   ~1,770 distance calculations at 60fps, forever, whether or not the hero was
   on screen — to draw a proximity graph that could have been any lab's. The
   hero's burgundy radial glow in site.css carries the same atmosphere for free.

   Colours here were originally tuned to the dark-mode accent (rgb 192,64,85) and
   have been retuned to the true brand burgundy (rgb 128,0,32), because the dark
   background they were chosen against no longer exists. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LINE = 'rgba(128, 0, 32, 0.55)';
  var DROP = 'rgba(128, 0, 32, 0.16)';
  var DOT = '#800020';
  var GLOW = 'rgba(128, 0, 32, 0.45)';

  /* ── moving optima: the optimum never sits still, the system chases it ── */
  var oc = document.getElementById('optima');
  if (oc) {
    var octx = oc.getContext('2d');
    var ODPR = Math.min(window.devicePixelRatio || 1, 2);
    var ow = 176, oh = 76, pad = 8;
    oc.width = ow * ODPR; oc.height = oh * ODPR; octx.setTransform(ODPR, 0, 0, ODPR, 0, 0);

    function f(x, t) {
      var u = x / ow * Math.PI * 2;
      return 0.5 + 0.30 * Math.sin(u + t) + 0.15 * Math.sin(2.3 * u - 0.7 * t);
    }
    function yPix(v) { return pad + v * (oh - 2 * pad); }
    function argmin(t) {
      var best = 1e9, bx = ow / 2;
      for (var x = pad; x <= ow - pad; x += 2) { var y = f(x, t); if (y < best) { best = y; bx = x; } }
      return bx;
    }
    function drawCurve(t) {
      octx.beginPath();
      for (var x = 0; x <= ow; x += 2) { var y = yPix(f(x, t)); if (x === 0) octx.moveTo(x, y); else octx.lineTo(x, y); }
      octx.strokeStyle = LINE; octx.lineWidth = 1.5; octx.stroke();
    }
    function drawDot(x, t) {
      var dy = yPix(f(x, t));
      octx.beginPath(); octx.moveTo(x, dy + 3); octx.lineTo(x, oh - pad);
      octx.strokeStyle = DROP; octx.lineWidth = 1; octx.stroke();
      octx.beginPath(); octx.arc(x, dy, 3.2, 0, Math.PI * 2);
      octx.fillStyle = DOT; octx.shadowColor = GLOW; octx.shadowBlur = 9;
      octx.fill(); octx.shadowBlur = 0;
    }

    if (reduce) {
      octx.clearRect(0, 0, ow, oh); drawCurve(0); drawDot(argmin(0), 0);
    } else {
      /* Only animate while the canvas is actually on screen. The old build kept
         both hero canvases running for the whole session, including while the
         reader was three sections down. */
      var visible = true, running = false, dotx = ow / 2;
      function oframe(ts) {
        if (!visible) { running = false; return; }
        var t = ts * 0.0007;
        octx.clearRect(0, 0, ow, oh);
        drawCurve(t);
        dotx += (argmin(t) - dotx) * 0.05;   // lag: chasing the moving optimum
        drawDot(dotx, t);
        requestAnimationFrame(oframe);
      }
      function start() { if (!running) { running = true; requestAnimationFrame(oframe); } }
      if (typeof IntersectionObserver === 'function') {
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          if (visible) start();
        }).observe(oc);
      } else {
        start();
      }
      start();
    }
  }

})();

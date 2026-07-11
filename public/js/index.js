/* Homepage-only interactions, ported verbatim from the approved prototype:
   the hero friction-network canvas (#net), the moving-optima canvas (#optima),
   and the draggable/auto-scrolling publications ribbon. The generic scroll
   polish (reveal, progress bar, count-ups) lives in the shared motion.js.
   Canvas colours mirror the dark-mode --accent; they are decorative and tuned
   for the dark default. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── friction-network canvas: agents linked by proximity friction ── */
  var canvas = document.getElementById('net');
  if (canvas && !reduce) {
    var ctx = canvas.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var nodes = [], W = 0, H = 0, LINK = 150;
    function resize() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var count = Math.max(26, Math.min(60, Math.floor(W * H / 16000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
          r: 1.1 + Math.random() * 1.4, ph: Math.random() * Math.PI * 2
        });
      }
    }
    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      }
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var a = nodes[i], b = nodes[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            var base = (1 - d / LINK);
            var pulse = 0.85 + 0.15 * Math.sin(t * 0.0011 + a.ph);
            ctx.strokeStyle = 'rgba(192, 64, 85, ' + (base * 0.22 * pulse).toFixed(3) + ')';
            ctx.lineWidth = base * 1.1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        ctx.fillStyle = 'rgba(192, 64, 85, 0.55)';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
    resize();
    requestAnimationFrame(frame);
  }

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
      octx.strokeStyle = 'rgba(192, 64, 85, 0.5)'; octx.lineWidth = 1.5; octx.stroke();
    }
    function drawDot(x, t) {
      var dy = yPix(f(x, t));
      octx.beginPath(); octx.moveTo(x, dy + 3); octx.lineTo(x, oh - pad);
      octx.strokeStyle = 'rgba(192, 64, 85, 0.16)'; octx.lineWidth = 1; octx.stroke();
      octx.beginPath(); octx.arc(x, dy, 3.2, 0, Math.PI * 2);
      octx.fillStyle = '#d8546c'; octx.shadowColor = 'rgba(192, 64, 85, 0.9)'; octx.shadowBlur = 9;
      octx.fill(); octx.shadowBlur = 0;
    }
    if (reduce) {
      octx.clearRect(0, 0, ow, oh); drawCurve(0); drawDot(argmin(0), 0);
    } else {
      var dotx = ow / 2;
      function oframe(ts) {
        var t = ts * 0.0007;
        octx.clearRect(0, 0, ow, oh);
        drawCurve(t);
        dotx += (argmin(t) - dotx) * 0.05;   // lag: chasing the moving optimum
        drawDot(dotx, t);
        requestAnimationFrame(oframe);
      }
      requestAnimationFrame(oframe);
    }
  }

  /* ── publications ribbon: auto-scroll + drag + click ── */
  var rvp = document.getElementById('ribbon');
  if (rvp) {
    var rtrack = rvp.querySelector('.ribbon-track');
    rtrack.innerHTML += rtrack.innerHTML;                 // duplicate for seamless loop
    var rpos = 0, rspeed = 0.35, rhalf = 0, rpaused = false;
    function rmeasure() { rhalf = rtrack.scrollWidth / 2; }
    rmeasure(); window.addEventListener('resize', rmeasure);
    var rdrag = false, rStartX = 0, rStartPos = 0, rMoved = 0;
    rvp.addEventListener('pointerdown', function (e) {
      rdrag = true; rMoved = 0; rStartX = e.clientX; rStartPos = rpos;
      rvp.classList.add('dragging'); try { rvp.setPointerCapture(e.pointerId); } catch (x) {}
    });
    rvp.addEventListener('pointermove', function (e) {
      if (!rdrag) return; var dx = e.clientX - rStartX;
      rMoved = Math.max(rMoved, Math.abs(dx)); rpos = rStartPos + dx;
    });
    function rend() { rdrag = false; rvp.classList.remove('dragging'); }
    rvp.addEventListener('pointerup', rend);
    rvp.addEventListener('pointercancel', rend);
    rvp.addEventListener('mouseenter', function () { rpaused = true; });
    rvp.addEventListener('mouseleave', function () { rpaused = false; });
    rtrack.addEventListener('click', function (e) { if (rMoved > 6) e.preventDefault(); }, true);
    function rloop() {
      if (!rdrag && !rpaused && !reduce) rpos -= rspeed;
      if (rhalf) { if (rpos <= -rhalf) rpos += rhalf; else if (rpos > 0) rpos -= rhalf; }
      rtrack.style.transform = 'translateX(' + rpos + 'px)';
      requestAnimationFrame(rloop);
    }
    requestAnimationFrame(rloop);
  }
})();

(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Cover art: 1,000 points drifting into a grid (one per migrated user). */
  var c = document.getElementById('cover');
  if (c && c.getContext) {
    var ctx = c.getContext('2d'), N = 1000, pts = [], W, H, dpr, t0 = null;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = c.clientWidth; H = c.clientHeight;
      c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var cols = 50, rows = 20, gx = (W - 64) / (cols - 1), gy = (H - 96) / (rows - 1);
      pts = [];
      for (var i = 0; i < N; i++) {
        var col = i % cols, row = Math.floor(i / cols);
        var r = 0.5 + Math.random() * 0.5, a = Math.random() * Math.PI * 2;
        pts.push({
          sx: W / 2 + Math.cos(a) * r * W * 0.45, sy: H / 2 + Math.sin(a) * r * H * 0.45,
          tx: 32 + col * gx, ty: 32 + row * gy,
          d: (col + row) / (cols + rows), hi: Math.random() < 0.06
        });
      }
    }
    function ease(x) { return 1 - Math.pow(1 - x, 4); }
    function draw(ts) {
      if (t0 === null) t0 = ts;
      var t = reduce ? 1 : Math.min((ts - t0) / 2600, 1);
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i], k = ease(Math.max(0, Math.min(1, t * 1.6 - p.d * 0.6)));
        var x = p.sx + (p.tx - p.sx) * k, y = p.sy + (p.ty - p.sy) * k;
        ctx.fillStyle = p.hi ? 'rgba(122,214,170,' + (0.5 + 0.5 * k) + ')' : 'rgba(255,255,255,' + (0.25 + 0.45 * k) + ')';
        ctx.beginPath(); ctx.arc(x, y, p.hi ? 2.2 : 1.5, 0, 6.2832); ctx.fill();
      }
      if (t < 1) requestAnimationFrame(draw);
    }
    size(); requestAnimationFrame(draw);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); t0 = null; reduce = true; requestAnimationFrame(draw); }, 150); });
  }

  if (!('IntersectionObserver' in window)) return;

  /* Count up key figures */
  var counted = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      counted.unobserve(e.target);
      var el = e.target, to = +el.getAttribute('data-to'), s = null;
      if (reduce) return;
      function step(ts) {
        if (s === null) s = ts;
        var k = Math.min((ts - s) / 1400, 1), v = Math.round(to * (1 - Math.pow(1 - k, 4)));
        el.textContent = v; if (k < 1) requestAnimationFrame(step);
      }
      el.textContent = '0'; requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.count').forEach(function (el) { counted.observe(el); });

  /* Section fade up */
  var rv = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.h2, .card, .rows li, .post, .prose, .contact__h').forEach(function (el) { el.classList.add('rv'); rv.observe(el); });

  /* Word by word quote reveal */
  document.querySelectorAll('.reveal-words').forEach(function (p) {
    var words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    var spans = p.querySelectorAll('.w');
    var wo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        wo.disconnect();
        spans.forEach(function (s, i) { setTimeout(function () { s.classList.add('on'); }, reduce ? 0 : i * 70); });
      });
    }, { threshold: 0.5 });
    wo.observe(p);
  });

  /* Active section in nav */
  var links = {}; document.querySelectorAll('.bar__nav a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var so = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting && links[e.target.id]) {
        Object.keys(links).forEach(function (k) { links[k].classList.remove('is-active'); });
        links[e.target.id].classList.add('is-active');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) so.observe(s); });
})();

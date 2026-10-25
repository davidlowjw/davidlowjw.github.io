(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  document.querySelectorAll('.h2, .card, .rows li, .post, .press, .prose, .contact__h').forEach(function (el) { el.classList.add('rv'); rv.observe(el); });

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
      if (!e.isIntersecting) return;
      Object.keys(links).forEach(function (k) { links[k].classList.remove('is-active'); });
      if (links[e.target.id]) links[e.target.id].classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) so.observe(s); });
  document.querySelectorAll('.hero, .quote, .contact').forEach(function (s) { so.observe(s); });
})();

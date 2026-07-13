/* Lakeview UMC - shared interactions: reveal, parallax, nav */
(function () {
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* mobile menu toggle */
  var menuBtn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { menu.classList.toggle('open'); });
  }

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Scroll reveal */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* 3. Sticky nav condense (runs regardless of motion pref) */
  var nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  if (reduce) return;

  /* 2. Parallax on images */
  var items = [].slice.call(document.querySelectorAll('[data-speed]')).map(function (el) {
    return { el: el, inner: el.querySelector('.media-inner') || el, speed: parseFloat(el.dataset.speed) };
  });
  if (!items.length) return;
  var vh = window.innerHeight, ticking = false;
  function update() {
    ticking = false;
    var mid = vh / 2;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], r = it.el.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) continue;
      var off = (r.top + r.height / 2) - mid;
      it.inner.style.transform = 'translate3d(0,' + (-off * it.speed).toFixed(1) + 'px,0)';
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { vh = window.innerHeight; update(); });
  update();
})();

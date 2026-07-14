/* Lakeview UMC - shared interactions: reveal, parallax, nav, dynamic events */
(function () {
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* mobile menu toggle */
  var menuBtn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { menu.classList.toggle('open'); });
  }

  /* ---------- motion helpers ---------- */
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  }
  function observeReveals(root) {
    var els = (root || document).querySelectorAll('.reveal:not(.in)');
    if (io) { els.forEach(function (el) { io.observe(el); }); }
    else { els.forEach(function (el) { el.classList.add('in'); }); }
  }

  var parallaxItems = [];
  var vh = window.innerHeight, ticking = false;
  function collectParallax() {
    parallaxItems = [].slice.call(document.querySelectorAll('[data-speed]')).map(function (el) {
      return { el: el, inner: el.querySelector('.media-inner') || el, speed: parseFloat(el.dataset.speed) };
    });
  }
  function updateParallax() {
    ticking = false;
    var mid = vh / 2;
    for (var i = 0; i < parallaxItems.length; i++) {
      var it = parallaxItems[i], r = it.el.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) continue;
      var off = (r.top + r.height / 2) - mid;
      it.inner.style.transform = 'translate3d(0,' + (-off * it.speed).toFixed(1) + 'px,0)';
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(updateParallax); } }

  /* ---------- dynamic events on the homepage ---------- */
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m];
    });
  }

  function eventCardHTML(ev) {
    var valid = ev.date instanceof Date && !isNaN(ev.date.getTime());
    var chip = valid
      ? '<div class="m">' + MONTHS[ev.date.getMonth()] + '</div><div class="d">' + ev.date.getDate() + '</div>'
      : '<div class="m">&#9733;</div>';
    var hasImg = ev.image && /^https?:\/\//i.test(ev.image);
    var thumb = hasImg
      ? '<img class="event-thumb" src="' + esc(ev.image) + '" alt="' + esc(ev.title) + '" loading="lazy">'
      : '';
    var href = (ev.link && /^https?:\/\//i.test(ev.link)) ? esc(ev.link) : '#visit';
    var target = href.indexOf('http') === 0 ? ' target="_blank" rel="noopener"' : '';
    var btn = (ev.button && ev.button.trim()) ? esc(ev.button) : 'Details';
    var meta = [ev.time, ev.location].filter(Boolean).map(esc).join(' &middot; ');
    return '<div class="event reveal' + (hasImg ? ' has-img' : '') + '">' +
      '<div class="date-chip">' + chip + '</div>' +
      thumb +
      '<div><h3>' + esc(ev.title) + '</h3>' +
      (meta ? '<p style="color:var(--flame);font-weight:600">' + meta + '</p>' : '') +
      (ev.description ? '<p>' + esc(ev.description) + '</p>' : '') + '</div>' +
      '<a href="' + href + '"' + target + ' class="btn btn-ghost">' + btn + '</a>' +
      '</div>';
  }

  function renderEvents(objs, container) {
    var list = container || document.getElementById('events-list');
    if (!list) return;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var evs = objs.slice();
    if (!window.LV_CONFIG || window.LV_CONFIG.hidePastEvents !== false) {
      evs = evs.filter(function (e) { return !(e.date) || e.date >= now; });
    }
    evs.sort(function (a, b) {
      if (!a.date) return 1; if (!b.date) return -1;
      return a.date - b.date;
    });
    if (!evs.length) {
      list.innerHTML = '<p class="reveal" style="color:var(--muted)">No upcoming events right now - check back soon, or follow us on Facebook for the latest.</p>';
    } else {
      list.innerHTML = evs.map(eventCardHTML).join('');
    }
    collectParallax();
    observeReveals(list);
  }
  window.LakeviewRenderEvents = renderEvents;

  function loadEventsFromSheet() {
    var list = document.getElementById('events-list');
    if (!list || !window.LV) return;
    LV.fetchEvents().then(function (objs) {
      if (objs && objs.length) renderEvents(objs, list);
    }).catch(function (err) {
      console.warn('Lakeview: could not load events from sheet -', err.message);
    });
  }

  /* ---------- boot ---------- */
  observeReveals(document);

  var nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  if (!reduce) {
    collectParallax();
    if (parallaxItems.length) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', function () { vh = window.innerHeight; updateParallax(); });
      updateParallax();
    }
  }

  loadEventsFromSheet();
})();

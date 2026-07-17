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

  /* mobile: tap "Ministries" to expand/collapse its submenu instead of navigating */
  var ministriesToggle = document.querySelector('.nav-item > a');
  if (ministriesToggle) {
    ministriesToggle.addEventListener('click', function (e) {
      if (window.matchMedia('(max-width: 860px)').matches) {
        e.preventDefault();
        ministriesToggle.parentElement.classList.toggle('open');
      }
    });
  }

  /* ---------- night mode toggle ---------- */
  (function () {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
    var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
    function effective() {
      var a = document.documentElement.getAttribute('data-theme');
      return a || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    function paint() {
      var dark = effective() === 'dark';
      btn.innerHTML = dark ? SUN : MOON;
      btn.setAttribute('aria-label', dark ? 'Switch to day mode' : 'Switch to night mode');
      btn.setAttribute('title', dark ? 'Day mode' : 'Night mode');
      var logo = document.querySelector('.brand img.mark');
      if (logo) logo.src = dark ? 'images/umc-logo-white.png' : 'images/umc-logo.png';
    }
    paint();
    btn.addEventListener('click', function () {
      var next = effective() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('lv-theme', next); } catch (e) { }
      paint();
    });
  })();

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
    var meta = [ev.whenLabel, ev.time, ev.location].filter(Boolean).map(esc).join(' &middot; ');
    return '<div class="event reveal' + (hasImg ? ' has-img' : '') + '">' +
      '<div class="date-chip">' + chip + '</div>' +
      thumb +
      '<div>' +
      (ev.category ? '<p class="eyebrow" style="margin-bottom:5px">' + esc(ev.category) + '</p>' : '') +
      '<h3>' + esc(ev.title) + '</h3>' +
      (meta ? '<p style="color:var(--flame);font-weight:600">' + meta + '</p>' : '') +
      (ev.description ? '<p>' + esc(ev.description) + '</p>' : '') + '</div>' +
      '</div>';
  }

  function renderEvents(objs, container, limit) {
    var list = container || document.getElementById('events-list');
    if (!list) return;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var evs = objs.slice();
    if (!window.LV_CONFIG || window.LV_CONFIG.hidePastEvents !== false) {
      evs = evs.filter(function (e) { return !(e.date) || e.date >= now; });
    }
    evs.sort(function (a, b) {          // nearest date first
      if (!a.date) return 1; if (!b.date) return -1;
      return a.date - b.date;
    });
    if (limit && limit > 0) evs = evs.slice(0, limit);
    if (!evs.length) {
      list.innerHTML = '<p class="reveal" style="color:var(--muted)">No upcoming events right now - check back soon, or follow us on Facebook for the latest.</p>';
    } else {
      list.innerHTML = evs.map(eventCardHTML).join('');
    }
    collectParallax();
    observeReveals(list);
  }
  window.LakeviewRenderEvents = renderEvents;

  /* ---------- photos from the Google Sheet ---------- */
  function setPhoto(el, urls, alt) {
    if (typeof urls === 'string') urls = [urls];
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.innerHTML = '';
    var imgs = urls.map(function (u, idx) {
      var img = document.createElement('img');
      img.src = u;
      img.alt = alt || '';
      img.loading = idx === 0 ? 'eager' : 'lazy';
      img.className = 'kenburns slide' + (idx === 0 ? ' active' : '');
      el.appendChild(img);
      return img;
    });
    var box = el.parentElement; // hide any placeholder label in the same media box
    if (box) { var lbl = box.querySelector(':scope > span'); if (lbl) lbl.style.display = 'none'; }
    if (imgs.length > 1 && !reduce) {
      var i = 0;
      setInterval(function () {
        imgs[i].classList.remove('active');
        i = (i + 1) % imgs.length;
        imgs[i].classList.add('active');
      }, 5000);
    }
  }

  function pageFile() {
    return (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function loadPhotosFromSheet() {
    if (!window.LV || !LV.fetchPhotos) return;
    var slots = document.querySelectorAll('[data-photo]');
    if (!slots.length) return;
    var here = pageFile();
    LV.fetchPhotos().then(function (rows) {
      if (!rows) return;
      var map = {};
      rows.forEach(function (r) {
        if (!r.url) return;
        var rf = (r.location.split('/').pop() || 'index.html').toLowerCase();
        if (rf && rf !== here) return; // rows with no location apply anywhere
        // one cell may hold several links (newline/comma separated); rows also stack
        var urls = r.url.split(/[\r\n,]+/).map(function (s) { return s.trim(); })
          .filter(Boolean).map(LV.toImageUrl);
        if (!urls.length) return;
        map[r.placeholder] = (map[r.placeholder] || []).concat(urls);
      });
      slots.forEach(function (el) {
        var key = (el.getAttribute('data-photo') || '').trim();
        if (map[key] && map[key].length) setPhoto(el, map[key], el.getAttribute('data-photo-alt'));
      });
    }).catch(function (err) {
      console.warn('Lakeview: could not load photos from sheet -', err.message);
    });
  }

  function loadEventsFromSheet() {
    var list = document.getElementById('events-list');
    if (!list || !window.LV) return;
    LV.fetchEvents().then(function (objs) {
      if (objs && objs.length) {
        // each event once, at its next occurrence; nearest 5
        renderEvents(LV.prepareList(objs, new Date()), list, 5);
      }
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

  loadPhotosFromSheet();
  loadEventsFromSheet();
})();

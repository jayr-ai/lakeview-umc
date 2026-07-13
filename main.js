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

  /* ---------- motion helpers (declared here, called after render) ---------- */
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

  /* ---------- dynamic events from Google Sheet ---------- */
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  function parseCSV(text) {
    var rows = [], row = [], field = '', i = 0, inQ = false;
    while (i < text.length) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += c; i++; continue;
      } else {
        if (c === '"') { inQ = true; i++; continue; }
        if (c === ',') { row.push(field); field = ''; i++; continue; }
        if (c === '\r') { i++; continue; }
        if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
        field += c; i++; continue;
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
  }

  function rowsToObjects(rows) {
    if (!rows.length) return [];
    var headers = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      headers.forEach(function (h, idx) { o[h] = (r[idx] || '').trim(); });
      return o;
    }).filter(function (o) { return (o.title || '') !== ''; });
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m];
    });
  }

  function eventCardHTML(ev) {
    var d = new Date(ev.date);
    var valid = !isNaN(d.getTime());
    var chip = valid
      ? '<div class="m">' + MONTHS[d.getMonth()] + '</div><div class="d">' + d.getDate() + '</div>'
      : '<div class="m">&#9733;</div>';
    var hasImg = ev.image && /^https?:\/\//i.test(ev.image);
    var thumb = hasImg
      ? '<img class="event-thumb" src="' + esc(ev.image) + '" alt="' + esc(ev.title) + '" loading="lazy">'
      : '';
    var href = (ev.link && /^https?:\/\//i.test(ev.link)) ? esc(ev.link) : '#visit';
    var target = href.indexOf('http') === 0 ? ' target="_blank" rel="noopener"' : '';
    var btn = (ev.button && ev.button.trim()) ? esc(ev.button) : 'Details';
    return '<div class="event reveal' + (hasImg ? ' has-img' : '') + '">' +
      '<div class="date-chip">' + chip + '</div>' +
      thumb +
      '<div><h3>' + esc(ev.title) + '</h3>' + (ev.description ? '<p>' + esc(ev.description) + '</p>' : '') + '</div>' +
      '<a href="' + href + '"' + target + ' class="btn btn-ghost">' + btn + '</a>' +
      '</div>';
  }

  // exposed for testing / manual render
  function renderEvents(objs, container) {
    var list = container || document.getElementById('events-list');
    if (!list) return;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var evs = objs.slice();
    if (window.LV_CONFIG && window.LV_CONFIG.hidePastEvents) {
      evs = evs.filter(function (e) {
        var d = new Date(e.date);
        return isNaN(d.getTime()) ? true : d >= now;
      });
    }
    evs.sort(function (a, b) {
      var da = new Date(a.date), db = new Date(b.date);
      if (isNaN(da)) return 1; if (isNaN(db)) return -1;
      return da - db;
    });
    if (!evs.length) {
      list.innerHTML = '<p class="reveal" style="color:var(--muted)">No upcoming events right now - check back soon, or follow us on Facebook for the latest.</p>';
    } else {
      list.innerHTML = evs.map(eventCardHTML).join('');
    }
    collectParallax();
    observeReveals(list);
  }
  window.LakeviewRenderEvents = renderEvents; // for manual testing

  function loadEventsFromSheet() {
    var cfg = window.LV_CONFIG || {};
    var list = document.getElementById('events-list');
    if (!list || !cfg.sheetId) return; // no sheet configured -> keep static fallback
    var url = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(cfg.sheetId) +
      '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(cfg.eventsTab || 'Events');
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (text) {
        var objs = rowsToObjects(parseCSV(text));
        if (objs.length) renderEvents(objs, list);
      })
      .catch(function (err) {
        // On any failure, silently keep the built-in fallback events.
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

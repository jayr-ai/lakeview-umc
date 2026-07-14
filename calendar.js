/* Lakeview UMC - Calendar page. Month/Week views + agenda, driven by the Google Sheet. */
(function () {
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  var view = 'month';
  var cursor = startOfDay(new Date());
  var selected = startOfDay(new Date());
  var EVENTS = [];

  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  function eventsOn(day) {
    var t = startOfDay(day).getTime();
    return EVENTS.filter(function (e) {
      if (!e.date) return false;
      var s = startOfDay(e.date).getTime();
      var en = e.endDate ? startOfDay(e.endDate).getTime() : s;
      return t >= s && t <= en;
    });
  }

  /* ---------- month view ---------- */
  function monthHTML() {
    var y = cursor.getFullYear(), m = cursor.getMonth();
    var first = new Date(y, m, 1);
    var offset = first.getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var cells = Math.ceil((offset + daysInMonth) / 7) * 7;
    var start = new Date(y, m, 1 - offset);
    var today = startOfDay(new Date());
    var html = DOW.map(function (d) { return '<div class="cal-dow">' + d + '</div>'; }).join('');
    for (var i = 0; i < cells; i++) {
      var cur = new Date(start); cur.setDate(start.getDate() + i);
      var evs = eventsOn(cur);
      var cls = 'cal-cell';
      if (cur.getMonth() !== m) cls += ' other';
      if (sameDay(cur, today)) cls += ' today';
      if (selected && sameDay(cur, selected)) cls += ' selected';
      var chips = evs.slice(0, 2).map(function (e) {
        return '<div class="cal-chip">' + esc(e.title) + '</div>';
      }).join('');
      if (evs.length > 2) chips += '<div class="cal-more">+' + (evs.length - 2) + ' more</div>';
      var dots = evs.slice(0, 5).map(function () { return '<span class="cal-dot"></span>'; }).join('');
      html += '<button class="' + cls + '" data-date="' + iso(cur) + '">' +
        '<div class="cal-daynum">' + cur.getDate() + '</div>' +
        chips +
        '<div class="cal-dots">' + dots + '</div>' +
        '</button>';
    }
    return '<div class="cal-grid">' + html + '</div>';
  }

  /* ---------- week view ---------- */
  function weekHTML() {
    var ws = new Date(cursor); ws.setDate(cursor.getDate() - cursor.getDay());
    var today = startOfDay(new Date());
    var cards = '';
    for (var i = 0; i < 7; i++) {
      var d = new Date(ws); d.setDate(ws.getDate() + i);
      var evs = eventsOn(d);
      var body = evs.length
        ? evs.map(function (e) {
            var meta = e.time ? ' <span style="opacity:.8">' + esc(e.time) + '</span>' : '';
            return '<div class="cal-wchip">' + esc(e.title) + meta + '</div>';
          }).join('')
        : '<div class="cal-wempty">No events</div>';
      cards += '<button class="cal-wday' + (sameDay(d, today) ? ' today' : '') + '" data-date="' + iso(d) + '">' +
        '<div class="wd-head">' + DOW[d.getDay()] + '</div>' +
        '<div class="wd-num">' + d.getDate() + '</div>' + body + '</button>';
    }
    return '<div class="cal-week">' + cards + '</div>';
  }

  /* ---------- selected day detail ---------- */
  function dayDetailHTML() {
    var d = selected || startOfDay(new Date());
    var evs = eventsOn(d);
    var head = '<div class="dd-date">' + DOW[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate() + '</div>';
    if (!evs.length) {
      return '<div class="day-detail">' + head + '<h3>No events this day</h3>' +
        '<p class="muted" style="margin-top:6px">Pick another day, or scroll down for everything coming up.</p></div>';
    }
    var items = evs.map(function (e) {
      var meta = [e.time, e.location].filter(Boolean).map(esc).join(' &middot; ');
      var link = (e.link && /^https?:\/\//i.test(e.link))
        ? ' <a href="' + esc(e.link) + '" target="_blank" rel="noopener" style="color:var(--flame);font-weight:600">Details &#8594;</a>' : '';
      return '<li><span class="bullet"></span><div><b>' + esc(e.title) + '</b>' +
        (meta ? '<span class="muted">' + meta + '</span>' : '') +
        (e.description ? '<span class="muted">' + esc(e.description) + '</span>' : '') +
        link + '</div></li>';
    }).join('');
    return '<div class="day-detail">' + head +
      '<h3>' + evs.length + (evs.length === 1 ? ' event' : ' events') + '</h3><ul>' + items + '</ul></div>';
  }

  /* ---------- agenda: today through end of 3rd month ---------- */
  function renderAgenda() {
    var host = document.getElementById('cal-agenda');
    if (!host) return;
    var today = startOfDay(new Date());
    var windowEnd = new Date(today.getFullYear(), today.getMonth() + 3, 0); // last day of +2 month
    var subset = EVENTS.filter(function (e) {
      if (!e.date) return false;
      var end = e.endDate || e.date;
      return startOfDay(end) >= today && startOfDay(e.date) <= windowEnd;
    }).sort(function (a, b) { return a.date - b.date; });

    if (!subset.length) {
      host.innerHTML = '<p style="color:var(--muted)">No events in the next three months yet. Add them to the Google Sheet and they will show up here automatically.</p>';
      return;
    }
    // group by month
    var groups = {}, order = [];
    subset.forEach(function (e) {
      var key = MON[e.date.getMonth()] + ' ' + e.date.getFullYear();
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(e);
    });
    var html = order.map(function (key) {
      return '<h3 class="month-label">' + key + '</h3><div class="agenda-group"></div>';
    }).join('');
    host.innerHTML = html;
    // fill each group using the shared homepage card renderer for identical styling
    var groupEls = host.querySelectorAll('.agenda-group');
    order.forEach(function (key, idx) {
      if (window.LakeviewRenderEvents) window.LakeviewRenderEvents(groups[key], groupEls[idx]);
    });
  }

  /* ---------- render ---------- */
  function render() {
    var title = document.getElementById('cal-title');
    if (view === 'month') {
      title.textContent = MON[cursor.getMonth()] + ' ' + cursor.getFullYear();
    } else {
      var ws = new Date(cursor); ws.setDate(cursor.getDate() - cursor.getDay());
      var we = new Date(ws); we.setDate(ws.getDate() + 6);
      title.textContent = MON[ws.getMonth()].slice(0, 3) + ' ' + ws.getDate() + ' - ' +
        MON[we.getMonth()].slice(0, 3) + ' ' + we.getDate();
    }
    document.getElementById('seg-month').classList.toggle('active', view === 'month');
    document.getElementById('seg-week').classList.toggle('active', view === 'week');
    document.getElementById('cal-body').innerHTML = view === 'month' ? monthHTML() : weekHTML();
    document.getElementById('cal-daydetail').innerHTML = dayDetailHTML();
    renderAgenda();
  }

  /* ---------- controls ---------- */
  function wire() {
    document.getElementById('seg-month').addEventListener('click', function () { view = 'month'; render(); });
    document.getElementById('seg-week').addEventListener('click', function () { view = 'week'; render(); });
    document.getElementById('cal-prev').addEventListener('click', function () {
      if (view === 'month') cursor.setMonth(cursor.getMonth() - 1); else cursor.setDate(cursor.getDate() - 7);
      render();
    });
    document.getElementById('cal-next').addEventListener('click', function () {
      if (view === 'month') cursor.setMonth(cursor.getMonth() + 1); else cursor.setDate(cursor.getDate() + 7);
      render();
    });
    document.getElementById('cal-todaybtn').addEventListener('click', function () {
      cursor = startOfDay(new Date()); selected = startOfDay(new Date()); render();
    });
    document.getElementById('cal-body').addEventListener('click', function (e) {
      var cell = e.target.closest('[data-date]');
      if (!cell) return;
      selected = fromIso(cell.getAttribute('data-date'));
      render();
    });
  }

  function sampleEvents() {
    var t = startOfDay(new Date());
    function mk(off, title, desc, time) {
      var d = new Date(t); d.setDate(t.getDate() + off);
      return { date: d, endDate: null, title: title, description: desc || '', time: time || '', location: '', image: '', link: '', button: '' };
    }
    return [
      mk(1, 'Sunday Worship', 'Come as you are.', '9:00 AM'),
      mk(1, 'Connect Groups', 'Late morning.', '11:00 AM'),
      mk(6, 'Youth Night', 'Games, worship, and real talk.', '6:00 PM'),
      mk(12, 'Community Feeding Program', 'Serving meals across Lipa City.'),
      mk(19, 'Leaders Planning Meeting', 'Monthly ministry planning.'),
      mk(33, 'Baptism Sunday', 'Celebrating new life in Christ.'),
      mk(47, 'Family Fellowship', 'Food and fun for the whole church.'),
      mk(68, 'Community Outreach Day', 'Serving nearby barangays.')
    ];
  }

  wire();
  (window.LV ? LV.fetchEvents() : Promise.resolve(null))
    .then(function (objs) { EVENTS = (objs && objs.length) ? objs : sampleEvents(); render(); })
    .catch(function () { EVENTS = sampleEvents(); render(); });
})();

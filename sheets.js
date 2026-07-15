/* Lakeview UMC - shared Google Sheet data layer.
   Used by both the homepage events list and the calendar page. */
window.LV = (function () {

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
    });
  }

  function parseDate(s) {
    if (!s) return null;
    s = String(s).trim();
    var d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    d = new Date(s.replace(/-/g, ' ')); // handles "Jul-18-2026"
    return isNaN(d.getTime()) ? null : d;
  }

  function normalize(o) {
    var date = o['event date'] || o.date;
    return {
      dateRaw: date || '',
      date: parseDate(date),
      endDate: parseDate(o['end'] || o['enddate'] || o['end date']),
      time: o['event start time'] || o.time || '',
      title: o['event title'] || o.title || '',
      category: o['event name'] || o.category || '',
      description: o['event description'] || o.description || '',
      image: o.image || '',
      link: o.link || '',
      button: o.button || '',
      location: o['event location'] || o.location || '',
      published: (o['published'] || o['publish'] || '').trim(),
      repeat: (o['repeat'] || o['recurring'] || o['recurrence'] || '').trim(),
      repeatUntil: parseDate(o['repeat until'] || o['recurring until'] || o['until'])
    };
  }

  /* ---------- recurrence + multi-day helpers ---------- */
  var DOW = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2,
    wed: 3, weds: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4,
    fri: 5, friday: 5, sat: 6, saturday: 6 };
  var MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function stripTime(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

  function recurrence(ev) {
    var r = (ev.repeat || '').toLowerCase();
    if (!r) return null;
    var days = [];
    (r.match(/[a-z]+/g) || []).forEach(function (w) {
      if (DOW.hasOwnProperty(w) && days.indexOf(DOW[w]) < 0) days.push(DOW[w]);
    });
    if (days.length) return { type: 'weeklyDays', days: days };
    if (r.indexOf('dai') > -1) return { type: 'daily' };
    if (r.indexOf('month') > -1) return { type: 'monthly' };
    if (r.indexOf('week') > -1 || r.indexOf('recur') > -1 || r === 'yes' || r === 'y') return { type: 'weekly' };
    return null;
  }

  // Does this event happen on the given day? (handles multi-day span + recurrence)
  function occursOn(ev, day) {
    if (!ev.date) return false;
    var d = stripTime(day), start = stripTime(ev.date);
    var rec = recurrence(ev);
    if (!rec) {
      var end = ev.endDate ? stripTime(ev.endDate) : start;
      return d >= start && d <= end;
    }
    if (d < start) return false;
    if (ev.repeatUntil && d > stripTime(ev.repeatUntil)) return false;
    if (rec.type === 'daily') return true;
    if (rec.type === 'weekly') return d.getDay() === start.getDay();
    if (rec.type === 'weeklyDays') return rec.days.indexOf(d.getDay()) > -1;
    if (rec.type === 'monthly') return d.getDate() === start.getDate();
    return false;
  }

  // Next date on/after `from` that this event occurs (or null if none upcoming)
  function nextOccurrence(ev, from) {
    from = stripTime(from || new Date());
    var rec = recurrence(ev);
    if (!rec) {
      var st = stripTime(ev.date), en = ev.endDate ? stripTime(ev.endDate) : st;
      return en >= from ? st : null; // upcoming or currently running
    }
    var start = stripTime(ev.date);
    var d = new Date(Math.max(start.getTime(), from.getTime()));
    var until = ev.repeatUntil ? stripTime(ev.repeatUntil) : null;
    for (var g = 0; g < 500; g++, d.setDate(d.getDate() + 1)) {
      if (until && d > until) return null;
      if (occursOn(ev, d)) return new Date(d);
    }
    return null;
  }

  function recurrenceLabel(ev) {
    var rec = recurrence(ev);
    if (!rec) return null;
    if (rec.type === 'daily') return 'Every day';
    if (rec.type === 'weekly') return 'Every ' + DAY3[stripTime(ev.date).getDay()];
    if (rec.type === 'weeklyDays') return 'Every ' + rec.days.slice().sort().map(function (i) { return DAY3[i]; }).join(' & ');
    if (rec.type === 'monthly') return 'Monthly';
    return null;
  }

  function rangeLabel(ev) {
    if (!ev.endDate) return null;
    var s = stripTime(ev.date), e = stripTime(ev.endDate);
    if (e <= s) return null;
    if (s.getMonth() === e.getMonth()) return MON3[s.getMonth()] + ' ' + s.getDate() + '-' + e.getDate();
    return MON3[s.getMonth()] + ' ' + s.getDate() + ' - ' + MON3[e.getMonth()] + ' ' + e.getDate();
  }

  // For list views: each event once, dated at its next occurrence, with a "when" label.
  function prepareList(events, from) {
    from = stripTime(from || new Date());
    var out = [];
    (events || []).forEach(function (ev) {
      var nd = nextOccurrence(ev, from);
      if (!nd) return;
      var c = {}; for (var k in ev) c[k] = ev[k];
      c.date = nd;
      c.whenLabel = recurrenceLabel(ev) || rangeLabel(ev) || '';
      out.push(c);
    });
    out.sort(function (a, b) { return a.date - b.date; });
    return out;
  }

  // Resolves to an array of normalized events, or null when no sheet is configured
  // (null tells callers to use their built-in fallback content).
  function fetchEvents() {
    var cfg = window.LV_CONFIG || {};
    if (!cfg.sheetId) return Promise.resolve(null);
    var base = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(cfg.sheetId) + '/gviz/tq?tqx=out:csv&';
    var url = base + (cfg.eventsGid != null && cfg.eventsGid !== ''
      ? 'gid=' + encodeURIComponent(cfg.eventsGid)
      : 'sheet=' + encodeURIComponent(cfg.eventsTab || 'Events')) + '&_=' + Date.now();
    return fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (t) {
        return rowsToObjects(parseCSV(t)).map(normalize).filter(function (e) {
          // Only rows explicitly marked Published = YES (column G) go live.
          return e.title && /^\s*yes\s*$/i.test(e.published);
        });
      });
  }

  // Convert a Google Drive share link into a directly-embeddable image URL.
  // Leaves normal http(s) image URLs untouched.
  function toImageUrl(u) {
    if (!u) return '';
    var m = u.match(/\/d\/([-\w]+)/) || u.match(/[?&]id=([-\w]+)/);
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1600';
    return u;
  }

  function fetchTabByGid(gid) {
    var cfg = window.LV_CONFIG || {};
    if (!cfg.sheetId || !gid) return Promise.resolve(null);
    var url = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(cfg.sheetId) +
      '/gviz/tq?tqx=out:csv&gid=' + encodeURIComponent(gid) + '&_=' + Date.now();
    return fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (t) { return rowsToObjects(parseCSV(t)); });
  }

  // Resolves to [{placeholder, type, location, url}] or null when not configured.
  function fetchPhotos() {
    var cfg = window.LV_CONFIG || {};
    return fetchTabByGid(cfg.photosGid).then(function (rows) {
      if (!rows) return null;
      return rows.map(function (o) {
        return {
          placeholder: (o.placeholder || '').trim(),
          type: (o.type || '').trim(),
          location: (o['current location'] || '').trim(),
          url: (o['replace with this photo'] || '').trim()
        };
      });
    });
  }

  return {
    parseCSV: parseCSV,
    rowsToObjects: rowsToObjects,
    parseDate: parseDate,
    normalize: normalize,
    fetchEvents: fetchEvents,
    fetchPhotos: fetchPhotos,
    toImageUrl: toImageUrl,
    occursOn: occursOn,
    nextOccurrence: nextOccurrence,
    recurrenceLabel: recurrenceLabel,
    rangeLabel: rangeLabel,
    prepareList: prepareList
  };
})();

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
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function normalize(o) {
    return {
      dateRaw: o.date || '',
      date: parseDate(o.date),
      endDate: parseDate(o['end'] || o['enddate'] || o['end date']),
      time: o.time || '',
      title: o.title || '',
      description: o.description || '',
      image: o.image || '',
      link: o.link || '',
      button: o.button || '',
      location: o.location || ''
    };
  }

  // Resolves to an array of normalized events, or null when no sheet is configured
  // (null tells callers to use their built-in fallback content).
  function fetchEvents() {
    var cfg = window.LV_CONFIG || {};
    if (!cfg.sheetId) return Promise.resolve(null);
    var url = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(cfg.sheetId) +
      '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(cfg.eventsTab || 'Events');
    return fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (t) {
        return rowsToObjects(parseCSV(t)).map(normalize).filter(function (e) { return e.title; });
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
      '/gviz/tq?tqx=out:csv&gid=' + encodeURIComponent(gid);
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
    toImageUrl: toImageUrl
  };
})();

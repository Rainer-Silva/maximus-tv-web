/* Maximus TV v0.4 — Xtream Codes client with search. ES5 for older Samsung/LG TVs. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var LS = 'mtv_cfg';
  var TTL = 12 * 3600 * 1000;
  var PAGE = 120;
  var cfg = null;          // {server, backup, user, pass, adult}
  var data = { live: null, vod: null, series: null };
  var cats = { live: null, vod: null, series: null };
  var state = { tab: 'live', cat: null, shown: 0, items: [], sfilter: 'all', stack: [], f: { live: {}, vod: {}, series: {} } };
  var DIMS = [['cn', 'Continent'], ['co', 'Country'], ['la', 'Language'], ['ty', 'Type']];
  var hls = null;

  /* ---------- storage ---------- */
  function loadCfg() { try { return JSON.parse(localStorage.getItem(LS)); } catch (e) { return null; } }
  function saveCfg() { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {} }
  var idb = null;
  function db() {
    if (idb) return idb;
    idb = new Promise(function (res) {
      if (!window.indexedDB) return res(null);
      var r = indexedDB.open('mtv', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { res(null); };
    });
    return idb;
  }
  function cacheGet(k) {
    return db().then(function (d) {
      if (!d) return null;
      return new Promise(function (res) {
        var q = d.transaction('kv').objectStore('kv').get(k);
        q.onsuccess = function () { var v = q.result; res(v && Date.now() - v.t < TTL ? v.v : null); };
        q.onerror = function () { res(null); };
      });
    });
  }
  function cachePut(k, v) {
    return db().then(function (d) {
      if (!d) return;
      try { d.transaction('kv', 'readwrite').objectStore('kv').put({ t: Date.now(), v: v }, k); } catch (e) {}
    });
  }
  function cacheClear() {
    return db().then(function (d) { if (d) try { d.transaction('kv', 'readwrite').objectStore('kv').clear(); } catch (e) {} });
  }

  /* ---------- API ---------- */
  function trimUrl(s) { return (s || '').replace(/\s+/g, '').replace(/\/+$/, ''); }
  function getJSON(url, timeout) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.timeout = timeout || 120000;
      x.onload = function () {
        if (x.status !== 200) return rej(new Error('HTTP ' + x.status));
        try { res(JSON.parse(x.responseText)); } catch (e) { rej(new Error('Bad response')); }
      };
      x.onerror = function () { rej(new Error('Network error')); };
      x.ontimeout = function () { rej(new Error('Timeout')); };
      x.send();
    });
  }
  function apiUrl(server, action, extra) {
    return server + '/player_api.php?username=' + encodeURIComponent(cfg.user) +
      '&password=' + encodeURIComponent(cfg.pass) + (action ? '&action=' + action : '') + (extra || '');
  }
  function api(action, extra, timeout) {
    return getJSON(apiUrl(cfg.server, action, extra), timeout).catch(function (e) {
      if (!cfg.backup || cfg.backup === cfg.server) throw e;
      return getJSON(apiUrl(cfg.backup, action, extra), timeout).then(function (r) {
        var t = cfg.server; cfg.server = cfg.backup; cfg.backup = t; saveCfg(); // switch to working server
        return r;
      });
    });
  }
  var ACT = { live: ['get_live_categories', 'get_live_streams'], vod: ['get_vod_categories', 'get_vod_streams'], series: ['get_series_categories', 'get_series'] };
  function slim(type, a) {
    var out = new Array(a.length);
    for (var i = 0; i < a.length; i++) {
      var s = a[i];
      out[i] = {
        id: type === 'series' ? s.series_id : s.stream_id,
        n: s.name || '',
        c: String(s.category_id),
        p: s.stream_icon || s.cover || '',
        x: s.container_extension || '',
        r: s.rating || '',
        a: s.is_adult == 1 ? 1 : 0,
        g: type === 'series' ? (s.genre || '') : ''
      };
    }
    return out;
  }
  function ensure(type) {
    if (data[type]) return Promise.resolve();
    var key = cfg.user + '@v2@' + type;
    return cacheGet(key).then(function (hit) {
      if (hit) { cats[type] = hit.cats; data[type] = hit.items; indexFor(type); return; }
      return Promise.all([api(ACT[type][0]), api(ACT[type][1], '', 240000)]).then(function (r) {
        cats[type] = (r[0] || []).map(function (c) { return { id: String(c.category_id), n: c.category_name || '' }; });
        data[type] = slim(type, r[1] || []);
        indexFor(type);
        cachePut(key, { cats: cats[type], items: data[type] });
      });
    });
  }
  var ADULT_RE = /adult|xxx|18\+|porn/i;
  var adultCats = { live: {}, vod: {}, series: {} };
  function indexFor(type) {
    var ac = adultCats[type] = {};
    cats[type].forEach(function (c) { if (ADULT_RE.test(c.n)) ac[c.id] = 1; });
    var K = window.MTVClassify, ctags = {};
    cats[type].forEach(function (c) { var t = K.classifyCat(c.n, type); t.cn = K.continents(t.co); ctags[c.id] = t; });
    var none = { co: [], la: [], ty: [], cn: [] };
    var d = data[type];
    for (var i = 0; i < d.length; i++) {
      var it = d[i], ct = ctags[it.c] || none;
      it.k = norm(it.n);
      var x = K.classifyItem(it.n, type, ct, it.g);
      if (x) { x.cn = K.continents(x.co); it.t = x; } else it.t = ct;
    }
  }
  function visible(type, it) { return cfg.adult || (!it.a && !adultCats[type][it.c]); }

  function streamUrl(type, id, ext) {
    var u = encodeURIComponent(cfg.user), p = encodeURIComponent(cfg.pass);
    if (type === 'live') return cfg.server + '/live/' + u + '/' + p + '/' + id + '.m3u8';
    if (type === 'vod') return cfg.server + '/movie/' + u + '/' + p + '/' + id + '.' + (ext || 'mp4');
    return cfg.server + '/series/' + u + '/' + p + '/' + id + '.' + (ext || 'mp4');
  }

  /* ---------- helpers ---------- */
  function norm(s) {
    s = String(s || '').toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/[^a-z0-9åäöæø+ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function show(id, on) { $(id).classList[on ? 'remove' : 'add']('hidden'); }

  /* ---------- login ---------- */
  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var c = { server: trimUrl($('l-server').value), backup: trimUrl($('l-backup').value), user: $('l-user').value.trim(), pass: $('l-pass').value, adult: false };
    if (!/^https?:\/\//.test(c.server)) c.server = (location.protocol === 'https:' ? 'https://' : 'http://') + c.server;
    if (c.backup && !/^https?:\/\//.test(c.backup)) c.backup = 'http://' + c.backup;
    $('l-err').textContent = 'Connecting…';
    cfg = c;
    api('', '', 20000).then(function (r) {
      if (!r || !r.user_info || r.user_info.auth == 0) throw new Error('Wrong username or password');
      saveCfg();
      $('l-err').textContent = '';
      start(r);
    }).catch(function (err) { cfg = null; $('l-err').textContent = 'Could not connect: ' + err.message; });
  });

  function start(info) {
    show('login', false); show('main', true);
    if (info) renderAcct(info); else api('', '', 20000).then(renderAcct).catch(function () {});
    $('s-adult').checked = !!cfg.adult;
    setTab('live');
  }
  function renderAcct(r) {
    var u = r.user_info || {};
    var exp = u.exp_date ? new Date(u.exp_date * 1000).toISOString().slice(0, 10) : '—';
    $('acct').innerHTML = 'User <b>' + esc(cfg.user) + '</b> · ' + esc(u.status || '') + ' · expires ' + exp +
      ' · max connections ' + esc(u.max_connections || '?') + '<br>Server ' + esc(cfg.server);
  }

  /* ---------- tabs / browse ---------- */
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('.tab'); if (b) setTab(b.getAttribute('data-tab')); });
  function setTab(t) {
    state.tab = t;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === t); });
    show('browse', t === 'live' || t === 'vod' || t === 'series');
    show('search', t === 'search');
    show('settings', t === 'settings');
    if (t === 'search') { setTimeout(function () { $('q').focus(); }, 50); preloadAll(); return; }
    if (t === 'settings') return;
    $('cats').innerHTML = ''; $('grid').innerHTML = ''; $('fbar').innerHTML = '';
    $('status').textContent = 'Loading… (first time can take up to a minute)';
    ensure(t).then(function () { if (state.tab === t) renderCats(t); })
      .catch(function (e) { $('status').textContent = 'Could not load: ' + e.message; });
  }
  /* ---------- filters (continent / country / language / type) ---------- */
  function active(t) { var f = state.f[t], n = 0; for (var k in f) if (f[k]) n++; return n; }
  function matchF(t, it, skip) {
    var f = state.f[t], tg = it.t;
    for (var i = 0; i < DIMS.length; i++) {
      var d = DIMS[i][0];
      if (d === skip || !f[d]) continue;
      if (!tg || tg[d].indexOf(f[d]) < 0) return false;
    }
    return true;
  }
  function label(d, v) { return d === 'co' ? (window.MTVClassify.COUNTRIES[v] || [v])[0] : v; }
  function renderFbar(t) {
    var bar = $('fbar'); bar.innerHTML = '';
    DIMS.forEach(function (D) {
      var v = state.f[t][D[0]];
      var b = el('button', 'f fbtn' + (v ? ' on' : ''), esc(D[1]) + ': <b>' + esc(v ? label(D[0], v) : 'Any') + '</b> ▾');
      b.onclick = function () { openFacet(t, D[0], D[1]); };
      bar.appendChild(b);
    });
    if (active(t)) { var c = el('button', 'f fbtn clear', '✕ Clear filters'); c.onclick = function () { state.f[t] = {}; renderCats(t); }; bar.appendChild(c); }
  }
  function openFacet(t, d, title) {
    var counts = {}, d0 = data[t];
    for (var i = 0; i < d0.length; i++) {
      var it = d0[i];
      if (!visible(t, it) || !matchF(t, it, d)) continue;
      var vals = it.t ? it.t[d] : [];
      for (var j = 0; j < vals.length; j++) counts[vals[j]] = (counts[vals[j]] || 0) + 1;
    }
    var keys = Object.keys(counts).filter(function (k) { return cfg.adult || k !== 'Adult'; }).sort(function (a, b) { return counts[b] - counts[a]; });
    $('f-title').textContent = title;
    var box = $('f-opts'); box.innerHTML = '';
    var cur = state.f[t][d];
    var any = el('button', 'f chip' + (!cur ? ' on' : ''), 'Any'); any.onclick = function () { pickFacet(t, d, null); }; box.appendChild(any);
    keys.forEach(function (k) {
      var b = el('button', 'f chip' + (cur === k ? ' on' : ''), esc(label(d, k)) + ' <span class="cnt">' + counts[k] + '</span>');
      b.onclick = function () { pickFacet(t, d, k); };
      box.appendChild(b);
    });
    if (!keys.length) box.appendChild(el('div', 'status', 'No options with the current filters.'));
    show('fpanel', true);
    setTimeout(function () { (box.querySelector('.chip.on') || any).focus(); }, 30);
  }
  function pickFacet(t, d, v) {
    state.f[t][d] = v;
    if (d === 'cn' && v && state.f[t].co) { var cc = window.MTVClassify.COUNTRIES[state.f[t].co]; if (!cc || cc[2] !== v) state.f[t].co = null; }
    show('fpanel', false);
    renderCats(t);
    setTimeout(function () { var b = $('fbar').children[DIMS.map(function (x) { return x[0]; }).indexOf(d)]; if (b) b.focus(); }, 30);
  }
  $('f-close').onclick = function () { show('fpanel', false); };

  function renderCats(t) {
    renderFbar(t);
    var box = $('cats'); box.innerHTML = '';
    var filt = active(t), cnt = {};
    if (filt) data[t].forEach(function (it) { if (visible(t, it) && matchF(t, it)) cnt[it.c] = (cnt[it.c] || 0) + 1; });
    var list = [{ id: '*', n: 'All' }].concat(cats[t].filter(function (c) { return (cfg.adult || !adultCats[t][c.id]) && (!filt || cnt[c.id]); }));
    list.forEach(function (c) {
      var b = el('button', 'f cat', esc(c.n) + (filt && c.id !== '*' ? ' <span class="cnt">' + cnt[c.id] + '</span>' : '')); b.setAttribute('data-id', c.id);
      b.onclick = function () { pickCat(t, c.id); };
      box.appendChild(b);
    });
    pickCat(t, filt || list.length < 2 ? '*' : list[1].id);
  }
  function pickCat(t, id) {
    state.cat = id;
    Array.prototype.forEach.call($('cats').children, function (b) { b.classList.toggle('on', b.getAttribute('data-id') === id); });
    state.items = data[t].filter(function (it) { return (id === '*' || it.c === id) && visible(t, it) && matchF(t, it); });
    state.shown = 0; $('grid').innerHTML = '';
    $('status').textContent = state.items.length ? state.items.length + ' items' : 'Nothing here.';
    renderMore(t, $('grid'), state);
    $('grid-wrap').scrollTop = 0;
  }
  function renderMore(t, grid, st) {
    var old = grid.querySelector('.more'); if (old) old.parentNode.removeChild(old);
    var end = Math.min(st.items.length, st.shown + PAGE);
    var frag = document.createDocumentFragment();
    for (var i = st.shown; i < end; i++) frag.appendChild(card(st.items[i].type || t, st.items[i]));
    st.shown = end; grid.appendChild(frag);
    if (end < st.items.length) {
      var m = el('button', 'f btn ghost more', 'Show more (' + (st.items.length - end) + ' left)');
      m.onclick = function () { renderMore(t, grid, st); };
      grid.appendChild(m);
    }
  }
  function card(type, it) {
    var b = el('button', 'f item ' + type);
    var img = el('div', 'img', it.p ? '' : esc(type === 'live' ? 'LIVE' : 'NO IMAGE'));
    if (it.p) img.style.backgroundImage = 'url("' + it.p.replace(/"/g, '%22') + '")';
    b.appendChild(img);
    b.appendChild(el('div', 't', esc(it.n)));
    var meta = type === 'live' ? 'Live' : type === 'vod' ? 'Movie' : 'Series';
    if (it.r && it.r !== '0') meta += ' · ★ ' + esc(String(it.r).slice(0, 3));
    b.appendChild(el('div', 'm', meta));
    b.onclick = function () { open(type, it); };
    return b;
  }
  function open(type, it) {
    if (type === 'series') return openSeries(it);
    play(streamUrl(type, it.id, it.x), it.n);
  }

  /* ---------- search ---------- */
  function preloadAll() {
    $('sres').innerHTML = '<div class="status">Loading catalogue for search…</div>';
    Promise.all([ensure('live'), ensure('vod'), ensure('series')]).then(runSearch)
      .catch(function (e) { $('sres').innerHTML = '<div class="status">Could not load: ' + esc(e.message) + '</div>'; });
  }
  var sTimer = null;
  $('q').addEventListener('input', function () { clearTimeout(sTimer); sTimer = setTimeout(runSearch, 250); });
  $('sfilter').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    state.sfilter = b.getAttribute('data-f');
    Array.prototype.forEach.call($('sfilter').children, function (c) { c.classList.toggle('on', c === b); });
    runSearch();
  });
  function searchType(type, terms, limit) {
    var d = data[type]; if (!d) return [];
    var starts = [], rest = [];
    for (var i = 0; i < d.length; i++) {
      var it = d[i], k = it.k, ok = true;
      for (var j = 0; j < terms.length; j++) if (k.indexOf(terms[j]) < 0) { ok = false; break; }
      if (!ok || !visible(type, it)) continue;
      (k.indexOf(terms[0]) === 0 ? starts : rest).push(it);
      if (starts.length >= limit) break;
    }
    return starts.concat(rest).slice(0, limit);
  }
  function runSearch() {
    var q = norm($('q').value), box = $('sres');
    if (q.length < 2) { box.innerHTML = '<div class="status">Type at least 2 letters.</div>'; return; }
    var terms = q.split(' ');
    var groups = [['live', 'Live TV'], ['vod', 'Movies'], ['series', 'Series']];
    var limit = state.sfilter === 'all' ? 30 : 300;
    box.innerHTML = '';
    var total = 0;
    groups.forEach(function (g) {
      if (state.sfilter !== 'all' && state.sfilter !== g[0]) return;
      var r = searchType(g[0], terms, limit);
      if (!r.length) return;
      total += r.length;
      box.appendChild(el('h3', '', g[1] + ' (' + r.length + (r.length >= limit ? '+' : '') + ')'));
      var grid = el('div', 'grid');
      r.forEach(function (it) { grid.appendChild(card(g[0], it)); });
      box.appendChild(grid);
    });
    if (!total) box.innerHTML = '<div class="status">No results for “' + esc($('q').value) + '”.</div>';
  }

  /* ---------- series ---------- */
  function openSeries(it) {
    show('detail', true);
    $('d-title').textContent = it.n; $('d-plot').textContent = 'Loading…';
    $('d-img').src = it.p || ''; $('d-seasons').innerHTML = ''; $('d-eps').innerHTML = '';
    setTimeout(function () { $('d-close').focus(); }, 30);
    api('get_series_info', '&series_id=' + it.id).then(function (r) {
      $('d-plot').textContent = (r.info && r.info.plot) || '';
      var eps = r.episodes || {};
      var seasons = Object.keys(eps).sort(function (a, b) { return a - b; });
      if (!seasons.length) { $('d-plot').textContent += ' (No episodes found.)'; return; }
      seasons.forEach(function (s, i) {
        var b = el('button', 'f chip', 'Season ' + esc(s));
        b.onclick = function () {
          Array.prototype.forEach.call($('d-seasons').children, function (c) { c.classList.toggle('on', c === b); });
          var box = $('d-eps'); box.innerHTML = '';
          eps[s].forEach(function (ep) {
            var e = el('button', 'f ep', 'E' + esc(ep.episode_num) + ' · ' + esc(ep.title || ''));
            e.onclick = function () { play(streamUrl('series', ep.id, ep.container_extension), it.n + ' · S' + s + 'E' + ep.episode_num); };
            box.appendChild(e);
          });
        };
        $('d-seasons').appendChild(b);
        if (i === 0) b.click();
      });
    }).catch(function (e) { $('d-plot').textContent = 'Could not load: ' + e.message; });
  }
  $('d-close').onclick = function () { show('detail', false); };

  /* ---------- player ---------- */
  var video = $('video');
  function stop() {
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
    try { video.pause(); } catch (e) {}
    video.removeAttribute('src'); try { video.load(); } catch (e) {}
  }
  function play(url, title) {
    stop();
    show('player', true);
    $('p-title').textContent = title; $('p-msg').textContent = '';
    var isHls = /\.m3u8(\?|$)/.test(url);
    var native = video.canPlayType('application/vnd.apple.mpegurl');
    if (isHls && !native && window.Hls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(url); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function () { video.play().catch(function () {}); });
      hls.on(Hls.Events.ERROR, function (ev, d) { if (d && d.fatal) $('p-msg').textContent = 'Stream failed (' + d.details + '). If another device is watching, stop it first (1 connection).'; });
    } else {
      video.src = url;
      video.play().catch(function () {});
    }
    setTimeout(function () { $('p-close').focus(); }, 30);
  }
  video.addEventListener('error', function () {
    var ext = (video.currentSrc || '').split('.').pop();
    $('p-msg').textContent = 'Cannot play this ' + (/mkv|avi/i.test(ext) ? ext.toUpperCase() + ' file on this device' : 'stream') + '. If another device is watching, stop it first (1 connection).';
  });
  function closePlayer() { stop(); show('player', false); }
  $('p-close').onclick = closePlayer;

  /* ---------- settings ---------- */
  $('s-adult').onchange = function () { cfg.adult = this.checked; saveCfg(); };
  $('s-refresh').onclick = function () { data = { live: null, vod: null, series: null }; cacheClear().then(function () { setTab('live'); }); };
  $('s-logout').onclick = function () { localStorage.removeItem(LS); cacheClear(); location.reload(); };

  /* ---------- TV remote: spatial navigation + back ---------- */
  try {
    if (window.tizen && tizen.tvinputdevice) ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop', 'ChannelUp', 'ChannelDown'].forEach(function (k) { try { tizen.tvinputdevice.registerKey(k); } catch (e) {} });
  } catch (e) {}
  function focusables() {
    var root = !$('player').classList.contains('hidden') ? $('player') : !$('fpanel').classList.contains('hidden') ? $('fpanel') : !$('detail').classList.contains('hidden') ? $('detail') : document;
    return Array.prototype.filter.call(root.querySelectorAll('.f'), function (n) { return n.offsetParent !== null || n === video; });
  }
  function move(dir) {
    var cur = document.activeElement, list = focusables();
    if (!cur || list.indexOf(cur) < 0) { if (list[0]) list[0].focus(); return; }
    var a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, best = null, bd = 1e9;
    list.forEach(function (n) {
      if (n === cur) return;
      var b = n.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2, dx = bx - ax, dy = by - ay;
      var ok = dir === 'L' ? dx < -2 && b.right <= a.left + 4 : dir === 'R' ? dx > 2 && b.left >= a.right - 4 : dir === 'U' ? dy < -2 && b.bottom <= a.top + 4 : dy > 2 && b.top >= a.bottom - 4;
      if (!ok) return;
      var horiz = dir === 'L' || dir === 'R';
      var overlap = horiz ? (b.top < a.bottom && b.bottom > a.top) : (b.left < a.right && b.right > a.left);
      var d = (horiz ? Math.abs(dx) + Math.abs(dy) * 3 : Math.abs(dy) + Math.abs(dx) * 3) + (overlap ? 0 : 100000);
      if (horiz && !overlap && n.closest && n.closest('header') && !cur.closest('header')) d += 100000;
      if (d < bd) { bd = d; best = n; }
    });
    if (best) { best.focus(); if (best.scrollIntoView) best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  function back() {
    if (!$('player').classList.contains('hidden')) return closePlayer(), true;
    if (!$('fpanel').classList.contains('hidden')) return show('fpanel', false), true;
    if (!$('detail').classList.contains('hidden')) return show('detail', false), true;
    if (state.tab !== 'live' && cfg) return setTab('live'), true;
    return false;
  }
  document.addEventListener('keydown', function (e) {
    var k = e.keyCode, typing = document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.type !== 'checkbox';
    if (k === 10009 || k === 461 || k === 27 || (k === 8 && !typing)) {
      if (back()) { e.preventDefault(); return; }
      if (k === 10009 && window.tizen) { try { tizen.application.getCurrentApplication().exit(); } catch (x) {} }
      return;
    }
    if (k === 10252 || k === 415 || k === 19) { if (video.paused) video.play(); else video.pause(); return; }
    var dir = { 37: 'L', 38: 'U', 39: 'R', 40: 'D' }[k];
    if (!dir) return;
    if (typing && (dir === 'L' || dir === 'R')) return;
    if (document.activeElement === video && (dir === 'L' || dir === 'R')) { video.currentTime += dir === 'R' ? 30 : -10; e.preventDefault(); return; }
    e.preventDefault(); move(dir);
  });

  /* ---------- boot ---------- */
  cfg = loadCfg();
  if (cfg && cfg.user) start(null); else setTimeout(function () { $('l-user').focus(); }, 50);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();

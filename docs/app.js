/* Maximus TV v0.6 — Xtream + M3U client, profiles, favourites, resume, settings. ES5 for older TVs.
   Everything is stored locally on this device (localStorage + IndexedDB). No backend. */
(function () {
  'use strict';
  var VERSION = '0.6.4';
  var $ = function (id) { return document.getElementById(id); };
  var TTL = 12 * 3600 * 1000, PAGE = 120;
  var EMOJI = ['🙂', '😎', '🦁', '🐼', '🦊', '🐸', '🚀', '⚽', '🎮', '🎬', '🌟', '👑', '🐱', '🐶', '🌈', '🍿'];
  var COLORS = ['#e11d2e', '#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#0891b2', '#db2777', '#57534e'];
  var LANG_OPTS = [['', 'Default'], ['sv', 'Swedish'], ['en', 'English'], ['pt', 'Portuguese'], ['es', 'Spanish'], ['de', 'German'], ['fr', 'French'], ['ar', 'Arabic'], ['it', 'Italian'], ['no', 'Norwegian'], ['da', 'Danish'], ['fi', 'Finnish'], ['off', 'Off (subtitles)']];
  var LANG_NAMES = { sv: 'swe|swedish|svenska', en: 'eng|english', pt: 'por|portug', es: 'spa|spanish|español|espanol', de: 'ger|deu|german|deutsch', fr: 'fra|fre|french|français', ar: 'ara|arabic', it: 'ita|italian', no: 'nor|nob|norw', da: 'dan|danish|dansk', fi: 'fin|finnish|suomi' };

  /* ---------- storage ---------- */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function ssGet(k, d) { try { var v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var DEFAULTS = { startTab: 'home', hideAdult: true, parentalPin: '', audioLang: '', subLang: '', format: 'm3u8', buffer: 30, epgOffset: 0, theme: 'dark', remember: true };
  var settings = (function () { var s = lsGet('mtv_settings', {}), o = {}; for (var k in DEFAULTS) o[k] = s.hasOwnProperty(k) ? s[k] : DEFAULTS[k]; return o; })();
  function saveSettings() { lsSet('mtv_settings', settings); }
  // sources: persisted in localStorage when "remember" is on, otherwise sessionStorage only
  function loadSources() { return settings.remember ? lsGet('mtv_sources', []) : ssGet('mtv_sources', []); }
  function saveSources() {
    if (settings.remember) { lsSet('mtv_sources', sources); try { sessionStorage.removeItem('mtv_sources'); } catch (e) {} }
    else { ssSet('mtv_sources', sources); try { localStorage.removeItem('mtv_sources'); } catch (e) {} }
  }
  var sources = loadSources();
  var activeId = lsGet('mtv_active', null);
  var profiles = lsGet('mtv_profiles', []);
  var profile = null, pdata = null;
  var adultUnlocked = false;
  function src() { for (var i = 0; i < sources.length; i++) if (sources[i].id === activeId) return sources[i]; return sources[0] || null; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function loadPdata(p) {
    var d = lsGet('mtv_pd_' + p.id, {}); d.fav = d.fav || {}; d.resume = d.resume || {}; d.recent = d.recent || [];
    if (!d.later) { d.later = {}; Object.keys(d.fav).forEach(function (k) { var f = d.fav[k]; if (f.type !== 'live') { d.later[k] = f; delete d.fav[k]; } }); }
    return d;
  }
  function savePdata() { if (profile) lsSet('mtv_pd_' + profile.id, pdata); }

  var idb = null;
  function db() {
    if (idb) return idb;
    idb = new Promise(function (res) {
      if (!window.indexedDB) return res(null);
      var r; try { r = indexedDB.open('mtv', 1); } catch (e) { return res(null); }
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { res(null); };
    });
    return idb;
  }
  function idbGet(k, ttl) {
    return db().then(function (d) {
      if (!d) return null;
      return new Promise(function (res) {
        try {
          var q = d.transaction('kv').objectStore('kv').get(k);
          q.onsuccess = function () { var v = q.result; res(v && (!ttl || Date.now() - v.t < ttl) ? v.v : null); };
          q.onerror = function () { res(null); };
        } catch (e) { res(null); }
      });
    });
  }
  function idbPut(k, v) { return db().then(function (d) { if (d) try { d.transaction('kv', 'readwrite').objectStore('kv').put({ t: Date.now(), v: v }, k); } catch (e) {} }); }
  function idbDel(k) { return db().then(function (d) { if (d) try { d.transaction('kv', 'readwrite').objectStore('kv').delete(k); } catch (e) {} }); }
  function idbClearCatalogue() {
    return db().then(function (d) {
      if (!d) return;
      return new Promise(function (res) {
        try {
          var st = d.transaction('kv', 'readwrite').objectStore('kv'), q = st.openCursor();
          q.onsuccess = function () { var c = q.result; if (!c) return res(); if (String(c.key).indexOf('cat:') === 0) c.delete(); c.continue(); };
          q.onerror = function () { res(); };
        } catch (e) { res(); }
      });
    });
  }

  /* ---------- helpers ---------- */
  function norm(s) {
    s = String(s || '').toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/[^a-z0-9åäöæø+ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function show(id, on) { $(id).classList[on ? 'remove' : 'add']('hidden'); }
  function isShown(id) { return !$(id).classList.contains('hidden'); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function trimUrl(s) { s = (s || '').replace(/\s+/g, '').replace(/\/+$/, ''); if (s && !/^https?:\/\//i.test(s)) s = (location.protocol === 'https:' ? 'https://' : 'http://') + s; return s; }
  function fmtTime(sec) { sec = Math.floor(sec || 0); var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function focusLater(e) { setTimeout(function () { if (e && e.focus) e.focus(); }, 40); }
  function applyTheme() { document.body.className = 'theme-' + settings.theme; }
  function adultHidden() { return (profile && profile.kids) || (settings.hideAdult && !adultUnlocked); }

  /* ---------- modal (PIN / confirm) ---------- */
  var modalCb = null;
  function modal(opts) {
    return new Promise(function (resolve) {
      $('m-title').textContent = opts.title || ''; $('m-text').textContent = opts.text || ''; $('m-err').textContent = '';
      var inp = $('m-input'); inp.value = ''; show('m-input', !!opts.pin);
      $('m-ok').textContent = opts.ok || 'OK';
      show('modal', true);
      modalCb = function (ok) {
        if (ok && opts.pin && opts.check && !opts.check(inp.value)) { $('m-err').textContent = 'Wrong PIN'; inp.value = ''; inp.focus(); return; }
        if (ok && opts.pin && opts.minLen && inp.value.length < opts.minLen) { $('m-err').textContent = 'Use at least ' + opts.minLen + ' digits'; return; }
        show('modal', false); modalCb = null; resolve(ok ? (opts.pin ? inp.value : true) : null);
      };
      focusLater(opts.pin ? inp : $('m-ok'));
    });
  }
  $('m-ok').onclick = function () { if (modalCb) modalCb(true); };
  $('m-cancel').onclick = function () { if (modalCb) modalCb(false); };
  $('m-input').addEventListener('keydown', function (e) { if (e.keyCode === 13 && modalCb) { e.preventDefault(); modalCb(true); } });
  function askPin(title, pin) { return modal({ title: title, text: 'Enter PIN', pin: true, check: function (v) { return v === pin; } }); }

  /* ---------- network ---------- */
  function getText(url, timeout) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest();
      x.open('GET', url, true); x.timeout = timeout || 120000;
      x.onload = function () { if (x.status >= 200 && x.status < 300) res(x.responseText); else rej(new Error('HTTP ' + x.status)); };
      x.onerror = function () { rej(new Error('Network error (check the address; an https page cannot load http links)')); };
      x.ontimeout = function () { rej(new Error('Timeout')); };
      x.send();
    });
  }
  function getJSON(url, timeout) { return getText(url, timeout).then(function (t) { try { return JSON.parse(t); } catch (e) { throw new Error('Bad response'); } }); }
  function apiUrl(s, server, action, extra) {
    return server + '/player_api.php?username=' + encodeURIComponent(s.user) + '&password=' + encodeURIComponent(s.pass) + (action ? '&action=' + action : '') + (extra || '');
  }
  function api(action, extra, timeout, s) {
    s = s || src();
    return getJSON(apiUrl(s, s.server, action, extra), timeout).catch(function (e) {
      if (!s.backup || s.backup === s.server) throw e;
      return getJSON(apiUrl(s, s.backup, action, extra), timeout).then(function (r) { var t = s.server; s.server = s.backup; s.backup = t; saveSources(); return r; });
    });
  }

  /* ---------- catalogue ---------- */
  var data, cats, adultCats, seriesEps;
  function resetData() { data = { live: null, vod: null, series: null }; cats = { live: null, vod: null, series: null }; adultCats = { live: {}, vod: {}, series: {} }; seriesEps = {}; dimOpts = {}; m3uLoading = null; }
  resetData();
  var ACT = { live: ['get_live_categories', 'get_live_streams'], vod: ['get_vod_categories', 'get_vod_streams'], series: ['get_series_categories', 'get_series'] };
  function slimX(type, a) {
    var out = new Array(a.length);
    for (var i = 0; i < a.length; i++) {
      var s = a[i];
      out[i] = { id: String(type === 'series' ? s.series_id : s.stream_id), n: s.name || '', c: String(s.category_id), p: s.stream_icon || s.cover || '', x: s.container_extension || '', r: s.rating || '', a: s.is_adult == 1 ? 1 : 0, g: type === 'series' ? (s.genre || '') : '', d: s.added || s.last_modified || '' };
    }
    return out;
  }
  function ensure(type) {
    var s = src(); if (!s) return Promise.reject(new Error('No IPTV source configured'));
    if (data[type]) return Promise.resolve();
    if (s.type !== 'xtream') return ensureM3U(s);
    var key = 'cat:' + s.id + ':' + type + ':2';
    return idbGet(key, TTL).then(function (hit) {
      if (hit) { cats[type] = hit.cats; data[type] = hit.items; indexFor(type); return; }
      return Promise.all([api(ACT[type][0]), api(ACT[type][1], '', 240000)]).then(function (r) {
        cats[type] = (r[0] || []).map(function (c) { return { id: String(c.category_id), n: c.category_name || '' }; });
        data[type] = slimX(type, r[1] || []);
        indexFor(type);
        idbPut(key, { cats: cats[type], items: data[type] });
      });
    });
  }
  /* M3U: parse #EXTINF lines; group-title = category; tvg-logo; tvg-name. Episodes grouped into series by "S01 E02". */
  var m3uLoading = null;
  function ensureM3U(s) {
    if (m3uLoading) return m3uLoading;
    var key = 'cat:' + s.id + ':m3u';
    m3uLoading = idbGet(key, s.type === 'file' ? 0 : TTL).then(function (hit) {
      if (hit) return hit;
      var get = s.type === 'file' ? idbGet('file:' + s.id, 0).then(function (t) { if (!t) throw new Error('Playlist file not found on this device. Upload it again in Settings.'); return t; }) : getText(s.url, 300000);
      return get.then(function (text) { var p = parseM3U(text); idbPut(key, p); return p; });
    }).then(function (p) {
      ['live', 'vod', 'series'].forEach(function (t) { cats[t] = p.cats[t]; data[t] = p.items[t]; indexFor(t); });
      seriesEps = p.eps;
    });
    m3uLoading.catch(function () { m3uLoading = null; });
    return m3uLoading;
  }
  function attr(line, name) { var m = line.match(new RegExp(name + '="([^"]*)"', 'i')); return m ? m[1] : ''; }
  function parseM3U(text) {
    var lines = text.split(/\r?\n/), cats = { live: [], vod: [], series: [] }, catIdx = { live: {}, vod: {}, series: {} };
    var items = { live: [], vod: [], series: [] }, eps = {}, seriesIdx = {}, info = null, n = 0, run = null, runN = 0;
    function catId(t, name) { name = name || 'Uncategorised'; if (!catIdx[t][name]) { catIdx[t][name] = t[0] + (cats[t].length + 1); cats[t].push({ id: catIdx[t][name], n: name }); } return catIdx[t][name]; }
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (L.indexOf('#EXTINF') === 0) { info = L; continue; }
      if (!L || L.charAt(0) === '#' || !info) continue;
      var url = L.trim(), comma = info.lastIndexOf('",'), name = info.slice(info.indexOf(',', comma > 0 ? comma + 1 : info.indexOf(' ')) + 1).trim();
      if (comma > 0) name = info.slice(comma + 2).trim();
      var tn = attr(info, 'tvg-name') || name, logo = attr(info, 'tvg-logo'), grp = attr(info, 'group-title');
      var type = /\/series\//i.test(url) ? 'series' : /\/movie\//i.test(url) || /\.(mp4|mkv|avi|mov)(\?|$)/i.test(url) ? 'vod' : 'live';
      var ext = (url.match(/\.([a-z0-9]{2,4})(\?|$)/i) || [])[1] || '';
      var adult = /adult|xxx|18\+/i.test(grp) ? 1 : 0;
      n++;
      if (type === 'series') {
        var m = tn.match(/^(.*?)[\s._-]*S([0-9Oo]{1,2})[\s._-]*E(\d{1,3})/i), cid = catId('series', grp), sname, sk;
        var m2 = !m && tn.match(/^(?:EP|E|Episode)\s*(\d{1,3})\b/i);
        if (m) { sname = m[1].replace(/[\s-]+$/, '').trim() || grp; sk = cid + '|' + sname; run = null; }
        else if (m2) {
          if (!run || run.cid !== cid || +m2[1] <= run.last) { runN++; run = { cid: cid, key: cid + '|#run' + runN, name: (grp || 'Series') + ' · untitled ' + runN, last: 0 }; }
          run.last = +m2[1]; sname = run.name; sk = run.key; m = [0, 0, 1, m2[1]];
        } else { sname = tn; sk = cid + '|' + sname; run = null; }
        if (!seriesIdx[sk]) { seriesIdx[sk] = 'm' + n; items.series.push({ id: 'm' + n, n: sname, c: cid, p: logo, x: '', r: '', a: adult, g: '' }); eps['m' + n] = []; }
        eps[seriesIdx[sk]].push({ id: 'e' + n, s: m ? +String(m[2]).replace(/o/ig, '0') || 1 : 1, e: m ? +m[3] : eps[seriesIdx[sk]].length + 1, t: tn, u: url, x: ext });
      } else {
        items[type].push({ id: 'm' + n, n: tn, c: catId(type, grp), p: logo, x: ext, r: '', a: adult, g: '', u: url });
      }
      info = null;
    }
    if (!n) throw new Error('No channels found in this playlist');
    return { cats: cats, items: items, eps: eps };
  }
  var ADULT_RE = /adult|xxx|18\+|porn/i;
  function indexFor(type) {
    var ac = adultCats[type] = {};
    var K = window.MTVClassify, ctags = {};
    cats[type].forEach(function (c) { if (ADULT_RE.test(c.n)) ac[c.id] = 1; var t = K.classifyCat(c.n, type); t.cn = K.continents(t.co); ctags[c.id] = t; });
    var none = { co: [], la: [], ty: [], cn: [] }, d = data[type];
    for (var i = 0; i < d.length; i++) {
      var it = d[i], ct = ctags[it.c] || none;
      it.k = norm(it.n);
      var x = K.classifyItem(it.n, type, ct, it.g);
      if (x) { x.cn = K.continents(x.co); it.t = x; } else it.t = ct;
    }
  }
  function visible(type, it) { return !adultHidden() || (!it.a && !adultCats[type][it.c]); }

  function streamUrl(type, it) {
    if (it.u) return it.u;
    var s = src(), u = encodeURIComponent(s.user), p = encodeURIComponent(s.pass);
    if (type === 'live') return s.server + '/live/' + u + '/' + p + '/' + it.id + '.' + (settings.format === 'ts' ? 'ts' : 'm3u8');
    if (type === 'vod') return s.server + '/movie/' + u + '/' + p + '/' + it.id + '.' + (it.x || 'mp4');
    return s.server + '/series/' + u + '/' + p + '/' + it.id + '.' + (it.x || 'mp4');
  }
  function ikey(type, id) { return (src() ? src().id : '') + ':' + type + ':' + id; }

  /* ---------- source form (Xtream / M3U link / file) ---------- */
  var formKind = 'xtream', editingSrc = null;
  $('src-kind').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (b) setKind(b.getAttribute('data-k')); });
  function setKind(k) {
    formKind = k;
    each($('src-kind').children, function (c) { c.classList.toggle('on', c.getAttribute('data-k') === k); });
    each(document.querySelectorAll('#src-form [data-for]'), function (d) { d.classList.toggle('hidden', d.getAttribute('data-for') !== k); });
    $('s-save').textContent = k === 'file' ? 'Upload & connect' : 'Connect';
  }
  function openSourceForm(existing) {
    editingSrc = existing || null;
    $('s-err').textContent = '';
    $('s-remember').checked = settings.remember;
    $('login-sub').textContent = existing ? 'Edit IPTV source' : sources.length ? 'Add another IPTV source' : 'Add your IPTV service to get started.';
    $('s-name').value = existing ? existing.name || '' : '';
    if (existing) {
      setKind(existing.type);
      if (existing.type === 'xtream') { $('s-server').value = existing.server; $('s-backup').value = existing.backup || ''; $('s-user').value = existing.user; $('s-pass').value = existing.pass; }
      if (existing.type === 'm3u') { $('s-url').value = existing.url; $('s-epg').value = existing.epg || ''; }
    } else { setKind('xtream'); $('s-user').value = ''; $('s-pass').value = ''; $('s-url').value = ''; $('s-epg').value = ''; }
    show('s-cancel', sources.length > 0);
    show('main', false); show('login', true);
    focusLater(existing ? $('s-name') : $('s-user'));
  }
  $('s-cancel').onclick = function () { show('login', false); show('main', true); setTab('settings'); };
  $('src-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('s-err'), s = { id: editingSrc ? editingSrc.id : uid(), name: $('s-name').value.trim(), type: formKind };
    settings.remember = $('s-remember').checked; saveSettings();
    var p;
    if (formKind === 'm3u') {
      var url = $('s-url').value.trim();
      if (!/^https?:\/\//i.test(url)) { err.textContent = 'Enter a link starting with http:// or https://'; return; }
      var m = url.match(/^(https?:\/\/[^\/]+)\/get\.php\?(.*)$/i);
      var q = m ? m[2] : '', u = (q.match(/username=([^&]+)/) || [])[1], pw = (q.match(/password=([^&]+)/) || [])[1];
      if (m && u && pw) { s.type = 'xtream'; s.server = m[1]; s.backup = ''; s.user = decodeURIComponent(u); s.pass = decodeURIComponent(pw); }
      else { s.url = url; s.epg = $('s-epg').value.trim(); }
    }
    if (s.type === 'xtream') {
      if (formKind === 'xtream') { s.server = trimUrl($('s-server').value); s.backup = trimUrl($('s-backup').value); s.user = $('s-user').value.trim(); s.pass = $('s-pass').value; }
      if (!s.server || !s.user || !s.pass) { err.textContent = 'Server, username and password are required.'; return; }
      err.textContent = 'Connecting…';
      p = api('', '', 20000, s).then(function (r) { if (!r || !r.user_info || r.user_info.auth == 0) throw new Error('Wrong username or password'); s.name = s.name || 'Xtream · ' + s.user; });
    } else if (s.type === 'm3u') {
      err.textContent = 'Downloading playlist… (large lists can take a minute)';
      p = getText(s.url, 300000).then(function (t) { var parsed = parseM3U(t); idbPut('cat:' + s.id + ':m3u', parsed); s.name = s.name || 'M3U · ' + s.url.replace(/^https?:\/\//, '').split('/')[0]; });
    } else {
      var f = $('s-file').files && $('s-file').files[0];
      if (!f && editingSrc) p = Promise.resolve();
      else if (!f) { err.textContent = 'Choose a playlist file first.'; return; }
      else {
        err.textContent = 'Reading file…';
        p = new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = function () { rej(new Error('Could not read the file')); }; r.readAsText(f); })
          .then(function (t) { var parsed = parseM3U(t); s.name = s.name || 'File · ' + f.name; return idbPut('file:' + s.id, t).then(function () { return idbPut('cat:' + s.id + ':m3u', parsed); }); });
      }
    }
    p.then(function () {
      if (editingSrc) { for (var i = 0; i < sources.length; i++) if (sources[i].id === s.id) sources[i] = s; } else sources.push(s);
      saveSources(); activeId = s.id; lsSet('mtv_active', activeId);
      err.textContent = ''; resetData();
      show('login', false); window.scrollTo(0, 0);
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if (!profile) return showProfiles();
      show('main', true); setTab(settings.startTab);
    }).catch(function (x) { err.textContent = 'Could not connect: ' + x.message; });
  });

  /* ---------- profiles ---------- */
  var managing = false, peEditing = null, peEmoji = EMOJI[0], peColor = COLORS[0];
  function showProfiles() {
    show('main', false); show('login', false);
    if (!profiles.length) { profiles.push({ id: uid(), name: 'Me', emoji: '🙂', color: COLORS[0], pin: '', kids: false }); lsSet('mtv_profiles', profiles); }
    renderProfiles(); show('profiles', true);
  }
  function renderProfiles() {
    var box = $('plist'); box.innerHTML = '';
    profiles.forEach(function (p) {
      var b = el('button', 'f pcard' + (managing ? ' edit' : ''), '<div class="pa" style="background:' + esc(p.color) + '">' + esc(p.emoji) + (p.pin ? '<span class="lock">🔒</span>' : '') + '</div><div class="pn">' + esc(p.name) + (p.kids ? ' · Kids' : '') + '</div>');
      b.onclick = function () { managing ? editProfile(p) : pickProfile(p); };
      box.appendChild(b);
    });
    if (profiles.length < 8) { var a = el('button', 'f pcard add', '<div class="pa">+</div><div class="pn">Add profile</div>'); a.onclick = function () { editProfile(null); }; box.appendChild(a); }
    $('p-manage').textContent = managing ? 'Done' : 'Manage profiles';
    focusLater(box.firstChild);
  }
  $('p-manage').onclick = function () { managing = !managing; renderProfiles(); };
  function pickProfile(p) {
    var go = function () {
      profile = p; pdata = loadPdata(p); lsSet('mtv_last_profile', p.id); adultUnlocked = false;
      show('profiles', false); renderWho();
      if (!sources.length) return openSourceForm(null);
      show('main', true); setTab(settings.startTab);
    };
    if (p.pin) askPin('Profile PIN for ' + p.name, p.pin).then(function (ok) { if (ok) go(); }); else go();
  }
  function renderWho() { var w = $('who'); w.style.background = profile.color; w.textContent = profile.emoji; w.title = profile.name + ' — switch profile'; }
  $('who').onclick = function () { managing = false; showProfiles(); };
  function editProfile(p) {
    peEditing = p; peEmoji = p ? p.emoji : EMOJI[profiles.length % EMOJI.length]; peColor = p ? p.color : COLORS[profiles.length % COLORS.length];
    $('pe-title').textContent = p ? 'Edit profile' : 'New profile';
    $('pe-name').value = p ? p.name : ''; $('pe-pin').value = p ? p.pin : ''; $('pe-kids').checked = !!(p && p.kids);
    show('pe-del', !!p && profiles.length > 1);
    var eb = $('pe-emoji'); eb.innerHTML = '';
    EMOJI.forEach(function (e) { var b = el('button', 'f chip emo' + (e === peEmoji ? ' on' : ''), e); b.onclick = function () { peEmoji = e; each(eb.children, function (c) { c.classList.toggle('on', c === b); }); }; eb.appendChild(b); });
    var cb = $('pe-color'); cb.innerHTML = '';
    COLORS.forEach(function (c) { var b = el('button', 'f swatch' + (c === peColor ? ' on' : '')); b.style.background = c; b.onclick = function () { peColor = c; each(cb.children, function (x) { x.classList.toggle('on', x === b); }); }; cb.appendChild(b); });
    show('profedit', true); focusLater($('pe-name'));
  }
  $('pe-cancel').onclick = function () { show('profedit', false); };
  $('pe-save').onclick = function () {
    var name = $('pe-name').value.trim() || 'Profile', pin = $('pe-pin').value.trim();
    if (pin && !/^\d{4}$/.test(pin)) { modal({ title: 'PIN must be 4 digits' }); return; }
    if (peEditing) { peEditing.name = name; peEditing.emoji = peEmoji; peEditing.color = peColor; peEditing.pin = pin; peEditing.kids = $('pe-kids').checked; }
    else profiles.push({ id: uid(), name: name, emoji: peEmoji, color: peColor, pin: pin, kids: $('pe-kids').checked });
    lsSet('mtv_profiles', profiles); show('profedit', false);
    if (profile && peEditing === profile) renderWho();
    if (isShown('profiles')) renderProfiles(); else renderSettings();
  };
  $('pe-del').onclick = function () {
    var p = peEditing;
    modal({ title: 'Delete profile "' + p.name + '"?', text: 'Its favourites and watch history on this device are removed.', ok: 'Delete' }).then(function (ok) {
      if (!ok) return;
      profiles = profiles.filter(function (x) { return x !== p; }); lsSet('mtv_profiles', profiles);
      try { localStorage.removeItem('mtv_pd_' + p.id); } catch (e) {}
      show('profedit', false);
      if (profile === p) { profile = null; showProfiles(); } else if (isShown('profiles')) renderProfiles(); else renderSettings();
    });
  };

  /* ---------- tabs ---------- */
  var state = { az: !!lsGet('mtv_sort_az', false), tab: 'home', cat: null, shown: 0, items: [], sfilter: 'all', f: { live: {}, vod: {}, series: {} } };
  var dimOpts = {};
  var DIMS = [['cn', 'Continent'], ['co', 'Country'], ['la', 'Language'], ['ty', 'Type']];
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('.tab'); if (b) setTab(b.getAttribute('data-tab')); });
  function setTab(t) {
    state.tab = t;
    each(document.querySelectorAll('.tab'), function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === t); });
    show('home', t === 'home'); show('browse', t === 'live' || t === 'vod' || t === 'series'); show('search', t === 'search'); show('settings', t === 'settings');
    if (t === 'home') return renderHome();
    if (t === 'search') { focusLater($('q')); preloadAll(); return; }
    if (t === 'settings') return renderSettings();
    $('cats').innerHTML = ''; $('grid').innerHTML = ''; $('fbar').innerHTML = '';
    $('status').textContent = 'Loading… (first time can take up to a minute)';
    ensure(t).then(function () { if (state.tab === t) renderCats(t); }).catch(function (e) { $('status').textContent = 'Could not load: ' + e.message; });
  }

  /* ---------- home: continue watching, favourites, recent channels ---------- */
  /* ---------- Home: Netflix-style rows, never empty ---------- */
  var POPULAR = ['svt1 hd', 'svt2 hd', 'tv4 hd', 'kanal 5 hd', 'tv3 hd', 'eurosport 1', 'cnn international', 'bbc world news', 'discovery channel', 'national geographic', 'sky news', 'al jazeera', 'globo', 'tv6 hd', 'sjuan', 'disney channel'];
  var ROW_N = 20;
  function num(x) { var n = parseFloat(x); return isNaN(n) ? 0 : n; }
  function byAdded(a, b) { return num(b.d) - num(a.d); }
  function byRating(a, b) { return num(b.r) - num(a.r); }
  function hasT(it, d, v) { return !!(it.t && it.t[d] && it.t[d].indexOf(v) >= 0); }
  function popularChannels() {
    var d = data.live || [], out = [], seen = {};
    POPULAR.forEach(function (p) {
      for (var i = 0; i < d.length; i++) { var it = d[i]; if (it.k.indexOf(p) === 0 && visible('live', it) && !seen[it.id]) { seen[it.id] = 1; out.push(it); break; } }
    });
    if (out.length < 8) for (var j = 0; j < d.length && out.length < 12; j++) if (d[j].p && visible('live', d[j]) && !seen[d[j].id] && !/^-=|^#/.test(d[j].n)) { seen[d[j].id] = 1; out.push(d[j]); }
    return out;
  }
  // a row = { t: type, title, pred(it), sort, list? }
  function rowItems(r) {
    if (r.list) return r.list;
    var d = data[r.t] || [], all = [];
    for (var i = 0; i < d.length; i++) if (visible(r.t, d[i]) && r.pred(d[i])) all.push(d[i]);
    if (r.sort) all.sort(r.sort);
    if (r.t !== 'live') all.sort(function (a, b) { return (b.p ? 1 : 0) - (a.p ? 1 : 0); }); // stable: posters first
    r.all = all;
    return all;
  }
  function catRow(t, re, title, sort) {
    var c = (cats[t] || []).filter(function (x) { return re.test(x.n) && !adultCats[t][x.id]; });
    if (!c.length) return null;
    var ids = {}; c.forEach(function (x) { ids[x.id] = 1; });
    return { t: t, title: title, pred: function (it) { return !!ids[it.c]; }, sort: sort, cats: ids };
  }
  function genreRow(re, title) { return { t: 'series', title: title, pred: function (it) { return re.test(it.g); }, sort: byRating }; }
  function liveType(ty, title) { return { t: 'live', title: title, pred: function (it) { return hasT(it, 'ty', ty) && !hasT(it, 'ty', 'Adult'); } }; }
  function liveCountry(co, title) { return { t: 'live', title: title, pred: function (it) { return hasT(it, 'co', co) && !hasT(it, 'ty', 'Adult'); } }; }
  function buildRows() {
    var R = [], used = {};
    function add(r) { if (r && !used[r.title]) { used[r.title] = 1; R.push(r); } }
    var mv = [
      catRow('vod', /premiere|new release|recent/i, 'New movies', byAdded),
      catRow('vod', /imdb|top rated|top movies/i, 'Top rated movies', byRating),
      catRow('vod', /old popular|popular/i, 'Popular movies', byRating),
      catRow('vod', /kids|disney|family|barn/i, 'Kids & family movies', byRating),
      catRow('vod', /^4k movies|4k|uhd/i, '4K movies', byAdded),
      catRow('vod', /svenska|swedish|sverige/i, 'Swedish movies', byAdded),
      catRow('vod', /danske|norsk|suomi|nordic/i, 'Nordic movies', byAdded),
      catRow('vod', /christmas|jul\b/i, 'Christmas movies', byRating),
      catRow('vod', /box set/i, 'Box sets', byRating),
      catRow('vod', /collection|kollektion|bond|bud spencer|van damme/i, 'Collections', byRating)
    ];
    var sv = [
      genreRow(/drama|dramma|دراما/i, 'Drama series'),
      genreRow(/comedy|komedi|commedia/i, 'Comedy series'),
      genreRow(/crime|kriminal|krimi/i, 'Crime series'),
      genreRow(/action|adventure/i, 'Action & adventure series'),
      genreRow(/sci-fi|fantasy|science fiction/i, 'Sci-fi & fantasy series'),
      genreRow(/mystery|mystik|thriller/i, 'Mystery & thriller series'),
      genreRow(/documentar|dokument/i, 'Documentary series'),
      genreRow(/reality/i, 'Reality TV'),
      genreRow(/animation|kids|family|familj|animerat|barn/i, 'Kids & family series'),
      catRow('series', /nordic|svensk|swedish/i, 'Nordic series', byAdded),
      catRow('series', /recent/i, 'Recently added series', byAdded)
    ];
    var lv = [
      liveType('News', 'News channels'), liveType('Sports', 'Sports channels'), liveType('Kids', 'Kids channels'),
      liveCountry('SE', 'Swedish channels'), liveType('Documentary', 'Documentary channels'),
      liveCountry('BR', 'Brazilian channels'), liveCountry('UK', 'UK channels'), liveCountry('US', 'US channels'),
      liveCountry('PT', 'Portuguese channels'), liveType('Music', 'Music channels')
    ];
    // interleave movies / series / live so Home feels varied
    var n = Math.max(mv.length, sv.length, lv.length);
    for (var i = 0; i < n; i++) { add(mv[i]); add(sv[i]); add(lv[i]); }
    // generic fallback (other providers / M3U): best-populated non-adult categories
    ['vod', 'series', 'live'].forEach(function (t) {
      if (!cats[t]) return;
      var cnt = {}; (data[t] || []).forEach(function (it) { cnt[it.c] = (cnt[it.c] || 0) + 1; });
      cats[t].filter(function (c) { return !adultCats[t][c.id] && cnt[c.id] >= 6 && !/adult|18\+|xxx/i.test(c.n); })
        .sort(function (a, b) { return cnt[b.id] - cnt[a.id]; }).slice(0, 6)
        .forEach(function (c) { add({ t: t, title: c.n.replace(/\s*\[[^\]]*\]/g, '').trim() + (t === 'live' ? '' : t === 'vod' ? ' · Movies' : ' · Series'), pred: function (it) { return it.c === c.id; }, sort: t === 'live' ? null : byAdded, cats: (function () { var o = {}; o[c.id] = 1; return o; })() }); });
    });
    return R.filter(function (r) { return rowItems(r).length >= 4; });
  }
  function seeAll(r) {
    state.custom = { t: r.t, title: r.title, pred: r.pred, sort: r.sort, fresh: true };
    setTab(r.t);
  }
  function drawRow(box, r) {
    var items = rowItems(r);
    var h = el('div', 'rowhead');
    h.appendChild(el('h3', '', esc(r.title)));
    var allFn = r.allFn || function () { seeAll(r); };
    if (r.allFn || (!r.noAll && items.length > ROW_N)) { var sa = el('button', 'f seeall', 'See all ›'); sa.onclick = allFn; h.appendChild(sa); }
    box.appendChild(h);
    var s = el('div', 'shelf');
    items.slice(0, ROW_N).forEach(function (it) { s.appendChild(r.mk ? r.mk(it) : card(r.t, it)); });
    if ((r.allFn || !r.noAll) && items.length > ROW_N) { var m = el('button', 'f item more-card ' + r.t, '<div class="img">See all<br><small>' + items.length + '</small></div><div class="t">' + esc(r.title) + '</div>'); m.onclick = allFn; s.appendChild(m); }
    box.appendChild(s);
  }
  function drawHero(box, it, r) {
    var h = el('div', 'hero');
    var bg = el('div', 'hbg'); bg.style.backgroundImage = 'url("' + String(it.p).replace(/"/g, '%22') + '")'; h.appendChild(bg);
    var po = el('div', 'hposter'); po.style.backgroundImage = bg.style.backgroundImage; h.appendChild(po);
    var tx = el('div', 'htext');
    tx.appendChild(el('div', 'hkick', 'FEATURED MOVIE'));
    tx.appendChild(el('div', 'htitle', esc(it.n.replace(/\s*\[[^\]]*\]/g, '').trim())));
    if (num(it.r)) tx.appendChild(el('div', 'hmeta', '★ ' + esc(String(it.r).slice(0, 3)) + ' · ' + esc(r.title)));
    var bt = el('div', 'hbtns');
    var pl = el('button', 'f btn hplay', '▶ Play'); pl.onclick = function () { play('vod', it); }; bt.appendChild(pl);
    var mo = el('button', 'f btn ghost', 'More like this'); mo.onclick = function () { seeAll(r); }; bt.appendChild(mo);
    tx.appendChild(bt); h.appendChild(tx); box.appendChild(h);
    return pl;
  }
  /* full list for personal rows (mixed types) */
  function openAll(title, list, mk) {
    $('a-title').textContent = title + ' (' + list.length + ')';
    var g = $('a-grid'); g.innerHTML = '';
    list.forEach(function (r) { g.appendChild(mk(r)); });
    show('allview', true); $('allview').scrollTop = 0; focusLater(g.querySelector('.item') || $('a-close'));
  }
  $('a-close').onclick = function () { show('allview', false); if (state.tab === 'home') renderHome(); };
  var homeQueue = [], homeBox = null;
  function homeMore() {
    if (!homeBox || state.tab !== 'home') return;
    var n = 0; while (homeQueue.length && n < 3) { drawRow(homeBox, homeQueue.shift()); n++; }
  }
  $('home').addEventListener('scroll', function () { var p = $('home'); if (p.scrollTop + p.clientHeight > p.scrollHeight - 900) homeMore(); });
  function renderHome() {
    var box = $('home-rows'); box.innerHTML = ''; homeQueue = []; homeBox = null;
    window.scrollTo(0, 0); $('home').scrollTop = 0;
    var sid = src() ? src().id : '';
    var cont = Object.keys(pdata.resume).map(function (k) { return pdata.resume[k]; }).filter(function (r) { return r.src === sid; }).sort(function (a, b) { return b.ts - a.ts; }).slice(0, 20);
    var favs = Object.keys(pdata.fav).map(function (k) { return pdata.fav[k]; }).filter(function (r) { return r.src === sid; }).sort(function (a, b) { return b.ts - a.ts; });
    var rec = pdata.recent.filter(function (r) { return r.src === sid; }).slice(0, 20);
    var top = el('div', 'personal'); box.appendChild(top);
    var heroBox = el('div', ''); box.appendChild(heroBox);
    function shelf(title, list, mk) { if (!list.length) return; drawRow(top, { title: title, list: list, mk: mk, allFn: function () { openAll(title, list, mk); } }); }
    shelf('Continue watching', cont, function (r) {
      var c = card(r.type, r.item, r.label);
      var bar = el('div', 'bar', '<i style="width:' + Math.min(100, Math.round(100 * r.t / (r.d || 1))) + '%"></i>'); bar.style.top = c.querySelector('.img') ? '' : '0';
      c.insertBefore(bar, c.children[1]);
      tap(c, function () { r.ep ? playEpisode(r.item, r.ep) : play(r.type, r.item); });
      return c;
    });
    var later = Object.keys(pdata.later).map(function (k) { return pdata.later[k]; }).filter(function (r) { return r.src === sid; }).sort(function (a, b) { return b.ts - a.ts; });
    shelf('Watch later', later, function (r) { return card(r.type, r.item); });
    shelf('Favourite channels', favs.filter(function (r) { return r.type === 'live'; }), function (r) { return card('live', r.item); });
    shelf('Recently watched', rec, function (r) { return card('live', r.item); });
    var disc = el('div', ''); box.appendChild(disc);
    if (!src()) { disc.innerHTML = '<p class="note">Add an IPTV source in Settings → Configure IPTV to fill Home.</p>'; return focusLater($('tabs').querySelector('.on')); }
    disc.innerHTML = '<div class="status">Loading movies, series and channels…</div>';
    focusLater(top.querySelector('.item') || $('tabs').querySelector('.on'));
    function go() {
      if (state.tab !== 'home') return;
      disc.innerHTML = '';
      var rows = buildRows();
      var pc = popularChannels();
      if (pc.length) rows.splice(1, 0, { t: 'live', title: 'Popular channels', list: pc, noAll: true });
      // hero: best-rated recent premiere with a poster
      var hr = rows.filter(function (r) { return r.t === 'vod'; })[0];
      if (hr) {
        var cand = rowItems(hr).slice(0, 40).filter(function (it) { return it.p; });
        cand.sort(byRating);
        if (cand[0]) { var pl = drawHero(heroBox, cand[0], hr); if (!top.querySelector('.item')) focusLater(pl); }
      }
      homeBox = disc; homeQueue = rows;
      homeMore(); homeMore();
      if (!rows.length) disc.innerHTML = '<p class="note">Your source has no categories yet. Try Settings → Refresh catalogue.</p>';
    }
    Promise.all([ensure('vod'), ensure('series'), ensure('live')]).then(go, function () {
      // partial data still gives rows
      if (data.vod || data.series || data.live) go(); else disc.innerHTML = '<div class="status">Could not load the catalogue. Check Settings → Configure IPTV.</div>';
    });
  }

  /* ---------- filters ---------- */
  function active(t) { var f = state.f[t], n = 0; for (var k in f) if (f[k]) n++; return n; }
  function matchF(t, it, skip) {
    var f = state.f[t], tg = it.t;
    for (var i = 0; i < DIMS.length; i++) { var d = DIMS[i][0]; if (d === skip || !f[d]) continue; if (!tg || tg[d].indexOf(f[d]) < 0) return false; }
    return true;
  }
  function label(d, v) { return d === 'co' ? (window.MTVClassify.COUNTRIES[v] || [v])[0] : v; }
  function renderFbar(t) {
    var bar = $('fbar'); bar.innerHTML = '';
    var dimN = {}; DIMS.forEach(function (D) {
      var o = {}, n = 0, d = D[0], arr = data[t] || [];
      for (var i = 0; i < arr.length && n < 2; i++) { var it = arr[i]; if (!it.t || !visible(t, it) || !matchF(t, it, d)) continue; var vs = it.t[d] || []; for (var j = 0; j < vs.length; j++) if (!o[vs[j]] && !(adultHidden() && vs[j] === 'Adult')) { o[vs[j]] = 1; n++; } }
      dimN[d] = n;
    });
    DIMS.forEach(function (D) {
      var v = state.f[t][D[0]];
      if (!v && dimN[D[0]] < 2) return; // e.g. hide Continent when it has no real options
      var b = el('button', 'f fbtn' + (v ? ' on' : ''), esc(D[1]) + ': <b>' + esc(v ? label(D[0], v) : 'Any') + '</b> ▾');
      b.onclick = function () { openFacet(t, D[0], D[1]); }; bar.appendChild(b);
    });
    if (active(t)) { var c = el('button', 'f fbtn clear', '✕ Clear filters'); c.onclick = function () { state.f[t] = {}; renderCats(t); }; bar.appendChild(c); }
  }
  function openFacet(t, d, title) {
    var counts = {}, d0 = data[t];
    for (var i = 0; i < d0.length; i++) { var it = d0[i]; if (!visible(t, it) || !matchF(t, it, d)) continue; var vals = it.t ? it.t[d] : []; for (var j = 0; j < vals.length; j++) counts[vals[j]] = (counts[vals[j]] || 0) + 1; }
    var keys = Object.keys(counts).filter(function (k) { return !adultHidden() || k !== 'Adult'; }).sort(function (a, b) { return azCmp(label(d, a), label(d, b)); });
    $('f-title').textContent = title;
    var box = $('f-opts'); box.innerHTML = '';
    var cur = state.f[t][d];
    var any = el('button', 'f chip opt' + (!cur ? ' on' : ''), '<span>Any</span>'); any.onclick = function () { pickFacet(t, d, null); }; box.appendChild(any);
    keys.forEach(function (k) { var b = el('button', 'f chip opt' + (cur === k ? ' on' : ''), '<span>' + esc(label(d, k)) + '</span><span class="cnt">' + counts[k] + '</span>'); b.onclick = function () { pickFacet(t, d, k); }; box.appendChild(b); });
    if (!keys.length) box.appendChild(el('div', 'status', 'No options with the current filters.'));
    show('fpanel', true); focusLater(box.querySelector('.chip.on') || any);
  }
  function pickFacet(t, d, v) {
    state.f[t][d] = v;
    if (d === 'cn' && v && state.f[t].co) { var cc = window.MTVClassify.COUNTRIES[state.f[t].co]; if (!cc || cc[2] !== v) state.f[t].co = null; }
    show('fpanel', false); renderCats(t);
    focusLater($('fbar').children[DIMS.map(function (x) { return x[0]; }).indexOf(d)]);
  }
  $('sortbtn').onclick = function () { state.az = !state.az; lsSet('mtv_sort_az', state.az); if (state.cat) pickCat(state.tab, state.cat); focusLater($('sortbtn')); };
  $('f-close').onclick = function () { show('fpanel', false); };

  function renderCats(t) {
    renderFbar(t);
    var box = $('cats'); box.innerHTML = '';
    var filt = active(t), cnt = {};
    if (filt) data[t].forEach(function (it) { if (visible(t, it) && matchF(t, it)) cnt[it.c] = (cnt[it.c] || 0) + 1; });
    var list = [{ id: '*', n: 'All' }].concat(cats[t].filter(function (c) { return (!adultHidden() || !adultCats[t][c.id]) && (!filt || cnt[c.id]); }).slice().sort(function (a, b) { return azCmp(a.n, b.n); }));
    var cu = state.custom && state.custom.t === t ? state.custom : null;
    if (cu) list.splice(1, 0, { id: '~', n: '◆ ' + cu.title });
    var store = t === 'live' ? pdata.fav : pdata.later;
    if (pdata && Object.keys(store).some(function (k) { return store[k].type === t && store[k].src === src().id; })) list.splice(1, 0, { id: '★', n: t === 'live' ? '★ Favourite channels' : '✓ Watch later' });
    list.forEach(function (c) {
      var b = el('button', 'f cat', esc(c.n) + (filt && cnt[c.id] ? ' <span class="cnt">' + cnt[c.id] + '</span>' : '')); b.setAttribute('data-id', c.id);
      b.onclick = function () { pickCat(t, c.id); }; box.appendChild(b);
    });
    var first = cats[t].filter(function (c) { return (!adultHidden() || !adultCats[t][c.id]) && (!filt || cnt[c.id]); })[0]; // provider's own first category stays the default
    if (cu && cu.fresh) { cu.fresh = false; return pickCat(t, '~'); }
    pickCat(t, filt || !first ? '*' : first.id);
  }
  function pickCat(t, id) {
    state.cat = id;
    each($('cats').children, function (b) { b.classList.toggle('on', b.getAttribute('data-id') === id); });
    var cu = id === '~' ? state.custom : null;
    state.items = data[t].filter(function (it) { return (id === '*' || (cu ? cu.pred(it) : id === '★' ? !!(t === 'live' ? pdata.fav : pdata.later)[ikey(t, it.id)] : it.c === id)) && visible(t, it) && matchF(t, it); });
    if (cu && cu.sort) state.items.sort(cu.sort);
    if (state.az) state.items.sort(function (a, b) { return azCmp(a.n, b.n); });
    if (t === 'live' && !state.az && id !== '★') { var fv = [], rest = []; state.items.forEach(function (it) { (pdata.fav[ikey('live', it.id)] ? fv : rest).push(it); }); state.items = fv.concat(rest); }
    $('sortbtn').textContent = state.az ? 'Sort: A–Z' : 'Sort: Default';
    state.shown = 0; $('grid').innerHTML = '';
    $('status').textContent = state.items.length ? state.items.length + ' items' : 'Nothing here.';
    renderMore(t, $('grid'), state);
    $('grid-wrap').scrollTop = 0;
  }
  function renderMore(t, grid, st) {
    var old = grid.querySelector('.more'); if (old) old.parentNode.removeChild(old);
    var end = Math.min(st.items.length, st.shown + PAGE), frag = document.createDocumentFragment();
    for (var i = st.shown; i < end; i++) frag.appendChild(card(t, st.items[i]));
    st.shown = end; grid.appendChild(frag);
    if (end < st.items.length) { var m = el('button', 'f btn ghost more', 'Show more (' + (st.items.length - end) + ' left)'); m.onclick = function () { renderMore(t, grid, st); }; grid.appendChild(m); }
  }
  function card(type, it, sub) {
    var b = el('button', 'f item ' + type);
    var img = el('div', 'img', it.p ? '' : esc(type === 'live' ? 'LIVE' : 'NO IMAGE'));
    if (it.p) img.style.backgroundImage = 'url("' + String(it.p).replace(/"/g, '%22') + '")';
    b.appendChild(img);
    b.appendChild(el('div', 't', esc(it.n)));
    var meta = sub || (type === 'live' ? 'Live' : type === 'vod' ? 'Movie' : 'Series');
    if (!sub && it.r && it.r !== '0') meta += ' · ★ ' + esc(String(it.r).slice(0, 3));
    b.appendChild(el('div', 'm', esc(meta)));
    if (pdata) markCard(b, type, it);
    tap(b, function () { type === 'series' ? openSeries(it) : type === 'vod' ? openMovie(it) : play(type, it); });
    longPress(b, type, it);
    return b;
  }

  /* ---------- search ---------- */
  function preloadAll() {
    $('sres').innerHTML = '<div class="status">Loading catalogue for search…</div>';
    Promise.all([ensure('live'), ensure('vod'), ensure('series')]).then(runSearch).catch(function (e) { $('sres').innerHTML = '<div class="status">Could not load: ' + esc(e.message) + '</div>'; });
  }
  var sTimer = null;
  $('q').addEventListener('input', function () { clearTimeout(sTimer); sTimer = setTimeout(runSearch, 250); });
  $('sfilter').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; state.sfilter = b.getAttribute('data-f'); each($('sfilter').children, function (c) { c.classList.toggle('on', c === b); }); runSearch(); });
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
    var terms = q.split(' '), limit = state.sfilter === 'all' ? 30 : 300, total = 0;
    box.innerHTML = '';
    [['live', 'Live TV'], ['vod', 'Movies'], ['series', 'Series']].forEach(function (g) {
      if (state.sfilter !== 'all' && state.sfilter !== g[0]) return;
      var r = searchType(g[0], terms, limit); if (!r.length) return;
      total += r.length;
      box.appendChild(el('h3', '', g[1] + ' (' + r.length + (r.length >= limit ? '+' : '') + ')'));
      var grid = el('div', 'grid'); r.forEach(function (it) { grid.appendChild(card(g[0], it)); }); box.appendChild(grid);
    });
    if (!total) box.innerHTML = '<div class="status">No results for “' + esc($('q').value) + '”.</div>';
  }

  /* ---------- favourites ---------- */
  function slimItem(it) { return { id: it.id, n: it.n, p: it.p, x: it.x, u: it.u, c: it.c }; }
  function sortKey(x) { return String(x || '').replace(/^[^0-9A-Za-z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF]+/, ''); }
  var collator = null; try { collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true }); } catch (e) {}
  function azCmp(a, b) { a = sortKey(a); b = sortKey(b); if (collator) return collator.compare(a, b); a = a.toLowerCase(); b = b.toLowerCase(); return a < b ? -1 : a > b ? 1 : 0; }
  function isLater(type, it) { return !!pdata.later[ikey(type, it.id)]; }
  function toggleLater(type, it) {
    var k = ikey(type, it.id);
    if (pdata.later[k]) delete pdata.later[k]; else pdata.later[k] = { type: type, item: slimItem(it), src: src().id, ts: Date.now() };
    savePdata(); return !!pdata.later[k];
  }
  function laterLabel(on) { return on ? '✓ Watch later' : '＋ Watch later'; }
  var toastT = null;
  function toast(msg) {
    var t = $('toast'); if (!t) { t = el('div', ''); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.className = 'show'; clearTimeout(toastT); toastT = setTimeout(function () { t.className = ''; }, 1800);
  }
  // long-press / right-click / remote colour key: favourite a channel, or add a movie/series to My list
  function quickToggle(type, it, b) {
    var on;
    if (type === 'live') { on = toggleFav('live', it); toast(on ? '★ Added to favourite channels' : 'Removed from favourite channels'); }
    else { on = toggleLater(type, it); toast(on ? '✓ Added to Watch later' : 'Removed from Watch later'); }
    if (b) markCard(b, type, it);
  }
  function markCard(b, type, it) {
    var m = b.querySelector('.favmark'); if (m) b.removeChild(m);
    var on = type === 'live' ? !!pdata.fav[ikey('live', it.id)] : isLater(type, it);
    if (on) b.appendChild(el('span', 'favmark', type === 'live' ? '★' : '✓'));
  }
  function tap(b, fn) { b.onclick = function (e) { if (b._lp) { b._lp = false; return; } fn(e); }; }
  function longPress(b, type, it) {
    var tm = null;
    b._mt = [type, it];
    b.addEventListener('touchstart', function () { b._lp = false; clearTimeout(tm); tm = setTimeout(function () { b._lp = true; quickToggle(type, it, b); }, 550); }, { passive: true });
    b.addEventListener('touchmove', function () { clearTimeout(tm); }, { passive: true });
    b.addEventListener('touchend', function () { clearTimeout(tm); });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); if (!b._lp) quickToggle(type, it, b); });
  }
  function toggleFav(type, it) {
    var k = ikey(type, it.id);
    if (pdata.fav[k]) delete pdata.fav[k]; else pdata.fav[k] = { type: type, item: slimItem(it), src: src().id, ts: Date.now() };
    savePdata(); return !!pdata.fav[k];
  }
  function favLabel(on) { return on ? '★ Favourite' : '☆ Favourite'; }

  /* ---------- series ---------- */
  var curSeries = null;
  function openSeries(it) {
    curSeries = it;
    show('detail', true);
    $('d-title').textContent = it.n; $('d-plot').textContent = 'Loading…';
    $('d-img').src = it.p || 'logo.svg'; $('d-seasons').innerHTML = ''; $('d-eps').innerHTML = '';
    $('d-fav').textContent = laterLabel(isLater('series', it)); curMovie = null; show('d-play', false); show('d-seasons', true); show('d-eps', true);
    focusLater($('d-close'));
    var p = src().type === 'xtream' ? api('get_series_info', '&series_id=' + it.id).then(function (r) {
      var eps = {}, e = r.episodes || {};
      Object.keys(e).forEach(function (s) { eps[s] = e[s].map(function (x) { return { id: String(x.id), s: +s, e: +x.episode_num, t: x.title || '', x: x.container_extension }; }); });
      return { plot: (r.info && r.info.plot) || '', eps: eps };
    }) : Promise.resolve().then(function () {
      var eps = {}; (seriesEps[it.id] || []).forEach(function (x) { (eps[x.s] = eps[x.s] || []).push(x); });
      Object.keys(eps).forEach(function (s) { eps[s].sort(function (a, b) { return a.e - b.e; }); });
      return { plot: '', eps: eps };
    });
    p.then(function (r) {
      if (curSeries !== it) return;
      $('d-plot').textContent = r.plot;
      var seasons = Object.keys(r.eps).sort(function (a, b) { return a - b; });
      if (!seasons.length) { $('d-plot').textContent += ' (No episodes found.)'; return; }
      seasons.forEach(function (s, i) {
        var b = el('button', 'f chip', 'Season ' + esc(s));
        b.onclick = function () {
          each($('d-seasons').children, function (c) { c.classList.toggle('on', c === b); });
          var box = $('d-eps'); box.innerHTML = '';
          r.eps[s].forEach(function (ep) {
            var rs = pdata.resume[ikey('ep', ep.id)];
            var e = el('button', 'f ep', '<span>E' + esc(ep.e) + ' · ' + esc(ep.t) + '</span>' + (rs ? '<span class="note">▶ ' + fmtTime(rs.t) + '</span>' : ''));
            e.onclick = function () { playEpisode(slimItem(it), ep); };
            box.appendChild(e);
          });
        };
        $('d-seasons').appendChild(b);
        if (i === 0) b.click();
      });
    }).catch(function (e) { $('d-plot').textContent = 'Could not load: ' + e.message; });
  }
  $('d-close').onclick = function () { show('detail', false); curSeries = null; curMovie = null; if (state.tab === 'home') renderHome(); };
  $('d-fav').onclick = function () {
    var t = curMovie ? 'vod' : 'series', it = curMovie || curSeries; if (!it) return;
    $('d-fav').textContent = laterLabel(toggleLater(t, it));
  };
  /* ---------- movie detail (Play + My list) ---------- */
  var curMovie = null;
  function openMovie(it) {
    curMovie = it; curSeries = null;
    show('detail', true);
    $('d-title').textContent = it.n; $('d-plot').textContent = num(it.r) ? '★ ' + String(it.r).slice(0, 3) : '';
    $('d-img').src = it.p || 'logo.svg'; $('d-seasons').innerHTML = ''; $('d-eps').innerHTML = '';
    show('d-seasons', false); show('d-eps', false); show('d-play', true);
    var rs = pdata.resume[ikey('vod', it.id)];
    $('d-play').textContent = rs && rs.t > 20 ? '▶ Resume ' + fmtTime(rs.t) : '▶ Play';
    $('d-fav').textContent = laterLabel(isLater('vod', it));
    focusLater($('d-play'));
    if (src().type === 'xtream') api('get_vod_info', '&vod_id=' + it.id).then(function (r) {
      if (curMovie !== it || !r || !r.info) return;
      var i = r.info, meta = [i.releasedate ? String(i.releasedate).slice(0, 4) : '', i.genre || '', i.duration || ''].filter(Boolean).join(' · ');
      $('d-plot').innerHTML = (meta ? '<b>' + esc(meta) + '</b><br>' : '') + esc(i.plot || i.description || '');
    }).catch(function () {});
  }
  $('d-play').onclick = function () { if (curMovie) { var it = curMovie; show('detail', false); curMovie = null; play('vod', it); } };

  /* ---------- player ---------- */
  var video = $('video'), hls = null, now = null, lastSave = 0;
  function stop() {
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
    try { video.pause(); } catch (e) {}
    video.removeAttribute('src'); try { video.load(); } catch (e) {}
  }
  function playEpisode(series, ep) {
    var it = { id: ep.id, n: series.n + ' · S' + ep.s + 'E' + ep.e, p: series.p, x: ep.x, u: ep.u };
    play('series', it, { series: series, ep: ep });
  }
  function play(type, it, extra) {
    stop();
    now = { type: type, it: it, extra: extra, key: type === 'series' ? ikey('ep', it.id) : ikey(type, it.id) };
    show('player', true);
    $('p-title').textContent = it.n; $('p-msg').textContent = ''; $('p-epg').textContent = '';
    $('p-fav').textContent = type === 'live' ? (pdata.fav[ikey('live', it.id)] ? '★ Favourite' : '☆ Favourite') : laterLabel(extra ? isLater('series', extra.series) : isLater(type, it));
    show('p-restart', false);
    if (type === 'live') { addRecent(it); loadEpg(it); }
    var url = streamUrl(type === 'series' ? 'series' : type, it);
    var isHls = /\.m3u8(\?|$)/i.test(url), native = video.canPlayType('application/vnd.apple.mpegurl');
    var rs = type !== 'live' ? pdata.resume[now.key] : null;
    var startAt = rs && rs.t > 20 && rs.t < (rs.d || 1e9) * 0.95 ? rs.t : 0;
    if (isHls && !native && window.Hls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, maxBufferLength: +settings.buffer || 30, startPosition: startAt || -1 });
      hls.loadSource(url); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function () { pickTracksHls(); video.play().catch(function () {}); });
      hls.on(Hls.Events.ERROR, function (ev, d) { if (d && d.fatal) $('p-msg').textContent = 'Stream failed (' + d.details + '). If another device is watching, stop it first (1 connection on many plans).'; });
    } else {
      video.src = url;
      if (startAt) video.addEventListener('loadedmetadata', function once() { video.removeEventListener('loadedmetadata', once); try { video.currentTime = startAt; } catch (e) {} });
      video.play().catch(function () {});
    }
    if (startAt) { show('p-restart', true); $('p-msg').textContent = 'Resumed from ' + fmtTime(startAt); }
    focusLater($('p-close'));
  }
  function langMatch(code, s) { return code && LANG_NAMES[code] && new RegExp(LANG_NAMES[code], 'i').test(s || ''); }
  function pickTracksHls() {
    if (!hls) return;
    try {
      if (settings.audioLang) hls.audioTracks.forEach(function (t, i) { if (langMatch(settings.audioLang, (t.lang || '') + ' ' + (t.name || ''))) hls.audioTrack = i; });
      if (settings.subLang === 'off') hls.subtitleTrack = -1;
      else if (settings.subLang) hls.subtitleTracks.forEach(function (t, i) { if (langMatch(settings.subLang, (t.lang || '') + ' ' + (t.name || ''))) hls.subtitleTrack = i; });
    } catch (e) {}
  }
  video.addEventListener('loadedmetadata', function () {
    try {
      var at = video.audioTracks; if (at && settings.audioLang) for (var i = 0; i < at.length; i++) if (langMatch(settings.audioLang, at[i].language + ' ' + at[i].label)) at[i].enabled = true;
      var tt = video.textTracks; if (tt) for (var j = 0; j < tt.length; j++) tt[j].mode = settings.subLang && settings.subLang !== 'off' && langMatch(settings.subLang, tt[j].language + ' ' + tt[j].label) ? 'showing' : (settings.subLang === 'off' ? 'disabled' : tt[j].mode);
    } catch (e) {}
  });
  video.addEventListener('timeupdate', function () {
    if (!now || now.type === 'live' || !video.duration || !isFinite(video.duration) || video.duration < 60) return;
    if (Date.now() - lastSave < 5000) return;
    lastSave = Date.now(); saveResume();
  });
  function saveResume() {
    if (!now || now.type === 'live' || !video.duration || !isFinite(video.duration)) return;
    var t = video.currentTime, d = video.duration;
    if (t > d * 0.95) delete pdata.resume[now.key];
    else if (t > 20) pdata.resume[now.key] = { type: now.type, item: slimItem(now.it), ep: now.extra ? now.extra.ep : null, label: now.extra ? 'S' + now.extra.ep.s + ' E' + now.extra.ep.e + ' · ' + fmtTime(t) : fmtTime(t) + ' / ' + fmtTime(d), t: t, d: d, src: src().id, ts: Date.now() };
    if (now.extra) pdata.resume[now.key] && (pdata.resume[now.key].item = { id: now.extra.series.id, n: now.extra.series.n, p: now.extra.series.p });
    savePdata();
  }
  video.addEventListener('ended', function () { if (now && now.type !== 'live') { delete pdata.resume[now.key]; savePdata(); } });
  video.addEventListener('error', function () {
    var ext = (video.currentSrc || '').split('?')[0].split('.').pop();
    $('p-msg').textContent = 'Cannot play this ' + (/mkv|avi/i.test(ext) ? ext.toUpperCase() + ' file on this device' : /ts/i.test(ext) ? 'TS stream here — try format "HLS (m3u8)" in Settings' : 'stream') + '. If another device is watching, stop it first.';
  });
  function addRecent(it) {
    var sid = src().id;
    pdata.recent = pdata.recent.filter(function (r) { return !(r.src === sid && r.item.id === it.id); });
    pdata.recent.unshift({ item: slimItem(it), src: sid, ts: Date.now() });
    pdata.recent = pdata.recent.slice(0, 30); savePdata();
  }
  function loadEpg(it) {
    if (src().type !== 'xtream') return;
    api('get_short_epg', '&stream_id=' + it.id + '&limit=2', 15000).then(function (r) {
      var l = (r && r.epg_listings) || [], off = (+settings.epgOffset || 0) * 3600;
      function dec(s) { try { return decodeURIComponent(escape(atob(s))); } catch (e) { return s || ''; } }
      function hm(ts) { var d = new Date((+ts + off) * 1000); return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }
      if (!l.length || !now || now.it !== it) return;
      $('p-epg').textContent = l.slice(0, 2).map(function (x, i) { return (i ? 'Next ' : 'Now ') + hm(x.start_timestamp) + ' ' + dec(x.title); }).join('  ·  ');
    }).catch(function () {});
  }
  function closePlayer() { saveResume(); stop(); show('player', false); now = null; if (state.tab === 'home') renderHome(); }
  $('p-close').onclick = closePlayer;
  $('p-restart').onclick = function () { try { video.currentTime = 0; } catch (e) {} show('p-restart', false); $('p-msg').textContent = ''; };
  $('p-fav').onclick = function () {
    if (!now) return;
    if (now.type === 'live') { var f = toggleFav('live', now.it); $('p-fav').textContent = f ? '★ Favourite' : '☆ Favourite'; toast(f ? '★ Added to favourite channels' : 'Removed from favourite channels'); return; }
    var on = now.extra ? toggleLater('series', now.extra.series) : toggleLater(now.type, now.it);
    $('p-fav').textContent = laterLabel(on); toast(on ? '✓ Added to Watch later' : 'Removed from Watch later');
  };

  /* ---------- settings ---------- */
  function sel(id, opts, val) { return '<select class="f" id="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
  function row(k, small, ctrl) { return '<div class="srow"><div class="k">' + k + (small ? '<small>' + small + '</small>' : '') + '</div><div>' + ctrl + '</div></div>'; }
  function renderSettings() {
    var s = src(), h = '';
    h += '<div class="card"><h3>Profile</h3>' + row('<span class="avatar" style="display:inline-flex;background:' + esc(profile.color) + '">' + esc(profile.emoji) + '</span> ' + esc(profile.name), profile.kids ? 'Kids profile' : '', '<button class="f btn ghost small" id="st-editp">Edit</button> <button class="f btn ghost small" id="st-switch">Switch profile</button>') + '</div>';
    h += '<div class="card"><h3>Configure IPTV</h3><div id="st-sources"></div><div class="btnrow"><button class="f btn small" id="st-add">+ Add source (Xtream, M3U link or file)</button></div></div>';
    h += '<div class="card"><h3>General</h3>' +
      row('Start on', '', sel('st-start', [['home', 'Home'], ['live', 'Live TV'], ['vod', 'Movies'], ['series', 'Series'], ['search', 'Search']], settings.startTab)) +
      row('Theme', '', sel('st-theme', [['dark', 'Dark'], ['oled', 'OLED black'], ['grey', 'Graphite']], settings.theme)) + '</div>';
    h += '<div class="card"><h3>Playback</h3>' +
      row('Live stream format', 'HLS works on iPhone and most TVs; TS only on players that support it', sel('st-format', [['m3u8', 'HLS (m3u8)'], ['ts', 'MPEG-TS (ts)']], settings.format)) +
      row('Buffer', 'More buffer = fewer stalls, slower start', sel('st-buffer', [[10, '10 s'], [30, '30 s'], [60, '60 s'], [120, '120 s']], settings.buffer)) +
      row('Preferred audio language', 'Used when the stream has several', sel('st-audio', LANG_OPTS.filter(function (o) { return o[0] !== 'off'; }), settings.audioLang)) +
      row('Preferred subtitles', '', sel('st-sub', LANG_OPTS, settings.subLang)) +
      row('TV guide time offset', 'Shift programme times if they look wrong', sel('st-epg', [[-3, '−3 h'], [-2, '−2 h'], [-1, '−1 h'], [0, '0 h'], [1, '+1 h'], [2, '+2 h'], [3, '+3 h']], settings.epgOffset)) + '</div>';
    h += '<div class="card"><h3>Parental controls</h3>' +
      row('Hide adult content', settings.parentalPin ? 'PIN required to show' : 'Set a PIN to protect this', '<button class="f btn ghost small" id="st-adult">' + (settings.hideAdult ? (adultUnlocked ? 'Hidden · unlocked now' : 'On') : 'Off') + '</button>') +
      row('Parental PIN', settings.parentalPin ? 'Set' : 'Not set', '<button class="f btn ghost small" id="st-pin">' + (settings.parentalPin ? 'Change PIN' : 'Set PIN') + '</button>') + '</div>';
    h += '<div class="card"><h3>Data &amp; privacy</h3>' +
      row('Remember login on this device', 'Off = forgotten when the app is closed', '<button class="f btn ghost small" id="st-remember">' + (settings.remember ? 'On' : 'Off') + '</button>') +
      row('Refresh catalogue', 'Reload channels and movies from the provider', '<button class="f btn ghost small" id="st-refresh">Refresh now</button>') +
      row('Sign out', 'Forgets all IPTV logins on this device (profiles stay)', '<button class="f btn danger small" id="st-signout">Sign out &amp; forget logins</button>') + '</div>';
    h += '<div class="card"><h3>About</h3><p class="note">Maximus TV ' + VERSION + '. Profiles, favourites, watch history and logins are stored only on this device; nothing is sent anywhere except to your IPTV provider. Syncing between devices would need an online account service (possible later).</p></div>';
    $('set-body').innerHTML = h;
    var sb = $('st-sources');
    sources.forEach(function (x) {
      var d = el('div', 'src' + (s && x.id === s.id ? ' on' : ''), '<div><b>' + esc(x.name || x.type) + '</b>' + (s && x.id === s.id ? '<span class="badge">Active</span>' : '') + '<div class="note">' + esc(x.type === 'xtream' ? 'Xtream · ' + x.server + ' · ' + x.user : x.type === 'm3u' ? 'M3U link' : 'Uploaded file') + '</div></div>');
      var br = el('div', 'btnrow');
      if (!(s && x.id === s.id)) { var u = el('button', 'f btn small', 'Use'); u.onclick = function () { activeId = x.id; lsSet('mtv_active', activeId); resetData(); state.f = { live: {}, vod: {}, series: {} }; renderSettings(); }; br.appendChild(u); }
      var e = el('button', 'f btn ghost small', 'Edit'); e.onclick = function () { openSourceForm(x); }; br.appendChild(e);
      var r = el('button', 'f btn danger small', 'Remove'); r.onclick = function () {
        modal({ title: 'Remove "' + (x.name || x.type) + '"?', text: 'The login is forgotten on this device.', ok: 'Remove' }).then(function (ok) {
          if (!ok) return;
          sources = sources.filter(function (y) { return y !== x; }); saveSources(); idbDel('file:' + x.id); idbDel('cat:' + x.id + ':m3u');
          if (activeId === x.id) { activeId = sources[0] ? sources[0].id : null; lsSet('mtv_active', activeId); resetData(); }
          if (!sources.length) openSourceForm(null); else renderSettings();
        });
      }; br.appendChild(r);
      d.appendChild(br); sb.appendChild(d);
    });
    $('st-editp').onclick = function () { editProfile(profile); };
    $('st-switch').onclick = function () { managing = false; showProfiles(); };
    $('st-add').onclick = function () { openSourceForm(null); };
    $('st-start').onchange = function () { settings.startTab = this.value; saveSettings(); };
    $('st-theme').onchange = function () { settings.theme = this.value; saveSettings(); applyTheme(); };
    $('st-format').onchange = function () { settings.format = this.value; saveSettings(); };
    $('st-buffer').onchange = function () { settings.buffer = +this.value; saveSettings(); };
    $('st-audio').onchange = function () { settings.audioLang = this.value; saveSettings(); };
    $('st-sub').onchange = function () { settings.subLang = this.value; saveSettings(); };
    $('st-epg').onchange = function () { settings.epgOffset = +this.value; saveSettings(); };
    $('st-adult').onclick = function () {
      if (settings.hideAdult && !adultUnlocked) {
        if (!settings.parentalPin) return modal({ title: 'Set a parental PIN first', text: 'Adult content stays hidden until a PIN is set.' }).then(function () { setPin(); });
        if (profile.kids) return modal({ title: 'Not available on a kids profile' });
        askPin('Show adult content', settings.parentalPin).then(function (ok) { if (ok) { adultUnlocked = true; renderSettings(); } });
      } else { adultUnlocked = false; settings.hideAdult = true; saveSettings(); renderSettings(); }
    };
    $('st-pin').onclick = setPin;
    $('st-remember').onclick = function () { settings.remember = !settings.remember; saveSettings(); saveSources(); renderSettings(); };
    $('st-refresh').onclick = function () { idbClearCatalogue().then(function () { resetData(); modal({ title: 'Catalogue cleared', text: 'Lists reload from your provider next time you open a tab.' }); }); };
    $('st-signout').onclick = function () {
      modal({ title: 'Sign out?', text: 'All IPTV logins and uploaded playlists are removed from this device. Profiles and favourites stay.', ok: 'Sign out' }).then(function (ok) {
        if (!ok) return;
        sources.forEach(function (x) { idbDel('file:' + x.id); });
        sources = []; activeId = null; saveSources(); lsSet('mtv_active', null);
        try { localStorage.removeItem('mtv_sources'); sessionStorage.removeItem('mtv_sources'); } catch (e) {}
        idbClearCatalogue(); resetData(); openSourceForm(null);
      });
    };
  }
  function setPin() {
    var go = function () {
      modal({ title: 'New parental PIN', text: '4–8 digits', pin: true, minLen: 4 }).then(function (p) { if (p) { settings.parentalPin = p; saveSettings(); renderSettings(); } });
    };
    if (settings.parentalPin) askPin('Current parental PIN', settings.parentalPin).then(function (ok) { if (ok) go(); }); else go();
  }

  /* ---------- TV remote: spatial navigation + back ---------- */
  try { if (window.tizen && tizen.tvinputdevice) ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop', 'ColorF0Red', 'ColorF2Yellow', 'ColorF3Blue'].forEach(function (k) { try { tizen.tvinputdevice.registerKey(k); } catch (e) {} }); } catch (e) {}
  function topRoot() {
    var ov = document.querySelectorAll('.overlay:not(.hidden)'), best = null, bz = -1;
    each(ov, function (o) { var z = +getComputedStyle(o).zIndex || 0; if (z >= bz) { bz = z; best = o; } });
    return best || (isShown('login') ? $('login') : $('main'));
  }
  function focusables() { return Array.prototype.filter.call(topRoot().querySelectorAll('.f, select'), function (n) { return n.offsetParent !== null || n === video; }); }
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
    if (isShown('modal')) return modalCb && modalCb(false), true;
    if (isShown('profedit')) return show('profedit', false), true;
    if (isShown('player')) return closePlayer(), true;
    if (isShown('fpanel')) return show('fpanel', false), true;
    if (isShown('detail')) return $('d-close').onclick(), true;
    if (isShown('allview')) return $('a-close').onclick(), true;
    if (isShown('login') && sources.length) return $('s-cancel').onclick(), true;
    if (isShown('main') && state.tab !== settings.startTab) return setTab(settings.startTab), true;
    return false;
  }
  document.addEventListener('keydown', function (e) {
    var k = e.keyCode, ae = document.activeElement, typing = ae && ((ae.tagName === 'INPUT' && ae.type !== 'checkbox' && ae.type !== 'file') || ae.tagName === 'SELECT');
    if (k === 10009 || k === 461 || k === 27 || (k === 8 && !typing)) {
      if (back()) { e.preventDefault(); return; }
      if (k === 10009 && window.tizen) { try { tizen.application.getCurrentApplication().exit(); } catch (x) {} }
      return;
    }
    if ((k === 405 || k === 406 || k === 403 || k === 70) && !typing && ae && ae._mt) { quickToggle(ae._mt[0], ae._mt[1], ae); e.preventDefault(); return; }
    if (k === 10252 || k === 415 || k === 19) { if (video.paused) video.play(); else video.pause(); return; }
    var dir = { 37: 'L', 38: 'U', 39: 'R', 40: 'D' }[k];
    if (!dir) return;
    if (typing && (dir === 'L' || dir === 'R')) return;
    if (ae && ae.tagName === 'SELECT' && (dir === 'U' || dir === 'D') && ae.getAttribute('data-open') === '1') return;
    if (ae === video && (dir === 'L' || dir === 'R')) { video.currentTime += dir === 'R' ? 30 : -10; e.preventDefault(); return; }
    e.preventDefault(); move(dir);
  });

  /* ---------- iOS: undo the page shift the on-screen keyboard leaves behind ---------- */
  document.addEventListener('focusout', function (e) { if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) setTimeout(function () { var a = document.activeElement; if (!a || !/INPUT|SELECT|TEXTAREA/.test(a.tagName)) window.scrollTo(0, 0); }, 60); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { window.scrollTo(0, 0); }, 300); });

  /* ---------- boot ---------- */
  applyTheme();
  if (activeId && !src()) activeId = null;
  if (!activeId && sources[0]) activeId = sources[0].id;
  showProfiles();
  /* ---------- always run the latest deployed version ---------- */
  each(document.querySelectorAll('.ver'), function (e) { e.textContent = 'v' + VERSION; });
  var seen = lsGet('mtv_seen_ver', null);
  if (seen && seen !== VERSION) setTimeout(function () { toast('Updated to v' + VERSION); }, 800);
  lsSet('mtv_seen_ver', VERSION);
  function hardRefresh(v) {
    if (ssGet('mtv_upd_try') === v) return; // loop guard: one forced reload per new version per session
    ssSet('mtv_upd_try', v);
    var jobs = [];
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }));
    if (window.caches && caches.keys) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
    Promise.all(jobs).catch(function () {}).then(function () { location.reload(); });
  }
  function checkVersion() {
    if (location.protocol !== 'https:') return;
    var x = new XMLHttpRequest();
    x.open('GET', 'version.json?t=' + Date.now(), true);
    try { x.setRequestHeader('Cache-Control', 'no-cache'); } catch (e) {}
    x.onload = function () { try { var v = JSON.parse(x.responseText).version; if (v && v !== VERSION && !isShown('player')) hardRefresh(v); } catch (e) {} };
    x.send();
  }
  checkVersion();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkVersion(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (r) { try { r.update(); } catch (e) {} }).catch(function () {});
  }
})();

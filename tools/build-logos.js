#!/usr/bin/env node
// Builds src/logos-index.json from the open iptv-org database (https://github.com/iptv-org/api).
// Format: { u: [url without https://], k: { "<key>|<cc>": urlIndex, "<key>": urlIndex (only when unique worldwide) } }
// Usage: node tools/build-logos.js [channels.json logos.json]  (downloads them when no paths are given)
const fs = require('fs'), path = require('path'), https = require('https');
const { logoKey } = require('../src/logokey.js');
function get(u) { return new Promise((res, rej) => https.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); }).on('error', rej)); }
(async () => {
  const [cf, lf] = process.argv.slice(2);
  const channels = JSON.parse(cf ? fs.readFileSync(cf, 'utf8') : await get('https://iptv-org.github.io/api/channels.json'));
  const logos = JSON.parse(lf ? fs.readFileSync(lf, 'utf8') : await get('https://iptv-org.github.io/api/logos.json'));
  const best = {};
  for (const l of logos) {
    if (!l.url || !/^https:\/\//.test(l.url)) continue;
    const score = (l.feed ? 0 : 1000000) + (l.in_use === false ? 0 : 500000) + (/svg/i.test(l.format) ? 0 : 1000) + Math.min(l.width || 0, 999);
    if (!best[l.channel] || best[l.channel].s < score) best[l.channel] = { s: score, u: l.url.slice(8) };
  }
  const out = {}, global = {}, amb = {};
  function put(name, cc, u) {
    const k = logoKey(name);
    for (const key of new Set([k.key, k.keyNoTv])) {
      if (!key || key.length < 2) continue;
      if (cc && !out[key + '|' + cc]) out[key + '|' + cc] = u;
      if (global[key] && global[key] !== u) amb[key] = 1; else global[key] = u;
    }
  }
  for (const c of channels) {
    if (c.is_nsfw || c.closed) continue;
    const b = best[c.id]; if (!b) continue;
    const cc = (c.country || '').toLowerCase() === 'uk' ? 'gb' : (c.country || '').toLowerCase();
    put(c.name, cc, b.u); (c.alt_names || []).forEach(n => put(n, cc, b.u));
  }
  for (const k in global) if (!amb[k]) out[k] = global[k];
  // compact: shared url table + key -> index
  const urls = [], ui = {}, k2 = {};
  for (const k in out) { const u = out[k]; if (ui[u] === undefined) { ui[u] = urls.length; urls.push(u); } k2[k] = ui[u]; }
  const file = path.join(__dirname, '..', 'src', 'logos-index.json');
  fs.writeFileSync(file, JSON.stringify({ v: 1, u: urls, k: k2 }));
  console.log('logos-index.json:', Object.keys(out).length, 'keys,', (fs.statSync(file).size / 1024 / 1024).toFixed(2), 'MB');
})();

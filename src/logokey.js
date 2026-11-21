/* Maximus TV: shared channel-name normaliser for logo matching (ES5; used by the app and tools/build-logos.js) */
(function (root) {
  var C3 = { ARG: 'ar', BRA: 'br', USA: 'us', GBR: 'gb', UK: 'gb', MEX: 'mx', ESP: 'es', POR: 'pt', PRT: 'pt', FRA: 'fr', GER: 'de', DEU: 'de', ITA: 'it', SWE: 'se', NOR: 'no', DEN: 'dk', DNK: 'dk', FIN: 'fi', NED: 'nl', NLD: 'nl', BEL: 'be', POL: 'pl', TUR: 'tr', CAN: 'ca', AUS: 'au', IND: 'in', PAK: 'pk', CHL: 'cl', CHI: 'cl', COL: 'co', PER: 'pe', VEN: 've', URU: 'uy', URY: 'uy', ECU: 'ec', BOL: 'bo', PAR: 'py', PRY: 'py', CRC: 'cr', DOM: 'do', GRE: 'gr', GRC: 'gr', ROU: 'ro', ROM: 'ro', BUL: 'bg', BGR: 'bg', HUN: 'hu', CZE: 'cz', SVK: 'sk', SRB: 'rs', CRO: 'hr', HRV: 'hr', BIH: 'ba', SLO: 'si', SVN: 'si', ALB: 'al', MKD: 'mk', RUS: 'ru', UKR: 'ua', IRN: 'ir', IRQ: 'iq', KSA: 'sa', SAU: 'sa', UAE: 'ae', ARE: 'ae', EGY: 'eg', MAR: 'ma', ALG: 'dz', DZA: 'dz', TUN: 'tn', ISR: 'il', JPN: 'jp', KOR: 'kr', CHN: 'cn', PHI: 'ph', PHL: 'ph', IDN: 'id', THA: 'th', VNM: 'vn', AFG: 'af', IRL: 'ie', SUI: 'ch', CHE: 'ch', AUT: 'at', ISL: 'is', EST: 'ee', LVA: 'lv', LTU: 'lt', CUB: 'cu', PAN: 'pa', GUA: 'gt', GTM: 'gt', HON: 'hn', HND: 'hn', SLV: 'sv', NIC: 'ni', PUR: 'pr', PRI: 'pr', JAM: 'jm', NGA: 'ng', KEN: 'ke', RSA: 'za', ZAF: 'za', GHA: 'gh', SEN: 'sn', LBN: 'lb', SYR: 'sy', JOR: 'jo', KUW: 'kw', KWT: 'kw', QAT: 'qa', BHR: 'bh', OMN: 'om', YEM: 'ye', KUR: 'iq', ARM: 'am', AZE: 'az', GEO: 'ge', KAZ: 'kz', NZL: 'nz', BAN: 'bd', BGD: 'bd', SRI: 'lk', LKA: 'lk', NEP: 'np', NPL: 'np', MAL: 'my', MYS: 'my', SGP: 'sg', HKG: 'hk', TWN: 'tw', LUX: 'lu', MLT: 'mt', CYP: 'cy', MNE: 'me', KOS: 'xk', MDA: 'md', BLR: 'by' };
  var ISO2 = 'ad ae af ag al am ao ar at au az ba bb bd be bf bg bh bi bj bn bo br bs bt bw by bz ca cd cf cg ch ci cl cm cn co cr cu cv cy cz de dj dk dm do dz ec ee eg er es et fi fj fr ga gb gd ge gh gm gn gq gr gt gw gy hk hn hr ht hu id ie il in iq ir is it jm jo jp ke kg kh km kn kp kr kw kz la lb lc li lk lr ls lt lu lv ly ma mc md me mg mk ml mm mn mo mr mt mu mv mw mx my mz na ne ng ni nl no np nz om pa pe pg ph pk pl pr ps pt py qa ro rs ru rw sa sb sc sd se sg si sk sl sm sn so sr ss st sv sy sz td tg th tj tl tm tn to tr tt tw tz ua ug us uy uz va vc ve vn vu ws xk ye za zm zw'.split(' ');
  var CC = {}; for (var i = 0; i < ISO2.length; i++) CC[ISO2[i].toUpperCase()] = ISO2[i];
  for (var k in C3) CC[k] = C3[k];
  var QUAL = /^(HD|FHD|UHD|SD|4K|8K|HEVC|H265|H264|HDR|RAW|LQ|HQ|FULLHD|BACKUP|VIP|PLUS\+?|\*+|ᴴᴰ|ᶠᴴᴰ)$/i;
  function strip(s) { return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s; }
  // returns { key: 'canal13', keyNoTv: 'canal13', cc: 'ar' | '' }
  function logoKey(name) {
    var s = String(name || '').replace(/\[[^\]]*\]|\([^)]*\)/g, ' '), cc = '';
    var m = s.match(/^\s*\|?\s*([A-Z]{2,3})\s*[|:]\s*/); // "AR: Canal 13", "|AR| Canal 13"
    if (m && CC[m[1]]) { cc = CC[m[1]]; s = s.slice(m[0].length); }
    var tok = s.split(/[\s\-_|:]+/).filter(Boolean);
    while (tok.length > 1) { var t = tok[tok.length - 1]; if (QUAL.test(t)) { tok.pop(); continue; } if (/^[A-Z]{2,3}$/.test(t) && CC[t]) { cc = cc || CC[t]; tok.pop(); continue; } break; }
    while (tok.length > 1 && QUAL.test(tok[0])) tok.shift();
    var base = strip(tok.join(' ').toLowerCase()).replace(/&/g, ' and ').replace(/\+/g, ' plus ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    var key = base.replace(/ /g, ''), keyNoTv = base.replace(/\b(tv|channel|canal|kanal|television|televisión)\b/g, '').replace(/ /g, '');
    return { key: key, keyNoTv: keyNoTv || key, cc: cc };
  }
  var api = { logoKey: logoKey, CC: CC };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MTVLogoKey = api;
})(this);

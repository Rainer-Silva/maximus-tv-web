/* Maximus TV — derive Continent / Country / Language / Type tags from Xtream category + item names. ES5. */
(function (g) {
  'use strict';
  // code: [name, language, continent]
  var C = {
    SE: ['Sweden', 'Swedish', 'Europe'], DK: ['Denmark', 'Danish', 'Europe'], NO: ['Norway', 'Norwegian', 'Europe'], FI: ['Finland', 'Finnish', 'Europe'],
    IS: ['Iceland', 'Icelandic', 'Europe'], DE: ['Germany', 'German', 'Europe'], UK: ['United Kingdom', 'English', 'Europe'], IE: ['Ireland', 'English', 'Europe'],
    US: ['United States', 'English', 'North America'], CA: ['Canada', 'English', 'North America'], MX: ['Mexico', 'Spanish', 'North America'],
    ES: ['Spain', 'Spanish', 'Europe'], PT: ['Portugal', 'Portuguese', 'Europe'], FR: ['France', 'French', 'Europe'], IT: ['Italy', 'Italian', 'Europe'],
    NL: ['Netherlands', 'Dutch', 'Europe'], BE: ['Belgium', 'French', 'Europe'], CH: ['Switzerland', 'German', 'Europe'], AT: ['Austria', 'German', 'Europe'],
    PL: ['Poland', 'Polish', 'Europe'], CZ: ['Czechia', 'Czech', 'Europe'], SK: ['Slovakia', 'Slovak', 'Europe'], HU: ['Hungary', 'Hungarian', 'Europe'],
    RO: ['Romania', 'Romanian', 'Europe'], BG: ['Bulgaria', 'Bulgarian', 'Europe'], GR: ['Greece', 'Greek', 'Europe'], CY: ['Cyprus', 'Greek', 'Europe'],
    MT: ['Malta', 'English', 'Europe'], SI: ['Slovenia', 'Slovenian', 'Europe'], HR: ['Croatia', 'Ex-Yu (BCS)', 'Europe'], BA: ['Bosnia & Herzegovina', 'Ex-Yu (BCS)', 'Europe'],
    RS: ['Serbia & Montenegro', 'Ex-Yu (BCS)', 'Europe'], MK: ['North Macedonia', 'Macedonian', 'Europe'], AL: ['Albania', 'Albanian', 'Europe'],
    LT: ['Lithuania', 'Lithuanian', 'Europe'], EE: ['Estonia', 'Estonian', 'Europe'], UA: ['Ukraine', 'Ukrainian', 'Europe'], BY: ['Belarus', 'Russian', 'Europe'],
    RU: ['Russia', 'Russian', 'Europe'], TR: ['Turkey', 'Turkish', 'Asia'], AM: ['Armenia', 'Armenian', 'Asia'], GE: ['Georgia', 'Georgian', 'Asia'],
    AZ: ['Azerbaijan', 'Azerbaijani', 'Asia'], UZ: ['Uzbekistan', 'Uzbek', 'Asia'], KG: ['Kyrgyzstan', 'Kyrgyz', 'Asia'], KZ: ['Kazakhstan', 'Kazakh', 'Asia'],
    TJ: ['Tajikistan', 'Tajik', 'Asia'], AF: ['Afghanistan', 'Persian/Pashto', 'Asia'], IR: ['Iran', 'Persian', 'Asia'], IL: ['Israel', 'Hebrew', 'Asia'],
    SY: ['Syria', 'Arabic', 'Middle East & N. Africa'], LB: ['Lebanon', 'Arabic', 'Middle East & N. Africa'], IQ: ['Iraq', 'Arabic', 'Middle East & N. Africa'], JO: ['Jordan & Palestine', 'Arabic', 'Middle East & N. Africa'],
    SA: ['Saudi Arabia', 'Arabic', 'Middle East & N. Africa'], GULF: ['Gulf states', 'Arabic', 'Middle East & N. Africa'], KU: ['Kurdistan', 'Kurdish', 'Asia'],
    EG: ['Egypt', 'Arabic', 'Middle East & N. Africa'], MA: ['Morocco', 'Arabic', 'Middle East & N. Africa'], DZ: ['Algeria', 'Arabic', 'Middle East & N. Africa'], TN: ['Tunisia', 'Arabic', 'Middle East & N. Africa'],
    SO: ['Somalia', 'Somali', 'Africa'], SD: ['Sudan', 'Arabic', 'Middle East & N. Africa'], ZA: ['South Africa', 'English', 'Africa'],
    IN: ['India', 'Hindi', 'Asia'], PK: ['Pakistan', 'Urdu', 'Asia'], BD: ['Bangladesh', 'Bengali', 'Asia'], LK: ['Sri Lanka', 'Sinhala/Tamil', 'Asia'],
    CN: ['China', 'Chinese', 'Asia'], HK: ['Hong Kong', 'Chinese', 'Asia'], TW: ['Taiwan', 'Chinese', 'Asia'], JP: ['Japan', 'Japanese', 'Asia'],
    KR: ['South Korea', 'Korean', 'Asia'], VN: ['Vietnam', 'Vietnamese', 'Asia'], TH: ['Thailand', 'Thai', 'Asia'], KH: ['Cambodia', 'Khmer', 'Asia'],
    PH: ['Philippines', 'Filipino', 'Asia'], ID: ['Indonesia', 'Indonesian', 'Asia'], MY: ['Malaysia', 'Malay', 'Asia'],
    AU: ['Australia & NZ', 'English', 'Oceania'], BR: ['Brazil', 'Portuguese', 'South America'], AR: ['Argentina', 'Spanish', 'South America'],
    CL: ['Chile', 'Spanish', 'South America'], UY: ['Uruguay', 'Spanish', 'South America'], PE: ['Peru', 'Spanish', 'South America'],
    PY: ['Paraguay', 'Spanish', 'South America'], EC: ['Ecuador', 'Spanish', 'South America'], BO: ['Bolivia', 'Spanish', 'South America'],
    VE: ['Venezuela', 'Spanish', 'South America'], CO: ['Colombia', 'Spanish', 'South America'], SV: ['El Salvador', 'Spanish', 'North America'],
    DO: ['Dominican Republic', 'Spanish', 'North America'], CARIB: ['Caribbean', 'English', 'North America'],
    ARAB: ['Pan-Arab', 'Arabic', 'Middle East & N. Africa'], NAFR: ['North Africa (pan)', 'Arabic', 'Africa'], AFRICA: ['Africa (pan)', 'English', 'Africa'],
    LATAM: ['Latin America (pan)', 'Spanish', 'South America'], INTL: ['International', 'English', 'International']
  };
  // country name/keyword -> codes (matched as whole words, case-insensitive)
  var NAMES = [
    ['sweden|svenska|swedish|svensk', 'SE'], ['denmark|danish|danske', 'DK'], ['norway|norwegian|norska', 'NO'], ['finland|suomalainen|leijonat', 'FI'],
    ['iceland', 'IS'], ['germany|zdf', 'DE'], ['uk|britbox|scottish|irish tv|epl', 'UK'], ['ireland', 'IE'], ['united states|latin univision', 'US'],
    ['canada|canadian|crave|québec|quebec', 'CA'], ['mexico', 'MX'], ['spain|laliga', 'ES'], ['portugal', 'PT'], ['france', 'FR'], ['italy|mediaset|serie a', 'IT'],
    ['netherlands', 'NL'], ['belgium', 'BE'], ['switzerland', 'CH'], ['austria', 'AT'], ['poland|polska', 'PL'], ['czech', 'CZ'], ['slovakia', 'SK'],
    ['hungary', 'HU'], ['romania', 'RO'], ['bulgaria', 'BG'], ['greece', 'GR'], ['cyprus', 'CY'], ['malta', 'MT'], ['slovenia', 'SI'],
    ['hrvatska|croatia', 'HR'], ['bosnia', 'BA'], ['srbija|serbia', 'RS'], ['macedonia', 'MK'], ['albania', 'AL'], ['lithuania', 'LT'], ['estonia', 'EE'],
    ['ukraine', 'UA'], ['belarus', 'BY'], ['russia', 'RU'], ['turkiye|turkey|turkish', 'TR'], ['armenia', 'AM'], ['georgia', 'GE'], ['azerbaijan', 'AZ'],
    ['uzbekistan', 'UZ'], ['kyrgyzstan', 'KG'], ['kazakhstan', 'KZ'], ['tajikistan', 'TJ'], ['afghanistan', 'AF'], ['iran', 'IR'], ['israel', 'IL'],
    ['syria', 'SY'], ['lebanon', 'LB'], ['iraq', 'IQ'], ['jordan|palestine', 'JO'], ['saudi', 'SA'], ['gulf|osn|mbc', 'GULF'], ['kurdistan|kurdish', 'KU'],
    ['egypt', 'EG'], ['morocco', 'MA'], ['algeria', 'DZ'], ['tunisia', 'TN'], ['somalia', 'SO'], ['sudan', 'SD'], ['south africa|dstv', 'ZA'],
    ['india', 'IN'], ['pakistan', 'PK'], ['bangladesh', 'BD'], ['sri lanka', 'LK'], ['china', 'CN'], ['hong kong', 'HK'], ['taiwan', 'TW'], ['japan', 'JP'],
    ['korea', 'KR'], ['vietnam', 'VN'], ['thailand', 'TH'], ['cambodia', 'KH'], ['philippines', 'PH'], ['indonesia', 'ID'], ['malaysia', 'MY'],
    ['australia|new zealand', 'AU'], ['brazil|globoplay|brasileirao', 'BR'], ['argentina', 'AR'], ['chile', 'CL'], ['uruguay', 'UY'], ['peru', 'PE'],
    ['paraguay', 'PY'], ['ecuador', 'EC'], ['bolivia', 'BO'], ['venezuela', 'VE'], ['colombia', 'CO'], ['el salvador', 'SV'], ['dominican', 'DO'],
    ['caribbean', 'CARIB'], ['nordic', 'SE,NO,DK,FI'], ['ex-yu|ex yu', 'HR,BA,RS'], ['barn|astrid lindgren|beck|johan falk|wallander', 'SE'],
    ['montalbano|bud spencer', 'IT'], ['nbc sports', 'US'], ['dazn es', 'ES'],
    ['arabic|thamanya|alwan|bein entertainment|al-majd|ramadan', 'ARAB'], ['ar north africa', 'NAFR'], ['africa', 'AFRICA'],
    ['latino|peliculas|culturales|infantiles|noticias|lat', 'LATAM'],
    ['24/7 english|24/7 movies|ufc|fifa\\+|world football|world padel|formula 1|motogp|bein sports|victory\\+|music package|sport package|multi-sub|english|disney|imdb|box set|bond|van damme|cheech|jackie chan|halloween movies|kids movies|music concerts|relaxing music|dramabite|recent releases', 'INTL']
  ].map(function (p) { return [new RegExp('(^|[^a-z])(' + p[0] + ')([^a-z]|$)', 'i'), p[1].split(',')]; });
  // trailing / bracketed codes. GB->UK, ENG->English handled separately.
  var ALIAS = { GB: 'UK', EN: null, ENG: null, LAT: null, AU: 'AU', JP: 'JP', MX: 'MX', CH: 'CH', EC: 'EC', SK: 'SK', BR: 'BR', IE: 'IE' };
  var LANGS = [
    ['english|\\[eng\\]|\\(eng\\)|multi-sub|dramabite|\\[ ?english ?\\]', 'English'], ['arabic|\\[ar\\]', 'Arabic'], ['kurdish', 'Kurdish'],
    ['latino|peliculas|noticias|culturales|infantiles|deportes|eventos|concaf', 'Spanish'], ['french|actualités|enfant|documentaire|cinéma|québec', 'French'],
    ['hindi', 'Hindi'], ['turkish', 'Turkish']
  ].map(function (p) { return [new RegExp(p[0], 'i'), p[1]]; });
  var SUBTITLE = /\[[^\]]*(sub|subtitle)[^\]]*\]|\([^)]*sub[^)]*\)/ig;
  var TYPES = [
    ['Adult', 'adult|18\\+|porn'],
    ['Sports', 'sport|spor\\b|desporto|deportes|football|futbol|soccer|league|liga|ligue|ligan|serie a|nba|nfl|nhl|mlb|milb|mls|ufc|mma|fite|pdc|golf|tennis|padel|racing|f1|motogp|hockey|handboll|innebandy|speedway|folkrace|dazn|espn|bein|eurosport|ppv|fifa|uefa|epl|efl|spfl|ncaa|wnba|baseball|softball|cup|victory\\+|n1 sports|dirtvision|elitserien|allsvenskan|tsn|skweek|direktesport|urheilu|events?\\b|eventos|campeonato|niké|tc\\+'],
    ['News', 'news|noticias|actualités|nyheter|aftonbladet|sportexpressen'],
    ['Documentary', 'documentar|dokument|belgesel|culturales|cultura|discovery|truecrime|true crime'],
    ['Kids', 'kids|barn\\b|enfant|infantil|djecija|cocuk|crtani|family|animation|disney|astrid lindgren|christmas'],
    ['Music', 'music|concert'],
    ['Religion', 'islamic|christian|al-majd|ramadan'],
    ['Series', 'series|drama|original|britbox|dramabite|komplett|wallander|montalbano|beck\\b|johan falk|hulu|box set|netflix'],
    ['Movies', 'movie|film|cinema|cinéma|sinema|peliculas|videoclub|premiere|collection|imdb|bond|bud spencer|cheech|van damme|halloween|24/7'],
    ['Entertainment', 'entertainment|vermaak|lifestyle|reality|comedy|tematicos|general|numericable|tnt|thamanya|alwan|play\\b|plus|plex|tubi|peacock|apple\\+|prime|hbo|network|local|international']
  ].map(function (p) { return [p[0], new RegExp(p[1], 'i')]; });

  function uniq(a) { var o = {}, r = []; for (var i = 0; i < a.length; i++) if (a[i] && !o[a[i]]) { o[a[i]] = 1; r.push(a[i]); } return r; }
  function codeOk(c) { c = ALIAS.hasOwnProperty(c) ? ALIAS[c] : c; return c && C[c] ? c : null; }

  function classifyCat(name, kind) {
    var clean = name.replace(SUBTITLE, ' '), co = [], la = [], ty = [];
    NAMES.forEach(function (p) { if (p[0].test(clean)) co = co.concat(p[1]); });
    var m = clean.replace(/\[b\]/ig, '').trim().match(/(?:^|\s)([A-Z]{2})$/); // "Viaplay Sport SE"
    if (m && codeOk(m[1])) co.push(codeOk(m[1]));
    LANGS.forEach(function (p) { if (p[0].test(clean)) la.push(p[1]); });
    // pan-regional only if nothing more specific
    var spec = co.filter(function (c) { return ['ARAB', 'NAFR', 'AFRICA', 'LATAM', 'INTL'].indexOf(c) < 0; });
    if (spec.length) co = spec;
    else if (co.indexOf('NAFR') >= 0) co = ['NAFR'];
    else if (co.length > 1) co = [co[0]];
    TYPES.forEach(function (p) { if (p[1].test(name)) ty.push(p[0]); });
    if (ty.indexOf('Adult') >= 0) ty = ['Adult'];
    if (!co.length && /multi-sub|multi-audio/i.test(name)) { co = ['INTL']; if (!la.length) la = ['English']; }
    if (ty.indexOf('Sports') >= 0 && /replay|events?\b/i.test(name) && kind !== 'live') ty = ['Sports'];
    if (ty.length > 1) ty = ty.filter(function (t) { return t !== 'Entertainment'; });
    if (kind === 'live' && !ty.length) ty = ['General'];
    if (kind === 'vod' && !ty.length) ty = ['Movies'];
    if (kind === 'series' && !ty.length) ty = ['Series'];
    co = uniq(co);
    if (!la.length) co.forEach(function (c) { la.push(C[c][1]); });
    return { co: co, la: uniq(la), ty: uniq(ty) };
  }
  // per-item extras: VOD "[CZ]" / "(1994) [CZ]" / "[KIDS]"; live "Channel FHD CZ" / "|Hindi| Zee"
  var BR = /\[([A-Za-z]{2,4})\]/g;
  var LIVE_T = [
    ['News', /news|nyheter|noticias|\bcnn\b|bbc world|al ?jazeera|euronews|bloomberg|cnbc|msnbc|nhk world|france 24|\bdw\b|\brt\b|actualit|\bhaber|\bvesti/i],
    ['Sports', /sport|espn|eurosport|bein|dazn|arena|golf|nba|nfl|nhl|tennis|motor|racing|fight|ufc|fotboll|football|soccer|hockey|liga|ppv|event/i],
    ['Kids', /kids|cartoon|nick|boomerang|baby|junior|barn|disney (jr|junior|channel)|duck|cbeebies|cocuk|infantil|enfant|toons|pbs kids/i],
    ['Documentary', /discovery|nat ?geo|national geographic|history|animal planet|docu|dokument|explore|nature|science|investigation|crime|belgesel|viasat (explore|nature|history)/i],
    ['Music', /music|mtv|vh1|stingray|hits|musik|radio|clubland|kerrang/i],
    ['Movies', /cinema|movie|film|tcm|amc|paramount|sky cinema|hbo|cine|sinema|kino|24\/7/i]
  ];
  var GENRE = [
    ['Documentary', /docu|dokument|documentario|documental/i], ['Kids', /kids|animation|animerat|family|familj|familie|famiglia|barn/i],
    ['Comedy', /comedy|komedi|komödie|commedia|كوميديا/i], ['Crime', /crime|kriminal|krimi|криминал|mystery|mystik/i],
    ['Drama', /drama|dramma|dráma|دراما|драма|soap/i], ['Action & Adventure', /action|adventure|war|western/i],
    ['Sci-Fi & Fantasy', /sci-fi|science fiction|fantasy/i], ['Reality & Talk', /reality|virkelighed|talk/i], ['News & Politics', /news|politics/i]
  ];
  function classifyItem(name, kind, cat, genre) {
    var co = [], la = [], ty = [], m;
    if (genre) for (var gi = 0; gi < GENRE.length; gi++) if (GENRE[gi][1].test(genre)) ty.push(GENRE[gi][0]);
    if (kind === 'live') {
      if (!cat.co.length) {
        m = name.replace(/[.\s]+$/, '').match(/\s([A-Z]{2})$/);
        if (m && codeOk(m[1])) co.push(codeOk(m[1]));
      }
      m = name.match(/^\|([A-Za-z]+)\|/); if (m) la.push(m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase());
      if (cat.ty.length === 1 && cat.ty[0] === 'General') {
        for (var i = 0; i < LIVE_T.length; i++) if (LIVE_T[i][1].test(name)) { ty.push(LIVE_T[i][0]); break; }
      }
    } else {
      BR.lastIndex = 0;
      while ((m = BR.exec(name))) {
        var t = m[1].toUpperCase();
        if (t === 'KIDS') ty.push('Kids');
        else if (t === 'AR' && !/sub/i.test(name.slice(m.index, m.index + 10))) la.push('Arabic');
        else if (t === 'ENG' || t === 'EN') la.push('English');
        else if (codeOk(t) && t !== 'PRE') { co.push(codeOk(t)); la.push(C[codeOk(t)][1]); }
      }
    }
    if (!co.length && !la.length && !ty.length) return null;
    return {
      co: uniq(co.length ? co : cat.co),
      la: uniq(la.length ? la : (co.length ? co.map(function (c) { return C[c][1]; }) : cat.la)),
      ty: ty.length && cat.ty.length === 1 && cat.ty[0] === 'General' ? uniq(ty) : uniq(cat.ty.concat(ty))
    };
  }
  function continents(co) { return uniq(co.map(function (c) { return C[c] && C[c][2]; })); }
  g.MTVClassify = { classifyCat: classifyCat, classifyItem: classifyItem, continents: continents, COUNTRIES: C };
})(window);

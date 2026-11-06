// Lecture des tableaux de sondages (1er tour) d'une page « Liste de sondages … » de Wikipédia (fr).
// N'utilise que des API DOM standard : fonctionne dans un navigateur (DOMParser) et dans Node (linkedom).
function parseWikiPolls(doc, opts) {
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const PARTICLES = new Set(['le', 'la', 'de', 'du', 'des', "d'", 'van', 'von']);
  const CANON = [['cevipof', 'Ipsos'], ['ipsos', 'Ipsos'], ['ifop', 'Ifop'], ['harris', 'Harris Interactive'], ['toluna', 'Harris Interactive'],
    ['opinion', 'OpinionWay'], ['elabe', 'Elabe'], ['bva', 'BVA'], ['odoxa', 'Odoxa'], ['kantar', 'Kantar (TNS Sofres)'], ['sofres', 'Kantar (TNS Sofres)'],
    ['csa', 'CSA'], ['lh2', 'LH2'], ['cluster', 'Cluster17'], ['yougov', 'YouGov'], ['atlas', 'AtlasIntel'], ['verian', 'Verian'],
    ['dedicated', 'Dedicated Research'], ['scan research', 'Scan Research'], ['future thinking', 'Future Thinking'], ['viavoice', 'Viavoice'],
    ['ispos', 'Ipsos'], ['institut montaigne', 'Ipsos']];
  const txt = (n) => (n.textContent || '').replace(/\[[^\]]*\]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const span = (c, a) => Math.max(1, parseInt(c.getAttribute(a) || '1', 10) || 1);
  const canon = (raw) => { const r = raw.toLowerCase(); for (const [k, v] of CANON) if (r.includes(k)) return v; return raw; };
  const surname = (s) => {
    s = s.replace(/\([^)]*\)/g, '').replace(/[*†‡]/g, '').trim();
    const tk = s.split(' ').filter(Boolean);
    if (tk.length >= 2 && !PARTICLES.has(tk[0].toLowerCase())) tk.shift();
    while (tk.length >= 2 && PARTICLES.has(tk[0].toLowerCase()) && tk[0] !== 'Le' && tk[0] !== 'La') tk.shift(); // « de Villepin » -> « Villepin », garde « Le Pen »
    return tk.join(' ');
  };
  const generic = (h) => !h || /^(candidat|candidate|autres?|divers|blancs?|abstention|ind[ée]cis|ne se prononce|nsp|sans|non exprim|total)/i.test(h);
  const num = (s) => {
    s = s.replace(/\s/g, '').replace(',', '.');
    let m = /^<(\d+(?:\.\d+)?)/.exec(s); if (m) return +m[1] / 2;
    m = /^(\d+(?:\.\d+)?)/.exec(s); return m ? +m[1] : null;
  };
  const MRE = /(janvier|janv\.?|février|févr\.?|fév\.?|fevrier|mars|avril|avr\.?|mai|juin|juillet|juil\.?|août|aout|septembre|sept\.?|octobre|oct\.?|novembre|nov\.?|décembre|déc\.?|decembre)/g;
  const monthOf = (w) => { w = w.toLowerCase(); if (w.startsWith('juil')) return 6; if (w.startsWith('juin')) return 5; if (w.startsWith('janv')) return 0;
    if (w.startsWith('f')) return 1; if (w.startsWith('mar')) return 2; if (w.startsWith('av')) return 3; if (w.startsWith('mai')) return 4;
    if (w.startsWith('ao')) return 7; if (w.startsWith('sep')) return 8; if (w.startsWith('oct')) return 9; if (w.startsWith('nov')) return 10; if (w.startsWith('d')) return 11; return -1; };
  const lastMonth = (s) => { const m = (s.toLowerCase().match(MRE) || []); return m.length ? monthOf(m[m.length - 1]) : -1; };
  const endDate = (d, year, defMonth) => {
    d = d.toLowerCase().replace(/1er/g, '1').replace(/ au /g, '-').replace(/^du /, '').replace(/ et /g, '-').replace(/–|—/g, '-');
    const parts = d.split('-').map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1] || d;
    const dm = /(\d{1,2})(?!\d)/.exec(last); if (!dm) return null;
    let mi = lastMonth(last);
    if (mi < 0) mi = lastMonth(d);
    if (mi < 0) mi = defMonth;
    if (mi == null || mi < 0) return null;
    const ym = /(20\d\d)/.exec(d); const y = ym ? +ym[1] : year;
    if (!y) return null;
    return `${y}-${String(mi + 1).padStart(2, '0')}-${String(+dm[1]).padStart(2, '0')}`;
  };
  // entrées d'une cellule : « 6,5 <small>Hollande (PS)</small> <hr> 2 <small>Ruffin</small> »
  const entries = (cell) => {
    const segs = [[]];
    for (const n of cell.childNodes) {
      if (n.nodeName === 'HR') segs.push([]); else segs[segs.length - 1].push(n);
    }
    return segs.map((ns) => {
      let val = '', name = '';
      for (const n of ns) {
        if (n.nodeName === 'SMALL') name += ' ' + txt(n);
        else if (n.nodeName === 'SUP') continue;
        else val += ' ' + (n.textContent || '');
      }
      val = val.replace(/\[[^\]]*\]/g, '').trim();
      name = name.trim();
      if (!name) { const m = /^([<\d\s.,]+)\s*([A-Za-zÀ-ÿ].*)$/.exec(val.replace(/ /g, ' ')); if (m) { val = m[1]; name = m[2]; } }
      return {v: num(val), name: name ? surname(name) : ''};
    }).filter((e) => e.v != null);
  };

  const out = [], results = [];
  let h2 = '', h3 = '';
  for (const el of doc.querySelectorAll('h2, h3, h4, table')) {
    if (/^H[234]$/.test(el.nodeName)) { if (el.nodeName === 'H2') { h2 = txt(el); h3 = ''; } else h3 = txt(el); continue; }
    if (!(el.getAttribute('class') || '').includes('wikitable')) continue;
    if (opts.section && !opts.section.test(h2)) continue;
    if (opts.skipSub && opts.skipSub.test(h3)) continue;
    const cap = el.querySelector('caption'); const capT = cap ? txt(cap) : '';
    const ym = /(20\d\d)/.exec(h3) || /(20\d\d)/.exec(capT) || /(20\d\d)/.exec(h2);
    const year = ym ? +ym[1] : (opts.year || null);
    const defMonth = lastMonth(capT) >= 0 ? lastMonth(capT) : lastMonth(h3);

    // grille (rowspan / colspan)
    const trs = [...el.querySelectorAll('tr')];
    const grid = [];
    trs.forEach((tr, r) => {
      grid[r] = grid[r] || [];
      let c = 0;
      for (const cell of [...tr.children].filter((x) => x.nodeName === 'TD' || x.nodeName === 'TH')) {
        while (grid[r][c]) c++;
        const rs = span(cell, 'rowspan'), cs = span(cell, 'colspan');
        for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) {
          grid[r + i] = grid[r + i] || [];
          grid[r + i][c + j] = {cell, r0: r, c0: c, cs, row: r};
        }
        c += cs;
      }
    });
    const isBody = (r) => trs[r] && [...trs[r].children].some((x) => x.nodeName === 'TD' && /\d/.test(x.textContent || ''));
    const firstBody = grid.findIndex((_, r) => isBody(r));
    if (firstBody < 1) continue;
    const ncol = Math.max(...grid.slice(0, firstBody + 1).map((g) => g.length));
    const head = [];
    for (let c = 0; c < ncol; c++) {
      let h = '';
      for (let r = firstBody - 1; r >= 0 && !h; r--) { const g = grid[r][c]; if (g) { const t = txt(g.cell); if (/[A-Za-zÀ-ÿ]/.test(t)) h = t; } }
      head[c] = h;
    }
    const colP = head.findIndex((h) => /sondeur|institut/i.test(h));
    const colD = head.findIndex((h) => /^date|dates|terrain/i.test(h));
    if (colP < 0 || colD < 0) continue;
    const skipCols = new Set(head.map((h, c) => (/^(sondeur|institut|dates?|terrain|[ée]chantillon|mode d|commanditaire|marge|abstention|ind[ée]cis)/i.test(h) ? c : -1)).filter((c) => c >= 0));

    const seen = new Map();
    for (let r = firstBody; r < grid.length; r++) {
      const g = grid[r]; if (!g || !g[colP] || !g[colD]) continue;
      if ([...trs[r].children].some((x) => span(x, 'colspan') >= 8)) continue; // ligne d'événement
      const pollRaw = txt(g[colP].cell).replace(/archive/gi, '').trim();
      const terrain = txt(g[colD].cell);
      const date = endDate(terrain, year, defMonth);
      if (!date) continue;
      const vals = {};
      const done = new Set();
      for (let c = 0; c < g.length; c++) {
        if (skipCols.has(c) || !g[c]) continue;
        const cell = g[c].cell;
        if (done.has(cell)) continue; done.add(cell);
        const hc = head[g[c].c0] ? surname(head[g[c].c0]) : '';
        for (const e of entries(cell)) {
          let name = e.name || ((generic(head[g[c].c0]) || /\/| ou /.test(head[g[c].c0])) ? '' : hc);
          if (!name || name.includes('/')) continue;
          if (opts.alias && opts.alias[name]) name = opts.alias[name];
          if (vals[name] == null) vals[name] = e.v;
        }
      }
      if (!Object.keys(vals).length) continue;
      if (/r[ée]sultat|scrutin|[ée]lection/i.test(pollRaw)) { results.push({date, vals}); continue; }
      const key = g[colP].cell;
      const hyp = (seen.get(key) || 0) + 1; seen.set(key, hyp);
      out.push({date, terrain, institut: canon(pollRaw), publie: pollRaw, hypothese: hyp, vals});
    }
  }
  return {rows: out, results};
}
if (typeof module !== 'undefined') module.exports = {parseWikiPolls};

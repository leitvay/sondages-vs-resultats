// Met à jour site/data/sondages_2027.json depuis la page Wikipédia des sondages 2027.
// Lancé chaque jour par GitHub Actions. N'écrit le fichier que si les nouvelles données passent les contrôles.
const fs = require('fs');
const path = require('path');
const {DOMParser} = require('linkedom');
const {parseWikiPolls} = require('./parse-wiki.js');

const PAGE = "Liste_de_sondages_sur_l'élection_présidentielle_française_de_2027";
const ELECTION = '2027-04-11';          // 1er tour supposé (date pas encore fixée officiellement)
const MIN_HYP = 5;                      // un candidat doit être testé au moins 5 fois pour avoir sa colonne
const OUT = path.join(__dirname, '..', 'site', 'data', 'sondages_2027.json');
const META = ['date', 'terrain', 'institut', 'hypothese'];

const fail = (msg) => { console.error('ÉCHEC : ' + msg); process.exit(1); };

(async () => {
  const url = 'https://fr.wikipedia.org/w/api.php?action=parse&format=json&formatversion=2&prop=text&page=' + encodeURIComponent(PAGE);
  const res = await fetch(url, {headers: {'User-Agent': 'sondages-vs-resultats/1.0 (mise a jour quotidienne)'}});
  if (!res.ok) fail('Wikipédia a répondu ' + res.status);
  const json = await res.json();
  if (!json.parse || !json.parse.text) fail('réponse inattendue de Wikipédia');
  const doc = new DOMParser().parseFromString('<!doctype html><html><body>' + json.parse.text + '</body></html>', 'text/html');

  const R = parseWikiPolls(doc, {section: /premier tour/i, skipSub: /^autres$/i, year: 2026});
  const t0 = new Date(Date.parse(ELECTION) - 365 * 864e5).toISOString().slice(0, 10);
  const win = R.rows.filter((r) => r.date >= t0 && r.date < ELECTION);

  // colonnes : candidats testés au moins MIN_HYP fois, + ceux déjà présents dans le fichier actuel
  const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
  const oldCands = old.length ? Object.keys(old[0]).filter((k) => !META.includes(k)) : [];
  const cnt = {};
  for (const r of win) for (const k of Object.keys(r.vals)) cnt[k] = (cnt[k] || 0) + 1;
  const cands = [...new Set([...oldCands, ...Object.keys(cnt).filter((k) => cnt[k] >= MIN_HYP).sort((a, b) => cnt[b] - cnt[a])])];

  const rows = win.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map((r) => {
    const o = {date: r.date, terrain: r.terrain, institut: r.institut, hypothese: r.hypothese};
    for (const c of cands) o[c] = r.vals[c] == null ? null : r.vals[c];
    return o;
  });

  // contrôles : en cas de doute, on garde les anciennes données et le robot signale l'échec
  if (rows.length < 50) fail('seulement ' + rows.length + ' lignes lues : la page a sans doute changé de structure');
  if (old.length && rows.length < old.length * 0.9) fail(`${rows.length} lignes au lieu de ${old.length} : des sondages auraient disparu`);
  const lastOld = old.length ? old[old.length - 1].date : '';
  const lastNew = rows[rows.length - 1].date;
  if (lastNew < lastOld) fail(`le sondage le plus récent (${lastNew}) est plus ancien que celui déjà publié (${lastOld})`);
  if (lastNew > new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10)) fail('date dans le futur : ' + lastNew);
  for (const must of ['Mélenchon', 'Le Pen']) if (!cands.includes(must)) fail('candidat introuvable : ' + must);
  const bad = rows.filter((r) => { const s = cands.reduce((a, c) => a + (r[c] || 0), 0); return s < 70 || s > 112; });
  if (bad.length > rows.length * 0.05) fail(bad.length + ' sondages dont le total des candidats est incohérent');
  for (const r of rows) for (const c of cands) if (r[c] != null && (r[c] < 0 || r[c] > 60)) fail(`valeur impossible : ${c} = ${r[c]} (${r.date}, ${r.institut})`);

  const text = JSON.stringify(rows);
  if (old.length && JSON.stringify(old) === text) { console.log('Aucun changement (' + rows.length + ' lignes, dernier sondage ' + lastNew + ').'); return; }
  fs.writeFileSync(OUT, text);
  const added = rows.length - old.length;
  console.log(`Mis à jour : ${rows.length} lignes (${added >= 0 ? '+' : ''}${added}), dernier sondage ${lastNew}, ${cands.length} candidats.`);
})().catch((e) => fail(e.stack || String(e)));

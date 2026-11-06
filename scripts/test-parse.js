// Test du lecteur de tableaux sur un petit tableau qui imite la structure de Wikipédia.
const assert = require('assert');
const {DOMParser} = require('linkedom');
const {parseWikiPolls} = require('./parse-wiki.js');
const html = `<!doctype html><html><body>
<div class="mw-heading"><h2>Sondages concernant le premier tour</h2></div>
<div class="mw-heading"><h3>Second semestre 2026</h3></div>
<table class="wikitable">
<tr><th rowspan="3">Sondeur</th><th rowspan="3">Date</th><th rowspan="3">Échantillon</th><th></th><th colspan="2"></th><th></th><th rowspan="2">Autres</th></tr>
<tr><th>Mélenchon (LFI)</th><th colspan="2">Glucksmann<sup>[c]</sup> (PP)</th><th>Le Pen (RN)</th></tr>
<tr><td></td><td colspan="2"></td><td></td></tr>
<tr><td rowspan="2">Ifop <a>[archive]</a></td><td rowspan="2">27-29 octobre</td><td rowspan="2">1 501</td><td rowspan="2">18</td><td colspan="2">10</td><td>35</td><td>—</td></tr>
<tr><td colspan="2">4<br><small>Faure (PS)</small></td><td>36</td><td>2<br><small>Ruffin</small><hr>1,5<br><small>Villepin</small></td></tr>
<tr><td colspan="8">Événement : premier débat présidentiel (12 octobre)</td></tr>
<tr><td>Ipsos</td><td>du 1er au 3 septembre</td><td>1 000</td><td>&lt;1</td><td colspan="2">12</td><td>34</td><td>—</td></tr>
</table></body></html>`;
const doc = new DOMParser().parseFromString(html, 'text/html');
const R = parseWikiPolls(doc, {section: /premier tour/i, year: 2026});
console.log(JSON.stringify(R.rows, null, 1));
assert.strictEqual(R.rows.length, 3);
assert.deepStrictEqual(R.rows[0], {date: '2026-10-29', terrain: '27-29 octobre', institut: 'Ifop', publie: 'Ifop', hypothese: 1, vals: {'Mélenchon': 18, Glucksmann: 10, 'Le Pen': 35}});
assert.deepStrictEqual(R.rows[1].vals, {'Mélenchon': 18, Faure: 4, 'Le Pen': 36, Ruffin: 2, Villepin: 1.5});
assert.strictEqual(R.rows[1].hypothese, 2);
assert.strictEqual(R.rows[2].date, '2026-09-03');
assert.strictEqual(R.rows[2].vals['Mélenchon'], 0.5);
console.log('OK');

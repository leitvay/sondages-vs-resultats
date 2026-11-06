// Petit moteur qui remplace celui du tableau de bord Claude : charge les données JSON et lance les dessins.
window.dash = (() => {
  const FILES = {s2012: 'data/sondages_2012.json', s2017: 'data/sondages_2017.json', s2022: 'data/sondages_2022.json',
    s2027: 'data/sondages_2027.json', resultats: 'data/resultats.json'};
  const DATA = {}, STATUS = {};
  const draws = new Map(), widths = new WeakMap();
  let started = false, queued = false;
  const visible = (el) => el.isConnected && !el.closest('[hidden]');
  const runEl = (name, el) => {
    const f = draws.get(name); if (!f || !visible(el)) return;
    widths.set(el, el.clientWidth);
    try { (typeof f === 'function' ? f : f.update)(el); } catch (e) { console.error(name, e); }
    widths.set(el, el.clientWidth);
  };
  const run = (name) => { for (const el of document.querySelectorAll('[data-draw="' + name + '"]')) runEl(name, el); };
  const runAll = () => { for (const n of draws.keys()) run(n); };
  const schedule = () => { if (!started || queued) return; queued = true; requestAnimationFrame(() => { queued = false; runAll(); }); };
  const load = (id) => {
    if (STATUS[id]) return;
    STATUS[id] = 'loading';
    fetch(FILES[id], {cache: 'no-cache'})
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((j) => { DATA[id] = j; STATUS[id] = 'ok'; schedule(); })
      .catch(() => { STATUS[id] = 'error'; schedule(); });
  };
  const ro = new ResizeObserver((entries) => {
    for (const en of entries) {
      const el = en.target, w = el.clientWidth;
      if (widths.has(el) && Math.abs(widths.get(el) - w) < 1) continue;
      runEl(el.dataset.draw, el);
    }
  });
  new MutationObserver((ms) => { if (ms.some((m) => !m.target.closest('[data-draw]'))) schedule(); })
    .observe(document.documentElement, {attributes: true, attributeFilter: ['hidden'], subtree: true});
  return {
    data: (id) => {
      if (!FILES[id]) return {status: 'missing', data: [], columns: []};
      load(id);
      return STATUS[id] === 'ok' ? {status: 'ok', data: DATA[id], columns: Object.keys(DATA[id][0] || {}), meta: []} : {status: STATUS[id], data: [], columns: []};
    },
    draw: (name, fn) => { if (fn === undefined) { run(name); return; } draws.set(name, fn); schedule(); },
    onData: (fn) => { try { fn(); } catch (e) { console.error(e); } },
    setLink: () => {}, params: () => ({}), setParams: () => {}, resetParams: () => {}, refresh: () => {},
    _start: () => { started = true; for (const el of document.querySelectorAll('[data-draw]')) ro.observe(el); runAll(); },
  };
})();

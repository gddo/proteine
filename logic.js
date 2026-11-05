/* Logica pura: nessun accesso al DOM, così si può provare anche fuori dal browser. */
(function (root) {
  const SOURCES = [
    { id: 'legumi',     name: 'Legumi',               group: 'veg' },
    { id: 'rossa',      name: 'Carne rossa',          group: 'meat' },
    { id: 'bianca',     name: 'Carne bianca',         group: 'meat' },
    { id: 'pmagro',     name: 'Pesce magro',          group: 'fish' },
    { id: 'pgrasso',    name: 'Salmone o gamberi',    group: 'fish' },
    { id: 'scatola',    name: 'Pesce in scatola',     group: 'fish' },
    { id: 'fmagro',     name: 'Formaggio magro',      group: 'dairy' },
    { id: 'fstag',      name: 'Formaggio stagionato', group: 'dairy' },
    { id: 'ffresco',    name: 'Formaggio fresco',     group: 'dairy' },
    { id: 'uova',       name: 'Uova',                 group: 'egg' },
    { id: 'affettati',  name: 'Affettati',            group: 'meat' },
    { id: 'libero',     name: 'Pasto libero',         group: 'free' },
  ];
  const BY_ID = Object.fromEntries(SOURCES.map(s => [s.id, s]));
  const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const MEALS = { P: 'Pranzo', C: 'Cena' };

  const DEFAULT_PLAN = {
    label: 'Piano del 16 set 2026',
    times: { P: '13:00', C: '20:00' },
    targets: { bianca: 1, rossa: 2, pmagro: 1, scatola: 1, legumi: 2, uova: 3, fmagro: 2, fstag: 1, libero: 1 },
    portions: { bianca: '200 g', rossa: '150 g', pmagro: '200 g', scatola: '60 g', legumi: '150 g', uova: '2 uova', fmagro: '100 g', fstag: '50 g' },
    schedule: { '0P': 'bianca', '0C': 'legumi', '1P': 'scatola', '1C': 'uova', '2P': 'rossa', '2C': 'fmagro', '3P': 'legumi', '3C': 'uova', '4P': 'pmagro', '4C': 'fstag', '5P': 'rossa', '5C': 'libero', '6P': 'uova', '6C': 'fmagro' },
  };
  // Sostituzioni già decise: niente uova a pranzo e cena, due volte legumi, una volta salmone o gamberi.
  const DEFAULT_ADJ = { uova: -3, legumi: 2, pgrasso: 1 };

  const pad = n => String(n).padStart(2, '0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12); return x; };
  const dayIndex = d => (d.getDay() + 6) % 7;
  const mondayOf = d => addDays(d, -dayIndex(d));
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  /* Il pasto corrente cambia a metà strada tra gli orari di pranzo e cena del piano. */
  function currentMeal(now, plan) {
    const cut = (toMin(plan.times.P) + toMin(plan.times.C)) / 2;
    return now.getHours() * 60 + now.getMinutes() < cut ? 'P' : 'C';
  }
  function nextSlot(key, meal) {
    return meal === 'P' ? { date: key, meal: 'C' } : { date: dateKey(addDays(fromKey(key), 1)), meal: 'P' };
  }
  function prevSlot(key, meal) {
    return meal === 'C' ? { date: key, meal: 'P' } : { date: dateKey(addDays(fromKey(key), -1)), meal: 'C' };
  }
  const slotId = (date, meal) => `${date}|${meal}`;

  const targetOf = (state, id) => Math.max(0, (state.plan.targets[id] || 0) + (state.adj[id] || 0));
  const weekKeys = monday => Array.from({ length: 7 }, (_, i) => dateKey(addDays(monday, i)));

  function weekCounts(state, monday) {
    const c = {};
    for (const k of weekKeys(monday)) for (const m of ['P', 'C']) {
      const id = state.logs[slotId(k, m)];
      if (id) c[id] = (c[id] || 0) + 1;
    }
    return c;
  }
  function lastEaten(state, id, beforeKey) {
    let best = null;
    for (const [slot, v] of Object.entries(state.logs)) {
      if (v !== id) continue;
      const k = slot.split('|')[0];
      if (k <= beforeKey && (!best || k > best)) best = k;
    }
    return best;
  }

  /* Ordine delle icone: prima ciò che resta da mangiare in questa settimana (lun-dom).
     A parità: fonte prevista dal piano per quel pasto, poi quella mangiata meno di recente.
     La fonte del pasto precedente perde un punto, per non ripetere lo stesso alimento due volte di fila. */
  function rank(state, now) {
    const today = dateKey(now), monday = mondayOf(now);
    const meal = currentMeal(now, state.plan);
    const keys = weekKeys(monday);
    const counts = weekCounts(state, monday);

    let slot = { date: today, meal }, slotsLeft = 0, firstEmpty = null, s = { date: today, meal };
    while (keys.includes(s.date)) {
      if (!state.logs[slotId(s.date, s.meal)]) { slotsLeft++; if (!firstEmpty) firstEmpty = s; }
      s = nextSlot(s.date, s.meal);
    }
    if (firstEmpty) slot = firstEmpty;
    const prev = prevSlot(slot.date, slot.meal);
    const prevId = state.logs[slotId(prev.date, prev.meal)];
    const planned = state.plan.schedule[`${dayIndex(fromKey(slot.date))}${slot.meal}`];

    const rows = SOURCES.map((src, order) => {
      const target = targetOf(state, src.id), done = counts[src.id] || 0, rem = target - done;
      const last = lastEaten(state, src.id, today);
      return { id: src.id, src, target, done, rem, last, order,
        score: rem - (src.id === prevId ? 1 : 0),
        planMatch: planned === src.id,
        age: last ? (fromKey(today) - fromKey(last)) / 864e5 : 9999 };
    });
    const cmp = (a, b) => b.score - a.score || b.planMatch - a.planMatch || b.age - a.age || b.target - a.target || a.order - b.order;
    const todo = rows.filter(r => r.target > 0 && r.rem > 0 && r.id !== 'libero').sort(cmp);
    todo.push(...rows.filter(r => r.id === 'libero' && r.rem > 0));
    return {
      todo,
      covered: rows.filter(r => r.target > 0 && r.rem <= 0),
      off: rows.filter(r => r.target === 0),
      slot, meal, today, slotsLeft,
      remTotal: todo.reduce((n, r) => n + r.rem, 0),
    };
  }

  /* Aderenza: porzioni del piano effettivamente coperte, l'eccesso di una fonte non compensa un'altra. */
  function weekStats(state, monday, today) {
    const keys = weekKeys(monday), past = {}, future = {};
    let meals = 0;
    for (const k of keys) for (const m of ['P', 'C']) {
      const id = state.logs[slotId(k, m)];
      if (!id) continue;
      meals++;
      (k <= today ? past : future)[id] = ((k <= today ? past : future)[id] || 0) + 1;
    }
    let hit = 0, tot = 0;
    for (const s of SOURCES) { const t = targetOf(state, s.id); tot += t; hit += Math.min(t, past[s.id] || 0); }
    return { monday: dateKey(monday), past, future, meals, hit, tot, pct: tot ? Math.round(hit / tot * 100) : 0 };
  }
  function history(state, now, weeks) {
    const out = [];
    const m = mondayOf(now);
    for (let i = weeks - 1; i >= 0; i--) out.push(weekStats(state, addDays(m, -7 * i), dateKey(now)));
    return out;
  }
  function averages(state, now) {
    const weeks = history(state, now, 9).slice(0, 8).filter(w => w.meals > 0);
    return { n: weeks.length, avg: id => weeks.length ? weeks.reduce((a, w) => a + (w.past[id] || 0), 0) / weeks.length : 0 };
  }

  /* Lettura del PDF: righe di testo → intestazioni "Lunedì - Pranzo - 13:00" → alimenti del pasto. */
  const MATCHERS = [
    ['legumi', /legumi|ceci|fagiol|lenticchie|lupini|\bfave\b|piselli/],
    ['bianca', /carne bianca|pollo|tacchino|coniglio/],
    ['rossa', /carne rossa|manzo|vitello|agnello|maiale|cavallo/],
    ['affettati', /affettat|bresaola|prosciutto|fesa/],
    ['scatola', /tonno|sgombro|sardine|sarde|pesce in scatola/],
    ['pgrasso', /pesce grasso|salmone|gamber|crostace/],
    ['pmagro', /pesce magro|merluzzo|nasello|platessa|persico|trota|orata|branzino/],
    ['fmagro', /formaggi?o? magr|ricotta|fiocchi di latte/],
    ['fstag', /formaggi?o? stagionat|parmigiano|pecorino|gorgonzola|grana/],
    ['ffresco', /formaggi?o? fresc|mozzarella|crescenza|stracchino|feta/],
    ['uova', /\buova\b|\buovo\b/],
    ['libero', /pizza|pasto libero/],
  ];
  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const dayIdx = d => DAYS.findIndex(x => norm(x).replace('ì', 'i') === norm(d).replace('ì', 'i'));

  function parsePlan(lines) {
    const re = /^\s*(Luned[iì]|Marted[iì]|Mercoled[iì]|Gioved[iì]|Venerd[iì]|Sabato|Domenica)\s*-\s*(Colazione|Spuntino Mattina|Spuntino Pomeriggio|Merenda|Pranzo|Cena)\s*-\s*(\d{1,2})\s*[:\u0000]?\s*(\d{2})/i;  // il PDF codifica i due punti come carattere nullo
    const plan = { label: 'Piano caricato', times: {}, targets: {}, portions: {}, schedule: {} };
    let cur = null, found = 0;
    // La data può finire sulla riga accanto a «Elaborato il».
    const di = lines.findIndex(l => /Elaborato il/i.test(l));
    const dm = di >= 0 && lines.slice(Math.max(0, di - 1), di + 2).join(' ').match(/(\d{1,2} [a-z]{3,} \d{4})/i);
    if (dm) plan.label = `Piano del ${dm[1]}`;
    const unknown = [];
    const close = () => { if (cur && !cur.hit) unknown.push(`${DAYS[cur.day]} ${MEALS[cur.meal].toLowerCase()}`); };
    for (const raw of lines) {
      const h = raw.match(re);
      if (h) {
        close(); cur = null;
        const mealName = h[2].toLowerCase();
        if (mealName === 'pranzo' || mealName === 'cena') {
          const meal = mealName === 'pranzo' ? 'P' : 'C';
          cur = { day: dayIdx(h[1]), meal, hit: false };
          plan.times[meal] = plan.times[meal] || `${h[3].padStart(2, '0')}:${h[4]}`;
          found++;
        }
        continue;
      }
      if (!cur || /^Elaborato da/i.test(raw.trim())) continue;
      const line = norm(raw);
      for (const [id, rx] of MATCHERS) {
        if (!rx.test(line)) continue;
        if (!cur.hit) {
          cur.hit = true;
          plan.schedule[`${cur.day}${cur.meal}`] = id;
          plan.targets[id] = (plan.targets[id] || 0) + 1;
          const eggs = line.match(/(\d+) uova/), g = line.match(/(\d+)\s*(g|ml)\b/);
          if (!plan.portions[id] && id !== 'libero') {
            if (eggs) plan.portions[id] = `${eggs[1]} uova`;
            else if (g) plan.portions[id] = `${g[1]} ${g[2]}`;
          }
        }
        break;
      }
    }
    close();
    if (!found) throw new Error('Nel PDF non ci sono intestazioni come «Lunedì - Pranzo - 13:00». Carica il piano esportato da Nutribook, non una scansione.');
    if (!plan.times.P || !plan.times.C) throw new Error('Nel PDF manca l\'orario del pranzo o della cena.');
    return { plan, found, unknown };
  }

  const api = { SOURCES, BY_ID, DAYS, MEALS, DEFAULT_PLAN, DEFAULT_ADJ, dateKey, fromKey, addDays, dayIndex, mondayOf, currentMeal, nextSlot, slotId, targetOf, weekKeys, weekCounts, lastEaten, rank, weekStats, history, averages, parsePlan };
  if (typeof module !== 'undefined') module.exports = api; else root.L = api;
})(this);

const KEY = 'proteine.v1';
const { SOURCES, BY_ID, DAYS, MEALS, DEFAULT_PLAN, DEFAULT_ADJ, dateKey, fromKey, addDays, dayIndex, mondayOf, currentMeal, nextSlot, slotId, targetOf, weekKeys, weekCounts, lastEaten, rank, history, weekStats, averages, parsePlan } = L;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const HOLE = 'fill="var(--t-bg)"';
const ICONS = {
  bianca: `<ellipse cx="29" cy="19" rx="14" ry="11.5" transform="rotate(45 29 19)"/><path d="M20 28 11 37" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/><circle cx="8.5" cy="34.5" r="3.8"/><circle cx="13.5" cy="40" r="3.8"/>`,
  rossa: `<path d="M12 13c8-7 22-6 29 2 5 7 3 18-6 22-7 3-11-1-17 0-6 1-12-1-13-7-1-6 3-10 7-17z"/><circle cx="29" cy="20" r="4.5" ${HOLE}/><path d="M12 30c3-1 5-4 7-9" fill="none" stroke="var(--t-bg)" stroke-width="2.5" stroke-linecap="round"/>`,
  affettati: `<circle cx="18" cy="26" r="14" fill="none" stroke="currentColor" stroke-width="3.5"/><circle cx="30" cy="21" r="14"/><circle cx="26" cy="17" r="2.6" ${HOLE}/><circle cx="35" cy="23" r="2.2" ${HOLE}/><circle cx="28" cy="27" r="1.8" ${HOLE}/>`,
  pmagro: `<path d="M4 24c7-9 21-11 30-3l9-7v20l-9-7c-9 8-23 6-30-3z"/><circle cx="14" cy="22" r="2.4" ${HOLE}/>`,
  pgrasso: `<path d="M24 7c11 0 19 7 19 15 0 9-8 19-19 19S5 31 5 22C5 14 13 7 24 7z"/><path d="M24 12v25M15 15c3 6 3 12 0 19M33 15c-3 6-3 12 0 19" fill="none" stroke="var(--t-bg)" stroke-width="2.6" stroke-linecap="round"/>`,
  scatola: `<path d="M8 15v19c0 4 7 7 16 7s16-3 16-7V15z"/><ellipse cx="24" cy="15" rx="16" ry="7" stroke="var(--t-bg)" stroke-width="2.5"/><circle cx="32" cy="15" r="2.6" fill="none" stroke="var(--t-bg)" stroke-width="2"/><path d="M8 27c6 3 26 3 32 0" fill="none" stroke="var(--t-bg)" stroke-width="2.5"/>`,
  fstag: `<path d="M5 25 33 10c6 3 10 9 10 15z"/><path d="M5 27.5h38V39H5z"/><circle cx="15" cy="33" r="3" ${HOLE}/><circle cx="33" cy="34" r="2.3" ${HOLE}/><circle cx="29" cy="21" r="2.5" ${HOLE}/>`,
  fmagro: `<path d="M8 35c0-3 2-5 3-8 2-7 7-15 13-15s11 8 13 15c1 3 3 5 3 8z"/><path d="M4 39.5h40" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M16 26c5 3 11 3 16 0M14 32c6 2 14 2 20 0" fill="none" stroke="var(--t-bg)" stroke-width="2.2" stroke-linecap="round"/>`,
  ffresco: `<circle cx="24" cy="27" r="16"/><path d="M19 11c1-4 2-6 5-6s4 2 5 6c-3 2-7 2-10 0z"/><path d="M15 25c2-4 5-6 9-7" fill="none" stroke="var(--t-bg)" stroke-width="2.6" stroke-linecap="round"/>`,
  legumi: `<path d="M4 29c11 7 29 0 40-19 2 17-13 33-30 30-5-1-8-5-10-11z"/><circle cx="16" cy="25" r="5.5"/><circle cx="26" cy="20" r="5.5"/><circle cx="34" cy="12" r="4.8"/>`,
  uova: `<path d="M24 5c8 0 15 13 15 23a15 15 0 0 1-30 0C9 18 16 5 24 5z"/><path d="M17 25c0-5 2-9 5-12" fill="none" stroke="var(--t-bg)" stroke-width="2.6" stroke-linecap="round"/>`,
  libero: `<path d="M6 13C18 6 30 6 42 13L24 44z"/><circle cx="19" cy="17" r="3.4" ${HOLE}/><circle cx="30" cy="20" r="3.4" ${HOLE}/><circle cx="23" cy="29" r="3" ${HOLE}/>`,
};
const icon = id => `<svg class="ic" viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">${ICONS[id]}</svg>`;

function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* si riparte dai valori iniziali */ }
  return s && s.plan ? { logs: {}, adj: {}, ...s } : { plan: DEFAULT_PLAN, adj: { ...DEFAULT_ADJ }, logs: {} };
}
let state = load();
let tab = 'home', msg = null, toastTimer = null, picker = null;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { showToast('Salvataggio non riuscito: la memoria del browser è bloccata.'); }
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

const now = () => (window.__NOW ? new Date(window.__NOW) : new Date());
const fmtDay = k => { const d = fromKey(k); return `${DAYS[dayIndex(d)].toLowerCase()}`; };
function slotName(date, meal, today) {
  const m = MEALS[meal].toLowerCase();
  const tom = dateKey(addDays(fromKey(today), 1)), yest = dateKey(addDays(fromKey(today), -1));
  if (date === today) return `${m} di oggi`;
  if (date === tom) return `${m} di domani`;
  if (date === yest) return `${m} di ieri`;
  return `${m} di ${fmtDay(date)}`;
}
const cap = s => s[0].toUpperCase() + s.slice(1);
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MON3 = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

function pips(r, future) {
  const n = Math.max(r.target, 0); let out = '';
  for (let i = 0; i < n; i++) {
    const cls = i < r.done - future ? 'on' : i < r.done ? 'fut' : '';
    out += `<span class="pip ${cls}"></span>`;
  }
  const extra = r.done - r.target;
  return `<span class="pips" aria-label="${r.done} su ${r.target}">${out}${extra > 0 ? `+${extra}` : ''}</span>`;
}
function futureCount(id, today) {
  return Object.entries(state.logs).filter(([k, v]) => v === id && k.split('|')[0] > today && weekKeys(mondayOf(fromKey(today))).includes(k.split('|')[0])).length;
}
function lastText(r, today) {
  if (!r.last) return 'mai segnato';
  const d = (fromKey(today) - fromKey(r.last)) / 864e5;
  return d === 0 ? 'ultima volta oggi' : d === 1 ? 'ultima volta ieri' : d < 7 ? `ultima volta ${fmtDay(r.last)}` : `ultima volta ${Math.round(d)} giorni fa`;
}

function tile(r, i, today, cls = '') {
  const port = state.plan.portions[r.id];
  return `<button class="tile g-${r.src.group} ${cls}" id="t-${r.id}" type="button" data-src="${r.id}">
    ${i != null ? `<span class="rk">${i + 1}</span>` : ''}${icon(r.id)}
    <span class="nm">${r.src.name}</span>${r.target ? pips(r, futureCount(r.id, today)) : (r.done ? `<span class="pips">${r.done} fuori piano</span>` : '')}
  </button>`;
}
function hero(r, today, rk) {
  const port = state.plan.portions[r.id];
  const bits = [`${r.rem === 1 ? 'Ne manca 1' : `Ne mancano ${r.rem}`} su ${r.target}`, lastText(r, today)];
  return `<button class="tile first g-${r.src.group}" id="t-${r.id}" type="button" data-src="${r.id}">
    <span class="rk">1</span>${icon(r.id)}
    <span class="txt"><span class="nm">${r.src.name}${port ? ` ${port}` : ''}</span><span class="why">${bits.join(', ')}</span>${pips(r, futureCount(r.id, today))}</span>
  </button>`;
}

function renderHome() {
  const n = now(), R = rank(state, n), d = fromKey(R.today);
  const chip = m => {
    const id = state.logs[slotId(R.today, m)];
    return `<div class="${m === R.meal ? 'now' : ''}"><small>${MEALS[m]}${m === R.meal ? ', adesso' : ''}</small><b class="${id ? '' : 'none'}">${id ? BY_ID[id].name : 'Da segnare'}</b></div>`;
  };
  const left = R.slotsLeft === 0 ? 'Settimana completa'
    : `${R.slotsLeft === 1 ? 'Resta 1 pasto' : `Restano ${R.slotsLeft} pasti`} e ${R.remTotal === 1 ? '1 porzione' : `${R.remTotal} porzioni`} del piano`;
  let h = `<header class="head"><h1>${DAYS[dayIndex(d)]} ${d.getDate()} ${MONTHS[d.getMonth()]}</h1><p>${left}</p></header>
    <section class="today">${chip('P')}${chip('C')}</section>`;
  if (R.todo.length) {
    h += `<section class="grid" aria-label="Da mangiare, dalla scelta migliore">${hero(R.todo[0], R.today)}${R.todo.slice(1).map((r, i) => tile(r, i + 1, R.today)).join('')}</section>`;
  } else {
    h += `<p class="sec">Tutte le porzioni del piano sono coperte.</p>`;
  }
  if (R.covered.length) h += `<h2 class="sec">Già coperti questa settimana</h2><section class="grid done">${R.covered.map(r => tile(r, null, R.today, 'low')).join('')}</section>`;
  if (R.off.length) h += `<h2 class="sec">Fuori piano</h2><section class="grid">${R.off.map(r => tile(r, null, R.today, 'low')).join('')}</section>`;
  return h;
}

function renderPlan() {
  const n = now(), today = dateKey(n), hist = history(state, n, 8), cur = hist[hist.length - 1];
  const av = averages(state, n);
  const sources = SOURCES.filter(s => targetOf(state, s.id) > 0 || cur.past[s.id] || cur.future[s.id]);
  const weekRows = sources.map(s => {
    const t = targetOf(state, s.id), p = cur.past[s.id] || 0, f = cur.future[s.id] || 0, base = Math.max(t, p + f, 1);
    const last = lastEaten(state, s.id, today);
    const lastTxt = last ? `Ultima volta ${last === today ? 'oggi' : `il ${fromKey(last).getDate()} ${MON3[fromKey(last).getMonth()]}`}` : 'Mai segnato';
    return `<div class="row g-${s.group}"><span class="i">${icon(s.id)}</span>
      <div class="n">${s.name}<small>${lastTxt}${av.n ? `, media ${av.avg(s.id).toFixed(1).replace('.', ',')} a settimana` : ''}</small>
      <div class="bar">${p ? `<i style="width:${p / base * 100}%"></i>` : ''}${f ? `<i class="f" style="width:${f / base * 100}%"></i>` : ''}</div></div>
      <span class="val">${p + f} di ${t}</span></div>`;
  }).join('');
  const bars = hist.map(w => {
    const m = fromKey(w.monday);
    const last = w === cur;
    return `<div title="Settimana del ${m.getDate()} ${MON3[m.getMonth()]}: ${w.pct}%, ${w.meals} pasti segnati">${last ? `<b>${w.pct}%</b>` : ''}<i style="height:${Math.max(w.pct, 1) * .8}%"></i><span>${m.getDate()}/${m.getMonth() + 1}</span></div>`;
  }).join('');
  const total = SOURCES.reduce((a, s) => a + targetOf(state, s.id), 0);
  const steps = SOURCES.filter(s => targetOf(state, s.id) > 0 || state.plan.targets[s.id] || ['pgrasso', 'affettati', 'ffresco'].includes(s.id)).map(s => {
    const pl = state.plan.targets[s.id] || 0, t = targetOf(state, s.id);
    return `<div class="row g-${s.group}"><span class="i">${icon(s.id)}</span>
      <div class="n">${s.name}<small>${pl ? `Piano: ${pl}${state.plan.portions[s.id] ? `, ${state.plan.portions[s.id]}` : ''}` : 'Non nel piano'}</small></div>
      <div class="step"><button type="button" id="m-${s.id}" data-adj="${s.id}" data-d="-1" aria-label="Togli una porzione di ${s.name}">−</button><b>${t}</b><button type="button" id="p-${s.id}" data-adj="${s.id}" data-d="1" aria-label="Aggiungi una porzione di ${s.name}">+</button></div></div>`;
  }).join('');
  const sum = hist.reduce((a, w) => a + w.meals, 0);
  return `<header class="head"><h1>Piano e statistiche</h1></header>
  <section class="card"><h2>Questa settimana</h2>
    <div><div class="kpi">${cur.pct}%</div><p class="sub">del piano mangiato finora (${cur.hit} porzioni su ${cur.tot}). Pasti segnati: ${cur.meals} su 14.</p></div>
    ${weekRows}
  </section>
  <section class="card"><h2>Ultime 8 settimane</h2>
    ${sum ? `<div class="bars">${bars}</div><p class="sub">Percentuale di porzioni del piano mangiate per settimana. Sotto: lunedì della settimana. Tocca o passa su una colonna per il dettaglio.</p>` : `<p class="sub">Segna il primo pasto dalla schermata Mangia e qui compare l'andamento.</p>`}
  </section>
  <section class="card"><h2>La mia dieta</h2>
    <p class="sub">${esc(state.plan.label)}. Orari: pranzo ${state.plan.times.P}, cena ${state.plan.times.C}.</p>
    ${msg ? `<p class="msg ${msg.err ? 'err' : ''}">${esc(msg.text)}</p>` : ''}
    <button class="btn" id="load-pdf" type="button">Carica il PDF della dieta</button>
    <p class="sub">Il PDF viene letto sul telefono e non esce da qui. Al caricamento le porzioni del piano si aggiornano, le tue modifiche qui sotto restano.</p>
  </section>
  <section class="card"><h2>Porzioni a settimana</h2>
    <p class="sub">Totale ${total} su 14 pasti. Modificale per registrare le sostituzioni: l'ordine delle icone le segue.</p>
    ${steps}
    <button class="btn alt" id="reset-adj" type="button">Usa le porzioni del PDF</button>
  </section>
  <section class="card"><h2>Copia di sicurezza</h2>
    <p class="sub">I dati stanno solo su questo telefono. Scaricali ogni tanto: servono anche per ripristinarli se cambi telefono.</p>
    <div class="btns"><button class="btn alt" id="export" type="button">Scarica i dati</button><button class="btn alt" id="import" type="button">Ripristina</button></div>
  </section>`;
}

function render() {
  $('#view').innerHTML = tab === 'home' ? renderHome() : renderPlan();
  document.querySelectorAll('.tabs button').forEach(b => b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  if (picker) renderPicker();
}

function cellHtml(k, m, today, cur) {
  const id = state.logs[slotId(k, m)], time = k < today ? 'past' : (k > today || (k === today && m === 'C' && cur.meal === 'P')) ? 'fut' : '';
  const isCur = k === cur.date && m === cur.meal;
  const src = id && BY_ID[id];
  const label = `${cap(slotName(k, m, today))}: ${src ? src.name : 'vuoto'}`;
  return `<button type="button" id="c-${k}-${m}" class="cell ${time} ${id ? `full g-${src.group}` : 'empty'} ${isCur ? 'cur' : ''}" data-date="${k}" data-meal="${m}" aria-label="${label}">${src ? `${icon(id)}<span>${src.name}</span>` : '+'}</button>`;
}
function quick(slot, today, label, main) {
  const id = state.logs[slotId(slot.date, slot.meal)];
  return `<button type="button" id="q-${main ? 'now' : 'next'}" class="q ${main ? 'main' : ''}" data-date="${slot.date}" data-meal="${slot.meal}"><small>${label}</small><b>${cap(slotName(slot.date, slot.meal, today))}</b><span>${id ? `C'è già: ${BY_ID[id].name}` : ''}</span></button>`;
}
function renderPicker() {
  const n = now(), today = dateKey(n), meal = currentMeal(n, state.plan), src = BY_ID[picker.id];
  const cur = { date: today, meal }, nx = nextSlot(today, meal);
  const keys = weekKeys(picker.monday);
  const a = picker.monday, b = addDays(a, 6);
  const range = `${a.getDate()} ${MON3[a.getMonth()]} – ${b.getDate()} ${MON3[b.getMonth()]}`;
  const rows = keys.map((k, i) => {
    const d = fromKey(k);
    return `<div class="d ${k === today ? 't' : ''}">${DAYS[i].slice(0, 3)}<small>${d.getDate()}</small></div>${cellHtml(k, 'P', today, cur)}${cellHtml(k, 'C', today, cur)}`;
  }).join('');
  $('#sheet').innerHTML = `<div class="sheet-in">
    <div class="sh-head g-${src.group}">${icon(src.id)}<h2 id="sh-t">${src.name}</h2><button class="close" id="close" type="button" aria-label="Chiudi">×</button></div>
    <div class="quick">${quick(cur, today, 'Adesso', true)}${quick(nx, today, 'Prossimo', false)}</div>
    <div class="wk-nav"><button id="wk-prev" type="button" aria-label="Settimana precedente">‹</button><b>${range}</b><button id="wk-next" type="button" aria-label="Settimana successiva">›</button></div>
    <div class="wk"><span></span><span class="h">Pranzo</span><span class="h">Cena</span>${rows}</div>
    <p class="hint">Un riquadro già pieno viene sostituito. Tocca un riquadro con ${src.name.toLowerCase()} per toglierlo.</p>
  </div>`;
}
function openPicker(id) {
  picker = { id, monday: mondayOf(now()) };
  $('#toast').hidden = true;
  renderPicker();
  $('#sheet').hidden = false; $('#sheet').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closePicker() { picker = null; $('#sheet').hidden = true; document.body.style.overflow = ''; }

function showToast(text, undo) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(text)}</span>${undo ? '<button id="undo" type="button">Annulla</button>' : ''}`;
  t.hidden = false;
  t.onclick = e => { if (e.target.id === 'undo') { undo(); t.hidden = true; } };
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 6000);
}
function mark(date, meal) {
  const id = picker.id, key = slotId(date, meal), prev = state.logs[key], today = dateKey(now());
  const where = slotName(date, meal, today);
  let text;
  if (prev === id) { delete state.logs[key]; text = `Tolto ${BY_ID[id].name.toLowerCase()} da ${where}`; }
  else { state.logs[key] = id; text = `${BY_ID[id].name}: ${where}${prev ? `, al posto di ${BY_ID[prev].name.toLowerCase()}` : ''}`; }
  save(); closePicker(); render();
  showToast(text, () => { if (prev) state.logs[key] = prev; else delete state.logs[key]; save(); render(); });
}

async function readPdf(file) {
  if (!window.pdfjsLib) await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'vendor/pdf.min.js'; s.onload = ok; s.onerror = () => ko(new Error('Lettore PDF non disponibile: apri l\'app una volta con la connessione attiva.')); document.head.append(s); });
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p), tc = await page.getTextContent(), rows = new Map();
    for (const it of tc.items) {
      if (!it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push(it);
    }
    [...rows.keys()].sort((a, b) => b - a).forEach(y => lines.push(rows.get(y).sort((a, b) => a.transform[4] - b.transform[4]).map(i => i.str).join(' ').replace(/\s+/g, ' ')));
  }
  return lines;
}
async function onPdf(file) {
  msg = { text: 'Lettura del PDF in corso.' }; render();
  try {
    const { plan, found, unknown } = parsePlan(await readPdf(file));
    state.plan = plan; save();
    let t = `Caricato: ${found} pasti, ${Object.values(plan.targets).reduce((a, b) => a + b, 0)} con una fonte proteica.`;
    if (unknown.length) t += ` Senza fonte riconosciuta: ${unknown.join(', ')}.`;
    msg = { text: t };
  } catch (e) { msg = { text: e.message || 'Il PDF non si apre. Controlla che non sia protetto da password.', err: true }; }
  render();
}
async function exportData() {
  const name = `proteine-${dateKey(now())}.json`;
  const file = new File([JSON.stringify(state, null, 1)], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
async function importData(file) {
  try {
    const d = JSON.parse(await file.text());
    if (!d.plan || !d.logs) throw 0;
    const before = state; state = { logs: {}, adj: {}, ...d }; save(); render();
    showToast(`Ripristinati ${Object.keys(d.logs).length} pasti`, () => { state = before; save(); render(); });
  } catch (e) { msg = { text: 'Il file non è una copia di Proteine: scegli il file proteine-….json.', err: true }; render(); }
}

document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tab) { tab = b.dataset.tab; msg = null; render(); window.scrollTo(0, 0); return; }
  if (b.dataset.src) return openPicker(b.dataset.src);
  if (b.dataset.date) return mark(b.dataset.date, b.dataset.meal);
  if (b.dataset.adj) {
    const id = b.dataset.adj, d = +b.dataset.d;
    if (targetOf(state, id) + d < 0) return;
    state.adj[id] = (state.adj[id] || 0) + d;
    if (!state.adj[id]) delete state.adj[id];
    save(); return render();
  }
  switch (b.id) {
    case 'close': return closePicker();
    case 'wk-prev': picker.monday = addDays(picker.monday, -7); return renderPicker();
    case 'wk-next': picker.monday = addDays(picker.monday, 7); return renderPicker();
    case 'load-pdf': return $('#pdf-input').click();
    case 'import': return $('#json-input').click();
    case 'export': return exportData();
    case 'reset-adj': { const before = state.adj; state.adj = {}; save(); render(); return showToast('Porzioni riportate a quelle del PDF', () => { state.adj = before; save(); render(); }); }
  }
});
$('#pdf-input').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) onPdf(f); });
$('#json-input').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importData(f); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
setInterval(() => { if (!document.hidden && !picker) render(); }, 60000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
render();

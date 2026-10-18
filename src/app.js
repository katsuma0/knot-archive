// app.js: hash router, home grid, knot page, theme and offline registration.
import { KNOTS, KNOT_BY_ID } from './knots/index.js';
import { CATEGORIES, CATEGORY_BY_ID, DIFFICULTY } from './data.js';
import { Player, paintThumb, esc } from './player.js';

const main = document.getElementById('main');
let player = null;
let theme = currentTheme();

function currentTheme() {
  const saved = localStorage.getItem('knots.theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  if (player) player.setTheme(theme);
  document.querySelectorAll('.card canvas').forEach((c) => paintThumb(c, KNOT_BY_ID[c.dataset.knot], theme));
}
document.getElementById('theme-toggle').addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('knots.theme', theme);
  applyTheme();
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!localStorage.getItem('knots.theme')) { theme = currentTheme(); applyTheme(); } });
document.documentElement.dataset.theme = theme;

// ------------------------------------------------------------------ home
const state = { q: '', cat: 'all' };

function diffDots(d) {
  return `<span class="diff" aria-label="Difficulty ${d} of 5: ${DIFFICULTY[d]}" title="${DIFFICULTY[d]}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= d ? 'on' : ''}"></i>`).join('')}</span>`;
}

function matches(k, q) {
  if (!q) return true;
  const hay = [k.name, ...(k.aka || []), k.summary, ...(k.uses || []), CATEGORY_BY_ID[k.category]?.name].join(' ').toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}

function renderHome() {
  document.title = 'Knot Archive';
  const q = state.q.trim().toLowerCase();
  const list = KNOTS.filter((k) => (state.cat === 'all' || k.category === state.cat) && matches(k, q));
  const groups = state.cat === 'all' && !q ? CATEGORIES.map((c) => ({ c, items: list.filter((k) => k.category === c.id) })).filter((g) => g.items.length) : [{ c: null, items: list }];
  main.innerHTML = `
    <div class="hero">
      <h1>Knots for outside</h1>
      <p>${KNOTS.length} knots, each one animated from a model of the rope so every crossing is exact. Everything is stored on your phone once it has loaded, so it works with no signal.</p>
    </div>
    <div class="tools">
      <input class="search" type="search" placeholder="Search: bowline, tarp, tie to a tree, join two ropes" value="${esc(state.q)}" aria-label="Search knots">
      <div class="chips" role="group" aria-label="Category">
        <button class="chip" data-cat="all" aria-pressed="${state.cat === 'all'}">All</button>
        ${CATEGORIES.map((c) => `<button class="chip" data-cat="${c.id}" aria-pressed="${state.cat === c.id}">${c.name}</button>`).join('')}
      </div>
    </div>
    ${list.length ? '' : '<p class="empty">Nothing matches. Try a use, like "tarp" or "tree".</p>'}
    ${groups.map((g) => `
      ${g.c ? `<h2 class="section-title">${g.c.name} <span class="count" style="font-weight:400">· ${g.c.blurb}</span></h2>` : `<p class="count">${g.items.length} knot${g.items.length === 1 ? '' : 's'}</p>`}
      <ul class="grid">${g.items.map(card).join('')}</ul>`).join('')}`;
  const search = main.querySelector('.search');
  search.addEventListener('input', () => { state.q = search.value; renderList(); });
  main.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { state.cat = b.dataset.cat; renderHome(); }));
  paintThumbs();
}

function renderList() {
  // re-render the whole home but keep focus in the search box
  const pos = main.querySelector('.search').selectionStart;
  renderHome();
  const s = main.querySelector('.search');
  s.focus();
  s.setSelectionRange(pos, pos);
}

function card(k) {
  const c = CATEGORY_BY_ID[k.category];
  return `<li><a class="card" href="#/knot/${k.id}">
    <canvas data-knot="${k.id}" aria-hidden="true"></canvas>
    <div class="card-body">
      <h3>${esc(k.name)}</h3>
      <div class="meta"><span class="cat-tag">${c ? c.name : k.category}</span>${diffDots(k.difficulty || 1)}</div>
      <p>${esc(k.summary)}</p>
    </div></a></li>`;
}

function paintThumbs() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const c = e.target;
      io.unobserve(c);
      try { paintThumb(c, KNOT_BY_ID[c.dataset.knot], theme); } catch (err) { console.error(c.dataset.knot, err); }
    }
  }, { rootMargin: '200px' });
  main.querySelectorAll('.card canvas').forEach((c) => io.observe(c));
}

// ----------------------------------------------------------------- detail
function renderKnot(id) {
  const k = KNOT_BY_ID[id];
  if (!k) { location.hash = '#/'; return; }
  document.title = `${k.name} · Knot Archive`;
  const c = CATEGORY_BY_ID[k.category];
  const li = (arr) => (arr || []).map((s) => `<li>${esc(s)}</li>`).join('');
  main.innerHTML = `
    <a class="back" href="#/">← All knots</a>
    <div class="detail-head">
      <h1>${esc(k.name)}</h1>
      ${k.aka && k.aka.length ? `<p class="aka">Also: ${esc(k.aka.join(', '))}</p>` : ''}
      <div class="meta">
        <span class="cat-tag">${c ? c.name : k.category}</span>
        ${diffDots(k.difficulty || 1)} <span>${DIFFICULTY[k.difficulty || 1]}</span>
        ${k.abok && k.abok.length ? `<span>ABOK #${k.abok.join(', #')}</span>` : ''}
        <span>${k.steps.length} steps</span>
      </div>
    </div>
    <p class="summary">${esc(k.summary)}</p>
    <div id="player"></div>
    <div class="info">
      <section><h2>Use it for</h2><ul>${li(k.uses)}</ul></section>
      ${k.check ? `<section><h2>Check it</h2><p>${esc(k.check)}</p></section>` : ''}
      ${k.pros && k.pros.length ? `<section><h2>Good</h2><ul>${li(k.pros)}</ul></section>` : ''}
      ${k.cons && k.cons.length ? `<section><h2>Not so good</h2><ul>${li(k.cons)}</ul></section>` : ''}
      ${k.warnings && k.warnings.length ? `<section class="warn"><h2>Watch out</h2><ul>${li(k.warnings)}</ul></section>` : ''}
      ${k.tips && k.tips.length ? `<section><h2>Tips</h2><ul>${li(k.tips)}</ul></section>` : ''}
      ${k.related && k.related.length ? `<section><h2>Related</h2><div class="related">${k.related.filter((r) => KNOT_BY_ID[r]).map((r) => `<a href="#/knot/${r}">${esc(KNOT_BY_ID[r].name)}</a>`).join('')}</div></section>` : ''}
    </div>`;
  player = new Player(main.querySelector('#player'), k, { theme });
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

// ----------------------------------------------------------------- router
function route() {
  if (player) { player.destroy(); player = null; }
  const h = location.hash || '#/';
  const m = h.match(/^#\/knot\/([\w-]+)/);
  if (m) renderKnot(m[1]); else renderHome();
}
window.addEventListener('hashchange', route);
route();

// ---------------------------------------------------------------- offline
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const badge = document.getElementById('offline-badge');
    if (reg.active) badge.hidden = false;
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw && nw.addEventListener('statechange', () => { if (nw.state === 'activated') badge.hidden = false; });
    });
  }).catch((e) => console.warn('offline cache unavailable', e));
}

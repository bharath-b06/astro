(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Language ----------
  let lang = 'en';
  try { lang = localStorage.getItem('gg-lang') === 'hi' ? 'hi' : 'en'; } catch (e) { /* storage unavailable */ }
  const t = (key) => GG.ui[lang][key] ?? GG.ui.en[key] ?? key;

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t('appName');
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $('#langToggle').textContent = lang === 'en' ? 'हिं' : 'EN';
    renderShloka();
    renderRashiGrid();
    renderHoroscope();
    renderCityOptions();
    renderKundli();
    renderSuggestions();
  }

  $('#langToggle').addEventListener('click', () => {
    lang = lang === 'en' ? 'hi' : 'en';
    try { localStorage.setItem('gg-lang', lang); } catch (e) { /* ignore */ }
    applyLang();
  });

  // ---------- Deterministic daily picks ----------
  const today = new Date();
  const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const dayIndex = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const pick = (arr, seed) => arr[seed % arr.length];
  const formatDate = (d) => d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const verseRef = (v) => `— ${t('verse')} ${v.ref}`;

  // ---------- Home: Shloka of the day ----------
  function renderShloka() {
    const v = GG.verses[dayIndex % GG.verses.length];
    $('#shlokaDate').textContent = formatDate(today);
    $('#shlokaSa').textContent = v.sa;
    $('#shlokaRef').textContent = verseRef(v);
    $('#shlokaMeaning').textContent = v[lang];
    $('#shlokaLesson').textContent = v.lesson[lang];
  }

  // ---------- Rashifal ----------
  let selectedRashi = null;

  function rashiLabel(i) {
    const r = GG.rashis[i];
    return lang === 'hi' ? r.hi : `${r.en} (${r.west})`;
  }

  function renderRashiGrid() {
    $('#rashiGrid').innerHTML = GG.rashis.map((r, i) => `
      <button class="rashi-btn" role="option" data-rashi="${i}" aria-selected="${i === selectedRashi}">
        <span class="sym">${r.sym}</span>
        <span>${lang === 'hi' ? r.hi : r.en}</span>
        <small>${lang === 'hi' ? r.en : r.west}</small>
      </button>`).join('');
  }

  $('#rashiGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rashi]');
    if (!btn) return;
    selectRashi(Number(btn.dataset.rashi));
  });

  function selectRashi(i) {
    selectedRashi = i;
    renderRashiGrid();
    renderHoroscope();
    $('#horoResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderHoroscope() {
    const box = $('#horoResult');
    if (selectedRashi === null) { box.hidden = true; return; }
    const seed = hash(`${dateKey}|${selectedRashi}`);
    const v = pick(GG.verses, seed);
    const career = pick(GG.horo.career, seed >>> 3);
    const love = pick(GG.horo.love, seed >>> 7);
    const health = pick(GG.horo.health, seed >>> 11);
    const color = pick(GG.horo.colors, seed >>> 15);
    const num = (seed >>> 19) % 9 + 1;
    const r = GG.rashis[selectedRashi];
    box.hidden = false;
    box.innerHTML = `
      <div class="card-head">
        <h2>${r.sym} ${esc(t('horoFor'))}: ${esc(rashiLabel(selectedRashi))}</h2>
        <span class="muted">${esc(formatDate(today))}</span>
      </div>
      <div class="gita-box">
        <strong>${esc(t('gitaToday'))}</strong>
        <p class="sanskrit">${esc(v.sa)}</p>
        <p>${esc(v[lang])} <span class="muted">${esc(verseRef(v))}</span></p>
        <p><strong>${esc(v.lesson[lang])}</strong></p>
      </div>
      <div class="horo-grid">
        <div><h3>💼 ${esc(t('career'))}</h3><p>${esc(career[lang])}</p></div>
        <div><h3>💞 ${esc(t('love'))}</h3><p>${esc(love[lang])}</p></div>
        <div><h3>🧘 ${esc(t('health'))}</h3><p>${esc(health[lang])}</p></div>
      </div>
      <div class="lucky">
        <span>${esc(t('luckyColor'))}: <span class="swatch" style="background:${color.hex}"></span><strong>${esc(color[lang])}</strong></span>
        <span>${esc(t('luckyNumber'))}: <strong>${num}</strong></span>
      </div>`;
  }

  // ---------- Kundli ----------
  const form = $('#kundliForm');
  let kundli = null;

  function renderCityOptions() {
    const sel = $('#citySelect');
    const current = sel.value;
    sel.innerHTML = GG.cities.map((c, i) => `<option value="${i}">${esc(lang === 'hi' ? c[1] : c[0])}</option>`).join('')
      + `<option value="custom">${esc(t('custom'))}</option>`;
    if (current) sel.value = current;
  }

  function fillCity() {
    const v = $('#citySelect').value;
    if (v === 'custom') return;
    const c = GG.cities[Number(v)];
    form.lat.value = c[2];
    form.lon.value = c[3];
    form.tz.value = c[4];
  }
  $('#citySelect').addEventListener('change', fillCity);
  ['lat', 'lon', 'tz'].forEach((n) => form[n].addEventListener('input', () => { $('#citySelect').value = 'custom'; }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const [y, mo, d] = form.dob.value.split('-').map(Number);
    const [h, mi] = form.tob.value.split(':').map(Number);
    kundli = {
      name: form.name.value.trim(),
      data: Astro.computeKundli({
        year: y, month: mo, day: d, hour: h, minute: mi,
        tzOffsetHours: Number(form.tz.value), lat: Number(form.lat.value), lon: Number(form.lon.value),
      }),
    };
    renderKundli();
    $('#kundliResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const fmtDeg = (x) => { const dd = Math.floor(x); return `${dd}° ${String(Math.floor((x - dd) * 60)).padStart(2, '0')}′`; };
  const signName = (i) => (lang === 'hi' ? GG.rashis[i].hi : GG.rashis[i].en);

  // North Indian chart: houses fixed, signs rotate. [planet-text centre, sign-number position]
  const HOUSE_POS = [
    [[200, 95], [200, 182]], [[100, 34], [100, 88]], [[34, 100], [88, 104]],
    [[100, 195], [182, 204]], [[34, 300], [88, 304]], [[100, 362], [100, 320]],
    [[200, 295], [200, 226]], [[300, 362], [300, 320]], [[366, 300], [314, 304]],
    [[300, 195], [220, 204]], [[366, 100], [314, 104]], [[300, 34], [300, 88]],
  ];

  function chartSvg(k) {
    const byHouse = Array.from({ length: 12 }, () => []);
    byHouse[0].push(`<tspan class="asc">${lang === 'hi' ? 'लग्न' : 'Asc'}</tspan>`);
    k.planets.forEach((p) => byHouse[p.house - 1].push(esc(GG.grahas[p.key].abbr[lang])));
    const houses = byHouse.map((items, hIdx) => {
      const [[cx, cy], [nx, ny]] = HOUSE_POS[hIdx];
      const sign = ((k.lagna.sign + hIdx) % 12) + 1;
      const lines = [];
      for (let i = 0; i < items.length; i += 2) lines.push(items.slice(i, i + 2).join(' '));
      const startY = cy - ((lines.length - 1) * 16) / 2;
      const text = lines.map((l, i) => `<text class="pl" x="${cx}" y="${startY + i * 16}" text-anchor="middle" dominant-baseline="middle">${l}</text>`).join('');
      return `<text class="signno" x="${nx}" y="${ny}" text-anchor="middle" dominant-baseline="middle">${sign}</text>${text}`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 400 400" role="img" aria-label="${esc(t('chartTitle'))}">
      <rect class="frame" x="1" y="1" width="398" height="398"/>
      <line class="line" x1="0" y1="0" x2="400" y2="400"/><line class="line" x1="400" y1="0" x2="0" y2="400"/>
      <polygon class="line" fill="none" points="200,1 399,200 200,399 1,200"/>
      ${houses}</svg>`;
  }

  function renderKundli() {
    const box = $('#kundliResult');
    if (!kundli) { box.hidden = true; return; }
    const k = kundli.data;
    const nak = GG.nakshatras[lang][k.nakshatra];
    box.hidden = false;
    box.innerHTML = `
      <article class="card">
        ${kundli.name ? `<h2>${esc(t('kundliGreeting').replace('{name}', kundli.name))} 🙏</h2>` : ''}
        <div class="facts" style="margin-top:10px">
          <div class="fact"><small>${esc(t('lagna'))}</small><strong>${esc(signName(k.lagna.sign))}</strong> <span class="muted">${fmtDeg(k.lagna.deg)}</span></div>
          <div class="fact"><small>${esc(t('moonSign'))}</small><strong>${GG.rashis[k.moonSign].sym} ${esc(signName(k.moonSign))}</strong></div>
          <div class="fact"><small>${esc(t('nakshatra'))}</small><strong>${esc(nak)}</strong> <span class="muted">${esc(t('pada'))} ${k.pada}</span></div>
          <div class="fact"><small>${esc(t('sunSign'))}</small><strong>${esc(signName(k.sunSign))}</strong></div>
        </div>
        <p><a href="#horoscope" id="toRashifal">${esc(t('seeRashifal'))}</a></p>
      </article>
      <article class="card">
        <h2>${esc(t('chartTitle'))}</h2>
        <div class="chart-wrap">${chartSvg(k)}</div>
      </article>
      <article class="card">
        <table>
          <thead><tr><th>${esc(t('planet'))}</th><th>${esc(t('sign'))}</th><th>${esc(t('degree'))}</th><th>${esc(t('house'))}</th></tr></thead>
          <tbody>
            <tr><td><strong>${esc(t('lagna'))}</strong></td><td>${esc(signName(k.lagna.sign))}</td><td>${fmtDeg(k.lagna.deg)}</td><td>1</td></tr>
            ${k.planets.map((p) => `<tr><td>${esc(GG.grahas[p.key][lang])}</td><td>${esc(signName(p.sign))}</td><td>${fmtDeg(p.deg)}</td><td>${p.house}</td></tr>`).join('')}
          </tbody>
        </table>
        <p class="note">${esc(t('kundliNote'))}</p>
      </article>`;
    $('#toRashifal').addEventListener('click', () => { selectedRashi = k.moonSign; renderRashiGrid(); renderHoroscope(); });
  }

  // ---------- Chat ----------
  const log = $('#chatLog');

  function addMsg(who, html) {
    const div = document.createElement('div');
    div.className = `msg ${who}`;
    div.innerHTML = html;
    log.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return div;
  }

  function renderSuggestions() {
    $('#chatSuggestions').innerHTML = t('suggestions').map((s) => `<button type="button">${esc(s)}</button>`).join('');
  }
  $('#chatSuggestions').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') send(e.target.textContent);
  });

  function detectTopic(text) {
    const lower = text.toLowerCase();
    let best = 'default', bestScore = 0;
    for (const { topic, words } of GG.chatTopics) {
      let score = 0;
      for (const w of words) {
        // Latin keywords match whole-word prefixes ("worr" in "worried"); Devanagari matches anywhere.
        const hit = /^[a-z]+$/.test(w) ? new RegExp(`\\b${w}`).test(lower) : lower.includes(w);
        if (hit) score++;
      }
      if (score > bestScore) { best = topic; bestScore = score; }
    }
    return best;
  }

  function replyFor(text) {
    const topic = detectTopic(text);
    const pool = GG.verses.filter((v) => v.tags.includes(topic));
    const v = (pool.length ? pool : GG.verses)[Math.floor(Math.random() * (pool.length || GG.verses.length))];
    // Reply in Hindi if the question was typed in Devanagari, otherwise in the UI language.
    const l = /[ऀ-ॿ]/.test(text) ? 'hi' : lang;
    return `${esc(GG.chatReplies[topic][l])}
      <span class="cite"><span class="sanskrit">${esc(v.sa)}</span>${esc(v[l])} <em>— ${esc(GG.ui[l].verse)} ${v.ref}</em></span>`;
  }

  function send(text) {
    text = text.trim();
    if (!text) return;
    addMsg('user', esc(text));
    $('#chatInput').value = '';
    const typing = addMsg('bot', '<span class="typing"><i></i><i></i><i></i></span>');
    setTimeout(() => {
      typing.innerHTML = replyFor(text);
      typing.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 900 + Math.random() * 600);
  }

  $('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); send($('#chatInput').value); });

  // ---------- Routing ----------
  const VIEWS = ['home', 'horoscope', 'kundli', 'chat'];
  let chatGreeted = false;

  function route() {
    const name = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
    VIEWS.forEach((v) => { $(`#view-${v}`).hidden = v !== name; });
    $$('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === name));
    if (name === 'chat' && !chatGreeted) { chatGreeted = true; addMsg('bot', esc(t('chatWelcome'))); }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  // ---------- Init ----------
  applyLang();
  fillCity();
  route();
})();

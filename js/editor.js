/* VFX.LAB — editor: viewport tools, timeline, inspector, library, export */
(function () {
'use strict';
const V = window.VFX, D = V.data, U = V.util, T = THREE;
const $ = s => document.querySelector(s);
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v;
    else if (k === 'style') e.style.cssText = v; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
    else if (k === 'value' || k === 'checked' || k === 'disabled') e[k] = v; else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids) if (c != null) e.append(c);
  return e;
}
const fmt = v => { const s = (Math.round(v * 1000) / 1000).toString(); return s; };
const TYPE_COLOR = { particles: 'var(--c-particles)', ribbon: 'var(--c-ribbon)', mesh: 'var(--c-mesh)', screen: 'var(--c-screen)', occluder: 'var(--c-occluder)', media: 'var(--c-media)', manga: 'var(--c-manga)', text: 'var(--c-text)' };
const LAYER_TYPES = ['particles', 'ribbon', 'mesh', 'screen', 'occluder', 'media', 'manga', 'text'];
const EYE = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>';
const EYE_OFF = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 2l12 12M4 5C2.4 6.3 1.5 8 1.5 8S4 12.5 8 12.5c1 0 1.9-.3 2.7-.7M7 3.6c.3-.1.7-.1 1-.1 4 0 6.5 4.5 6.5 4.5s-.6 1.1-1.7 2.2"/></svg>';
const PLAY = '<svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1.5v11l9-5.5z"/></svg>';
const PAUSE = '<svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><rect x="2.5" y="2" width="3.2" height="10"/><rect x="8.3" y="2" width="3.2" height="10"/></svg>';

let eng, project, sel = { kind: null, id: null }, selPt = -1;
let time = 0, playing = true, speed = 1, scrubbing = false, tool = 'orbit', plane = 'ground';
let hist = [], fut = [], lastJSON = '', rec = null, saveTimer = 0;
const grpOpen = {};
const mediaData = {}, mediaBlob = {}, assetOf = {};   // small images kept as data, session blob URLs, uploaded asset ids
let assetsCap, mediaSaveT = 0;
const mediaById = id => (project.media || []).find(m => m.id === id);

const layerById = id => project.layers.find(l => l.id === id);
const pathById = id => project.paths.find(p => p.id === id);
const selLayer = () => sel.kind === 'layer' ? layerById(sel.id) : null;
const selPath = () => sel.kind === 'path' ? pathById(sel.id) : null;
function activePath() { const p = selPath(); if (p) return p; const l = selLayer(); return l && l.pathId ? pathById(l.pathId) : null; }
const slug = () => (project.name || 'effect').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'effect';

/* ───────── toast / menu / modal ───────── */
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
function showMenu(anchor, items) {
  const m = $('#menu'); m.innerHTML = '';
  for (const it of items) m.append(it === '-' ? h('hr') : h('button', { text: it.label, onclick: () => { closeMenu(); it.fn(); } }));
  m.classList.add('open');
  const r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  let x = Math.min(r.left, innerWidth - mw - 8), y = r.bottom + 6; if (y + mh > innerHeight - 8) y = Math.max(8, r.top - mh - 6);
  m.style.left = Math.max(8, x) + 'px'; m.style.top = y + 'px';
  setTimeout(() => window.addEventListener('pointerdown', menuAway, true), 0);
}
function menuAway(e) { if (!$('#menu').contains(e.target)) closeMenu(); }
function closeMenu() { $('#menu').classList.remove('open'); window.removeEventListener('pointerdown', menuAway, true); }
function openModal(...kids) { const d = $('#dlg'); d.innerHTML = ''; d.append(...kids); $('#modal').classList.add('open'); }
function closeModal() { $('#modal').classList.remove('open'); }

/* ───────── history / persistence ───────── */
function commit() {
  const j = JSON.stringify(project);
  if (j === lastJSON) return;
  hist.push(lastJSON); if (hist.length > 80) hist.shift();
  fut.length = 0; lastJSON = j; undoBtns(); saveSoon();
}
function undoBtns() { $('#undo').disabled = !hist.length; $('#redo').disabled = !fut.length; }
function undo() { if (!hist.length) return; fut.push(lastJSON); lastJSON = hist.pop(); setProject(JSON.parse(lastJSON), true); undoBtns(); saveSoon(); }
function redo() { if (!fut.length) return; hist.push(lastJSON); lastJSON = fut.pop(); setProject(JSON.parse(lastJSON), true); undoBtns(); saveSoon(); }
function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem('hanabi.autosave', lastJSON); } catch (e) {} }, 500); }
function loadLocal() { try { const j = localStorage.getItem('hanabi.autosave'); return j ? JSON.parse(j) : null; } catch (e) { return null; } }
function userPresets() { try { return JSON.parse(localStorage.getItem('hanabi.mine') || '[]'); } catch (e) { return []; } }
function setUserPresets(a) { try { localStorage.setItem('hanabi.mine', JSON.stringify(a)); return true; } catch (e) { return false; } }

function normalize(p) {
  p.layers = (p.layers || []).filter(l => D.DEFAULTS[l.type]); p.layers.forEach(D.upgradeLayer);
  p.paths = p.paths || []; p.duration = U.clamp(+p.duration || 2, .2, 30);
  p.bloom = Object.assign({ strength: 1.15, radius: .85, threshold: .7 }, p.bloom || {});
  p.exposure = p.exposure || 1; p.bg = p.bg || '#0b0c13'; p.name = p.name || 'Untitled effect';
  p.look = Object.assign({}, D.LOOK_DEFAULT, p.look || {}); p.media = p.media || []; p.figure = !!p.figure;
  p.media.forEach(m => { if (!m.asset && assetOf[m.id]) m.asset = assetOf[m.id]; });
  return p;
}
function applyCam(c) { if (!c) return; const k = eng.cam; k.theta = c.theta; k.phi = c.phi; k.dist = c.dist; k.target.set(c.target[0], c.target[1], c.target[2]); }
function setProject(p, keep) {
  project = normalize(absorbMedia(p));
  eng.setProject(project); ensureMedia();
  eng.view.dummy = project.figure; const fb = document.querySelector('#viewSeg button[data-view=dummy]'); if (fb) fb.classList.toggle('on', project.figure);
  if (!keep) applyCam(project.cam);
  const ok = sel.kind === 'layer' ? layerById(sel.id) : sel.kind === 'path' ? pathById(sel.id) : null;
  if (!keep || !ok) sel = project.layers.length ? { kind: 'layer', id: project.layers[project.layers.length - 1].id } : { kind: null, id: null };
  selPt = -1; time = Math.min(time, project.duration);
  $('#projName').value = project.name; $('#durIn').value = fmt(project.duration); $('#loopBtn').classList.toggle('on', project.loop !== false);
  renderAll();
}
function loadProject(p) {
  hist.push(lastJSON); fut.length = 0;
  sel = { kind: null, id: null }; time = 0; playing = true;
  setProject(p, false); lastJSON = JSON.stringify(project); undoBtns(); saveSoon();
}
function renderAll() { renderLib(); renderTimeline(); renderInsp(); rebuildHandles(); }

/* ───────── selection ───────── */
function select(kind, id, soft) {
  const changed = sel.kind !== kind || sel.id !== id;
  sel = { kind, id }; if (changed) selPt = -1;
  markSel(); if (!soft || changed) renderInsp(); rebuildHandles();
}
function markSel() {
  document.querySelectorAll('#rows .row').forEach(r => r.classList.toggle('sel', sel.kind === 'layer' && r.dataset.id === sel.id));
  document.querySelectorAll('#lib .prow').forEach(r => r.classList.toggle('sel', sel.kind === 'path' && r.dataset.id === sel.id));
  const ap = activePath(); eng.highlightPath(ap ? ap.id : null);
}

/* ───────── number scrubbing ───────── */
function bindNum(inp, set, done, s) {
  const step = s.step || .01, span = (s.max != null && s.min != null) ? (s.max - s.min) : step * 200;
  let sx = 0, sv = 0, drag = false, moved = false;
  const fix = v => { v = Math.round(v / step) * step; if (s.lo != null) v = Math.max(s.lo, v); if (s.hi != null) v = Math.min(s.hi, v); return +v.toFixed(5); };
  inp.addEventListener('pointerdown', e => {
    if (document.activeElement === inp) return;
    sx = e.clientX; sv = parseFloat(inp.value) || 0; drag = true; moved = false;
    try { inp.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault();
  });
  inp.addEventListener('pointermove', e => {
    if (!drag) return; const dx = e.clientX - sx;
    if (!moved && Math.abs(dx) < 4) return; moved = true;
    const v = fix(sv + dx * span / 220 * (e.shiftKey ? .1 : 1)); inp.value = fmt(v); set(v);
  });
  const up = e => { if (!drag) return; drag = false; try { inp.releasePointerCapture(e.pointerId); } catch (_) {} if (moved) done(); else { inp.focus(); inp.select(); } };
  inp.addEventListener('pointerup', up); inp.addEventListener('pointercancel', up);
  inp.addEventListener('change', () => { const v = parseFloat(inp.value); if (isNaN(v)) return; const f = fix(v); inp.value = fmt(f); set(f); done(); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); e.stopPropagation(); });
}
const numIn = (v, s) => h('input', { type: 'number', step: s.step || .01, value: fmt(v), inputmode: 'decimal' });

/* ───────── gradient + curve editors ───────── */
const toHex = c => '#' + c.map(x => Math.round(U.clamp(x, 0, 1) * 255).toString(16).padStart(2, '0')).join('');
function gradEditor(obj, key, ch) {
  const bar = h('div', { class: 'gradbar' }), stops = h('div', { class: 'stops' });
  const col = h('input', { type: 'color', 'aria-label': 'Stop colour' }), del = h('button', { class: 'btn sm', text: 'Remove stop' });
  const wrap = h('div', null, bar, stops, h('div', { class: 'ctl', style: 'margin-top:3px' }, col, del));
  let si = 0;
  const g = () => obj[key];
  function paintBar() {
    const s = g().slice().sort((a, b) => a.t - b.t);
    bar.style.background = s.length > 1 ? 'linear-gradient(90deg,' + s.map(x => x.c + ' ' + (x.t * 100).toFixed(1) + '%').join(',') + ')' : s[0].c;
  }
  function paint() {
    paintBar(); stops.innerHTML = ''; si = Math.min(si, g().length - 1);
    g().forEach((s, i) => {
      const d = h('div', { class: 'stop' + (i === si ? ' sel' : ''), style: `left:${s.t * 100}%;background:${s.c}` });
      d.addEventListener('pointerdown', e => {
        e.preventDefault(); si = i; col.value = s.c; stops.querySelectorAll('.stop').forEach((x, k) => x.classList.toggle('sel', k === i));
        const r = stops.getBoundingClientRect(); let moved = false;
        const mv = ev => { s.t = +U.clamp((ev.clientX - r.left) / r.width, 0, 1).toFixed(3); d.style.left = s.t * 100 + '%'; paintBar(); moved = true; ch(false); };
        const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); if (moved) ch(true); };
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      });
      stops.append(d);
    });
    col.value = g()[si].c; del.disabled = g().length <= 1;
  }
  bar.addEventListener('pointerdown', e => {
    const r = bar.getBoundingClientRect(), t = +U.clamp((e.clientX - r.left) / r.width, 0, 1).toFixed(3);
    const c = toHex(U.evalGradient(g().slice().sort((a, b) => a.t - b.t), t));
    g().push({ t, c }); si = g().length - 1; paint(); ch(true);
  });
  col.addEventListener('input', () => { g()[si].c = col.value; const d = stops.children[si]; if (d) d.style.background = col.value; paintBar(); ch(false); });
  col.addEventListener('change', () => ch(true));
  del.addEventListener('click', () => { if (g().length > 1) { g().splice(si, 1); si = 0; paint(); ch(true); } });
  paint();
  return wrap;
}
function curveEditor(obj, key, ch, vmax) {
  vmax = vmax || 1;
  const cv = h('canvas', { class: 'curve' }), chips = h('div', { class: 'cchips' });
  const wrap = h('div', { style: 'display:flex;flex-direction:column;gap:5px' }, cv, chips);
  const P = () => obj[key];
  function draw() {
    const w = cv.clientWidth || 260, hh = cv.clientHeight || 78, dpr = Math.min(devicePixelRatio || 1, 2);
    if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = hh * dpr; }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, hh);
    const X = t => 6 + t * (w - 12), Y = v => hh - 6 - v / vmax * (hh - 12);
    c.strokeStyle = '#20233a'; c.lineWidth = 1; c.beginPath();
    for (let i = 1; i < 4; i++) { c.moveTo(X(i / 4), 4); c.lineTo(X(i / 4), hh - 4); }
    c.moveTo(4, Y(1)); c.lineTo(w - 4, Y(1)); c.moveTo(4, Y(.5)); c.lineTo(w - 4, Y(.5)); c.stroke();
    c.beginPath(); for (let i = 0; i <= 80; i++) { const t = i / 80, v = U.clamp(U.evalCurve(P(), t), 0, vmax); i ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v)); }
    c.lineTo(X(1), Y(0)); c.lineTo(X(0), Y(0)); c.closePath(); c.fillStyle = '#ff4d7e22'; c.fill();
    c.beginPath(); for (let i = 0; i <= 80; i++) { const t = i / 80, v = U.clamp(U.evalCurve(P(), t), 0, vmax); i ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v)); }
    c.strokeStyle = '#ff4d7e'; c.lineWidth = 2; c.stroke();
    for (const p of P()) { c.beginPath(); c.arc(X(p.t), Y(p.v), 4.5, 0, 6.3); c.fillStyle = '#0b0c13'; c.fill(); c.strokeStyle = '#e8eaf6'; c.lineWidth = 2; c.stroke(); }
  }
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    const r = cv.getBoundingClientRect(), w = r.width, hh = r.height;
    const toT = x => U.clamp((x - r.left - 6) / (w - 12), 0, 1), toV = y => U.clamp((hh - 6 - (y - r.top)) / (hh - 12), 0, 1) * vmax;
    const pts = P(); let idx = -1, best = 16;
    pts.forEach((p, i) => { const d = Math.hypot(6 + p.t * (w - 12) - (e.clientX - r.left), hh - 6 - p.v / vmax * (hh - 12) - (e.clientY - r.top)); if (d < best) { best = d; idx = i; } });
    if (idx < 0) { const t = toT(e.clientX); idx = pts.findIndex(p => p.t > t); if (idx < 0) idx = pts.length; pts.splice(idx, 0, { t: +t.toFixed(3), v: +toV(e.clientY).toFixed(3) }); }
    let kill = false;
    const mv = ev => {
      const p = pts[idx], end = idx === 0 || idx === pts.length - 1;
      if (!end) p.t = +U.clamp(toT(ev.clientX), pts[idx - 1].t + .01, pts[idx + 1].t - .01).toFixed(3);
      p.v = +toV(ev.clientY).toFixed(3);
      kill = !end && (ev.clientY < r.top - 30 || ev.clientY > r.bottom + 30);
      cv.style.opacity = kill ? .45 : 1; draw(); ch(false);
    };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); cv.style.opacity = 1; if (kill) pts.splice(idx, 1); draw(); ch(true); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); draw(); ch(false);
  });
  cv.addEventListener('dblclick', e => {
    const r = cv.getBoundingClientRect(), pts = P();
    const i = pts.findIndex(p => Math.hypot(6 + p.t * (r.width - 12) - (e.clientX - r.left), r.height - 6 - p.v / vmax * (r.height - 12) - (e.clientY - r.top)) < 12);
    if (i > 0 && i < pts.length - 1) { pts.splice(i, 1); draw(); ch(true); }
  });
  for (const [n, k] of [['Flat', 'flat'], ['Rise', 'up'], ['Fall', 'down'], ['Bell', 'bell'], ['Pop', 'pop'], ['Fade', 'fade'], ['In-out', 'inOut']])
    chips.append(h('button', { text: n, onclick: () => { obj[key] = D.clone(D.CURVES[k]); draw(); ch(true); } }));
  requestAnimationFrame(draw);
  return wrap;
}

/* ───────── field builder ───────── */
function field(obj, s, ch) {
  const id = 'f_' + s.k + '_' + Math.random().toString(36).slice(2, 7);
  const mx = typeof s.max === 'function' ? s.max() : s.max;
  let ctl, col = false;
  switch (s.t) {
    case 'range': {
      const r = h('input', { type: 'range', id, min: s.min, max: mx, step: s.step || .01, value: obj[s.k] }), n = numIn(obj[s.k], s);
      n.setAttribute('aria-label', s.label + ' value');
      r.addEventListener('input', () => { obj[s.k] = +r.value; n.value = fmt(obj[s.k]); ch(false); });
      r.addEventListener('change', () => ch(true));
      bindNum(n, v => { obj[s.k] = v; r.value = v; ch(false); }, () => ch(true), { step: s.step, min: s.min, max: mx, lo: s.lo, hi: s.hi });
      ctl = h('div', { class: 'ctl' }, r, n); break;
    }
    case 'vec': {
      ctl = h('div', { class: 'ctl multi' });
      obj[s.k].forEach((v, i) => { const n = numIn(v, s); if (!i) n.id = id; n.setAttribute('aria-label', s.label + ' ' + (s.names || 'xyz')[i]); bindNum(n, x => { obj[s.k][i] = x; ch(false); }, () => ch(true), { step: s.step, min: s.min, max: s.max, lo: s.lo }); ctl.append(n); });
      break;
    }
    case 'select': {
      const e = h('select', { id });
      for (const o of (typeof s.opts === 'function' ? s.opts() : s.opts)) { const [v, l] = Array.isArray(o) ? o : [o, o[0].toUpperCase() + o.slice(1)]; e.append(h('option', { value: v == null ? '' : v, text: l })); }
      e.value = obj[s.k] == null ? '' : obj[s.k];
      e.addEventListener('change', () => { obj[s.k] = e.value === '' ? null : e.value; ch(true, true); });
      ctl = h('div', { class: 'ctl' }, e); break;
    }
    case 'bool': { const e = h('input', { type: 'checkbox', id, checked: !!obj[s.k] }); e.addEventListener('change', () => { obj[s.k] = e.checked; ch(true, true); }); ctl = h('div', { class: 'ctl' }, e); break; }
    case 'text': { const e = h('input', { type: 'text', class: 'tin', id, value: obj[s.k] || '', spellcheck: 'false' }); e.addEventListener('input', () => { obj[s.k] = e.value; ch(false); }); e.addEventListener('change', () => ch(true)); e.addEventListener('keydown', ev => ev.stopPropagation()); ctl = h('div', { class: 'ctl' }, e); break; }
    case 'color': { const e = h('input', { type: 'color', id, value: obj[s.k] }); e.addEventListener('input', () => { obj[s.k] = e.value; ch(false); }); e.addEventListener('change', () => ch(true)); ctl = h('div', { class: 'ctl' }, e); break; }
    case 'grad': ctl = gradEditor(obj, s.k, ch); col = true; break;
    case 'curve': ctl = curveEditor(obj, s.k, ch, s.vmax); col = true; break;
  }
  return h('div', { class: 'f' + (col ? ' col' : '') }, h('label', { for: col ? null : id, text: s.label, title: s.hint || null }), ctl);
}
const R = (k, label, min, max, step, x) => Object.assign({ t: 'range', k, label, min, max, step }, x);
const VEC = (k, label, step, x) => Object.assign({ t: 'vec', k, label, step: step || .05 }, x);
const S = (k, label, opts, x) => Object.assign({ t: 'select', k, label, opts }, x);
const B = (k, label, x) => Object.assign({ t: 'bool', k, label }, x);
const EASES = [['linear', 'Linear'], ['in', 'Ease in'], ['out', 'Ease out'], ['inOut', 'Ease in-out'], ['cubicIn', 'Cubic in'], ['cubicOut', 'Cubic out'], ['expoIn', 'Expo in'], ['expoOut', 'Expo out'], ['backOut', 'Overshoot']];
const pathOpts = () => [[null, 'None']].concat(project.paths.map(p => [p.id, p.name]));
const mediaOpts = () => [[null, 'None']].concat(project.media.map(m => [m.id, m.name]));
const isImg = l => l.sprite === 'image';
const MG = (l, ...m) => m.includes(l.mode);
const durMax = () => project.duration;
const TIMING = { title: 'Timing', fields: [R('start', 'Start (s)', 0, durMax, .01, { tl: 1, lo: 0 }), R('dur', 'Length (s)', .02, durMax, .01, { tl: 1, lo: .02 })] };
const SURFACE = mesh => ({
  title: 'Surface pattern', fields: [
    { t: 'chips', label: 'Quick style', items: Object.keys(D.STYLES), fn: (l, n) => Object.assign(l, D.clone(D.STYLES[n])) },
    S('noise', 'Pattern', [['clouds', 'Clouds'], ['flames', 'Flames'], ['cells', 'Cells'], ['streaks', 'Streaks'], ['waves', 'Waves'], ['dots', 'Dots'], ['sigil', 'Magic seal'], ['image', 'Image / video'], ['none', 'Solid']]),
    S('mediaId', 'Source', mediaOpts, { show: l => l.noise === 'image' }), B('texColor', 'Use its colours', { show: l => l.noise === 'image' }), B('texLuma', 'Brightness shapes it', { show: l => l.noise === 'image' }),
    VEC('tile', 'Tiling', .1, { names: 'xy', show: l => l.noise !== 'none' }), VEC('scroll', 'Scroll speed', .05, { names: 'xy', show: l => l.noise !== 'none' }),
    R('contrast', 'Contrast', .5, 4, .05, { show: l => l.noise !== 'none' && l.noise !== 'sigil' && l.noise !== 'image' }),
    R('distort', 'Flow distortion', 0, 1.5, .01, { show: l => l.noise !== 'none' }),
    VEC('tile2', 'Distort tiling', .1, { names: 'xy', show: l => l.distort > 0 && l.noise !== 'none' }), VEC('scroll2', 'Distort scroll', .05, { names: 'xy', show: l => l.distort > 0 && l.noise !== 'none' }),
    R('skew', 'Spiral skew', -4, 4, .05, { show: l => l.noise !== 'none' }),
    R('cut', 'Cutoff', 0, .95, .01, { hint: 'How much of the pattern is eroded away before any dissolve' }),
    R('fill', 'Solidity', 0, 1, .01, { hint: '0 = shape is cut entirely by the pattern, 1 = solid' }),
    R('soft', 'Edge softness', 0, .5, .005, { hint: '0 = hard cel edge' }), R('bands', 'Cel bands', 0, 8, 1, { hint: 'Quantise the gradient into flat steps' }),
    R('edgeBoost', 'Edge glow', 0, 4, .05), R('edgeW', 'Edge width', .01, .5, .01, { show: l => l.edgeBoost > 0 }),
    R('core', 'White core', 0, 1, .01), R('coreThr', 'Core size', 0, 1, .01, { show: l => l.core > 0, hint: 'Lower = bigger core' })
  ].concat(mesh ? [] : [B('anchor', 'Pattern sticks to path')])
});
const COLOUR = lifeLabel => ({
  title: 'Colour', fields: [
    S('gradMap', 'Gradient follows', [['life', lifeLabel], ['noise', 'Pattern brightness'], ['v', 'Across (V)']]),
    { t: 'grad', k: 'grad', label: 'Gradient' }, { t: 'curve', k: 'alphaCurve', label: 'Opacity · ' + lifeLabel.toLowerCase() },
    R('intensity', 'Glow intensity', 0, 8, .05, { lo: 0 }), R('additive', 'Additive ↔ solid', 0, 1, .01, { hint: '1 = adds light, 0 = opaque paint' }), R('alpha', 'Opacity', 0, 1, .01)
  ]
});
const SCHEMA = {
  particles: [
    { title: 'Timing', fields: TIMING.fields.concat([S('emit', 'Emission', [['stream', 'Stream'], ['burst', 'Burst']]), R('burstSpread', 'Burst spread (s)', 0, 1, .01, { show: l => l.emit === 'burst' }), B('loop', 'Seamless loop', { show: l => l.emit === 'stream', hint: 'Particles wrap around the layer length' })]) },
    { title: 'Emission', fields: [R('count', 'Count', 1, 3000, 1, { lo: 1, hi: 40000 }), VEC('life', 'Lifetime (s)', .05, { names: ['min', 'max'], lo: .02 }), R('seed', 'Seed', 1, 99, 1)] },
    { title: 'Emitter', fields: [S('shape', 'Shape', [['point', 'Point'], ['sphere', 'Sphere'], ['ring', 'Ring / disc'], ['box', 'Box'], ['line', 'Line']]), R('radius', 'Radius', 0, 4, .01, { show: l => l.shape !== 'point' }), R('thickness', 'Thickness', 0, 1, .01, { show: l => l.shape === 'ring' || l.shape === 'sphere', hint: '0 = shell only' }), VEC('shapeScale', 'Stretch', .05, { show: l => l.shape !== 'point' }), VEC('rot', 'Rotation °', 1), VEC('pos', 'Offset', .05)] },
    { title: 'Path', fields: [S('pathId', 'Path', pathOpts), S('emitMode', 'Emit from', [['follow', 'Travelling point'], ['along', 'Whole path']], { show: l => l.pathId }), R('pathFrom', 'From', 0, 1, .01, { show: l => l.pathId }), R('pathTo', 'To', 0, 1, .01, { show: l => l.pathId }), S('pathEase', 'Travel easing', EASES, { show: l => l.pathId && l.emitMode === 'follow' }), B('alignPath', 'Align to path', { show: l => l.pathId, hint: 'Emitter up-axis follows the path direction' }), S('motion', 'Particles', [['free', 'Fly free'], ['path', 'Ride the path']], { show: l => l.pathId }), R('pathTravel', 'Ride distance', -1, 1, .01, { show: l => l.pathId && l.motion === 'path' })] },
    { title: 'Motion', fields: [VEC('speed', 'Speed', .1, { names: ['min', 'max'] }), VEC('dir', 'Direction', .05), R('spread', 'Spread °', 0, 180, 1), VEC('radial', 'Burst outward', .1, { names: ['min', 'max'] }), R('gravity', 'Gravity', -10, 20, .1), R('drag', 'Drag', 0, 8, .05, { lo: 0 }), R('orbit', 'Orbit', -10, 10, .05, { hint: 'Swirl around the direction axis, rad/s' }), R('converge', 'Converge', -1, 1, .01, { hint: '1 = pulled to the emitter centre over life' }), R('turbAmp', 'Turbulence', 0, 2, .01), R('turbFreq', 'Turb. scale', .1, 5, .05, { show: l => l.turbAmp > 0 }), R('turbSpeed', 'Turb. speed', 0, 5, .05, { show: l => l.turbAmp > 0 })] },
    { title: 'Sprite', fields: [S('sprite', 'Shape', V.SPRITES), S('mediaId', 'Image', mediaOpts, { show: isImg }), R('flipCols', 'Sheet columns', 1, 16, 1, { show: isImg, lo: 1 }), R('flipRows', 'Sheet rows', 1, 16, 1, { show: isImg, lo: 1 }), R('flipFps', 'Sheet fps', 0, 60, 1, { show: isImg, hint: '0 plays the sheet once over each particle life' }), B('texColor', 'Use its colours', { show: isImg }), B('texLuma', 'Black is see-through', { show: isImg }), VEC('size', 'Size', .01, { names: ['min', 'max'], lo: 0 }), { t: 'curve', k: 'sizeCurve', label: 'Size over life' }, R('stretch', 'Speed stretch', 0, .3, .005), R('rotRand', 'Random rotation', 0, 1, .01, { show: l => !l.stretch }), R('spin', 'Spin', 0, 12, .1, { show: l => !l.stretch }), R('soft', 'Edge softness', 0, 1, .01), R('halo', 'Halo', 0, 1, .01), R('core', 'White core', 0, 1, .01), R('dissolve', 'Dissolve over life', 0, 1, .01), R('shade', 'Toon shadow', 0, 1, .01)] },
    { title: 'Colour', fields: [{ t: 'grad', k: 'grad', label: 'Colour over life' }, { t: 'curve', k: 'alphaCurve', label: 'Opacity over life' }, R('intensity', 'Glow intensity', 0, 8, .05, { lo: 0 }), R('additive', 'Additive ↔ solid', 0, 1, .01), R('alpha', 'Opacity', 0, 1, .01), R('hueVar', 'Hue variation', 0, .5, .005), R('flicker', 'Flicker', 0, 1, .01)] }
  ],
  ribbon: [
    TIMING,
    { title: 'Path', fields: [S('pathId', 'Path', pathOpts), R('pathFrom', 'From', 0, 1, .01), R('pathTo', 'To', 0, 4, .01, { hint: 'Above 1 keeps circling a closed path' }), S('mode', 'Behaviour', [['travel', 'Travels along'], ['full', 'Whole path at once']]), R('travel', 'Head travel time', .02, 1, .01, { show: l => l.mode === 'travel', hint: 'Share of the layer length the head needs to reach the end' }), R('tailDelay', 'Tail delay', 0, 1, .01, { show: l => l.mode === 'travel', hint: 'How long the tail waits before chasing the head. 1 = never' }), R('len', 'Max length', .02, 4, .01, { show: l => l.mode === 'travel' }), S('pathEase', 'Easing', EASES, { show: l => l.mode === 'travel' })] },
    { title: 'Shape', fields: [R('width', 'Width', .005, 3, .005, { lo: 0 }), { t: 'curve', k: 'sizeCurve', label: 'Width · head to tail' }, S('face', 'Facing', [['camera', 'Camera'], ['flat', 'Flat'], ['upright', 'Upright']]), R('edgePow', 'Profile', .3, 8, .05, { hint: 'Low = pointed, high = flat with crisp edges' }), R('bias', 'Edge bias', -1, 1, .01, { hint: 'Push the bright side toward one edge' }), R('strands', 'Strands', 1, 24, 1), R('strandVar', 'Strand variation', 0, 1, .01, { show: l => l.strands > 1 }), VEC('pos', 'Offset', .05)] },
    { title: 'Helix & lightning', fields: [R('helixR', 'Helix radius', 0, 2, .01), R('helixTurns', 'Helix turns', 0, 12, .1, { show: l => l.helixR > 0 }), R('helixSpin', 'Helix spin', -12, 12, .1, { show: l => l.helixR > 0 }), R('jitAmp', 'Jitter', 0, 1.5, .01), R('jitFreq', 'Jitter detail', 1, 30, .5, { show: l => l.jitAmp > 0 }), R('jitRate', 'Re-strike rate', 0, 60, 1, { show: l => l.jitAmp > 0, hint: 'New shape per second. 0 = frozen' }), R('pin', 'Pin both ends', 0, 1, .01, { show: l => l.jitAmp > 0 || l.helixR > 0 })] },
    SURFACE(false),
    { title: 'Dissolve', fields: [{ t: 'curve', k: 'visCurve', label: 'Visibility over time' }, R('tailErode', 'Tail erosion', 0, 1, .01)] },
    COLOUR('Head to tail')
  ],
  mesh: [
    TIMING,
    { title: 'Shape', fields: [S('prim', 'Mesh', [['ring', 'Ring'], ['disc', 'Disc'], ['cylinder', 'Cylinder / cone'], ['sphere', 'Sphere'], ['dome', 'Dome'], ['torus', 'Torus'], ['plane', 'Plane'], ['spikes', 'Spike burst'], ['burst', 'Flat spike burst']]), R('inner', 'Inner radius', 0, .98, .01, { show: l => ['ring', 'torus', 'spikes', 'burst'].includes(l.prim) }), R('taper', 'Top radius', 0, 4, .01, { show: l => l.prim === 'cylinder' }), R('spikes', 'Spikes', 3, 120, 1, { show: l => l.prim === 'spikes' || l.prim === 'burst' }), R('seed', 'Seed', 1, 99, 1, { show: l => l.prim === 'spikes' || l.prim === 'burst' }), VEC('size', 'Size', .05), { t: 'curve', k: 'sizeCurve', label: 'Scale over time', vmax: 1.25 }, VEC('rot', 'Rotation °', 1), R('spin', 'Spin °/s', -720, 720, 1), S('facing', 'Facing', [['none', 'World'], ['camera', 'Camera']]), VEC('pos', 'Offset', .05)] },
    { title: 'Path', fields: [S('pathId', 'Path', pathOpts), R('pathFrom', 'From', 0, 1, .01, { show: l => l.pathId }), R('pathTo', 'To', 0, 1, .01, { show: l => l.pathId }), S('pathEase', 'Easing', EASES, { show: l => l.pathId }), B('alignPath', 'Align to path', { show: l => l.pathId })] },
    { title: 'Deform', fields: [R('twist', 'Twist', -8, 8, .05), R('wobble', 'Wobble', 0, 1, .01), R('wobTile', 'Wobble detail', 1, 12, 1, { show: l => l.wobble > 0 }), R('wobSpeed', 'Wobble speed', 0, 6, .05, { show: l => l.wobble > 0 })] },
    SURFACE(true),
    { title: 'Mask', fields: [R('fadeV0', 'Fade start edge', 0, 1, .01), R('fadeV1', 'Fade end edge', 0, 1, .01), R('fresnel', 'Rim ↔ centre', -1, 1, .01, { hint: 'Positive = rim only, negative = centre only' }), R('fresPow', 'Rim sharpness', .3, 6, .05, { show: l => l.fresnel !== 0 })] },
    { title: 'Dissolve', fields: [{ t: 'curve', k: 'visCurve', label: 'Visibility over time' }] },
    COLOUR('Over time')
  ],
  screen: [
    TIMING,
    { title: 'Flash & shake', fields: [{ t: 'color', k: 'flashColor', label: 'Flash colour' }, R('flashAmt', 'Flash amount', 0, 2, .01), R('shakeAmp', 'Shake amount', 0, 1, .005), R('shakeFreq', 'Shake speed', 1, 30, .5), { t: 'curve', k: 'visCurve', label: 'Strength over time' }] }
  ],
  occluder: [
    { title: 'Timing', fields: [B('always', 'Always on', { hint: 'Stays in place before and after its bar' })].concat(TIMING.fields) },
    { title: 'Shape', fields: [S('shape', 'Shape', [['box', 'Box'], ['sphere', 'Sphere'], ['capsule', 'Capsule'], ['cylinder', 'Cylinder'], ['wall', 'Wall'], ['floor', 'Floor']]), VEC('size', 'Size', .05), VEC('pos', 'Position', .05), VEC('rot', 'Rotation °', 1), R('spin', 'Spin °/s', -720, 720, 1), { t: 'curve', k: 'sizeCurve', label: 'Scale over time', vmax: 1.25 }, B('ghost', 'Show guide')] },
    { title: 'Path (animated)', fields: [S('pathId', 'Path', pathOpts), R('pathFrom', 'From', 0, 1, .01, { show: l => l.pathId }), R('pathTo', 'To', 0, 1, .01, { show: l => l.pathId }), S('pathEase', 'Easing', EASES, { show: l => l.pathId }), B('alignPath', 'Align to path', { show: l => l.pathId })] }
  ],
  manga: [
    TIMING,
    { title: 'Manga overlay', fields: [S('mode', 'Kind', [['focus', 'Focus lines'], ['speed', 'Speed lines'], ['burst', 'Sunburst'], ['tone', 'Screentone'], ['impact', 'Impact frame']]),
      { t: 'color', k: 'color', label: 'Ink colour' }, { t: 'color', k: 'color2', label: 'Paper colour', show: l => l.mode === 'impact' }, R('opacity', 'Strength', 0, 1, .01), { t: 'curve', k: 'visCurve', label: 'Strength over time' },
      R('density', 'Line count', 6, 400, 1, { show: l => !MG(l, 'tone', 'impact'), lo: 2 }), R('thick', 'Thickness', .05, 1, .01, { show: l => !MG(l, 'tone', 'impact') }),
      R('inner', 'Clear zone', 0, 1.3, .01, { show: l => !MG(l, 'tone', 'impact') }), R('innerVar', 'Jagged tips', 0, 1, .01, { show: l => l.mode === 'focus' }), R('skip', 'Gaps', 0, .9, .01, { show: l => MG(l, 'focus', 'speed') }),
      R('rate', 'Redraws per second', 0, 30, 1, { show: l => l.mode === 'focus', hint: '12 gives the hand-drawn flicker. 0 holds still' }), R('scroll', 'Motion', -10, 10, .05, { show: l => MG(l, 'speed', 'burst') }),
      R('angle', 'Angle °', -180, 180, 1, { show: l => MG(l, 'speed', 'tone') }), R('dotSize', 'Dot size', .3, 4, .05, { show: l => l.mode === 'tone' }), VEC('grad', 'Fade from → to', .01, { names: ['from', 'to'], show: l => l.mode === 'tone' }),
      R('thr', 'Black / white split', 0, 1, .01, { show: l => l.mode === 'impact' }), B('invert', 'Invert', { show: l => l.mode === 'impact' }), R('seed', 'Seed', 1, 99, 1, { show: l => MG(l, 'focus', 'speed') })] },
    { title: 'Centre', show: l => MG(l, 'focus', 'burst'), fields: [S('anchor', 'Centre on', [['screen', 'The screen'], ['world', 'A point in the scene']]), VEC('shift', 'Screen offset', .01, { names: 'xy', show: l => l.anchor !== 'world' }),
      VEC('pos', 'Position', .05, { show: l => l.anchor === 'world' }), S('pathId', 'Path', pathOpts, { show: l => l.anchor === 'world' }), R('pathFrom', 'From', 0, 1, .01, { show: l => l.anchor === 'world' && l.pathId }), R('pathTo', 'To', 0, 1, .01, { show: l => l.anchor === 'world' && l.pathId }), S('pathEase', 'Easing', EASES, { show: l => l.anchor === 'world' && l.pathId })] }
  ],
  text: [
    TIMING,
    { title: 'Lettering', fields: [{ t: 'chips', label: 'Quick words', items: D.SFX, fn: (l, n) => { l.text = n; l.name = uniqueName('SFX ' + n); } }, { t: 'text', k: 'text', label: 'Text' }, S('font', 'Font', D.FONTS.map(f => [f, f])),
      { t: 'color', k: 'fill', label: 'Fill' }, { t: 'color', k: 'stroke', label: 'Outline colour' }, R('strokeW', 'Outline', 0, .3, .005), B('vertical', 'Vertical'), R('skew', 'Slant °', -30, 30, 1), R('spacing', 'Spacing', -.3, .6, .01),
      R('chaos', 'Chaos', 0, 1, .01, { hint: 'Random tilt, size and offset per letter' }), R('seed', 'Seed', 1, 99, 1)] },
    { title: 'Placement', fields: [VEC('pos', 'Position', .05), VEC('rot', 'Rotation °', 1), R('scale', 'Letter height', .1, 5, .05, { lo: .01 }), S('facing', 'Facing', [['camera', 'Camera'], ['none', 'World']]),
      { t: 'curve', k: 'sizeCurve', label: 'Scale over time', vmax: 1.25 }, { t: 'curve', k: 'visCurve', label: 'Opacity over time' }, R('shake', 'Shake', 0, .5, .005), R('shakeRate', 'Shake rate', 1, 30, 1, { show: l => l.shake > 0 }),
      R('bright', 'Brightness', 0, 4, .05), R('additive', 'Additive ↔ solid', 0, 1, .01)] },
    { title: 'Path', fields: [S('pathId', 'Path', pathOpts), R('pathFrom', 'From', 0, 1, .01, { show: l => l.pathId }), R('pathTo', 'To', 0, 1, .01, { show: l => l.pathId }), S('pathEase', 'Easing', EASES, { show: l => l.pathId })] }
  ],
  media: [
    TIMING,
    { title: 'Media', fields: [S('mediaId', 'Source', mediaOpts), S('place', 'Use as', [['backdrop', 'Backdrop'], ['foreground', 'Foreground (hides effects)'], ['card', '3D card']]), S('fit', 'Fit', [['cover', 'Fill the frame'], ['contain', 'Fit inside'], ['stretch', 'Stretch']], { show: l => l.place !== 'card' }), R('zoom', 'Zoom', .2, 4, .01, { show: l => l.place !== 'card', lo: .05 }), VEC('shift', 'Shift', .01, { names: 'xy', show: l => l.place !== 'card' }), R('opacity', 'Opacity', 0, 1, .01), R('bright', 'Brightness', 0, 3, .01), { t: 'curve', k: 'visCurve', label: 'Opacity over time' }] },
    { title: 'Video', show: l => { const m = mediaById(l.mediaId); return m && m.kind === 'video'; }, fields: [R('offset', 'Start at (s)', 0, 60, .05), R('rate', 'Speed', .1, 4, .05, { lo: .0625 }), B('loopVideo', 'Loop')] },
    { title: 'Cut-out key', fields: [S('key', 'Key', [['none', 'None (use alpha)'], ['luma', 'Brightness'], ['chroma', 'Colour']]), { t: 'color', k: 'keyColor', label: 'Key colour', show: l => l.key === 'chroma' }, R('keyThr', 'Threshold', 0, 1, .01, { show: l => l.key !== 'none' }), R('keySoft', 'Softness', 0, .5, .005, { show: l => l.key !== 'none' }), B('keyInv', 'Invert')] },
    { title: '3D card', show: l => l.place === 'card', fields: [VEC('pos', 'Position', .05), VEC('rot', 'Rotation °', 1), R('scale', 'Height', .1, 12, .05, { lo: .01 }), { t: 'curve', k: 'sizeCurve', label: 'Scale over time', vmax: 1.25 }, S('facing', 'Facing', [['none', 'World'], ['camera', 'Camera']]), B('depth', 'Hides effects behind it'), R('additive', 'Additive ↔ solid', 0, 1, .01), S('pathId', 'Path', pathOpts), R('pathFrom', 'From', 0, 1, .01, { show: l => l.pathId }), R('pathTo', 'To', 0, 1, .01, { show: l => l.pathId }), S('pathEase', 'Easing', EASES, { show: l => l.pathId })] }
  ]
};

/* ───────── inspector ───────── */
function renderInsp() {
  const root = $('#insp'), st = root.scrollTop; root.innerHTML = '';
  const l = selLayer(), p = selPath();
  if (l) layerInsp(root, l); else if (p) pathInsp(root, p);
  else root.append(h('div', { class: 'empty', html: '<b>Nothing selected.</b><br>Pick a layer in the timeline or a path in the library to edit it here.' }));
  root.scrollTop = st;
}
function layerInsp(root, l) {
  const name = h('input', { class: 'tin', type: 'text', id: 'layerName', value: l.name, 'aria-label': 'Layer name', spellcheck: 'false' });
  name.addEventListener('input', () => { l.name = name.value; const n = document.querySelector(`#rows .row[data-id="${l.id}"] .nm`); if (n) n.textContent = l.name; });
  name.addEventListener('change', commit); name.addEventListener('keydown', e => e.stopPropagation());
  root.append(h('div', { class: 'ihead' },
    h('div', { class: 'ty', style: 'color:' + TYPE_COLOR[l.type] }, h('span', { class: 'dot', style: 'background:currentColor' }), D.TYPE_NAMES[l.type]),
    name,
    h('div', { class: 'acts' },
      h('button', { class: 'btn sm', text: 'Forward', title: 'Draw later, in front', onclick: () => moveLayer(l, 1) }),
      h('button', { class: 'btn sm', text: 'Back', title: 'Draw earlier, behind', onclick: () => moveLayer(l, -1) }),
      h('button', { class: 'btn sm', text: 'Duplicate', onclick: () => dupLayer(l) }),
      h('button', { class: 'btn sm', text: 'Delete', onclick: () => delLayer(l) }))));
  if (l.type === 'ribbon' && !pathById(l.pathId)) root.append(h('div', { class: 'warn', style: 'margin-top:10px', text: 'A ribbon needs a path. Pick one under Path, or use Draw path in the viewport.' }));
  if (l.type === 'occluder') root.append(h('div', { class: 'tip', text: 'Invisible in the render. Effects behind it are hidden, so shape it like the object in your footage or scene. Give it a path or a scale curve to animate it.' }));
  const usesMedia = l.type === 'media' || (l.type === 'particles' && l.sprite === 'image') || ((l.type === 'ribbon' || l.type === 'mesh') && l.noise === 'image');
  if (usesMedia && !l.mediaId) root.append(h('div', { class: 'warn', style: 'margin-top:10px', text: 'Pick a source below, or import an image or video from Library → Media.' }));
  else if (usesMedia && !eng.media.get(l.mediaId)) root.append(h('div', { class: 'warn', style: 'margin-top:10px', text: 'The media for this layer is not loaded. Import the file again from Library → Media.' }));
  SCHEMA[l.type].forEach((g, gi) => {
    if (g.show && !g.show(l)) return;
    const key = l.type + ':' + g.title, open = grpOpen[key] != null ? grpOpen[key] : gi < 3;
    const fields = h('div', { class: 'fields' });
    for (const s of g.fields) {
      if (s.show && !s.show(l)) continue;
      if (s.t === 'chips') {
        const row = h('div', { class: 'chips' });
        s.items.forEach(n => row.append(h('button', { class: 'chip', text: n, onclick: () => { s.fn(l, n); eng.syncLayer(l); commit(); renderInsp(); } })));
        fields.append(h('div', { class: 'f col' }, h('label', { text: s.label }), row)); continue;
      }
      fields.append(field(l, s, (final, re) => {
        if (s.k === 'pathId') { markSel(); rebuildHandles(); }
        eng.syncLayer(l);
        if (s.tl) updateBar(l);
        if (final) { commit(); if (re || g.fields.some(x => x.show)) renderInsp(); }
      }));
    }
    const d = h('details', { class: 'grp' }, h('summary', { text: g.title }), fields); d.open = open;
    d.addEventListener('toggle', () => { grpOpen[key] = d.open; });
    root.append(d);
  });
}
function pathInsp(root, p) {
  const name = h('input', { class: 'tin', type: 'text', id: 'pathName', value: p.name, 'aria-label': 'Path name', spellcheck: 'false' });
  name.addEventListener('change', () => { p.name = name.value || 'Path'; commit(); renderLib(); }); name.addEventListener('keydown', e => e.stopPropagation());
  const edit = fn => () => { fn(); eng.syncPath(p); commit(); rebuildHandles(); renderInsp(); };
  const cen = () => { const c = [0, 0, 0]; p.points.forEach(q => { c[0] += q[0]; c[1] += q[1]; c[2] += q[2]; }); return c.map(v => v / p.points.length); };
  const scale = k => () => { const c = cen(); p.points = p.points.map(q => q.map((v, i) => +(c[i] + (v - c[i]) * k).toFixed(3))); };
  root.append(h('div', { class: 'ihead' },
    h('div', { class: 'ty', style: 'color:' + p.color }, h('span', { class: 'dot', style: 'background:currentColor' }), 'Path · ' + p.points.length + ' points'),
    name,
    h('div', { class: 'acts' },
      h('button', { class: 'btn sm', text: 'Duplicate', onclick: () => { const q = D.clone(p); q.id = D.newId('P'); q.name = p.name + ' copy'; q.points.forEach(x => { x[1] += .3; }); project.paths.push(q); eng.syncPath(q); commit(); renderLib(); select('path', q.id); } }),
      h('button', { class: 'btn sm', text: 'Delete', onclick: () => delPath(p) }))));
  const f = h('div', { class: 'fields', style: 'padding-top:12px' });
  f.append(field(p, B('closed', 'Closed loop'), () => { eng.syncPath(p); commit(); rebuildHandles(); }));
  f.append(field(p, { t: 'color', k: 'color', label: 'Guide colour' }, final => { eng.syncPath(p); if (final) { commit(); renderLib(); } }));
  f.append(h('div', { class: 'chips' },
    h('button', { class: 'chip', text: 'Reverse', onclick: edit(() => p.points.reverse()) }),
    h('button', { class: 'chip', text: 'Flatten to floor', onclick: edit(() => p.points.forEach(q => { q[1] = .05; })) }),
    h('button', { class: 'chip', text: 'Raise', onclick: edit(() => p.points.forEach(q => { q[1] = +(q[1] + .25).toFixed(3); })) }),
    h('button', { class: 'chip', text: 'Lower', onclick: edit(() => p.points.forEach(q => { q[1] = +(q[1] - .25).toFixed(3); })) }),
    h('button', { class: 'chip', text: 'Bigger', onclick: edit(scale(1.2)) }),
    h('button', { class: 'chip', text: 'Smaller', onclick: edit(scale(1 / 1.2)) })));
  if (selPt >= 0 && p.points[selPt]) {
    const holder = { pt: p.points[selPt] };
    f.append(field(holder, VEC('pt', 'Point ' + (selPt + 1), .05), final => { eng.syncPath(p); if (final) commit(); }));
    if (p.points.length > 2) f.append(h('button', { class: 'btn sm', text: 'Delete this point', onclick: edit(() => { p.points.splice(selPt, 1); selPt = -1; }) }));
  }
  const users = project.layers.filter(l => l.pathId === p.id), others = project.layers.filter(l => l.pathId !== p.id && l.type !== 'screen');
  f.append(h('p', { class: 'note', text: users.length ? 'Drives: ' + users.map(l => l.name).join(', ') + '.' : 'No layer follows this path yet.' }));
  if (others.length) {
    const s = h('select', { id: 'attachSel', 'aria-label': 'Attach a layer to this path' }, h('option', { value: '', text: 'Attach a layer…' }));
    others.forEach(l => s.append(h('option', { value: l.id, text: l.name })));
    s.addEventListener('change', () => { const l = layerById(s.value); if (!l) return; l.pathId = p.id; eng.syncLayer(l); commit(); renderInsp(); toast(l.name + ' now follows ' + p.name); });
    f.append(h('div', { class: 'ctl' }, s));
  }
  f.append(h('p', { class: 'note', text: 'Drag the dots in the viewport to reshape. Small dots add a point; double-click a dot to remove it.' }));
  root.append(f);
}

/* ───────── layer ops ───────── */
function uniqueName(base) { let n = base, i = 2; while (project.layers.some(l => l.name === n)) n = base + ' ' + i++; return n; }
function addLayer(type, extra) {
  const o = { name: uniqueName(D.TYPE_NAMES[type]), start: 0 };
  const sp = activePath();
  if (type === 'particles') { o.dur = project.duration; if (sp) o.pathId = sp.id; }
  else if (type === 'ribbon') {
    let p = sp || project.paths[0];
    if (!p) { p = D.TEMPLATES.Arc(); project.paths.push(p); eng.syncPath(p); }
    o.pathId = p.id; o.dur = Math.min(1.4, project.duration);
  } else if (type === 'mesh') { o.dur = Math.min(.8, project.duration); o.pos = [0, .05, 0]; }
  else if (type === 'occluder') o.dur = project.duration;
  else if (type === 'media') { if (!project.media.length) { $('#mediaIn').click(); return; } o.mediaId = project.media[project.media.length - 1].id; o.place = 'card'; o.dur = project.duration; }
  else if (type === 'manga' || type === 'text') {
    o.start = time < project.duration - .3 ? +time.toFixed(2) : 0; o.dur = +Math.min(type === 'text' ? 1.2 : 1, project.duration - o.start).toFixed(2);
    const lk = project.look, paperLight = lk.tintAmt > .5 && U.hexRGB(lk.tintA).reduce((a, b) => a + b, 0) > 1.5;
    if (type === 'manga') o.color = paperLight ? lk.tintB : '#ffffff';
  }
  else o.dur = Math.min(.25, project.duration);
  if (extra) { Object.assign(o, extra); if (extra.name) o.name = uniqueName(extra.name); if (extra.dur) o.dur = Math.min(extra.dur, project.duration - o.start); }
  const l = D.makeLayer(type, o);
  project.layers.push(l); eng.syncLayer(l); eng.reorder(); commit();
  sel = { kind: 'layer', id: l.id }; selPt = -1; renderAll();
  if (time > l.start + l.dur) time = 0;
}
function dupLayer(l) { const c = D.clone(l); c.id = D.newId('L'); c.name = uniqueName(l.name + ' copy'); project.layers.splice(project.layers.indexOf(l) + 1, 0, c); eng.syncLayer(c); eng.reorder(); commit(); sel = { kind: 'layer', id: c.id }; renderAll(); }
function delLayer(l) { const i = project.layers.indexOf(l); project.layers.splice(i, 1); eng.removeLayer(l.id); eng.reorder(); commit(); const n = project.layers[Math.min(i, project.layers.length - 1)]; sel = n ? { kind: 'layer', id: n.id } : { kind: null, id: null }; renderAll(); }
function moveLayer(l, d) { const a = project.layers, i = a.indexOf(l), j = i + d; if (j < 0 || j >= a.length) return; a.splice(i, 1); a.splice(j, 0, l); eng.reorder(); commit(); renderTimeline(); }
function delPath(p) {
  project.paths.splice(project.paths.indexOf(p), 1);
  project.layers.forEach(l => { if (l.pathId === p.id) { l.pathId = null; eng.syncLayer(l); } });
  eng.removePath(p.id); commit(); sel = { kind: null, id: null }; renderAll();
}
function addPath(p) { p.color = D.PATH_COLORS[project.paths.length % D.PATH_COLORS.length]; project.paths.push(p); eng.syncPath(p); return p; }

/* ───────── media: import, persistence, use ───────── */
async function getAssets() {
  if (assetsCap !== undefined) return assetsCap;
  try { assetsCap = (window.claude && window.claude.use) ? await window.claude.use('assets') : null; } catch (e) { assetsCap = null; }
  return assetsCap;
}
function saveMediaSoon() { clearTimeout(mediaSaveT); mediaSaveT = setTimeout(() => { try { localStorage.setItem('hanabi.media', JSON.stringify(mediaData)); } catch (e) {} }, 600); }
function absorbMedia(p) { if (p && p.mediaData) { Object.assign(mediaData, p.mediaData); delete p.mediaData; saveMediaSoon(); } return p; }
function mediaSrc(m) { return mediaBlob[m.id] || (m.asset ? '/_blob/' + m.asset : mediaData[m.id]) || null; }
function loadMediaEl(m) {
  return new Promise(res => {
    const src = mediaSrc(m); if (!src) { res(false); return; }
    if (m.kind === 'video') {
      const v = document.createElement('video'); let done = false;
      v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.loop = false;
      v.addEventListener('loadeddata', () => { if (done) return; done = true; m.w = v.videoWidth || 16; m.h = v.videoHeight || 9; m.dur = isFinite(v.duration) ? +v.duration.toFixed(3) : 0; eng.setMedia(m.id, v, 'video', m.w, m.h, m.dur); res(true); });
      v.addEventListener('error', () => { if (!done) { done = true; res(false); } });
      v.src = src; v.load();
    } else {
      const im = new Image();
      im.onload = () => { m.w = im.naturalWidth || 512; m.h = im.naturalHeight || 512; eng.setMedia(m.id, im, 'image', m.w, m.h, 0); res(true); };
      im.onerror = () => res(false); im.src = src;
    }
  });
}
function ensureMedia() {
  for (const m of project.media) if (!eng.media.get(m.id)) loadMediaEl(m).then(ok => { if (!ok) return; renderLib(); const l = selLayer(); if (l && l.mediaId === m.id) renderInsp(); });
}
async function persistMedia(m, file) {
  const as = await getAssets();
  if (as && file.size <= 20 * 1048576) {
    try { const r = await as.upload(file); assetOf[m.id] = r.id; m.asset = r.id; delete m.temp; lastJSON = JSON.stringify(project); saveSoon(); return; } catch (e) {}
  }
  if (m.kind === 'image') {
    try {
      const im = eng.media.get(m.id).el, k = Math.min(1, 1024 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); mediaData[m.id] = c.toDataURL('image/webp', .86); saveMediaSoon();
    } catch (e) {}
  } else { m.temp = true; lastJSON = JSON.stringify(project); renderLib(); toast('This video stays for this session only. Import it again after a reload.'); }
}
async function importMedia(files) {
  const added = [];
  for (const f of files) {
    const kind = /^video\//.test(f.type) ? 'video' : /^image\//.test(f.type) ? 'image' : null;
    if (!kind) { toast('Only images and videos can be imported.'); continue; }
    const m = { id: D.newId('M'), name: (f.name || kind).replace(/\.[^.]+$/, '').slice(0, 40) || kind, kind, w: 1, h: 1, dur: 0 };
    mediaBlob[m.id] = URL.createObjectURL(f); project.media.push(m);
    if (!await loadMediaEl(m)) { project.media.splice(project.media.indexOf(m), 1); delete mediaBlob[m.id]; toast('Could not read ' + f.name + '. Use MP4 or WebM video, or PNG, JPG or WebP images.'); continue; }
    added.push(m); persistMedia(m, f);
  }
  if (!added.length) return [];
  commit(); renderLib(); useDialog(added[0], added.length);
  return added;
}
function removeMedia(m) {
  project.media.splice(project.media.indexOf(m), 1);
  project.layers.forEach(l => { if (l.mediaId === m.id) l.mediaId = null; });
  eng.removeMedia(m.id); delete mediaData[m.id]; saveMediaSoon(); commit(); renderAll();
}
function addMediaLayer(m, place) {
  const o = { name: uniqueName(m.name), mediaId: m.id, place, start: 0, dur: project.duration };
  if (place === 'foreground') { o.key = 'luma'; o.keyThr = .45; }
  const l = D.makeLayer('media', o);
  if (place === 'backdrop') project.layers.unshift(l); else project.layers.push(l);
  eng.syncLayer(l); eng.reorder(); commit(); sel = { kind: 'layer', id: l.id }; selPt = -1; renderAll();
  toast(place === 'backdrop' ? m.name + ' is now the backdrop' : place === 'foreground' ? 'Bright parts of ' + m.name + ' now hide the effect. Tune the key in the inspector.' : m.name + ' placed as a 3D card');
}
function useDialog(m, n) {
  const l = selLayer(), opt = (label, sub, fn) => h('button', { class: 'opt', onclick: () => { closeModal(); fn(); } }, h('b', { text: label }), h('span', { text: sub }));
  const opts = [opt('Backdrop', 'Sits behind the effect, like footage or a still plate.', () => addMediaLayer(m, 'backdrop')),
    opt('Foreground occlusion', 'Sits in front and hides the effect where it is keyed in. A video makes it animated.', () => addMediaLayer(m, 'foreground')),
    opt('3D card', 'A flat cut-out standing in the scene that effects pass in front of and behind.', () => addMediaLayer(m, 'card'))];
  if (l && l.type === 'particles') opts.push(opt('Sprite for “' + l.name + '”', 'Every particle draws this image. Sprite sheets are supported.', () => { l.sprite = 'image'; l.mediaId = m.id; eng.syncLayer(l); commit(); renderInsp(); }));
  if (l && (l.type === 'ribbon' || l.type === 'mesh')) opts.push(opt('Pattern on “' + l.name + '”', 'Replaces the procedural pattern with this image or video.', () => { l.noise = 'image'; l.mediaId = m.id; l.cut = Math.min(l.cut, .1); eng.syncLayer(l); commit(); renderInsp(); }));
  openModal(h('h2', { text: 'Use ' + m.name + ' as' }), n > 1 ? h('p', { class: 'note', text: (n - 1) + ' more file' + (n > 2 ? 's were' : ' was') + ' added to Library → Media.' }) : null,
    h('div', { class: 'opts' }, ...opts), h('div', { class: 'rowb' }, h('button', { class: 'btn', text: 'Keep it in the library for now', onclick: closeModal })));
}

/* ───────── looks, palettes, variation ───────── */
function applyLook(k) {
  project.look = Object.assign(D.clone(k.look), { gradeAll: project.look.gradeAll });
  project.bloom = { strength: k.bloom[0], radius: k.bloom[1], threshold: k.bloom[2] };
  commit(); renderLib();
}
function hexHSL(hex) {
  const [r, g, b] = U.hexRGB(hex), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let hh = 0, ss = 0;
  if (d > 1e-5) { ss = d / (1 - Math.abs(2 * l - 1) + 1e-6); hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; if (hh < 0) hh += 360; }
  return [hh, Math.min(1, ss), l];
}
function hslHex(hh, ss, l) {
  const c = (1 - Math.abs(2 * l - 1)) * ss, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - c / 2, i = Math.floor(hh / 60) % 6;
  const rgb = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][i];
  return toHex(rgb.map(v => v + m));
}
function eachColour(fn) { project.layers.forEach(l => { if (l.grad) l.grad.forEach(st => { st.c = fn(st.c); }); if (l.flashColor) l.flashColor = fn(l.flashColor); }); }
function recolor(pal) {
  let sx = 0, sy = 0, sw = 0, ssum = 0, n = 0;
  eachColour(c => { const [hh, ss, l] = hexHSL(c), w = ss * (1 - Math.abs(2 * l - 1)); sx += Math.cos(hh * Math.PI / 180) * w; sy += Math.sin(hh * Math.PI / 180) * w; sw += w; ssum += ss; n++; return c; });
  if (!n) { toast('No colours to change yet.'); return; }
  const dom = sw > 1e-3 ? Math.atan2(sy, sx) * 180 / Math.PI : pal.hue, d = pal.hue - dom, grey = ssum / n < .2 && pal.sat > .5;
  eachColour(c => { let [hh, ss, l] = hexHSL(c); if (grey) { ss = .9 * (1 - Math.pow(Math.abs(2 * l - 1), 3)); hh = pal.hue; } else { hh = ((hh + d) % 360 + 360) % 360; ss = Math.min(1, ss * pal.sat); } return hslHex(hh, ss, l); });
  project.layers.forEach(l => eng.syncLayer(l)); commit(); renderInsp(); toast('Recoloured to ' + pal.name);
}
function shuffleVariation() {
  const j = (v, a, dp) => +(v * (1 + (Math.random() * 2 - 1) * a)).toFixed(dp == null ? 2 : dp), jv = (arr, a, dp) => arr.map(v => j(v, a, dp));
  project.layers.forEach(l => {
    if ('seed' in l) l.seed = 1 + Math.floor(Math.random() * 98);
    if (l.type === 'particles') { l.speed = jv(l.speed, .2); l.radial = jv(l.radial, .2); l.size = jv(l.size, .18, 3); l.spread = U.clamp(j(l.spread, .2, 0), 0, 180); l.orbit = j(l.orbit, .25); l.turbAmp = j(l.turbAmp, .3); l.count = Math.max(1, Math.round(j(l.count, .15, 0))); l.life = jv(l.life, .12); }
    if (l.type === 'ribbon') { l.width = j(l.width, .2, 3); l.helixR = j(l.helixR, .2); l.helixTurns = j(l.helixTurns, .2, 1); l.jitAmp = j(l.jitAmp, .25); }
    if (l.type === 'mesh') { l.twist = j(l.twist, .3); l.wobble = j(l.wobble, .3); l.spin = j(l.spin, .3, 0); }
    if (l.type === 'ribbon' || l.type === 'mesh') { l.tile = jv(l.tile, .22, 1); l.scroll = jv(l.scroll, .22); l.distort = j(l.distort, .3); l.skew = j(l.skew, .3); l.contrast = U.clamp(j(l.contrast, .12), .5, 4); l.cut = U.clamp(j(l.cut, .15), 0, .9); }
    eng.syncLayer(l);
  });
  commit(); renderInsp(); toast('New variation. Undo brings the last one back.');
}

/* ───────── library ───────── */
function renderLib() {
  const root = $('#lib'), st = root.scrollTop; root.innerHTML = '';
  const ps = h('div', { class: 'presets' });
  D.PRESETS.forEach(p => ps.append(h('button', { class: 'preset', onclick: () => loadProject(p.build()) },
    h('i', { style: `background:radial-gradient(120% 140% at 85% 0%,${p.swatch[2]} 0%,${p.swatch[1]} 28%,${p.swatch[0]} 62%,#0b0c13 100%)` }), h('span', { text: p.name }))));
  root.append(h('section', { class: 'sec' }, h('h3', { text: 'Starter effects' }), ps));

  const lg = h('div', { class: 'looks' }), lk = project.look, lkDone = final => { if (final) commit(); };
  D.LOOKS.forEach(k => lg.append(h('button', { class: 'look' + (lk.name === k.name ? ' on' : ''), onclick: () => applyLook(k) }, h('i', { style: `background:linear-gradient(135deg,${k.sw[0]} 50%,${k.sw[1]} 50%)` }), h('span', { text: k.name }))));
  const lf = h('div', { class: 'fields', style: 'padding:10px 0 0' });
  for (const f of [R('pixel', 'Pixel size', 1, 16, 1, { lo: 1 }), R('poster', 'Colour steps', 0, 12, 1), R('outline', 'Ink outline', 0, 1, .01), { t: 'color', k: 'outlineCol', label: 'Outline colour' }, R('halftone', 'Halftone dots', 0, 1, .01),
    R('hue', 'Hue shift', -.5, .5, .005), R('sat', 'Saturation', 0, 2, .01), R('contrast', 'Contrast', .5, 2, .01), R('tintAmt', 'Duotone', 0, 1, .01), { t: 'color', k: 'tintA', label: 'Duotone dark' }, { t: 'color', k: 'tintB', label: 'Duotone light' },
    R('chroma', 'Colour fringe', 0, 2, .01), R('scan', 'Scanlines', 0, 1, .01), R('grain', 'Grain', 0, 1, .01), R('vignette', 'Vignette', 0, 1.5, .01), B('gradeAll', 'Also style media plates')]) lf.append(field(lk, f, lkDone));
  const ld = h('details', { class: 'sub' }, h('summary', { text: 'Fine-tune this look' }), lf); ld.open = !!grpOpen.look; ld.addEventListener('toggle', () => { grpOpen.look = ld.open; });
  root.append(h('section', { class: 'sec' }, h('h3', { text: 'Look' }), lg, ld));

  const pc = h('div', { class: 'chips' });
  D.PALETTES.forEach(pl => pc.append(h('button', { class: 'chip pal', onclick: () => recolor(pl) }, h('i', { style: `background:hsl(${pl.hue},${Math.round(Math.min(1, pl.sat) * 85)}%,58%)` }), pl.name)));
  root.append(h('section', { class: 'sec' }, h('h3', { text: 'Recolour & vary' }), pc,
    h('button', { class: 'btn sm', style: 'margin-top:9px', text: 'Shuffle a variation', title: 'New seeds and small random changes to motion, size and patterns', onclick: shuffleVariation })));

  const mlist = h('div', { class: 'plist' });
  project.media.forEach(m => {
    const src = m.kind === 'image' ? mediaSrc(m) : null;
    mlist.append(h('div', { class: 'prow mrow' }, src ? h('img', { src, alt: '' }) : h('span', { class: 'vid', text: m.kind === 'video' ? 'VID' : 'IMG' }),
      h('span', { class: 'nm', text: m.name }), h('small', { text: (eng.media.get(m.id) ? (m.kind === 'video' ? fmt(m.dur) + ' s' : m.w + '×' + m.h) : 'missing') + (m.temp ? ' · session' : '') }),
      h('button', { class: 'mini', text: 'Use', onclick: () => useDialog(m, 1) }), h('button', { class: 'mini', text: '✕', title: 'Remove from this effect', 'aria-label': 'Remove ' + m.name, onclick: () => removeMedia(m) })));
  });
  root.append(h('section', { class: 'sec' }, h('h3', { text: 'Media' }), project.media.length ? mlist : null,
    h('button', { class: 'btn sm', text: 'Import image or video', onclick: () => $('#mediaIn').click() }),
    h('p', { class: 'note', style: 'margin-top:8px', text: 'Use it as a backdrop, a foreground that hides effects, a 3D card, a particle sprite or a surface pattern. You can also drop files on the view.' })));

  const mine = userPresets(), ml = h('div', { class: 'presets', style: 'margin-bottom:8px' });
  mine.forEach((m, i) => ml.append(h('button', { class: 'preset user', onclick: e => { if (e.target.classList.contains('x')) return; loadProject(D.clone(m.project)); } },
    h('span', { text: m.name }), h('span', { class: 'x', text: '✕', title: 'Remove', onclick: () => { const a = userPresets(); a.splice(i, 1); setUserPresets(a); renderLib(); } }))));
  root.append(h('section', { class: 'sec' }, h('h3', { text: 'My effects' }), mine.length ? ml : null,
    h('button', { class: 'btn sm', text: 'Save current to my effects', onclick: saveMine }),
    mine.length ? null : h('p', { class: 'note', style: 'margin-top:8px', text: 'Kept in this browser. Use Export for a file you can move around.' })));

  const adds = h('div', { class: 'adds' });
  for (const t of LAYER_TYPES) adds.append(h('button', { class: 'add', onclick: () => addLayer(t) }, h('span', { class: 'dot', style: 'background:' + TYPE_COLOR[t] }), D.TYPE_NAMES[t]));
  root.append(h('section', { class: 'sec' }, h('h3', { text: 'Add a layer' }), adds));
  const kit = h('div', { class: 'chips' });
  for (const [label, type, extra] of [['Focus lines', 'manga', { mode: 'focus', name: 'Focus lines' }], ['Speed lines', 'manga', { mode: 'speed', name: 'Speed lines', inner: .3, density: 46 }], ['Sunburst', 'manga', { mode: 'burst', name: 'Sunburst', density: 14, opacity: .3, inner: 0, scroll: .15 }],
    ['Screentone', 'manga', { mode: 'tone', name: 'Screentone', opacity: .5, angle: -90 }], ['Impact frame', 'manga', { mode: 'impact', name: 'Impact frame', dur: .1, color: '#0c0b10' }], ['SFX ドン!', 'text', { text: 'ドン!', name: 'SFX ドン!' }], ['SFX ゴゴゴ', 'text', { text: 'ゴゴゴ', name: 'SFX ゴゴゴ', shake: .07 }], ['SFX BAM!', 'text', { text: 'BAM!', name: 'SFX BAM!', font: 'Bangers' }]])
    kit.append(h('button', { class: 'chip', text: label, onclick: () => addLayer(type, extra) }));
  root.append(h('section', { class: 'sec' }, h('h3', { text: 'Manga kit' }), kit,
    h('p', { class: 'note', style: 'margin-top:8px', text: 'Added at the playhead. Pair them with the Ink & paper, Manga tone or Ink negative look. Emotion marks (heart, drop, vein, bang, spiral) are particle sprite shapes.' })));

  const pl = h('div', { class: 'plist' });
  project.paths.forEach(p => pl.append(h('button', { class: 'prow' + (sel.kind === 'path' && sel.id === p.id ? ' sel' : ''), 'data-id': p.id, onclick: () => select('path', p.id) },
    h('span', { class: 'dot', style: 'border-radius:50%;background:' + p.color }), h('span', { text: p.name }), h('small', { text: p.points.length + ' pt' }))));
  const tc = h('div', { class: 'chips' });
  Object.keys(D.TEMPLATES).forEach(k => tc.append(h('button', { class: 'chip', text: k, onclick: () => { const p = addPath(D.TEMPLATES[k]()); commit(); renderLib(); select('path', p.id); } })));
  root.append(h('section', { class: 'sec' }, h('h3', { text: 'Paths' }), project.paths.length ? pl : null,
    h('button', { class: 'btn sm', style: 'margin-bottom:9px', text: 'Draw a path in the view', onclick: () => setTool('draw') }), tc));

  const sc = h('div', { class: 'fields', style: 'padding:0' });
  const b = project.bloom, done = final => { if (final) commit(); };
  sc.append(field(b, R('strength', 'Glow strength', 0, 3, .01), done), field(b, R('radius', 'Glow spread', .3, 1.3, .01), done), field(b, R('threshold', 'Glow threshold', 0, 1.5, .01), done),
    field(project, R('exposure', 'Exposure', .3, 2, .01), done), field(project, { t: 'color', k: 'bg', label: 'Backdrop' }, done));
  root.append(h('section', { class: 'sec' }, h('h3', { text: 'Scene' }), sc));
  root.scrollTop = st;
}
function saveMine() {
  const name = h('input', { class: 'tin', type: 'text', id: 'mineName', value: project.name, 'aria-label': 'Effect name' });
  name.addEventListener('keydown', e => e.stopPropagation());
  openModal(h('h2', { text: 'Save to my effects' }), name, h('div', { class: 'rowb' },
    h('button', { class: 'btn', text: 'Cancel', onclick: closeModal }),
    h('button', { class: 'btn pri', text: 'Save', onclick: () => { const a = userPresets(); a.push({ name: name.value || project.name, project: snapshot() }); toast(setUserPresets(a) ? 'Saved to my effects' : 'This browser blocked storage. Use Export instead.'); closeModal(); renderLib(); } })));
}
function snapshot() {
  const p = D.clone(project), c = eng.cam, md = {};
  p.cam = { theta: +c.theta.toFixed(3), phi: +c.phi.toFixed(3), dist: +c.dist.toFixed(2), target: c.target.toArray().map(v => +v.toFixed(2)) };
  p.media.forEach(m => { if (mediaData[m.id]) md[m.id] = mediaData[m.id]; }); if (Object.keys(md).length) p.mediaData = md;
  return p;
}

/* ───────── timeline ───────── */
function renderTimeline() {
  const rows = $('#rows'), dur = project.duration; rows.innerHTML = '';
  [...project.layers].reverse().forEach(l => {
    const eye = h('button', { class: 'eye', html: l.visible ? EYE : EYE_OFF, title: 'Show / hide', 'aria-label': 'Show or hide ' + l.name });
    eye.addEventListener('click', e => { e.stopPropagation(); l.visible = !l.visible; commit(); renderTimeline(); });
    const bar = h('div', { class: 'bar', style: `background:${TYPE_COLOR[l.type]}` });
    const tail = l.type === 'particles' ? h('div', { class: 'tailb', style: `background:${TYPE_COLOR[l.type]}` }) : null;
    const track = h('div', { class: 'track' }, tail, bar);
    const row = h('div', { class: 'row' + (sel.kind === 'layer' && sel.id === l.id ? ' sel' : '') + (l.visible ? '' : ' off'), 'data-id': l.id },
      h('div', { class: 'rlab', onclick: () => select('layer', l.id) }, eye, h('span', { class: 'dot', style: 'background:' + TYPE_COLOR[l.type] }), h('span', { class: 'nm', text: l.name })), track);
    rows.append(row); placeBar(row, l);
    bar.addEventListener('pointerdown', e => barDrag(e, l, bar, track));
    track.addEventListener('pointerdown', e => { if (e.target === track) scrubStart(e); });
  });
  if (!project.layers.length) rows.append(h('div', { class: 'empty', html: 'No layers yet. Use <b>+ Layer</b> or load a starter effect.' }));
  const rt = $('#rtrack'); rt.innerHTML = '';
  const major = dur <= 3 ? .5 : dur <= 8 ? 1 : dur <= 16 ? 2 : 5, minor = major / 5;
  for (let i = 0; i * minor <= dur + 1e-6; i++) { const t = i * minor, isM = i % 5 === 0; rt.append(h('div', { class: 'tick' + (isM ? '' : ' minor'), style: `left:${t / dur * 100}%`, text: isM ? fmt(t) : '' })); }
  $('#playhead').style.height = Math.max($('#tlBody').clientHeight, $('#tlBody').scrollHeight) + 'px';
}
function placeBar(row, l) {
  const dur = project.duration, bar = row.querySelector('.bar'), tail = row.querySelector('.tailb');
  bar.style.left = l.start / dur * 100 + '%'; bar.style.width = Math.max(.4, Math.min(l.dur, dur * 2) / dur * 100) + '%';
  if (tail) { const s = l.start + (l.emit === 'burst' ? l.burstSpread : l.dur); tail.style.left = l.start / dur * 100 + '%'; tail.style.width = (s - l.start + l.life[1]) / dur * 100 + '%'; tail.style.display = l.loop && l.emit !== 'burst' ? 'none' : ''; }
}
function updateBar(l) { const row = document.querySelector(`#rows .row[data-id="${l.id}"]`); if (row) placeBar(row, l); }
function barDrag(e, l, bar, track) {
  e.preventDefault(); e.stopPropagation(); select('layer', l.id, true);
  const br = bar.getBoundingClientRect(), tw = track.getBoundingClientRect().width, dur = project.duration;
  const x = e.clientX - br.left, zone = br.width > 26 && x < 9 ? 'l' : br.width > 26 && x > br.width - 10 ? 'r' : x > br.width - 6 ? 'r' : 'm';
  const s0 = l.start, d0 = l.dur, x0 = e.clientX; let moved = false;
  const mv = ev => {
    const dt = Math.round((ev.clientX - x0) / tw * dur * 100) / 100; if (!dt && !moved) return; moved = true;
    if (zone === 'm') l.start = U.clamp(+(s0 + dt).toFixed(2), 0, dur);
    else if (zone === 'l') { l.start = U.clamp(+(s0 + dt).toFixed(2), 0, s0 + d0 - .02); l.dur = +(d0 - (l.start - s0)).toFixed(2); }
    else l.dur = Math.max(.02, +(d0 + dt).toFixed(2));
    updateBar(l); if (zone !== 'm') eng.syncLayer(l);
  };
  const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); if (moved) { commit(); renderInsp(); } };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
function scrubStart(e) {
  e.preventDefault(); const rt = $('#rtrack');
  const set = ev => { const r = rt.getBoundingClientRect(); time = U.clamp((ev.clientX - r.left) / r.width, 0, 1) * project.duration; };
  scrubbing = true; set(e);
  const up = () => { scrubbing = false; window.removeEventListener('pointermove', set); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', set); window.addEventListener('pointerup', up);
}

/* ───────── path handles ───────── */
const tmpV = new T.Vector3(), scr = { x: 0, y: 0, visible: true };
let handleEls = [], midEls = [], handlePath = null;
function rebuildHandles() {
  const box = $('#handles'); box.innerHTML = ''; handleEls = []; midEls = [];
  const p = handlePath = (eng.view.paths ? activePath() : null);
  markSel(); addPosHandle(box); if (!p) return;
  p.points.forEach((pt, i) => {
    const d = h('div', { class: 'h' + (i === selPt ? ' sel' : '') + (i === 0 ? ' first' : ''), title: 'Point ' + (i + 1) });
    d.addEventListener('pointerdown', e => ptDrag(e, p, i));
    d.addEventListener('dblclick', () => { if (p.points.length > 2) { p.points.splice(i, 1); selPt = -1; eng.syncPath(p); commit(); rebuildHandles(); if (sel.kind === 'path') renderInsp(); } });
    box.append(d); handleEls.push(d);
  });
  const segs = p.closed && p.points.length > 2 ? p.points.length : p.points.length - 1;
  for (let i = 0; i < segs; i++) {
    const d = h('div', { class: 'hm', title: 'Add a point' });
    d.addEventListener('pointerdown', e => {
      const m = midPoint(p, i); p.points.splice(i + 1, 0, m.toArray().map(v => +v.toFixed(3)));
      eng.syncPath(p); rebuildHandles(); ptDrag(e, p, i + 1);
    });
    box.append(d); midEls.push(d);
  }
}
function midPoint(p, i) {
  const pts = p.points.map(q => new T.Vector3(q[0], q[1], q[2]));
  if (pts.length < 2) return pts[0].clone();
  const closed = p.closed && pts.length > 2, c = new T.CatmullRomCurve3(pts, closed, 'centripetal');
  return c.getPoint((i + .5) / (closed ? pts.length : pts.length - 1));
}
function posBase(l, out) { out.set(0, 0, 0); const pd = l.pathId ? eng.paths.get(l.pathId) : null; if (pd) pd.sample(l.pathFrom || 0, out); return out; }
let posEl = null, posLayer = null;
function addPosHandle(box) {
  posEl = null; posLayer = null; const l = selLayer();
  if (!l || !eng.view.paths || !Array.isArray(l.pos) || l.type === 'ribbon' || (l.type === 'media' && l.place !== 'card') || (l.type === 'manga' && !(l.anchor === 'world' && MG(l, 'focus', 'burst')))) return;
  posLayer = l; posEl = h('div', { class: 'hp', title: 'Drag to move. Hold Shift to move straight up or down.' });
  posEl.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    const rect = $('#stage').getBoundingClientRect(), n = new T.Vector3(), base = posBase(l, new T.Vector3()); eng.camera.getWorldDirection(n);
    const origin = base.clone().add(new T.Vector3(l.pos[0], l.pos[1], l.pos[2])); let moved = false;
    const mv = ev => { const hit = eng.rayPlane(ev.clientX - rect.left, ev.clientY - rect.top, n, origin); if (!hit) return; if (ev.shiftKey) { hit.x = origin.x; hit.z = origin.z; }
      l.pos = [+(hit.x - base.x).toFixed(3), +(hit.y - base.y).toFixed(3), +(hit.z - base.z).toFixed(3)]; moved = true; eng.syncLayer(l); };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); if (moved) { commit(); renderInsp(); } };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });
  box.append(posEl);
}
function updateHandles() {
  if (posEl && posLayer) { posBase(posLayer, tmpV); tmpV.x += posLayer.pos[0]; tmpV.y += posLayer.pos[1]; tmpV.z += posLayer.pos[2]; eng.projectPoint(tmpV, scr);
    posEl.style.display = scr.visible ? '' : 'none'; posEl.style.left = scr.x + 'px'; posEl.style.top = scr.y + 'px'; }
  const p = handlePath; if (!p) return;
  for (let i = 0; i < handleEls.length; i++) {
    const q = p.points[i]; if (!q) continue;
    eng.projectPoint(tmpV.set(q[0], q[1], q[2]), scr);
    handleEls[i].style.display = scr.visible ? '' : 'none'; handleEls[i].style.left = scr.x + 'px'; handleEls[i].style.top = scr.y + 'px';
  }
  for (let i = 0; i < midEls.length; i++) {
    eng.projectPoint(midPoint(p, i), scr);
    midEls[i].style.display = scr.visible ? '' : 'none'; midEls[i].style.left = scr.x + 'px'; midEls[i].style.top = scr.y + 'px';
  }
}
function ptDrag(e, p, i) {
  e.preventDefault(); e.stopPropagation();
  selPt = i; handleEls.forEach((d, k) => d.classList.toggle('sel', k === i));
  const rect = $('#stage').getBoundingClientRect(), n = new T.Vector3(); eng.camera.getWorldDirection(n);
  const origin = new T.Vector3(p.points[i][0], p.points[i][1], p.points[i][2]); let moved = false;
  const mv = ev => {
    const hit = eng.rayPlane(ev.clientX - rect.left, ev.clientY - rect.top, n, origin); if (!hit) return;
    if (ev.shiftKey) { hit.x = origin.x; hit.z = origin.z; }
    p.points[i] = [+hit.x.toFixed(3), +hit.y.toFixed(3), +hit.z.toFixed(3)]; moved = true; eng.syncPath(p);
  };
  const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); commit(); if (sel.kind === 'path') renderInsp(); };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}

/* ───────── viewport: orbit + draw ───────── */
let draft = null, draftPts = [];
function setTool(t) {
  tool = t;
  document.querySelectorAll('#toolSeg button').forEach(b => { const on = b.dataset.tool === t; b.classList.toggle('on', on); b.classList.toggle('hot', on && t === 'draw'); });
  $('#planeSeg').style.display = t === 'draw' ? '' : 'none';
  $('#gl').style.cursor = t === 'draw' ? 'crosshair' : 'grab';
  const l = selLayer();
  $('#hint').textContent = t === 'draw' ? ('Drag in the view to draw a stroke.' + (l && l.type !== 'screen' ? ' It becomes the path of “' + l.name + '”.' : ' It becomes a new path.')) : '';
}
function drawPlane() {
  const n = new T.Vector3(), o = new T.Vector3();
  if (plane === 'ground') { n.set(0, 1, 0); o.set(0, .05, 0); }
  else { eng.camera.getWorldDirection(n); if (plane === 'wall') { n.y = 0; if (n.lengthSq() < 1e-4) n.set(0, 0, -1); n.normalize(); } o.copy(eng.cam.target); }
  return { n, o };
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const a = pts[0], b = pts[pts.length - 1], ab = new T.Vector3().subVectors(b, a), l2 = ab.lengthSq(), t = new T.Vector3();
  let dm = 0, ix = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const k = l2 > 1e-10 ? U.clamp(t.subVectors(pts[i], a).dot(ab) / l2, 0, 1) : 0;
    const d = t.copy(a).addScaledVector(ab, k).distanceTo(pts[i]); if (d > dm) { dm = d; ix = i; }
  }
  if (dm <= eps) return [a, b];
  return rdp(pts.slice(0, ix + 1), eps).slice(0, -1).concat(rdp(pts.slice(ix), eps));
}
function finishStroke() {
  const pts = draftPts; draftPts = []; if (draft) draft.visible = false;
  let len = 0; for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]);
  if (pts.length < 2 || len < .25) { toast('Stroke too short. Drag further to draw a path.'); return; }
  let closed = pts.length > 8 && pts[0].distanceTo(pts[pts.length - 1]) < len * .08, src = pts;
  if (closed) src = pts.slice(0, -Math.max(1, Math.floor(pts.length * .04)));
  let eps = len * .012, out = rdp(src, eps);
  while (out.length > 14) { eps *= 1.4; out = rdp(src, eps); }
  if (closed && out.length < 4) closed = false;
  const n = project.paths.filter(p => /^Stroke/.test(p.name)).length + 1;
  const p = addPath(D.makePath('Stroke ' + n, out.map(v => [v.x, v.y, v.z]), { closed }));
  const l = selLayer(); let msg = p.name + ' added';
  if (l && l.type !== 'screen') { l.pathId = p.id; eng.syncLayer(l); msg = '“' + l.name + '” now follows ' + p.name; time = Math.max(0, l.start - .05); playing = true; }
  commit(); renderLib(); setTool('orbit'); renderInsp(); rebuildHandles(); toast(msg);
}
function bindStage() {
  const cv = $('#gl'), ptrs = new Map(); let pinch = 0, mid = null, drawing = false;
  const local = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, sh: e.shiftKey });
    if (tool === 'draw' && ptrs.size === 1 && e.button === 0) {
      drawing = true; draftPts = [];
      if (!draft) { draft = new T.Line(new T.BufferGeometry(), new T.LineBasicMaterial({ color: 0xff4d7e, depthTest: false })); draft.geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(3000 * 3), 3)); draft.frustumCulled = false; eng.helpers.add(draft); }
      draft.visible = true; draft.geometry.setDrawRange(0, 0); addDraft(e);
    } else if (ptrs.size === 2) { drawing = false; const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    if (tool !== 'draw') cv.style.cursor = 'grabbing';
  });
  function addDraft(e) {
    const [x, y] = local(e), pl = drawPlane(), hit = eng.rayPlane(x, y, pl.n, pl.o);
    if (!hit || hit.length() > 60) return;
    const last = draftPts[draftPts.length - 1]; if (last && last.distanceTo(hit) < .03) return;
    if (draftPts.length >= 3000) return;
    draftPts.push(hit); const a = draft.geometry.attributes.position; a.setXYZ(draftPts.length - 1, hit.x, hit.y, hit.z); a.needsUpdate = true; draft.geometry.setDrawRange(0, draftPts.length);
  }
  cv.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (drawing) { addDraft(e); return; }
    if (ptrs.size === 1) { if (p.b === 2 || p.b === 1 || p.sh) eng.pan(dx, dy); else if (tool !== 'draw') eng.orbit(dx, dy); }
    else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (pinch > 0) eng.zoom(pinch / d); eng.pan(m.x - mid.x, m.y - mid.y); pinch = d; mid = m;
    }
  });
  const end = e => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (drawing && !ptrs.size) { drawing = false; finishStroke(); } if (tool !== 'draw') cv.style.cursor = 'grab'; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => { e.preventDefault(); eng.zoom(Math.exp(e.deltaY * .0012)); }, { passive: false });
}

/* ───────── export ───────── */
async function saveFile(filename, data) {
  let dl = null;
  try { if (window.claude && window.claude.use) dl = await window.claude.use('downloads'); } catch (e) {}
  if (dl) {
    try { await dl.save({ filename, data }); toast('Saved ' + filename); }
    catch (e) { if (!e || e.code !== 'declined') toast('Could not save: ' + ((e && e.message) || 'saving is unavailable here')); }
    return;
  }
  try {
    const blob = data instanceof Blob ? data : new Blob([data]), a = h('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) { toast('Saving files is not available in this view.'); }
}
function exportJSON() { saveFile(slug() + '.json', JSON.stringify(snapshot(), null, 1)); }
function jsonDialog() {
  const ta = h('textarea', { id: 'jsonTa', spellcheck: 'false', 'aria-label': 'Effect JSON' }); ta.value = JSON.stringify(snapshot()); ta.addEventListener('keydown', e => e.stopPropagation());
  openModal(h('h2', { text: 'Effect as JSON' }), h('p', { class: 'note', text: 'Copy this to keep or share the effect. Paste another effect here and press Load to open it.' }), ta,
    h('div', { class: 'rowb' },
      h('button', { class: 'btn', text: 'Close', onclick: closeModal }),
      h('button', { class: 'btn', text: 'Load pasted JSON', onclick: () => { try { const p = JSON.parse(ta.value); if (!p || !Array.isArray(p.layers)) throw 0; loadProject(p); closeModal(); toast('Effect loaded'); } catch (e) { toast('That is not a valid effect. Paste the full JSON text.'); } } }),
      h('button', { class: 'btn pri', text: 'Copy', onclick: async () => { try { await navigator.clipboard.writeText(ta.value); toast('Copied'); } catch (e) { ta.select(); toast('Press Ctrl/Cmd+C to copy'); } } })));
}
function exportPNG() { eng.render(time); $('#gl').toBlob(b => b ? saveFile(slug() + '.png', b) : toast('Could not capture the frame.'), 'image/png'); }
function sheetDialog() {
  const fr = h('select', { id: 'shFrames' }, ...[16, 25, 36, 64].map(n => h('option', { value: n, text: n + ' frames', selected: n === 36 || null })));
  const cs = h('select', { id: 'shCell' }, ...[128, 256, 512].map(n => h('option', { value: n, text: n + ' px cells', selected: n === 256 || null })));
  fr.value = 36; cs.value = 256;
  openModal(h('h2', { text: 'Sprite sheet' }), h('p', { class: 'note', text: 'Bakes the whole timeline into a square flipbook from the current camera, on black, ready for additive blending in a game engine.' }),
    h('div', { class: 'ctl' }, fr, cs), h('div', { class: 'rowb' }, h('button', { class: 'btn', text: 'Cancel', onclick: closeModal }),
      h('button', { class: 'btn pri', text: 'Bake', onclick: () => { closeModal(); bakeSheet(+fr.value, +cs.value); } })));
}
function bakeSheet(n, cell) {
  const cols = Math.round(Math.sqrt(n)), c = h('canvas'); c.width = c.height = cols * cell; const ctx = c.getContext('2d');
  eng.resize(cell, cell, 1);
  for (let i = 0; i < n; i++) { eng.render(i / n * project.duration, { clean: true }); ctx.drawImage($('#gl'), (i % cols) * cell, Math.floor(i / cols) * cell, cell, cell); }
  onResize(); c.toBlob(b => b ? saveFile(`${slug()}-${cols}x${cols}.png`, b) : toast('Could not bake the sheet.'), 'image/png');
}
function recordVideo() {
  const cv = $('#gl');
  if (!window.MediaRecorder || !cv.captureStream) { toast('Video recording is not supported in this browser.'); return; }
  const mt = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t));
  if (!mt) { toast('Video recording is not supported in this browser.'); return; }
  try {
    const r = new MediaRecorder(cv.captureStream(60), { mimeType: mt, videoBitsPerSecond: 16e6 }), chunks = [];
    r.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    r.onstop = () => { eng.view.paths = rec.paths; speed = rec.speed; rec = null; $('#rec').style.display = 'none'; rebuildHandles(); saveFile(slug() + (mt.includes('mp4') ? '.mp4' : '.webm'), new Blob(chunks, { type: mt })); };
    rec = { r, paths: eng.view.paths, speed }; eng.view.paths = false; speed = 1; rebuildHandles();
    time = 0; playing = true; setPlayIcon(); $('#rec').style.display = 'flex'; r.start();
  } catch (e) { rec = null; toast('Recording failed: ' + e.message); }
}

/* ───────── frame loop ───────── */
let lastT = 0, fpsAcc = 0, fpsN = 0, fps = 60;
function setPlayIcon() { $('#play').innerHTML = playing ? PAUSE : PLAY; }
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(.1, (now - lastT) / 1000 || 0); lastT = now;
  const dur = project.duration;
  if (playing && !scrubbing) {
    time += dt * speed;
    if (time >= dur) {
      if (rec) { time = dur; playing = false; setPlayIcon(); eng.render(time); try { rec.r.stop(); } catch (e) {} }
      else if (project.loop !== false) time = time % dur; else { time = dur; playing = false; setPlayIcon(); }
    }
  }
  eng.syncVideos(time, playing && !scrubbing, speed);
  eng.render(time);
  updateHandles();
  const rt = $('#rtrack'); $('#playhead').style.transform = `translateX(${rt.offsetLeft + time / dur * rt.offsetWidth}px)`;
  $('#timeNow').textContent = time.toFixed(2);
  fpsAcc += dt; fpsN++; if (fpsAcc > .5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; $('#stats').textContent = `${fps.toFixed(0)} fps · ${eng.particleCount.toLocaleString()} particles · ${project.layers.length} layers`; }
}
function onResize() { const s = $('#stage'); eng.resize(s.clientWidth, s.clientHeight, Math.min(devicePixelRatio || 1, 2)); }

/* ───────── boot ───────── */
function start(data) {
  try { eng = new V.Engine($('#gl')); } catch (e) { eng = null; }
  if (!eng || !eng.ok) { $('#nogl').style.display = 'flex'; return; }
  try { Object.assign(mediaData, JSON.parse(localStorage.getItem('hanabi.media') || '{}')); } catch (e) {}
  const init = (data && data.project && Array.isArray(data.project.layers)) ? data.project : (loadLocal() || D.PRESETS[0].build());
  setProject(init, false); lastJSON = JSON.stringify(project); undoBtns();
  if (data && typeof data.time === 'number') time = data.time;
  onResize(); new ResizeObserver(onResize).observe($('#stage'));
  bindStage(); setTool('orbit'); setPlayIcon();

  $('#projName').addEventListener('change', e => { project.name = e.target.value || 'Untitled effect'; commit(); });
  $('#projName').addEventListener('keydown', e => e.stopPropagation());
  $('#undo').addEventListener('click', undo); $('#redo').addEventListener('click', redo);
  $('#play').addEventListener('click', () => { if (!playing && time >= project.duration) time = 0; playing = !playing; setPlayIcon(); });
  $('#rew').addEventListener('click', () => { time = 0; });
  $('#loopBtn').addEventListener('click', e => { project.loop = project.loop === false; e.currentTarget.classList.toggle('on', project.loop); commit(); });
  bindNum($('#durIn'), v => { project.duration = U.clamp(v, .2, 30); time = Math.min(time, project.duration); renderTimeline(); }, () => { $('#durIn').value = fmt(project.duration); commit(); renderInsp(); }, { step: .1, min: 0, max: 10, lo: .2, hi: 30 });
  $('#speedSel').addEventListener('change', e => { speed = +e.target.value; });
  $('#rtrack').addEventListener('pointerdown', scrubStart);
  $('#addBtn').addEventListener('click', e => showMenu(e.currentTarget, LAYER_TYPES.map(t => ({ label: D.TYPE_NAMES[t], fn: () => addLayer(t) }))));
  $('#exportBtn').addEventListener('click', e => showMenu(e.currentTarget, [
    { label: 'Save effect file (.json)', fn: exportJSON }, { label: 'Open effect file…', fn: () => $('#fileIn').click() }, { label: 'Copy / paste as JSON…', fn: jsonDialog }, '-',
    { label: 'Save this frame (.png)', fn: exportPNG }, { label: 'Bake sprite sheet (.png)…', fn: sheetDialog }, { label: 'Record one loop (video)', fn: recordVideo }]));
  $('#fileIn').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const p = JSON.parse(await f.text()); if (!Array.isArray(p.layers)) throw 0; loadProject(p); toast('Opened ' + f.name); } catch (err) { toast('That file is not a VFX.LAB effect (.json).'); } });
  $('#modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal') closeModal(); });
  $('#mediaIn').addEventListener('change', e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) importMedia(fs); });
  const stage = $('#stage');
  stage.addEventListener('dragover', e => { e.preventDefault(); stage.classList.add('drop'); });
  stage.addEventListener('dragleave', () => stage.classList.remove('drop'));
  stage.addEventListener('drop', async e => {
    e.preventDefault(); stage.classList.remove('drop'); const fs = [...(e.dataTransfer ? e.dataTransfer.files : [])]; if (!fs.length) return;
    const js = fs.find(f => /\.json$/i.test(f.name));
    if (js) { try { const p = JSON.parse(await js.text()); if (!Array.isArray(p.layers)) throw 0; loadProject(p); toast('Opened ' + js.name); } catch (err) { toast('That file is not a VFX.LAB effect (.json).'); } return; }
    importMedia(fs);
  });
  document.querySelectorAll('#toolSeg button').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
  document.querySelectorAll('#planeSeg button').forEach(b => b.addEventListener('click', () => { plane = b.dataset.plane; document.querySelectorAll('#planeSeg button').forEach(x => x.classList.toggle('on', x === b)); }));
  document.querySelectorAll('#viewSeg button').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.view; if (k === 'frame') { applyCam(project.cam); return; }
    eng.view[k] = !eng.view[k]; b.classList.toggle('on', eng.view[k]); if (k === 'paths') rebuildHandles();
    if (k === 'dummy') { project.figure = eng.view.dummy; commit(); }
  }));
  document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => { document.body.dataset.tab = b.dataset.tab; document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b)); if (b.dataset.tab === 'tl') renderTimeline(); if (b.dataset.tab === 'insp') renderInsp(); }));
  window.addEventListener('keydown', e => {
    const tg = e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); $('#play').click(); }
    else if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && k === 'y') { e.preventDefault(); redo(); }
    else if (mod && k === 'd') { e.preventDefault(); const l = selLayer(); if (l) dupLayer(l); }
    else if (k === 'v') setTool('orbit'); else if (k === 'd') setTool('draw');
    else if (k === 'escape') { closeModal(); closeMenu(); setTool('orbit'); }
    else if (k === 'delete' || k === 'backspace') { const l = selLayer(), p = selPath(); if (l) delLayer(l); else if (p && selPt >= 0 && p.points.length > 2) { p.points.splice(selPt, 1); selPt = -1; eng.syncPath(p); commit(); rebuildHandles(); renderInsp(); } }
  });
  try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ project: snapshot(), time })); } catch (e) {}
  window.__hanabi = { eng, load: i => loadProject(D.PRESETS[i].build()), seek: t => { time = t; playing = false; setPlayIcon(); }, look: n => applyLook(D.LOOKS.find(k => k.name === n)), importMedia, addMediaLayer, recolor, shuffleVariation, select, get project() { return project; } };
  requestAnimationFrame(tick);
}
const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();

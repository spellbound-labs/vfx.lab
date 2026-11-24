/* VFX.LAB — layer defaults, path templates, starter effects */
(function () {
'use strict';
const VFX = window.VFX = window.VFX || {};
const clone = o => JSON.parse(JSON.stringify(o));
const cv = (...a) => { const r = []; for (let i = 0; i < a.length; i += 2) r.push({ t: a[i], v: a[i + 1] }); return r; };
const gr = (...a) => { if (typeof a[0] === 'string') return a.map((c, i) => ({ t: a.length > 1 ? i / (a.length - 1) : 0, c })); const r = []; for (let i = 0; i < a.length; i += 2) r.push({ t: a[i], c: a[i + 1] }); return r; };

const CURVES = {
  flat: cv(0, 1, 1, 1), up: cv(0, 0, 1, 1), down: cv(0, 1, 1, 0), bell: cv(0, 0, .3, 1, 1, 0),
  pop: cv(0, 0, .12, 1, 1, .85), fade: cv(0, 1, .55, 1, 1, 0), inOut: cv(0, 0, .15, 1, .8, 1, 1, 0), grow: cv(0, .15, .35, .8, 1, 1)
};
const BASE = {
  visible: true, start: 0, dur: 1, pos: [0, 0, 0], pathId: null, pathFrom: 0, pathTo: 1, pathEase: 'linear',
  additive: 1, intensity: 1.6, alpha: 1, grad: gr('#ffffff', '#59e0ff', '#2a5bff'),
  alphaCurve: CURVES.flat, sizeCurve: CURVES.flat, visCurve: CURVES.flat
};
const SURF = {
  noise: 'clouds', tile: [2, 1], scroll: [1, 0], contrast: 1.4, distort: 0, tile2: [1, 1], scroll2: [.4, 0], skew: 0,
  cut: .1, fill: .3, soft: .03, edgeBoost: 0, edgeW: .1, core: 0, coreThr: .7, bands: 0, gradMap: 'life',
  mediaId: null, texColor: true, texLuma: true
};
const DEFAULTS = {
  particles: Object.assign({}, BASE, {
    count: 240, emit: 'stream', burstSpread: 0, loop: false, life: [.6, 1.2], seed: 1,
    emitMode: 'follow', alignPath: false, motion: 'free', pathTravel: .3,
    shape: 'point', radius: .3, thickness: 1, shapeScale: [1, 1, 1], rot: [0, 0, 0],
    speed: [1, 2.2], dir: [0, 1, 0], spread: 25, radial: [0, 0],
    gravity: 0, drag: 0, orbit: 0, converge: 0, turbAmp: 0, turbFreq: 1, turbSpeed: .6,
    size: [.06, .14], stretch: 0, rotRand: 1, spin: 0,
    sprite: 'glow', soft: .15, halo: 0, core: 0, dissolve: 0, shade: 0, hueVar: 0, flicker: 0,
    mediaId: null, flipCols: 1, flipRows: 1, flipFps: 0, texColor: true, texLuma: false,
    alphaCurve: cv(0, 1, .7, 1, 1, 0), sizeCurve: cv(0, .2, .2, 1, 1, .3), intensity: 2.4
  }),
  ribbon: Object.assign({}, BASE, SURF, {
    mode: 'travel', travel: .6, tailDelay: .3, len: 4, width: .45, face: 'camera',
    strands: 1, strandVar: 0, helixR: 0, helixTurns: 3, helixSpin: 0, jitAmp: 0, jitFreq: 7, jitRate: 18, pin: 0,
    anchor: false, edgePow: 2, bias: 0, tailErode: .5, pathEase: 'inOut',
    noise: 'flames', tile: [2, 1], scroll: [2, 0], cut: .2, fill: .3, core: .6, edgeBoost: .8, gradMap: 'noise',
    grad: gr('#2a2bd6', '#3d8bff', '#9ff3ff', '#ffffff'), sizeCurve: cv(0, .9, .15, 1, 1, 0), intensity: 2.2
  }),
  mesh: Object.assign({}, BASE, SURF, {
    prim: 'ring', inner: .78, taper: 1, spikes: 28, seed: 1, size: [2.4, 1, 2.4], rot: [0, 0, 0], spin: 0, facing: 'none', alignPath: false,
    twist: 0, wobble: 0, wobTile: 3, wobSpeed: 1, fadeV0: .12, fadeV1: .3, fresnel: 0, fresPow: 2,
    dur: .7, tile: [8, 1], scroll: [0, .6], cut: .2, fill: .4, core: .4, edgeBoost: 1, gradMap: 'noise',
    grad: gr('#3b2bd6', '#59b6ff', '#d9fbff'), sizeCurve: cv(0, .1, .25, .75, 1, 1), visCurve: cv(0, 1, .3, 1, 1, 0), intensity: 2.4
  }),
  screen: { visible: true, start: 0, dur: .25, flashColor: '#cfe9ff', flashAmt: .35, shakeAmp: .08, shakeFreq: 9, visCurve: cv(0, 1, 1, 0) },
  occluder: { visible: true, start: 0, dur: 1, always: true, shape: 'capsule', size: [.8, 1.8, .8], pos: [0, 0, 0], rot: [0, 0, 0], spin: 0,
    pathId: null, pathFrom: 0, pathTo: 1, pathEase: 'linear', alignPath: false, sizeCurve: CURVES.flat, ghost: true },
  media: { visible: true, start: 0, dur: 1, mediaId: null, place: 'backdrop', fit: 'cover', zoom: 1, shift: [0, 0], opacity: 1, bright: 1,
    key: 'none', keyColor: '#00ff00', keyThr: .4, keySoft: .08, keyInv: false, offset: 0, rate: 1, loopVideo: true,
    pos: [0, 1.5, 0], rot: [0, 0, 0], spin: 0, scale: 2.5, facing: 'none', depth: true, additive: 0,
    pathId: null, pathFrom: 0, pathTo: 1, pathEase: 'linear', alignPath: false, sizeCurve: CURVES.flat, visCurve: CURVES.flat },
  manga: { visible: true, start: 0, dur: 1, mode: 'focus', color: '#ffffff', color2: '#f3efe6', opacity: 1, visCurve: CURVES.flat,
    density: 150, thick: .5, inner: .5, innerVar: .35, skip: .25, rate: 12, scroll: 2, angle: 0, dotSize: 1, grad: [.2, .9], thr: .35, invert: true, seed: 1,
    anchor: 'screen', shift: [0, 0], pos: [0, 1.2, 0], pathId: null, pathFrom: 0, pathTo: 1, pathEase: 'linear' },
  text: { visible: true, start: 0, dur: 1.2, text: 'ドン!', font: 'Dela Gothic One', fill: '#ffffff', stroke: '#0c0b12', strokeW: .09, vertical: false, skew: 8, spacing: 0, chaos: .3, seed: 1,
    pos: [0, 2, 0], rot: [0, 0, 0], spin: 0, scale: .9, facing: 'camera', opacity: 1, bright: 1.2, additive: 0, shake: .05, shakeRate: 12,
    sizeCurve: cv(0, 0, .1, 1.2, .22, 1, 1, 1), visCurve: cv(0, 1, .8, 1, 1, 0), pathId: null, pathFrom: 0, pathTo: 1, pathEase: 'linear', alignPath: false }
};
const TYPE_NAMES = { particles: 'Particles', ribbon: 'Ribbon', mesh: 'Shader mesh', screen: 'Screen', occluder: 'Occluder', media: 'Media', manga: 'Manga overlay', text: 'SFX text' };
const FONTS = ['Dela Gothic One', 'Bangers', 'Rampart One', 'Potta One', 'RocknRoll One', 'Reggae One'];
const SFX = ['ドン!', 'ゴゴゴ', 'バァン!', 'ドカーン', 'シュッ', 'ザッ', '斬', 'ドキッ', 'BAM!', 'POW!', 'WHAM!', '!?'];

/* ───────── looks: whole-frame styles ───────── */
const LOOK_DEFAULT = { name: 'Anime glow', pixel: 1, poster: 0, outline: 0, outlineCol: '#0a0a14', halftone: 0, hue: 0, sat: 1, contrast: 1,
  tintAmt: 0, tintA: '#000000', tintB: '#ffffff', chroma: 0, scan: 0, grain: 0, vignette: .5, gradeAll: false };
const LK = (name, sw, o, bloom) => ({ name, sw, look: Object.assign({}, LOOK_DEFAULT, o, { name }), bloom: bloom || [1.15, .85, .7] });
const LOOKS = [
  LK('Anime glow', ['#1a1d3a', '#ff4d7e'], {}),
  LK('Cel shade', ['#10121c', '#ffd166'], { poster: 5, outline: .85, sat: 1.2, contrast: 1.1 }, [.5, .7, .9]),
  LK('Ink & paper', ['#efe6d2', '#15131c'], { poster: 3, tintAmt: 1, tintA: '#efe6d2', tintB: '#15131c', outline: 1, outlineCol: '#15131c', contrast: 1.4, grain: .15, vignette: .25 }, [0, .8, .7]),
  LK('Ink negative', ['#0c0b10', '#f3efe6'], { poster: 3, tintAmt: 1, tintA: '#0c0b10', tintB: '#f3efe6', outline: .6, outlineCol: '#f3efe6', contrast: 1.4, grain: .12, vignette: .4 }, [.25, .8, .7]),
  LK('Manga tone', ['#f3efe6', '#3a3a44'], { tintAmt: 1, tintA: '#f3efe6', tintB: '#1b1a22', halftone: 1, contrast: 1.1, vignette: .2 }, [.8, 1, .6]),
  LK('Pixel art', ['#1b2440', '#7fe3a0'], { pixel: 5, poster: 6, sat: 1.25, vignette: .2 }, [.5, .6, .8]),
  LK('Game Boy', ['#0f380f', '#9bbc0f'], { pixel: 6, poster: 3, tintAmt: 1, tintA: '#0f380f', tintB: '#9bbc0f', vignette: 0 }, [0, .6, .8]),
  LK('Neon night', ['#12062e', '#ff3df0'], { sat: 1.55, contrast: 1.15, chroma: .7, scan: .12 }, [1.45, 1, .62]),
  LK('Pastel dream', ['#f6d9ec', '#b7e3ff'], { sat: .7, contrast: .88, tintAmt: .14, tintA: '#3a2a55', tintB: '#fff1f6', vignette: .2 }, [1.05, 1.15, .62]),
  LK('Comic pop', ['#ffe14d', '#ff3b3b'], { halftone: .85, poster: 5, outline: .8, sat: 1.45 }, [.45, .9, .8]),
  LK('Noir', ['#0a0a0a', '#e8e8e8'], { sat: 0, contrast: 1.35, grain: .35, vignette: .9 }, [.9, .85, .7]),
  LK('VHS tape', ['#2a1840', '#49e0d0'], { chroma: 1, scan: .45, grain: .4, sat: .85, contrast: .95 }, [1.3, .9, .65]),
  LK('Hologram', ['#03121c', '#7ff3ff'], { tintAmt: .9, tintA: '#03121c', tintB: '#7ff3ff', scan: .5, chroma: .3 }, [1.4, .9, .6]),
  LK('Ember gold', ['#120603', '#ffd27a'], { tintAmt: .85, tintA: '#120603', tintB: '#ffd27a', contrast: 1.1 }),
  LK('Frost', ['#061224', '#d9f4ff'], { tintAmt: .65, tintA: '#061224', tintB: '#d9f4ff', sat: .8 }, [1.3, 1, .65]),
  LK('Blueprint', ['#0b2a6b', '#e8f1ff'], { tintAmt: 1, tintA: '#0b2a6b', tintB: '#e8f1ff', outline: 1, outlineCol: '#ffffff', vignette: .3 }, [.2, .7, .9])
];
/* palettes: rotate every gradient so the effect's dominant hue lands on the target */
const PALETTES = [
  { name: 'Blood', hue: 355, sat: 1.05 }, { name: 'Ember', hue: 18, sat: 1.05 }, { name: 'Gold', hue: 44, sat: 1 }, { name: 'Toxic', hue: 95, sat: 1.05 },
  { name: 'Jade', hue: 150, sat: 1 }, { name: 'Frost', hue: 192, sat: .9 }, { name: 'Azure', hue: 220, sat: 1 }, { name: 'Arcane', hue: 268, sat: 1 },
  { name: 'Rose', hue: 325, sat: 1 }, { name: 'Ash', hue: 220, sat: .12 }
];
/* quick surface styles for ribbons and shader meshes */
const STYLES = {
  'Toon fire': { noise: 'clouds', contrast: 1.15, distort: .7, cut: .3, fill: 0, soft: .025, bands: 5, edgeBoost: .4, core: 0, gradMap: 'noise', additive: .35, intensity: 1.35, grad: gr(0, '#7a0c05', .3, '#e8320c', .58, '#ff8a1f', .82, '#ffd34d', 1, '#fffbe0') },
  Plasma: { noise: 'flames', contrast: 1.4, distort: .5, cut: .2, fill: .15, soft: .04, bands: 0, edgeBoost: 1, core: .7, coreThr: .72, gradMap: 'noise', additive: 1, intensity: 2.2, grad: gr(0, '#2a12c9', .35, '#8a2bff', .7, '#ff4fd8', 1, '#fff1fb') },
  Electric: { noise: 'flames', contrast: 2.4, distort: .2, cut: .42, fill: 0, soft: .02, bands: 0, edgeBoost: 1.2, core: .9, coreThr: .5, gradMap: 'noise', additive: 1, intensity: 3, grad: gr('#2a3fd6', '#6fb7ff', '#ffffff') },
  Smoke: { noise: 'clouds', contrast: 1.2, distort: .6, cut: .26, fill: .1, soft: .1, bands: 3, edgeBoost: 0, core: 0, gradMap: 'noise', additive: 0, intensity: 1, grad: gr('#17151c', '#3a3540', '#8a8490') },
  Water: { noise: 'waves', contrast: 1.6, distort: .3, cut: .3, fill: .1, soft: .03, bands: 4, edgeBoost: .6, core: .5, coreThr: .8, gradMap: 'noise', additive: .5, intensity: 1.6, grad: gr('#0b3a8a', '#1fa3d8', '#9ff3ff', '#ffffff') },
  'Speed lines': { noise: 'streaks', contrast: 2, distort: 0, cut: .38, fill: 0, soft: .01, bands: 0, edgeBoost: 0, core: .8, coreThr: .5, gradMap: 'noise', additive: 1, intensity: 2.4, grad: gr('#59b6ff', '#ffffff') },
  Crystal: { noise: 'cells', contrast: 1.4, distort: 0, cut: .2, fill: .2, soft: .01, bands: 4, edgeBoost: 1.2, core: .3, coreThr: .85, gradMap: 'noise', additive: .7, intensity: 2, grad: gr('#1b2a8a', '#59b6ff', '#d9fbff') },
  Halftone: { noise: 'dots', contrast: 1.2, distort: 0, cut: .3, fill: 0, soft: .02, bands: 0, edgeBoost: 0, core: 0, gradMap: 'life', additive: 1, intensity: 2.2 },
  'Solid paint': { noise: 'none', cut: .08, fill: 1, soft: .004, bands: 3, edgeBoost: 0, core: 0, gradMap: 'v', additive: 0, intensity: 1.1 },
  'Hot glow': { noise: 'none', cut: 0, fill: 1, soft: .3, bands: 0, edgeBoost: 0, core: .9, coreThr: .45, gradMap: 'life', additive: 1, intensity: 3 }
};
let uid = 1;
const newId = p => p + (uid++).toString(36) + Math.floor(Math.random() * 1e4).toString(36);
function makeLayer(type, o) { const l = Object.assign(clone(DEFAULTS[type]), clone(o || {})); l.type = type; l.id = l.id || newId('L'); l.name = l.name || TYPE_NAMES[type]; return l; }
function upgradeLayer(l) { const d = DEFAULTS[l.type]; if (!d) return l; for (const k in d) if (l[k] === undefined) l[k] = clone(d[k]); return l; }
const PATH_COLORS = ['#59e0ff', '#ffd166', '#ff7ab6', '#9dff8a', '#c59bff', '#ff9f5a'];
function makePath(name, points, o) { return Object.assign({ id: newId('P'), name, points: points.map(p => p.map(v => Math.round(v * 1000) / 1000)), closed: false, color: PATH_COLORS[(uid) % PATH_COLORS.length] }, o || {}); }

const D2R = Math.PI / 180;
const TEMPLATES = {
  Line: () => makePath('Line', [[-2.5, 1, 0], [2.5, 1, 0]]),
  Arc: () => makePath('Arc', [-105, -70, -35, 0, 35, 70, 105].map(a => [Math.sin(a * D2R) * 1.9, 1.2, Math.cos(a * D2R) * 1.9 - .4])),
  Circle: () => makePath('Circle', [0, 60, 120, 180, 240, 300].map(a => [Math.cos(a * D2R) * 1.4, .05, Math.sin(a * D2R) * 1.4]), { closed: true }),
  Hoop: () => makePath('Hoop', [0, 60, 120, 180, 240, 300].map(a => [Math.cos(a * D2R) * 1.4, 1.6 + Math.sin(a * D2R) * 1.4, 0]), { closed: true }),
  Helix: () => makePath('Helix', Array.from({ length: 13 }, (_, i) => [Math.cos(i * 60 * D2R) * 1.1, i * .24, Math.sin(i * 60 * D2R) * 1.1])),
  Rise: () => makePath('Rise', [[0, 0, 0], [0, 3, 0]]),
  Wave: () => makePath('Wave', [[-3.2, .6, .6], [-1.7, 1.9, -.5], [0, 1.1, .7], [1.6, 2, -.4], [3.2, .9, 0]])
};
function baseProject(name, duration, cam) {
  return { v: 2, name, duration, loop: true, bg: '#0b0c13', exposure: 1, bloom: { strength: 1.15, radius: .85, threshold: .7 }, look: clone(LOOK_DEFAULT), media: [], figure: false,
    cam: Object.assign({ theta: .45, phi: 1.22, dist: 9, target: [0, 1.3, 0] }, cam || {}), paths: [], layers: [] };
}
const L = makeLayer;
const setLook = (p, name) => { const k = LOOKS.find(x => x.name === name); p.look = clone(k.look); p.bloom = { strength: k.bloom[0], radius: k.bloom[1], threshold: k.bloom[2] }; };
const floorMask = () => L('occluder', { name: 'Floor mask', shape: 'floor', size: [16, 1, 16], pos: [0, -.02, 0], ghost: false, always: true });

/* ───────── starter effects ───────── */
const PRESETS = [
  {
    name: 'Arcane Comet', swatch: ['#3a1cff', '#ff4fd8', '#fff1fb'], build() {
      const p = baseProject('Arcane Comet', 2.4, { theta: .3, phi: 1.2, dist: 9.5, target: [0, 1.3, 0] });
      const fl = makePath('Flight', [[-3.4, .5, .8], [-1.8, 1.9, -.6], [0, 1.1, .9], [1.6, 2, -.4], [3.2, .9, 0]], { color: '#ff7ab6' });
      p.paths.push(fl);
      const pink = gr(0, '#2a12c9', .35, '#8a2bff', .7, '#ff4fd8', 1, '#fff1fb');
      const hit = { pathId: fl.id, pathFrom: 1, pathTo: 1, start: 1.2 };
      p.layers.push(
        L('ribbon', { name: 'Tail', pathId: fl.id, start: 0, dur: 1.5, travel: .8, tailDelay: .2, pathEase: 'inOut', width: .62, tile: [2.2, 1], scroll: [3, 0], distort: .35, tile2: [1.5, 1], scroll2: [1.2, .3], cut: .24, fill: .2, soft: .03, edgeBoost: .8, core: .7, coreThr: .72, grad: pink, sizeCurve: cv(0, .55, .08, 1, 1, 0), tailErode: .7, edgePow: 1.6, intensity: 2.3 }),
        L('ribbon', { name: 'Helix threads', pathId: fl.id, start: 0, dur: 1.5, travel: .8, tailDelay: .16, pathEase: 'inOut', width: .06, strands: 2, helixR: .24, helixTurns: 6, helixSpin: 7, noise: 'none', fill: 1, core: .9, coreThr: .4, gradMap: 'life', grad: gr('#ffffff', '#7fe9ff', '#5a6bff'), sizeCurve: cv(0, 0, .12, 1, 1, 0), tailErode: .2, intensity: 3.2 }),
        L('mesh', { name: 'Core', prim: 'sphere', pathId: fl.id, start: 0, dur: 1.2, pathEase: 'inOut', size: [.3, .3, .3], sizeCurve: cv(0, 0, .08, 1, .92, 1, 1, 1.4), visCurve: cv(0, 1, .9, 1, 1, 0), noise: 'clouds', tile: [3, 2], scroll: [1.5, 0], cut: 0, fill: .8, fresnel: -.5, fresPow: 1.5, core: 1, coreThr: .5, wobble: .12, wobTile: 3, wobSpeed: 3, gradMap: 'noise', grad: gr('#ff4fd8', '#ffd0f4', '#ffffff'), fadeV0: 0, fadeV1: 0, intensity: 4 }),
        L('particles', { name: 'Stardust', pathId: fl.id, start: 0, dur: 1.2, pathEase: 'inOut', count: 320, life: [.45, 1], speed: [0, 0], radial: [.15, .9], drag: 2.2, turbAmp: .18, turbFreq: 1.4, size: [.05, .15], sprite: 'star', soft: .04, halo: .5, spin: 2.5, grad: gr('#ffffff', '#ff8be6', '#7a3bff'), sizeCurve: cv(0, 0, .15, 1, 1, 0), intensity: 3.2 }),
        L('particles', { name: 'Smoke puffs', pathId: fl.id, start: .05, dur: 1.15, pathEase: 'inOut', count: 46, life: [.5, .9], speed: [0, 0], radial: [.05, .3], size: [.16, .34], sprite: 'smoke', soft: .02, dissolve: .9, shade: .4, additive: .35, grad: gr('#ff9bea', '#8a3bff', '#2a1670'), alphaCurve: cv(0, .9, .6, .7, 1, 0), sizeCurve: cv(0, .3, .3, 1, 1, 1), intensity: 1.2 }),
        L('screen', Object.assign({ name: 'Impact flash', flashColor: '#ffc4f1', flashAmt: .14, shakeAmp: .09, shakeFreq: 9, dur: .3 }, { start: 1.2 })),
        L('mesh', Object.assign({ name: 'Impact ring', prim: 'ring', inner: .72, facing: 'camera', size: [2.3, 1, 2.3], dur: .55, tile: [10, 1], scroll: [0, 1.2], cut: .22, fill: .4, soft: .03, core: .6, coreThr: .7, edgeBoost: 1, grad: pink, sizeCurve: cv(0, .05, .3, .8, 1, 1), visCurve: cv(0, 1, .25, .9, 1, 0), fadeV0: .5, fadeV1: .15, intensity: 3 }, hit)),
        L('mesh', Object.assign({ name: 'Impact spikes', prim: 'spikes', inner: .12, spikes: 34, size: [2.1, 2.1, 2.1], dur: .32, noise: 'none', fill: 1, core: .8, coreThr: .2, gradMap: 'v', grad: gr('#ffffff', '#ff7fe3', '#8a2bff'), sizeCurve: cv(0, .1, .3, 1, 1, 1.15), visCurve: cv(0, 1, .35, 1, 1, 0), fadeV0: 0, fadeV1: .6, intensity: 3.6 }, hit)),
        L('particles', Object.assign({ name: 'Impact sparks', emit: 'burst', count: 130, life: [.35, .85], speed: [0, 0], radial: [2.5, 7.5], drag: 3.6, gravity: 2.5, size: [.035, .09], stretch: .05, sprite: 'streak', soft: .05, core: .6, grad: gr('#ffffff', '#ff8be6', '#6a2bff'), sizeCurve: CURVES.down, intensity: 4, dur: .1 }, hit)),
        L('particles', Object.assign({ name: 'Afterglow', emit: 'burst', count: 28, life: [.5, 1.1], speed: [0, 0], radial: [.3, 1.4], drag: 2, size: [.08, .2], sprite: 'star', soft: .04, halo: .6, spin: 2, flicker: .4, grad: gr('#ffffff', '#ffb1ef', '#8a2bff'), sizeCurve: CURVES.bell, intensity: 3, dur: .1 }, hit, { start: 1.25 }))
      );
      return p;
    }
  },
  {
    name: 'Crescent Slash', swatch: ['#1a2bd6', '#3fb6ff', '#ffffff'], build() {
      const p = baseProject('Crescent Slash', 1.5, { theta: .2, phi: .86, dist: 8, target: [0, 1.1, 0] });
      const arc = makePath('Swing', [-105, -70, -35, 0, 35, 70, 105].map(a => [Math.sin(a * D2R) * 1.95, 1.15 + Math.sin(a * D2R) * .5, Math.cos(a * D2R) * 1.95 - .4]), { color: '#59e0ff' });
      p.paths.push(arc);
      const blue = gr(0, '#1522b8', .4, '#2f7dff', .78, '#8ff3ff', 1, '#ffffff');
      const sw = { pathId: arc.id, start: .12, pathEase: 'cubicOut' };
      p.layers.push(
        L('ribbon', Object.assign({ name: 'Blade', dur: .8, travel: .3, tailDelay: .52, width: 1.15, face: 'flat', noise: 'clouds', tile: [1.4, 2.4], scroll: [2.2, 0], contrast: 1.7, distort: .3, tile2: [1, 2], scroll2: [.8, 0], cut: .14, fill: .62, soft: .02, edgeBoost: 1, edgeW: .1, core: .85, coreThr: .72, grad: blue, sizeCurve: cv(0, 0, .3, 1, 1, 0), visCurve: cv(0, 1, .38, 1, 1, 0), tailErode: .5, bias: .55, edgePow: 1.5, intensity: 2.2, additive: .9 }, sw)),
        L('ribbon', Object.assign({ name: 'Edge line', dur: .62, travel: .38, tailDelay: .34, width: .13, face: 'flat', noise: 'none', fill: 1, core: 1, coreThr: .3, gradMap: 'life', grad: gr('#ffffff', '#9ff3ff'), sizeCurve: cv(0, 0, .25, 1, 1, 0), visCurve: CURVES.fade, tailErode: 0, intensity: 4.2 }, sw)),
        L('particles', Object.assign({ name: 'Sparks', dur: .26, count: 240, alignPath: true, life: [.25, .65], dir: [0, 1, 0], speed: [2, 7], spread: 38, radial: [0, .6], drag: 3.2, gravity: 1.5, size: [.03, .075], stretch: .05, sprite: 'streak', soft: .05, core: .7, grad: gr('#ffffff', '#7fe9ff', '#2f5bff'), sizeCurve: CURVES.down, intensity: 4 }, sw)),
        L('particles', { name: 'Glints', pathId: arc.id, emitMode: 'along', emit: 'burst', burstSpread: .15, start: .22, dur: .2, count: 30, life: [.3, .75], speed: [0, 0], radial: [.2, .9], drag: 2, size: [.08, .22], sprite: 'star', soft: .03, halo: .5, spin: 3, flicker: .3, grad: gr('#ffffff', '#9ff3ff', '#3f6bff'), sizeCurve: CURVES.bell, intensity: 3.4 }),
        L('particles', { name: 'Mist shards', pathId: arc.id, emitMode: 'along', emit: 'burst', burstSpread: .1, start: .3, dur: .2, count: 40, life: [.4, .9], speed: [.2, .8], dir: [0, 1, 0], spread: 60, radial: [.1, .5], drag: 1.5, size: [.05, .13], sprite: 'shard', soft: .02, spin: 4, grad: gr('#bff6ff', '#3f8bff', '#1a2bd6'), sizeCurve: CURVES.down, intensity: 2.4 }),
        L('screen', { name: 'Hit flash', start: .12, dur: .22, flashColor: '#bfe8ff', flashAmt: .1, shakeAmp: .07, shakeFreq: 10 })
      );
      return p;
    }
  },
  {
    name: 'Flame Pillar', swatch: ['#b3160a', '#ff8a1f', '#fff3b0'], build() {
      const p = baseProject('Flame Pillar', 3, { theta: .4, phi: 1.28, dist: 10.5, target: [0, 1.9, 0] });
      const fire = gr(0, '#7a0c05', .3, '#e8320c', .58, '#ff8a1f', .82, '#ffd34d', 1, '#fffbe0');
      const life = cv(0, 0, .12, 1, .82, 1, 1, 0);
      p.layers.push(
        L('mesh', { name: 'Ground seal', prim: 'disc', start: 0, dur: 3, pos: [0, .03, 0], size: [2.3, 1, 2.3], noise: 'sigil', tile: [6, 1], scroll: [.12, 0], fill: 0, soft: .08, core: .3, coreThr: .8, gradMap: 'life', grad: gr('#ff8a1f', '#ffb14d'), sizeCurve: cv(0, .6, .1, 1, 1, 1), visCurve: life, fadeV0: 0, fadeV1: 0, intensity: 2.2 }),
        L('mesh', { name: 'Outer flames', prim: 'cylinder', taper: 1.7, start: 0, dur: 3, size: [.8, 4.6, .8], noise: 'clouds', tile: [6, .8], scroll: [.35, 1.7], contrast: 1.15, distort: .7, tile2: [3, 1.2], scroll2: [-.2, 1.1], skew: .9, twist: 1.3, wobble: .14, wobTile: 3, wobSpeed: 1.5, cut: .3, fill: 0, soft: .025, edgeBoost: .4, bands: 5, grad: fire, sizeCurve: cv(0, .3, .15, 1, 1, 1), visCurve: life, fadeV0: .04, fadeV1: .95, intensity: 1.35, additive: .35 }),
        L('mesh', { name: 'Inner core', prim: 'cylinder', taper: 1.5, start: .05, dur: 2.9, size: [.42, 3.6, .42], noise: 'clouds', tile: [4, .8], scroll: [-.5, 2.6], contrast: 1.2, distort: .5, tile2: [2, 1], scroll2: [.3, 1.5], skew: -.8, twist: -1, cut: .34, fill: 0, soft: .03, core: .3, coreThr: .8, bands: 4, grad: gr('#ff5a14', '#ffb02e', '#fff1b8'), sizeCurve: cv(0, .3, .15, 1, 1, 1), visCurve: life, fadeV0: .04, fadeV1: .95, intensity: 1.3, additive: .45 }),
        L('particles', { name: 'Embers', start: 0, dur: 3, loop: true, count: 260, life: [.9, 1.8], shape: 'ring', radius: .75, thickness: .6, dir: [0, 1, 0], speed: [1.6, 3.6], spread: 12, orbit: 2.6, turbAmp: .25, turbFreq: 1.2, size: [.03, .085], sprite: 'diamond', soft: .04, halo: .4, spin: 3, flicker: .25, grad: gr('#fffbe0', '#ffb02e', '#e8320c'), sizeCurve: cv(0, .3, .2, 1, 1, 0), intensity: 3.4 }),
        L('particles', { name: 'Flame licks', start: 0, dur: 3, loop: true, count: 70, life: [.5, 1], shape: 'ring', radius: .55, dir: [0, 1, 0], speed: [1.5, 3], spread: 8, orbit: 3.4, size: [.18, .36], sprite: 'flame', soft: .03, dissolve: .8, rotRand: 0, grad: gr('#fff3b0', '#ff8a1f', '#b3160a'), sizeCurve: cv(0, .4, .25, 1, 1, .3), intensity: 1.5, additive: .6 }),
        L('particles', { name: 'Toon smoke', start: .2, dur: 2.6, count: 34, pos: [0, 2.6, 0], life: [1, 1.7], shape: 'ring', radius: .9, dir: [0, 1, 0], speed: [.6, 1.3], spread: 30, orbit: 1.2, size: [.4, .75], sprite: 'smoke', soft: .02, dissolve: .9, shade: .45, additive: 0, alpha: .7, grad: gr('#3d2620', '#261b20', '#15131a'), alphaCurve: cv(0, 0, .2, 1, .7, .8, 1, 0), sizeCurve: cv(0, .3, .4, .9, 1, 1), intensity: 1 }),
        L('mesh', { name: 'Heat ring', prim: 'ring', inner: .82, start: 0, dur: .7, pos: [0, .06, 0], size: [3.6, 1, 3.6], tile: [12, 1], scroll: [0, 1], cut: .22, fill: .4, core: .5, edgeBoost: 1, grad: fire, intensity: 2.2 })
      );
      return p;
    }
  },
  {
    name: 'Thunder Strike', swatch: ['#1a2a8a', '#6fb7ff', '#ffffff'], build() {
      const p = baseProject('Thunder Strike', 1.9, { theta: .5, phi: 1.3, dist: 11.5, target: [0, 2.4, 0] });
      const bolt = makePath('Bolt', [[.9, 6.6, .2], [.2, 4.7, -.3], [-.5, 3.1, .3], [.3, 1.5, 0], [0, 0, 0]], { color: '#ffd166' });
      p.paths.push(bolt);
      const elec = gr('#ffffff', '#a8d8ff', '#3f6bff');
      const hit = { pathId: bolt.id, pathFrom: 1, pathTo: 1, start: .3 };
      p.layers.push(
        L('ribbon', { name: 'Leader', pathId: bolt.id, start: .04, dur: .26, mode: 'travel', travel: 1, tailDelay: .35, pathEase: 'in', width: .05, jitAmp: .12, jitFreq: 12, jitRate: 30, noise: 'none', fill: 1, core: 1, coreThr: .3, gradMap: 'life', grad: elec, sizeCurve: cv(0, 1, 1, .3), intensity: 3.5 }),
        L('ribbon', { name: 'Main bolt', pathId: bolt.id, start: .3, dur: .42, mode: 'full', width: .26, jitAmp: .26, jitFreq: 11, jitRate: 24, pin: .6, noise: 'none', fill: 1, soft: .05, core: 1, coreThr: .35, edgeBoost: 1, gradMap: 'life', grad: gr('#bfe2ff', '#6f9bff'), sizeCurve: cv(0, .7, .5, 1, 1, .8), visCurve: cv(0, 1, .25, .55, .4, 1, 1, 0), edgePow: 1.4, intensity: 5 }),
        L('ribbon', { name: 'Branches', pathId: bolt.id, start: .3, dur: .36, mode: 'full', width: .07, strands: 5, strandVar: .6, jitAmp: .55, jitFreq: 8, jitRate: 20, pin: 1, noise: 'none', fill: 1, core: .8, coreThr: .4, gradMap: 'life', grad: elec, visCurve: cv(0, 1, .5, .8, 1, 0), intensity: 3 }),
        L('screen', { name: 'Flash', start: .3, dur: .3, flashColor: '#cfe4ff', flashAmt: .3, shakeAmp: .16, shakeFreq: 9 }),
        L('mesh', Object.assign({ name: 'Shockwave', prim: 'ring', inner: .8, pos: [0, .05, 0], size: [4.2, 1, 4.2], dur: .6, tile: [14, 1], scroll: [0, 1.4], cut: .25, fill: .35, core: .6, edgeBoost: 1, grad: gr('#1a2a8a', '#6fb7ff', '#ffffff'), sizeCurve: cv(0, .05, .25, .7, 1, 1), visCurve: cv(0, 1, .3, .9, 1, 0), intensity: 3 }, hit)),
        L('mesh', Object.assign({ name: 'Ground flash', prim: 'dome', size: [1.5, 1.2, 1.5], dur: .32, noise: 'flames', tile: [6, 1.5], scroll: [0, 2.4], cut: .25, fill: .2, fresnel: -.3, core: .7, coreThr: .7, grad: gr('#2a3fd6', '#6fb7ff', '#ffffff'), sizeCurve: cv(0, .2, .25, 1, 1, 1.2), visCurve: cv(0, 1, .3, 1, 1, 0), fadeV0: .05, fadeV1: .5, intensity: 2.2 }, hit)),
        L('mesh', Object.assign({ name: 'Scorch seal', prim: 'disc', pos: [0, .03, 0], size: [1.9, 1, 1.9], dur: 1.4, noise: 'flames', tile: [14, .8], scroll: [.15, .5], contrast: 2.4, cut: .35, fill: 0, soft: .03, gradMap: 'noise', grad: gr('#16206e', '#4f8bff', '#d9ecff'), sizeCurve: cv(0, .5, .1, 1, 1, 1), visCurve: cv(0, 1, .2, .75, 1, 0), fadeV0: .1, fadeV1: .6, intensity: 2.2 }, hit)),
        L('particles', Object.assign({ name: 'Ground sparks', emit: 'burst', count: 170, dur: .1, life: [.35, .95], dir: [0, 1, 0], speed: [1, 5], spread: 65, radial: [2, 6], gravity: 9, drag: 1.6, size: [.03, .08], stretch: .045, sprite: 'streak', core: .7, grad: elec, sizeCurve: CURVES.down, intensity: 4.2 }, hit)),
        L('particles', Object.assign({ name: 'Static', emit: 'stream', count: 60, dur: .9, life: [.12, .3], shape: 'sphere', radius: 1.3, shapeScale: [1, .5, 1], speed: [0, 0], size: [.08, .24], sprite: 'cross', soft: .02, spin: 0, flicker: .6, grad: elec, sizeCurve: cv(0, 1, .5, .4, 1, 0), intensity: 3 }, hit, { pos: [0, .5, 0], start: .34 }))
      );
      return p;
    }
  },
  {
    name: 'Mending Aura', swatch: ['#0c7a4a', '#5dff9a', '#f4ffcf'], build() {
      const p = baseProject('Mending Aura', 3.2, { theta: .5, phi: 1.2, dist: 8.5, target: [0, 1.2, 0] });
      const rise = makePath('Rise', [[0, .1, 0], [0, 2.9, 0]], { color: '#9dff8a' });
      p.paths.push(rise);
      const green = gr(0, '#0c7a4a', .5, '#3ddc84', .85, '#b8ffb0', 1, '#fbffe0');
      const life = cv(0, 0, .15, 1, .78, 1, 1, 0);
      p.layers.push(
        L('mesh', { name: 'Seal', prim: 'disc', start: 0, dur: 3.2, pos: [0, .03, 0], size: [1.8, 1, 1.8], noise: 'sigil', tile: [8, 1], scroll: [-.1, 0], fill: 0, soft: .08, core: .4, coreThr: .8, gradMap: 'life', grad: gr('#7dffb0', '#eaffb0'), sizeCurve: cv(0, .4, .12, 1, 1, 1), visCurve: life, fadeV0: 0, fadeV1: 0, intensity: 2.4 }),
        L('mesh', { name: 'Light column', prim: 'cylinder', taper: 1.15, start: .1, dur: 3, size: [1.25, 2.8, 1.25], noise: 'clouds', tile: [14, .35], scroll: [.15, .5], contrast: 1.8, fill: .12, soft: .25, gradMap: 'noise', grad: green, visCurve: life, fadeV0: .02, fadeV1: .95, intensity: .9 }),
        L('ribbon', { name: 'Spiral ribbons', pathId: rise.id, start: .15, dur: 2.6, travel: .62, tailDelay: .3, pathEase: 'out', width: .13, strands: 3, helixR: 1.05, helixTurns: 1.6, helixSpin: 1.2, noise: 'none', fill: 1, core: .7, coreThr: .4, gradMap: 'life', grad: gr('#fbffe0', '#7dffb0', '#1fae6a'), sizeCurve: cv(0, 0, .2, 1, 1, 0), tailErode: .3, intensity: 2.8 }),
        L('particles', { name: 'Plus signs', start: 0, dur: 3.2, loop: true, count: 46, life: [1.1, 1.9], shape: 'ring', radius: 1.05, thickness: .8, dir: [0, 1, 0], speed: [.6, 1.3], spread: 6, size: [.07, .15], sprite: 'cross', soft: .02, halo: .4, rotRand: 0, grad: gr('#fbffe0', '#8dffb5', '#2fd27e'), sizeCurve: CURVES.bell, intensity: 2.8 }),
        L('particles', { name: 'Motes', start: 0, dur: 3.2, loop: true, count: 150, life: [1.2, 2.2], shape: 'ring', radius: 1.25, thickness: .9, dir: [0, 1, 0], speed: [.3, 1.1], spread: 10, orbit: 1.1, turbAmp: .12, size: [.025, .06], sprite: 'glow', soft: .3, flicker: .2, grad: gr('#ffffff', '#b8ffb0', '#3ddc84'), sizeCurve: CURVES.bell, intensity: 3.2 }),
        L('mesh', { name: 'Pulse ring', prim: 'ring', inner: .9, start: .1, dur: 1.1, pos: [0, .05, 0], size: [2.6, 1, 2.6], noise: 'none', fill: 1, core: .5, coreThr: .5, gradMap: 'life', grad: gr('#fbffe0', '#5dff9a'), sizeCurve: cv(0, .1, .4, .8, 1, 1), visCurve: cv(0, 1, .3, .8, 1, 0), fadeV0: .5, fadeV1: .3, intensity: 2.2 })
      );
      return p;
    }
  },
  {
    name: 'Toon Blast', swatch: ['#8a1408', '#ff9a1f', '#fff6c2'], build() {
      const p = baseProject('Toon Blast', 2.2, { theta: .55, phi: 1.22, dist: 11, target: [0, 1.4, 0] });
      const fire = gr(0, '#5a0d06', .3, '#d8300c', .58, '#ff8a1f', .82, '#ffd34d', 1, '#fffbe0');
      const c = [0, 1.2, 0];
      p.layers.push(
        L('screen', { name: 'Flash + shake', start: .1, dur: .4, flashColor: '#fff0c2', flashAmt: .22, shakeAmp: .2, shakeFreq: 8 }),
        L('mesh', { name: 'Shockwave', prim: 'ring', inner: .84, start: .12, dur: .7, pos: [0, .06, 0], size: [5.2, 1, 5.2], tile: [16, 1], scroll: [0, 1.2], cut: .25, fill: .38, core: .6, edgeBoost: 1, grad: fire, sizeCurve: cv(0, .05, .25, .7, 1, 1), visCurve: cv(0, 1, .3, .9, 1, 0), intensity: 2.8 }),
        L('particles', { name: 'Toon smoke', emit: 'burst', burstSpread: .12, start: .16, dur: .2, count: 34, pos: c, life: [1, 1.8], shape: 'sphere', radius: .7, speed: [.2, .8], dir: [0, 1, 0], spread: 40, radial: [.8, 2.4], drag: 1.8, size: [.6, 1.2], sprite: 'smoke', soft: .02, dissolve: 1, shade: .45, additive: 0, grad: gr(0, '#ffcf7a', .25, '#9a4a2a', .6, '#3a2628', 1, '#1c181f'), alphaCurve: cv(0, 1, .65, 1, 1, 0), sizeCurve: cv(0, .3, .2, .9, 1, 1), intensity: 1 }),
        L('mesh', { name: 'Fireball', prim: 'sphere', start: .1, dur: .9, pos: c, size: [1.5, 1.5, 1.5], noise: 'clouds', tile: [4, 2.5], scroll: [.25, .8], contrast: 1.3, distort: .6, tile2: [3, 2], scroll2: [0, .8], cut: .25, fill: .3, soft: .03, edgeBoost: 1.2, edgeW: .08, bands: 4, wobble: .28, wobTile: 4, wobSpeed: 1.5, grad: fire, sizeCurve: cv(0, .1, .15, .85, 1, 1.15), visCurve: cv(0, 1, .22, 1, .85, 0, 1, 0), fadeV0: 0, fadeV1: 0, intensity: 1.7, additive: .45 }),
        L('mesh', { name: 'Hot core', prim: 'sphere', start: .1, dur: .4, pos: c, size: [1.1, 1.1, 1.1], noise: 'none', fill: 1, fresnel: -.7, fresPow: 1.2, core: 1, coreThr: .5, gradMap: 'life', grad: gr('#ffffff', '#ffe27a'), sizeCurve: cv(0, .2, .2, 1, 1, .6), visCurve: cv(0, 1, .3, 1, 1, 0), fadeV0: 0, fadeV1: 0, intensity: 4.5 }),
        L('mesh', { name: 'Impact spikes', prim: 'spikes', inner: .1, spikes: 44, seed: 4, start: .1, dur: .38, pos: c, size: [3.6, 3.6, 3.6], noise: 'none', fill: 1, core: .8, coreThr: .2, gradMap: 'v', grad: gr('#ffffff', '#ffd34d', '#ff6a14'), sizeCurve: cv(0, .1, .25, .9, 1, 1.1), visCurve: cv(0, 1, .3, 1, 1, 0), fadeV0: 0, fadeV1: .6, intensity: 3.8 }),
        L('particles', { name: 'Debris', emit: 'burst', start: .12, dur: .1, count: 180, pos: c, life: [.4, 1.1], speed: [0, 3], dir: [0, 1, 0], spread: 50, radial: [4, 11], gravity: 7, drag: 2.2, size: [.035, .1], stretch: .05, sprite: 'streak', core: .6, grad: gr('#fffbe0', '#ffb02e', '#d8300c'), sizeCurve: CURVES.down, intensity: 4 }),
        L('particles', { name: 'Embers', emit: 'burst', burstSpread: .3, start: .2, dur: .3, count: 90, pos: c, life: [.9, 1.8], shape: 'sphere', radius: 1.2, speed: [.2, 1], dir: [0, 1, 0], spread: 30, radial: [.2, 1.2], drag: 1, gravity: -.4, turbAmp: .3, size: [.03, .07], sprite: 'diamond', halo: .4, flicker: .4, spin: 3, grad: gr('#fffbe0', '#ff9a1f', '#b3160a'), sizeCurve: CURVES.bell, intensity: 3.4 })
      );
      return p;
    }
  },
  {
    name: 'Rift Portal', swatch: ['#14083f', '#7a3bff', '#7ff3ff'], build() {
      const p = baseProject('Rift Portal', 4, { theta: .32, phi: 1.36, dist: 9, target: [0, 1.7, 0] });
      const hoop = makePath('Rim', [0, 60, 120, 180, 240, 300].map(a => [Math.cos(a * D2R) * 1.5, 1.7 + Math.sin(a * D2R) * 1.5, 0]), { closed: true, color: '#c59bff' });
      p.paths.push(hoop);
      const rift = gr(0, '#14083f', .35, '#5a1fd6', .65, '#9a5bff', .88, '#7ff3ff', 1, '#ffffff');
      const life = cv(0, 0, .12, 1, .85, 1, 1, 0), c = [0, 1.7, 0];
      p.layers.push(
        L('mesh', { name: 'Back seal', prim: 'disc', start: 0, dur: 4, pos: [0, 1.7, -.15], rot: [90, 0, 0], size: [2.3, 1, 2.3], noise: 'sigil', tile: [7, 1], scroll: [.08, 0], fill: 0, soft: .08, gradMap: 'life', grad: gr('#9a5bff', '#7ff3ff'), sizeCurve: cv(0, .7, .15, 1, 1, 1), visCurve: life, fadeV0: 0, fadeV1: 0, intensity: 1.5 }),
        L('mesh', { name: 'Vortex', prim: 'disc', start: 0, dur: 4, pos: c, rot: [90, 0, 0], size: [1.55, 1, 1.55], noise: 'flames', tile: [5, 1.4], scroll: [.35, -.7], contrast: 1.5, distort: .5, tile2: [3, 1], scroll2: [-.2, -.4], skew: 2.2, cut: .2, fill: .1, soft: .04, edgeBoost: .6, bands: 6, grad: rift, sizeCurve: cv(0, 0, .18, 1, .85, 1, 1, 0), visCurve: life, fadeV0: .12, fadeV1: .18, intensity: 2.2, additive: .8 }),
        L('mesh', { name: 'Rim', prim: 'torus', inner: .09, start: 0, dur: 4, pos: c, rot: [90, 0, 0], size: [1.5, 1.5, 1.5], noise: 'flames', tile: [9, 1], scroll: [1.2, .3], cut: .18, fill: .4, core: .7, coreThr: .7, edgeBoost: .8, grad: gr('#5a1fd6', '#7ff3ff', '#ffffff'), sizeCurve: cv(0, 0, .18, 1, .85, 1, 1, 0), visCurve: life, fadeV0: 0, fadeV1: 0, intensity: 2.8 }),
        L('ribbon', { name: 'Arc lightning', pathId: hoop.id, start: .3, dur: 3.4, mode: 'full', width: .05, strands: 3, strandVar: .4, jitAmp: .13, jitFreq: 16, jitRate: 16, noise: 'none', fill: 1, core: .9, coreThr: .4, gradMap: 'life', grad: gr('#ffffff', '#b89bff'), visCurve: life, intensity: 3 }),
        L('particles', { name: 'Infall', start: 0, dur: 4, loop: true, count: 300, pos: c, rot: [90, 0, 0], life: [.8, 1.6], shape: 'ring', radius: 2.3, thickness: .35, speed: [0, 0], orbit: 3.2, converge: .92, size: [.03, .09], stretch: .035, sprite: 'streak', core: .5, grad: gr('#7a3bff', '#7ff3ff', '#ffffff'), alphaCurve: cv(0, 0, .2, 1, 1, 1), sizeCurve: cv(0, .4, .5, 1, 1, .2), intensity: 3.2 }),
        L('particles', { name: 'Rim motes', pathId: hoop.id, emitMode: 'along', motion: 'path', pathTravel: .35, start: 0, dur: 4, loop: true, count: 90, life: [.9, 1.7], shape: 'ring', radius: .22, speed: [0, 0], orbit: 5, size: [.04, .1], sprite: 'star', soft: .04, halo: .5, spin: 2, grad: gr('#ffffff', '#c59bff', '#5a1fd6'), sizeCurve: CURVES.bell, intensity: 3 })
      );
      return p;
    }
  },
  {
    name: 'Spiral Ward', swatch: ['#06323a', '#2fd6c0', '#fff3c4'], build() {
      const p = baseProject('Spiral Ward', 4, { theta: .28, phi: 1.24, dist: 9.5, target: [0, 1.2, 0] });
      p.figure = true;
      const rise = makePath('Axis', [[0, .1, 0], [0, 2.3, 0]], { color: '#9dff8a' });
      const cross = makePath('Crossing', [[-3.6, 0, 1.7], [3.6, 0, 1.7]], { color: '#ffd166' });
      p.paths.push(rise, cross);
      const teal = gr(0, '#06323a', .4, '#12a594', .75, '#7ff3d8', 1, '#fff9e0');
      const life = cv(0, 0, .1, 1, .88, 1, 1, 0);
      p.layers.push(
        L('mesh', { name: 'Seal', prim: 'disc', start: 0, dur: 4, pos: [0, .03, 0], size: [1.9, 1, 1.9], noise: 'sigil', tile: [9, 1], scroll: [.1, 0], cut: 0, fill: 0, soft: .08, gradMap: 'life', grad: gr('#7ff3d8', '#ffe9a8'), sizeCurve: cv(0, .5, .1, 1, 1, 1), visCurve: life, fadeV0: 0, fadeV1: 0, intensity: 2.2 }),
        L('mesh', { name: 'Ward shell', prim: 'sphere', start: 0, dur: 4, pos: [0, 1.05, 0], size: [1.35, 1.35, 1.35], spin: 30, noise: 'cells', tile: [8, 4], scroll: [.1, .15], contrast: 1.6, cut: .3, fill: .05, soft: .02, edgeBoost: 1, fresnel: .75, fresPow: 1.6, gradMap: 'noise', grad: teal, visCurve: life, fadeV0: .05, fadeV1: .05, intensity: 1.8 }),
        L('ribbon', { name: 'Orbit bands', pathId: rise.id, start: 0, dur: 4, mode: 'full', width: .2, strands: 3, helixR: 1.02, helixTurns: 1.4, helixSpin: 2.6, noise: 'flames', tile: [3, 1], scroll: [1.6, 0], cut: .18, fill: .3, soft: .03, core: .7, coreThr: .7, edgeBoost: .8, gradMap: 'noise', grad: teal, sizeCurve: cv(0, 0, .5, 1, 1, 0), visCurve: life, tailErode: 0, intensity: 2.3 }),
        L('ribbon', { name: 'Counter threads', pathId: rise.id, start: 0, dur: 4, mode: 'full', width: .05, strands: 4, helixR: 1.25, helixTurns: -1.1, helixSpin: -3.4, noise: 'none', cut: 0, fill: 1, core: .9, coreThr: .4, gradMap: 'life', grad: gr('#ffffff', '#ffe9a8'), sizeCurve: cv(0, 0, .5, 1, 1, 0), visCurve: life, tailErode: 0, intensity: 3 }),
        L('particles', { name: 'Orbiters', start: 0, dur: 4, loop: true, count: 150, pos: [0, .2, 0], life: [1.2, 2.2], shape: 'ring', radius: 1.2, thickness: .25, dir: [0, 1, 0], speed: [.35, .9], spread: 4, orbit: 2.4, size: [.04, .11], sprite: 'star', soft: .04, halo: .5, spin: 2, grad: gr('#ffffff', '#7ff3d8', '#12a594'), sizeCurve: CURVES.bell, intensity: 3 }),
        L('occluder', { name: 'Passing pillar', shape: 'box', size: [.75, 2.7, .75], always: false, start: .3, dur: 3.4, pathId: cross.id, pathEase: 'inOut', ghost: true })
      );
      return p;
    }
  },
  {
    name: 'Frost Nova', swatch: ['#0b2a6b', '#59c8ff', '#ffffff'], build() {
      const p = baseProject('Frost Nova', 2.4, { theta: .5, phi: 1.15, dist: 11, target: [0, .9, 0] });
      const ice = gr(0, '#0b2a6b', .4, '#2f8bff', .75, '#9fe8ff', 1, '#ffffff'), c = [0, .3, 0];
      p.layers.push(
        floorMask(),
        L('screen', { name: 'Flash', start: .1, dur: .3, flashColor: '#cfefff', flashAmt: .16, shakeAmp: .1, shakeFreq: 9 }),
        L('mesh', { name: 'Frost ring', prim: 'ring', inner: .8, start: .1, dur: .75, pos: [0, .05, 0], size: [5.2, 1, 5.2], noise: 'cells', tile: [18, 1], scroll: [0, .8], contrast: 1.5, cut: .22, fill: .3, core: .6, edgeBoost: 1, grad: ice, sizeCurve: cv(0, .05, .25, .7, 1, 1), visCurve: cv(0, 1, .3, .9, 1, 0), intensity: 2.6 }),
        L('mesh', { name: 'Rime', prim: 'disc', start: .15, dur: 2.1, pos: [0, .03, 0], size: [2.6, 1, 2.6], noise: 'cells', tile: [14, 3], scroll: [0, 0], contrast: 2.2, cut: .4, fill: 0, soft: .01, gradMap: 'noise', grad: gr('#123a9a', '#59c8ff', '#e8fbff'), sizeCurve: cv(0, .2, .2, 1, 1, 1), visCurve: cv(0, 1, .6, 1, 1, 0), fadeV0: 0, fadeV1: .5, intensity: 1.8 }),
        L('particles', { name: 'Cold mist', emit: 'burst', burstSpread: .15, start: .15, dur: .2, count: 26, pos: c, life: [1, 1.7], shape: 'ring', radius: 1.4, speed: [0, .3], radial: [.6, 1.8], drag: 1.6, size: [.5, 1], sprite: 'smoke', soft: .04, dissolve: .8, shade: .3, additive: .3, grad: gr('#cfefff', '#5a8bd6', '#1b2a55'), alphaCurve: cv(0, .7, .5, .45, 1, 0), sizeCurve: cv(0, .3, .3, 1, 1, 1), intensity: 1 }),
        L('mesh', { name: 'Ice crown', prim: 'spikes', inner: .18, spikes: 46, seed: 7, start: .12, dur: 1.9, pos: [0, .1, 0], size: [2.3, 2.9, 2.3], noise: 'cells', tile: [3, 2], scroll: [0, 0], contrast: 1.3, cut: .08, fill: .55, soft: .01, bands: 3, edgeBoost: .8, core: .5, coreThr: .8, gradMap: 'v', grad: gr('#ffffff', '#9fe8ff', '#2f8bff'), sizeCurve: cv(0, 0, .1, 1.05, .2, 1, 1, 1), visCurve: cv(0, 1, .65, 1, 1, 0), fadeV0: 0, fadeV1: .25, additive: .55, intensity: 2 }),
        L('mesh', { name: 'Core flash', prim: 'dome', start: .1, dur: .4, size: [1.5, 1.2, 1.5], noise: 'none', cut: 0, fill: 1, soft: .2, fresnel: -.5, core: 1, coreThr: .5, gradMap: 'life', grad: gr('#ffffff', '#9fe8ff'), sizeCurve: cv(0, .2, .3, 1, 1, 1.2), visCurve: CURVES.fade, fadeV0: 0, fadeV1: .2, intensity: 3.2 }),
        L('particles', { name: 'Shards', emit: 'burst', start: .12, dur: .1, count: 130, pos: c, life: [.5, 1.2], dir: [0, 1, 0], speed: [0, 2.5], spread: 60, radial: [3, 8.5], gravity: 5, drag: 2.4, size: [.05, .15], sprite: 'shard', soft: .02, spin: 7, core: .3, grad: gr('#ffffff', '#9fe8ff', '#2f6bff'), sizeCurve: CURVES.down, intensity: 3 }),
        L('particles', { name: 'Snow glints', emit: 'burst', burstSpread: .5, start: .3, dur: .5, count: 150, pos: [0, .9, 0], life: [1, 1.9], shape: 'sphere', radius: 2.3, shapeScale: [1, .45, 1], dir: [0, 1, 0], speed: [.05, .4], spread: 180, turbAmp: .2, size: [.03, .09], sprite: 'star', soft: .04, halo: .4, spin: 2, flicker: .35, grad: gr('#ffffff', '#bfeeff', '#59a8ff'), sizeCurve: CURVES.bell, intensity: 3 })
      );
      return p;
    }
  },
  {
    name: 'Nova Beam', swatch: ['#0b2fb8', '#4fb8ff', '#ffffff'], build() {
      const p = baseProject('Nova Beam', 3, { theta: .22, phi: 1.3, dist: 11, target: [0, 1.2, 0] });
      const beam = makePath('Beam', [[-3.4, 1.2, 0], [3.5, 1.2, 0]], { color: '#59e0ff' }); p.paths.push(beam);
      const en = gr(0, '#0b2fb8', .4, '#2f8bff', .75, '#8ff3ff', 1, '#ffffff');
      const at0 = { pathId: beam.id, pathFrom: 0, pathTo: 0 }, at1 = { pathId: beam.id, pathFrom: 1, pathTo: 1 }, fire = { pathId: beam.id, start: 1.15, dur: 1.6, travel: .1, tailDelay: .72, pathEase: 'out', len: 4 };
      p.layers.push(
        L('particles', Object.assign({ name: 'Gather', start: 0, dur: 1.05, count: 240, life: [.35, .65], shape: 'sphere', radius: 1.7, thickness: .35, speed: [0, 0], converge: 1, size: [.03, .075], stretch: .05, sprite: 'streak', core: .5, grad: gr('#2f6bff', '#8ff3ff', '#ffffff'), alphaCurve: cv(0, 0, .3, 1, 1, 1), sizeCurve: CURVES.flat, intensity: 3 }, at0)),
        L('mesh', Object.assign({ name: 'Charge ring 1', prim: 'ring', inner: .9, facing: 'camera', start: .1, dur: .5, size: [2.3, 1, 2.3], noise: 'none', cut: 0, fill: 1, core: .6, coreThr: .4, gradMap: 'life', grad: gr('#8ff3ff', '#ffffff'), sizeCurve: cv(0, 1, 1, .08), visCurve: cv(0, 0, .25, 1, 1, 1), fadeV0: .4, fadeV1: .4, intensity: 2.6 }, at0)),
        L('mesh', Object.assign({ name: 'Charge ring 2', prim: 'ring', inner: .9, facing: 'camera', start: .55, dur: .5, size: [2.3, 1, 2.3], noise: 'none', cut: 0, fill: 1, core: .6, coreThr: .4, gradMap: 'life', grad: gr('#8ff3ff', '#ffffff'), sizeCurve: cv(0, 1, 1, .08), visCurve: cv(0, 0, .25, 1, 1, 1), fadeV0: .4, fadeV1: .4, intensity: 2.6 }, at0)),
        L('mesh', Object.assign({ name: 'Charge orb', prim: 'sphere', start: 0, dur: 2.6, size: [.52, .52, .52], noise: 'clouds', tile: [3, 2], scroll: [2, 0], cut: 0, fill: .75, fresnel: -.5, fresPow: 1.4, core: 1, coreThr: .5, wobble: .14, wobTile: 3, wobSpeed: 4, gradMap: 'noise', grad: gr('#2f8bff', '#8ff3ff', '#ffffff'), sizeCurve: cv(0, .08, .4, .8, .47, 1.2, .9, .9, 1, 0), fadeV0: 0, fadeV1: 0, intensity: 3.6 }, at0)),
        L('screen', { name: 'Release', start: 1.15, dur: .4, flashColor: '#cfe4ff', flashAmt: .22, shakeAmp: .14, shakeFreq: 11 }),
        L('ribbon', Object.assign({ name: 'Outer sheath', width: 1.5, noise: 'flames', tile: [2, 1], scroll: [5, 0], contrast: 1.5, distort: .4, cut: .3, fill: .04, soft: .04, edgeBoost: .5, core: 0, grad: gr('#0b2fb8', '#2f8bff', '#8ff3ff'), sizeCurve: cv(0, .5, .08, 1, 1, .8), visCurve: cv(0, 1, .75, 1, 1, 0), edgePow: 1.5, tailErode: .2, intensity: 1.5 }, fire)),
        L('ribbon', Object.assign({ name: 'Beam core', width: .72, noise: 'clouds', tile: [.5, 5], scroll: [7, 0], contrast: 1.8, cut: .14, fill: .55, soft: .03, edgeBoost: .8, core: 1, coreThr: .45, grad: en, sizeCurve: cv(0, .5, .06, 1, 1, .85), visCurve: cv(0, 1, .78, 1, 1, 0), edgePow: 3, tailErode: .15, intensity: 2.7 }, fire)),
        L('ribbon', Object.assign({ name: 'Beam helix', width: .07, strands: 3, helixR: .44, helixTurns: 5, helixSpin: 16, noise: 'none', cut: 0, fill: 1, core: .9, coreThr: .4, gradMap: 'life', grad: gr('#ffffff', '#8ff3ff'), sizeCurve: cv(0, 0, .08, 1, 1, 1), visCurve: cv(0, 1, .75, 1, 1, 0), tailErode: 0, intensity: 3 }, fire)),
        L('mesh', Object.assign({ name: 'Muzzle ring', prim: 'ring', inner: .82, alignPath: true, start: 1.15, dur: .45, size: [1.9, 1, 1.9], tile: [12, 1], scroll: [0, 1.5], cut: .2, fill: .45, core: .7, grad: en, sizeCurve: cv(0, .1, .3, .8, 1, 1), visCurve: cv(0, 1, .3, 1, 1, 0), intensity: 3 }, at0)),
        L('mesh', Object.assign({ name: 'Muzzle ring 2', prim: 'ring', inner: .88, alignPath: true, start: 1.3, dur: .5, size: [2.8, 1, 2.8], tile: [12, 1], scroll: [0, 1.5], cut: .2, fill: .45, core: .5, grad: en, sizeCurve: cv(0, .1, .3, .8, 1, 1), visCurve: cv(0, 1, .3, 1, 1, 0), intensity: 2.4 }, { pathId: beam.id, pathFrom: .12, pathTo: .12 })),
        L('particles', { name: 'Beam sparks', pathId: beam.id, emitMode: 'along', alignPath: true, start: 1.22, dur: 1.25, count: 280, life: [.3, .65], dir: [0, 1, 0], speed: [2, 7], spread: 22, radial: [.4, 2], drag: 2, size: [.03, .07], stretch: .04, sprite: 'streak', core: .6, grad: gr('#ffffff', '#8ff3ff', '#2f6bff'), sizeCurve: CURVES.down, intensity: 3.6 }),
        L('mesh', Object.assign({ name: 'Impact burst', prim: 'spikes', inner: .12, spikes: 36, seed: 5, start: 1.25, dur: 1.45, spin: 240, size: [1.9, 1.9, 1.9], noise: 'none', cut: 0, fill: 1, core: .8, coreThr: .2, gradMap: 'v', grad: gr('#ffffff', '#8ff3ff', '#2f6bff'), sizeCurve: cv(0, .3, .08, 1, .85, .85, 1, .2), visCurve: cv(0, 1, .85, 1, 1, 0), fadeV0: 0, fadeV1: .6, intensity: 3.4 }, at1)),
        L('mesh', Object.assign({ name: 'Impact glow', prim: 'sphere', start: 1.25, dur: 1.45, size: [.85, .85, .85], noise: 'none', cut: 0, fill: 1, soft: .2, fresnel: -.6, core: 1, coreThr: .5, gradMap: 'life', grad: gr('#ffffff', '#8ff3ff'), sizeCurve: cv(0, .3, .1, 1, .85, .9, 1, 0), fadeV0: 0, fadeV1: 0, intensity: 3.6 }, at1)),
        L('particles', Object.assign({ name: 'Impact spray', start: 1.25, dur: 1.3, count: 260, life: [.3, .7], speed: [0, 0], radial: [2, 7], drag: 3.2, size: [.03, .08], stretch: .045, sprite: 'streak', core: .6, grad: gr('#ffffff', '#8ff3ff', '#2f6bff'), sizeCurve: CURVES.down, intensity: 3.8 }, at1))
      );
      return p;
    }
  },
  {
    name: 'Meteor Strike', swatch: ['#3a0d06', '#ff6a14', '#ffe9a8'], build() {
      const p = baseProject('Meteor Strike', 3.2, { theta: .5, phi: 1.27, dist: 14, target: [.7, 2.6, 0] });
      const fall = makePath('Fall', [[4.6, 8, -1.6], [2.5, 4.2, -.8], [0, .2, 0]], { color: '#ff9f5a' }); p.paths.push(fall);
      const fire = gr(0, '#5a0d06', .3, '#d8300c', .58, '#ff8a1f', .82, '#ffd34d', 1, '#fffbe0');
      const hit = { pathId: fall.id, pathFrom: 1, pathTo: 1 }, T0 = 1.0;
      p.layers.push(
        L('mesh', Object.assign({ name: 'Scorch', prim: 'disc', start: T0, dur: 2.1, pos: [0, -.15, 0], size: [2.4, 1, 2.4], noise: 'flames', tile: [16, .8], scroll: [.1, .3], contrast: 2.2, cut: .36, fill: 0, soft: .03, gradMap: 'noise', grad: gr('#5a0d06', '#ff6a14', '#ffe9a8'), sizeCurve: cv(0, .4, .1, 1, 1, 1), visCurve: cv(0, 1, .25, .8, 1, 0), fadeV0: .05, fadeV1: .6, intensity: 2 }, hit)),
        L('ribbon', { name: 'Smoke trail', pathId: fall.id, start: .25, dur: 2, travel: .39, tailDelay: .5, pathEase: 'in', width: 1.7, noise: 'clouds', tile: [3, 1], scroll: [.4, 0], contrast: 1.3, distort: .5, cut: .3, fill: .08, soft: .06, bands: 3, core: 0, edgeBoost: 0, additive: 0, alpha: .85, grad: gr('#1c1518', '#4a3530', '#8a6550'), sizeCurve: cv(0, .4, .15, 1, 1, .7), visCurve: cv(0, 1, .45, 1, 1, 0), tailErode: .4, intensity: 1 }),
        L('ribbon', { name: 'Fire tail', pathId: fall.id, start: .2, dur: 1.3, travel: .615, tailDelay: .3, pathEase: 'in', width: 1.15, noise: 'flames', tile: [2, 1], scroll: [3.2, 0], distort: .5, cut: .24, fill: .14, soft: .03, bands: 4, edgeBoost: .6, core: .5, coreThr: .8, additive: .7, grad: fire, sizeCurve: cv(0, .5, .1, 1, 1, 0), tailErode: .7, intensity: 2 }),
        L('particles', { name: 'Trail embers', pathId: fall.id, start: .2, dur: .8, pathEase: 'in', count: 220, life: [.4, 1], speed: [0, 0], radial: [.3, 1.6], drag: 1.6, gravity: -.5, size: [.03, .085], sprite: 'diamond', halo: .4, spin: 3, flicker: .3, grad: gr('#fffbe0', '#ff9a1f', '#b3160a'), sizeCurve: cv(0, .3, .2, 1, 1, 0), intensity: 3.4 }),
        L('mesh', { name: 'Rock', prim: 'sphere', pathId: fall.id, start: .2, dur: .8, pathEase: 'in', size: [.45, .45, .45], spin: 300, noise: 'cells', tile: [5, 3], scroll: [.4, 0], contrast: 1.2, cut: .06, fill: .6, soft: .02, bands: 3, edgeBoost: .8, wobble: .2, wobTile: 4, wobSpeed: 0, additive: .2, gradMap: 'noise', grad: gr('#3a1a10', '#ff7a1f', '#ffe9a8'), fadeV0: 0, fadeV1: 0, intensity: 2.4 }),
        L('screen', { name: 'Impact', start: T0, dur: .5, flashColor: '#ffe9c2', flashAmt: .28, shakeAmp: .26, shakeFreq: 8 }),
        L('mesh', Object.assign({ name: 'Shockwave', prim: 'ring', inner: .84, start: T0, dur: .85, pos: [0, -.1, 0], size: [6.8, 1, 6.8], tile: [18, 1], scroll: [0, 1.2], cut: .25, fill: .38, core: .6, edgeBoost: 1, grad: fire, sizeCurve: cv(0, .05, .25, .7, 1, 1), visCurve: cv(0, 1, .3, .9, 1, 0), intensity: 2.8 }, hit)),
        L('particles', Object.assign({ name: 'Dust', emit: 'burst', burstSpread: .1, start: T0 + .05, dur: .2, count: 32, pos: [0, .3, 0], life: [1.2, 2], shape: 'ring', radius: 1.1, speed: [.2, 1], dir: [0, 1, 0], spread: 40, radial: [1.5, 4.2], drag: 2, size: [.7, 1.4], sprite: 'smoke', soft: .02, dissolve: 1, shade: .45, additive: 0, grad: gr(0, '#c98a52', .3, '#6a4530', 1, '#221a1c'), alphaCurve: cv(0, .9, .6, .8, 1, 0), sizeCurve: cv(0, .3, .25, .9, 1, 1), intensity: 1 }, hit)),
        L('mesh', Object.assign({ name: 'Fire dome', prim: 'dome', start: T0, dur: .95, pos: [0, -.15, 0], size: [2.3, 1.9, 2.3], noise: 'clouds', tile: [5, 2], scroll: [.2, 1], contrast: 1.3, distort: .5, cut: .25, fill: .22, soft: .03, bands: 4, edgeBoost: 1, wobble: .22, wobTile: 4, wobSpeed: 1.5, additive: .5, grad: fire, sizeCurve: cv(0, .2, .2, .9, 1, 1.1), visCurve: cv(0, 1, .28, 1, 1, 0), fadeV0: .02, fadeV1: .1, intensity: 1.9 }, hit)),
        L('mesh', Object.assign({ name: 'Fire plume', prim: 'cylinder', taper: 1.7, start: T0, dur: .9, pos: [0, -.15, 0], size: [.9, 3.6, .9], noise: 'clouds', tile: [6, .8], scroll: [.3, 2.6], contrast: 1.15, distort: .6, tile2: [3, 1], scroll2: [0, 1.4], cut: .3, fill: 0, soft: .025, bands: 5, edgeBoost: .4, additive: .4, grad: fire, sizeCurve: cv(0, .3, .2, 1, 1, 1), visCurve: cv(0, 1, .35, 1, 1, 0), fadeV0: .04, fadeV1: .95, intensity: 1.5 }, hit)),
        L('mesh', Object.assign({ name: 'Impact spikes', prim: 'spikes', inner: .1, spikes: 40, seed: 9, start: T0, dur: .4, pos: [0, .5, 0], size: [4.2, 4.2, 4.2], noise: 'none', cut: 0, fill: 1, core: .8, coreThr: .2, gradMap: 'v', grad: gr('#ffffff', '#ffd34d', '#ff6a14'), sizeCurve: cv(0, .1, .25, .9, 1, 1.1), visCurve: cv(0, 1, .3, 1, 1, 0), fadeV0: 0, fadeV1: .6, intensity: 3.6 }, hit)),
        L('particles', Object.assign({ name: 'Debris', emit: 'burst', start: T0, dur: .1, count: 210, pos: [0, .2, 0], life: [.5, 1.3], dir: [0, 1, 0], speed: [2, 8], spread: 55, radial: [3, 10], gravity: 9, drag: 1.3, size: [.035, .1], stretch: .045, sprite: 'streak', core: .6, grad: gr('#fffbe0', '#ffb02e', '#d8300c'), sizeCurve: CURVES.down, intensity: 4 }, hit)),
        L('particles', Object.assign({ name: 'Rocks', emit: 'burst', start: T0, dur: .1, count: 44, pos: [0, .2, 0], life: [.9, 1.6], dir: [0, 1, 0], speed: [3, 8], spread: 50, radial: [1, 4.5], gravity: 9.5, drag: .5, size: [.08, .22], sprite: 'shard', soft: .01, spin: 9, shade: .45, additive: 0, grad: gr('#8a5a3a', '#4a2a1e', '#2a1c18'), alphaCurve: cv(0, 1, .85, 1, 1, 0), sizeCurve: CURVES.flat, intensity: 1.1 }, hit))
      );
      return p;
    }
  },
  {
    name: 'Petal Storm', swatch: ['#d6457f', '#ffb7d8', '#ffffff'], build() {
      const p = baseProject('Petal Storm', 4, { theta: .4, phi: 1.2, dist: 10.5, target: [0, 1.6, 0] });
      const gust = makePath('Gust', Array.from({ length: 15 }, (_, i) => { const a = i * 52 * D2R, r = 1.7 - i * .06; return [Math.cos(a) * r, .25 + i * .21, Math.sin(a) * r]; }), { color: '#ff7ab6' }); p.paths.push(gust);
      const sak = gr('#ffffff', '#ffc2dd', '#ff7ab6', '#d6457f'), life = cv(0, 0, .12, 1, .85, 1, 1, 0);
      p.layers.push(
        L('mesh', { name: 'Bloom ring', prim: 'disc', start: 0, dur: 4, pos: [0, .03, 0], size: [2.2, 1, 2.2], noise: 'waves', tile: [6, 1.5], scroll: [.08, -.25], contrast: 1.6, cut: .34, fill: 0, soft: .05, gradMap: 'noise', grad: gr('#d6457f', '#ffb7d8', '#ffffff'), visCurve: life, fadeV0: .1, fadeV1: .5, intensity: 1.3 }),
        L('ribbon', { name: 'Soft gust', pathId: gust.id, start: 0, dur: 3.7, travel: .72, tailDelay: .26, len: .5, pathEase: 'inOut', width: .6, noise: 'clouds', tile: [.6, 6], scroll: [2, 0], contrast: 1.8, cut: .4, fill: 0, soft: .05, core: 0, edgeBoost: 0, gradMap: 'noise', grad: gr('#ff7ab6', '#ffd6e8', '#ffffff'), sizeCurve: cv(0, 0, .2, 1, 1, 0), tailErode: .5, alpha: .6, intensity: 1.3 }),
        L('ribbon', { name: 'Wind lines', pathId: gust.id, start: 0, dur: 3.7, travel: .72, tailDelay: .22, len: .45, pathEase: 'inOut', width: .045, strands: 3, strandVar: .4, helixR: .28, helixTurns: 3, helixSpin: 2, noise: 'none', cut: 0, fill: 1, core: .6, coreThr: .4, gradMap: 'life', grad: gr('#ffffff', '#ffc2dd'), sizeCurve: cv(0, 0, .2, 1, 1, 0), tailErode: .3, alpha: .8, intensity: 1.8 }),
        L('particles', { name: 'Petals', pathId: gust.id, emitMode: 'along', motion: 'path', pathTravel: .42, start: 0, dur: 4, loop: true, count: 280, life: [1.6, 2.8], shape: 'ring', radius: .55, speed: [0, 0], orbit: 2, turbAmp: .25, turbFreq: 1.2, size: [.06, .14], sprite: 'crescent', soft: .02, spin: 4, shade: .25, hueVar: .03, additive: .15, grad: sak, alphaCurve: cv(0, 0, .15, 1, .8, 1, 1, 0), sizeCurve: cv(0, .6, .3, 1, 1, .8), intensity: 1.35 }),
        L('particles', { name: 'Falling petals', start: 0, dur: 4, loop: true, count: 70, pos: [0, 3.6, 0], life: [2.2, 3.4], shape: 'box', radius: 2.4, shapeScale: [1, .1, 1], dir: [0, -1, 0], speed: [.3, .8], spread: 25, turbAmp: .45, turbFreq: .8, size: [.05, .11], sprite: 'crescent', soft: .02, spin: 3, additive: .15, grad: sak, alphaCurve: cv(0, 0, .15, 1, .8, 1, 1, 0), intensity: 1.3 }),
        L('particles', { name: 'Glints', pathId: gust.id, emitMode: 'along', start: 0, dur: 4, loop: true, count: 60, life: [.6, 1.3], shape: 'sphere', radius: .6, speed: [0, .3], size: [.04, .1], sprite: 'star', soft: .04, halo: .5, spin: 2, flicker: .3, grad: gr('#ffffff', '#ffd6e8'), sizeCurve: CURVES.bell, intensity: 2.6 })
      );
      setLook(p, 'Pastel dream');
      return p;
    }
  },
  {
    name: 'Holy Smite', swatch: ['#8a4a06', '#ffc23d', '#fffbe0'], build() {
      const p = baseProject('Holy Smite', 2.8, { theta: .42, phi: 1.3, dist: 13.5, target: [0, 3, 0] });
      const sky = makePath('Sky', [[0, 9, 0], [0, 0, 0]], { color: '#ffd166' }); p.paths.push(sky);
      const holy = gr(0, '#b8560a', .4, '#ffb02e', .75, '#ffe9a8', 1, '#ffffff'), T0 = .6;
      p.layers.push(
        L('mesh', { name: 'Judgement seal', prim: 'disc', start: 0, dur: 2.7, pos: [0, .03, 0], size: [2.4, 1, 2.4], spin: 25, noise: 'sigil', tile: [8, 1], scroll: [0, 0], cut: 0, fill: 0, soft: .08, core: .4, coreThr: .8, gradMap: 'life', grad: gr('#ffe9a8', '#ffb02e'), sizeCurve: cv(0, .3, .15, 1, 1, 1), visCurve: cv(0, 0, .12, 1, .85, 1, 1, 0), fadeV0: 0, fadeV1: 0, intensity: 2.4 }),
        L('ribbon', { name: 'Descending ray', pathId: sky.id, start: .32, dur: .3, mode: 'travel', travel: 1, tailDelay: .4, pathEase: 'in', width: .09, noise: 'none', cut: 0, fill: 1, core: 1, coreThr: .3, gradMap: 'life', grad: gr('#ffffff', '#ffe9a8'), sizeCurve: cv(0, 1, 1, .3), intensity: 3.4 }),
        L('screen', { name: 'Flash', start: T0, dur: .4, flashColor: '#fff3c4', flashAmt: .26, shakeAmp: .12, shakeFreq: 9 }),
        L('mesh', { name: 'Light pillar', prim: 'cylinder', taper: 1, start: T0, dur: 1.4, size: [1, 9, 1], noise: 'streaks', tile: [10, .5], scroll: [.15, -3], contrast: 1.4, cut: .1, fill: .3, soft: .08, edgeBoost: .4, core: .7, coreThr: .65, gradMap: 'noise', grad: holy, sizeCurve: cv(0, .25, .08, 1, .7, 1, 1, .9), visCurve: cv(0, 1, .6, 1, 1, 0), fadeV0: 0, fadeV1: .35, intensity: 1.9 }),
        L('mesh', { name: 'Inner beam', prim: 'cylinder', taper: 1, start: T0, dur: 1.15, size: [.36, 9, .36], noise: 'none', cut: 0, fill: 1, soft: .25, core: 1, coreThr: .3, fresnel: -.6, gradMap: 'life', grad: gr('#ffffff', '#ffe9a8'), sizeCurve: cv(0, .3, .08, 1, .75, 1, 1, .6), visCurve: cv(0, 1, .7, 1, 1, 0), fadeV0: 0, fadeV1: .3, intensity: 3.2 }),
        L('mesh', { name: 'Ground burst', prim: 'ring', inner: .82, start: T0, dur: .75, pos: [0, .05, 0], size: [5.4, 1, 5.4], tile: [16, 1], scroll: [0, 1.2], cut: .24, fill: .38, core: .6, edgeBoost: 1, grad: holy, sizeCurve: cv(0, .05, .25, .7, 1, 1), visCurve: cv(0, 1, .3, .9, 1, 0), intensity: 2.6 }),
        L('mesh', { name: 'Halo low', prim: 'ring', inner: .9, start: T0 + .08, dur: .7, pos: [0, 1.4, 0], size: [2.1, 1, 2.1], noise: 'none', cut: 0, fill: 1, core: .6, coreThr: .4, gradMap: 'life', grad: gr('#ffffff', '#ffc23d'), sizeCurve: cv(0, .2, .35, .85, 1, 1), visCurve: cv(0, 1, .4, .9, 1, 0), fadeV0: .4, fadeV1: .4, intensity: 2.6 }),
        L('mesh', { name: 'Halo high', prim: 'ring', inner: .9, start: T0 + .2, dur: .7, pos: [0, 3.2, 0], size: [1.7, 1, 1.7], noise: 'none', cut: 0, fill: 1, core: .6, coreThr: .4, gradMap: 'life', grad: gr('#ffffff', '#ffc23d'), sizeCurve: cv(0, .2, .35, .85, 1, 1), visCurve: cv(0, 1, .4, .9, 1, 0), fadeV0: .4, fadeV1: .4, intensity: 2.6 }),
        L('particles', { name: 'Ground sparks', emit: 'burst', start: T0, dur: .1, count: 150, pos: [0, .15, 0], life: [.4, 1], dir: [0, 1, 0], speed: [1, 5], spread: 65, radial: [2, 6], gravity: 6, drag: 1.8, size: [.03, .08], stretch: .045, sprite: 'streak', core: .6, grad: gr('#ffffff', '#ffd34d', '#d8700c'), sizeCurve: CURVES.down, intensity: 3.8 }),
        L('particles', { name: 'Blessing', start: T0 + .05, dur: 1.3, count: 130, life: [.7, 1.4], shape: 'ring', radius: 1.15, dir: [0, 1, 0], speed: [1, 3.2], spread: 8, orbit: 1.2, size: [.05, .14], sprite: 'star', soft: .04, halo: .5, spin: 2, flicker: .25, grad: gr('#ffffff', '#ffe9a8', '#ffb02e'), sizeCurve: CURVES.bell, intensity: 3 }),
        L('particles', { name: 'Crosses', start: T0 + .1, dur: 1.1, count: 26, life: [.8, 1.4], shape: 'ring', radius: .9, dir: [0, 1, 0], speed: [.8, 1.8], spread: 5, size: [.1, .2], sprite: 'cross', soft: .02, halo: .4, rotRand: 0, grad: gr('#ffffff', '#ffe9a8'), sizeCurve: CURVES.bell, intensity: 2.6 })
      );
      return p;
    }
  },
  {
    name: 'Hex Barrier', swatch: ['#0b3a8a', '#2fa3ff', '#bff3ff'], build() {
      const p = baseProject('Hex Barrier', 3.4, { theta: .5, phi: 1.2, dist: 9.5, target: [0, 1, 0] });
      p.figure = true;
      const lift = makePath('Lift', [[0, .08, 0], [0, 1.75, 0]], { color: '#59e0ff' }); p.paths.push(lift);
      const sh = gr('#0b3a8a', '#2fa3ff', '#bff3ff'), life = cv(0, 0, .1, 1, .88, 1, 1, 0), hitP = [.95, 1.15, 1.2];
      const scan = st => L('mesh', { name: 'Scan ring', prim: 'torus', inner: .03, pathId: lift.id, start: st, dur: 1.5, pathEase: 'linear', size: [1.74, 1.74, 1.74], noise: 'none', cut: 0, fill: 1, core: .8, coreThr: .3, gradMap: 'life', grad: gr('#ffffff', '#8fd8ff'), sizeCurve: cv(0, 1, .5, .87, .8, .6, 1, .12), visCurve: cv(0, 0, .1, 1, .9, 1, 1, 0), fadeV0: 0, fadeV1: 0, intensity: 2.6 });
      const hit = st => [
        L('mesh', { name: 'Hit ripple', prim: 'ring', inner: .78, facing: 'camera', start: st, dur: .5, pos: hitP, size: [1.1, 1, 1.1], noise: 'none', cut: 0, fill: 1, core: .7, coreThr: .4, gradMap: 'life', grad: gr('#ffffff', '#8fd8ff'), sizeCurve: cv(0, .1, .35, .8, 1, 1), visCurve: cv(0, 1, .4, .9, 1, 0), fadeV0: .4, fadeV1: .4, intensity: 3 }),
        L('particles', { name: 'Hit sparks', emit: 'burst', start: st, dur: .1, count: 60, pos: hitP, life: [.25, .6], speed: [0, 0], radial: [1.5, 5], drag: 3.5, size: [.03, .07], stretch: .04, sprite: 'streak', core: .6, grad: gr('#ffffff', '#8fd8ff', '#2f6bff'), sizeCurve: CURVES.down, intensity: 3.6 })
      ];
      p.layers.push(
        floorMask(),
        L('mesh', { name: 'Base seal', prim: 'disc', start: 0, dur: 3.4, pos: [0, .03, 0], size: [1.95, 1, 1.95], noise: 'sigil', tile: [6, 1], scroll: [.06, 0], cut: 0, fill: 0, soft: .08, gradMap: 'life', grad: gr('#8fd8ff', '#2fa3ff'), visCurve: life, fadeV0: 0, fadeV1: 0, intensity: 1.8 }),
        L('mesh', { name: 'Shell glow', prim: 'dome', start: 0, dur: 3.4, size: [1.76, 1.96, 1.76], noise: 'none', cut: 0, fill: 1, soft: .25, fresnel: .95, fresPow: 3, gradMap: 'life', grad: gr('#2fa3ff', '#8fd8ff'), sizeCurve: cv(0, 0, .12, 1.04, .2, 1, 1, 1), visCurve: life, fadeV0: 0, fadeV1: 0, intensity: .75 }),
        L('mesh', { name: 'Hex shell', prim: 'dome', start: 0, dur: 3.4, size: [1.74, 1.94, 1.74], spin: 12, noise: 'cells', tile: [12, 5], scroll: [0, .06], contrast: 1.6, cut: .3, fill: 0, soft: .012, edgeBoost: 1.4, fresnel: .25, fresPow: 1.4, gradMap: 'noise', grad: sh, sizeCurve: cv(0, 0, .12, 1.04, .2, 1, 1, 1), visCurve: life, fadeV0: .02, fadeV1: 0, intensity: 2.1 }),
        L('mesh', { name: 'Base ring', prim: 'ring', inner: .93, start: 0, dur: 3.4, pos: [0, .05, 0], size: [1.8, 1, 1.8], noise: 'none', cut: 0, fill: 1, core: .7, coreThr: .4, gradMap: 'life', grad: gr('#ffffff', '#8fd8ff'), sizeCurve: cv(0, 0, .12, 1.04, .2, 1, 1, 1), visCurve: life, fadeV0: .4, fadeV1: .4, intensity: 2.6 }),
        scan(.15), scan(1.75),
        L('particles', { name: 'Shell motes', start: 0, dur: 3.4, loop: true, count: 120, life: [.8, 1.6], shape: 'sphere', radius: 1.78, thickness: 0, shapeScale: [1, 1.1, 1], speed: [0, 0], orbit: .7, size: [.025, .06], sprite: 'diamond', halo: .4, flicker: .5, grad: gr('#ffffff', '#8fd8ff'), sizeCurve: CURVES.bell, intensity: 3 }),
        ...hit(1), ...hit(2.2)
      );
      return p;
    }
  },
  {
    name: 'Toxic Cloud', swatch: ['#123d14', '#6fd62f', '#eaff8a'], build() {
      const p = baseProject('Toxic Cloud', 3.6, { theta: .45, phi: 1.2, dist: 9.5, target: [0, 1.2, 0] });
      const life = cv(0, 0, .12, 1, .85, 1, 1, 0);
      p.layers.push(
        L('mesh', { name: 'Puddle', prim: 'disc', start: 0, dur: 3.6, pos: [0, .03, 0], size: [2, 1, 2], noise: 'waves', tile: [6, 2], scroll: [.05, -.25], contrast: 1.6, distort: .4, cut: .28, fill: .15, soft: .02, bands: 4, edgeBoost: .6, additive: .5, gradMap: 'noise', grad: gr('#123d14', '#4fae2a', '#b8f24a'), sizeCurve: cv(0, .3, .15, 1, 1, 1), visCurve: life, fadeV0: 0, fadeV1: .3, intensity: 1.5 }),
        L('mesh', { name: 'Warning ring', prim: 'ring', inner: .93, start: 0, dur: 3.6, pos: [0, .05, 0], size: [2.15, 1, 2.15], spin: -30, noise: 'dots', tile: [24, 1], scroll: [0, 0], contrast: 1.2, cut: .2, fill: .2, core: .4, gradMap: 'life', grad: gr('#eaff8a', '#8ae234'), visCurve: life, fadeV0: .2, fadeV1: .2, intensity: 2.2 }),
        L('mesh', { name: 'Fume column', prim: 'cylinder', taper: 1.5, start: .1, dur: 3.4, size: [1.1, 2.6, 1.1], noise: 'clouds', tile: [5, 1], scroll: [.15, .55], contrast: 1.2, distort: .6, cut: .4, fill: 0, soft: .08, additive: .7, gradMap: 'noise', grad: gr('#1d5a22', '#6fd62f', '#eaff8a'), visCurve: life, fadeV0: .05, fadeV1: .9, twist: .6, intensity: .9 }),
        L('particles', { name: 'Gas', start: 0, dur: 3.6, loop: true, count: 42, pos: [0, .5, 0], life: [1.6, 2.6], shape: 'ring', radius: 1.2, dir: [0, 1, 0], speed: [.15, .55], spread: 40, radial: [.1, .5], turbAmp: .2, size: [.45, .9], sprite: 'smoke', soft: .02, dissolve: .9, shade: .42, additive: .1, grad: gr('#b8f24a', '#4fae2a', '#1d5a22'), alphaCurve: cv(0, 0, .2, .85, .7, .7, 1, 0), sizeCurve: cv(0, .4, .5, 1, 1, 1), intensity: 1.1 }),
        L('particles', { name: 'Bubbles', start: 0, dur: 3.6, loop: true, count: 54, pos: [0, .1, 0], life: [.8, 1.7], shape: 'ring', radius: 1.3, dir: [0, 1, 0], speed: [.5, 1.4], spread: 10, turbAmp: .15, size: [.06, .17], sprite: 'ring', soft: .03, rotRand: 0, grad: gr('#eaff8a', '#8ae234'), alphaCurve: cv(0, 0, .15, 1, .9, 1, 1, 0), sizeCurve: cv(0, .3, .85, 1, 1, 1.0), intensity: 2.1 }),
        L('particles', { name: 'Spores', start: 0, dur: 3.6, loop: true, count: 110, pos: [0, .4, 0], life: [1.2, 2.2], shape: 'sphere', radius: 1.5, shapeScale: [1, .6, 1], dir: [0, 1, 0], speed: [.1, .6], spread: 60, orbit: .5, turbAmp: .3, size: [.02, .055], sprite: 'glow', soft: .3, flicker: .3, grad: gr('#ffffff', '#eaff8a', '#6fd62f'), sizeCurve: CURVES.bell, intensity: 3 })
      );
      setLook(p, 'Cel shade');
      return p;
    }
  },
  {
    name: 'Triple Slash', swatch: ['#5a0010', '#e8203a', '#ffd6d6'], build() {
      const p = baseProject('Triple Slash', 1.9, { theta: .12, phi: 1.12, dist: 8.8, target: [0, 1.25, 0] });
      const red = gr(0, '#5a0010', .4, '#d8102a', .78, '#ff8a8a', 1, '#ffffff');
      const arc = (name, tilt, flip, col) => makePath(name, [-100, -66, -33, 0, 33, 66, 100].map(a => { const x = Math.sin(a * D2R) * 1.9 * flip, z = Math.cos(a * D2R) * 1.7 - .3; return [x * Math.cos(tilt * D2R), 1.25 + x * Math.sin(tilt * D2R), z]; }), { color: col });
      const arcs = [arc('Cut 1', -38, 1, '#ff7ab6'), arc('Cut 2', 38, -1, '#ffd166'), arc('Cut 3', 4, 1, '#59e0ff')], starts = [.1, .34, .62];
      p.paths.push(...arcs);
      arcs.forEach((a, i) => {
        const big = i === 2, sw = { pathId: a.id, start: starts[i], pathEase: 'cubicOut' };
        p.layers.push(
          L('ribbon', Object.assign({ name: 'Blade ' + (i + 1), dur: big ? .9 : .7, travel: .28, tailDelay: .5, width: big ? 1.35 : 1, face: 'flat', noise: 'clouds', tile: [1.4, 2.4], scroll: [2.2, 0], contrast: 1.7, distort: .3, tile2: [1, 2], scroll2: [.8, 0], cut: .14, fill: .6, soft: .02, edgeBoost: 1, core: .85, coreThr: .72, grad: red, sizeCurve: cv(0, 0, .3, 1, 1, 0), visCurve: cv(0, 1, .38, 1, 1, 0), tailErode: .5, bias: .55, edgePow: 1.5, intensity: 2.2, additive: .9 }, sw)),
          L('ribbon', Object.assign({ name: 'Edge ' + (i + 1), dur: big ? .7 : .55, travel: .36, tailDelay: .34, width: big ? .15 : .11, face: 'flat', noise: 'none', cut: 0, fill: 1, core: 1, coreThr: .3, gradMap: 'life', grad: gr('#ffffff', '#ffb0b0'), sizeCurve: cv(0, 0, .25, 1, 1, 0), visCurve: CURVES.fade, tailErode: 0, intensity: 4.2 }, sw)),
          L('particles', Object.assign({ name: 'Sparks ' + (i + 1), dur: .22, count: big ? 240 : 150, alignPath: true, life: [.25, .6], dir: [0, 1, 0], speed: [2, 7], spread: 38, radial: [0, .6], drag: 3.2, gravity: 1.5, size: [.03, .075], stretch: .05, sprite: 'streak', core: .7, grad: gr('#ffffff', '#ff8a8a', '#d8102a'), sizeCurve: CURVES.down, intensity: 4 }, sw)),
          L('screen', { name: 'Hit ' + (i + 1), start: starts[i], dur: .2, flashColor: '#ffd0d0', flashAmt: big ? .14 : .07, shakeAmp: big ? .11 : .06, shakeFreq: 10 })
        );
      });
      p.layers.push(
        L('mesh', { name: 'Finisher burst', prim: 'spikes', inner: .1, spikes: 30, seed: 2, start: .72, dur: .34, pos: [0, 1.25, 1.2], size: [2.6, 2.6, 2.6], noise: 'none', cut: 0, fill: 1, core: .8, coreThr: .2, gradMap: 'v', grad: gr('#ffffff', '#ff8a8a', '#d8102a'), sizeCurve: cv(0, .1, .3, 1, 1, 1.1), visCurve: cv(0, 1, .35, 1, 1, 0), fadeV0: 0, fadeV1: .6, intensity: 3.4 }),
        L('particles', { name: 'Glints', emit: 'burst', burstSpread: .2, start: .7, dur: .3, count: 40, pos: [0, 1.25, .9], life: [.35, .85], shape: 'sphere', radius: 1.6, shapeScale: [1, .6, .4], speed: [0, 0], radial: [.2, 1], drag: 2, size: [.08, .24], sprite: 'star', soft: .03, halo: .5, spin: 3, flicker: .3, grad: gr('#ffffff', '#ffb0b0', '#e8203a'), sizeCurve: CURVES.bell, intensity: 3.4 })
      );
      return p;
    }
  },
  {
    name: 'Level Up', swatch: ['#8a5a06', '#ffd34d', '#ffffff'], build() {
      const p = baseProject('Level Up', 2.8, { theta: .42, phi: 1.22, dist: 10, target: [0, 1.5, 0] });
      p.figure = true;
      const rise = makePath('Rise', [[0, .1, 0], [0, 2.7, 0]], { color: '#ffd166' }); p.paths.push(rise);
      const gold = gr(0, '#b8700a', .45, '#ffc23d', .8, '#fff1b8', 1, '#ffffff'), top = [0, 2.5, 0], T0 = 1.05;
      const ring = (i, st) => L('mesh', { name: 'Rising ring ' + i, prim: 'ring', inner: .88, pathId: rise.id, start: st, dur: 1, pathEase: 'out', size: [1.25, 1, 1.25], noise: 'none', cut: 0, fill: 1, core: .6, coreThr: .4, gradMap: 'life', grad: gr('#ffffff', '#ffd34d'), sizeCurve: cv(0, .7, .4, 1, 1, .5), visCurve: cv(0, 0, .15, 1, .75, 1, 1, 0), fadeV0: .4, fadeV1: .4, intensity: 2.6 });
      p.layers.push(
        L('mesh', { name: 'Seal', prim: 'disc', start: 0, dur: 2.6, pos: [0, .03, 0], size: [1.7, 1, 1.7], spin: 40, noise: 'sigil', tile: [5, 1], scroll: [0, 0], cut: 0, fill: 0, soft: .08, gradMap: 'life', grad: gr('#fff1b8', '#ffc23d'), sizeCurve: cv(0, .3, .15, 1, 1, 1), visCurve: cv(0, 0, .1, 1, .8, 1, 1, 0), fadeV0: 0, fadeV1: 0, intensity: 2.2 }),
        L('mesh', { name: 'Light column', prim: 'cylinder', taper: 1.05, start: 0, dur: 2.2, size: [1.1, 3.1, 1.1], noise: 'streaks', tile: [12, .4], scroll: [.1, 1.6], contrast: 1.5, cut: .14, fill: .15, soft: .15, gradMap: 'noise', grad: gold, visCurve: cv(0, 0, .15, 1, .7, 1, 1, 0), fadeV0: .02, fadeV1: .9, intensity: 1.2 }),
        ring(1, 0), ring(2, .22), ring(3, .44),
        L('particles', { name: 'Rising sparkles', start: 0, dur: 1.3, count: 110, life: [.7, 1.3], shape: 'ring', radius: 1.05, dir: [0, 1, 0], speed: [1.2, 3], spread: 6, orbit: 2, size: [.04, .1], sprite: 'star', soft: .04, halo: .5, spin: 2, grad: gr('#ffffff', '#fff1b8', '#ffc23d'), sizeCurve: CURVES.bell, intensity: 3 }),
        L('screen', { name: 'Pop', start: T0, dur: .3, flashColor: '#fff3c4', flashAmt: .12, shakeAmp: .04, shakeFreq: 10 }),
        L('mesh', { name: 'Pop ring', prim: 'ring', inner: .8, facing: 'camera', start: T0, dur: .55, pos: top, size: [2.3, 1, 2.3], tile: [12, 1], scroll: [0, 1], cut: .2, fill: .45, core: .6, grad: gold, sizeCurve: cv(0, .05, .3, .8, 1, 1), visCurve: cv(0, 1, .3, .9, 1, 0), intensity: 2.8 }),
        L('mesh', { name: 'Pop rays', prim: 'spikes', inner: .14, spikes: 26, seed: 6, start: T0, dur: .4, pos: top, size: [2, 2, 2], noise: 'none', cut: 0, fill: 1, core: .8, coreThr: .2, gradMap: 'v', grad: gr('#ffffff', '#ffd34d', '#ff9a1f'), sizeCurve: cv(0, .1, .3, 1, 1, 1.1), visCurve: cv(0, 1, .35, 1, 1, 0), fadeV0: 0, fadeV1: .6, intensity: 3.2 }),
        L('particles', { name: 'Star burst', emit: 'burst', start: T0, dur: .1, count: 44, pos: top, life: [.6, 1.2], speed: [0, 0], radial: [2, 5.5], drag: 3, gravity: 1, size: [.1, .28], sprite: 'star', soft: .03, halo: .5, spin: 4, grad: gr('#ffffff', '#fff1b8', '#ffc23d'), sizeCurve: cv(0, .3, .2, 1, 1, 0), intensity: 3.2 }),
        L('particles', { name: 'Confetti', emit: 'burst', burstSpread: .08, start: T0, dur: .1, count: 150, pos: top, life: [1, 1.7], dir: [0, 1, 0], speed: [1.5, 5], spread: 55, radial: [.5, 2.6], gravity: 4.5, drag: 1.6, turbAmp: .2, size: [.04, .09], sprite: 'square', soft: .01, spin: 9, hueVar: .5, additive: .1, grad: gr('#ff4d7e', '#ff4d7e'), alphaCurve: cv(0, 1, .8, 1, 1, 0), sizeCurve: CURVES.flat, intensity: 1.5 })
      );
      return p;
    }
  },
  {
    name: 'Black Hole', swatch: ['#000000', '#d84a0c', '#fff3c4'], build() {
      const p = baseProject('Black Hole', 4, { theta: .3, phi: 1.2, dist: 9.5, target: [0, 1.6, 0] });
      const c = [0, 1.6, 0], tilt = [16, 0, 9], life = cv(0, 0, .12, 1, .86, 1, 1, 0);
      const acc = gr(0, '#3a0a00', .35, '#d84a0c', .7, '#ffb02e', 1, '#fff3c4');
      const jet = (name, rot) => L('mesh', { name, prim: 'cylinder', taper: .15, start: .2, dur: 3.6, pos: c, rot, size: [.11, 2.5, .11], noise: 'streaks', tile: [4, .5], scroll: [0, 3], contrast: 1.4, cut: .1, fill: .5, soft: .1, core: .8, coreThr: .5, gradMap: 'noise', grad: gr('#2f4bff', '#8fc8ff', '#ffffff'), visCurve: life, fadeV0: .1, fadeV1: .7, intensity: 2.2 });
      p.layers.push(
        L('mesh', { name: 'Lensing halo', prim: 'sphere', start: 0, dur: 4, pos: c, size: [1.3, 1.3, 1.3], noise: 'none', cut: 0, fill: 1, soft: .3, fresnel: .97, fresPow: 3.5, gradMap: 'life', grad: gr('#ff8a1f', '#ffb02e'), visCurve: life, fadeV0: 0, fadeV1: 0, intensity: .5 }),
        jet('Jet up', tilt), jet('Jet down', [tilt[0] + 180, 0, -tilt[2]]),
        L('mesh', { name: 'Accretion disc', prim: 'disc', start: 0, dur: 4, pos: c, rot: tilt, size: [2.5, 1, 2.5], noise: 'flames', tile: [4, 1.2], scroll: [.55, -.45], contrast: 1.5, distort: .5, tile2: [3, 1], scroll2: [-.2, -.3], skew: 3, cut: .24, fill: .05, soft: .03, bands: 5, edgeBoost: .6, grad: acc, sizeCurve: cv(0, 0, .15, 1, .86, 1, 1, 0), visCurve: life, fadeV0: .32, fadeV1: .2, intensity: 2.1, additive: .85 }),
        L('particles', { name: 'Infall', start: 0, dur: 4, loop: true, count: 280, pos: c, rot: tilt, life: [.8, 1.6], shape: 'ring', radius: 2.8, thickness: .3, speed: [0, 0], orbit: 3.6, converge: .93, size: [.03, .085], stretch: .035, sprite: 'streak', core: .5, grad: gr('#d84a0c', '#ffb02e', '#ffffff'), alphaCurve: cv(0, 0, .2, 1, 1, 1), sizeCurve: cv(0, .4, .5, 1, 1, .2), intensity: 3.2 }),
        L('occluder', { name: 'Event horizon', shape: 'sphere', size: [.66, .66, .66], pos: [0, 1.27, 0], ghost: false, always: true }),
        L('mesh', { name: 'Photon ring', prim: 'ring', inner: .84, facing: 'camera', start: 0, dur: 4, pos: c, size: [.43, 1, .43], noise: 'none', cut: 0, fill: 1, soft: .1, core: .9, coreThr: .3, gradMap: 'life', grad: gr('#fff3c4', '#ffb02e'), sizeCurve: cv(0, 0, .15, 1, .86, 1, 1, 0), visCurve: life, fadeV0: .45, fadeV1: .45, intensity: 3.2 })
      );
      return p;
    }
  },
  {
    name: 'Dash Trail', swatch: ['#0b3a8a', '#3fe0d0', '#ffffff'], build() {
      const p = baseProject('Dash Trail', 1.7, { theta: .22, phi: 1.3, dist: 10.5, target: [0, 1.1, 0] });
      const dash = makePath('Dash', [[-3.6, 1, .4], [0, 1, 0], [3.4, 1, -.3]], { color: '#59e0ff' }); p.paths.push(dash);
      const aq = gr(0, '#0b3a8a', .4, '#1fb8c8', .75, '#8ffff0', 1, '#ffffff');
      const sw = { pathId: dash.id, start: .15, pathEase: 'expoOut' };
      const edge = y => L('ribbon', Object.assign({ name: y > 0 ? 'Top edge' : 'Low edge', dur: .8, travel: .3, tailDelay: .28, pos: [0, y, 0], width: .06, noise: 'none', cut: 0, fill: 1, core: .9, coreThr: .3, gradMap: 'life', grad: gr('#ffffff', '#8ffff0'), sizeCurve: cv(0, 1, 1, 0), tailErode: .2, intensity: 3 }, sw));
      p.layers.push(
        L('particles', { name: 'Dust kick', emit: 'burst', burstSpread: .08, start: .15, dur: .1, count: 16, pos: [-3.5, .25, .4], life: [.7, 1.2], shape: 'ring', radius: .4, dir: [-1, .4, 0], speed: [.5, 2], spread: 40, radial: [.3, 1.2], drag: 2.5, size: [.35, .7], sprite: 'smoke', soft: .02, dissolve: 1, shade: .4, additive: 0, grad: gr('#c9d6e0', '#6a7a8a', '#2a3038'), alphaCurve: cv(0, .9, .6, .7, 1, 0), sizeCurve: cv(0, .3, .3, 1, 1, 1), intensity: 1 }),
        L('ribbon', Object.assign({ name: 'Afterimage', dur: .95, travel: .24, tailDelay: .36, width: 1.8, face: 'upright', noise: 'clouds', tile: [.5, 6], scroll: [3, 0], contrast: 1.6, cut: .24, fill: .1, soft: .02, edgeBoost: .6, core: .6, coreThr: .7, gradMap: 'noise', grad: aq, sizeCurve: cv(0, 1, .6, .8, 1, .2), visCurve: cv(0, 1, .5, 1, 1, 0), tailErode: .6, edgePow: 3, intensity: 2 }, sw)),
        L('ribbon', Object.assign({ name: 'Core streak', dur: .8, travel: .28, tailDelay: .3, width: .2, noise: 'none', cut: 0, fill: 1, core: 1, coreThr: .3, gradMap: 'life', grad: gr('#ffffff', '#8ffff0', '#1fb8c8'), sizeCurve: cv(0, 1, 1, 0), tailErode: .2, intensity: 3.6 }, sw)),
        edge(.7), edge(-.7),
        L('mesh', { name: 'Launch ring', prim: 'ring', inner: .84, alignPath: true, pathId: dash.id, pathFrom: .03, pathTo: .03, start: .15, dur: .42, size: [1.9, 1, 1.9], tile: [12, 1], scroll: [0, 1.4], cut: .2, fill: .45, core: .6, grad: aq, sizeCurve: cv(0, .1, .3, .8, 1, 1), visCurve: cv(0, 1, .3, 1, 1, 0), intensity: 2.8 }),
        L('mesh', { name: 'Mid ring', prim: 'ring', inner: .9, alignPath: true, pathId: dash.id, pathFrom: .45, pathTo: .45, start: .2, dur: .42, size: [1.4, 1, 1.4], noise: 'none', cut: 0, fill: 1, core: .6, coreThr: .4, gradMap: 'life', grad: gr('#ffffff', '#8ffff0'), sizeCurve: cv(0, .1, .3, .8, 1, 1), visCurve: cv(0, 1, .3, 1, 1, 0), fadeV0: .4, fadeV1: .4, intensity: 2.4 }),
        L('particles', Object.assign({ name: 'Speed sparks', dur: .3, count: 200, alignPath: true, life: [.25, .6], dir: [0, -1, 0], speed: [1, 5], spread: 25, radial: [.2, 1.4], drag: 3, size: [.03, .07], stretch: .05, sprite: 'streak', core: .6, grad: gr('#ffffff', '#8ffff0', '#1f8bd8'), sizeCurve: CURVES.down, intensity: 3.6 }, sw)),
        L('screen', { name: 'Kick', start: .15, dur: .2, flashColor: '#cffff8', flashAmt: .06, shakeAmp: .07, shakeFreq: 11 }),
        L('mesh', { name: 'Arrival burst', prim: 'spikes', inner: .14, spikes: 22, seed: 3, pathId: dash.id, pathFrom: 1, pathTo: 1, start: .4, dur: .32, size: [1.5, 1.5, 1.5], noise: 'none', cut: 0, fill: 1, core: .8, coreThr: .2, gradMap: 'v', grad: gr('#ffffff', '#8ffff0', '#1fb8c8'), sizeCurve: cv(0, .1, .3, 1, 1, 1.1), visCurve: cv(0, 1, .35, 1, 1, 0), fadeV0: 0, fadeV1: .6, intensity: 3.2 }),
        L('particles', { name: 'Arrival glints', pathId: dash.id, pathFrom: 1, pathTo: 1, emit: 'burst', burstSpread: .1, start: .42, dur: .1, count: 22, life: [.4, .9], speed: [0, 0], radial: [.4, 1.6], drag: 2, size: [.08, .2], sprite: 'star', soft: .03, halo: .5, spin: 3, flicker: .3, grad: gr('#ffffff', '#8ffff0'), sizeCurve: CURVES.bell, intensity: 3.2 })
      );
      return p;
    }
  },
  {
    name: 'Tidal Geyser', swatch: ['#0b3a8a', '#1fa3d8', '#dffbff'], build() {
      const p = baseProject('Tidal Geyser', 3.2, { theta: .45, phi: 1.25, dist: 12, target: [0, 2.1, 0] });
      const wa = gr(0, '#0b3a8a', .4, '#1fa3d8', .75, '#9ff3ff', 1, '#ffffff');
      const ripple = (i, st) => L('mesh', { name: 'Ripple ' + i, prim: 'ring', inner: .9, start: st, dur: .9, pos: [0, .05, 0], size: [4, 1, 4], noise: 'none', cut: 0, fill: 1, core: .5, coreThr: .5, gradMap: 'life', grad: gr('#ffffff', '#59c8ff'), sizeCurve: cv(0, .1, .4, .75, 1, 1), visCurve: cv(0, 1, .3, .8, 1, 0), fadeV0: .45, fadeV1: .45, intensity: 2 });
      p.layers.push(
        L('mesh', { name: 'Pool', prim: 'disc', start: 0, dur: 3.2, pos: [0, .03, 0], size: [2.3, 1, 2.3], noise: 'waves', tile: [6, 2.5], scroll: [.06, -.5], contrast: 1.7, distort: .3, cut: .3, fill: .1, soft: .02, bands: 4, additive: .6, gradMap: 'noise', grad: wa, sizeCurve: cv(0, .3, .12, 1, 1, 1), visCurve: cv(0, 0, .08, 1, .82, 1, 1, 0), fadeV0: 0, fadeV1: .35, intensity: 1.5 }),
        ripple(1, .2), ripple(2, .6), ripple(3, 1.2),
        L('mesh', { name: 'Water column', prim: 'cylinder', taper: .7, start: .2, dur: 2.7, size: [.75, 4.3, .75], noise: 'waves', tile: [4, 1.5], scroll: [.3, 2.4], contrast: 1.6, distort: .45, tile2: [3, 1], scroll2: [0, 1.6], cut: .28, fill: .16, soft: .025, bands: 4, edgeBoost: .6, core: .45, coreThr: .8, twist: .8, wobble: .1, wobTile: 3, wobSpeed: 2, additive: .5, gradMap: 'noise', grad: wa, sizeCurve: cv(0, .12, .18, 1, .75, 1, 1, .25), visCurve: cv(0, 1, .72, 1, 1, 0), fadeV0: .03, fadeV1: .45, intensity: 1.6 }),
        L('mesh', { name: 'Inner jet', prim: 'cylinder', taper: .5, start: .22, dur: 2.5, size: [.36, 4.5, .36], noise: 'streaks', tile: [6, .5], scroll: [0, 3.5], contrast: 1.5, cut: .12, fill: .4, soft: .06, core: .8, coreThr: .55, gradMap: 'noise', grad: gr('#59c8ff', '#dffbff', '#ffffff'), sizeCurve: cv(0, .12, .18, 1, .75, 1, 1, .25), visCurve: cv(0, 1, .72, 1, 1, 0), fadeV0: .02, fadeV1: .5, intensity: 1.8 }),
        L('mesh', { name: 'Crown splash', prim: 'cylinder', taper: 2.3, start: .2, dur: .95, size: [.95, 1.2, .95], noise: 'waves', tile: [8, 1], scroll: [.2, 1.6], contrast: 1.5, distort: .4, cut: .32, fill: .05, soft: .025, bands: 4, core: .4, coreThr: .8, additive: .5, gradMap: 'noise', grad: wa, sizeCurve: cv(0, .2, .3, 1, 1, 1.15), visCurve: cv(0, 1, .35, 1, 1, 0), fadeV0: .03, fadeV1: .7, intensity: 1.6 }),
        L('particles', { name: 'Base foam', start: .2, dur: 2.4, count: 44, pos: [0, .25, 0], life: [.7, 1.2], shape: 'ring', radius: .9, dir: [0, 1, 0], speed: [.2, .8], spread: 50, radial: [.6, 1.8], drag: 2, size: [.3, .6], sprite: 'smoke', soft: .03, dissolve: .9, shade: .25, additive: .35, grad: gr('#ffffff', '#9fdcff', '#2f6bb8'), alphaCurve: cv(0, .8, .5, .6, 1, 0), sizeCurve: cv(0, .3, .3, 1, 1, 1), intensity: 1.1 }),
        L('particles', { name: 'Droplets', start: .35, dur: 2.1, count: 300, pos: [0, 3.9, 0], life: [.7, 1.4], shape: 'ring', radius: .4, dir: [0, 1, 0], speed: [1, 3.6], spread: 50, radial: [.3, 1.6], gravity: 8.5, drag: .3, size: [.035, .1], stretch: .025, sprite: 'disc', soft: .05, core: .6, grad: gr('#ffffff', '#9ff3ff', '#1fa3d8'), sizeCurve: cv(0, .6, .2, 1, 1, .4), intensity: 2.6 }),
        L('particles', { name: 'Mist', start: .3, dur: 2.2, count: 90, pos: [0, 3.6, 0], life: [.8, 1.5], shape: 'sphere', radius: .7, speed: [.1, .8], dir: [0, 1, 0], spread: 90, turbAmp: .3, size: [.05, .14], sprite: 'glow', soft: .5, grad: gr('#ffffff', '#bfeeff'), alphaCurve: cv(0, 0, .2, .7, 1, 0), sizeCurve: cv(0, .4, 1, 1), intensity: 1.6 })
      );
      return p;
    }
  },
  {
    name: 'Manga Impact', swatch: ['#15131c', '#8a8578', '#efe6d2'], build() {
      const p = baseProject('Manga Impact', 1.9, { theta: .3, phi: 1.25, dist: 10, target: [0, 1.4, 0] });
      const c = [0, 1.2, 0], T0 = .3, wh = gr('#ffffff', '#ffffff'), INK = '#15131c';
      p.layers.push(
        L('particles', { name: 'Wind-up', start: 0, dur: .28, count: 130, pos: c, life: [.16, .28], shape: 'sphere', radius: 2.4, thickness: .3, speed: [0, 0], converge: 1, size: [.03, .07], stretch: .05, sprite: 'streak', grad: wh, alphaCurve: cv(0, 0, .3, 1, 1, 1), sizeCurve: CURVES.flat, intensity: 2 }),
        L('screen', { name: 'Shake', start: T0, dur: .5, flashColor: '#ffffff', flashAmt: 0, shakeAmp: .26, shakeFreq: 9 }),
        L('particles', { name: 'Dust puffs', emit: 'burst', burstSpread: .06, start: T0 + .04, dur: .1, count: 16, pos: [0, .9, 0], life: [.9, 1.4], shape: 'sphere', radius: .5, speed: [0, .4], radial: [1, 2.6], drag: 2.2, size: [.4, .8], sprite: 'smoke', soft: .01, dissolve: 1, shade: .5, additive: 0, grad: gr('#d8d8d8', '#9a9a9a', '#5a5a5a'), alphaCurve: cv(0, 1, .7, 1, 1, 0), sizeCurve: cv(0, .3, .25, 1, 1, 1), intensity: 1 }),
        L('mesh', { name: 'Shock ring', prim: 'ring', inner: .955, facing: 'camera', start: T0, dur: .5, pos: c, size: [3.8, 1, 3.8], noise: 'none', cut: 0, fill: 1, soft: .005, gradMap: 'life', grad: wh, sizeCurve: cv(0, .1, .35, .8, 1, 1), visCurve: cv(0, 1, .5, 1, 1, 0), fadeV0: .5, fadeV1: .5, intensity: 2 }),
        L('mesh', { name: 'Comic star', prim: 'burst', inner: .3, spikes: 13, seed: 4, facing: 'camera', start: T0, dur: 1, pos: c, size: [2.3, 1, 2.3], noise: 'none', cut: 0, fill: 1, soft: .004, gradMap: 'life', grad: wh, sizeCurve: cv(0, .2, .1, 1.1, .22, 1, 1, 1), visCurve: cv(0, 1, .7, 1, 1, 0), fadeV0: 0, fadeV1: 0, intensity: 2 }),
        L('mesh', { name: 'Burst spikes', prim: 'spikes', inner: .16, spikes: 34, seed: 8, start: T0, dur: .6, pos: c, size: [3.6, 3.6, 3.6], noise: 'none', cut: 0, fill: 1, soft: .004, gradMap: 'life', grad: wh, sizeCurve: cv(0, .2, .14, 1, 1, 1.08), visCurve: cv(0, 1, .45, 1, 1, 0), fadeV0: 0, fadeV1: .3, intensity: 2 }),
        L('particles', { name: 'Chips', emit: 'burst', start: T0, dur: .1, count: 70, pos: c, life: [.5, 1.1], speed: [0, 2], dir: [0, 1, 0], spread: 60, radial: [3, 9], gravity: 6, drag: 2, size: [.05, .15], sprite: 'shard', soft: .005, spin: 8, grad: wh, sizeCurve: CURVES.down, intensity: 2 }),
        L('particles', { name: 'Streaks', emit: 'burst', start: T0, dur: .1, count: 90, pos: c, life: [.3, .6], speed: [0, 0], radial: [5, 12], drag: 3, size: [.03, .06], stretch: .06, sprite: 'streak', grad: wh, sizeCurve: CURVES.down, intensity: 2 }),
        L('text', { name: 'SFX ドン!', text: 'ドン!', start: T0 + .02, dur: 1.45, pos: [1.9, 2.75, .4], scale: 1.15, skew: 10, chaos: .35, seed: 3, fill: '#ffffff', stroke: '#000000', strokeW: .1, shake: .05, bright: 1.4 }),
        L('manga', { name: 'Screentone', mode: 'tone', start: T0, dur: 1.5, color: INK, opacity: .55, angle: -90, grad: [.55, 1.15], dotSize: 1, visCurve: cv(0, 1, .7, 1, 1, 0) }),
        L('manga', { name: 'Focus lines', mode: 'focus', start: T0, dur: 1.5, color: INK, anchor: 'world', pos: c, density: 170, inner: .6, innerVar: .4, thick: .55, skip: .2, rate: 12, visCurve: cv(0, 1, .7, 1, 1, 0) }),
        L('manga', { name: 'Impact frame', mode: 'impact', start: T0, dur: .1, color: '#0c0b10', color2: '#f3efe6', thr: .5, invert: true })
      );
      setLook(p, 'Ink & paper');
      return p;
    }
  },
  {
    name: 'Speed Rush', swatch: ['#1b1a22', '#9a968c', '#f3efe6'], build() {
      const p = baseProject('Speed Rush', 2, { theta: .15, phi: 1.3, dist: 10.5, target: [0, 1.15, 0] });
      const dash = makePath('Dash', [[-3.6, 1, .3], [0, 1.05, 0], [3.4, 1, -.3]], { color: '#59e0ff' }); p.paths.push(dash);
      const wh = gr('#ffffff', '#ffffff'), INK = '#1b1a22';
      p.layers.push(L('manga', { name: 'Speed lines', mode: 'speed', start: 0, dur: 2, color: INK, opacity: .9, angle: 0, density: 46, thick: .5, inner: .3, skip: .25, scroll: 6, rate: 0, visCurve: cv(0, 0, .08, 1, .9, 1, 1, 0) }));
      [[.15, 'シュッ', [-1.2, 2.5, 0]], [1.05, 'ザッ', [1, 2.6, 0]]].forEach(([st, word, tp], i) => {
        const sw = { pathId: dash.id, start: st, pathEase: 'expoOut' };
        p.layers.push(
          L('particles', { name: 'Dust kick ' + (i + 1), emit: 'burst', burstSpread: .06, start: st, dur: .1, count: 12, pos: [-3.5, .3, .3], life: [.6, 1], shape: 'ring', radius: .4, dir: [-1, .4, 0], speed: [.5, 2], spread: 40, radial: [.3, 1.2], drag: 2.5, size: [.35, .7], sprite: 'smoke', soft: .01, dissolve: 1, shade: .5, additive: 0, grad: gr('#d8d8d8', '#8a8a8a', '#505050'), alphaCurve: cv(0, 1, .7, 1, 1, 0), sizeCurve: cv(0, .3, .3, 1, 1, 1), intensity: 1 }),
          L('ribbon', Object.assign({ name: 'Brush trail ' + (i + 1), dur: .8, travel: .26, tailDelay: .36, width: 1.5, face: 'upright', noise: 'clouds', tile: [.5, 6], scroll: [3, 0], contrast: 2, cut: .34, fill: .1, soft: .005, core: 0, edgeBoost: 0, gradMap: 'life', grad: wh, sizeCurve: cv(0, 1, .6, .8, 1, .1), visCurve: cv(0, 1, .5, 1, 1, 0), tailErode: .7, edgePow: 3, intensity: 2 }, sw)),
          L('ribbon', Object.assign({ name: 'Core line ' + (i + 1), dur: .7, travel: .3, tailDelay: .3, width: .22, noise: 'none', cut: 0, fill: 1, soft: .005, gradMap: 'life', grad: wh, sizeCurve: cv(0, 1, 1, 0), tailErode: .2, intensity: 2 }, sw)),
          L('particles', Object.assign({ name: 'Flecks ' + (i + 1), dur: .3, count: 110, alignPath: true, life: [.25, .55], dir: [0, -1, 0], speed: [1, 5], spread: 25, radial: [.2, 1.4], drag: 3, size: [.03, .07], stretch: .05, sprite: 'streak', grad: wh, sizeCurve: CURVES.down, intensity: 2 }, sw)),
          L('mesh', { name: 'Arrival star ' + (i + 1), prim: 'burst', inner: .3, spikes: 11, seed: 2 + i, facing: 'camera', pathId: dash.id, pathFrom: 1, pathTo: 1, start: st + .24, dur: .4, size: [1.3, 1, 1.3], noise: 'none', cut: 0, fill: 1, soft: .004, gradMap: 'life', grad: wh, sizeCurve: cv(0, .2, .2, 1.1, .4, 1, 1, 1), visCurve: cv(0, 1, .6, 1, 1, 0), fadeV0: 0, fadeV1: 0, intensity: 2 }),
          L('text', { name: 'SFX ' + word, text: word, start: st + .05, dur: .8, pos: tp, scale: .8, skew: 16, chaos: .25, seed: 2 + i, fill: '#ffffff', stroke: '#000000', strokeW: .1, shake: .04 })
        );
      });
      setLook(p, 'Manga tone');
      return p;
    }
  },
  {
    name: 'Menace Aura', swatch: ['#0c0b10', '#5a5866', '#f3efe6'], build() {
      const p = baseProject('Menace Aura', 3.6, { theta: .4, phi: 1.25, dist: 9.5, target: [0, 1.5, 0] });
      p.figure = true;
      const life = cv(0, 0, .1, 1, .88, 1, 1, 0), wh = gr('#ffffff', '#ffffff'), INK = '#1b1a22';
      p.layers.push(
        L('manga', { name: 'Dread tone', mode: 'tone', start: 0, dur: 3.6, color: INK, opacity: .6, angle: 90, grad: [.45, 1.2], dotSize: 1.1, visCurve: life }),
        L('manga', { name: 'Rising lines', mode: 'speed', start: 0, dur: 3.6, color: INK, opacity: .4, angle: 90, density: 34, thick: .4, inner: .45, skip: .4, scroll: 2, rate: 0, visCurve: life }),
        L('screen', { name: 'Rumble', start: .1, dur: 3.4, flashColor: '#ffffff', flashAmt: 0, shakeAmp: .03, shakeFreq: 13, visCurve: cv(0, 0, .15, 1, .85, 1, 1, 0) }),
        L('mesh', { name: 'Ground cracks', prim: 'disc', start: 0, dur: 3.6, pos: [0, .03, 0], size: [2.2, 1, 2.2], noise: 'flames', tile: [10, 1], scroll: [.04, .1], contrast: 2.4, cut: .42, fill: 0, soft: .01, gradMap: 'life', grad: wh, sizeCurve: cv(0, .3, .2, 1, 1, 1), visCurve: life, fadeV0: .1, fadeV1: .4, intensity: 1.8 }),
        L('mesh', { name: 'Aura flames', prim: 'cylinder', taper: 1.35, start: 0, dur: 3.6, size: [.95, 3.2, .95], noise: 'clouds', tile: [6, .8], scroll: [.25, 1.3], contrast: 1.2, distort: .7, tile2: [3, 1], scroll2: [-.2, .9], twist: .8, cut: .32, fill: 0, soft: .01, bands: 3, edgeBoost: 0, gradMap: 'noise', grad: gr('#4a4a4a', '#8a8a8a', '#d0d0d0'), sizeCurve: cv(0, .3, .15, 1, 1, 1), visCurve: life, fadeV0: .03, fadeV1: .95, additive: .3, intensity: .8 }),
        L('particles', { name: 'Floating rubble', start: 0, dur: 3.6, loop: true, count: 26, pos: [0, .1, 0], life: [1.6, 2.6], shape: 'ring', radius: 1.6, thickness: .6, dir: [0, 1, 0], speed: [.3, .9], spread: 6, turbAmp: .1, size: [.06, .17], sprite: 'shard', soft: .005, spin: 2, grad: wh, alphaCurve: cv(0, 0, .15, 1, .8, 1, 1, 0), sizeCurve: CURVES.flat, intensity: 1.8 }),
        L('particles', { name: 'Flecks', start: 0, dur: 3.6, loop: true, count: 90, pos: [0, .2, 0], life: [.8, 1.6], shape: 'ring', radius: 1.1, dir: [0, 1, 0], speed: [1, 2.8], spread: 8, orbit: 1, size: [.02, .05], stretch: .04, sprite: 'streak', grad: wh, sizeCurve: CURVES.bell, intensity: 2 })
      );
      [[-2, 1.1, .2, .2, .7], [-1.75, 2.35, 0, .7, .9], [1.8, 1.6, .2, 1.2, .8], [2.05, 2.9, 0, 1.7, 1.05]].forEach(([x, y, z, st, sc], i) => p.layers.push(
        L('text', { name: 'ゴ ' + (i + 1), text: 'ゴ', start: st, dur: +(3.5 - st).toFixed(2), pos: [x, y, z], scale: sc, skew: -6, chaos: .2, seed: 4 + i, fill: '#ffffff', stroke: '#000000', strokeW: .1, shake: .07, shakeRate: 10, visCurve: cv(0, 1, .85, 1, 1, 0) })));
      setLook(p, 'Manga tone');
      return p;
    }
  },
  {
    name: 'Ink Slash', swatch: ['#15131c', '#6a6558', '#efe6d2'], build() {
      const p = baseProject('Ink Slash', 1.7, { theta: .2, phi: .9, dist: 8.2, target: [0, 1.15, 0] });
      const arc = makePath('Stroke', [-105, -70, -35, 0, 35, 70, 105].map(a => [Math.sin(a * D2R) * 1.95, 1.15 + Math.sin(a * D2R) * .5, Math.cos(a * D2R) * 1.95 - .4]), { color: '#59e0ff' }); p.paths.push(arc);
      const wh = gr('#ffffff', '#ffffff'), sw = { pathId: arc.id, start: .14, pathEase: 'cubicOut' }, INK = '#15131c';
      p.layers.push(
        L('ribbon', Object.assign({ name: 'Dry brush', dur: 1.2, travel: .26, tailDelay: .62, width: 1.8, face: 'flat', noise: 'clouds', tile: [.6, 9], scroll: [.6, 0], contrast: 2.2, cut: .5, fill: 0, soft: .005, core: 0, edgeBoost: 0, gradMap: 'life', grad: wh, sizeCurve: cv(0, 0, .3, 1, 1, .15), visCurve: cv(0, 1, .55, 1, 1, 0), tailErode: .5, bias: .3, edgePow: 2.5, intensity: 1.6 }, sw)),
        L('ribbon', Object.assign({ name: 'Brush stroke', dur: 1.2, travel: .26, tailDelay: .62, width: 1.15, face: 'flat', noise: 'clouds', tile: [1.2, 3], scroll: [.8, 0], contrast: 2, cut: .2, fill: .55, soft: .005, core: 0, edgeBoost: 0, gradMap: 'life', grad: wh, sizeCurve: cv(0, 0, .25, 1, 1, .1), visCurve: cv(0, 1, .55, 1, 1, 0), tailErode: .7, bias: .4, edgePow: 1.6, intensity: 2 }, sw)),
        L('particles', Object.assign({ name: 'Ink splatter', dur: .24, count: 110, alignPath: true, life: [.5, 1.1], dir: [0, 1, 0], speed: [1, 5.5], spread: 42, radial: [.3, 2.2], gravity: 4.5, drag: 1.6, size: [.025, .13], sprite: 'disc', soft: .005, grad: wh, sizeCurve: cv(0, 1, .7, 1, 1, .5), intensity: 2 }, sw)),
        L('particles', { name: 'Drips', pathId: arc.id, emitMode: 'along', emit: 'burst', burstSpread: .15, start: .3, dur: .2, count: 18, life: [.6, 1.1], speed: [0, 0], gravity: 5, drag: .5, size: [.04, .1], sprite: 'drop', soft: .005, rotRand: 0, grad: wh, sizeCurve: cv(0, .5, .2, 1, 1, .6), intensity: 2 }),
        L('screen', { name: 'Shake', start: .14, dur: .3, flashColor: '#ffffff', flashAmt: 0, shakeAmp: .12, shakeFreq: 10 }),
        L('text', { name: 'SFX 斬', text: '斬', start: .34, dur: 1.2, pos: [1.9, 2.45, -.2], scale: 1.35, skew: 0, chaos: .1, fill: '#ffffff', stroke: '#000000', strokeW: .08, shake: .03 }),
        L('manga', { name: 'Cut lines', mode: 'speed', start: .14, dur: .6, color: INK, opacity: .85, angle: -16, density: 60, thick: .45, inner: .2, skip: .3, scroll: 8, rate: 0, visCurve: cv(0, 1, .5, 1, 1, 0) }),
        L('manga', { name: 'Impact frame', mode: 'impact', start: .14, dur: .08, color: '#0c0b10', color2: '#f3efe6', thr: .5, invert: true })
      );
      setLook(p, 'Ink & paper');
      return p;
    }
  },
  {
    name: 'Fury Mark', swatch: ['#1b1a22', '#b8423a', '#f3efe6'], build() {
      const p = baseProject('Fury Mark', 2.8, { theta: .35, phi: 1.25, dist: 7.2, target: [0, 1.45, 0] });
      p.figure = true;
      const wh = gr('#ffffff', '#ffffff'), INK = '#1b1a22', head = [0, 1.75, 0];
      const pulse = cv(0, 0, .06, 1, .2, .78, .32, 1, .46, .78, .58, 1, .72, .78, .86, 1, 1, 0);
      p.layers.push(
        L('manga', { name: 'Tension lines', mode: 'focus', start: .15, dur: 2.5, color: INK, opacity: .9, anchor: 'world', pos: head, density: 170, inner: .85, innerVar: .3, thick: .4, skip: .3, rate: 8, visCurve: cv(0, 0, .08, 1, .85, 1, 1, 0) }),
        L('screen', { name: 'Tremble', start: .2, dur: 2.3, flashColor: '#ffffff', flashAmt: 0, shakeAmp: .02, shakeFreq: 16, visCurve: cv(0, 0, .1, 1, .85, 1, 1, 0) }),
        L('particles', { name: 'Steam', start: .3, dur: 2.2, count: 16, pos: [0, 1.95, 0], life: [.6, 1], shape: 'ring', radius: .12, dir: [0, 1, 0], speed: [.9, 1.8], spread: 38, size: [.16, .32], sprite: 'smoke', soft: .01, dissolve: .9, shade: .4, additive: 0, grad: gr('#e8e8e8', '#b0b0b0', '#7a7a7a'), alphaCurve: cv(0, 1, .6, 1, 1, 0), sizeCurve: cv(0, .3, .4, 1, 1, 1), intensity: 1 }),
        L('particles', { name: 'Anger vein', emit: 'burst', start: .2, dur: .1, count: 1, pos: [.5, 1.95, .3], life: [2.3, 2.3], speed: [0, 0], size: [.36, .36], sprite: 'vein', soft: .005, rotRand: 0, grad: wh, sizeCurve: pulse, intensity: 2.2 }),
        L('particles', { name: 'Second vein', emit: 'burst', start: .7, dur: .1, count: 1, pos: [-.48, 1.6, .35], life: [1.8, 1.8], speed: [0, 0], size: [.24, .24], sprite: 'vein', soft: .005, rotRand: .12, seed: 3, grad: wh, sizeCurve: pulse, intensity: 2.2 }),
        L('particles', { name: 'Sparks', start: .3, dur: 2, count: 30, pos: head, life: [.3, .55], shape: 'sphere', radius: .5, thickness: 0, speed: [0, 0], radial: [1, 2.6], drag: 3, size: [.03, .06], stretch: .05, sprite: 'streak', grad: wh, sizeCurve: CURVES.down, intensity: 2 }),
        L('text', { name: 'SFX ムカッ', text: 'ムカッ', start: .3, dur: 2.2, pos: [-1.55, 2.35, 0], scale: .55, skew: -8, chaos: .3, seed: 5, fill: '#ffffff', stroke: '#000000', strokeW: .1, shake: .06, shakeRate: 10, visCurve: cv(0, 1, .85, 1, 1, 0) })
      );
      setLook(p, 'Manga tone');
      return p;
    }
  },
  {
    name: 'Heart Flutter', swatch: ['#d6457f', '#ff9cc8', '#fff1f6'], build() {
      const p = baseProject('Heart Flutter', 3.2, { theta: .35, phi: 1.25, dist: 7.6, target: [0, 1.5, 0] });
      p.figure = true;
      const pink = gr('#ffffff', '#ffb7d8', '#ff5c9d'), life = cv(0, 0, .1, 1, .88, 1, 1, 0);
      p.layers.push(
        L('manga', { name: 'Sunburst', mode: 'burst', start: 0, dur: 3.2, color: '#ff9cc8', opacity: .12, density: 14, thick: .5, inner: 0, scroll: .12, anchor: 'world', pos: [0, 1.5, 0], visCurve: life }),
        L('manga', { name: 'Pink tone', mode: 'tone', start: 0, dur: 3.2, color: '#ff7ab6', opacity: .35, angle: 90, grad: [.55, 1.3], dotSize: 1.2, visCurve: life }),
        L('mesh', { name: 'Glow ring', prim: 'disc', start: 0, dur: 3.2, pos: [0, .03, 0], size: [1.6, 1, 1.6], noise: 'waves', tile: [5, 1.5], scroll: [.08, -.25], contrast: 1.6, cut: .34, fill: 0, soft: .05, gradMap: 'noise', grad: gr('#d6457f', '#ffb7d8', '#ffffff'), visCurve: life, fadeV0: .1, fadeV1: .5, intensity: 1.3 }),
        L('particles', { name: 'Hearts', start: 0, dur: 3.2, loop: true, count: 26, pos: [0, 1.1, 0], life: [1.4, 2.3], shape: 'ring', radius: .95, thickness: .7, dir: [0, 1, 0], speed: [.4, 1], spread: 18, turbAmp: .15, size: [.12, .3], sprite: 'heart', soft: .02, halo: .3, core: .15, rotRand: .12, additive: .2, grad: pink, alphaCurve: cv(0, 0, .15, 1, .8, 1, 1, 0), sizeCurve: cv(0, 0, .15, 1.0, .3, .85, 1, .9), intensity: 1.7 }),
        L('particles', { name: 'Bubbles', start: 0, dur: 3.2, loop: true, count: 24, pos: [0, .8, 0], life: [1.2, 2], shape: 'ring', radius: 1.2, dir: [0, 1, 0], speed: [.3, .8], spread: 15, turbAmp: .1, size: [.06, .15], sprite: 'ring', soft: .04, rotRand: 0, grad: gr('#ffffff', '#ffc2dd'), alphaCurve: cv(0, 0, .2, .8, .8, .8, 1, 0), intensity: 1.6 }),
        L('particles', { name: 'Sparkles', start: 0, dur: 3.2, loop: true, count: 60, pos: [0, 1.5, 0], life: [.6, 1.3], shape: 'sphere', radius: 1.5, speed: [0, .3], size: [.04, .12], sprite: 'star', soft: .04, halo: .5, spin: 2, flicker: .3, grad: gr('#ffffff', '#ffd6e8'), sizeCurve: CURVES.bell, intensity: 2.6 }),
        L('text', { name: 'ドキ 1', text: 'ドキ', start: .3, dur: 1.2, pos: [1.45, 2.3, 0], scale: .48, skew: 6, chaos: .25, seed: 2, fill: '#ff5c9d', stroke: '#ffffff', strokeW: .1, shake: .04, shakeRate: 8 }),
        L('text', { name: 'ドキ 2', text: 'ドキ', start: 1.5, dur: 1.2, pos: [-1.5, 1.9, 0], scale: .56, skew: -6, chaos: .25, seed: 7, fill: '#ff5c9d', stroke: '#ffffff', strokeW: .1, shake: .04, shakeRate: 8 })
      );
      setLook(p, 'Pastel dream');
      return p;
    }
  }
];

VFX.data = { DEFAULTS, CURVES, TEMPLATES, PRESETS, TYPE_NAMES, PATH_COLORS, LOOK_DEFAULT, LOOKS, PALETTES, STYLES, FONTS, SFX, makeLayer, makePath, upgradeLayer, newId, clone, cv, gr, baseProject };
})();

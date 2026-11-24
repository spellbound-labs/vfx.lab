/* VFX.LAB — engine: stateless (scrubbable) stylized effect layers on Three.js r128 */
(function () {
'use strict';
const T = THREE, PN = 256, RW = 64;
const VFX = window.VFX = window.VFX || {};

/* ───────── math ───────── */
function rng(seed) {
  let a = (Math.imul((seed | 0) + 1, 2654435761) >>> 0) || 1;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const EASE = {
  linear: t => t,
  in: t => t * t,
  out: t => 1 - (1 - t) * (1 - t),
  inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  cubicIn: t => t * t * t,
  cubicOut: t => 1 - Math.pow(1 - t, 3),
  expoIn: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
  expoOut: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  backOut: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
};
const ease = (name, t) => (EASE[name] || EASE.linear)(clamp(t, 0, 1));

/* monotone cubic through [{t,v}] */
function evalCurve(pts, t) {
  const n = pts ? pts.length : 0;
  if (!n) return 1;
  if (n === 1 || t <= pts[0].t) return pts[0].v;
  if (t >= pts[n - 1].t) return pts[n - 1].v;
  let i = 0; while (i < n - 2 && t > pts[i + 1].t) i++;
  const p0 = pts[i], p1 = pts[i + 1], h = p1.t - p0.t;
  if (h < 1e-6) return p1.v;
  const d = (p1.v - p0.v) / h;
  const dP = i > 0 ? (p0.v - pts[i - 1].v) / Math.max(1e-6, p0.t - pts[i - 1].t) : d;
  const dN = i < n - 2 ? (pts[i + 2].v - p1.v) / Math.max(1e-6, pts[i + 2].t - p1.t) : d;
  let m0 = dP * d <= 0 ? 0 : (dP + d) / 2, m1 = dN * d <= 0 ? 0 : (d + dN) / 2;
  if (i === 0) m0 = d; if (i === n - 2) m1 = d;
  if (d === 0) { m0 = 0; m1 = 0; }
  else { const a = m0 / d, b = m1 / d, s = a * a + b * b; if (s > 9) { const k = 3 / Math.sqrt(s); m0 = k * a * d; m1 = k * b * d; } }
  const x = (t - p0.t) / h, x2 = x * x, x3 = x2 * x;
  return (2 * x3 - 3 * x2 + 1) * p0.v + (x3 - 2 * x2 + x) * h * m0 + (-2 * x3 + 3 * x2) * p1.v + (x3 - x2) * h * m1;
}
function hexRGB(h) {
  h = (h || '#ffffff').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
function evalGradient(stops, t) {
  const n = stops ? stops.length : 0;
  if (!n) return [1, 1, 1];
  if (t <= stops[0].t) return hexRGB(stops[0].c);
  if (t >= stops[n - 1].t) return hexRGB(stops[n - 1].c);
  let i = 0; while (i < n - 2 && t > stops[i + 1].t) i++;
  const a = hexRGB(stops[i].c), b = hexRGB(stops[i + 1].c);
  const f = clamp((t - stops[i].t) / Math.max(1e-6, stops[i + 1].t - stops[i].t), 0, 1);
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
}
VFX.util = { rng, clamp, lerp, EASE, ease, evalCurve, evalGradient, hexRGB };

/* ───────── ramp texture: row0 = colour+alpha, row1 = size (R) + visibility (G) ───────── */
function makeRamp() {
  const tex = new T.DataTexture(new Uint8Array(RW * 2 * 4), RW, 2, T.RGBAFormat, T.UnsignedByteType);
  tex.minFilter = tex.magFilter = T.LinearFilter;
  tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  return tex;
}
function bakeRamp(tex, layer) {
  const d = tex.image.data;
  const g = (layer.grad || []).slice().sort((a, b) => a.t - b.t);
  for (let i = 0; i < RW; i++) {
    const t = i / (RW - 1), c = evalGradient(g, t);
    d[i * 4] = c[0] * 255; d[i * 4 + 1] = c[1] * 255; d[i * 4 + 2] = c[2] * 255;
    d[i * 4 + 3] = clamp(evalCurve(layer.alphaCurve, t), 0, 1) * 255;
    const o = (RW + i) * 4;
    d[o] = clamp(evalCurve(layer.sizeCurve, t), 0, 1) * 255;
    d[o + 1] = clamp(evalCurve(layer.visCurve, t), 0, 1) * 255;
    d[o + 2] = 0; d[o + 3] = 255;
  }
  tex.needsUpdate = true;
}

/* ───────── paths ───────── */
class PathData {
  constructor() {
    this.P = new Float32Array(PN * 3); this.Tn = new Float32Array(PN * 3); this.Nn = new Float32Array(PN * 3);
    this.tex = new T.DataTexture(new Float32Array(PN * 3 * 4), PN, 3, T.RGBAFormat, T.FloatType);
    this.tex.minFilter = this.tex.magFilter = T.NearestFilter; this.tex.generateMipmaps = false;
    this.closed = false; this.length = 1;
  }
  update(path) {
    let pts = [];
    for (const p of (path.points || [])) {
      const v = new T.Vector3(p[0], p[1], p[2]);
      if (!pts.length || pts[pts.length - 1].distanceToSquared(v) > 1e-8) pts.push(v);
    }
    if (!pts.length) pts = [new T.Vector3(0, 0, 0)];
    if (pts.length < 2) pts.push(pts[0].clone().add(new T.Vector3(0, 0.001, 0)));
    this.closed = !!path.closed && pts.length > 2;
    const curve = new T.CatmullRomCurve3(pts, this.closed, 'centripetal');
    curve.arcLengthDivisions = 600;
    const sp = curve.getSpacedPoints(PN - 1);
    this.length = curve.getLength();
    const P = this.P, Tn = this.Tn, Nn = this.Nn, v = new T.Vector3(), n = new T.Vector3(), tv = new T.Vector3();
    for (let i = 0; i < PN; i++) { P[i * 3] = sp[i].x; P[i * 3 + 1] = sp[i].y; P[i * 3 + 2] = sp[i].z; }
    for (let i = 0; i < PN; i++) {
      let a = i - 1, b = i + 1;
      if (this.closed) { a = (a + PN - 1) % (PN - 1); b = b % (PN - 1); } else { a = Math.max(0, a); b = Math.min(PN - 1, b); }
      v.subVectors(sp[b], sp[a]); if (v.lengthSq() < 1e-12) v.set(0, 1, 0); v.normalize();
      Tn[i * 3] = v.x; Tn[i * 3 + 1] = v.y; Tn[i * 3 + 2] = v.z;
    }
    tv.set(Tn[0], Tn[1], Tn[2]);
    n.set(0, 1, 0); if (Math.abs(tv.y) > 0.95) n.set(1, 0, 0);
    n.addScaledVector(tv, -n.dot(tv)).normalize();
    for (let i = 0; i < PN; i++) {
      tv.set(Tn[i * 3], Tn[i * 3 + 1], Tn[i * 3 + 2]);
      n.addScaledVector(tv, -n.dot(tv));
      if (n.lengthSq() < 1e-8) { n.set(1, 0, 0).addScaledVector(tv, -tv.x); }
      n.normalize();
      Nn[i * 3] = n.x; Nn[i * 3 + 1] = n.y; Nn[i * 3 + 2] = n.z;
    }
    const d = this.tex.image.data;
    for (let i = 0; i < PN; i++) for (let k = 0; k < 3; k++) {
      d[i * 4 + k] = P[i * 3 + k]; d[(PN + i) * 4 + k] = Tn[i * 3 + k]; d[(2 * PN + i) * 4 + k] = Nn[i * 3 + k];
    }
    this.tex.needsUpdate = true;
  }
  sample(u, oP, oT, oN) {
    u = this.closed ? u - Math.floor(u) : clamp(u, 0, 1);
    const x = u * (PN - 1), i = Math.min(Math.floor(x), PN - 2), f = x - i, a = i * 3, b = a + 3;
    const P = this.P, Tn = this.Tn, Nn = this.Nn;
    oP.set(lerp(P[a], P[b], f), lerp(P[a + 1], P[b + 1], f), lerp(P[a + 2], P[b + 2], f));
    if (oT) oT.set(lerp(Tn[a], Tn[b], f), lerp(Tn[a + 1], Tn[b + 1], f), lerp(Tn[a + 2], Tn[b + 2], f)).normalize();
    if (oN) oN.set(lerp(Nn[a], Nn[b], f), lerp(Nn[a + 1], Nn[b + 1], f), lerp(Nn[a + 2], Nn[b + 2], f)).normalize();
  }
}

/* ───────── GLSL chunks ───────── */
const G_PATH = `
uniform highp sampler2D uPathTex; uniform float uClosed;
void pathAt(float u, out vec3 P, out vec3 Tn, out vec3 Nn){
  u = uClosed>.5 ? fract(u) : clamp(u,0.,1.);
  float x=u*255.; float i=min(floor(x),254.); float f=x-i; int i0=int(i);
  P=mix(texelFetch(uPathTex,ivec2(i0,0),0).xyz,texelFetch(uPathTex,ivec2(i0+1,0),0).xyz,f);
  Tn=normalize(mix(texelFetch(uPathTex,ivec2(i0,1),0).xyz,texelFetch(uPathTex,ivec2(i0+1,1),0).xyz,f));
  Nn=normalize(mix(texelFetch(uPathTex,ivec2(i0,2),0).xyz,texelFetch(uPathTex,ivec2(i0+1,2),0).xyz,f));
}`;
const G_NOISE = `
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnP(vec2 p,float per){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  float x0=mod(i.x,per),x1=mod(i.x+1.,per);
  return mix(mix(h21(vec2(x0,i.y)),h21(vec2(x1,i.y)),f.x),mix(h21(vec2(x0,i.y+1.)),h21(vec2(x1,i.y+1.)),f.x),f.y); }
float fbmP(vec2 p,float per){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vnP(p,per); p*=2.; p.y+=7.3; per*=2.; a*=.5; } return s/.9375; }
float voroP(vec2 p,float per){ vec2 i=floor(p),f=fract(p); float md=1.;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g=vec2(float(x),float(y)); vec2 c=i+g; c.x=mod(c.x,per);
    vec2 o=vec2(h21(c),h21(c+19.7)); md=min(md,length(g+o-f)); }
  return md; }`;
const G_SURF = `
uniform sampler2D uRamp;
uniform float uTime,uT,uPer,uPer2,uDistort,uCut,uFill,uSoft,uEdgeBoost,uEdgeW,uCore,uCoreThr,uBands,uIntensity,uAdditive,uAlpha,uSkew,uContrast;
uniform vec2 uTile,uScroll,uTile2,uScroll2; uniform int uNoiseType,uGradMap;
uniform sampler2D uTex; uniform float uTexColor,uTexLuma; vec3 gTexCol=vec3(1.);
${G_NOISE}
float ln(float d,float w){ return 1.-smoothstep(w*.45,w,abs(d)); }
float sigil(vec2 q){
  float N=max(3.,uPer); float r=q.y; float sx=fract(q.x); float th=(sx-.5)*6.28318/N; float ap=cos(3.14159/N);
  float s=0.;
  s=max(s,ln(r-.965,.022)); s=max(s,ln(r-.84,.014)); s=max(s,ln(r-.47,.014)); s=max(s,ln(r-.2,.016));
  float band=step(.865,r)*step(r,.94);
  float cell=floor(mod(q.x,N)*7.);
  s=max(s,band*step(.42,h21(vec2(cell,3.)))*step(.18,fract(q.x*7.))*step(fract(q.x*7.),.82)*.9);
  float d1=r*cos(th)-.84*ap; s=max(s,ln(d1,.014)*step(r,.85));
  float th2=(fract(q.x+.5)-.5)*6.28318/N; float d2=r*cos(th2)-.84*ap; s=max(s,ln(d2,.014)*step(r,.85));
  float d3=r*cos(th2)-.47*ap; s=max(s,ln(d3,.012)*step(r,.48));
  vec2 gp=vec2(th*r,r-.655); s=max(s,ln(length(gp)-.055,.014)); s=max(s,1.-smoothstep(.012,.022,length(gp)));
  s=max(s,(1.-smoothstep(.0,.02,abs(th2*r)))*step(.2,r)*step(r,.47)*.8);
  return s; }
float pattern(vec2 q){
  if(uNoiseType==0){ float n=fbmP(q,uPer); return smoothstep(.5-.5/uContrast,.5+.5/uContrast,n); }
  if(uNoiseType==1){ float n=fbmP(q,uPer); n=1.-abs(2.*n-1.); n*=n; return smoothstep(.5-.5/uContrast,.5+.5/uContrast,n); }
  if(uNoiseType==2){ float v=voroP(q,uPer); return clamp(pow(clamp(1.-v,0.,1.),uContrast),0.,1.); }
  if(uNoiseType==3) return sigil(q);
  if(uNoiseType==5){ float n=vnP(vec2(q.x*4.,q.y*.22),uPer*4.)*.65+vnP(vec2(q.x*9.,q.y*.5+3.1),uPer*9.)*.35; return smoothstep(.5-.5/uContrast,.5+.5/uContrast,n*n*1.7); }
  if(uNoiseType==6){ float n=.5+.5*sin(6.28318*(q.y+.25*sin(6.28318*q.x)+.45*fbmP(q,uPer))); return smoothstep(.5-.5/uContrast,.5+.5/uContrast,n); }
  if(uNoiseType==7){ vec2 id=floor(q); id.x=mod(id.x,uPer); vec2 f=fract(q)-.5; float r=.14+.34*h21(id+3.7); return 1.-smoothstep(r*(1.-.6/uContrast),r,length(f)); }
  if(uNoiseType==8){ vec4 t=texture2D(uTex,q); gTexCol=t.rgb; return (uTexLuma>.5 ? dot(t.rgb,vec3(.299,.587,.114)) : 1.)*t.a; }
  return 1.; }
vec4 stylize(vec2 uv,float mask,float dissolve,float lifeCoord){
  uv.x+=uv.y*uSkew;
  vec2 q=uv*uTile-uTime*uScroll;
  if(uDistort>0.){ float dn=fbmP(uv*uTile2-uTime*uScroll2,uPer2); q+=(dn-.5)*uDistort; }
  float n=pattern(q);
  float v=mix(n,1.,uFill)*mask;
  float thr=mix(max(uCut,uSoft+.002),1.+uSoft,clamp(dissolve,0.,1.));
  float a=smoothstep(thr-uSoft,thr+uSoft,v);
  float vr=clamp((v-thr)/max(.001,1.-thr),0.,1.);
  float vb=uBands>.5 ? floor(vr*uBands+.5)/uBands : vr;
  float gc=uGradMap==0 ? lifeCoord : (uGradMap==1 ? vb : uv.y);
  vec3 col=texture2D(uRamp,vec2(clamp(gc,.01,.99),.25)).rgb;
  if(uNoiseType==8 && uTexColor>.5) col*=gTexCol;
  float ga=texture2D(uRamp,vec2(clamp(lifeCoord,.01,.99),.25)).a;
  float edge=1.-smoothstep(thr+uSoft,thr+uSoft+uEdgeW+.0001,v);
  col*=1.+uEdgeBoost*edge;
  float core=smoothstep(uCoreThr,uCoreThr+max(uSoft,.015),vr);
  col=mix(col,vec3(1.),core*uCore);
  a*=ga*uAlpha;
  return vec4(col*uIntensity*a,a*(1.-uAdditive));
}`;

const NOISE_TYPES = ['clouds', 'flames', 'cells', 'sigil', 'none', 'streaks', 'waves', 'dots', 'image'];
const GRAD_MAPS = ['life', 'noise', 'v'];
function surfUniforms() {
  return {
    uRamp: { value: null }, uTime: { value: 0 }, uT: { value: 0 }, uPer: { value: 64 }, uPer2: { value: 64 },
    uDistort: { value: 0 }, uCut: { value: 0 }, uFill: { value: .3 }, uSoft: { value: .03 }, uEdgeBoost: { value: 0 }, uEdgeW: { value: .1 },
    uCore: { value: 0 }, uCoreThr: { value: .7 }, uBands: { value: 0 }, uIntensity: { value: 1 }, uAdditive: { value: 1 },
    uAlpha: { value: 1 }, uSkew: { value: 0 }, uContrast: { value: 1.4 },
    uTile: { value: new T.Vector2(1, 1) }, uScroll: { value: new T.Vector2() }, uTile2: { value: new T.Vector2(1, 1) }, uScroll2: { value: new T.Vector2() },
    uNoiseType: { value: 0 }, uGradMap: { value: 0 }, uTex: { value: null }, uTexColor: { value: 1 }, uTexLuma: { value: 1 }
  };
}
function applySurf(u, l, wrapped, eng) {
  u.uTex.value = eng.texFor(l.mediaId); u.uTexColor.value = l.texColor === false ? 0 : 1; u.uTexLuma.value = l.texLuma === false ? 0 : 1;
  const tx = wrapped ? Math.max(1, Math.round(l.tile[0])) : l.tile[0];
  const tx2 = wrapped ? Math.max(1, Math.round(l.tile2[0])) : l.tile2[0];
  u.uTile.value.set(tx, l.tile[1]); u.uScroll.value.set(l.scroll[0], l.scroll[1]);
  u.uTile2.value.set(tx2, l.tile2[1]); u.uScroll2.value.set(l.scroll2[0], l.scroll2[1]);
  u.uPer.value = wrapped ? tx : 64; u.uPer2.value = wrapped ? tx2 : 64;
  u.uDistort.value = l.distort; u.uCut.value = l.cut || 0; u.uFill.value = l.fill; u.uSoft.value = Math.max(.003, l.soft);
  u.uEdgeBoost.value = l.edgeBoost; u.uEdgeW.value = l.edgeW; u.uCore.value = l.core; u.uCoreThr.value = l.coreThr;
  u.uBands.value = l.bands; u.uIntensity.value = l.intensity; u.uAdditive.value = l.additive; u.uAlpha.value = l.alpha;
  u.uSkew.value = l.skew || 0; u.uContrast.value = Math.max(.2, l.contrast || 1.4);
  u.uNoiseType.value = Math.max(0, NOISE_TYPES.indexOf(l.noise)); u.uGradMap.value = Math.max(0, GRAD_MAPS.indexOf(l.gradMap));
}
function fxMaterial(o) {
  return new T.ShaderMaterial(Object.assign({
    transparent: true, depthWrite: false, depthTest: true, side: T.DoubleSide,
    blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor
  }, o));
}

/* ───────── particles ───────── */
const SPRITES = ['glow', 'disc', 'ring', 'star', 'streak', 'smoke', 'flame', 'diamond', 'shard', 'cross', 'crescent', 'square', 'image', 'heart', 'drop', 'vein', 'bang', 'spiral'];
const P_VS = `
attribute vec3 aPos; attribute vec3 aVel; attribute vec3 aEmit; attribute vec3 aPath; attribute vec2 aBL; attribute vec4 aSeed;
uniform sampler2D uRamp;
uniform float uTime,uLoop,uDur,uGravity,uDrag,uOrbit,uConverge,uTurbAmp,uTurbFreq,uTurbSpeed,uStretch,uSpin,uRotRand,uPathTravel;
uniform int uMotion; uniform vec2 uSize; uniform vec3 uOffset,uAxis;
varying vec2 vUv; varying float vT; varying vec4 vSeed;
${G_PATH}
vec3 rotAx(vec3 v,vec3 k,float a){ float c=cos(a),s=sin(a); return v*c+cross(k,v)*s+k*dot(k,v)*(1.-c); }
vec3 sn3(vec3 p){ return vec3(sin(p.y*1.3+sin(p.z*1.7))+sin(p.z*2.1+p.x),sin(p.z*1.1+sin(p.x*1.9))+sin(p.x*2.3+p.y),sin(p.x*1.5+sin(p.y*1.3))+sin(p.y*1.9+p.z))*.5; }
vec3 ppos(float age,float life){
  float t=age/life; vec3 p; float k=uDrag;
  float e=k>1e-3 ? (1.-exp(-k*age))/k : age;
  if(uMotion==1){
    vec3 P,Tn,Nn; pathAt(aPath.x+uPathTravel*t,P,Tn,Nn); vec3 B=cross(Tn,Nn);
    float ang=aPath.z+uOrbit*age; float r=aPath.y*(1.-uConverge*t);
    p=P+(Nn*cos(ang)+B*sin(ang))*r+aVel*e;
  } else {
    vec3 d=aPos-aEmit+aVel*e;
    if(uOrbit!=0.) d=rotAx(d,uAxis,uOrbit*age);
    d*=(1.-uConverge*t);
    p=aEmit+d;
  }
  float ge=k>1e-3 ? (age-e)/k : .5*age*age;
  p.y-=uGravity*ge;
  if(uTurbAmp>0.) p+=sn3(aPos*uTurbFreq+aSeed.xyz*6.28+age*uTurbSpeed)*uTurbAmp*smoothstep(0.,.35,t);
  return p;
}
void main(){
  float birth=aBL.x, life=aBL.y;
  float age=uLoop>.5 ? mod(uTime-birth,uDur) : uTime-birth;
  vSeed=aSeed; vUv=position.xy; vT=0.;
  if(age<0.||age>life){ gl_Position=vec4(2.,2.,2.,1.); return; }
  float t=age/life; vT=t;
  vec3 p=ppos(age,life)+uOffset;
  vec4 mv=viewMatrix*vec4(p,1.);
  float size=mix(uSize.x,uSize.y,aSeed.x)*texture2D(uRamp,vec2(t,.75)).r;
  vec2 q=position.xy; vec2 ax=vec2(1.,0.),ay=vec2(0.,1.); float sx=1.; bool st=false;
  if(uStretch>0.){
    vec3 p0=ppos(age-.02,life)+uOffset; vec3 dv=(viewMatrix*vec4(p-p0,0.)).xyz/.02; float sp=length(dv.xy);
    if(sp>1e-4){ ax=dv.xy/sp; ay=vec2(-ax.y,ax.x); sx=1.+uStretch*sp/max(size,1e-4); st=true; }
  }
  if(!st){ float a=aSeed.y*6.2832*uRotRand+uSpin*age*(aSeed.z>.5?1.:-1.); ax=vec2(cos(a),sin(a)); ay=vec2(-ax.y,ax.x); }
  mv.xy+=(ax*q.x*sx+ay*q.y)*size;
  gl_Position=projectionMatrix*mv;
}`;
const P_FS = `
uniform sampler2D uRamp; uniform int uShape;
uniform float uSoft,uHalo,uDissolve,uCore,uIntensity,uAdditive,uHueVar,uFlicker,uTime,uAlpha,uShade;
uniform sampler2D uTex; uniform vec2 uFlip; uniform float uTexColor,uTexLuma,uFlipFps;
varying vec2 vUv; varying float vT; varying vec4 vSeed;
${G_NOISE}
vec3 hueRot(vec3 c,float a){ const vec3 k=vec3(.57735); float ca=cos(a),sa=sin(a); return c*ca+cross(k,c)*sa+k*dot(k,c)*(1.-ca); }
void main(){
  vec2 p=vUv; float r=length(p); float d; float a;
  if(uShape==0) d=r-.45;
  else if(uShape==1) d=r-.8;
  else if(uShape==2) d=abs(r-.72)-.1;
  else if(uShape==3) d=(sqrt(abs(p.x))+sqrt(abs(p.y))-.92)*.6;
  else if(uShape==4){ float w=.26*pow(clamp((p.x+1.)/1.75,0.,1.),1.4); d=max(abs(p.y)-w,(p.x-.75)*.8+abs(p.y)*.6-.1); }
  else if(uShape==5){ float nz=fbmP(p*1.4+vSeed.xy*17.+vec2(0.,-vT*.5),64.); d=r-.72+(nz-.5)*.6; }
  else if(uShape==6){ vec2 f=vec2(p.x*(1.+(p.y+1.)*.6),p.y*.9+.12); float nz=fbmP(vec2(p.x*2.,p.y*1.5-vT*2.)+vSeed.xy*9.,64.); d=length(f)-.7+(nz-.5)*.5; }
  else if(uShape==7) d=(abs(p.x)*1.7+abs(p.y)-.86)*.55;
  else if(uShape==8) d=max(max(dot(p,vec2(.9,.44))-.34,dot(p,vec2(-.75,.66))-.3),-p.y*.9-p.x*.25-.5);
  else if(uShape==9) d=min(max(abs(p.x)-.17,abs(p.y)-.85),max(abs(p.y)-.17,abs(p.x)-.85));
  else if(uShape==10) d=max(r-.86,.72-length(p-vec2(.38,0.)));
  else if(uShape==12) d=-.5;
  else if(uShape==13){ vec2 q=vec2(abs(p.x),p.y+.8)/1.6; float dd; if(q.y+q.x>1.) dd=length(q-vec2(.25,.75))-.35355; else { vec2 a2=q-vec2(0.,1.), b2=q-.5*max(q.x+q.y,0.); dd=sqrt(min(dot(a2,a2),dot(b2,b2)))*sign(q.x-q.y); } d=dd*1.6; }
  else if(uShape==14) d=p.y<-.3 ? length(p+vec2(0.,.3))-.45 : max(abs(p.x)-.45*(1.-(p.y+.3)/1.15),p.y-.85);
  else if(uShape==15){ vec2 q=abs(p); d=max(abs(length(q-vec2(.8))-.55)-.11,max(q.x-.8,q.y-.8)); }
  else if(uShape==16){ float w=.12+.11*clamp((p.y+.3)/1.15,0.,1.); d=min(max(abs(p.x)-w,abs(p.y-.28)-.58),length(p-vec2(0.,-.68))-.17); }
  else if(uShape==17){ float s2=r*2.4-atan(p.y,p.x)/6.28318; d=max((abs(fract(s2)-.5)-.2)*.32,r-.88); }
  else d=max(abs(p.x),abs(p.y))-.7;
  if(uShape==0) a=exp(-r*r*mix(9.,3.,uSoft))*(1.-smoothstep(.7,1.,r));
  else a=1.-smoothstep(-uSoft*.5-.012,uSoft*.5+.012,d);
  vec3 tcol=vec3(1.);
  if(uShape==12){ float nf=uFlip.x*uFlip.y; float fr=uFlipFps>0. ? mod(floor(uTime*uFlipFps+vSeed.x*nf),nf) : min(floor(vT*nf),nf-1.);
    vec2 tuv=(vec2(mod(fr,uFlip.x),uFlip.y-1.-floor(fr/uFlip.x))+(p*.5+.5))/uFlip;
    vec4 t=texture2D(uTex,tuv); a=t.a*(uTexLuma>.5 ? dot(t.rgb,vec3(.299,.587,.114)) : 1.); tcol=t.rgb; d=.3-a; }
  float box=1.-smoothstep(.72,1.,max(abs(p.x),abs(p.y)));
  a=clamp(a+uHalo*exp(-max(d,0.)*5.)*box*(1.-a)*.75,0.,1.);
  if(uDissolve>0.){ float n2=fbmP(p*2.2+vSeed.zw*23.,64.); float e=uDissolve*vT*1.1; a*=smoothstep(e-.06,e+.06,n2*.85+.15); }
  vec4 g=texture2D(uRamp,vec2(clamp(vT,.01,.99),.25));
  vec3 col=g.rgb;
  if(uShape==12 && uTexColor>.5) col*=tcol;
  if(uHueVar>0.) col=max(hueRot(col,(vSeed.w-.5)*uHueVar*6.2832),0.);
  if(uShade>0.){ float sh=smoothstep(-.06,.06,dot(p,vec2(-.45,.6))+(fbmP(p*1.8+vSeed.xy*31.,64.)-.5)*.7+.12); col*=mix(1.-uShade,1.,sh); }
  float core=1.-smoothstep(-.03,.03,d+.38);
  col=mix(col,vec3(1.),core*uCore);
  a*=1.-uFlicker*step(.5,fract(vSeed.z*13.+uTime*17.));
  a*=g.a*uAlpha;
  gl_FragColor=vec4(col*uIntensity*a,a*(1.-uAdditive));
}`;

class ParticleFX {
  constructor(eng) {
    this.eng = eng; this.ramp = makeRamp(); this.count = -1;
    this.mat = fxMaterial({
      vertexShader: P_VS, fragmentShader: P_FS,
      uniforms: {
        uPathTex: { value: eng.nullPath.tex }, uClosed: { value: 0 }, uRamp: { value: this.ramp },
        uTime: { value: 0 }, uLoop: { value: 0 }, uDur: { value: 1 }, uGravity: { value: 0 }, uDrag: { value: 0 }, uOrbit: { value: 0 },
        uConverge: { value: 0 }, uTurbAmp: { value: 0 }, uTurbFreq: { value: 1 }, uTurbSpeed: { value: 0 }, uStretch: { value: 0 },
        uSpin: { value: 0 }, uRotRand: { value: 1 }, uPathTravel: { value: 0 }, uMotion: { value: 0 },
        uSize: { value: new T.Vector2(.1, .2) }, uOffset: { value: new T.Vector3() }, uAxis: { value: new T.Vector3(0, 1, 0) },
        uShape: { value: 0 }, uSoft: { value: .1 }, uHalo: { value: 0 }, uDissolve: { value: 0 }, uCore: { value: 0 }, uIntensity: { value: 1 },
        uAdditive: { value: 1 }, uHueVar: { value: 0 }, uFlicker: { value: 0 }, uAlpha: { value: 1 }, uShade: { value: 0 },
        uTex: { value: null }, uFlip: { value: new T.Vector2(1, 1) }, uTexColor: { value: 1 }, uTexLuma: { value: 0 }, uFlipFps: { value: 0 }
      }
    });
    this.obj = new T.Mesh(new T.BufferGeometry(), this.mat);
    this.obj.frustumCulled = false;
  }
  alloc(n) {
    if (this.obj.geometry) this.obj.geometry.dispose();
    const g = new T.InstancedBufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const A = (name, size) => { const a = new T.InstancedBufferAttribute(new Float32Array(n * size), size); g.setAttribute(name, a); return a; };
    this.a = { pos: A('aPos', 3), vel: A('aVel', 3), emit: A('aEmit', 3), path: A('aPath', 3), bl: A('aBL', 2), seed: A('aSeed', 4) };
    g.instanceCount = n; this.obj.geometry = g; this.count = n;
  }
  sync(l) {
    const eng = this.eng, pd = l.pathId ? eng.paths.get(l.pathId) : null, u = this.mat.uniforms;
    const n = clamp(Math.round(l.count), 1, 40000);
    if (n !== this.count) this.alloc(n);
    bakeRamp(this.ramp, l);
    const R = rng((l.seed | 0) * 7919 + 13);
    const a = this.a, pos = a.pos.array, vel = a.vel.array, em = a.emit.array, pa = a.path.array, bl = a.bl.array, sd = a.seed.array;
    const P = new T.Vector3(), Tn = new T.Vector3(0, 1, 0), Nn = new T.Vector3(1, 0, 0), B = new T.Vector3(0, 0, 1);
    const L = new T.Vector3(), V = new T.Vector3(), O = new T.Vector3(), D = new T.Vector3(), tmp = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
    const rotQ = new T.Quaternion().setFromEuler(new T.Euler(l.rot[0] * Math.PI / 180, l.rot[1] * Math.PI / 180, l.rot[2] * Math.PI / 180));
    const dir = new T.Vector3(l.dir[0], l.dir[1], l.dir[2]); if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0); dir.normalize();
    e1.set(1, 0, 0); if (Math.abs(dir.x) > .9) e1.set(0, 0, 1); e1.addScaledVector(dir, -e1.dot(dir)).normalize(); e2.crossVectors(dir, e1);
    const cosMax = Math.cos(clamp(l.spread, 0, 180) * Math.PI / 180);
    const burst = l.emit === 'burst', dur = Math.max(1e-4, l.dur), inner = 1 - clamp(l.thickness, 0, 1);
    for (let i = 0; i < n; i++) {
      const birth = burst ? R() * l.burstSpread : (i + R()) / n * dur;
      const life = Math.max(.02, lerp(l.life[0], l.life[1], R()));
      let uu = 0; P.set(0, 0, 0);
      if (pd) {
        uu = l.emitMode === 'along' ? lerp(l.pathFrom, l.pathTo, R()) : lerp(l.pathFrom, l.pathTo, ease(l.pathEase, birth / dur));
        pd.sample(uu, P, Tn, Nn); B.crossVectors(Tn, Nn);
      }
      const r1 = R(), r2 = R(), r3 = R();
      switch (l.shape) {
        case 'sphere': { const z = r1 * 2 - 1, ph = r2 * 6.2832, s = Math.sqrt(1 - z * z), rr = Math.cbrt(lerp(inner * inner * inner, 1, r3)); L.set(s * Math.cos(ph) * rr, z * rr, s * Math.sin(ph) * rr); break; }
        case 'ring': { const ph = r1 * 6.2832, rr = Math.sqrt(lerp(inner * inner, 1, r2)); L.set(Math.cos(ph) * rr, 0, Math.sin(ph) * rr); break; }
        case 'box': L.set(r1 * 2 - 1, r2 * 2 - 1, r3 * 2 - 1); break;
        case 'line': L.set(r1 * 2 - 1, 0, 0); break;
        default: L.set(0, 0, 0);
      }
      L.x *= l.radius * l.shapeScale[0]; L.y *= l.radius * l.shapeScale[1]; L.z *= l.radius * l.shapeScale[2];
      if (L.lengthSq() > 1e-8) O.copy(L).normalize();
      else { const z = R() * 2 - 1, ph = R() * 6.2832, s = Math.sqrt(1 - z * z); O.set(s * Math.cos(ph), z, s * Math.sin(ph)); }
      const ct = lerp(cosMax, 1, R()), st = Math.sqrt(Math.max(0, 1 - ct * ct)), ph2 = R() * 6.2832;
      D.copy(dir).multiplyScalar(ct).addScaledVector(e1, st * Math.cos(ph2)).addScaledVector(e2, st * Math.sin(ph2));
      V.copy(O).multiplyScalar(lerp(l.radial[0], l.radial[1], R())).addScaledVector(D, lerp(l.speed[0], l.speed[1], R()));
      const rad = Math.hypot(L.x, L.z), ang = Math.atan2(L.z, L.x);
      L.applyQuaternion(rotQ); V.applyQuaternion(rotQ);
      if (pd && l.alignPath) {
        tmp.set(0, 0, 0).addScaledVector(Nn, L.x).addScaledVector(Tn, L.y).addScaledVector(B, L.z); L.copy(tmp);
        tmp.set(0, 0, 0).addScaledVector(Nn, V.x).addScaledVector(Tn, V.y).addScaledVector(B, V.z); V.copy(tmp);
      }
      const j = i * 3;
      em[j] = P.x; em[j + 1] = P.y; em[j + 2] = P.z;
      pos[j] = P.x + L.x; pos[j + 1] = P.y + L.y; pos[j + 2] = P.z + L.z;
      vel[j] = V.x; vel[j + 1] = V.y; vel[j + 2] = V.z;
      pa[j] = uu; pa[j + 1] = rad; pa[j + 2] = ang;
      bl[i * 2] = birth; bl[i * 2 + 1] = life;
      sd[i * 4] = R(); sd[i * 4 + 1] = R(); sd[i * 4 + 2] = R(); sd[i * 4 + 3] = R();
    }
    for (const k in a) a[k].needsUpdate = true;
    u.uPathTex.value = (pd || eng.nullPath).tex; u.uClosed.value = pd && pd.closed ? 1 : 0;
    u.uMotion.value = (pd && l.motion === 'path') ? 1 : 0; u.uPathTravel.value = l.pathTravel;
    u.uLoop.value = l.loop && !burst ? 1 : 0; u.uDur.value = dur;
    u.uGravity.value = l.gravity; u.uDrag.value = l.drag; u.uOrbit.value = l.orbit; u.uConverge.value = l.converge;
    u.uTurbAmp.value = l.turbAmp; u.uTurbFreq.value = l.turbFreq; u.uTurbSpeed.value = l.turbSpeed;
    u.uStretch.value = l.stretch; u.uSpin.value = l.spin; u.uRotRand.value = l.rotRand;
    u.uSize.value.set(l.size[0], l.size[1]); u.uOffset.value.set(l.pos[0], l.pos[1], l.pos[2]);
    u.uAxis.value.copy(dir).applyQuaternion(rotQ);
    u.uShape.value = Math.max(0, SPRITES.indexOf(l.sprite)); u.uSoft.value = l.soft; u.uHalo.value = l.halo; u.uDissolve.value = l.dissolve;
    u.uCore.value = l.core; u.uIntensity.value = l.intensity; u.uAdditive.value = l.additive; u.uHueVar.value = l.hueVar;
    u.uFlicker.value = l.flicker; u.uAlpha.value = l.alpha; u.uShade.value = l.shade;
    u.uTex.value = eng.texFor(l.mediaId); u.uFlip.value.set(Math.max(1, Math.round(l.flipCols || 1)), Math.max(1, Math.round(l.flipRows || 1)));
    u.uTexColor.value = l.texColor === false ? 0 : 1; u.uTexLuma.value = l.texLuma ? 1 : 0; u.uFlipFps.value = l.flipFps || 0;
  }
  update(l, time) {
    const t = time - l.start, u = this.mat.uniforms;
    u.uTime.value = t;
    const loop = u.uLoop.value > .5;
    const end = (l.emit === 'burst' ? l.burstSpread : l.dur) + l.life[1];
    this.obj.visible = l.visible && (loop || (t >= 0 && t <= end));
    return this.obj.visible ? this.count : 0;
  }
  dispose() { this.obj.geometry.dispose(); this.mat.dispose(); this.ramp.dispose(); }
}

/* ───────── ribbons (trails, slashes, lightning, helix beams) ───────── */
const R_SEG = 160, R_MAXSTRANDS = 24, FACES = ['camera', 'flat', 'upright'];
const R_VS = `
attribute float aS; attribute float aSide; attribute float aStrand;
uniform sampler2D uRamp;
uniform float uHead,uTail,uFrom,uTo,uLen,uWidth,uTime,uStrands,uHelixR,uHelixTurns,uHelixSpin,uJitAmp,uJitFreq,uJitRate,uPin,uStrandVar;
uniform int uFace; uniform vec3 uOffset;
varying vec2 vUv; varying float vU; varying float vStrand;
${G_PATH}
float n1(float x){ float i=floor(x),f=fract(x); f=f*f*(3.-2.*f); return mix(fract(sin(i*127.1)*43758.5453),fract(sin((i+1.)*127.1)*43758.5453),f); }
vec3 rpos(float u,float un){
  vec3 P,Tn,Nn; pathAt(u,P,Tn,Nn); vec3 B=normalize(cross(Tn,Nn));
  float env=mix(1.,sin(3.14159*clamp(un,0.,1.)),uPin);
  if(uHelixR>0.){ float ph=aStrand/uStrands*6.28318+un*uHelixTurns*6.28318+uTime*uHelixSpin; P+=(Nn*cos(ph)+B*sin(ph))*uHelixR*env; }
  if(uJitAmp>0.){
    float st=(uJitRate>0. ? floor(uTime*uJitRate) : 0.)*17.3+aStrand*31.7; float x=un*uJitFreq;
    vec2 j=vec2(n1(x+st)+.5*n1(x*2.3+st+5.)+.25*n1(x*5.1+st+9.),n1(x+st+50.)+.5*n1(x*2.3+st+55.)+.25*n1(x*5.1+st+59.))/1.75-.5;
    P+=(Nn*j.x+B*j.y)*2.*uJitAmp*env*(1.+aStrand*.25);
  }
  return P;
}
void main(){
  float hi=min(uHead,uTo), lo=max(max(uHead-uLen,uTail),uFrom);
  vUv=vec2(aS,aSide*.5+.5); vStrand=aStrand; vU=0.;
  if(hi<=lo+1e-5){ gl_Position=vec4(2.,2.,2.,1.); return; }
  float u=mix(hi,lo,aS); float span=max(1e-5,uTo-uFrom); float un=(u-uFrom)/span; vU=un;
  float sg=(uClosed<.5 && u+.004>1.) ? -1. : 1.;
  vec3 P=rpos(u,un); vec3 P2=rpos(u+sg*.004,un+sg*.004/span);
  vec3 Tg=(P2-P)*sg; float tl=length(Tg);
  vec3 Pp,Tp,Np; pathAt(u,Pp,Tp,Np);
  Tg=tl>1e-6 ? Tg/tl : Tp;
  vec3 wp=P+uOffset; vec3 side;
  if(uFace==0) side=cross(Tg,cameraPosition-wp); else if(uFace==1) side=cross(Tg,Np); else side=Np-Tg*dot(Np,Tg);
  float sl=length(side); side=sl>1e-6 ? side/sl : vec3(1.,0.,0.);
  float w=uWidth*texture2D(uRamp,vec2(aS,.75)).r*(1.-uStrandVar*fract(aStrand*.618+.31));
  wp+=side*aSide*w*.5;
  gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);
}`;
const R_FS = `
uniform float uEdgePow,uBias,uTailErode,uAnchor;
varying vec2 vUv; varying float vU; varying float vStrand;
${G_SURF}
void main(){
  float y=pow(clamp(vUv.y,0.,1.),exp2(uBias*1.6));
  float across=1.-pow(abs(y*2.-1.),uEdgePow);
  vec2 uv=vec2(mix(vUv.x,vU,uAnchor)+vStrand*.37,vUv.y);
  float dissolve=1.-texture2D(uRamp,vec2(clamp(uT,.01,.99),.75)).g*(1.-uTailErode*vUv.x);
  gl_FragColor=stylize(uv,across,dissolve,vUv.x);
}`;
let ribbonGeoProto = null;
function ribbonGeometry() {
  const g = new T.InstancedBufferGeometry(), nV = (R_SEG + 1) * 2;
  const s = new Float32Array(nV), side = new Float32Array(nV), idx = [];
  for (let i = 0; i <= R_SEG; i++) { s[i * 2] = s[i * 2 + 1] = i / R_SEG; side[i * 2] = -1; side[i * 2 + 1] = 1; }
  for (let i = 0; i < R_SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setAttribute('position', new T.BufferAttribute(new Float32Array(nV * 3), 3));
  g.setAttribute('aS', new T.BufferAttribute(s, 1)); g.setAttribute('aSide', new T.BufferAttribute(side, 1));
  const st = new Float32Array(R_MAXSTRANDS); for (let i = 0; i < R_MAXSTRANDS; i++) st[i] = i;
  g.setAttribute('aStrand', new T.InstancedBufferAttribute(st, 1));
  g.setIndex(idx);
  return g;
}
class RibbonFX {
  constructor(eng) {
    this.eng = eng; this.ramp = makeRamp();
    const u = surfUniforms(); u.uRamp.value = this.ramp;
    Object.assign(u, {
      uPathTex: { value: eng.nullPath.tex }, uClosed: { value: 0 }, uHead: { value: 0 }, uTail: { value: 0 }, uFrom: { value: 0 }, uTo: { value: 1 },
      uLen: { value: 1 }, uWidth: { value: .3 }, uStrands: { value: 1 }, uHelixR: { value: 0 }, uHelixTurns: { value: 0 }, uHelixSpin: { value: 0 },
      uJitAmp: { value: 0 }, uJitFreq: { value: 6 }, uJitRate: { value: 0 }, uPin: { value: 0 }, uStrandVar: { value: 0 }, uFace: { value: 0 },
      uOffset: { value: new T.Vector3() }, uEdgePow: { value: 2 }, uBias: { value: 0 }, uTailErode: { value: 0 }, uAnchor: { value: 0 }
    });
    this.mat = fxMaterial({ vertexShader: R_VS, fragmentShader: R_FS, uniforms: u });
    this.obj = new T.Mesh(ribbonGeometry(), this.mat); this.obj.frustumCulled = false;
  }
  sync(l) {
    const pd = l.pathId ? this.eng.paths.get(l.pathId) : null, u = this.mat.uniforms;
    this.has = !!pd;
    bakeRamp(this.ramp, l); applySurf(u, l, false, this.eng);
    u.uPathTex.value = (pd || this.eng.nullPath).tex; u.uClosed.value = pd && pd.closed ? 1 : 0;
    u.uFrom.value = Math.min(l.pathFrom, l.pathTo); u.uTo.value = Math.max(l.pathFrom, l.pathTo);
    u.uLen.value = l.len; u.uWidth.value = l.width;
    const n = clamp(Math.round(l.strands), 1, R_MAXSTRANDS); u.uStrands.value = n; this.obj.geometry.instanceCount = n;
    u.uHelixR.value = l.helixR; u.uHelixTurns.value = l.helixTurns; u.uHelixSpin.value = l.helixSpin;
    u.uJitAmp.value = l.jitAmp; u.uJitFreq.value = l.jitFreq; u.uJitRate.value = l.jitRate; u.uPin.value = l.pin; u.uStrandVar.value = l.strandVar;
    u.uFace.value = Math.max(0, FACES.indexOf(l.face)); u.uOffset.value.set(l.pos[0], l.pos[1], l.pos[2]);
    u.uEdgePow.value = Math.max(.2, l.edgePow); u.uBias.value = l.bias; u.uTailErode.value = l.tailErode; u.uAnchor.value = l.anchor ? 1 : 0;
  }
  update(l, time) {
    const t = time - l.start, u = this.mat.uniforms, tn = clamp(t / Math.max(1e-4, l.dur), 0, 1);
    this.obj.visible = l.visible && this.has && t >= 0 && t <= l.dur;
    if (!this.obj.visible) return 0;
    u.uTime.value = t; u.uT.value = tn;
    const from = u.uFrom.value, to = u.uTo.value;
    if (l.mode === 'full') { u.uHead.value = to; u.uTail.value = from; u.uLen.value = 1e3; }
    else {
      const tr = Math.max(.01, l.travel);
      u.uHead.value = lerp(from, to, ease(l.pathEase, tn / tr));
      u.uTail.value = l.tailDelay >= 1 ? from : lerp(from, to, ease(l.pathEase, (tn - l.tailDelay) / tr));
      u.uLen.value = l.len;
    }
    return 0;
  }
  dispose() { this.obj.geometry.dispose(); this.mat.dispose(); this.ramp.dispose(); }
}

/* ───────── shader meshes ───────── */
const M_VS = `
uniform float uTwist,uWobble,uWobTile,uWobSpeed,uWobPer,uTimeV;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
${G_NOISE}
void main(){
  vec3 p=position; vec3 n=normal;
  if(uWobble>0.){ float w=fbmP(vec2(uv.x*uWobPer,uv.y*uWobTile-uTimeV*uWobSpeed),uWobPer); p+=n*(w-.5)*2.*uWobble; }
  if(uTwist!=0.){ float a=uTwist*uv.y; float c=cos(a),s=sin(a); mat2 m=mat2(c,-s,s,c); p.xz=m*p.xz; n.xz=m*n.xz; }
  vec4 mv=modelViewMatrix*vec4(p,1.); vN=normalize(normalMatrix*n); vV=-mv.xyz; vUv=uv;
  gl_Position=projectionMatrix*mv;
}`;
const M_FS = `
uniform float uFadeV0,uFadeV1,uFresnel,uFresPow;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
${G_SURF}
void main(){
  float m=1.;
  if(uFadeV0>0.) m*=smoothstep(0.,uFadeV0,vUv.y);
  if(uFadeV1>0.) m*=smoothstep(0.,uFadeV1,1.-vUv.y);
  if(uFresnel!=0.){ float f=pow(clamp(1.-abs(dot(normalize(vN),normalize(vV))),0.,1.),uFresPow); m*=uFresnel>0. ? mix(1.,f,uFresnel) : mix(1.,1.-f,-uFresnel); }
  float dissolve=1.-texture2D(uRamp,vec2(clamp(uT,.01,.99),.75)).g;
  gl_FragColor=stylize(vUv,m,dissolve,uT);
}`;
function surfGeo(fn, su, sv) {
  const pos = [], nor = [], uv = [], idx = [], e = 1e-3;
  const a = new T.Vector3(), b = new T.Vector3(), n = new T.Vector3(), p = new T.Vector3();
  const F = (u, v, o) => { const r = fn(u, v); return o.set(r[0], r[1], r[2]); };
  for (let j = 0; j <= sv; j++) for (let i = 0; i <= su; i++) {
    const u = i / su, v = j / sv, v0 = Math.max(0, v - e), v1 = Math.min(1, v + e);
    F(u, v, p);
    F(u + e, v, a).sub(F(u - e, v, n)); F(u, v1, b).sub(F(u, v0, n));
    n.crossVectors(a, b);
    if (n.lengthSq() < 1e-14) { n.copy(p); if (n.lengthSq() < 1e-10) n.set(0, 1, 0); }
    n.normalize();
    pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); uv.push(u, v);
  }
  for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++) { const k = j * (su + 1) + i; idx.push(k, k + 1, k + su + 1, k + 1, k + su + 2, k + su + 1); }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
function spikesGeo(count, inner, seed, flat) {
  const R = rng(seed * 31 + 7), pos = [], nor = [], uv = [], d = new T.Vector3(), s1 = new T.Vector3(), s2 = new T.Vector3(), up = new T.Vector3();
  for (let k = 0; k < count; k++) {
    if (flat) { const a = (k + R() * .8) / count * 6.2832; d.set(Math.cos(a), 0, Math.sin(a)); }
    else { const z = R() * 2 - 1, ph = R() * 6.2832, s = Math.sqrt(1 - z * z); d.set(s * Math.cos(ph), z, s * Math.sin(ph)); }
    const len = lerp(.45, 1, R()), w = lerp(.02, .07, R()), ux = R();
    up.set(0, 1, 0); if (Math.abs(d.y) > .9) up.set(1, 0, 0);
    s1.crossVectors(d, up).normalize(); s2.crossVectors(d, s1).normalize();
    for (const s of (flat ? [s1, new T.Vector3(0, 1, 0)] : [s1, s2])) {
      const bx = d.x * inner, by = d.y * inner, bz = d.z * inner, tl = inner + len * (1 - inner);
      pos.push(bx - s.x * w, by - s.y * w, bz - s.z * w, bx + s.x * w, by + s.y * w, bz + s.z * w, d.x * tl, d.y * tl, d.z * tl);
      for (let q = 0; q < 3; q++) nor.push(d.x, d.y, d.z);
      uv.push(ux, 0, ux, 0, ux, 1);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  return g;
}
const TAU = Math.PI * 2;
function primGeometry(l) {
  const inner = clamp(l.inner, 0, .99), tp = l.taper;
  switch (l.prim) {
    case 'disc': return surfGeo((u, v) => [Math.cos(u * TAU) * v, 0, Math.sin(u * TAU) * v], 96, 24);
    case 'cylinder': return surfGeo((u, v) => { const r = lerp(1, tp, v); return [Math.cos(u * TAU) * r, v, Math.sin(u * TAU) * r]; }, 96, 40);
    case 'sphere': return surfGeo((u, v) => { const s = Math.sin(v * Math.PI); return [Math.cos(u * TAU) * s, -Math.cos(v * Math.PI), Math.sin(u * TAU) * s]; }, 72, 40);
    case 'dome': return surfGeo((u, v) => { const c = Math.cos(v * Math.PI / 2); return [Math.cos(u * TAU) * c, Math.sin(v * Math.PI / 2), Math.sin(u * TAU) * c]; }, 72, 28);
    case 'torus': { const tr = Math.max(.01, inner * .5); return surfGeo((u, v) => { const r = 1 + tr * Math.cos(v * TAU); return [Math.cos(u * TAU) * r, tr * Math.sin(v * TAU), Math.sin(u * TAU) * r]; }, 120, 20); }
    case 'plane': return surfGeo((u, v) => [u * 2 - 1, 0, v * 2 - 1], 24, 24);
    case 'spikes': return spikesGeo(clamp(Math.round(l.spikes), 3, 400), inner * .9, l.seed | 0, false);
    case 'burst': return spikesGeo(clamp(Math.round(l.spikes), 3, 400), inner * .9, l.seed | 0, true);
    default: return surfGeo((u, v) => { const r = lerp(inner, 1, v); return [Math.cos(u * TAU) * r, 0, Math.sin(u * TAU) * r]; }, 128, 12);
  }
}
const WRAPPED = { ring: 1, disc: 1, cylinder: 1, sphere: 1, dome: 1, torus: 1 };
class MeshFX {
  constructor(eng) {
    this.eng = eng; this.ramp = makeRamp(); this.key = '';
    const u = surfUniforms(); u.uRamp.value = this.ramp;
    Object.assign(u, {
      uTwist: { value: 0 }, uWobble: { value: 0 }, uWobTile: { value: 2 }, uWobSpeed: { value: 1 }, uWobPer: { value: 4 }, uTimeV: { value: 0 },
      uFadeV0: { value: 0 }, uFadeV1: { value: 0 }, uFresnel: { value: 0 }, uFresPow: { value: 2 }
    });
    this.mat = fxMaterial({ vertexShader: M_VS, fragmentShader: M_FS, uniforms: u });
    this.obj = new T.Mesh(new T.BufferGeometry(), this.mat); this.obj.frustumCulled = false;
    this.P = new T.Vector3(); this.Tn = new T.Vector3(); this.q = new T.Quaternion(); this.q2 = new T.Quaternion(); this.eu = new T.Euler();
  }
  sync(l) {
    const key = [l.prim, l.inner, l.taper, l.spikes, l.seed].join('|');
    if (key !== this.key) { this.obj.geometry.dispose(); this.obj.geometry = primGeometry(l); this.key = key; }
    const u = this.mat.uniforms;
    bakeRamp(this.ramp, l); applySurf(u, l, !!WRAPPED[l.prim], this.eng);
    u.uTwist.value = l.twist; u.uWobble.value = l.wobble; u.uWobTile.value = l.wobTile; u.uWobSpeed.value = l.wobSpeed;
    u.uWobPer.value = Math.max(1, Math.round(l.wobTile));
    u.uFadeV0.value = l.fadeV0; u.uFadeV1.value = l.fadeV1; u.uFresnel.value = l.fresnel; u.uFresPow.value = l.fresPow;
  }
  update(l, time, eng) {
    const t = time - l.start, u = this.mat.uniforms, tn = clamp(t / Math.max(1e-4, l.dur), 0, 1);
    this.obj.visible = l.visible && t >= 0 && t <= l.dur;
    if (!this.obj.visible) return 0;
    u.uTime.value = t; u.uTimeV.value = t; u.uT.value = tn;
    const pd = l.pathId ? eng.paths.get(l.pathId) : null, o = this.obj;
    this.q.set(0, 0, 0, 1); o.position.set(l.pos[0], l.pos[1], l.pos[2]);
    if (pd) {
      pd.sample(lerp(l.pathFrom, l.pathTo, ease(l.pathEase, tn)), this.P, this.Tn);
      o.position.add(this.P);
      if (l.alignPath) this.q.setFromUnitVectors(eng.UP, this.Tn);
    }
    if (l.facing === 'camera') this.q.copy(eng.camera.quaternion).multiply(eng.QX90);
    const D = Math.PI / 180;
    this.q2.setFromEuler(this.eu.set(l.rot[0] * D, l.rot[1] * D, l.rot[2] * D)); this.q.multiply(this.q2);
    this.q2.setFromAxisAngle(eng.UP, l.spin * D * t); this.q.multiply(this.q2);
    o.quaternion.copy(this.q);
    const s = Math.max(1e-4, evalCurve(l.sizeCurve, tn));
    o.scale.set(l.size[0] * s, l.size[1] * s, l.size[2] * s);
    return 0;
  }
  dispose() { this.obj.geometry.dispose(); this.mat.dispose(); this.ramp.dispose(); }
}

/* ───────── screen layer (flash + shake) ───────── */
class ScreenFX {
  constructor() { this.obj = new T.Object3D(); }
  sync() {}
  update(l, time, eng) {
    const t = time - l.start;
    if (!l.visible || t < 0 || t > l.dur) return 0;
    const k = clamp(evalCurve(l.visCurve, t / Math.max(1e-4, l.dur)), 0, 1), c = hexRGB(l.flashColor);
    eng.fFlash[0] += c[0] * k * l.flashAmt; eng.fFlash[1] += c[1] * k * l.flashAmt; eng.fFlash[2] += c[2] * k * l.flashAmt;
    const a = l.shakeAmp * k, f = l.shakeFreq;
    eng.fShake[0] += a * (Math.sin(t * f * 6.2832) * .6 + Math.sin(t * f * 15.7 + 1.3) * .4);
    eng.fShake[1] += a * (Math.cos(t * f * 5.1 + .7) * .6 + Math.sin(t * f * 13.1 + 2.1) * .4);
    return 0;
  }
  dispose() {}
}

/* ───────── shared placement for mesh-like layers ───────── */
const _P = new T.Vector3(), _Tn = new T.Vector3(), _q = new T.Quaternion(), _q2 = new T.Quaternion(), _eu = new T.Euler();
function placeObj(o, l, t, tn, eng, plane) {
  _q.set(0, 0, 0, 1); o.position.set(l.pos[0], l.pos[1], l.pos[2]);
  const pd = l.pathId ? eng.paths.get(l.pathId) : null;
  if (pd) { pd.sample(lerp(l.pathFrom, l.pathTo, ease(l.pathEase, tn)), _P, _Tn); o.position.add(_P); if (l.alignPath) _q.setFromUnitVectors(eng.UP, _Tn); }
  if (l.facing === 'camera') { _q.copy(eng.camera.quaternion); if (!plane) _q.multiply(eng.QX90); }
  const D = Math.PI / 180;
  _q2.setFromEuler(_eu.set(l.rot[0] * D, l.rot[1] * D, l.rot[2] * D)); _q.multiply(_q2);
  if (l.spin) { _q2.setFromAxisAngle(eng.UP, l.spin * D * t); _q.multiply(_q2); }
  o.quaternion.copy(_q);
}
const G_KEY = `
float keyA(vec4 t,int k,vec3 kc,float thr,float soft,float inv){ float a=t.a;
  if(k==1) a*=smoothstep(thr-soft,thr+soft+.001,dot(t.rgb,vec3(.299,.587,.114)));
  else if(k==2) a*=smoothstep(thr-soft,thr+soft+.001,distance(t.rgb,kc));
  return inv>.5 ? 1.-a : a; }`;
const KEYS = ['none', 'luma', 'chroma'];

/* ───────── occluders: invisible depth-only holdouts ───────── */
function occGeo(shape, lo) {
  const s = lo ? 1 : 3; let g;
  switch (shape) {
    case 'sphere': g = new T.SphereGeometry(.5, 8 * s, 6 * s); g.translate(0, .5, 0); break;
    case 'cylinder': g = new T.CylinderGeometry(.5, .5, 1, 10 * s, 1); g.translate(0, .5, 0); break;
    case 'capsule': { const pts = []; for (let i = 0; i <= 6 * s; i++) { const a = i / (6 * s) * Math.PI / 2; pts.push(new T.Vector2(Math.sin(a) * .5, .5 - Math.cos(a) * .5)); }
      for (let i = 0; i <= 6 * s; i++) { const a = i / (6 * s) * Math.PI / 2; pts.push(new T.Vector2(Math.cos(a) * .5, 1.5 + Math.sin(a) * .5)); }
      g = new T.LatheGeometry(pts, 10 * s); g.scale(1, .5, 1); break; }
    case 'wall': g = new T.PlaneGeometry(1, 1); g.translate(0, .5, 0); break;
    case 'floor': g = new T.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); break;
    default: g = new T.BoxGeometry(1, 1, 1); g.translate(0, .5, 0);
  }
  return g;
}
class OccluderFX {
  constructor(eng) {
    this.eng = eng; this.key = '';
    this.obj = new T.Mesh(new T.BufferGeometry(), new T.MeshBasicMaterial({ colorWrite: false, depthWrite: true, side: T.DoubleSide }));
    this.obj.frustumCulled = false;
    this.ghost = new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({ color: 0x9aa6d8, transparent: true, opacity: .55, depthTest: false }));
    this.ghost.frustumCulled = false; this.ghost.matrixAutoUpdate = false; eng.helpers.add(this.ghost);
  }
  sync(l) {
    if (l.shape !== this.key) {
      this.obj.geometry.dispose(); this.obj.geometry = occGeo(l.shape, false);
      this.ghost.geometry.dispose(); const lo = occGeo(l.shape, true); this.ghost.geometry = new T.EdgesGeometry(lo, 1); lo.dispose(); this.key = l.shape;
    }
  }
  update(l, time, eng) {
    const t = time - l.start, on = l.visible && (l.always || (t >= 0 && t <= l.dur));
    this.obj.visible = on; this.ghost.visible = on && l.ghost !== false;
    if (!on) return 0;
    const tn = clamp(t / Math.max(1e-4, l.dur), 0, 1), s = Math.max(1e-4, evalCurve(l.sizeCurve, tn)), o = this.obj;
    placeObj(o, l, t, tn, eng, false); o.scale.set(l.size[0] * s, l.size[1] * s, l.size[2] * s);
    o.updateMatrixWorld(); this.ghost.matrix.copy(o.matrixWorld); this.ghost.matrixWorld.copy(o.matrixWorld);
    return 0;
  }
  dispose() { this.eng.helpers.remove(this.ghost); this.ghost.geometry.dispose(); this.ghost.material.dispose(); this.obj.geometry.dispose(); this.obj.material.dispose(); }
}

/* ───────── media: imported image / video as backdrop, foreground matte or 3D card ───────── */
const CARD_VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const CARD_FS = `uniform sampler2D uTex; uniform int uKey; uniform vec3 uKeyCol; uniform float uKeyThr,uKeySoft,uKeyInv,uOpacity,uBright,uAdditive,uCutA; varying vec2 vUv;
${G_KEY}
void main(){ vec4 t=texture2D(uTex,vUv); float a=keyA(t,uKey,uKeyCol,uKeyThr,uKeySoft,uKeyInv)*uOpacity; if(a<uCutA) discard;
  gl_FragColor=vec4(t.rgb*uBright*a,a*(1.-uAdditive)); }`;
class MediaFX {
  constructor(eng) {
    this.eng = eng;
    this.mat = fxMaterial({ vertexShader: CARD_VS, fragmentShader: CARD_FS, uniforms: {
      uTex: { value: null }, uKey: { value: 0 }, uKeyCol: { value: new T.Color() }, uKeyThr: { value: .3 }, uKeySoft: { value: .1 }, uKeyInv: { value: 0 },
      uOpacity: { value: 1 }, uBright: { value: 1 }, uAdditive: { value: 0 }, uCutA: { value: .02 } } });
    this.obj = new T.Mesh(new T.PlaneGeometry(1, 1), this.mat); this.obj.frustumCulled = false; this.obj.visible = false;
  }
  sync(l) {
    const u = this.mat.uniforms, m = this.eng.media.get(l.mediaId);
    u.uTex.value = this.eng.texFor(l.mediaId); this.aspect = m ? m.w / Math.max(1, m.h) : 1;
    u.uKey.value = Math.max(0, KEYS.indexOf(l.key)); u.uKeyCol.value.set(l.keyColor || '#00ff00'); u.uKeyThr.value = l.keyThr; u.uKeySoft.value = l.keySoft; u.uKeyInv.value = l.keyInv ? 1 : 0;
    u.uBright.value = l.bright; u.uAdditive.value = l.additive || 0; u.uCutA.value = l.depth ? .5 : .02;
    this.mat.transparent = !l.depth; this.mat.depthWrite = !!l.depth; this.mat.needsUpdate = true;
  }
  update(l, time, eng) {
    const t = time - l.start, on = l.visible && t >= 0 && t <= l.dur, m = eng.media.get(l.mediaId);
    this.obj.visible = false;
    if (!on || !m) return 0;
    const tn = clamp(t / Math.max(1e-4, l.dur), 0, 1), op = l.opacity * clamp(evalCurve(l.visCurve, tn), 0, 1);
    if (l.place === 'card') {
      const o = this.obj, s = Math.max(1e-4, evalCurve(l.sizeCurve, tn)) * l.scale;
      o.visible = true; this.mat.uniforms.uOpacity.value = op;
      placeObj(o, l, t, tn, eng, true); o.scale.set(s * (m.w / Math.max(1, m.h)), s, 1);
    } else {
      const slot = l.place === 'foreground' ? eng.fFront : eng.fBack;
      slot.on = true; slot.tex = m.tex; slot.aspect = m.w / Math.max(1, m.h); slot.l = l; slot.op = op;
    }
    return 0;
  }
  dispose() { this.obj.geometry.dispose(); this.mat.dispose(); }
}

/* ───────── manga overlays: focus lines, speed lines, sunburst, screentone, impact frame ───────── */
const MANGA_MODES = ['focus', 'speed', 'burst', 'tone'];
const MANGA_FS = `uniform int uMode; uniform vec2 uRes,uCenter; uniform vec3 uCol;
uniform float uOp,uDensity,uInner,uInnerVar,uThick,uSeed,uAngle,uScroll,uTime,uSize,uSkip,uGradA,uGradB; varying vec2 vUv;
float h1(float x){ return fract(sin(x*127.1+uSeed*17.31)*43758.5453); }
void main(){
  vec2 p=(vUv-uCenter)*vec2(uRes.x/uRes.y,1.)*2.; float a=0.; float px=2./uRes.y;
  if(uMode==0||uMode==2){
    float r=length(p); float k=(atan(p.y,p.x)/6.28318+.5)*uDensity+(uMode==2 ? uTime*uScroll : 0.);
    float id=floor(k), f=abs(fract(k)-.5)*2.; float aa=uDensity/(6.28318*max(r,.02))*px*1.5;
    if(uMode==2) a=smoothstep(uInner,uInner+.02,r)*(1.-smoothstep(uThick-aa,uThick+aa,f));
    else { float rnd=h1(id), rnd2=h1(id*1.7+3.), rnd3=h1(id*2.3+7.);
      float st=uInner*(1.+uInnerVar*(rnd*2.-1.)); float t=clamp((r-st)/max(.05,1.5-st),0.,1.);
      float lw=uThick*(.3+.7*rnd2)*t; a=step(st,r)*step(uSkip,rnd3)*(1.-smoothstep(lw-aa,lw+aa,f)); }
  } else if(uMode==1){
    float c=cos(uAngle), s=sin(uAngle); vec2 q=vec2(c*p.x+s*p.y,-s*p.x+c*p.y);
    float k=q.y*uDensity*.5; float id=floor(k), f=abs(fract(k)-.5)*2.; float aa=uDensity*.5*px*1.5;
    float rnd=h1(id), rnd2=h1(id*1.7+3.), rnd3=h1(id*2.3+7.);
    float seg=fract(q.x*.22*(.6+rnd)+rnd*7.-uTime*uScroll*(.5+rnd2)*.25); float len=.4+.5*rnd2;
    float lw=uThick*(.3+.7*rnd2)*sin(3.14159*clamp(seg/len,0.,1.));
    a=step(seg,len)*step(uSkip,rnd3)*(1.-smoothstep(lw-aa,lw+aa,f));
    if(uInner>0.) a*=smoothstep(uInner,uInner+.3,abs(q.y));
  } else {
    vec2 g=mat2(.7071,-.7071,.7071,.7071)*gl_FragCoord.xy/max(3.,uSize*uRes.y/95.); float d=length(fract(g)-.5);
    vec2 pc=(vUv-.5)*vec2(uRes.x/uRes.y,1.)*2.; float t=clamp((dot(pc,vec2(cos(uAngle),sin(uAngle)))*.5+.5-uGradA)/max(.001,uGradB-uGradA),0.,1.);
    float rad=t*.72; a=(1.-smoothstep(rad-.06,rad+.06,d))*step(.001,t);
  }
  gl_FragColor=vec4(uCol,a*uOp); }`;
class MangaFX {
  constructor() { this.obj = new T.Object3D(); }
  sync() {}
  update(l, time, eng) {
    const t = time - l.start; if (!l.visible || t < 0 || t > l.dur) return 0;
    const tn = clamp(t / Math.max(1e-4, l.dur), 0, 1), k = clamp(evalCurve(l.visCurve, tn), 0, 1) * l.opacity;
    if (k <= 0) return 0;
    if (l.mode === 'impact') { if (!eng.fImpact || eng.fImpact.k < k) eng.fImpact = { k, l }; return 0; }
    let cx = .5 + l.shift[0], cy = .5 + l.shift[1];
    if (l.anchor === 'world' && (l.mode === 'focus' || l.mode === 'burst')) {
      _P.set(0, 0, 0); const pd = l.pathId ? eng.paths.get(l.pathId) : null; if (pd) pd.sample(lerp(l.pathFrom, l.pathTo, ease(l.pathEase, tn)), _P);
      _P.x += l.pos[0]; _P.y += l.pos[1]; _P.z += l.pos[2]; _P.project(eng.camera); cx = _P.x * .5 + .5; cy = _P.y * .5 + .5;
    }
    eng.fManga.push({ l, k, t, cx, cy });
    return 0;
  }
  dispose() {}
}

/* ───────── lettering: SFX text drawn to a canvas card ───────── */
class TextFX {
  constructor(eng) {
    this.eng = eng; this.key = ''; this.aw = 1; this.ah = 1;
    this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = 8;
    this.tex = new T.CanvasTexture(this.canvas); this.tex.minFilter = this.tex.magFilter = T.LinearFilter; this.tex.generateMipmaps = false;
    this.mat = fxMaterial({ vertexShader: CARD_VS, fragmentShader: CARD_FS, uniforms: {
      uTex: { value: this.tex }, uKey: { value: 0 }, uKeyCol: { value: new T.Color() }, uKeyThr: { value: 0 }, uKeySoft: { value: 0 }, uKeyInv: { value: 0 },
      uOpacity: { value: 1 }, uBright: { value: 1 }, uAdditive: { value: 0 }, uCutA: { value: .01 } } });
    this.obj = new T.Mesh(new T.PlaneGeometry(1, 1), this.mat); this.obj.frustumCulled = false; this.obj.visible = false;
  }
  draw(l) {
    const fs = 150, cv = this.canvas, chars = [...(l.text || '')], font = `${fs}px "${l.font}","Dela Gothic One","Arial Black",sans-serif`;
    let ctx = cv.getContext('2d'); ctx.font = font;
    const ws = chars.map(ch => Math.max(fs * .3, ctx.measureText(ch).width)), sp = 1 + (l.spacing || 0), pad = fs * (.4 + (l.strokeW || 0) + (l.chaos || 0) * .35);
    const colW = Math.max(fs * .6, ...ws), adv = l.vertical ? chars.map(() => fs * .98 * sp) : ws.map(w => w * sp), total = adv.reduce((a, b) => a + b, 0);
    let W = (l.vertical ? colW : total) + pad * 2, H = (l.vertical ? total : fs * 1.1) + pad * 2; const k = Math.min(1, 2048 / Math.max(W, H));
    cv.width = Math.max(8, Math.ceil(W * k)); cv.height = Math.max(8, Math.ceil(H * k));
    ctx = cv.getContext('2d'); ctx.setTransform(k, 0, 0, k, 0, 0); ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    const R = rng((l.seed | 0) * 53 + 5), tf = chars.map(() => [(R() - .5) * (l.chaos || 0) * .7, 1 + (R() - .5) * (l.chaos || 0) * .5, (R() - .5) * (l.chaos || 0) * fs * .35]);
    const sk = Math.tan((l.skew || 0) * Math.PI / 180);
    for (let pass = 0; pass < 2; pass++) {
      if (pass === 0 && !(l.strokeW > 0)) continue;
      let cur = pad;
      chars.forEach((ch, i) => {
        const c = cur + adv[i] / 2; cur += adv[i];
        ctx.save(); ctx.translate(l.vertical ? W / 2 : c, l.vertical ? c : H / 2); ctx.rotate(tf[i][0]); ctx.scale(tf[i][1], tf[i][1]); ctx.transform(1, 0, -sk, 1, 0, 0); ctx.translate(0, tf[i][2]);
        if (pass === 0) { ctx.lineWidth = l.strokeW * fs * 2; ctx.strokeStyle = l.stroke; ctx.strokeText(ch, 0, 0); } else { ctx.fillStyle = l.fill; ctx.fillText(ch, 0, 0); }
        ctx.restore();
      });
    }
    this.aw = W / fs; this.ah = H / fs; this.tex.needsUpdate = true;
  }
  sync(l) {
    const key = [l.text, l.font, l.fill, l.stroke, l.strokeW, l.vertical, l.skew, l.spacing, l.chaos, l.seed].join('|');
    if (key !== this.key) {
      this.key = key; this.draw(l);
      if (document.fonts && document.fonts.load) { try { document.fonts.load(`150px "${l.font}"`, l.text || 'A').then(() => { if (this.key === key) this.draw(l); }).catch(() => {}); } catch (e) {} }
    }
    this.mat.uniforms.uBright.value = l.bright; this.mat.uniforms.uAdditive.value = l.additive || 0;
  }
  update(l, time, eng) {
    const t = time - l.start, on = l.visible && t >= 0 && t <= l.dur && !!l.text, o = this.obj;
    o.visible = on; if (!on) return 0;
    const tn = clamp(t / Math.max(1e-4, l.dur), 0, 1); let s = Math.max(1e-4, evalCurve(l.sizeCurve, tn)) * l.scale;
    this.mat.uniforms.uOpacity.value = l.opacity * clamp(evalCurve(l.visCurve, tn), 0, 1);
    placeObj(o, l, t, tn, eng, true);
    if (l.shake > 0) {
      const R = rng(Math.floor(t * Math.max(1, l.shakeRate)) * 31 + (l.seed | 0)), cam = eng.camera;
      _Tn.setFromMatrixColumn(cam.matrixWorld, 0); o.position.addScaledVector(_Tn, (R() - .5) * l.shake * l.scale * 1.4);
      _Tn.setFromMatrixColumn(cam.matrixWorld, 1); o.position.addScaledVector(_Tn, (R() - .5) * l.shake * l.scale * 1.4);
      o.rotateZ((R() - .5) * l.shake * 1.6); s *= 1 + (R() - .5) * l.shake * .8;
    }
    o.scale.set(this.aw * s, this.ah * s, 1);
    return 0;
  }
  dispose() { this.obj.geometry.dispose(); this.mat.dispose(); this.tex.dispose(); }
}

/* ───────── post: bloom + composite ───────── */
const FS_VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
const PRE_FS = `uniform sampler2D tMap; uniform vec2 uTexel; uniform float uThreshold; varying vec2 vUv;
void main(){ vec3 c=(texture2D(tMap,vUv+uTexel*vec2(-1.,-1.)).rgb+texture2D(tMap,vUv+uTexel*vec2(1.,-1.)).rgb+texture2D(tMap,vUv+uTexel*vec2(-1.,1.)).rgb+texture2D(tMap,vUv+uTexel*vec2(1.,1.)).rgb)*.25;
  float br=max(c.r,max(c.g,c.b)); float soft=clamp(br-uThreshold+.2,0.,.4); soft=soft*soft/.8;
  float k=max(soft,br-uThreshold)/max(br,1e-4); gl_FragColor=vec4(min(c*k,vec3(24.)),1.); }`;
const DOWN_FS = `uniform sampler2D tMap; uniform vec2 uTexel; varying vec2 vUv;
void main(){ vec3 c=texture2D(tMap,vUv).rgb*4.; c+=texture2D(tMap,vUv+uTexel*vec2(-1.,-1.)).rgb; c+=texture2D(tMap,vUv+uTexel*vec2(1.,-1.)).rgb; c+=texture2D(tMap,vUv+uTexel*vec2(-1.,1.)).rgb; c+=texture2D(tMap,vUv+uTexel*vec2(1.,1.)).rgb; gl_FragColor=vec4(c/8.,1.); }`;
const UP_FS = `uniform sampler2D tMap; uniform vec2 uTexel; uniform float uW; varying vec2 vUv;
void main(){ vec3 c=texture2D(tMap,vUv+uTexel*vec2(-2.,0.)).rgb+texture2D(tMap,vUv+uTexel*vec2(2.,0.)).rgb+texture2D(tMap,vUv+uTexel*vec2(0.,2.)).rgb+texture2D(tMap,vUv+uTexel*vec2(0.,-2.)).rgb;
  c+=2.*(texture2D(tMap,vUv+uTexel*vec2(-1.,1.)).rgb+texture2D(tMap,vUv+uTexel*vec2(1.,1.)).rgb+texture2D(tMap,vUv+uTexel*vec2(-1.,-1.)).rgb+texture2D(tMap,vUv+uTexel*vec2(1.,-1.)).rgb);
  gl_FragColor=vec4(c/12.*uW,1.); }`;
const COMP_FS = `uniform sampler2D tScene,tBloom; uniform float uStrength,uExposure; uniform vec3 uFlash; varying vec2 vUv;
void main(){ vec4 s=texture2D(tScene,vUv); vec3 c=s.rgb+texture2D(tBloom,vUv).rgb*uStrength; c+=uFlash; c*=uExposure;
  float m=max(c.r,max(c.g,c.b));
  if(m>1e-4){ const float k=.6; float mm=m<k ? m : k+(1.-exp(-(m-k)/(1.-k)))*(1.-k); c*=mm/m; c=mix(c,vec3(mm),smoothstep(1.3,6.,m)*.7); }
  gl_FragColor=vec4(c,clamp(s.a,0.,1.)); }`;
const LOOK_FS = `uniform sampler2D tFx,tBack,tFront; uniform vec2 uRes; uniform float uTime,uHasBack,uHasFront;
uniform vec4 uBackFit,uFrontFit,uBKeyP,uFKeyP; uniform int uBKey,uFKey; uniform vec3 uBKeyCol,uFKeyCol,uOutlineCol,uTintA,uTintB;
uniform float uBackBright,uFrontBright,uBackOp,uFrontOp;
uniform float uPixel,uPoster,uOutline,uHalftone,uHue,uSat,uContrast,uTintAmt,uChroma,uScan,uGrain,uVignette,uGradeAll;
uniform float uImpact,uImpThr,uImpInv; uniform vec3 uImpA,uImpB;
varying vec2 vUv;
${G_KEY}
float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float lum(vec3 c){ return dot(c,vec3(.299,.587,.114)); }
vec3 hueRot(vec3 c,float a){ const vec3 k=vec3(.57735); float ca=cos(a),sa=sin(a); return c*ca+cross(k,c)*sa+k*dot(k,c)*(1.-ca); }
vec4 plate(sampler2D t,vec2 uv,vec4 fit){ vec2 p=(uv-.5)*fit.xy+.5+fit.zw; if(p.x<0.||p.x>1.||p.y<0.||p.y>1.) return vec4(0.); return texture2D(t,p); }
vec3 grade(vec3 c){
  if(uHue!=0.) c=max(hueRot(c,uHue*6.28318),0.);
  c=mix(vec3(lum(c)),c,uSat);
  c=max((c-.5)*uContrast+.5,0.);
  if(uPoster>1.5) c=floor(c*uPoster+.5)/uPoster;
  if(uHalftone>0.){ float sz=max(5.,uRes.y/105.)*max(1.,uPixel*.6); vec2 g=mat2(.7071,-.7071,.7071,.7071)*gl_FragCoord.xy/sz;
    float d=length(fract(g)-.5); float l0=clamp(lum(c),0.,1.); float rad=l0*.64+.04*step(.02,l0); float dm=1.-smoothstep(rad-.05,rad+.05,d);
    vec3 full=c/max(l0,.001)*min(1.,l0*1.6+.25); c=mix(c,full*dm,uHalftone*step(.02,l0)); }
  if(uTintAmt>0.) c=mix(c,mix(uTintA,uTintB,clamp(lum(c),0.,1.)),uTintAmt);
  return c; }
void main(){
  vec2 uv=vUv, uq=uv;
  if(uPixel>1.) uq=(floor(uv*uRes/uPixel)+.5)*uPixel/uRes;
  vec4 fx=texture2D(tFx,uq);
  if(uChroma>0.){ vec2 o=(uv-.5)*uChroma*.016; fx.r=texture2D(tFx,uq+o).r; fx.b=texture2D(tFx,uq-o).b; }
  float ol=0.;
  if(uOutline>0.){ vec2 px=max(1.,uPixel)*1.6/uRes;
    vec4 a=texture2D(tFx,uq+vec2(px.x,0.)),b=texture2D(tFx,uq-vec2(px.x,0.)),c2=texture2D(tFx,uq+vec2(0.,px.y)),d=texture2D(tFx,uq-vec2(0.,px.y));
    float gx=max(a.r,max(a.g,a.b))-max(b.r,max(b.g,b.b)), gy=max(c2.r,max(c2.g,c2.b))-max(d.r,max(d.g,d.b));
    ol=smoothstep(.12,.4,length(vec2(gx,gy)))*uOutline; }
  vec2 up=uGradeAll>.5 ? uq : uv;
  vec3 back=vec3(0.);
  if(uHasBack>.5){ vec4 b=plate(tBack,up,uBackFit); back=b.rgb*uBackBright*keyA(b,uBKey,uBKeyCol,uBKeyP.x,uBKeyP.y,uBKeyP.z)*uBackOp; }
  vec3 fg=vec3(0.); float fa=0.;
  if(uHasFront>.5){ vec4 f=plate(tFront,up,uFrontFit); fa=keyA(f,uFKey,uFKeyCol,uFKeyP.x,uFKeyP.y,uFKeyP.z)*uFrontOp; fg=f.rgb*uFrontBright; }
  vec3 c;
  if(uHasBack<.5 || uGradeAll>.5){ c=back*(1.-fx.a)+fx.rgb; if(uGradeAll>.5) c=mix(c,fg,fa); c=grade(c); c=mix(c,uOutlineCol,ol*(uGradeAll>.5 ? 1.-fa : 1.)); if(uGradeAll<.5) c=mix(c,fg,fa); }
  else { float w=clamp(max(fx.a,lum(fx.rgb)*6.),0.,1.); vec3 g=mix(fx.rgb,grade(fx.rgb),w); c=back*(1.-fx.a)+g; c=mix(c,uOutlineCol,ol); c=mix(c,fg,fa); }
  if(uImpact>0.){ float bw=smoothstep(uImpThr-.03,uImpThr+.03,lum(c)); if(uImpInv>.5) bw=1.-bw; c=mix(c,mix(uImpA,uImpB,bw),uImpact); }
  if(uScan>0.) c*=1.-uScan*.55*(.5+.5*sin(gl_FragCoord.y*2.4));
  if(uGrain>0.) c+=(h(gl_FragCoord.xy+fract(uTime)*91.7)-.5)*uGrain*.28;
  vec2 d2=uv-.5; c*=1.-uVignette*dot(d2,d2)*1.6;
  c+=(h(gl_FragCoord.xy)-.5)/255.;
  gl_FragColor=vec4(c,1.); }`;
const DUMMY_FS = `varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2); float l=step(.1,dot(normalize(vN),normalize(vec3(.4,.8,.5))))*.05; gl_FragColor=vec4(vec3(.07,.075,.11)+l+f*vec3(.18,.2,.34),1.); }`;
const DUMMY_VS = `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalMatrix*normal; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;

class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    r.autoClear = false;
    const gl = r.getContext();
    this.hdr = !!(r.capabilities.isWebGL2 && (gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float')));
    this.ok = r.capabilities.isWebGL2;
    this.scene = new T.Scene(); this.helpers = new T.Scene();
    this.camera = new T.PerspectiveCamera(38, 1, .05, 300);
    this.cam = { target: new T.Vector3(0, 1.2, 0), dist: 9, theta: .5, phi: 1.25 };
    this.UP = new T.Vector3(0, 1, 0); this.QX90 = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2);
    this.paths = new Map(); this.fx = new Map(); this.lines = new Map();
    this.nullPath = new PathData(); this.nullPath.update({ points: [[0, 0, 0], [0, 1, 0]] });
    this.project = null; this.fFlash = [0, 0, 0]; this.fShake = [0, 0]; this.particleCount = 0;
    this.media = new Map(); this.fBack = { on: false }; this.fFront = { on: false }; this.fManga = []; this.fImpact = null;
    this.blankTex = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, T.RGBAFormat); this.blankTex.needsUpdate = true;
    this.view = { grid: true, bloom: true, dummy: false, paths: true };
    this.bg = new T.Color('#0b0c13');
    // stage
    this.grid = new T.Group();
    const g1 = new T.GridHelper(24, 24, 0x2b3050, 0x191c2e); g1.material.transparent = true; g1.material.opacity = .9; g1.material.depthWrite = false;
    this.grid.add(g1); this.scene.add(this.grid);
    const pts = []; for (let i = 0; i <= 20; i++) { const v = i / 20; pts.push(new T.Vector2(Math.sin(Math.min(1, v * 3) * Math.PI / 2) * .32 * (v > .78 ? Math.cos((v - .78) / .22 * Math.PI / 2) * .9 + .02 : 1), v * 1.75)); }
    this.dummy = new T.Mesh(new T.LatheGeometry(pts, 28), new T.ShaderMaterial({ vertexShader: DUMMY_VS, fragmentShader: DUMMY_FS }));
    this.dummy.visible = false; this.scene.add(this.dummy);
    this.root = new T.Group(); this.scene.add(this.root);
    // post
    this.fsCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1); this.fsScene = new T.Scene();
    this.fsQuad = new T.Mesh(new T.PlaneGeometry(2, 2), null); this.fsQuad.frustumCulled = false; this.fsScene.add(this.fsQuad);
    const M = (fs, u, add) => new T.ShaderMaterial({ vertexShader: FS_VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false,
      blending: add ? T.CustomBlending : T.NoBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, transparent: !!add });
    this.mPre = M(PRE_FS, { tMap: { value: null }, uTexel: { value: new T.Vector2() }, uThreshold: { value: .8 } });
    this.mDown = M(DOWN_FS, { tMap: { value: null }, uTexel: { value: new T.Vector2() } });
    this.mUp = M(UP_FS, { tMap: { value: null }, uTexel: { value: new T.Vector2() }, uW: { value: 1 } }, true);
    this.mComp = M(COMP_FS, { tScene: { value: null }, tBloom: { value: null }, uStrength: { value: 1 }, uExposure: { value: 1 }, uFlash: { value: new T.Vector3() } });
    const V4 = () => ({ value: new T.Vector4(1, 1, 0, 0) }), C3 = () => ({ value: new T.Color() }), F = v => ({ value: v });
    this.mLook = M(LOOK_FS, { tFx: F(null), tBack: F(this.blankTex), tFront: F(this.blankTex), uRes: { value: new T.Vector2(1, 1) }, uTime: F(0), uHasBack: F(0), uHasFront: F(0),
      uBackFit: V4(), uFrontFit: V4(), uBKeyP: V4(), uFKeyP: V4(), uBKey: F(0), uFKey: F(0), uBKeyCol: C3(), uFKeyCol: C3(), uOutlineCol: C3(), uTintA: C3(), uTintB: C3(),
      uBackBright: F(1), uFrontBright: F(1), uBackOp: F(1), uFrontOp: F(1), uPixel: F(1), uPoster: F(0), uOutline: F(0), uHalftone: F(0), uHue: F(0), uSat: F(1), uContrast: F(1),
      uTintAmt: F(0), uChroma: F(0), uScan: F(0), uGrain: F(0), uVignette: F(.5), uGradeAll: F(0), uImpact: F(0), uImpThr: F(.35), uImpInv: F(1), uImpA: C3(), uImpB: C3() });
    this.mManga = new T.ShaderMaterial({ vertexShader: FS_VS, fragmentShader: MANGA_FS, depthTest: false, depthWrite: false, transparent: true, uniforms: {
      uMode: F(0), uRes: { value: new T.Vector2(1, 1) }, uCenter: { value: new T.Vector2(.5, .5) }, uCol: C3(), uOp: F(1), uDensity: F(150), uInner: F(.5), uInnerVar: F(.3), uThick: F(.5),
      uSeed: F(1), uAngle: F(0), uScroll: F(0), uTime: F(0), uSize: F(1), uSkip: F(.2), uGradA: F(.2), uGradB: F(.9) } });
    this.rt = null; this.rtL = null; this.mips = []; this.w = 0; this.h = 0;
    this.resize(canvas.clientWidth || 800, canvas.clientHeight || 600, Math.min(window.devicePixelRatio || 1, 2));
  }
  resize(w, h, pr) {
    w = Math.max(2, Math.floor(w)); h = Math.max(2, Math.floor(h));
    let s = pr || 1; const maxPx = 2.6e6; if (w * h * s * s > maxPx) s = Math.sqrt(maxPx / (w * h));
    this.renderer.setPixelRatio(s); this.renderer.setSize(w, h, false);
    const W = Math.max(2, Math.floor(w * s)), H = Math.max(2, Math.floor(h * s));
    if (W === this.w && H === this.h) return;
    this.w = W; this.h = H; this.cssW = w; this.cssH = h;
    const type = this.hdr ? T.HalfFloatType : T.UnsignedByteType;
    const mk = (a, b, depth) => new T.WebGLRenderTarget(a, b, { type, format: T.RGBAFormat, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: depth, stencilBuffer: false });
    if (this.rt) this.rt.dispose(); this.mips.forEach(m => m.dispose());
    this.rt = mk(W, H, true); this.mips = [];
    if (this.rtL) this.rtL.dispose();
    this.rtL = new T.WebGLRenderTarget(W, H, { type: T.UnsignedByteType, format: T.RGBAFormat, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false, stencilBuffer: false });
    let mw = W >> 1, mh = H >> 1;
    for (let i = 0; i < 6 && mw > 4 && mh > 4; i++) { this.mips.push(mk(mw, mh, false)); mw >>= 1; mh >>= 1; }
    this.camera.aspect = W / H; this.camera.updateProjectionMatrix();
  }
  /* project */
  setProject(p) {
    this.fx.forEach(f => { this.root.remove(f.obj); f.dispose(); }); this.fx.clear();
    this.lines.forEach(l => { this.helpers.remove(l); l.geometry.dispose(); l.material.dispose(); }); this.lines.clear();
    this.paths.forEach(pd => pd.tex.dispose()); this.paths.clear();
    this.project = p;
    for (const path of p.paths) this.syncPath(path, true);
    for (const l of p.layers) this.syncLayer(l);
    this.reorder();
  }
  syncPath(path, skipLayers) {
    let pd = this.paths.get(path.id);
    if (!pd) { pd = new PathData(); this.paths.set(path.id, pd); }
    pd.update(path);
    let line = this.lines.get(path.id);
    if (!line) {
      line = new T.Line(new T.BufferGeometry(), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthTest: false }));
      line.geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(PN * 3), 3));
      line.frustumCulled = false; this.lines.set(path.id, line); this.helpers.add(line);
    }
    line.geometry.attributes.position.array.set(pd.P); line.geometry.attributes.position.needsUpdate = true;
    line.material.color.set(path.color || '#59e0ff');
    if (!skipLayers && this.project) for (const l of this.project.layers) if (l.pathId === path.id) this.syncLayer(l);
  }
  removePath(id) {
    const pd = this.paths.get(id); if (pd) { pd.tex.dispose(); this.paths.delete(id); }
    const line = this.lines.get(id); if (line) { this.helpers.remove(line); line.geometry.dispose(); line.material.dispose(); this.lines.delete(id); }
  }
  syncLayer(l) {
    let f = this.fx.get(l.id);
    if (f && f.type !== l.type) { this.removeLayer(l.id); f = null; }
    if (!f) {
      f = l.type === 'particles' ? new ParticleFX(this) : l.type === 'ribbon' ? new RibbonFX(this) : l.type === 'mesh' ? new MeshFX(this) : l.type === 'occluder' ? new OccluderFX(this) : l.type === 'media' ? new MediaFX(this) : l.type === 'manga' ? new MangaFX() : l.type === 'text' ? new TextFX(this) : new ScreenFX();
      f.type = l.type; this.fx.set(l.id, f); this.root.add(f.obj);
    }
    f.sync(l);
  }
  /* media */
  texFor(id) { const m = id ? this.media.get(id) : null; return m ? m.tex : this.blankTex; }
  setMedia(id, el, kind, w, h, dur) {
    const old = this.media.get(id); if (old) old.tex.dispose();
    const tex = kind === 'video' ? new T.VideoTexture(el) : new T.Texture(el);
    tex.format = T.RGBAFormat; tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.minFilter = tex.magFilter = T.LinearFilter; tex.generateMipmaps = false;
    if (kind !== 'video') tex.needsUpdate = true;
    this.media.set(id, { tex, el, kind, w: w || 1, h: h || 1, dur: dur || 0 });
    if (this.project) for (const l of this.project.layers) if (l.mediaId === id) this.syncLayer(l);
  }
  removeMedia(id) {
    const m = this.media.get(id); if (!m) return;
    if (m.kind === 'video') { try { m.el.pause(); } catch (e) {} }
    m.tex.dispose(); this.media.delete(id);
    if (this.project) for (const l of this.project.layers) if (l.mediaId === id) this.syncLayer(l);
  }
  syncVideos(time, playing, speed) {
    const p = this.project; if (!p) return;
    const want = new Map();
    for (const l of p.layers) {
      const m = l.mediaId ? this.media.get(l.mediaId) : null;
      if (!m || m.kind !== 'video' || !l.visible || want.has(l.mediaId)) continue;
      if (l.type === 'media') { const t = time - l.start; if (t < 0 || t > l.dur) continue; want.set(l.mediaId, { t: t * (l.rate || 1) + (l.offset || 0), rate: l.rate || 1, loop: l.loopVideo !== false }); }
      else if (time >= l.start) want.set(l.mediaId, { t: time - l.start, rate: 1, loop: true });
    }
    this.media.forEach((m, id) => {
      if (m.kind !== 'video') return;
      const v = m.el, w = want.get(id), d = v.duration;
      if (!w || !isFinite(d) || d <= 0) { if (!v.paused) v.pause(); return; }
      const des = w.loop ? ((w.t % d) + d) % d : clamp(w.t, 0, Math.max(0, d - .04));
      if (playing) {
        const r = clamp(speed * w.rate, .0625, 8); if (v.playbackRate !== r) v.playbackRate = r;
        if (v.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
        let diff = Math.abs(v.currentTime - des); if (w.loop) diff = Math.min(diff, d - diff);
        if (diff > .3) v.currentTime = des;
      } else {
        if (!v.paused) v.pause();
        if (!v.seeking && Math.abs(v.currentTime - des) > .03) v.currentTime = des;
      }
    });
  }
  removeLayer(id) { const f = this.fx.get(id); if (f) { this.root.remove(f.obj); f.dispose(); this.fx.delete(id); } }
  reorder() { if (this.project) this.project.layers.forEach((l, i) => { const f = this.fx.get(l.id); if (f) f.obj.renderOrder = i + 1; }); }
  highlightPath(id) { this.lines.forEach((l, k) => { l.material.opacity = k === id ? 1 : .4; }); }
  /* camera */
  applyCam() {
    const c = this.cam, sp = Math.sin(c.phi), cam = this.camera;
    cam.position.set(c.target.x + c.dist * sp * Math.sin(c.theta), c.target.y + c.dist * Math.cos(c.phi), c.target.z + c.dist * sp * Math.cos(c.theta));
    cam.lookAt(c.target);
    if (this.fShake[0] || this.fShake[1]) { cam.translateX(this.fShake[0]); cam.translateY(this.fShake[1]); }
    cam.updateMatrixWorld();
  }
  orbit(dx, dy) { const c = this.cam; c.theta -= dx * .006; c.phi = clamp(c.phi - dy * .006, .05, Math.PI - .05); }
  pan(dx, dy) {
    const c = this.cam, k = c.dist * .0012, cam = this.camera, r = new T.Vector3(), u = new T.Vector3();
    r.setFromMatrixColumn(cam.matrixWorld, 0); u.setFromMatrixColumn(cam.matrixWorld, 1);
    c.target.addScaledVector(r, -dx * k).addScaledVector(u, dy * k);
  }
  zoom(f) { this.cam.dist = clamp(this.cam.dist * f, .8, 80); }
  projectPoint(v, out) {
    const p = (this._pv || (this._pv = new T.Vector3())).copy(v).project(this.camera);
    out.x = (p.x * .5 + .5) * this.cssW; out.y = (-p.y * .5 + .5) * this.cssH; out.visible = p.z > -1 && p.z < 1;
    return out;
  }
  ray(px, py) {
    const rc = this._rc || (this._rc = new T.Raycaster());
    rc.setFromCamera({ x: px / this.cssW * 2 - 1, y: -(py / this.cssH * 2 - 1) }, this.camera);
    return rc.ray;
  }
  rayPlane(px, py, normal, point) {
    const pl = (this._pl || (this._pl = new T.Plane())).setFromNormalAndCoplanarPoint(normal, point);
    return this.ray(px, py).intersectPlane(pl, new T.Vector3());
  }
  /* frame */
  pass(mat, target) { this.fsQuad.material = mat; this.renderer.setRenderTarget(target); this.renderer.render(this.fsScene, this.fsCam); }
  render(time, opts) {
    const p = this.project, r = this.renderer; if (!p) return;
    const clean = opts && opts.clean;
    this.fFlash[0] = this.fFlash[1] = this.fFlash[2] = 0; this.fShake[0] = this.fShake[1] = 0; this.fBack.on = false; this.fFront.on = false; this.fManga.length = 0; this.fImpact = null;
    for (const l of p.layers) if (l.type === 'screen') { const f = this.fx.get(l.id); if (f) f.update(l, time, this); }
    if (clean) { this.fFlash[0] = this.fFlash[1] = this.fFlash[2] = 0; this.fShake[0] = this.fShake[1] = 0; }
    this.applyCam();
    let pc = 0;
    for (const l of p.layers) if (l.type !== 'screen') { const f = this.fx.get(l.id); if (f) pc += f.update(l, time, this); }
    this.particleCount = pc;
    this.grid.visible = this.view.grid && !clean; this.dummy.visible = this.view.dummy;
    const hasBack = this.fBack.on && !clean, hasFront = this.fFront.on && !clean;
    this.bg.set(clean || hasBack ? '#000000' : (p.bg || '#0b0c13'));
    r.setRenderTarget(this.rt); r.setClearColor(this.bg, hasBack ? 0 : 1); r.clear(true, true, false);
    r.render(this.scene, this.camera);
    const b = p.bloom || {}, bloomOn = this.view.bloom && this.mips.length > 1 && b.strength > 0;
    if (bloomOn) {
      const m = this.mips;
      this.mPre.uniforms.tMap.value = this.rt.texture; this.mPre.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
      this.mPre.uniforms.uThreshold.value = this.hdr ? b.threshold : Math.min(b.threshold, .75);
      this.pass(this.mPre, m[0]);
      for (let i = 1; i < m.length; i++) { this.mDown.uniforms.tMap.value = m[i - 1].texture; this.mDown.uniforms.uTexel.value.set(1 / m[i - 1].width, 1 / m[i - 1].height); this.pass(this.mDown, m[i]); }
      for (let i = m.length - 2; i >= 0; i--) { this.mUp.uniforms.tMap.value = m[i + 1].texture; this.mUp.uniforms.uTexel.value.set(.5 / m[i + 1].width, .5 / m[i + 1].height); this.mUp.uniforms.uW.value = b.radius; this.pass(this.mUp, m[i]); }
    }
    const cu = this.mComp.uniforms;
    cu.tScene.value = this.rt.texture; cu.tBloom.value = this.mips[0].texture; cu.uStrength.value = bloomOn ? b.strength * .26 : 0;
    cu.uExposure.value = p.exposure || 1; cu.uFlash.value.set(this.fFlash[0], this.fFlash[1], this.fFlash[2]);
    this.pass(this.mComp, this.rtL);
    const lk = p.look || {}, lu = this.mLook.uniforms, asp = this.w / this.h;
    const fit = (slot, v4) => {
      const l = slot.l, ap = slot.aspect, z = Math.max(.05, l.zoom || 1); let sx = 1, sy = 1;
      if (l.fit === 'contain') { if (ap > asp) sy = ap / asp; else sx = asp / ap; } else if (l.fit !== 'stretch') { if (ap > asp) sx = asp / ap; else sy = ap / asp; }
      v4.set(sx / z, sy / z, l.shift ? l.shift[0] : 0, l.shift ? l.shift[1] : 0);
    };
    lu.tFx.value = this.rtL.texture; lu.uRes.value.set(this.w, this.h); lu.uTime.value = time;
    lu.uHasBack.value = hasBack ? 1 : 0; lu.uHasFront.value = hasFront ? 1 : 0;
    if (hasBack) { const l = this.fBack.l; lu.tBack.value = this.fBack.tex; fit(this.fBack, lu.uBackFit.value); lu.uBackBright.value = l.bright; lu.uBackOp.value = this.fBack.op;
      lu.uBKey.value = Math.max(0, KEYS.indexOf(l.key)); lu.uBKeyCol.value.set(l.keyColor || '#00ff00'); lu.uBKeyP.value.set(l.keyThr, l.keySoft, l.keyInv ? 1 : 0, 0); }
    if (hasFront) { const l = this.fFront.l; lu.tFront.value = this.fFront.tex; fit(this.fFront, lu.uFrontFit.value); lu.uFrontBright.value = l.bright; lu.uFrontOp.value = this.fFront.op;
      lu.uFKey.value = Math.max(0, KEYS.indexOf(l.key)); lu.uFKeyCol.value.set(l.keyColor || '#00ff00'); lu.uFKeyP.value.set(l.keyThr, l.keySoft, l.keyInv ? 1 : 0, 0); }
    lu.uPixel.value = Math.max(1, lk.pixel || 1); lu.uPoster.value = lk.poster || 0; lu.uOutline.value = lk.outline || 0; lu.uHalftone.value = lk.halftone || 0;
    lu.uHue.value = lk.hue || 0; lu.uSat.value = lk.sat == null ? 1 : lk.sat; lu.uContrast.value = lk.contrast == null ? 1 : lk.contrast; lu.uTintAmt.value = lk.tintAmt || 0;
    lu.uOutlineCol.value.set(lk.outlineCol || '#0a0a14'); lu.uTintA.value.set(lk.tintA || '#000000'); lu.uTintB.value.set(lk.tintB || '#ffffff');
    lu.uChroma.value = lk.chroma || 0; lu.uScan.value = clean ? 0 : (lk.scan || 0); lu.uGrain.value = clean ? 0 : (lk.grain || 0);
    lu.uVignette.value = clean ? 0 : (lk.vignette == null ? .5 : lk.vignette); lu.uGradeAll.value = lk.gradeAll ? 1 : 0;
    const im = clean ? null : this.fImpact;
    lu.uImpact.value = im ? im.k : 0;
    if (im) { lu.uImpThr.value = im.l.thr; lu.uImpInv.value = im.l.invert ? 1 : 0; lu.uImpA.value.set(im.l.color); lu.uImpB.value.set(im.l.color2); }
    this.pass(this.mLook, null);
    if (!clean) for (const m of this.fManga) {
      const l = m.l, u = this.mManga.uniforms;
      u.uMode.value = Math.max(0, MANGA_MODES.indexOf(l.mode)); u.uRes.value.set(this.w, this.h); u.uCenter.value.set(m.cx, m.cy); u.uCol.value.set(l.color); u.uOp.value = m.k;
      u.uDensity.value = l.density; u.uInner.value = l.inner; u.uInnerVar.value = l.innerVar; u.uThick.value = l.thick; u.uSkip.value = l.skip;
      u.uSeed.value = (l.seed || 1) + (l.rate > 0 && l.mode !== 'burst' ? Math.floor(m.t * l.rate) : 0); u.uAngle.value = l.angle * Math.PI / 180; u.uScroll.value = l.scroll; u.uTime.value = m.t;
      u.uSize.value = l.dotSize; u.uGradA.value = l.grad[0]; u.uGradB.value = l.grad[1];
      this.pass(this.mManga, null);
    }
    if (this.view.paths && !clean) { r.setRenderTarget(null); r.clearDepth(); r.render(this.helpers, this.camera); }
  }
}
VFX.Engine = Engine; VFX.SPRITES = SPRITES; VFX.NOISE_TYPES = NOISE_TYPES;
})();

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { createWorld, updateWorld, gradeShader, setDome, applyWorldQuality, QUALITY } from './world.js';
import { createProps, syncProps, layoutCandles, ANS_COL, BALL_Y, TABLE_Y } from './props.js';
import { createSpirits, updateSpirits, wispBurst, batsGo, beamTo } from './spirits.js';
import { createFX, sparks, puff, updateFX, seedFX } from './fx.js';
import { Seance, botPick, DIFF, MAIN_N, BOSS_N } from './quiz.js';
import { CATS } from './questions.js';
import { Player } from './music.js';
import * as A from './audio.js';
import { T } from './i18n.js';

const CREDIT_TXT = 'Built with Grok Bot · 4 days to Halloween 🎃';
const $ = id => document.getElementById(id);
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const lerp = (a, b, k) => a + (b - a) * k, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), smooth = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x), fin = (v, d = 0) => Number.isFinite(v) ? v : d;
const fmt = n => Math.round(fin(n)).toLocaleString('en-US');
let fxSeed = (window.__cwSeed || (Date.now() & 0xffffff)) >>> 0;
function rng() { fxSeed = (fxSeed + 0x6D2B79F5) >>> 0; let t = fxSeed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function autoLang() { try { const l = (navigator.languages && navigator.languages[0]) || navigator.language || ''; return /^de\b|^de-/i.test(l) ? 'de' : 'en'; } catch (e) { return 'en'; } }
const S = { state: 'intro', mode: 'seance', lang: ls.get('cw-lang', '') || autoLang(), diff: ls.get('cw-diff', 'medium'), kids: ls.get('cw-kids', '0') === '1', q: ls.get('cw-q', ''), qUser: !!ls.get('cw-q', ''),
  name: ls.get('cw-name', 'Player') || 'Player', gt: 0, ts: 1, player: 0, duel: [null, null], result: null, stars: 0, more: false, auto: false, botAcc: .9, introT: 0, titleT: -1, endT: 0, punch: 0, newBest: false,
  storm: null, rebuild: null, open: false, askT: 0, revealI: -1, hintShown: false, camBlend: 1, menuFlareT: 0 };
if (!DIFF[S.diff] || S.diff === 'kids') S.diff = 'medium';
if (!QUALITY[S.q]) { S.q = 'mid'; S.qUser = false; }
const dkey = () => S.kids ? 'kids' : S.diff;
A.setClock(() => S.gt);
const t = k => T[S.lang][k] ?? T.en[k] ?? k;
let isTouch = matchMedia && matchMedia('(pointer: coarse)').matches;

// ---------------- renderer / scene / post ----------------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__cwPDB });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; renderer.shadowMap.type = THREE.PCFShadowMap;
const W = createWorld(renderer); const scene = W.scene;
const camera = new THREE.PerspectiveCamera(50, 1, .1, 1200);
const F = createFX(scene, W.soft, W.smokeTex); F.floor = .02;
const P = createProps(scene, W);
const SP = createSpirits(scene, W.soft);
const MOON0 = W.moonDir.clone();
let composer, bloom, gradePass, rtOwn;
function disposeComposer() { if (!composer) return; for (const p of composer.passes) { if (p.dispose) p.dispose(); } composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); if (rtOwn) rtOwn.dispose(); composer = null; }
function buildComposer() { disposeComposer();
  const q = QUALITY[S.q]; rtOwn = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: q.msaa || 0 });
  composer = new EffectComposer(renderer, rtOwn); composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .6, .5, 1.1); { const hp = bloom.materialHighPassFilter; hp.fragmentShader = hp.fragmentShader.replace('vec4 texel = texture2D( tDiffuse, vUv );', 'vec4 texel = min( texture2D( tDiffuse, vUv ), vec4( 3.2 ) );'); hp.needsUpdate = true; } // clamp hot spots: glow, never glare
  composer.addPass(bloom); composer.addPass(new OutputPass()); gradePass = new ShaderPass(gradeShader()); composer.addPass(gradePass); }
function applyQuality(qn, user) {
  if (!QUALITY[qn]) qn = 'mid'; S.q = qn; if (user) { S.qUser = true; ls.set('cw-q', qn); } const q = QUALITY[qn];
  renderer.shadowMap.enabled = q.shadows; W.key.castShadow = q.shadows; if (q.shadows) W.key.shadow.mapSize.set(q.shadowSize, q.shadowSize); if (W.key.shadow.map) { W.key.shadow.map.dispose(); W.key.shadow.map = null; }
  P.ans.forEach(C => { C.L.visible = q.lights >= 5; }); applyWorldQuality(W, q);
  scene.traverse(o => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach(x => x.needsUpdate = true); } });
  buildComposer(); resize(); qLabels(); }
function qLabels() { const b = $('btnQ2'); if (b) { b.textContent = `⚙ ${t('q_' + S.q)}${S.qUser ? '' : ' · ' + t('qAuto')}`; b.title = t('qL'); } }
let VW = 1, VH = 1;
function resize() { VW = window.innerWidth; VH = window.innerHeight; const dpr = Math.min(window.devicePixelRatio || 1, QUALITY[S.q].dpr);
  renderer.setPixelRatio(dpr); renderer.setSize(VW, VH, false); if (composer) { composer.setPixelRatio(dpr); composer.setSize(VW, VH); } camera.aspect = VW / VH; camera.updateProjectionMatrix(); layoutCandles(P, VW / VH); band = 0; setTimeout(measureBand, 50); }

// ---------------- run state ----------------
let Q = null; const timers = []; const after = (s, f) => timers.push({ t: S.gt + s, f });
const music = new Player();
const bestKey = () => `cw-best-${S.mode}-${dkey()}`;
function resetVisuals() { timers.length = 0; S.ts = 1; S.punch = 0; S.storm = null; S.rebuild = null; S.open = false; setDome(W, 0); W.flash = 0; W.warm = 0; W.frost = 0; W.hurt = 0; W.moonScale = 1; W.moonDir.copy(MOON0);
  SP.sp.on = false; SP.sp.rise = 0; SP.sp.down = -1; SP.sp.hp = BOSS_N; SP.wT0 = null; SP.beam.visible = false; SP.flock.count = 0; for (const b of SP.bats) b.life = 0;
  P.ans.forEach(C => { C.lit = 1; C.flare = 0; C.out = 0; }); P.mistU.col.value.set('#8a6aff'); P.mistU.col2.value.set('#ff7ad8'); S.revealI = -1;
  for (let i = 0; i < F.life.length; i++) F.life[i] = 0; for (const p of F.puffs) { p.life = 0; p.s.visible = false; } $('banner').classList.remove('show'); window.__banners = []; window.__pops = []; }
function seedOf() { return S.mode === 'duel' ? (S.duelSeed || 1616) : (window.__cwQSeed ?? ((Date.now() & 0xffff) + 1)); }
function start(mode = 'seance') { S.mode = ['seance', 'endless', 'duel'].includes(mode) ? mode : 'seance';
  if (S.mode === 'duel' && S.player !== 1) { S.player = 0; S.duel = [null, null]; S.duelSeed = window.__cwQSeed ?? ((Date.now() & 0xffff) + 7); }
  resetVisuals(); Q = new Seance({ mode: S.mode, diff: dkey(), seed: seedOf() }); S.state = 'play'; S.result = null; S.more = false; S.auto = !!window.__cwAuto; S.hintShown = false;
  music.stop(); music.start('game', S.gt + .05); A.sfx.ui(); seedFX(1616); setTimeout(measureBand, 30); camSnap = false; S.camBlend = 0; handleEvents(); showLevelCard(); setUI(); applyLang(); }
function endRun(res) { if (S.state !== 'play') return; S.result = res; S.endT = S.gt; if (S.open && !S.rebuild) startRebuild();
  if (S.mode === 'duel' && res !== 'quit') { S.duel[S.player] = { score: Q.score, correct: Q.correct, of: Q.answered, best: Q.best, storms: Q.storms, res };
    if (S.player === 0) { S.state = 'handover'; S.player = 1; A.sfx.turn(); setUI(); applyLang(); return; } }
  S.stars = Q.stars(); S.newBest = false;
  if (S.mode !== 'duel' && res !== 'quit') { const b = +ls.get(bestKey(), '0') || 0; if (Q.score > b) { ls.set(bestKey(), String(Q.score)); S.newBest = Q.score > 0; } }
  S.state = 'end'; if (res === 'win') { A.sfx.win(); for (let i = 0; i < S.stars; i++) after(.45 + i * .35, () => A.sfx.star(i)); } else if (res !== 'quit') A.sfx.fail();
  SP.sp.on = false; music.start('menu', S.gt + .8); showEnd(); setUI(); }
function toMenu() { S.state = 'menu'; S.more = false; S.player = 0; resetVisuals(); Q = null; S.auto = false; S.titleT = -1; $('opening').style.opacity = 0;
  hideLevelCard(); music.start('menu', S.gt + .1); setUI(); applyLang(); }
function startIntro() { S.state = 'intro'; S.introT = 0; S.titleT = -1; resetVisuals(); Q = null; seedFX(77); music.stop(); camSnap = true;
  // frame 0 is already mid-blast: the dome is flying apart, the wisps are rising, fireworks crack in the sky
  S.intro = { stage: 0 }; setDome(W, .9); S.open = true; W.flash = .55; wispBurst(SP, S.gt - .9, new THREE.Vector3(0, BALL_Y, 0), 1.1); W.moonScale = 2.3; W.moonDir.copy(STORM_MOON);
  A.sfx.intro(); for (let i = 0; i < 5; i++) after(.15 + i * .38, () => firework(i)); setUI(); applyLang(); }
function endIntro() { $('opening').style.opacity = 0; S.titleT = -1; }

// ---------------- events from the rules → visuals + sound ----------------
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _sp = new THREE.Vector3();
const candlePos = (i, o = _v) => o.set(P.ans[i].g.position.x, P.ans[i].top + .05, P.ans[i].g.position.z);
const ballPos = (o = _v) => o.set(0, BALL_Y, 0);
const spectreChest = (o = _w) => o.set(0, SP.spectre.position.y + 2.2, SP.spectre.position.z + .3);
const STORM_MOON = new THREE.Vector3(0, .66, -.75).normalize();
function firework(i) { const p = _w.set((rng() - .5) * 18, 16 + rng() * 10, -8 - rng() * 14); const cols = [['#ffb347', '#ffe08a'], ['#c77dff', '#ffd0ff'], ['#6dff9a', '#e0fff0'], ['#5ad1ff', '#e0f4ff']][i % 4];
  sparks(F, p, 150, { colors: cols, speed: 8, up: 0, life: 1.8, size: .55, grav: 2.2 }); A.play(i % 2 ? 'fw_burst_b' : 'fw_burst', .26, .9 + rng() * .2, 0, .5, 0, clamp(p.x / 12, -.7, .7)); }
function column(i, big) { const p = candlePos(i, new THREE.Vector3()); const c = ANS_COL[i];
  sparks(F, p, big ? 90 : 46, { colors: [c, '#ffffff', c], speed: big ? 2.2 : 1.4, up: big ? 6.5 : 4.2, life: 1.1, size: .1, grav: -1.2 });
  sparks(F, ballPos(new THREE.Vector3()).add(_sp.set(0, .2, 0)), 30, { colors: [c, '#ffffff'], speed: 1.8, up: 1.2, life: .8, size: .07, grav: 0 }); }
function handleEvents() {
  if (!Q) return; const evs = Q.ev; if (!evs.length) return; Q.ev = [];
  const live = S.state === 'play';
  for (const e of evs) {
    switch (e.t) {
      case 'ask': case 'swapped': S.askT = S.gt; S.revealI = -1; P.ans.forEach(C => { C.flare = 0; C.out = 0; });
        P.mistU.col.value.set(Q.q.boss ? '#3affc0' : '#8a6aff'); P.mistU.col2.value.set(Q.q.boss ? '#9a7aff' : '#ff7ad8'); W.frost = 0;
        if (e.t === 'ask') { A.sfx.ask(Q.q.boss); if (!Q.q.boss && !SP.sp.on && music.name !== 'game') music.start('game', S.gt + .1); }
        cardIn(); break;
      case 'correct': { const C = P.ans[e.i]; C.flare = 1; S.revealI = e.i; column(e.i, e.streak >= 3 || e.surge); A.sfx.correct(e.streak, e.i, e.surge); P.mistU.col.value.set(ANS_COL[e.i]); P.mistU.col2.value.set('#ffffff');
        W.warm = Math.min(.6, W.warm + .12); S.punch = .6; W.flash = Math.max(W.flash, .18);
        if (live) { popAt(`+${fmt(e.pts)}`, ANS_COL[e.i], true, candlePos(e.i, new THREE.Vector3()).add(_sp.set(0, .5, 0))); if (e.streak >= 2) banner(`🔥 ${e.streak} ${t('inRow')} · ×${e.mult}${e.surge ? ' ⚡×2' : ''}`); else banner('✔ ' + t('right')); } break; }
      case 'wrong': { const C = P.ans[e.i]; C.out = 1; puff(F, candlePos(e.i, _w), 3, '#a8b8d8', .7); sparks(F, candlePos(e.i, _w), 26, { colors: ['#cfe8ff', '#ffffff'], speed: 2.2, up: .6, life: .7, size: .07, grav: 1 });
        if (e.kids) { A.sfx.kidsWrong(e.i); if (live) toast(t('kidsTry')); break; }
        A.sfx.wrong(e.i); P.ans[e.ok].flare = .45; S.revealI = e.ok; W.frost = .55; W.hurt = .6; S.punch = -.6; P.mistU.col.value.set('#5a8aff'); P.mistU.col2.value.set('#cfe8ff');
        if (live) { banner('✖ ' + t('wrong')); toast(`${t('wasL')} ${Q.q.ans[e.ok][S.lang]}`); if (e.lives === 1) after(1.2, () => toast(t('lastFlame'))); } break; }
      case 'timeout': A.sfx.timeout(); P.ans.forEach((C, i) => { if (i !== e.ok) C.out = 1; }); P.ans[e.ok].flare = .45; S.revealI = e.ok; W.frost = .7; W.hurt = .5; for (let i = 0; i < 4; i++) if (i !== e.ok) puff(F, candlePos(i, _w), 1, '#a8b8d8', .6);
        if (live) { banner('⌛ ' + t('timeout')); toast(`${t('wasL')} ${Q.q.ans[e.ok][S.lang]}`); } break;
      case 'tick': A.sfx.heart(); break;
      case 'hint': A.sfx.hint(); P.ans[e.i].out = 1; puff(F, candlePos(e.i, _w), 2, '#c8b8e8', .6); sparks(F, candlePos(e.i, _w), 20, { colors: ['#ffe08a', '#ffffff'], speed: 1.4, up: 1, life: .7, size: .07, grav: 0 }); if (live) toast(t('hint')); break;
      case 'joker': if (e.k === 'gust') { A.sfx.gust(); e.elim.forEach((x, i) => { if (x) { P.ans[i].out = 1; puff(F, candlePos(i, _w), 3, '#b8c8e8', .8); } }); W.frost = Math.max(W.frost, .25); toast(t('gustT')); }
        if (e.k === 'frost') { A.sfx.frost(); W.frost = 1; sparks(F, ballPos(_w), 70, { colors: ['#bfe8ff', '#ffffff'], speed: 2.6, up: .4, life: 1.1, size: .08, grav: .2 }); toast(t('frostT')); }
        if (e.k === 'swap') { A.sfx.swap(); batsGo(SP, ballPos(_w).add(_sp.set(0, .3, 0))); puff(F, ballPos(_w), 3, '#6a5a8a', .9); toast(t('swapT')); } break;
      case 'storm': startStorm(); break;
      case 'surgeEnd': startRebuild(); if (live) toast(t('surgeEnd')); break;
      case 'bossIntro': SP.sp.on = true; SP.sp.rise = 0; SP.sp.hp = BOSS_N; SP.sp.down = -1; A.sfx.bossIntro(); music.stop(); after(1.2, () => { if (Q && Q.boss.on) music.start('boss', S.gt + .05); }); W.flash = .3; S.punch = -.5;
        if (live) { banner('🕛 ' + t('bossIntro')); after(1.2, () => toast(t('bossSub'))); } break;
      case 'bossHit': SP.sp.hp = e.hp; after(.25, () => { SP.sp.hitT = S.gt; beamTo(SP, candlePos(e.i, new THREE.Vector3()), spectreChest(new THREE.Vector3()), S.gt); sparks(F, spectreChest(_w), 60, { colors: [ANS_COL[e.i], '#ffffff', '#9affdc'], speed: 3.5, up: .5, life: .9, size: .12, grav: .5 }); A.sfx.bossHit(e.i); if (live && e.hp > 0) popAt(t('bossHit'), '#9affdc', false, spectreChest(new THREE.Vector3())); }); break;
      case 'bossLaugh': SP.sp.laughT = S.gt + .2; after(.2, () => A.sfx.bossLaugh()); break;
      case 'bossDown': SP.sp.down = S.gt; A.sfx.bossDown(); W.flash = .7; S.punch = .8; wispBurst(SP, S.gt, spectreChest(new THREE.Vector3()), 1.4); sparks(F, spectreChest(_w), 220, { colors: ['#9affdc', '#ffffff', '#c77dff', '#ffd27a'], speed: 6, up: 1, life: 1.6, size: .14, grav: .8 });
        for (let i = 0; i < 4; i++) after(.3 + i * .35, () => firework(i)); music.stop(); if (live) { banner('👻 ' + t('bossDown')); popAt(`+${fmt(e.bonus)}`, '#9affdc', true, null); } break;
      case 'bossEscape': SP.sp.on = false; if (live) toast(t('bossEscape')); break;
      case 'end': if (live) after(e.res === 'win' ? .6 : 1.0, () => endRun(e.res)); break;
    }
  }
}
// ---------------- SPIRIT STORM: anticipation → the roof blasts off (slow-mo) → wisp vortex to the moon → fireworks ----------------
function startStorm() { S.storm = { t0: S.gt, blast: false }; S.rebuild = null; A.sfx.storm(); W.flash = .25; S.punch = .4;
  if (S.state === 'play') banner('🌪 ' + t('storm')); }
function blast() { const st = S.storm; st.blast = true; st.tb = S.gt; S.open = true; W.flash = .9; S.punch = 1; wispBurst(SP, S.gt, ballPos(new THREE.Vector3()), 1);
  sparks(F, ballPos(_w), 160, { colors: ['#ffffff', '#c77dff', '#5ad1ff', '#ffb347', '#6dff9a'], speed: 5, up: 3, life: 1.4, size: .1, grav: .4 });
  for (let i = 0; i < 6; i++) after(.5 + i * .3, () => firework(i)); if (S.state === 'play') after(.15, () => banner('💥 ' + t('roof'))); if (S.state === 'play') after(2.2, () => banner('⚡ ' + t('surge'))); }
function startRebuild() { if (!S.open) return; S.rebuild = { t0: S.gt, from: Math.min(2.3, W.domeTau) }; S.storm = null; A.sfx.rebuild(); }
function domeStep() {
  if (S.state === 'intro') return;
  if (S.storm) { const u = S.gt - S.storm.t0; if (!S.storm.blast && u >= .55) blast(); if (S.storm.blast) setDome(W, Math.min(6, (S.gt - S.storm.tb) * 1.05)); }
  if (S.rebuild) { const u = (S.gt - S.rebuild.t0) / 1.7; const k = smooth(clamp(u, 0, 1)); setDome(W, S.rebuild.from * (1 - k)); if (u >= 1) { S.rebuild = null; S.open = false; setDome(W, 0); A.play('stone_crash', .3, 1.2, 0, .5); S.punch = .3; } } }
// ---------------- camera ----------------
let camSnap = true; const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function baseCam(tp, tl) { const aspect = VW / VH, portrait = aspect < 1; const sw = Math.sin(S.gt * .17) * .25;
  if (portrait) { tp.set(sw, 3.1, 6.1); tl.set(0, 1.0, .25); return 54 + (1 - aspect) * 30; }
  tp.set(sw, 2.55, 5.5); tl.set(0, 1.18, -.1); return 46; }
function updateCamera(dt) {
  const aspect = VW / VH, portrait = aspect < 1; const tp = _v.set(0, 0, 0), tl = new THREE.Vector3(); let fov = baseCam(tp, tl); let rate = 3.2;
  const storming = S.storm && (S.state === 'play' || S.state === 'menu');
  if (S.state === 'menu' || S.state === 'end' || S.state === 'handover') { const a = S.gt * .09; const r = portrait ? 6.2 : 6.0; tp.set(Math.sin(a) * r, portrait ? 3.1 : 2.7, Math.cos(a) * r); tl.set(0, 1.25, 0); fov = portrait ? 52 + (1 - aspect) * 30 : 46; }
  if (S.state === 'play' && Q) {
    if (Q.boss.on || Q.state === 'bossIntro' || Q.state === 'bossDown') { tp.y += .2; tp.z += portrait ? .3 : .9; tl.set(0, portrait ? 1.75 : 1.8, -1.2); fov += 4; }
    if (Q.state === 'bossIntro') { const u = smooth((S.gt - S.askT) / 1.0); tp.set(0, 1.25, portrait ? 6.3 : 6.2); tl.set(0, 2.4, -3); fov += 2; }
    if (Q.state === 'reveal' && S.revealI >= 0 && !Q.boss.on) { candlePos(S.revealI, _w); tl.lerp(_w, .3); tp.lerp(_w.setY(_w.y + 1.6), .14); rate = 2.4; } }
  if (storming) { const u = S.gt - S.storm.t0; const k1 = smooth(u / .55), k2 = smooth((u - .55) / 1.4), k3 = smooth((u - 4.0) / 1.3);
    const push = new THREE.Vector3(0, 1.85, portrait ? 5.2 : 4.3), up = new THREE.Vector3(0, 1.6, portrait ? 4.9 : 3.9), lookUp = new THREE.Vector3(0, 9.5, -7.5);
    const pp = tp.clone().lerp(push, k1).lerp(up, k2), ll = tl.clone().lerp(ballPos(new THREE.Vector3()), k1 * .8).lerp(lookUp, k2);
    tp.copy(pp.lerp(tp, k3)); tl.copy(ll.lerp(tl, k3)); fov = lerp(fov, fov + 8, k2 * (1 - k3)); rate = 7; }
  if (S.state === 'intro') { const it = S.introT; const portraitK = portrait ? 1 : 0;
    const lowP = new THREE.Vector3(.4, 1.4, portrait ? 5.0 : 4.0), lowL = new THREE.Vector3(0, 9.5, -7.5);
    const p0 = lowP.clone().add(_sp.set(0, it * .12, -it * .1)); const l0 = lowL.clone().add(_sp.set(0, it * .5, 0));
    const k = smooth((it - 2.7) / 1.8); const fp = new THREE.Vector3(), fl = new THREE.Vector3(); const f0 = baseCam(fp, fl); fp.y += .2;
    const orbit = Math.max(0, it - 4.5) * .07; const of = fp.clone().applyAxisAngle(_sp.set(0, 1, 0), orbit);
    tp.copy(p0.lerp(of, k)); tl.copy(l0.lerp(fl, k)); fov = lerp(54 + portraitK * 10, f0, k); rate = 30; }
  { const hr = Math.hypot(tp.x, tp.z); if (hr > 6.5) { tp.x *= 6.5 / hr; tp.z *= 6.5 / hr; } }
  S.punch = fin(S.punch) * Math.exp(-dt * 5); fov += S.punch * -3.5;
  if (camSnap) { camPos.copy(tp); camLook.copy(tl); camSnap = false; } else { const kk = 1 - Math.exp(-dt * rate); camPos.lerp(tp, kk); camLook.lerp(tl, Math.min(1, kk * 1.3)); }
  camera.position.copy(camPos); camera.lookAt(camLook); camera.fov = clamp(fin(fov, 50), 30, 95); camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  // frame the crystal ball in the free band between the question card and the answer buttons (the UI never hides the séance)
  let want = 0; if (S.state === 'play' && Q && !document.body.classList.contains('cine') && band) { _sp.set(0, BALL_Y + .1, 0).project(camera); const y0 = (-_sp.y * .5 + .5) * VH; const k = Q.state === 'bossIntro' || Q.boss.on ? .5 : 1; want = clamp((y0 - band) * k, -VH * .25, VH * .25); }
  S.vOff = lerp(fin(S.vOff), want, Math.min(1, dt * 3)); if (Math.abs(S.vOff) > .5) { camera.setViewOffset(VW, VH, 0, S.vOff, VW, VH); camera.updateProjectionMatrix(); }
  // the moon swings into the open dome during a storm / the opening
  const wantMoon = S.open || S.state === 'intro'; W.moonDir.lerp(wantMoon ? STORM_MOON : MOON0, Math.min(1, dt * (wantMoon ? 2.5 : 1))).normalize(); W.moonScale = lerp(fin(W.moonScale, 1), wantMoon ? 2.3 : 1, Math.min(1, dt * 1.5));
}
// ---------------- input ----------------
function pick(i) { if (!Q || S.state !== 'play' || Q.state !== 'ask' || Q.elim[i]) return false; A.sfx.strike(i); P.ans[i].flare = .35; hideLevelCard(); return Q.answer(i); }
function useJoker(k) { if (!Q || S.state !== 'play' || Q.state !== 'ask') return false; if (!(Q.jokers[k] > 0)) { toast(t('jUsed')); return false; } const ok = Q.joker(k); if (ok) { hideLevelCard(); handleEvents(); setUI(); } return ok; }
document.querySelectorAll('.ans').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); A.unlock(); if (pick(+b.dataset.i)) { handleEvents(); setUI(); } }));
document.querySelectorAll('.joker').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); A.unlock(); useJoker(b.dataset.k); }));
window.addEventListener('keydown', e => { if (e.target && e.target.tagName === 'INPUT') return; const k = e.key;
  if (S.state === 'intro' && !e.repeat && (k === ' ' || k === 'Enter')) { e.preventDefault(); playNow(); return; }
  if (S.state === 'handover' && (k === ' ' || k === 'Enter')) { e.preventDefault(); $('btnGo').click(); return; }
  if (k === 'Escape') { if (S.state === 'play') { endRun('quit'); toMenu(); } else if (S.more) { S.more = false; setUI(); } else if (S.state === 'end') toMenu(); return; }
  if (S.state === 'menu' && !S.more && (k === 'Enter' || k === ' ')) { e.preventDefault(); $('btnPlay').click(); return; }
  if (S.state !== 'play' || e.repeat) return; const kl = k.toLowerCase();
  const ai = ['1', '2', '3', '4'].indexOf(k) >= 0 ? +k - 1 : ['a', 'b', 'c', 'd'].indexOf(kl);
  if (ai >= 0) { if (pick(ai)) { handleEvents(); setUI(); } return; }
  if (kl === 'g') useJoker('gust'); else if (kl === 'f') useJoker('frost'); else if (kl === 's') useJoker('swap'); });
// ---------------- UI ----------------
function setUI() { const st = S.state; const b = document.body; b.dataset.state = st; b.dataset.mode = S.mode; b.dataset.kids = S.kids ? '1' : '0';
  if (st !== 'menu') S.more = false; $('menu').classList.toggle('show', st === 'menu'); $('more').classList.toggle('show', st === 'menu' && !!S.more); b.dataset.more = S.more ? '1' : '0'; $('btnGear').setAttribute('aria-expanded', S.more ? 'true' : 'false');
  $('end').classList.toggle('show', st === 'end'); $('handover').classList.toggle('show', st === 'handover');
  if (st !== 'play' || !Q) { delete b.dataset.phase; b.classList.remove('cine'); return; }
  b.dataset.phase = Q.state; b.classList.toggle('cine', Q.state === 'storm' || Q.state === 'bossIntro' || Q.state === 'bossDown');
  const duel = S.mode === 'duel', n = Q.q.n; const tot = Number.isFinite(Q.total) ? Q.total : 0;
  $('hQ').textContent = (Q.q.boss ? '🕛 ' : '') + (tot ? `${Math.min(n + 1, tot)}/${tot}` : `${n + 1}`) + (duel ? ` · ${t(S.player ? 'p2' : 'p1')}` : '');
  $('hScore').textContent = fmt(Q.score); const mult = Math.min(5, Math.max(1, Q.streak)); $('hStreak').textContent = `×${mult}${Q.surgeQ > 0 ? '⚡' : ''}`; $('hStreak').parentElement.classList.toggle('hot', mult >= 3 || Q.surgeQ > 0);
  $('hLives').textContent = Number.isFinite(Q.lives) ? '🕯'.repeat(Math.max(0, Q.lives)) || '–' : '∞';
  const need = Q.stormNeed, m = clamp(Q.meter, 0, need); const sp = Q.surgeQ > 0 ? `⚡ ×2 · ${Q.surgeQ}` : Q.q.boss ? `👻 ${'♥'.repeat(Math.max(0, Q.boss.hp))}` : `🌕 ${'●'.repeat(m)}${'○'.repeat(need - m)}`;
  $('qMeta').textContent = `${CATS[Q.q.cat] || ''} ${t('cat_' + Q.q.cat)} · ${sp}`; $('qText').textContent = Q.q.text[S.lang];
  $('qcard').classList.toggle('boss', !!Q.q.boss); $('qcard').classList.toggle('frozen', !!Q.frozen); $('qcard').classList.toggle('hot', !Q.frozen && !Q.kids && Q.tLeft < 4);
  document.querySelectorAll('.ans').forEach(el => { const i = +el.dataset.i; el.querySelector('span').textContent = Q.q.ans[i][S.lang]; const rev = Q.state === 'reveal' || Q.state === 'storm';
    el.classList.toggle('out', !!Q.elim[i] && !(rev && i === Q.q.ok)); el.classList.toggle('ok', rev && i === Q.q.ok); el.classList.toggle('bad', rev && i === Q.picked && i !== Q.q.ok); el.classList.toggle('lock', Q.state !== 'ask'); });
  for (const k of ['gust', 'frost', 'swap']) $('j' + k[0].toUpperCase() + k.slice(1)).classList.toggle('used', !(Q.jokers[k] > 0)); }
let band = 0, bandT = 0; function measureBand() { if (S.state !== 'play') return; const q = $('qcard').getBoundingClientRect(), a = $('answers').getBoundingClientRect(); if (a.top > q.bottom) band = (q.bottom + a.top) / 2; }
function timeBar() { if (!Q || S.state !== 'play') return; const k = Q.kids ? 1 : clamp(Q.tLeft / Q.T, 0, 1); $('qTimeFill').style.transform = `scaleX(${k.toFixed(4)})`; }
function cardIn() { const c = $('qcard'); c.dataset.t0 = S.gt; }
function applyLang() { document.documentElement.lang = S.lang; document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t)); $('btnLang').textContent = S.lang === 'en' ? 'DE' : 'EN'; $('btnLang').setAttribute('aria-label', S.lang === 'en' ? 'Deutsch' : 'English');
  $('keysTip').textContent = t('keysHint'); $('oSub').textContent = t('countdown');
  $('btnKids').classList.toggle('on', S.kids); $('btnKids').setAttribute('aria-pressed', S.kids); document.querySelectorAll('#diff button').forEach(b => b.classList.toggle('on', b.dataset.d === S.diff)); $('diff').classList.toggle('off', S.kids);
  $('btnSound').textContent = A.isMuted() ? '🔇' : '🔊'; $('btnSound2').textContent = t(A.isMuted() ? 'soundOff' : 'soundOn'); qLabels(); $('btnSkip').textContent = '▶ ' + (isTouch ? (S.lang === 'de' ? 'Tippen zum Spielen' : 'Tap to play') : (S.lang === 'de' ? 'Klicken zum Spielen' : 'Click to play'));
  $('playL').textContent = `${t('seance')} · ${S.kids ? t('kidsT') : t(S.diff)}`; $('btnGear').setAttribute('aria-label', t('gear'));
  if (S.state === 'handover') { $('hoT').textContent = t(S.player ? 'duelTurn2' : 'duelTurn1'); $('hoS').textContent = S.duel[0] ? `${t('p1')}: ${fmt(S.duel[0].score)}` : ''; }
  if (S.state === 'end') showEnd(); setUI(); }
function modeName() { return S.mode === 'duel' ? t('duelT') : S.mode === 'endless' ? t('endless') : t('seance'); }
function showEnd() { const duel = S.mode === 'duel', r = S.result; let title;
  if (duel) { const a = S.duel[0], b = S.duel[1]; title = !a || !b ? t('quitT') : a.score > b.score ? t('duelWin1') : b.score > a.score ? t('duelWin2') : t('duelTie'); $('eScore').textContent = a && b ? `${fmt(a.score)} : ${fmt(b.score)}` : fmt(Q ? Q.score : 0); }
  else { title = r === 'win' ? t('win') : r === 'quit' ? t('quitT') : S.mode === 'endless' ? t('endlessEnd') : t('fail'); $('eScore').textContent = fmt(Q ? Q.score : 0); }
  $('eTitle').textContent = title; $('eMode').textContent = `${modeName()} · ${S.kids ? t('kidsT') : t(S.diff)}`;
  $('eStars').innerHTML = S.mode === 'seance' && r === 'win' ? [0, 1, 2].map(i => `<i class="${i < S.stars ? 'on' : ''}">★</i>`).join('') : '';
  $('eBest').textContent = duel ? '' : S.newBest ? t('newBest') : `${t('bestL')}: ${fmt(+ls.get(bestKey(), '0') || 0)}`;
  $('eStats').innerHTML = duel && S.duel[0] && S.duel[1] ? [0, 1].map(i => `<div><b>${t(i ? 'p2' : 'p1')}</b> ✔ ${S.duel[i].correct}/${S.duel[i].of} · 🔥 ${S.duel[i].best} · 🌪 ${S.duel[i].storms}</div>`).join('')
    : Q ? `<div>✔ ${t('stRight')}: <b>${Q.correct}/${Q.answered}</b></div><div>🔥 ${t('stBest')}: <b>${Q.best}</b></div><div>🌪 ${t('stStorms')}: <b>${Q.storms}</b></div>` + (S.mode !== 'duel' && (Q.boss.wins || Q.idx >= MAIN_N) ? `<div>👻 ${t('stBoss')}: <b>${Q.boss.wins ? t('stBossY') : t('stBossN')}</b></div>` : '') : '';
  $('btnAgain').textContent = duel ? t('againD') : t('again'); $('eName').value = S.name; }
function showLevelCard() { $('lcT').textContent = S.mode === 'duel' ? `${t(S.player ? 'p2' : 'p1')} · ${t('duelT')}` : `${modeName()} · ${S.kids ? t('kidsT') : t(S.diff)}`;
  $('lcG').textContent = t('hintGoal'); $('lcTip').textContent = t(isTouch ? 'hintTouch' : 'hintKeys'); const el = $('lvCard'); el.classList.add('show'); el.dataset.t0 = S.gt; }
function hideLevelCard() { $('lvCard').classList.remove('show'); }
function popAt(txt, col, big, at) { (window.__pops = window.__pops || []).push(txt); let x = 0, y = -VH * .08; if (at) { _sp.copy(at).project(camera); if (_sp.z < 1) { x = clamp(_sp.x * .5 * VW, -VW * .36, VW * .36); y = clamp(-_sp.y * .5 * VH, -VH * .3, VH * .3); } }
  const el = document.createElement('div'); el.className = 'pop' + (big ? ' big' : ''); el.textContent = txt; el.style.color = col; el.style.left = x + 'px'; el.style.top = y + 'px'; el.dataset.t0 = S.gt; $('pops').appendChild(el); if ($('pops').children.length > 8) $('pops').firstChild.remove(); }
function banner(s) { if (!s) return; (window.__banners = window.__banners || []).push(s); const el = $('banner'); el.textContent = s; el.dataset.t0 = S.gt; el.classList.add('show'); el.dataset.fit = Math.min(1, innerWidth * .92 / Math.max(1, el.scrollWidth)).toFixed(3); } // long banners shrink to fit narrow phones
function toast(s) { if (S.state !== 'play') return; const el = $('toast'); el.textContent = s; el.classList.add('show'); el.dataset.t0 = S.gt; }
function updateOverlays() { // timed on game time (frame exact in the video)
  const bn = $('banner'); if (bn.classList.contains('show')) { const a = S.gt - (+bn.dataset.t0), fit = +bn.dataset.fit || 1, bP = Math.max(1, Math.min(1.5, innerWidth * .98 / Math.max(1, bn.scrollWidth * fit))); /* the punch-in never overflows the screen */ const k = a < .18 ? a / .18 : a > 1.5 ? Math.max(0, 1 - (a - 1.5) / .3) : 1; bn.style.opacity = k; bn.style.transform = `translate(-50%,-50%) scale(${((a < .18 ? 1 + (bP - 1) * (1 - a / .18) : 1 + a * .02) * fit).toFixed(3)})`; if (a > 1.85) bn.classList.remove('show'); }
  const ts = $('toast'); if (ts.classList.contains('show') && S.gt - (+ts.dataset.t0) > 2.4) ts.classList.remove('show');
  const lc = $('lvCard'); if (lc.classList.contains('show') && S.gt - (+lc.dataset.t0) > 4) lc.classList.remove('show');
  const qc = $('qcard'); if (S.state === 'play') { const a = S.gt - (+qc.dataset.t0 || 0); const k = smooth(a / .3); qc.style.opacity = document.body.classList.contains('cine') ? 0 : (.25 + .75 * k).toFixed(3); }
  for (const el of [...$('pops').children]) { const a = S.gt - (+el.dataset.t0); if (a > 1.1) { el.remove(); continue; } el.style.opacity = a < .1 ? a / .1 : 1 - Math.max(0, (a - .6) / .5); el.style.transform = `translate(-50%,-50%) translateY(${-a * 46}px) scale(${a < .12 ? .6 + a / .12 * .4 : 1})`; }
  // the opening title: slams in huge, then recedes
  const op = $('opening'); if (S.state === 'intro' && S.titleT >= 0) { const a = S.introT - S.titleT; const sIn = a < .28 ? 3.2 - 2.2 * smooth(a / .28) : 1; const rec = smooth((a - 1.4) / 2.4);
    op.style.opacity = a < .08 ? a / .08 : 1 - smooth((a - 2.6) / 1.0); $('oTitle').style.transform = `translateY(${-rec * VH * .16}px) scale(${(sIn * (1 - rec * .6)).toFixed(3)})`; } else if (S.state !== 'intro') op.style.opacity = 0; }
function audioBadge() { document.body.dataset.audio = A.state() === 'running' ? 'on' : 'locked'; }
// ---------------- buttons ----------------
$('btnPlay').onclick = () => { A.unlock(); start('seance'); };
$('btnGear').onclick = () => { if (S.state === 'play') return; A.unlock(); if (S.state !== 'menu') toMenu(); S.more = !S.more; A.sfx.ui(); setUI(); };
$('btnMoreX').onclick = $('moreBg').onclick = () => { S.more = false; A.sfx.ui(); setUI(); };
$('btnEndless').onclick = () => { A.unlock(); start('endless'); }; $('btnDuel').onclick = () => { A.unlock(); S.player = 0; start('duel'); };
document.querySelectorAll('#diff button').forEach(b => b.onclick = () => { S.diff = b.dataset.d; S.kids = false; ls.set('cw-diff', S.diff); ls.set('cw-kids', '0'); A.sfx.ui(); applyLang(); });
$('btnKids').onclick = () => { S.kids = !S.kids; ls.set('cw-kids', S.kids ? '1' : '0'); A.sfx.ui(); applyLang(); };
$('btnQ2').onclick = () => { const o = ['low', 'mid', 'high', 'ultra']; applyQuality(o[(o.indexOf(S.q) + 1) % o.length], true); A.sfx.ui(); };
$('btnIntro').onclick = () => { A.unlock(); startIntro(); };
$('btnLang').onclick = () => { S.lang = S.lang === 'en' ? 'de' : 'en'; ls.set('cw-lang', S.lang); A.sfx.ui(); applyLang(); };
const toggleSound = () => { A.unlock(); A.setMuted(!A.isMuted()); ls.set('cw-mute', A.isMuted() ? '1' : '0'); applyLang(); }; $('btnSound').onclick = toggleSound; $('btnSound2').onclick = toggleSound;
$('btnQuit').onclick = () => { if (S.state === 'play') endRun('quit'); toMenu(); };
$('btnAgain').onclick = () => { A.unlock(); if (S.mode === 'duel') { S.player = 0; start('duel'); } else start(S.mode); }; $('btnMenu').onclick = () => toMenu();
$('btnCard').onclick = () => saveCard(false); $('btnShare').onclick = () => saveCard(true);
$('btnGo').onclick = () => { A.unlock(); start('duel'); }; $('handover').addEventListener('click', e => { if (e.target.id !== 'btnGo') $('btnGo').click(); });
$('eName').addEventListener('keydown', e => e.stopPropagation()); $('eName').addEventListener('input', () => { S.name = ($('eName').value || '').slice(0, 18); });
if (ls.get('cw-mute', '0') === '1') A.setMuted(true);
// ---- ONE TAP TO PLAY: the first tap/click anywhere on the opening goes straight into the séance (sound unlocks on that same tap) ----
let eatClick = 0;
function playNow() { if (S.state !== 'intro') return; A.unlock(); setTimeout(audioBadge, 60); endIntro(); start('seance'); }
function introTap(e) { if (S.state !== 'intro' || (e.target && e.target.closest && e.target.closest('#top'))) return; if (e.pointerType === 'touch' && !isTouch) isTouch = true; eatClick = performance.now() + 450; playNow(); }
window.addEventListener('pointerup', introTap);
window.addEventListener('click', e => { if (performance.now() < eatClick) { e.stopPropagation(); e.preventDefault(); eatClick = 0; return; } introTap(e); }, true);
for (const ev of ['touchend', 'click', 'keydown', 'pointerup']) window.addEventListener(ev, () => { A.unlock(); setTimeout(audioBadge, 80); }, { capture: true, passive: true }); // iOS: resume audio inside a real user gesture
window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !isTouch) { isTouch = true; applyLang(); } }, { passive: true });
window.addEventListener('resize', resize);
// ---------------- share card (1080×1350, no URL) ----------------
async function makeCard() {
  S.name = ($('eName').value || '').trim().slice(0, 18) || 'Player'; ls.set('cw-name', S.name); try { await document.fonts.load('700 40px Fredoka'); } catch (e) {}
  const CW = 1080, CH = 1350; renderer.setPixelRatio(1); renderer.setSize(CW, CH, false); composer.setPixelRatio(1); composer.setSize(CW, CH);
  const old = { a: camera.aspect, f: camera.fov, p: camera.position.clone(), q: camera.quaternion.clone() }; const md = W.moonDir.clone(), msc = W.moonScale, tau = W.domeTau, lay = P.portrait;
  const storms = S.mode === 'duel' ? (S.duel[0]?.storms || 0) + (S.duel[1]?.storms || 0) : Q ? Q.storms : 0; const fl = P.ans.map(C => [C.lit, C.flare, C.out]);
  layoutCandles(P, .8); P.ans.forEach((C, i) => { C.lit = 1; C.out = 0; C.flare = .5; });
  if (storms > 0) { setDome(W, 6); W.moonDir.copy(STORM_MOON); W.moonScale = 2.1; }
  camera.clearViewOffset(); camera.aspect = CW / CH; camera.fov = 56; camera.position.set(0, 1.55, 5.4); camera.lookAt(0, storms > 0 ? 3.2 : 1.9, -1); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  syncProps(P, S.gt, { clockK: 1, clockOn: false, frost: 0 }); updateWorld(W, S.gt, 0, QUALITY.high, camera); composer.render();
  const c = document.createElement('canvas'); c.width = CW; c.height = CH; const k = c.getContext('2d'); k.drawImage(renderer.domElement, 0, 0, CW, CH);
  camera.aspect = old.a; camera.fov = old.f; camera.position.copy(old.p); camera.quaternion.copy(old.q); W.moonDir.copy(md); W.moonScale = msc; setDome(W, tau); P.ans.forEach((C, i) => { [C.lit, C.flare, C.out] = fl[i]; }); resize();
  const gr = k.createLinearGradient(0, 0, 0, CH); gr.addColorStop(0, 'rgba(6,4,16,.9)'); gr.addColorStop(.2, 'rgba(6,4,16,.15)'); gr.addColorStop(.58, 'rgba(6,4,16,.05)'); gr.addColorStop(.72, 'rgba(6,4,16,.82)'); gr.addColorStop(1, 'rgba(6,4,16,.97)'); k.fillStyle = gr; k.fillRect(0, 0, CW, CH);
  const Fo = (w, s) => `${w} ${s}px Fredoka, "Arial Rounded MT Bold", sans-serif`; k.textAlign = 'center'; k.lineJoin = 'round';
  const txt = (s, x, y, fill, stroke = 'rgba(16,6,24,.9)', lw = 8) => { if (lw) { k.strokeStyle = stroke; k.lineWidth = lw; k.strokeText(s, x, y); } k.fillStyle = fill; k.fillText(s, x, y); };
  k.font = Fo(700, 116); txt('CANDLEWIT', CW / 2, 124, '#ffe2b0', 'rgba(50,14,60,.92)', 12);
  const duel = S.mode === 'duel' && S.duel[0] && S.duel[1];
  if (duel) { k.font = Fo(700, 112); txt(`${fmt(S.duel[0].score)} : ${fmt(S.duel[1].score)}`, CW / 2, 1040, '#fff0c0', 'rgba(30,16,4,.9)', 14); k.font = Fo(600, 50); txt($('eTitle').textContent, CW / 2, 1110, '#ffb35a'); k.font = Fo(500, 34); txt(`${t('p1')} · ${t('p2')}`, CW / 2, 186, '#ffffff'); }
  else { k.font = Fo(600, 46); txt(`${modeName()} · ${S.kids ? t('kidsT') : t(S.diff)}`, CW / 2, 962, '#e0c8ff'); k.font = Fo(700, 150); txt(fmt(Q ? Q.score : 0), CW / 2, 1104, '#fff0c0', 'rgba(30,16,4,.9)', 16);
    if (S.result === 'win' && S.mode === 'seance') { k.font = Fo(700, 70); txt('★'.repeat(S.stars) + '☆'.repeat(3 - S.stars), CW / 2, 1182, '#ffcf4a', 'rgba(40,20,0,.9)', 8); } else { k.font = Fo(600, 46); txt($('eTitle').textContent || '', CW / 2, 1178, '#ffb35a'); }
    k.font = Fo(500, 34); txt(`${t('by')} ${S.name}`, CW / 2, 186, '#ffffff'); }
  const bw = duel ? 0 : Q ? Q.boss.wins : 0; if (bw > 0 || storms > 0) { k.save(); k.translate(CW - 172, 340); k.rotate(-.16); k.fillStyle = 'rgba(30,20,60,.92)'; k.strokeStyle = bw ? '#9affdc' : '#ffe6a0'; k.lineWidth = 6; k.beginPath(); k.arc(0, 0, 118, 0, 7); k.fill(); k.stroke();
    k.font = Fo(700, 58); txt(bw ? '👻' : '🌪', 0, -16, '#fff', 'rgba(0,0,0,0)', 0); k.font = Fo(700, 21); txt(bw ? (S.lang === 'de' ? 'GESPENST GEBANNT' : 'SPECTRE BANISHED') : (S.lang === 'de' ? 'GEISTERSTURM' : 'SPIRIT STORM'), 0, 30, bw ? '#9affdc' : '#ffe6a0', 'rgba(0,0,0,0)', 0); k.font = Fo(700, 34); txt('x' + (bw || storms), 0, 72, '#fff', 'rgba(0,0,0,0)', 0); k.restore(); }
  const st = duel ? `✔ ${S.duel[0].correct}:${S.duel[1].correct} · 🔥 ${S.duel[0].best}:${S.duel[1].best}` : Q ? `✔ ${Q.correct}/${Q.answered} · 🔥 ${Q.best} · 🌪 ${Q.storms}` : '';
  k.font = Fo(600, 34); txt(st, CW / 2, 1240, '#ffe08a'); k.font = Fo(600, 40); txt(t('cardTag'), CW / 2, 1288, '#e0c8ff'); k.font = Fo(400, 30); txt(CREDIT_TXT, CW / 2, 1330, 'rgba(255,255,255,.92)');
  window.__cwCard = { w: c.width, h: c.height }; layoutCandles(P, VW / VH); return c; }
async function saveCard(share) { const c = await makeCard(); const blob = await new Promise(r => c.toBlob(r, 'image/png')); const file = new File([blob], 'my-candlewit.png', { type: 'image/png' });
  if (share && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text: `Candlewit · ${t('cardTag')}` }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-candlewit.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); toast(t('saved')); }
// ---------------- simulation ----------------
let ambT = 4, smokeT = 0, emberAcc = 0;
function beds() { const storm = S.storm ? 1 : 0; A.loop('wind', .05 + storm * .25 + (S.open ? .08 : 0), 1, 1); A.loop('night_loop', .07, 1, 1.5); A.loop('torch_loop', .06, 1, 1);
  const ticking = S.state === 'play' && Q && Q.state === 'ask' && !Q.frozen && !Q.kids; A.loop('clock_loop', ticking ? (Q.tLeft < 4 ? .2 : .1) : 0, ticking && Q.tLeft < 4 ? 1.15 : 1, .3); }
function ambient(dt) { ambT -= dt; if (ambT <= 0) { ambT = 10 + rng() * 10; const r = rng(); if (r < .4) A.sfx.owl(); else if (r < .7) A.sfx.crow(); else A.sfx.howl(); } }
function step(dt) {
  dt = Math.max(0, Math.min(fin(dt), 1 / 20)); // never step backwards, never jump
  // slow motion through the blast
  let want = 1; if (S.storm && S.storm.blast) { const u = S.gt - S.storm.tb; want = u < .1 ? lerp(1, .3, u / .1) : u < 1.1 ? .3 : u < 1.9 ? lerp(.3, 1, smooth((u - 1.1) / .8)) : 1; } else if (S.storm) { const u = S.gt - S.storm.t0; want = lerp(1, .55, smooth(u / .55)); }
  if (S.state === 'intro') { const it = S.introT; want = it < 2.6 ? .45 : 1; }
  S.ts = clamp(fin(want, 1), .05, 1.5); const gdt = dt * S.ts; S.gt += gdt;
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i] && timers[i].t <= S.gt) { const f = timers[i].f; timers.splice(i, 1); f(); }
  for (const k of ['flash', 'warm', 'frost', 'hurt', 'moonScale']) if (!Number.isFinite(W[k])) W[k] = k === 'moonScale' ? 1 : 0; // NaN guards
  for (const k of ['punch', 'camBlend']) if (!Number.isFinite(S[k])) S[k] = 0;
  music.I = Q ? clamp(Q.streak / 5 + (Q.surgeQ > 0 ? .6 : 0), 0, 1) : .2; music.step(S.gt); ambient(gdt); beds();
  if (S.state === 'intro') { S.introT += dt; const it = S.introT;
    if (it < 2.7) setDome(W, .9 + it * .62); else if (it < 4.5) { if (S.intro.stage === 0) { S.intro.stage = 1; A.sfx.rebuild(); } const k = smooth((it - 2.7) / 1.8); setDome(W, (.9 + 2.7 * .62) * (1 - k)); }
    else { if (S.intro.stage < 2) { S.intro.stage = 2; setDome(W, 0); S.open = false; S.titleT = it; A.sfx.title(); W.flash = .35; S.punch = .7; P.ans.forEach((C, i) => after(.08 * i, () => { C.flare = 1; column(i, false); })); } }
    if (S.titleT >= 0 && it - S.titleT > 3.8) toMenu(); }
  if (S.state === 'play' && Q) { const was = Q.state; Q.step(gdt); handleEvents();
    if (S.auto && Q.state === 'ask' && S.gt - S.askT > (S.botDelay ?? 1.0)) { const i = botPick(Q, S.botAcc, rng); pick(i); }
    handleEvents(); if (Q && Q.state !== was) setUI(); }
  if (S.state === 'menu') { S.menuFlareT -= gdt; if (S.menuFlareT <= 0) { S.menuFlareT = 1.6; const i = Math.floor(rng() * 4); P.ans[i].flare = .7; sparks(F, candlePos(i, _w), 14, { colors: [ANS_COL[i], '#ffffff'], speed: .8, up: 1.6, life: .9, size: .06, grav: -.5 }); } }
  domeStep();
  // candles: smooth lit/out, flare decay
  P.ans.forEach((C, i) => { const tgt = C.out ? 0 : 1; C.lit = lerp(C.lit, tgt, Math.min(1, gdt * (tgt ? 6 : 9))); C.flare = Math.max(0, fin(C.flare) - gdt * (S.state === 'play' && Q && Q.state === 'reveal' && i === S.revealI ? .25 : 1.1));
    C.L.intensity = (0.9 * C.lit + C.flare * 4); C.L.color.set(ANS_COL[i]); });
  // ball: mist energy, light
  const askBoost = S.state === 'play' && Q && Q.state === 'ask' ? .3 * smooth((S.gt - S.askT) / .4) : 0; P.mistU.k.value = 1 + askBoost + (S.storm ? 1.2 : 0) + P.ans.reduce((a, C) => a + C.flare, 0) * .4;
  P.ballLight.intensity = 2 + P.mistU.k.value * 1.2; P.ballLight.color.copy(P.mistU.col.value);
  // spirit ring on the floor glows as the streak builds
  const need = Q ? Q.stormNeed : 5; const m = Q ? clamp(Q.meter / need, 0, 1) : .3; W.circleM.opacity = lerp(W.circleM.opacity, .25 + m * .9 + (Q && Q.surgeQ > 0 ? .5 : 0) + (S.storm ? 1 : 0), Math.min(1, gdt * 4));
  if (Q && Q.state === 'ask' && Q.frozen) W.frost = lerp(W.frost, .75, Math.min(1, gdt * 3)); else W.frost = Math.max(0, W.frost - gdt * .7);
  // embers + candle smoke
  emberAcc += gdt * 10; while (emberAcc > 1) { emberAcc--; const i = Math.floor(rng() * 4); if (P.ans[i].lit > .5) sparks(F, candlePos(i, _w).add(_sp.set(0, .12, 0)), 1, { colors: [ANS_COL[i], '#ffe08a'], speed: .25, up: .5, life: .8, size: .04, grav: -.4 }); }
  smokeT -= gdt; if (smokeT <= 0) { smokeT = .35; P.ans.forEach((C, i) => { if (C.out && C.lit < .3) puff(F, candlePos(i, _w).add(_sp.set(0, .05, 0)), 1, '#8a8aa0', .35); }); }
  const clockK = S.state === 'play' && Q ? (Q.kids ? 1 : clamp(Q.tLeft / Q.T, 0, 1)) : 1;
  syncProps(P, S.gt, { clockK, clockOn: S.state === 'play' && !!Q, clockHot: S.state === 'play' && Q && !Q.kids && Q.tLeft < 4 && Q.state === 'ask', frost: W.frost });
  updateSpirits(SP, S.gt, gdt); updateCamera(dt);
  updateWorld(W, S.gt, gdt, QUALITY[S.q], camera); updateFX(F, gdt, VH * 1.5 * renderer.getPixelRatio()); P.flameU.scale && (P.flameU.scale.value = VH * .9 * renderer.getPixelRatio());
  bloom.strength = .6 * QUALITY[S.q].bloom * (1 + W.flash * .3); gradePass.uniforms.time.value = S.gt; gradePass.uniforms.flash.value = W.flash; gradePass.uniforms.warm.value = W.warm * .5 + (Q && Q.surgeQ > 0 ? .2 : 0); gradePass.uniforms.frost.value = W.frost; gradePass.uniforms.hurt.value = W.hurt;
  W.warm = Math.max(0, W.warm - gdt * .2);
  updateOverlays(); timeBar(); if ((S.uiT = (S.uiT || 0) + dt) > .1) { S.uiT = 0; setUI(); if ((bandT += 1) % 5 === 0) measureBand(); } }
function render() { composer.render(); }
const fps = { n: 0, acc: 0, frames: 0, bad: 0, since: 0 };
function fpsTick(dt) { if (document.hidden) return; fps.since += dt; if (fps.since < 6 || dt > .25) return; fps.acc += dt; fps.frames++; // ignore the first 6 s (shader compile, decode)
  if (fps.acc >= 1) { const f = fps.frames / fps.acc; fps.acc = 0; fps.frames = 0; fps.n++; fps.bad = f < 32 ? fps.bad + 1 : 0; fps.last = f;
    if (!S.qUser && !window.__cwNoAutoQ && fps.bad >= 4 && S.q !== 'low') { const o = ['low', 'mid', 'high', 'ultra']; const nq = o[o.indexOf(S.q) - 1]; applyQuality(nq); toast(`${t('autoQ')} ${t('q_' + nq)} (${Math.round(f)} fps)`); fps.bad = 0; fps.since = 0; } } }
applyQuality(S.q); resize();
let last = performance.now();
function advance(now) { const dt = Math.max(0, (now - last) / 1000) || 0; last = Math.max(last, now || 0); if (!window.__cwManual) { step(dt); fpsTick(dt); } return dt; } // rAF stamps can be earlier than the last one: never run the clock backwards
function frameLoop(now) { advance(now); render(); requestAnimationFrame(frameLoop); }
if (window.__cwSkipIntro) { startIntro(); toMenu(); } else startIntro();
applyLang(); audioBadge();
step(0); requestAnimationFrame(frameLoop);
window.__cw = { S, W, P, SP, F, step: (dt, n = 1) => { for (let i = 0; i < n; i++) step(dt); render(); }, stepq: (dt, n = 1) => { for (let i = 0; i < n; i++) step(dt); }, log: A.log, quality: q => q ? applyQuality(q, true) : S.q, renderer,
  start, end: endRun, toMenu, startIntro, endIntro, playNow, quiz: () => Q, answer: i => { const r = pick(i); handleEvents(); setUI(); return r; }, joker: useJoker, auto: (v, acc) => { S.auto = !!v; if (acc != null) S.botAcc = acc; },
  setStreak: n => { if (!Q) return; Q.streak = n; Q.meter = Math.min(Q.stormNeed - 1, n); setUI(); }, right: () => Q ? Q.q.ok : -1, setUI, applyLang,
  card: saveCard, cardURL: async () => (await makeCard()).toDataURL('image/jpeg', .9), fps, fpsTick, advance, last: () => last, play: A.play, sfx: A.sfx, audioState: A.state,
  mem: () => ({ ...renderer.info.memory, programs: renderer.info.programs ? renderer.info.programs.length : 0 }),
  screen: (x, y, z) => { _sp.set(x, y, z).project(camera); return { x: (_sp.x * .5 + .5) * VW, y: (-_sp.y * .5 + .5) * VH, z: _sp.z }; }, cam: () => ({ p: camera.position.toArray(), fov: camera.fov }),
  sparks: () => { let n = 0; for (let i = 0; i < F.life.length; i++) if (F.life[i] > 0) n++; return n; }, _dbg: { scene, camera, composer, bloom, THREE } };
// shader warm-up: compile every hidden object (spectre, beam, wisps, bats, storm effects) once at load, so the first storm / Midnight Round does not hitch
try { const hid = []; scene.traverse(o => { if (!o.visible) { hid.push(o); o.visible = true; } }); renderer.compile(scene, camera); hid.forEach(o => { o.visible = false; }); } catch (e) {}
document.body.classList.add('ready');

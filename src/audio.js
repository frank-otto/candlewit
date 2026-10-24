// WebAudio for the embedded CC0 recordings (window.CW_SOUNDS): a real match strike for every answer, fire whooshes, icy gusts,
// breaking glass, crumbling stone, a ticking clock and a heartbeat for the last seconds, bells, choir, fireworks, booms, owls, bats,
// a witch's cackle for the spectre, and a real pipe organ, pizzicato, harp, xylophone, contrabass and timpani (VSCO 2 CE).
// Nothing is synthesized: pitched instruments re-pitch the nearest recorded note; the crypt echo is a generated convolution reverb.
// Every sound (and every loop level change) is logged so tests and the video mix can replay it exactly.
let ctx = null, master = null, dry = null, conv = null, bufs = {}, ready = false, muted = false; const loops = {};
export const log = [];
let clock = () => 0;
export function setClock(f) { clock = f; }
function b64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
export const INS = {
  org: Object.fromEntries([48, 51, 54, 57, 60, 63, 66, 69, 72, 75].map(m => [m, m])),
  ped: Object.fromEntries([24, 27, 30, 33, 36, 39, 42].map(m => [m, m])),
  pz: { D3: 50, A3: 57, C4: 60, E4: 64, G4: 67, D5: 74 },
  cb: { E1: 28, Fs1: 30, A1: 33, Cs2: 37, E2: 40 },
  hp: { D4: 62, A4: 69 },
  xy: { C5: 72, G5: 79, C6: 84 }
};
const SORTED = Object.fromEntries(Object.entries(INS).map(([k, v]) => [k, Object.entries(v).sort((a, b) => a[1] - b[1])]));
export function sampleFor(ins, m) { const L = SORTED[ins]; let best = L[0]; for (const e of L) if (Math.abs(e[1] - m) < Math.abs(best[1] - m)) best = e; return { n: ins + '_' + best[0], r: Math.pow(2, (m - best[1]) / 12) }; }
function makeIR(sec = 3.6) { const sr = ctx.sampleRate, n = Math.floor(sr * sec), ir = ctx.createBuffer(2, n, sr); let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const t = i / sr; lp += (rnd() - lp) * (.5 - .38 * t / sec); d[i] = lp * Math.exp(-t * 1.9) * (i < sr * .02 ? i / (sr * .02) : 1); } } return ir; }
function kick() { try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {} } // a silent sample inside the gesture unlocks iOS Safari
export function state() { return ctx ? ctx.state : 'none'; }
export function isReady() { return ready; }
export async function unlock() {
  if (ctx) { if (ctx.state !== 'running') { const r = ctx.resume(); if (r && r.catch) r.catch(() => {}); kick(); } return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} // iOS 17+: play even with the ring/silent switch on silent
  ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : .9; if (ctx.state !== 'running') { const r = ctx.resume(); if (r && r.catch) r.catch(() => {}); } kick();
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = .004; comp.release.value = .2; master.connect(comp); comp.connect(ctx.destination);
  dry = ctx.createGain(); dry.connect(master); conv = ctx.createConvolver(); conv.buffer = makeIR(); const wet = ctx.createGain(); wet.gain.value = .32; conv.connect(wet); wet.connect(master);
  const src = window.CW_SOUNDS || {};
  // base64 → bytes is synchronous: do it a few sounds per tick so the first tap never freezes a frame (beds and loops first)
  const keys = Object.keys(src).sort((a, b) => (b.endsWith('_loop') || b === 'wind' || b === 'heart') - (a.endsWith('_loop') || a === 'wind' || a === 'heart')); const jobs = [];
  for (let i = 0; i < keys.length; i += 4) { for (const k of keys.slice(i, i + 4)) jobs.push(new Promise(res => { try { ctx.decodeAudioData(b64(src[k]), b => { bufs[k] = b; res(); }, () => res()); } catch (e) { res(); } })); await new Promise(r => setTimeout(r, 0)); }
  await Promise.all(jobs);
  ready = true; window.__cwAudioReady = Object.keys(bufs).length; for (const k in loops) startLoop(k);
}
export function play(n, vol = 1, rate = 1, delay = 0, rev = .4, dur = 0, pan = 0) {
  if (!Number.isFinite(vol)) vol = 0; if (!Number.isFinite(rate) || rate <= 0) rate = 1; if (!Number.isFinite(delay)) delay = 0; if (!Number.isFinite(rev)) rev = 0; if (!Number.isFinite(dur)) dur = 0; if (!Number.isFinite(pan)) pan = 0;
  delay = Math.max(0, delay); log.push({ n, t: clock() + delay, v: vol, r: rate, rv: rev, d: dur, p: pan });
  if (log.length > 8000) log.splice(0, 1500);
  if (!ready || !bufs[n] || !(vol > 0)) return null;
  const s = ctx.createBufferSource(); s.buffer = bufs[n]; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vol; s.connect(g); let out = g;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); out = p; }
  out.connect(dry); if (rev > 0) { const sg = ctx.createGain(); sg.gain.value = rev; out.connect(sg); sg.connect(conv); }
  const t0 = ctx.currentTime + delay; s.start(t0);
  if (dur > 0) { g.gain.setValueAtTime(vol, t0 + dur); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur + .4); s.stop(t0 + dur + .45); }
  return s;
}
export function note(ins, m, vol = .7, dur = 0, delay = 0, rev = .4, pan = 0) { const { n, r } = sampleFor(ins, m); return play(n, vol, r, delay, rev, dur, pan); }
// looping beds (rain, coil buzz, bubbling, mob): level/rate changes are logged as '~name'
function startLoop(k) { const L = loops[k]; if (!ready || L.src || !bufs[k]) return; L.g = ctx.createGain(); L.g.gain.value = L.v; L.src = ctx.createBufferSource(); L.src.buffer = bufs[k]; L.src.loop = true; L.src.playbackRate.value = L.r; L.src.connect(L.g); L.g.connect(dry); const sg = ctx.createGain(); sg.gain.value = .25; L.g.connect(sg); sg.connect(conv); L.src.start(); }
export function loop(k, v, r = 1, fade = .4) {
  if (!Number.isFinite(v)) v = 0; if (!Number.isFinite(r) || r <= 0) r = 1; if (!Number.isFinite(fade)) fade = .4;
  const L = loops[k] || (loops[k] = { v: 0, r: 1 }); if (Math.abs(L.v - v) < .004 && Math.abs(L.r - r) < .004) return; L.v = v; L.r = r;
  log.push({ n: '~' + k, t: clock(), v, r, f: fade }); startLoop(k);
  if (L.g) { const t = ctx.currentTime; L.g.gain.cancelScheduledValues(t); L.g.gain.setValueAtTime(L.g.gain.value, t); L.g.gain.linearRampToValueAtTime(v, t + fade); L.src.playbackRate.setTargetAtTime(r, t, .15); }
}
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : .9; }
export function isMuted() { return muted; }
const R = Math.random, rr = a => a[Math.floor(R() * a.length)], jit = (k = .06) => 1 + (R() - .5) * 2 * k;
const ARP = [62, 65, 69, 72, 74, 77, 81, 84, 86];
export const sfx = {
  ui() { play('knock', .22, 1.0, 0, .15); },
  ask(boss) { play('page', .26, 1 * jit(), 0, .3); play(rr(['chime_a', 'chime_b', 'chime_c']), .1, .9, .05, .6); if (boss) play('whisper', .25, .9, .1, .6); },
  strike(i) { play('match', .42, .95 + i * .04, 0, .3, 0, (i - 1.5) * .35); },
  correct(streak, i, surge) { const pan = (i - 1.5) * .35; play('fwoosh', .45, 1.05 * jit(), .08, .4, 0, pan); play('magic', .22, 1.1, .1, .5, 0, pan);
    const n = Math.min(ARP.length - 1, 1 + streak); for (let k = 0; k <= Math.min(4, n); k++) note('xy', ARP[Math.max(0, n - 4 + k)], .2, 0, .1 + k * .06, .5, pan); note('hp', ARP[n] + 12, .2, 0, .12, .6);
    if (streak >= 3) play('choir_ah', .22 + streak * .03, 1, .15, .7); if (streak >= 4) play('bell_strike', .3, 1, .2, .6); if (surge) play('fw_crackle', .2, 1.1, .2, .5); },
  wrong(i) { const pan = (i - 1.5) * .35; play('freeze_b', .38, 1, 0, .5, 0, pan); play('wind', .32, 1.35, 0, .4, 1.1, pan); play('swish_b', .3, .7, 0, .3, 0, pan);
    [50, 53, 56].forEach((m, k) => note('org', m, .17, 1.6, .05 + k * .03, .7)); note('ped', 26, .3, 1.8, .05, .7); play('crow', .2, .95, .35, .6); },
  timeout() { play('bell_far', .4, .9, 0, .6); play('wind', .3, 1.2, 0, .4, 1.2); [50, 53, 56].forEach((m, k) => note('org', m, .16, 1.6, .05 + k * .03, .7)); play('freeze', .25, 1, .05, .5, 1.2); },
  heart() { play('heart', .5, 1.08, 0, .2); },
  hint() { play('sparkle', .3, 1, 0, .5); play('swish_a', .2, 1.2, 0, .3); },
  kidsWrong(i) { play('swish_b', .26, .9, 0, .3, 0, (i - 1.5) * .35); play('giggle_kids', .22, 1, .1, .5); },
  gust() { play('wind', .5, 1.2, 0, .4, 1.6); play('freeze_b', .35, .9, .1, .5); play('whoosh', .35, .7, 0, .4); },
  frost() { play('freeze', .45, 1, 0, .5, 2); play('tinkle', .35, 1, .1, .6); play('glass', .18, 1.4, .3, .6); },
  swap() { play('bat_swarm', .4, 1, 0, .5); play('bats', .3, 1.1, .1, .5); play('page', .3, .9, .5, .3); play('flap_1', .3, 1, .05, .3); },
  storm() { play('boom_cine', .95, .9, 0, .5); play('sub', .85, 1, 0, .2); play('glass', .55, .8, .02, .5); play('crash', .45, .9, .02, .6); play('stone_crash', .6, .85, .08, .5); play('crumble', .5, .8, .15, .5); play('thunder_big', .5, 1, .1, .6);
    play('choir_swell', .55, 1, .05, .7); play('bells_peal', .32, 1, .4, .6); play('ghosts', .4, 1, .3, .6, 3); play('fw_burst', .45, .9, .5, .55); play('fw_burst_b', .42, .85, 1.0, .55); play('fw_crackle', .35, 1, 1.4, .5); play('gong', .3, .8, .05, .7);
    [26, 38].forEach((m, i) => note('ped', m, .5, 3.8, i * .02, .7)); [50, 57, 62, 65, 69].forEach((m, i) => note('org', m, .22, 3.6, .04 + i * .02, .7)); },
  rebuild() { play('slab_grind', .4, 1.1, 0, .5); play('stone_1', .3, .9, .7, .4); play('stone_2', .3, 1, 1.1, .4); play('magic', .35, .9, 0, .6); play('glissup', .25, .8, .2, .6); },
  bossIntro() { [0, .9, 1.8].forEach(d => play('bell_deep', .55, .95, d, .7)); play('rumble', .5, 1, .2, .5); play('slab_grind', .45, .8, .6, .5); play('ghosts', .4, .8, 1.2, .6, 2.5); [26, 33].forEach((m, i) => note('ped', m, .45, 3, 1 + i * .02, .7)); play('stinger', .4, 1, 1.3, .6); },
  bossHit(i) { play('hit_dram', .55, 1, 0, .5); play('glass', .35, 1.1, .02, .5); play('ghosts', .35, 1.4, .05, .5, 1.2); play('magic', .3, 1.2, 0, .5, 0, (i - 1.5) * .3); },
  bossLaugh() { play('cackle_b', .42, .82, .1, .6); play('mad_laugh', .2, .75, .2, .6); },
  bossDown() { play('epic', .7, 1, 0, .5); play('boom_bass', .65, 1, 0, .4); play('choir_swell', .55, 1.05, .1, .7); play('fw_burst', .45, 1, .3, .55); play('fw_burst_b', .42, .9, .7, .55); play('success', .4, 1, .4, .5); play('ghosts', .4, 1.6, 0, .5, 2); },
  win() { play('success', .45, .95, 0, .5); play('choir_ah', .35, 1, .1, .7); play('bell_strike', .35, .95, 0, .6); play('applause', .22, 1, .4, .5, 2.5); },
  star(i) { play('bell_strike', .42, [.9, 1, 1.12][i] || 1, 0, .6); play('harp', .25, [.9, 1, 1.12][i] || 1, .02, .6); },
  fail() { play('cackle', .3, .85, .1, .6); [50, 53, 56].forEach((m, i) => note('org', m, .2, 2, i * .04, .7)); note('ped', 26, .4, 2.4, 0, .7); play('thunder_soft', .3, 1, .1, .6); },
  turn() { play('bell_far', .38, 1, 0, .6); },
  owl() { play('owl', .14, 1, 0, .6, 0, (R() - .5) * 1.4); }, crow() { play('crow', .14, .95 * jit(), 0, .6, 0, (R() - .5) * 1.2); }, howl() { play('howl', .1, 1, 0, .7, 0, (R() - .5) * 1.2); }, creak() { play('creak_1', .16, .9 * jit(), 0, .6, 0, (R() - .5)); },
  intro() { play('wind', .25, 1, 0, .4, 4); play('rumble', .4, 1, 0, .5); play('glass', .4, .8, 0, .5); play('stone_crash', .5, .8, 0, .5); play('crumble', .4, .8, .1, .5); play('choir_swell', .45, 1, 0, .7); play('ghosts', .35, 1, .1, .6, 3); play('sub', .7, 1, 0, .2); },
  title() { play('boom_cine', .9, .9, 0, .5); play('hit_dram', .6, .85, 0, .5); [26, 38].forEach((m, i) => note('ped', m, .5, 3, i * .02, .7)); [50, 57, 62, 65].forEach((m, i) => note('org', m, .24, 3, .03 + i * .02, .7)); play('bell_deep', .5, 1, 0, .7); play('fwoosh', .5, .8, 0, .5); }
};

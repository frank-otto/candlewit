// Candlewit rules (no rendering): a séance of 10 questions in rising tiers + the Midnight Round (3 boss questions), Endless Séance,
// and the Player 1 vs Player 2 duel. Timer, flames (lives), streak multiplier, the spirit ring (5 in a row → SPIRIT STORM → ×2 surge
// for the next 3 questions), three jokers (Gust, Frost, Swap), kids rules. Everything is deterministic for a seed; visuals react to this.ev.
import { BANK } from './questions.js';
export const DIFF = {
  easy: { T: 20, lives: 5, tiers: [1, 1, 1, 1, 1, 1, 1, 2, 2, 2], boss: 2 },
  medium: { T: 15, lives: 3, tiers: [1, 1, 1, 2, 2, 2, 2, 2, 3, 3], boss: 3 },
  hard: { T: 10, lives: 2, tiers: [2, 2, 2, 3, 3, 3, 3, 3, 3, 3], boss: 3 },
  kids: { T: 30, lives: Infinity, tiers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], boss: 0 } };
export const MAIN_N = 10, BOSS_N = 3, DUEL_N = 8, STORM_AT = 5, KIDS_STORM = 4, SURGE_N = 3;
export const HOLD = { reveal: 1.5, wrong: 2.1, storm: 5.4, bossIntro: 3.2, bossDown: 3.4 };
const fin = (v, d = 0) => Number.isFinite(v) ? v : d;
function mulberry(a) { return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export class Seance {
  constructor({ mode = 'seance', diff = 'medium', seed = 1, avoid = null } = {}) {
    this.mode = mode; this.diff = DIFF[diff] ? diff : 'medium'; this.kids = this.diff === 'kids'; this.D = DIFF[this.diff]; this.rng = mulberry(seed >>> 0 || 1); this.avoid = avoid;
    this.lives = mode === 'duel' ? Infinity : this.D.lives; this.maxLives = this.lives; /* duel: no flames to lose, both players always get all 8 questions */ this.score = 0; this.streak = 0; this.best = 0; this.correct = 0; this.answered = 0; this.storms = 0; this.surgeQ = 0; this.meter = 0;
    this.jokers = { gust: 1, frost: 1, swap: 1 }; this.ev = []; this.t = 0; this.idx = 0; this.used = new Set(); this.state = 'ask'; this.hold = 0; this.result = null;
    this.boss = { on: false, hp: BOSS_N, down: false, wins: 0 }; this.pend = null; this.total = mode === 'duel' ? DUEL_N : mode === 'endless' ? Infinity : MAIN_N + BOSS_N;
    this.ask(); }
  get stormNeed() { return this.kids ? KIDS_STORM : STORM_AT; }
  slot(i) { // which tier / boss for question i
    if (this.mode === 'duel') return { tier: this.kids ? 0 : this.D.tiers[Math.min(9, Math.floor(i * 10 / DUEL_N))], boss: false };
    if (this.mode === 'endless') { const p = i % 13; return p >= 10 ? { tier: this.kids ? 0 : 3, boss: true } : { tier: this.kids ? 0 : Math.min(3, 1 + Math.floor(i / 8)), boss: false }; }
    return i >= MAIN_N ? { tier: this.D.boss, boss: true } : { tier: this.D.tiers[i], boss: false }; }
  timeFor(i, boss) { let T = this.D.T; if (this.mode === 'endless' && !this.kids) T = Math.max(6, T - i * .25); if (boss && !this.kids) T *= .8; return T; }
  pick(tier, not = -1) { const order = tier === 0 ? [0, 1] : tier === 1 ? [1, 2, 0] : tier === 2 ? [2, 1, 3] : [3, 2, 1];
    for (const strict of [true, false]) for (const tr of order) { const c = []; BANK.forEach((q, i) => { if (q[0] === tr && !this.used.has(i) && i !== not && (!strict || !this.avoid || !this.avoid.has(i))) c.push(i); }); if (c.length) return c[Math.floor(this.rng() * c.length)]; }
    this.used.clear(); return this.pick(tier, not); }
  ask(swapFrom = -1) { const sl = this.slot(this.idx); const bi = this.pick(sl.tier, swapFrom); this.used.add(bi); const B = BANK[bi];
    const ord = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    this.q = { bi, tier: B[0], cat: B[1], text: { en: B[2], de: B[3] }, ans: ord.map(o => ({ en: B[4][o], de: B[5][o] })), ok: ord.indexOf(0), boss: sl.boss, n: this.idx };
    this.T = this.timeFor(this.idx, sl.boss); this.tLeft = this.T; this.elim = [false, false, false, false]; this.frozen = false; this.hinted = false; this.tick = 4; this.state = 'ask'; this.picked = -1;
    if (sl.boss && !this.boss.on) { this.boss.on = true; this.boss.hp = BOSS_N; this.boss.down = false; }
    this.ev.push({ t: swapFrom >= 0 ? 'swapped' : 'ask', n: this.idx, boss: sl.boss }); }
  points(correctIdx) { const base = 100 * Math.max(1, this.q.tier) + (this.q.boss ? 100 : 0); const bonus = Math.round(100 * Math.max(0, this.tLeft) / this.T); const mult = Math.min(5, Math.max(1, this.streak)); return (base + bonus) * mult * (this.surgeQ > 0 ? 2 : 1); }
  answer(i) { i = i | 0; if (this.state !== 'ask' || i < 0 || i > 3 || this.elim[i]) return false; this.picked = i;
    if (i === this.q.ok) { this.streak++; this.best = Math.max(this.best, this.streak); this.correct++; this.answered++; const pts = this.points(); this.score += pts; this.meter = Math.min(this.stormNeed, this.meter + 1);
      this.ev.push({ t: 'correct', i, pts, streak: this.streak, mult: Math.min(5, Math.max(1, this.streak)), surge: this.surgeQ > 0, boss: this.q.boss });
      if (this.q.boss && this.boss.hp > 0) { this.boss.hp--; this.ev.push({ t: 'bossHit', i, hp: this.boss.hp }); }
      if (!this.q.boss && this.meter >= this.stormNeed) this.pend = 'storm';
      this.state = 'reveal'; this.hold = HOLD.reveal; return true; }
    this.streak = 0; if (!this.kids) this.meter = 0;
    if (this.kids) { this.elim[i] = true; this.ev.push({ t: 'wrong', i, ok: this.q.ok, kids: true }); return true; }
    this.answered++; this.lives--; this.ev.push({ t: 'wrong', i, ok: this.q.ok, lives: this.lives, boss: this.q.boss }); if (this.q.boss) this.ev.push({ t: 'bossLaugh' });
    if (this.lives <= 0) this.pend = 'dead'; this.state = 'reveal'; this.hold = HOLD.wrong; return true; }
  timeout() { if (this.kids) { this.tLeft = this.T; return; } this.streak = 0; this.meter = 0; this.answered++; this.lives--; this.picked = -1;
    this.ev.push({ t: 'timeout', ok: this.q.ok, lives: this.lives, boss: this.q.boss }); if (this.q.boss) this.ev.push({ t: 'bossLaugh' }); if (this.lives <= 0) this.pend = 'dead'; this.state = 'reveal'; this.hold = HOLD.wrong; }
  joker(k) { if (this.state !== 'ask' || !(this.jokers[k] > 0)) return false;
    if (k === 'gust') { const w = [0, 1, 2, 3].filter(i => i !== this.q.ok && !this.elim[i]); if (w.length < 2) return false; for (let n = 0; n < 2; n++) { const j = Math.floor(this.rng() * w.length); this.elim[w[j]] = true; w.splice(j, 1); } }
    this.jokers[k]--; this.ev.push({ t: 'joker', k, elim: this.elim.slice() });
    if (k === 'frost') this.frozen = true; if (k === 'swap') this.ask(this.q.bi);
    return true; }
  hint() { const w = [0, 1, 2, 3].filter(i => i !== this.q.ok && !this.elim[i]); if (!w.length) return; const j = w[Math.floor(this.rng() * w.length)]; this.elim[j] = true; this.ev.push({ t: 'hint', i: j }); }
  step(dt) { dt = Math.max(0, Math.min(fin(dt), .25)); this.t += dt;
    if (this.state === 'end') return;
    if (this.state === 'ask') { if (!this.frozen) this.tLeft = fin(this.tLeft, this.T) - dt;
      if (this.kids) { if (!this.hinted && this.T - this.tLeft > 8) { this.hinted = true; this.hint(); } if (this.tLeft <= 0) this.tLeft = this.T; return; }
      if (this.tLeft <= this.tick - 1 && this.tick > 1) { this.tick--; this.ev.push({ t: 'tick', s: this.tick }); }
      if (this.tLeft <= 0) this.timeout(); return; }
    this.hold = fin(this.hold) - dt; if (this.hold > 0) return; this.advance(); }
  advance() {
    if (this.state === 'reveal' || this.state === 'storm') {
      if (this.state === 'reveal' && this.pend === 'dead') { this.pend = null; return this.finish('dead'); }
      if (this.state === 'reveal' && this.pend === 'storm') { this.pend = null; this.state = 'storm'; this.hold = HOLD.storm; this.storms++; this.surgeQ = SURGE_N; this.meter = 0; this.ev.push({ t: 'storm', n: this.storms }); return; }
      if (this.state === 'reveal' && this.surgeQ > 0 ) { if (--this.surgeQ === 0) this.ev.push({ t: 'surgeEnd' }); }
      return this.proceed(); }
    if (this.state === 'bossIntro') return this.ask();
    if (this.state === 'bossDown') { if (this.mode === 'endless') { this.idx++; return this.ask(); } return this.finish('win'); } }
  proceed() { const wasBoss = this.q.boss; this.idx++;
    if (this.idx >= this.total) return this.endBoss(wasBoss) || this.finish('win');
    const sl = this.slot(this.idx);
    if (wasBoss && !sl.boss) { if (this.endBoss(true)) return; }
    if (sl.boss && !this.boss.on) { this.boss.on = true; this.boss.hp = BOSS_N; this.boss.down = false; this.state = 'bossIntro'; this.hold = HOLD.bossIntro; this.ev.push({ t: 'bossIntro' }); return; }
    this.ask(); }
  endBoss(wasBoss) { if (!wasBoss || !this.boss.on) return false; this.boss.on = false;
    if (this.boss.hp <= 0) { this.boss.down = true; this.boss.wins++; const bonus = this.kids ? 500 : 1000 * Math.max(1, this.D.boss); this.score += bonus; this.ev.push({ t: 'bossDown', bonus }); this.state = 'bossDown'; this.hold = HOLD.bossDown; if (this.mode === 'endless') this.idx--; return true; }
    this.ev.push({ t: 'bossEscape' }); if (this.mode === 'endless') return false; this.finish('win'); return true; }
  finish(res) { if (this.state === 'end') return; this.state = 'end'; this.result = res; this.ev.push({ t: 'end', res }); }
  stars() { if (this.result !== 'win' || this.mode !== 'seance') return 0; const c = this.correct; return c >= 12 && this.boss.wins > 0 ? 3 : c >= 10 ? 2 : 1; }
}
// the demo / test bot: right with probability acc, otherwise a random still-lit wrong candle
export function botPick(Q, acc, r = Math.random) { const q = Q.q; if (r() < acc) return q.ok; const w = [0, 1, 2, 3].filter(i => i !== q.ok && !Q.elim[i]); return w.length ? w[Math.floor(r() * w.length)] : q.ok; }

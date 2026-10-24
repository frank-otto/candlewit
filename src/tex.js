// Procedural canvas textures (no image files): ashlar stone walls + flagstone floor (colour + roughness), dark oak, velvet cloth with a
// gold-thread hem, the moon, arched moonlit windows, rune glyphs, a chalk rune circle, cobwebs, a ghost-wisp sprite, soft sprites, smoke.
import * as THREE from 'three';
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
let seed = 7; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
export function tex(c, { srgb = true, rep = true, mip = true } = {}) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (!mip) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; } return t; }
function noiseDots(k, w, h, n, a) { for (let i = 0; i < n; i++) { k.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${R() * a})`; k.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); } }
// ashlar blocks: returns { map, rough } – 4 courses × 3 blocks per repeat
export function stoneTex(rows = 4, cols = 3, hue = 250, light = 30) {
  const S = 512, [c, k] = cv(S, S), [r, q] = cv(S, S); k.fillStyle = '#16141c'; k.fillRect(0, 0, S, S); q.fillStyle = '#fff'; q.fillRect(0, 0, S, S);
  const bh = S / rows, bw = S / cols;
  for (let y = 0; y < rows; y++) for (let x = -1; x <= cols; x++) { const ox = x * bw + (y % 2) * bw / 2, oy = y * bh; const l = light - 6 + R() * 12, h = hue + R() * 30 - 15, s = 6 + R() * 8;
    const g = k.createLinearGradient(ox, oy, ox + bw, oy + bh); g.addColorStop(0, `hsl(${h},${s}%,${l + 5}%)`); g.addColorStop(1, `hsl(${h},${s}%,${l - 5}%)`); k.fillStyle = g; k.fillRect(ox + 3, oy + 3, bw - 6, bh - 6);
    q.fillStyle = `rgb(${170 + R() * 60 | 0},0,0)`; q.fillRect(ox + 3, oy + 3, bw - 6, bh - 6);
    for (let i = 0; i < 6; i++) { k.fillStyle = `rgba(0,0,0,${.08 + R() * .1})`; k.beginPath(); k.arc(ox + R() * bw, oy + R() * bh, 3 + R() * 14, 0, 7); k.fill(); }
    if (R() < .3) { k.strokeStyle = 'rgba(0,0,0,.35)'; k.lineWidth = 1.5; k.beginPath(); let px = ox + R() * bw, py = oy + 4; k.moveTo(px, py); for (let j = 0; j < 5; j++) { px += (R() - .5) * 30; py += bh / 6; k.lineTo(px, py); } k.stroke(); }
    if (R() < .22) { k.fillStyle = 'rgba(70,96,60,.22)'; k.beginPath(); k.ellipse(ox + R() * bw, oy + bh - 6, 20 + R() * 30, 6 + R() * 6, 0, 0, 7); k.fill(); } }
  noiseDots(k, S, S, 3000, .07);
  return { map: tex(c), rough: tex(r, { srgb: false }) }; }
export function woodTex() { const [c, k] = cv(512, 512); k.fillStyle = '#2a170e'; k.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 2) { const v = Math.sin(y * .05 + Math.sin(y * .013) * 4) * .5 + .5; k.fillStyle = `rgba(${70 + v * 40 | 0},${38 + v * 22 | 0},${20 + v * 10 | 0},.55)`; k.fillRect(0, y, 512, 2); }
  for (let i = 0; i < 40; i++) { k.strokeStyle = `rgba(20,10,4,${.15 + R() * .25})`; k.lineWidth = 1 + R() * 2; k.beginPath(); const y = R() * 512; k.moveTo(0, y); for (let x = 0; x <= 512; x += 32) k.lineTo(x, y + Math.sin(x * .02 + i) * 6); k.stroke(); }
  noiseDots(k, 512, 512, 1500, .06); return tex(c); }
export function velvetTex() { // deep purple velvet with a woven damask pattern and a gold-thread hem band at v = 0..0.12
  const [c, k] = cv(512, 512); const g = k.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#3a1250'); g.addColorStop(1, '#22082e'); k.fillStyle = g; k.fillRect(0, 0, 512, 512);
  k.strokeStyle = 'rgba(150,80,190,.22)'; k.lineWidth = 3; for (let y = 90; y < 520; y += 84) for (let x = 0; x < 560; x += 84) { const ox = x + ((y / 84) % 2) * 42; k.beginPath(); k.moveTo(ox, y - 26); k.quadraticCurveTo(ox + 22, y, ox, y + 26); k.quadraticCurveTo(ox - 22, y, ox, y - 26); k.stroke(); k.beginPath(); k.arc(ox, y, 6, 0, 7); k.stroke(); }
  const hg = k.createLinearGradient(0, 0, 0, 60); hg.addColorStop(0, '#8a6a20'); hg.addColorStop(.5, '#e8c46a'); hg.addColorStop(1, '#6a4a10'); k.fillStyle = hg; k.fillRect(0, 0, 512, 54);
  k.fillStyle = 'rgba(60,30,0,.6)'; for (let x = 0; x < 512; x += 16) { k.beginPath(); k.moveTo(x, 54); k.lineTo(x + 8, 70); k.lineTo(x + 16, 54); k.fill(); }
  noiseDots(k, 512, 512, 2500, .05); return tex(c); }
export function moonTex() {
  const [c, k] = cv(512, 512); const g = k.createRadialGradient(240, 230, 10, 256, 256, 250); g.addColorStop(0, '#fffdf2'); g.addColorStop(.7, '#f3ead2'); g.addColorStop(.95, '#d9cba8'); g.addColorStop(1, 'rgba(217,203,168,0)');
  k.fillStyle = g; k.beginPath(); k.arc(256, 256, 250, 0, 7); k.fill();
  for (const [x, y, r] of [[180, 190, 70], [300, 160, 52], [320, 300, 80], [200, 330, 46], [260, 240, 34], [140, 280, 30]]) { const m = k.createRadialGradient(x, y, 2, x, y, r); m.addColorStop(0, 'rgba(150,140,120,.55)'); m.addColorStop(1, 'rgba(150,140,120,0)'); k.fillStyle = m; k.beginPath(); k.arc(x, y, r, 0, 7); k.fill(); }
  for (let i = 0; i < 90; i++) { const a = R() * 7, rr = Math.sqrt(R()) * 230, x = 256 + Math.cos(a) * rr, y = 256 + Math.sin(a) * rr, r = 2 + R() * 9;
    k.strokeStyle = 'rgba(120,110,95,.35)'; k.lineWidth = 1.5; k.beginPath(); k.arc(x, y, r, 0, 7); k.stroke(); k.fillStyle = 'rgba(255,255,245,.18)'; k.beginPath(); k.arc(x - r * .3, y - r * .3, r * .6, 0, 7); k.fill(); }
  return tex(c, { rep: false }); }
export function windowTex() { // tall arched window: night sky gradient, stars, lead mullions (alpha = glass), used as an emissive plane
  const [c, k] = cv(256, 512); k.clearRect(0, 0, 256, 512);
  k.save(); k.beginPath(); k.moveTo(28, 500); k.lineTo(28, 140); k.arc(128, 140, 100, Math.PI, 0); k.lineTo(228, 500); k.closePath(); k.clip();
  const g = k.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#2a3a7a'); g.addColorStop(.6, '#3a2a6a'); g.addColorStop(1, '#6a3a5a'); k.fillStyle = g; k.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 70; i++) { k.fillStyle = `rgba(255,255,255,${.3 + R() * .7})`; k.fillRect(28 + R() * 200, R() * 420, 1.5, 1.5); }
  k.fillStyle = '#0a0812'; k.beginPath(); k.moveTo(28, 500); for (let x = 28; x <= 228; x += 20) k.lineTo(x, 430 - R() * 60 - (Math.abs(x - 128) < 30 ? 50 : 0)); k.lineTo(228, 500); k.fill(); // distant graveyard / hills
  k.strokeStyle = '#120c10'; k.lineWidth = 9; k.beginPath(); k.moveTo(128, 30); k.lineTo(128, 500); for (const y of [190, 300, 410]) { k.moveTo(28, y); k.lineTo(228, y); } k.stroke();
  k.lineWidth = 4; for (let y = 60; y < 500; y += 36) for (let x = 28; x < 228; x += 50) { k.beginPath(); k.moveTo(x, y); k.lineTo(x + 25, y + 18); k.lineTo(x + 50, y); k.stroke(); }
  k.restore(); k.strokeStyle = '#2a2230'; k.lineWidth = 16; k.beginPath(); k.moveTo(28, 500); k.lineTo(28, 140); k.arc(128, 140, 100, Math.PI, 0); k.lineTo(228, 500); k.stroke();
  return tex(c, { rep: false }); }
export const RUNES = ['☾', '✶', '✦', '◆'];
export function runeTex(i, col) { const [c, k] = cv(128, 128); k.fillStyle = '#000'; k.fillRect(0, 0, 128, 128); k.fillStyle = col; k.font = '700 86px serif'; k.textAlign = 'center'; k.textBaseline = 'middle'; k.shadowColor = col; k.shadowBlur = 14; k.fillText(RUNES[i], 64, 70); return tex(c, { rep: false }); }
export function circleTex() { // chalk rune circle on the floor (alpha), glows with the spirit ring
  const S = 1024, [c, k] = cv(S, S); k.clearRect(0, 0, S, S); k.translate(S / 2, S / 2); k.strokeStyle = '#fff'; k.fillStyle = '#fff';
  for (const [r, w] of [[490, 6], [470, 2.5], [400, 3], [380, 1.5]]) { k.lineWidth = w; k.beginPath(); k.arc(0, 0, r, 0, 7); k.stroke(); }
  k.font = '600 46px serif'; k.textAlign = 'center'; k.textBaseline = 'middle'; const G = ['☾', '✶', '✦', '◆', '☽', '✧', '❖', '✷'];
  for (let i = 0; i < 24; i++) { k.save(); k.rotate(i / 24 * Math.PI * 2); k.fillText(G[i % G.length], 0, -435); k.restore(); }
  for (let i = 0; i < 12; i++) { k.save(); k.rotate(i / 12 * Math.PI * 2); k.lineWidth = 2; k.beginPath(); k.moveTo(0, -380); k.lineTo(0, -300); k.stroke(); k.restore(); }
  const im = k.getImageData(0, 0, S, S); for (let i = 3; i < im.data.length; i += 4) if (im.data[i] > 0) im.data[i] *= .55 + Math.random() * .45; k.putImageData(im, 0, 0);
  return tex(c, { rep: false, srgb: false }); }
export function webTex() { const [c, k] = cv(256, 256); k.clearRect(0, 0, 256, 256); k.strokeStyle = 'rgba(230,230,255,.55)'; k.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI / 2; k.beginPath(); k.moveTo(0, 0); k.lineTo(Math.cos(a) * 250, Math.sin(a) * 250); k.stroke(); }
  for (let r = 30; r < 250; r += 22 + R() * 10) { k.beginPath(); for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2, rr = r + (i % 2 ? -5 : 0); if (i) k.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else k.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } k.stroke(); }
  return tex(c, { rep: false }); }
export function wispTex() { // a little ghost: soft white body with a wavy hem and two dark eyes (alpha in A, used additively)
  const [c, k] = cv(128, 128); k.clearRect(0, 0, 128, 128); const g = k.createRadialGradient(64, 54, 4, 64, 60, 56); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.6, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  k.fillStyle = g; k.beginPath(); k.moveTo(28, 110); k.lineTo(28, 54); k.arc(64, 54, 36, Math.PI, 0); k.lineTo(100, 110); for (let x = 100; x >= 28; x -= 12) k.quadraticCurveTo(x - 6, 96, x - 12, 110); k.fill();
  k.globalCompositeOperation = 'destination-out'; k.fillStyle = '#000'; k.beginPath(); k.ellipse(52, 56, 6, 9, 0, 0, 7); k.ellipse(76, 56, 6, 9, 0, 0, 7); k.fill(); k.beginPath(); k.ellipse(64, 76, 5, 6, 0, 0, 7); k.fill();
  return tex(c, { rep: false, srgb: false }); }
export function softTex() { const [c, k] = cv(64, 64); const g = k.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.65)'); g.addColorStop(1, 'rgba(255,255,255,0)'); k.fillStyle = g; k.fillRect(0, 0, 64, 64); return tex(c, { srgb: false, rep: false }); }
export function smokeTex() { const [c, k] = cv(128, 128); for (let i = 0; i < 26; i++) { const x = 34 + R() * 60, y = 34 + R() * 60, r = 14 + R() * 26; const g = k.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); k.fillStyle = g; k.fillRect(0, 0, 128, 128); } return tex(c, { rep: false }); }

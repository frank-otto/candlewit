// Spirits: the WISP VORTEX (instanced ghost billboards, motion fully in the vertex shader), the MIDNIGHT SPECTRE (a giant translucent
// ghost with a rippling hem, reaching sleeves and burning eyes), the candle BEAM that strikes it, and a bat flock for the Swap joker.
import * as THREE from 'three';
import { wispTex } from './tex.js';
import { BALL_Y } from './props.js';
function hash(n) { const x = Math.sin(n * 53.7 + 7.1) * 43758.5453; return x - Math.floor(x); }
export function createSpirits(scene, soft) {
  const S = { scene };
  // ---- wisp vortex
  const N = 220; S.NW = N; const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); geo.instanceCount = 140;
  const a = new Float32Array(N * 4); for (let i = 0; i < N; i++) a.set([hash(i) * 6.283, hash(i + 100), hash(i + 200), hash(i + 300)], i * 4);
  geo.setAttribute('aR', new THREE.InstancedBufferAttribute(a, 4));
  S.wU = { uT: { value: -1 }, uK: { value: 0 }, uO: { value: new THREE.Vector3(0, BALL_Y, 0) }, uSpread: { value: 1 }, map: { value: wispTex() }, time: { value: 0 } };
  S.wisps = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: S.wU, transparent: true, depthWrite: false, fog: false,
    vertexShader: `attribute vec4 aR; uniform float uT, uK, uSpread, time; uniform vec3 uO; varying vec2 vUv; varying float vA; varying vec3 vC;
      void main(){ vUv = uv; float t = max(0., uT - aR.w * 1.6); float ang = aR.x + t * (1.6 + aR.y * 1.4) + t * t * .15; float rad = (.25 + aR.y * .5 + t * (.55 + aR.z * .7)) * uSpread;
        vec3 p = uO + vec3(cos(ang) * rad, t * (2.2 + aR.z * 3.2) + sin(time * 2. + aR.x * 5.) * .2, sin(ang) * rad);
        vA = uK * smoothstep(0., .25, t) * (1. - smoothstep(4.5, 7.5, t)) * step(.0001, uT - aR.w * 1.6);
        vC = mix(vec3(.6, .95, 1.), vec3(.85, .7, 1.), aR.y); float s = (.2 + aR.z * .26) * (1. + t * .1);
        vec4 mv = modelViewMatrix * vec4(p, 1.); vA *= smoothstep(1.4, 3.2, -mv.z); mv.xy += position.xy * s; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; varying float vA; varying vec3 vC; void main(){ float a = texture2D(map, vUv).a * vA; if (a < .004) discard; gl_FragColor = vec4(vC * 1.04, a * .5); }' }));
  S.wisps.frustumCulled = false; S.wisps.renderOrder = 6; scene.add(S.wisps);
  // ---- the Midnight Spectre
  const pts = []; for (let i = 0; i <= 40; i++) { const k = i / 40, y = k * 4.4; let r; if (k > .78) { const u = (k - .78) / .22; r = .78 * Math.sqrt(Math.max(0, 1 - u * u)); } else r = .62 + (.78 - k) * 1.05 - Math.sin(k * 6) * .05; pts.push(new THREE.Vector2(Math.max(.001, r), y)); }
  S.spU = { time: { value: 0 }, uA: { value: 0 }, uHit: { value: 0 }, uCol: { value: new THREE.Color('#7affd8') } };
  const spM = new THREE.ShaderMaterial({ uniforms: S.spU, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time; varying vec3 vN, vV; varying float vY; void main(){ vec3 p = position; float k = 1. - p.y / 4.4; vY = p.y / 4.4;
      float a = atan(p.z, p.x); p.y += sin(a * 7. + time * 3.) * .16 * pow(k, 3.) * 1.5; p.xz *= 1. + sin(a * 5. - time * 2.2 + p.y * 2.) * .06 * k; p.x += sin(time * 1.3 + p.y * 1.2) * .12 * k;
      vec4 w = modelViewMatrix * vec4(p, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-w.xyz); gl_Position = projectionMatrix * w; }`,
    fragmentShader: `uniform float time, uA, uHit; uniform vec3 uCol; varying vec3 vN, vV; varying float vY; void main(){ float f = 1. - abs(dot(normalize(vN), vV)); float rim = pow(f, 2.2);
      float body = .12 + .25 * smoothstep(.0, .6, vY); float flick = .85 + .15 * sin(time * 9. + vY * 20.); vec3 c = uCol * (rim * 1.5 + body) * flick + vec3(1.) * uHit * .9;
      c *= smoothstep(0., .18, vY); gl_FragColor = vec4(c * uA, 1.); }` });
  S.spectre = new THREE.Group(); S.spectre.position.set(0, -4.6, -3.4); scene.add(S.spectre); S.spectre.visible = false;
  S.body = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), spM); S.body.renderOrder = 4; S.spectre.add(S.body);
  S.sleeves = []; for (const sx of [-1, 1]) { const sl = new THREE.Mesh(new THREE.ConeGeometry(.32, 2.1, 16, 6, true), spM); sl.position.set(sx * .95, 2.75, .55); sl.rotation.set(-1.15, 0, sx * .45); S.spectre.add(sl); S.sleeves.push(sl); }
  S.eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.2, .3), transparent: true, opacity: 0 }); S.eyes = [];
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 10), S.eyeM); e.scale.set(1, 1.5, .6); e.position.set(sx * .27, 3.82, .66); S.spectre.add(e); S.eyes.push(e); }
  S.mouth = new THREE.Mesh(new THREE.SphereGeometry(.14, 16, 10), S.eyeM); S.mouth.scale.set(1.3, .5, .4); S.mouth.position.set(0, 3.45, .7); S.spectre.add(S.mouth);
  S.spL = new THREE.PointLight('#7affd8', 0, 9, 2); S.spL.position.set(0, 3, .6); S.spectre.add(S.spL);
  S.sp = { on: false, rise: 0, hp: 3, hitT: -9, down: -1, laughT: -9 };
  // ---- the candle beam (an additive stretched cylinder from a flame to the target)
  S.beamM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  S.beam = new THREE.Mesh(new THREE.CylinderGeometry(.05, .12, 1, 12, 1, true), S.beamM); S.beam.visible = false; S.beam.renderOrder = 7; scene.add(S.beam);
  // ---- bat flock
  const sh = new THREE.Shape(); sh.moveTo(0, .05); sh.lineTo(.5, .2); sh.lineTo(.7, 0); sh.lineTo(.5, -.06); sh.lineTo(.35, 0); sh.lineTo(.2, -.1); sh.lineTo(0, -.05); sh.lineTo(-.2, -.1); sh.lineTo(-.35, 0); sh.lineTo(-.5, -.06); sh.lineTo(-.7, 0); sh.lineTo(-.5, .2); sh.closePath();
  S.NB = 36; S.flock = new THREE.InstancedMesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: '#08050e', side: THREE.DoubleSide }), S.NB); S.flock.frustumCulled = false; S.flock.count = 0; scene.add(S.flock);
  S.bats = []; for (let i = 0; i < S.NB; i++) S.bats.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), ph: hash(i + 9) * 6, life: 0 });
  return S;
}
export function wispBurst(S, t0, at, spread = 1) { S.wT0 = t0; S.wU.uO.value.copy(at); S.wU.uSpread.value = spread; }
export function batsGo(S, from) { let i = 0; for (const b of S.bats) { b.p.set(from.x + (hash(i) - .5) * 2, from.y + (hash(i + 1) - .5), from.z + (hash(i + 2) - .5) * 2); b.v.set(4 + hash(i + 3) * 4, 1 + hash(i + 4) * 2.5, (hash(i + 5) - .5) * 3); b.life = 2.2 + hash(i + 6); i++; } S.flock.count = S.NB; }
export function beamTo(S, a, b, t) { S.beamA = a.clone(); S.beamB = b.clone(); S.beamT0 = t; S.beam.visible = true; }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _d = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
export function updateSpirits(S, t, dt) {
  S.wU.time.value = t; S.spU.time.value = t;
  if (S.wT0 != null) { const u = t - S.wT0; S.wU.uT.value = u; S.wU.uK.value = u < 9 ? 1 : 0; if (u > 9) S.wT0 = null; } else { S.wU.uK.value = 0; S.wU.uT.value = -1; }
  S.wisps.visible = S.wU.uK.value > 0;
  // spectre
  const sp = S.sp; if (sp.on || sp.rise > 0) { S.spectre.visible = true; sp.rise = Math.max(0, Math.min(1, sp.rise + dt * (sp.on ? .55 : -1.2)));
    const e = 1 - Math.pow(1 - sp.rise, 3); const hit = Math.max(0, 1 - (t - sp.hitT) / .45); const fade = sp.down >= 0 ? Math.max(0, 1 - (t - sp.down) / .6) : 1;
    S.spectre.position.y = -4.6 + e * 4.6 + Math.sin(t * 1.1) * .12 + hit * .25; S.spectre.position.z = -3.4 - hit * .5; const sc = (.75 + .25 * sp.hp / 3) * (1 + (sp.down >= 0 ? (t - sp.down) * 1.2 : 0)); S.spectre.scale.setScalar(sc);
    S.spU.uA.value = e * fade; S.spU.uHit.value = hit; S.eyeM.opacity = e * fade; const lg = Math.max(0, 1 - (t - sp.laughT) / 1.2); S.mouth.scale.set(1.3, .5 + lg * .7 * (.5 + .5 * Math.sin(t * 30)), .4);
    S.sleeves.forEach((s, i) => { s.rotation.x = -1.15 + Math.sin(t * 2 + i) * .15 - lg * .3; }); S.spL.intensity = 3 * e * fade + hit * 6;
    if (sp.down >= 0 && t - sp.down > .7) { sp.on = false; sp.rise = 0; S.spectre.visible = false; } }
  else S.spectre.visible = false;
  // beam
  if (S.beam.visible) { const u = t - S.beamT0, k = Math.max(0, 1 - u / .5); S.beamM.opacity = k; if (k <= 0) S.beam.visible = false; else { _d.subVectors(S.beamB, S.beamA); const L = _d.length(); S.beam.position.copy(S.beamA).addScaledVector(_d, .5); _q.setFromUnitVectors(_up, _d.normalize()); S.beam.quaternion.copy(_q); S.beam.scale.set(1 + (1 - k) * 2, L, 1 + (1 - k) * 2); } }
  // bats
  if (S.flock.count) { let alive = 0; for (let i = 0; i < S.NB; i++) { const b = S.bats[i]; if (b.life <= 0) { _m.makeScale(0, 0, 0); S.flock.setMatrixAt(i, _m); continue; } alive++; b.life -= dt; b.p.addScaledVector(b.v, dt); b.v.y += dt * .6;
      _q.setFromEuler(_e.set(0, Math.atan2(b.v.x, b.v.z), 0)); const f = .4 + .6 * Math.abs(Math.sin(t * 18 + b.ph)); _s.set(.5 * f, .5, .5); _m.compose(b.p, _q, _s); S.flock.setMatrixAt(i, _m); }
    S.flock.instanceMatrix.needsUpdate = true; if (!alive) S.flock.count = 0; }
}

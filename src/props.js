// The séance table: dark oak top, velvet cloth with a gold hem, a brass claw stand with the CRYSTAL BALL (glossy glass + a swirling
// mist core whose colour reacts to every answer), twelve small CLOCK CANDLES round the rim (the timer – they go out one by one),
// the four tall ANSWER CANDLES on iron stands with floating runes, floor candle clusters, and ONE instanced billboard flame shader for all flames.
import * as THREE from 'three';
import { woodTex, velvetTex, runeTex } from './tex.js';
import { ROOM } from './world.js';
export const ANS_COL = ['#ffb347', '#6dff9a', '#c77dff', '#5ad1ff']; // amber ☾, green ✶, violet ✦, blue ◆
export const BALL_Y = 1.36, BALL_R = .36, TABLE_Y = .86;
function hash(n) { const x = Math.sin(n * 91.7 + 17.3) * 43758.5453; return x - Math.floor(x); }
function waxGeo(r, h, seed) { // a candle with wax drips running down from the rim
  const g = new THREE.CylinderGeometry(r * .97, r, h, 20, 8); g.translate(0, h / 2, 0); const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x), drip = Math.max(0, Math.sin(a * 5 + seed * 3) * Math.sin(a * 3 + seed)) ; const k = v.y / h;
    const bulge = 1 + drip * .14 * Math.max(0, k - .25 - hash(Math.floor(a * 5 + seed)) * .5) * 2; v.x *= bulge; v.z *= bulge; if (k > .98) v.y -= .015 * (1 - Math.hypot(v.x, v.z) / r); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g; }
export function createProps(scene, W) {
  const P = { flames: [], lights: [], scene };
  const brass = new THREE.MeshStandardMaterial({ color: '#c8a050', metalness: 1, roughness: .32 }); const iron = new THREE.MeshStandardMaterial({ color: '#2a2630', metalness: .85, roughness: .45 });
  P.mats = { brass, iron };
  // table
  const wood = new THREE.MeshStandardMaterial({ map: woodTex(), roughness: .55, metalness: 0, color: '#c8a898' });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, .08, 64), wood); top.position.y = TABLE_Y - .04; top.castShadow = top.receiveShadow = true; scene.add(top);
  const vel = velvetTex(); vel.wrapS = THREE.RepeatWrapping; vel.repeat.set(6, 1);
  const clothM = new THREE.MeshPhysicalMaterial({ map: vel, roughness: .82, sheen: 1, sheenRoughness: .45, sheenColor: new THREE.Color('#d0a0ff'), color: '#ffffff', side: THREE.DoubleSide });
  const cg = new THREE.CylinderGeometry(1.56, 1.8, .74, 96, 6, true); cg.translate(0, TABLE_Y - .37, 0); { const p = cg.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x), k = 1 - (v.y - (TABLE_Y - .74)) / .74; const w = 1 + Math.sin(a * 14) * .035 * k; v.x *= w; v.z *= w; v.y -= Math.max(0, Math.sin(a * 14)) * .03 * k; p.setXYZ(i, v.x, v.y, v.z); } cg.computeVertexNormals(); }
  const cloth = new THREE.Mesh(cg, clothM); cloth.castShadow = true; cloth.receiveShadow = true; scene.add(cloth);
  const ctop = new THREE.Mesh(new THREE.CircleGeometry(1.57, 64), new THREE.MeshPhysicalMaterial({ color: '#3a1450', roughness: .8, sheen: 1, sheenColor: new THREE.Color('#c090ff') })); ctop.rotation.x = -Math.PI / 2; ctop.position.y = TABLE_Y + .002; ctop.receiveShadow = true; scene.add(ctop);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.5, .7, .16, 32), iron); base.position.y = .08; scene.add(base);
  // brass claw stand
  const st = new THREE.Group(); st.position.y = TABLE_Y; scene.add(st);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(.2, .26, .1, 32), brass); ring.position.y = .05; ring.castShadow = true; st.add(ring);
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.TorusGeometry(.22, .026, 8, 20, Math.PI * .55), brass); c.position.y = .2; c.rotation.y = i / 4 * Math.PI * 2; c.rotation.z = Math.PI * .55; c.castShadow = true; st.add(c); }
  // crystal ball: inner mist (additive shader) + glossy shell
  P.mistU = { time: { value: 0 }, col: { value: new THREE.Color('#8a6aff') }, col2: { value: new THREE.Color('#ff7ad8') }, k: { value: 1 } };
  P.mist = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * .93, 48, 32), new THREE.ShaderMaterial({ uniforms: P.mistU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vP, vN, vV; void main(){ vP = position; vec4 w = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-w.xyz); gl_Position = projectionMatrix * w; }',
    fragmentShader: `uniform float time, k; uniform vec3 col, col2; varying vec3 vP, vN, vV;
      float n3(vec3 p){ return sin(p.x * 3.1 + sin(p.y * 2.3 + time * .9)) * sin(p.y * 2.7 + sin(p.z * 3.3 - time * .7)) * sin(p.z * 2.9 + sin(p.x * 2.1 + time * .5)); }
      void main(){ vec3 p = vP * 9.; float a = atan(p.z, p.x) + time * .6; vec3 q = vec3(cos(a) * length(p.xz), p.y, sin(a) * length(p.xz));
        float m = n3(q) * .5 + .5; m = pow(m, 2.2); float m2 = n3(q * 1.7 + 3.) * .5 + .5; float f = pow(abs(dot(vN, vV)), .8);
        vec3 c = mix(col, col2, m2) * (m * 1.3 + .15) * f; gl_FragColor = vec4(c * k * 1.1, 1.); }` }));
  P.mist.position.y = BALL_Y; scene.add(P.mist);
  P.ballM = new THREE.MeshPhysicalMaterial({ color: '#c8d8ff', metalness: 0, roughness: .04, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .28, envMapIntensity: 2.2, ior: 1.45, specularIntensity: 1 });
  P.ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 48, 32), P.ballM); P.ball.position.y = BALL_Y; P.ball.castShadow = true; scene.add(P.ball);
  P.ballLight = new THREE.PointLight('#9a7aff', 2.2, 6, 2); P.ballLight.position.set(0, BALL_Y, 0); scene.add(P.ballLight);
  // twelve clock candles round the rim
  const waxM = new THREE.MeshStandardMaterial({ color: '#efe4cc', roughness: .55, metalness: 0, emissive: '#ff9a40', emissiveIntensity: .05 }); P.waxM = waxM;
  P.clock = []; const cgeo = waxGeo(.045, .24, 1); P.cgeo = cgeo;
  P.clockMesh = new THREE.InstancedMesh(cgeo, waxM, 12); { const m = new THREE.Matrix4(); for (let i = 0; i < 12; i++) { const a = -i / 12 * Math.PI * 2 + Math.PI, x = Math.sin(a) * 1.3, z = Math.cos(a) * 1.3; m.makeTranslation(x, TABLE_Y, z); P.clockMesh.setMatrixAt(i, m); P.clock.push({ x, z, a }); } }
  P.clockMesh.castShadow = true; scene.add(P.clockMesh);
  // the four answer candles on iron stands + floating runes
  P.ans = [];
  for (let i = 0; i < 4; i++) { const g = new THREE.Group(); scene.add(g); const stand = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, 1.05, 10), iron); stand.position.y = .525; stand.castShadow = true; g.add(stand);
    for (let l = 0; l < 3; l++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.025, .02, .42, 6), iron); const a = l / 3 * Math.PI * 2; leg.position.set(Math.sin(a) * .14, .16, Math.cos(a) * .14); leg.rotation.set(Math.cos(a) * .6, 0, -Math.sin(a) * .6); g.add(leg); }
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(.17, .1, .05, 20), brass); dish.position.y = 1.07; dish.castShadow = true; g.add(dish);
    const wm = waxM.clone(); wm.emissive = new THREE.Color(ANS_COL[i]); wm.emissiveIntensity = .08; const wax = new THREE.Mesh(waxGeo(.085, .5, i + 2), wm); wax.position.y = 1.09; wax.castShadow = true; g.add(wax);
    const rt = runeTex(i, ANS_COL[i]); const rune = new THREE.Sprite(new THREE.SpriteMaterial({ map: rt, color: new THREE.Color(ANS_COL[i]).multiplyScalar(1.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); rune.scale.set(.34, .34, 1); rune.position.y = 2.16; g.add(rune);
    const L = new THREE.PointLight(ANS_COL[i], 0, 6, 2); L.position.y = 1.78; g.add(L);
    P.ans.push({ g, wax, wm, rune, rt, L, top: 1.59, lit: 1, flare: 0, out: 0 }); }
  layoutCandles(P, 1.6);
  // floor candle clusters between the pillars
  const NF = 30; P.floorMesh = new THREE.InstancedMesh(waxGeo(.07, .4, 7), waxM, NF); P.floorC = []; { const m = new THREE.Matrix4(), s = new THREE.Vector3(), q = new THREE.Quaternion(), p = new THREE.Vector3();
    for (let i = 0; i < NF; i++) { const cl = Math.floor(i / 3), a = (cl + .02 + (i % 3) * .05) / 10 * Math.PI * 2 + .1, r = ROOM.R - 1.15 - (i % 3) * .28; const h = .5 + hash(i) * 1.1; p.set(Math.sin(a) * r, 0, Math.cos(a) * r); s.set(1, h, 1); m.compose(p, q, s); P.floorMesh.setMatrixAt(i, m); P.floorC.push({ x: p.x, z: p.z, y: .4 * h }); } }
  P.floorMesh.castShadow = false; scene.add(P.floorMesh);
  // ---- all flames: one instanced camera-facing billboard (teardrop + flicker), additive HDR colour for the bloom
  const NFL = 4 + 12 + NF; P.NFL = NFL; const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); geo.instanceCount = NFL;
  P.fPos = new Float32Array(NFL * 3); P.fCol = new Float32Array(NFL * 3); P.fK = new Float32Array(NFL * 2); // k = (intensity, size)
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(P.fPos, 3)); geo.setAttribute('aCol', new THREE.InstancedBufferAttribute(P.fCol, 3)); geo.setAttribute('aK', new THREE.InstancedBufferAttribute(P.fK, 2));
  P.flameU = { time: { value: 0 } };
  P.flameMesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: P.flameU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aPos, aCol; attribute vec2 aK; uniform float time; varying vec2 vUv; varying vec3 vC; varying float vI, vS;
      void main(){ vUv = uv; vC = aCol; vI = aK.x; vS = fract(aPos.x * 7.13 + aPos.z * 3.7); float s = aK.y * (.75 + .25 * smoothstep(0., 1., aK.x)); s *= 1. + .06 * sin(time * 13. + vS * 40.);
        vec4 mv = modelViewMatrix * vec4(aPos, 1.); mv.xy += (position.xy + vec2(0., .38)) * vec2(.55, 1.15) * s; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float time; varying vec2 vUv; varying vec3 vC; varying float vI, vS;
      void main(){ if (vI < .01) discard; vec2 p = vUv - vec2(.5, .3); float sway = sin(time * 7. + vS * 30.) * .05 * vUv.y + sin(time * 17. + vS * 9.) * .02 * vUv.y; p.x -= sway;
        float w = mix(.3, .02, smoothstep(0., .72, p.y)) * (p.y < 0. ? sqrt(max(0., 1. - p.y * p.y / .06)) : 1.); float d = abs(p.x) / max(w, .001);
        float core = smoothstep(1., .2, d) * smoothstep(-.28, -.05, p.y) * smoothstep(.75, .25, p.y); float glow = exp(-length(p * vec2(2.2, 1.4)) * 4.) * .5;
        vec3 hot = mix(vC, vec3(1., .95, .8), smoothstep(.45, .05, d) * smoothstep(.45, .0, p.y)); vec3 c = hot * core * 2.2 + vC * glow;
        gl_FragColor = vec4(c * vI, 1.); }` }));
  P.flameMesh.frustumCulled = false; P.flameMesh.renderOrder = 5; scene.add(P.flameMesh);
  for (let i = 0; i < NFL; i++) P.flames.push({ i, k: 1, size: .2, col: new THREE.Color('#ffb05a'), x: 0, y: 0, z: 0 });
  return P;
}
// answer candles in an arc in front of the table (tighter on portrait screens so all four stay in view)
export function layoutCandles(P, aspect) { const portrait = aspect < 1; // portrait: outer candles step back and in so all four stay on a narrow phone screen
  const R = portrait ? [1.5, 1.95, 1.95, 1.5] : [2.45, 2.45, 2.45, 2.45], A = portrait ? [-1.02, -.42, .42, 1.02] : [-1.18, -.45, .45, 1.18];
  P.ans.forEach((C, i) => { C.g.position.set(Math.sin(A[i]) * R[i], 0, Math.cos(A[i]) * R[i] + (portrait ? .2 : 0)); }); P.portrait = portrait; }
const _c = new THREE.Color();
export function syncProps(P, t, st) { // st: { clockK (0..1 time left), clockOn, frost, ansFx[4] }
  P.flameU.time.value = t; P.mistU.time.value = t;
  let n = 0; const set = (x, y, z, col, k, size) => { const i = n++; P.fPos[i * 3] = x; P.fPos[i * 3 + 1] = y; P.fPos[i * 3 + 2] = z; P.fCol[i * 3] = col.r; P.fCol[i * 3 + 1] = col.g; P.fCol[i * 3 + 2] = col.b; P.fK[i * 2] = Number.isFinite(k) ? Math.max(0, k) : 0; P.fK[i * 2 + 1] = size; };
  for (let i = 0; i < 4; i++) { const C = P.ans[i]; const k = C.lit * (1 + C.flare * 2.2); _c.set(ANS_COL[i]).lerp(new THREE.Color('#fff0d0'), .25 + C.flare * .3);
    set(C.g.position.x, C.top + .02, C.g.position.z, _c, k, .26 + C.flare * .5); }
  const lit = Math.max(0, Math.min(12, st.clockK * 12)); const frost = st.frost || 0;
  for (let i = 0; i < 12; i++) { const c = P.clock[i]; const on = st.clockOn ? Math.max(0, Math.min(1, lit - i)) : 1; _c.set('#ffb35a').lerp(new THREE.Color('#9ad8ff'), frost); set(c.x, TABLE_Y + .25, c.z, _c, on * (st.clockHot && i === Math.floor(lit) ? 1.6 : 1), .11); }
  _c.set('#ffa040'); for (const c of P.floorC) set(c.x, c.y + .02, c.z, _c, .85, .15);
  const g = P.flameMesh.geometry; g.attributes.aPos.needsUpdate = true; g.attributes.aCol.needsUpdate = true; g.attributes.aK.needsUpdate = true;
}

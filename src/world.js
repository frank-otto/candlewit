// The séance rotunda: flagstone floor with a chalk rune circle, ashlar walls with pillars and moonlit arched windows, a stone DOME of
// ~240 instanced blocks (it blasts apart in the Spirit Storm and flies back together), the night sky + giant moon + stars beyond it,
// a moonbeam through the oculus, moonlight with shadows, a cool fill, fog and the grade shader.
import * as THREE from 'three';
import { stoneTex, moonTex, windowTex, softTex, smokeTex, circleTex, webTex } from './tex.js';
export const QUALITY = {
  low: { dpr: 1, shadows: false, bloom: .8, lights: 2, msaa: 0, stars: 700, motes: 120 },
  mid: { dpr: 1.25, shadows: true, shadowSize: 1024, bloom: 1, lights: 5, msaa: 4, stars: 1400, motes: 260 },
  high: { dpr: 1.6, shadows: true, shadowSize: 2048, bloom: 1, lights: 5, msaa: 4, stars: 2000, motes: 380 },
  ultra: { dpr: 2, shadows: true, shadowSize: 2048, bloom: 1, lights: 5, msaa: 4, stars: 2400, motes: 500 } };
export const ROOM = { R: 8, WH: 6 };
const fin = (v, d = 0) => Number.isFinite(v) ? v : d;
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
export function gradeShader() { return { uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vig: { value: .4 }, grain: { value: .026 }, lift: { value: new THREE.Vector3(.012, .004, .03) }, sat: { value: 1.08 }, flash: { value: 0 }, warm: { value: 0 }, frost: { value: 0 }, hurt: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float time, vig, grain, sat, flash, warm, frost, hurt; uniform vec3 lift;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 x = c.rgb; float l = dot(x, vec3(.299, .587, .114));
      x = mix(vec3(l), x, sat); x += lift * (1. - l); x = mix(x, x * vec3(1.05, .99, .93), smoothstep(.35, .9, l));
      x = mix(x, x * vec3(1.1, 1.0, .84) + vec3(.025, .012, 0.), warm);
      vec2 q = vUv - .5; float r2 = dot(q, q) * 2.2; float v = 1. - vig * smoothstep(.2, .85, r2); x *= v; x += flash * vec3(.2, .16, .1) * (1. - l);
      float fr = frost * smoothstep(.25, .95, r2 + (hash(floor(vUv * 160.)) - .5) * .12); x = mix(x, vec3(.62, .8, 1.) * (.5 + l), fr * .55);
      x = mix(x, x * vec3(1.15, .55, .6), hurt * smoothstep(.15, .9, r2));
      x += (hash(vUv * 900. + fract(time * 7.)) - .5) * grain * (1. - l * .6); gl_FragColor = vec4(x, c.a); }` }; }

export function createWorld(renderer) {
  const scene = new THREE.Scene(); const W = { scene, t: 0, flash: 0, warm: 0, frost: 0, hurt: 0, open: 0 };
  scene.fog = new THREE.FogExp2('#140f24', .028); scene.background = new THREE.Color('#07071a');
  const T = W.T = { wall: stoneTex(4, 3, 255, 27), floor: stoneTex(5, 5, 265, 22), dome: stoneTex(3, 3, 245, 25), moon: moonTex(), win: windowTex(), soft: softTex(), smoke: smokeTex(), circle: circleTex(), web: webTex() };
  W.soft = T.soft; W.smokeTex = T.smoke;
  T.wall.map.repeat.set(14, 2); T.wall.rough.repeat.set(14, 2); T.floor.map.repeat.set(5, 5); T.floor.rough.repeat.set(5, 5);
  // ---- sky dome, stars, moon (follow the camera; only visible through the oculus, the windows' glow, and when the dome is blown open)
  const skyU = { moonDir: { value: new THREE.Vector3(0, .5, -1).normalize() }, glow: { value: 1 } };
  W.sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec3 vD; uniform vec3 moonDir; uniform float glow; void main(){ float h = vD.y; vec3 top = vec3(.02, .025, .08), mid = vec3(.08, .05, .16), hor = vec3(.2, .1, .2);
      vec3 c = mix(hor, mid, smoothstep(-.02, .22, h)); c = mix(c, top, smoothstep(.2, .8, h)); float m = max(dot(vD, moonDir), 0.);
      c += vec3(.5, .48, .6) * pow(m, 60.) * .9 * glow + vec3(.22, .2, .34) * pow(m, 8.) * .45 * glow; gl_FragColor = vec4(c, 1.); }` }));
  W.sky.renderOrder = -10; W.sky.frustumCulled = false; scene.add(W.sky); W.skyU = skyU;
  { const n = 2400, p = new Float32Array(n * 3), s = new Float32Array(n); for (let i = 0; i < n; i++) { const u = hash(i) * 2 - 1, a = hash(i + 9e3) * 6.283, y = Math.abs(u) * .95 + .05, r = Math.sqrt(1 - y * y); p.set([Math.cos(a) * r * 470, y * 470, Math.sin(a) * r * 470], i * 3); s[i] = .6 + hash(i + 7e3) * 1.8; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('size', new THREE.BufferAttribute(s, 1));
    W.stars = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, map: { value: T.soft }, k: { value: 1 } }, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float size; uniform float time, k; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vA = .55 + .45 * sin(time * (1. + size) + position.x); gl_PointSize = size * 2.2 * k; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vec3(.85, .88, 1.) * 1.4, a * vA); }' }));
    W.stars.frustumCulled = false; W.stars.renderOrder = -9; scene.add(W.stars); }
  W.moonDir = new THREE.Vector3(0, .5, -1).normalize(); W.moonScale = 1;
  W.moon = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: T.moon, color: new THREE.Color(1.04, 1.0, .94), transparent: true, depthWrite: false, fog: false }));
  W.halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: T.soft, color: new THREE.Color(.5, .5, .72), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: .2 }));
  W.moon.renderOrder = -8; W.halo.renderOrder = -7; W.moon.frustumCulled = W.halo.frustumCulled = false; scene.add(W.moon, W.halo);
  // ---- lights
  W.hemi = new THREE.HemisphereLight('#6a70b8', '#1a0c14', .42); scene.add(W.hemi);
  W.key = new THREE.SpotLight('#b8c8ff', 60, 40, .42, .55, 1.6); W.key.position.set(.6, ROOM.WH + 8, -1.2); W.key.target.position.set(0, .8, .3); W.key.castShadow = true;
  W.key.shadow.bias = -.0004; W.key.shadow.normalBias = .02; W.key.shadow.camera.near = 4; W.key.shadow.camera.far = 30; scene.add(W.key, W.key.target);
  W.fill = new THREE.DirectionalLight('#7a6cc0', .35); W.fill.position.set(-4, 8, 8); scene.add(W.fill);
  W.moonL = new THREE.DirectionalLight('#c8d4ff', 0); W.moonL.position.set(0, 20, -14); scene.add(W.moonL); // strong cool light once the dome is gone
  // ---- floor
  const floorM = new THREE.MeshStandardMaterial({ map: T.floor.map, roughnessMap: T.floor.rough, roughness: .95, metalness: 0, color: '#8a8498' });
  W.floor = new THREE.Mesh(new THREE.CircleGeometry(ROOM.R, 64), floorM); W.floor.rotation.x = -Math.PI / 2; W.floor.receiveShadow = true; scene.add(W.floor);
  W.circleM = new THREE.MeshBasicMaterial({ color: new THREE.Color(.6, .5, 1.1), alphaMap: T.circle, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .4 });
  W.circle = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 7.6), W.circleM); W.circle.rotation.x = -Math.PI / 2; W.circle.position.y = .012; scene.add(W.circle);
  // ---- walls, pillars, windows, cornice
  const wallM = new THREE.MeshStandardMaterial({ map: T.wall.map, roughnessMap: T.wall.rough, roughness: 1, color: '#9a92a8', side: THREE.BackSide });
  W.wall = new THREE.Mesh(new THREE.CylinderGeometry(ROOM.R, ROOM.R, ROOM.WH, 64, 1, true), wallM); W.wall.position.y = ROOM.WH / 2; W.wall.receiveShadow = true; scene.add(W.wall);
  const pilM = new THREE.MeshStandardMaterial({ map: T.dome.map, roughness: .9, color: '#8a8296' }); W.pilM = pilM;
  const NP = 10; W.pillars = new THREE.InstancedMesh(new THREE.CylinderGeometry(.32, .38, ROOM.WH, 16), pilM, NP); W.caps = new THREE.InstancedMesh(new THREE.BoxGeometry(.95, .35, .95), pilM, NP * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1);
  W.winPos = [];
  for (let i = 0; i < NP; i++) { const a = (i + .5) / NP * Math.PI * 2, x = Math.sin(a) * (ROOM.R - .45), z = Math.cos(a) * (ROOM.R - .45); m4.compose(v.set(x, ROOM.WH / 2, z), q.identity(), s1); W.pillars.setMatrixAt(i, m4);
    m4.compose(v.set(x, .17, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a), s1); W.caps.setMatrixAt(i * 2, m4); m4.compose(v.set(x, ROOM.WH - .17, z), q, s1); W.caps.setMatrixAt(i * 2 + 1, m4);
    W.winPos.push(i / NP * Math.PI * 2); }
  W.pillars.castShadow = false; W.pillars.receiveShadow = true; scene.add(W.pillars, W.caps);
  const winM = new THREE.MeshBasicMaterial({ map: T.win, transparent: true, color: new THREE.Color(1.25, 1.25, 1.5), depthWrite: false, side: THREE.DoubleSide }); W.winM = winM;
  W.windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.9, 3.8), winM, NP);
  for (let i = 0; i < NP; i++) { const a = W.winPos[i]; m4.compose(v.set(Math.sin(a) * (ROOM.R - .04), 2.6, Math.cos(a) * (ROOM.R - .04)), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a + Math.PI), s1); W.windows.setMatrixAt(i, m4); }
  scene.add(W.windows);
  W.webs = []; const webM = new THREE.MeshBasicMaterial({ map: T.web, transparent: true, depthWrite: false, opacity: .5, side: THREE.DoubleSide });
  for (const [i, fl] of [[1, 0], [3, 1], [6, 0], [8, 1]]) { const a = (i + .5) / NP * Math.PI * 2 + (fl ? -.13 : .13); const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), webM); w.position.set(Math.sin(a) * (ROOM.R - .5), ROOM.WH - .75, Math.cos(a) * (ROOM.R - .5)); w.rotation.y = a + Math.PI; w.scale.x = fl ? -1 : 1; scene.add(w); W.webs.push(w); }
  W.cornice = new THREE.Mesh(new THREE.TorusGeometry(ROOM.R - .2, .22, 8, 96), pilM); W.cornice.rotation.x = Math.PI / 2; W.cornice.position.y = ROOM.WH; scene.add(W.cornice);
  // ---- the dome: instanced ashlar blocks on a hemisphere (they blast out and fly back)
  const domeM = new THREE.MeshStandardMaterial({ map: T.dome.map, roughnessMap: T.dome.rough, roughness: .95, color: '#8e86a0' }); W.domeM = domeM;
  const blocks = []; const RINGS = 9, PHI = 1.40; const DR = ROOM.R - .1;
  for (let j = 0; j < RINGS; j++) { const p0 = j / RINGS * PHI, p1 = (j + 1) / RINGS * PHI, pm = (p0 + p1) / 2, r = DR * Math.cos(pm), n = Math.max(7, Math.round(2 * Math.PI * r / 1.3)), arc = 2 * Math.PI * r / n;
    for (let i = 0; i < n; i++) { const a = (i + (j % 2) * .5) / n * Math.PI * 2; blocks.push({ j, a, pm, r, arc, h: DR * (p1 - p0), seed: blocks.length }); } }
  W.NB = blocks.length; W.blocks = blocks;
  W.dome = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), domeM, W.NB); W.dome.castShadow = false; W.dome.receiveShadow = true; W.dome.frustumCulled = false; scene.add(W.dome);
  for (const B of blocks) { const nx = Math.cos(B.pm) * Math.sin(B.a), ny = Math.sin(B.pm), nz = Math.cos(B.pm) * Math.cos(B.a); B.n = new THREE.Vector3(nx, ny, nz);
    B.p0 = new THREE.Vector3(nx * (DR + .22), ROOM.WH + ny * (DR + .22), nz * (DR + .22)); const t = new THREE.Vector3(Math.cos(B.a), 0, -Math.sin(B.a)); const b = new THREE.Vector3().crossVectors(B.n, t).normalize();
    B.q0 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, b, B.n)); B.s = new THREE.Vector3(B.arc * 1.04, B.h * 1.06, .46);
    const h = k => hash(B.seed * 3.17 + k * 11.3); B.v = B.n.clone().multiplyScalar(7 + h(1) * 9).add(new THREE.Vector3((h(2) - .5) * 4, 3 + h(3) * 7, (h(4) - .5) * 4)); B.ax = new THREE.Vector3(h(5) - .5, h(6) - .5, h(7) - .5).normalize(); B.w = (1 + h(8) * 4) * (h(9) < .5 ? -1 : 1); B.del = h(10) * .16 + (1 - B.j / RINGS) * .08; }
  W.domeTau = -1; setDome(W, 0);
  // the oculus beam: a soft additive cone from the moon down onto the table (fades when the sky is open)
  W.beamM = new THREE.ShaderMaterial({ uniforms: { k: { value: .55 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying float vY; varying vec3 vN, vV; void main(){ vY = uv.y; vec4 w = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-w.xyz); gl_Position = projectionMatrix * w; }',
    fragmentShader: 'uniform float k; varying float vY; varying vec3 vN, vV; void main(){ float f = pow(abs(dot(vN, vV)), 1.6); gl_FragColor = vec4(vec3(.55, .62, 1.) * f * k * (.15 + .85 * smoothstep(0., .9, vY)) * .22, 1.); }' });
  W.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.0, ROOM.WH + 8, 32, 1, true), W.beamM); W.beam.position.set(.3, (ROOM.WH + 8) / 2, -.6); W.beam.rotation.z = -.04; W.beam.renderOrder = 3; scene.add(W.beam);
  // dust motes drifting in the beam
  { const n = 500, p = new Float32Array(n * 3), s = new Float32Array(n); for (let i = 0; i < n; i++) { const a = hash(i + 50) * 6.283, r = Math.sqrt(hash(i + 60)) * 3.2; p.set([Math.cos(a) * r, hash(i + 70) * 6.5, Math.sin(a) * r], i * 3); s[i] = hash(i + 80); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('seed', new THREE.BufferAttribute(s, 1));
    W.motes = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, map: { value: T.soft }, scale: { value: 600 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float seed; uniform float time, scale; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y + time * (.05 + seed * .08), 6.5); p.x += sin(time * .3 + seed * 20.) * .3; p.z += cos(time * .25 + seed * 13.) * .3; vec4 mv = modelViewMatrix * vec4(p, 1.); vA = (.25 + .75 * fract(seed * 7.)) * smoothstep(0., .6, p.y) * smoothstep(6.5, 5., p.y); gl_PointSize = (.02 + .03 * seed) * scale / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vec3(.9, .85, 1.) * .9, a * vA * .7); }' }));
    W.motes.frustumCulled = false; scene.add(W.motes); }
  // env map for PBR reflections (sky + moon + a warm candle ring)
  { const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); const sk = W.sky.clone(); sk.material = W.sky.material; es.add(sk);
    const mo = new THREE.Mesh(new THREE.SphereGeometry(40, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 4.6) })); mo.position.copy(W.moonDir).multiplyScalar(400); es.add(mo);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(120, 18, 8, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, .7, .25) })); ring.rotation.x = Math.PI / 2; ring.position.y = -30; es.add(ring);
    W.env = pm.fromScene(es, .03).texture; pm.dispose(); mo.geometry.dispose(); mo.material.dispose(); ring.geometry.dispose(); ring.material.dispose(); scene.environment = W.env; scene.environmentIntensity = .5; }
  return W;
}
// dome state: tau = seconds into the blast (0 = intact). Block i is at p0 + v·t + ½g t² (t = tau − delay), spinning; far blocks are hidden.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function setDome(W, tau) { tau = Math.max(0, fin(tau)); if (Math.abs(tau - W.domeTau) < 1e-5) return; W.domeTau = tau;
  for (let i = 0; i < W.NB; i++) { const B = W.blocks[i]; const t = Math.max(0, tau - B.del);
    if (t <= 0) { _m.compose(B.p0, B.q0, B.s); W.dome.setMatrixAt(i, _m); continue; }
    _p.copy(B.p0).addScaledVector(B.v, t); _p.y -= 1.6 * t * t; _q.setFromAxisAngle(B.ax, B.w * t).premultiply(B.q0).normalize(); // spin about the block's own axis
    const far = t > 4.2 ? 0 : 1; _m.compose(_p, _q, _s.copy(B.s).multiplyScalar(far)); W.dome.setMatrixAt(i, _m); }
  W.dome.instanceMatrix.needsUpdate = true; W.open = Math.min(1, tau / .6); }
export function updateWorld(W, t, dt, q, cam) {
  W.t = t; W.flash = Math.max(0, fin(W.flash) - dt * 1.6); W.warm = Math.max(0, Math.min(1, fin(W.warm))); W.frost = Math.max(0, Math.min(1, fin(W.frost))); W.hurt = Math.max(0, fin(W.hurt) - dt * 1.4);
  W.sky.position.copy(cam.position); W.stars.position.copy(cam.position); W.stars.material.uniforms.time.value = t; W.skyU.moonDir.value.copy(W.moonDir);
  const md = 380, ms = 64 * fin(W.moonScale, 1); W.moon.position.copy(cam.position).addScaledVector(W.moonDir, md); W.moon.quaternion.copy(cam.quaternion); W.moon.scale.set(ms, ms, 1);
  W.halo.position.copy(cam.position).addScaledVector(W.moonDir, md + 2); W.halo.quaternion.copy(cam.quaternion); W.halo.scale.set(ms * 3.4, ms * 3.4, 1);
  W.motes.material.uniforms.time.value = t;
  const open = W.open; W.beamM.uniforms.k.value = .55 * (1 - open); W.moonL.intensity = 1.6 * open; W.hemi.intensity = .42 + .4 * open;
}
export function applyWorldQuality(W, q) { W.stars.geometry.setDrawRange(0, q.stars); W.motes.geometry.setDrawRange(0, q.motes); }

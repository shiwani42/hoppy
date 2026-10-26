// Hoppy — Daily run. A three.js prototype of the home-screen game:
// your character runs a 3D Indian street; healthy pickups fill your real gauges.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------- tuning ----------
const LANES = [-3, 0, 3];
const RUN_SECONDS = 60;
const BASE_SPEED = 13;
const MAX_SPEED = 21;
const BOOST = { jump: 1.15, speed: 1.1, shields: 1 }; // from today's protein, water, sleep (sample values)
const GRAVITY = -34;
const JUMP_V = 12.5 * BOOST.jump;
const SLIDE_TIME = 0.75;
const SEGMENT = 30;
const VIEW_AHEAD = 150;

const PAL = {
  sky: 0xdce8f2, road: 0xe9e5de, walk: 0xf3f0ea, ink: 0x0e0f0f,
  blue: 0x1f4fe0, orange: 0xf08a24, green: 0x3e9a4a, water: 0x3a8dde,
  skin: 0xb9825e, hair: 0x241a14, pants: 0x1d2333, shoe: 0xffffff,
  facades: [0xf7efe3, 0xeadfce, 0xdfe9e2, 0xf3dcc7, 0xe1e7f0, 0xf2e2d0, 0xe9d9e0],
  awnings: [0x0f6e6e, 0xe8a317, 0xc8553d, 0x1f4fe0, 0x3e9a4a],
  leaves: [0x8fb07a, 0x9fbe86, 0x7fa36b],
};

// ---------- renderer, scene, camera ----------
const canvas = document.getElementById('c');
const phone = document.getElementById('phone');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = skyTexture();
scene.fog = new THREE.Fog(PAL.sky, 45, VIEW_AHEAD - 10);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);

const hemi = new THREE.HemisphereLight(0xeef5ff, 0xd9cfbf, 1.25);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dd, 2.1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 26, bottom: -14, near: 1, far: 80 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

function resize() {
  const w = phone.clientWidth, h = phone.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- textures ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
function skyTexture() {
  return canvasTex(4, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#8fbbe6'); grd.addColorStop(0.55, '#cfe0ee'); grd.addColorStop(1, '#e8eff4');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
}
const roadTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#d9d3ca'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.035})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.fillStyle = '#ffffff';
  for (const x of [w / 3, (2 * w) / 3]) for (let y = 0; y < h; y += 128) g.fillRect(x - 5, y, 10, 64);
  g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
}, [1, 12]);
const walkTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#efe8dd'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 3;
  for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
}, [1, 40]);
const facadeTex = PAL.facades.map((col) => canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#' + col.toString(16).padStart(6, '0'); g.fillRect(0, 0, w, h);
  for (let y = 40; y < h - 120; y += 72) for (let x = 26; x < w - 40; x += 70) {
    g.fillStyle = 'rgba(40,60,80,.22)'; g.fillRect(x, y, 40, 44);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x, y, 40, 6);
  }
  g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(0, h - 120, w, 120);
}));
const stripeTex = canvasTex(128, 32, (g, w, h) => {
  for (let x = -h; x < w + h; x += 32) { g.fillStyle = (x / 32) % 2 ? '#ffffff' : '#f08a24'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x + 16 - h, h); g.lineTo(x - h, h); g.fill(); }
});
const glowTex = canvasTex(128, 128, (g, w) => {
  const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  grd.addColorStop(0, 'rgba(255,255,255,.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, w, w);
});

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });

// ---------- ground: road + sidewalks follow the runner, textures scroll ----------
const road = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 240), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 }));
road.rotation.x = -Math.PI / 2; road.receiveShadow = true; scene.add(road);
const walks = [-1, 1].map((s) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(5, 0.25, 240), new THREE.MeshStandardMaterial({ map: walkTex, roughness: 0.9 }));
  m.position.set(s * 7.3, 0.12, 0); m.receiveShadow = true; scene.add(m); return m;
});
const lawn = new THREE.Mesh(new THREE.PlaneGeometry(200, 260), mat(0xdfe8d6, { roughness: 1 }));
lawn.rotation.x = -Math.PI / 2; lawn.position.y = -0.02; lawn.receiveShadow = true; scene.add(lawn);

// ---------- scenery chunks (buildings, shops, trees, lamps), recycled ----------
const sceneryGroup = new THREE.Group(); scene.add(sceneryGroup);
const chunks = [];
const rnd = mulberry(7);
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

function building(side, z) {
  const g = new THREE.Group();
  const w = 6 + rnd() * 4, h = 5 + rnd() * 11, d = 7 + rnd() * 4;
  const ti = Math.floor(rnd() * facadeTex.length);
  const wall = mat(PAL.facades[ti], { roughness: 0.9 });
  const front = new THREE.MeshStandardMaterial({ map: facadeTex[ti], roughness: 0.9 });
  front.map = facadeTex[ti].clone(); front.map.needsUpdate = true; front.map.repeat.set(w / 7, h / 12);
  front.map.wrapS = front.map.wrapT = THREE.RepeatWrapping;
  const mats = side < 0 ? [front, wall, wall, wall, wall, wall] : [wall, front, wall, wall, wall, wall];
  const body = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), mats);
  body.position.set(0, h / 2, 0); body.castShadow = body.receiveShadow = true; g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(d + 0.3, 0.35, w + 0.3), mat(0xffffff, { roughness: 0.8 }));
  roof.position.y = h + 0.17; g.add(roof);
  // shopfront awning + sign band, facing the road
  const aw = pick(PAL.awnings);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.2, w * 0.85), mat(aw, { roughness: 0.6 }));
  awning.position.set(-side * (d / 2 + 0.7), 3.2, 0); awning.rotation.z = side * 0.18; awning.castShadow = true; g.add(awning);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, w * 0.6), mat(0xffffff, { roughness: 0.5 }));
  sign.position.set(-side * (d / 2 + 0.06), 4.1, 0); g.add(sign);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, w * 0.6), mat(aw));
  stripe.position.set(-side * (d / 2 + 0.07), 3.86, 0); g.add(stripe);
  g.position.set(side * (9.8 + d / 2), 0, z);
  return { g, len: w };
}
function tree(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 2.2, 8), mat(0x8a6a50));
  trunk.position.y = 1.1; trunk.castShadow = true; g.add(trunk);
  const leaves = mat(pick(PAL.leaves), { roughness: 0.9, flatShading: true });
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + rnd() * 0.4, 0), leaves);
    s.position.set((rnd() - 0.5) * 0.8, 2.6 + i * 0.35, (rnd() - 0.5) * 0.8); s.castShadow = true; g.add(s);
  }
  g.position.set(x, 0.25, z);
  return g;
}
function lamp(x, z, side) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.6, 8), mat(0x3a3f45, { roughness: 0.4, metalness: 0.4 }));
  pole.position.y = 2.3; pole.castShadow = true; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.08), pole.material);
  arm.position.set(-side * 0.5, 4.55, 0); g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.26), mat(0xffffff, { emissive: 0xfff3c4, emissiveIntensity: 0.4 }));
  head.position.set(-side * 1.0, 4.48, 0); g.add(head);
  g.position.set(x, 0.25, z);
  return g;
}
function makeChunk(z0) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    let z = z0;
    while (z > z0 - SEGMENT) { const b = building(side, z - 4); g.add(b.g); z -= b.len + 0.6 + rnd() * 2; }
    for (let z = z0 - 4; z > z0 - SEGMENT; z -= 9 + rnd() * 4) g.add(rnd() < 0.7 ? tree(side * 8.4, z) : lamp(side * 5.4, z, side));
  }
  sceneryGroup.add(g);
  chunks.push({ g, z0 });
}

// ---------- the runner ----------
const runner = new THREE.Group(); scene.add(runner);
const body = new THREE.Group(); runner.add(body);
const tee = mat(PAL.blue, { roughness: 0.55 }), skin = mat(PAL.skin, { roughness: 0.6 }), pantsM = mat(PAL.pants, { roughness: 0.7 }), shoeM = mat(PAL.shoe, { roughness: 0.4 });
function limb(r, len, m) { const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), m); mesh.castShadow = true; mesh.position.y = -len / 2 - r * 0.2; return mesh; }
const torso = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.9, 0.46, 4, 0.18), tee); torso.position.y = 1.45; torso.castShadow = true; body.add(torso);
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.18, 10), skin); neck.position.y = 1.98; body.add(neck);
const head = new THREE.Group(); head.position.y = 2.32; body.add(head);
const skull = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 18), skin); skull.castShadow = true; head.add(skull);
const hair = new THREE.Mesh(new THREE.SphereGeometry(0.335, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(PAL.hair, { roughness: 0.8 }));
hair.rotation.x = 0.55; head.add(hair); // covers the back of the head, which is what we see while running
const eyeM = mat(0x111111, { roughness: 0.3 });
for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), eyeM); e.position.set(s * 0.11, 0.02, -0.3); head.add(e); }
function joint(x, y, child) { const p = new THREE.Group(); p.position.set(x, y, 0); p.add(child); body.add(p); return p; }
const armL = joint(-0.5, 1.82, limb(0.11, 0.62, skin)), armR = joint(0.5, 1.82, limb(0.11, 0.62, skin));
for (const a of [armL, armR]) { const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.18, 6, 12), tee); sleeve.position.y = -0.1; a.add(sleeve); }
const legL = joint(-0.19, 1.02, limb(0.14, 0.72, pantsM)), legR = joint(0.19, 1.02, limb(0.14, 0.72, pantsM));
for (const l of [legL, legR]) { const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.16, 0.42, 3, 0.07), shoeM); shoe.position.set(0, -1.02, -0.06); shoe.castShadow = true; l.add(shoe); }
const shadowBlob = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12, depthWrite: false }));
shadowBlob.rotation.x = -Math.PI / 2; shadowBlob.position.y = 0.02; runner.add(shadowBlob);
const shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 20), new THREE.MeshStandardMaterial({ color: 0x8fb6ff, transparent: true, opacity: 0.07, roughness: 0.1, emissive: 0x3f6ee6, emissiveIntensity: 0.2, depthWrite: false }));
shieldBubble.position.y = 1.4; runner.add(shieldBubble);

// ---------- pickups & obstacles ----------
const things = []; // { kind, mesh, lane, z, ... }
// Pickups earn XP only. Real nutrients come from real logs, never from the game.
const PICKUPS = {
  protein: { color: PAL.orange, name: 'dal', xp: 10 },
  water: { color: PAL.water, name: 'water', xp: 8 },
  fiber: { color: PAL.green, name: 'fruit', xp: 8 },
};
const ringGeo = new THREE.RingGeometry(0.55, 0.75, 32);
function pickupMesh(kind) {
  const g = new THREE.Group();
  const spin = new THREE.Group(); g.add(spin);
  if (kind === 'protein') {
    const pts = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI * 0.5; pts.push(new THREE.Vector2(Math.sin(a) * 0.5 + 0.02, -Math.cos(a) * 0.32)); }
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mat(0xffffff, { roughness: 0.35, side: THREE.DoubleSide }));
    const dal = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.04, 28), mat(PAL.orange, { roughness: 0.5, emissive: PAL.orange, emissiveIntensity: 0.15 }));
    dal.position.y = -0.04; spin.add(bowl, dal);
  } else if (kind === 'water') {
    // teardrop: round at the bottom, tapering to a point at the top
    const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector2(Math.max(0.001, 0.4 * Math.sin(Math.PI * Math.pow(t, 0.7)) * (1 - 0.45 * t)), lerp(-0.42, 0.52, t))); }
    spin.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 28), new THREE.MeshPhysicalMaterial({ color: PAL.water, roughness: 0.08, metalness: 0, clearcoat: 1, emissive: 0x1a4f9a, emissiveIntensity: 0.25 })));
  } else {
    const apple = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 18), mat(0x7cbf4a, { roughness: 0.35, emissive: 0x2c6a1a, emissiveIntensity: 0.15 }));
    apple.scale.y = 0.92;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(PAL.green, { flatShading: true })); leaf.scale.set(1.4, 0.3, 0.7); leaf.position.set(0.12, 0.42, 0);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6), mat(0x6b4a35)); stem.position.y = 0.42;
    spin.add(apple, leaf, stem);
  }
  spin.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  const halo = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: PICKUPS[kind].color, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = -1.08; g.add(halo);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: PICKUPS[kind].color, transparent: true, opacity: 0.55, depthWrite: false }));
  glow.scale.set(1.8, 1.8, 1); g.add(glow);
  return { g, spin, halo };
}
function obstacleMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'barrier') {
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.18), new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.6 }));
    board.position.y = 0.75; board.castShadow = true; g.add(board);
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.5), mat(0x3a3f45)); leg.position.set(s * 1.0, 0.5, 0); leg.castShadow = true; g.add(leg); }
  } else if (kind === 'cart') {
    const base = new THREE.Mesh(new RoundedBoxGeometry(2.3, 1.2, 3.2, 3, 0.15), mat(0x0f6e6e, { roughness: 0.5 }));
    base.position.y = 1.1; base.castShadow = true; g.add(base);
    const top = new THREE.Mesh(new RoundedBoxGeometry(2.5, 0.16, 3.4, 2, 0.06), mat(0xe8a317, { roughness: 0.5 }));
    top.position.y = 2.75; top.castShadow = true; g.add(top);
    for (const s of [-1, 1]) for (const zz of [-1.1, 1.1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.05, 6), mat(0xffffff)); post.position.set(s * 1.05, 2.2, zz); g.add(post); }
    for (const s of [-1, 1]) for (const zz of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 16), mat(0x222222)); w.rotation.z = Math.PI / 2; w.position.set(s * 1.1, 0.33, zz); w.castShadow = true; g.add(w); }
    const fruit = mat(0xf08a24, { roughness: 0.5 });
    for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), fruit); f.position.set((i % 3 - 1) * 0.55, 1.82, i < 3 ? -0.5 : 0.5); g.add(f); }
  } else {
    for (const s of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.9, 8), mat(0x3a3f45)); pole.position.set(s * 1.3, 1.45, 0); pole.castShadow = true; g.add(pole); }
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.75, 0.06), mat(0xc8553d, { roughness: 0.8 }));
    cloth.position.y = 2.35; cloth.castShadow = true; g.add(cloth);
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.07), mat(0xffffff)); band.position.y = 2.35; g.add(band);
  }
  return g;
}
function spawnPickup(kind, lane, z, y = 1.15) {
  const m = pickupMesh(kind);
  m.g.position.set(LANES[lane], y, z); scene.add(m.g);
  things.push({ type: 'pickup', kind, lane, z, y, ...m, taken: false, t0: Math.random() * 6 });
}
function spawnObstacle(kind, lane, z) {
  const g = obstacleMesh(kind);
  g.position.set(LANES[lane], 0, z); scene.add(g);
  const box = { barrier: { h0: 0, h1: 1.0, d: 0.35 }, cart: { h0: 0, h1: 3.0, d: 1.7 }, banner: { h0: 1.95, h1: 2.8, d: 0.2 } }[kind];
  things.push({ type: 'obstacle', kind, lane, z, g, ...box, hit: false });
}
// Patterns: always leave a fair path; pickups reward the line you choose.
let nextSpawnZ = -30;
function spawnPattern(z) {
  const free = Math.floor(rnd() * 3);
  const kinds = ['protein', 'water', 'fiber'];
  const roll = rnd();
  if (roll < 0.28) {
    // carts in two lanes, pickups line in the free one
    for (let l = 0; l < 3; l++) if (l !== free) spawnObstacle('cart', l, z);
    for (let i = 0; i < 5; i++) spawnPickup(kinds[i % 3], free, z + 6 - i * 2.4);
  } else if (roll < 0.52) {
    // full-width barrier: jump it, pickups arc over the top
    for (let l = 0; l < 3; l++) spawnObstacle('barrier', l, z);
    for (let i = 0; i < 5; i++) spawnPickup(pick(kinds), free, z + 4 - i * 2, 1.4 + Math.sin((i / 4) * Math.PI) * 2.0);
  } else if (roll < 0.72) {
    // banner: slide under, or step around it
    spawnObstacle('banner', free, z);
    const other = (free + 1 + Math.floor(rnd() * 2)) % 3;
    spawnObstacle('cart', other, z - 8);
    for (let i = 0; i < 4; i++) spawnPickup(pick(kinds), free, z - 2 - i * 2.2, 0.8);
  } else {
    // open street, a zig-zag of pickups
    for (let i = 0; i < 7; i++) spawnPickup(kinds[Math.floor(i / 3) % 3], Math.abs(((i + free) % 4) - 2) % 3, z - i * 2.6);
  }
}

// ---------- state ----------
const S = {
  running: false, done: false, t: 0, z: 0, speed: 0, lane: 1, x: 0, y: 0, vy: 0, slide: 0, stumble: 0, shields: BOOST.shields,
  xp: 640, level: 7, protein: 34, water: 1.2, fiber: 14, got: { protein: 0, water: 0, fiber: 0 }, runXp: 0, hits: 0,
};
const TARGET = { protein: 60, water: 2.25, fiber: 30 };
for (let z = 10; z > -VIEW_AHEAD - SEGMENT; z -= SEGMENT) makeChunk(z);

// ---------- input ----------
function act(a) {
  if (!S.running) return;
  if (a === 'left') S.lane = Math.max(0, S.lane - 1);
  if (a === 'right') S.lane = Math.min(2, S.lane + 1);
  if (a === 'up' && S.y <= 0.001) { S.vy = JUMP_V; S.slide = 0; sfx('jump'); }
  if (a === 'down') { S.slide = SLIDE_TIME; if (S.y > 0) S.vy = Math.min(S.vy, -16); sfx('slide'); }
}
window.addEventListener('keydown', (e) => {
  const m = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', ' ': 'up' }[e.key];
  if (m) { e.preventDefault(); act(m); }
});
let touch = null;
canvas.addEventListener('pointerdown', (e) => { touch = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!touch) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y; touch = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return act('up');
  act(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');
});

// ---------- sound (tiny WebAudio blips) ----------
let ac = null;
function sfx(kind) {
  try {
    ac ??= new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain(), now = ac.currentTime;
    const f = { protein: [660, 990], water: [740, 1110], fiber: [620, 930], jump: [300, 520], slide: [400, 220], hit: [180, 90], level: [523, 1046] }[kind] ?? [440, 660];
    o.type = kind === 'hit' ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(f[0], now); o.frequency.exponentialRampToValueAtTime(f[1], now + 0.12);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(kind === 'hit' ? 0.25 : 0.12, now + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    o.connect(g).connect(ac.destination); o.start(now); o.stop(now + 0.25);
  } catch {}
}

// ---------- HUD ----------
const $ = (id) => document.getElementById(id);
let toastTimer = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); toastTimer = 1.6; }
function popAt(world, text, color) {
  const v = world.clone().project(camera);
  const el = document.createElement('div');
  el.className = 'pop'; el.textContent = text; el.style.color = color;
  el.style.left = ((v.x + 1) / 2) * phone.clientWidth + 'px'; el.style.top = ((1 - v.y) / 2) * phone.clientHeight + 'px';
  $('hud').appendChild(el);
  el.animate([{ opacity: 0, transform: 'translate(-50%,-30%) scale(.7)' }, { opacity: 1, transform: 'translate(-50%,-80%) scale(1)', offset: 0.25 }, { opacity: 0, transform: 'translate(-50%,-180%) scale(1)' }], { duration: 900, easing: 'ease-out' }).onfinish = () => el.remove();
}
function hud() {
  $('gBuild').textContent = Math.round(S.protein) + ' g'; $('bBuild').style.width = Math.min(100, (S.protein / TARGET.protein) * 100) + '%';
  $('gWater').textContent = S.water.toFixed(1) + ' L'; $('bWater').style.width = Math.min(100, (S.water / TARGET.water) * 100) + '%';
  $('gFiber').textContent = Math.round(S.fiber) + ' g'; $('bFiber').style.width = Math.min(100, (S.fiber / TARGET.fiber) * 100) + '%';
  const need = 1000 + (S.level - 7) * 200;
  $('lvl').textContent = 'Level ' + S.level; $('xp').textContent = Math.round(S.xp) + ' / ' + need + ' XP';
  $('xpRing').setAttribute('stroke-dashoffset', String(100.5 * (1 - S.xp / need)));
  const left = Math.max(0, RUN_SECONDS - S.t);
  $('timer').textContent = Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
}

// ---------- effects ----------
const bursts = [];
function burst(pos, color, big = false) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.32, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  m.position.copy(pos); m.lookAt(camera.position); scene.add(m);
  bursts.push({ m, t: 0, life: big ? 1.1 : 0.45, grow: big ? 9 : 3.2 });
}

// ---------- loop ----------
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const tt = clock.elapsedTime;
  if (S.running) step(dt);
  else idle(tt);
  // runner pose
  const sp = S.speed / BASE_SPEED;
  const phase = S.running ? S.z * -0.55 : tt * 2.2;
  const swing = S.running ? 0.95 : 0.08;
  const air = S.y > 0.02;
  legL.rotation.x = air ? -0.7 : Math.sin(phase) * swing;
  legR.rotation.x = air ? 0.35 : -Math.sin(phase) * swing;
  armL.rotation.x = air ? -2.4 : -Math.sin(phase) * swing * 0.9;
  armR.rotation.x = air ? -2.4 : Math.sin(phase) * swing * 0.9;
  armL.rotation.z = air ? -0.3 : -0.12; armR.rotation.z = air ? 0.3 : 0.12;
  const bob = S.running && !air ? Math.abs(Math.sin(phase)) * 0.12 : Math.sin(tt * 2.1) * 0.02;
  const slideK = S.slide > 0 ? Math.min(1, S.slide * 6, (SLIDE_TIME - S.slide + 0.05) * 8) : 0;
  body.position.y = bob - slideK * 0.6;
  body.rotation.x = -0.14 * Math.min(1, sp) * (S.running ? 1 : 0) + slideK * 0.55 - S.stumble * 0.5;
  head.rotation.x = -slideK * 0.9;
  runner.position.set(S.x, S.y, S.z);
  runner.rotation.z = (LANES[S.lane] - S.x) * -0.08;
  // running: facing up the street; waiting: turned to face you
  runner.rotation.y = S.running ? (LANES[S.lane] - S.x) * -0.06 : Math.PI + Math.sin(tt * 0.6) * 0.25;
  shadowBlob.position.y = 0.02 - S.y; shadowBlob.scale.setScalar(1 / (1 + S.y * 0.25));
  shieldBubble.visible = S.shields > 0 && S.running;
  shieldBubble.scale.setScalar(1 + Math.sin(tt * 3) * 0.03);
  // pickups spin & bob
  for (const th of things) if (th.type === 'pickup' && !th.taken) {
    th.spin.rotation.y = tt * 2.4 + th.t0;
    th.spin.position.y = Math.sin(tt * 2.6 + th.t0) * 0.12;
    th.halo.scale.setScalar(1 + Math.sin(tt * 3 + th.t0) * 0.08);
  }
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i]; b.t += dt; const p = b.t / b.life;
    b.m.scale.setScalar(1 + p * b.grow); b.m.material.opacity = 0.9 * (1 - p); b.m.lookAt(camera.position);
    if (p >= 1) { scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); bursts.splice(i, 1); }
  }
  // camera: behind and above, easing to the lane, a touch wider as speed rises
  const cx = S.x * 0.55;
  camera.position.lerp(tmp.set(cx, 4.4 + S.y * 0.35, S.z + 8.4), 1 - Math.pow(0.0005, dt));
  if (S.stumble > 0) camera.position.x += Math.sin(tt * 60) * 0.06 * S.stumble;
  camera.lookAt(cx * 1.2, 1.4 + S.y * 0.25, S.z - 7);
  camera.fov = 58 + Math.max(0, sp - 1) * 9; camera.updateProjectionMatrix();
  // ground and light follow the runner
  road.position.z = walks[0].position.z = walks[1].position.z = lawn.position.z = S.z - 80;
  roadTex.offset.y = -S.z / 20; walkTex.offset.y = -S.z / 6;
  sun.position.set(S.x + 10, 22, S.z + 12); sun.target.position.set(S.x, 0, S.z - 6);
  if (toastTimer > 0 && (toastTimer -= dt) <= 0) $('toast').classList.remove('on');
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
function idle(tt) {
  S.x = lerp(S.x, LANES[S.lane], 0.2);
  if (!S.done) { S.z = 0; S.speed = 0; }
}
function step(dt) {
  S.t += dt;
  if (S.t >= RUN_SECONDS) return finish();
  const ramp = lerp(BASE_SPEED, MAX_SPEED, Math.min(1, S.t / RUN_SECONDS)) * BOOST.speed;
  S.stumble = Math.max(0, S.stumble - dt / 1.6);
  S.speed = ramp * (1 - 0.55 * S.stumble);
  S.z -= S.speed * dt;
  S.x = lerp(S.x, LANES[S.lane], 1 - Math.pow(0.000002, dt));
  S.vy += GRAVITY * dt; S.y = Math.max(0, S.y + S.vy * dt); if (S.y === 0) S.vy = 0;
  S.slide = Math.max(0, S.slide - dt);
  // world streaming
  while (nextSpawnZ > S.z - VIEW_AHEAD) { spawnPattern(nextSpawnZ); nextSpawnZ -= 20 + rnd() * 8; }
  const last = chunks[chunks.length - 1];
  if (last.z0 - SEGMENT > S.z - VIEW_AHEAD - SEGMENT) makeChunk(last.z0 - SEGMENT);
  while (chunks.length && chunks[0].z0 - SEGMENT > S.z + 20) { const c = chunks.shift(); sceneryGroup.remove(c.g); dispose(c.g); }
  // collisions
  const height = S.slide > 0 ? 1.0 : 2.5;
  for (let i = things.length - 1; i >= 0; i--) {
    const th = things[i];
    if (th.z > S.z + 15) { scene.remove(th.g); dispose(th.g); things.splice(i, 1); continue; }
    const dz = Math.abs(th.z - S.z), sameLane = Math.abs(LANES[th.lane] - S.x) < 1.1;
    if (th.type === 'pickup' && !th.taken && dz < 0.9 && sameLane && Math.abs(th.y - (S.y + 1.2)) < 1.4) collect(th);
    if (th.type === 'obstacle' && !th.hit && dz < th.d + 0.45 && sameLane && S.y < th.h1 && S.y + height > th.h0) hit(th);
    // a bumped obstacle tips out of the way, so nothing passes through the camera
    if (th.type === 'obstacle' && th.hit) {
      th.knockT = (th.knockT ?? 0) + dt; const p = Math.min(1, th.knockT / 0.4), side = LANES[th.lane] >= 0 ? 1 : -1;
      th.g.rotation.z = side * p * 1.1; th.g.position.x = LANES[th.lane] + side * p * 3; th.g.scale.setScalar(Math.max(0.001, 1 - p));
    }
    if (th.type === 'pickup' && th.taken) {
      th.flyT += dt; const p = Math.min(1, th.flyT / 0.28);
      th.g.position.lerp(tmp.set(S.x, S.y + 1.6, S.z), p); th.g.scale.setScalar(1 - p * 0.8);
      if (p >= 1) { scene.remove(th.g); dispose(th.g); things.splice(i, 1); }
    }
  }
  hud();
}
function collect(th) {
  th.taken = true; th.flyT = 0;
  const P = PICKUPS[th.kind];
  S.got[th.kind]++; S.runXp += P.xp;
  S.xp += P.xp;
  const need = 1000 + (S.level - 7) * 200;
  if (S.xp >= need) { S.xp -= need; S.level++; toast(`Level ${S.level}! Your runner feels stronger 💪`); sfx('level'); burst(tmp.set(S.x, 1.4, S.z).clone(), PAL.blue, true); }
  popAt(th.g.position, '+' + P.xp + ' XP', '#' + P.color.toString(16).padStart(6, '0'));
  burst(th.g.position.clone(), P.color);
  sfx(th.kind);
}
function hit(th) {
  th.hit = true; S.hits++;
  if (S.shields > 0) { S.shields--; toast('Shield used — sleep well tonight for another'); burst(tmp.set(S.x, 1.4, S.z).clone(), 0x8fb6ff, true); sfx('slide'); return; }
  S.stumble = 1; S.lane = th.lane === 1 ? (rnd() < 0.5 ? 0 : 2) : 1;
  toast(pick(['Oops — shake it off!', 'Little stumble. Keep going!', 'All good, back on track']));
  sfx('hit');
}
function dispose(g) { g.traverse((m) => { if (m.isMesh || m.isSprite) { m.geometry?.dispose(); } }); }

function start() {
  for (const th of things) { scene.remove(th.g); dispose(th.g); } things.length = 0;
  Object.assign(S, { running: true, done: false, t: 0, z: 0, speed: 0, lane: 1, x: 0, y: 0, vy: 0, slide: 0, stumble: 0, shields: BOOST.shields, got: { protein: 0, water: 0, fiber: 0 }, runXp: 0, hits: 0 });
  nextSpawnZ = -34;
  $('start').classList.add('hidden'); $('end').classList.add('hidden');
  try { ac ??= new AudioContext(); ac.resume(); } catch {}
  hud();
}
function finish() {
  S.running = false; S.done = true;
  $('endTitle').textContent = 'Run complete';
  $('endSub').textContent = S.hits === 0 ? 'Not a single stumble. Shabaash!' : `${Math.round(-S.z)} m covered. Every run makes your runner stronger.`;
  // The run's reward, then one real-life nudge from today's actual gauges.
  const gaps = [
    { left: TARGET.protein - S.protein, text: (n) => `${Math.round(n)} g protein to go today — dal or paneer at dinner would do it` },
    { left: (TARGET.water - S.water) * 4, text: (n) => `${Math.ceil(n)} more glasses of water today` },
    { left: TARGET.fiber - S.fiber, text: (n) => `${Math.round(n)} g fibre to go — a bowl of sprouts or fruit` },
  ].filter((g) => g.left > 0).sort((a, b) => b.left - a.left);
  $('endList').innerHTML =
    `<li><i style="background:var(--blue)"></i>Run reward<em>+${S.runXp} XP</em></li>` +
    `<li><i style="background:var(--orange)"></i>Collected<em>${S.got.protein} dal · ${S.got.water} water · ${S.got.fiber} fruit</em></li>` +
    (gaps[0] ? `<li><i style="background:var(--green)"></i>${gaps[0].text(gaps[0].left)}</li>` : '');
  $('end').classList.remove('hidden');
}
function lerp(a, b, p) { return a + (b - a) * p; }

$('goBtn').onclick = start;
$('againBtn').onclick = start;
hud();
frame();
window.__hoppy = { S, act, start };

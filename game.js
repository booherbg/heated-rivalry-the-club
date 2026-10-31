// Heated Hockey: the puck's secret game. Pong on a zine page: you're one of the two neon guys, the phone plays the
// other, first to seven. The guys are the zine's drawing (art/the-club-zine.svg), the puck has a heart on it, and
// everything leaves rainbows.

// ---- the guys: one shape, facing right, forehead at x 300 (generated from the zine drawing); mirrored for the other
const GUY_SIL = 'M 196 150 C 238 128, 282 150, 292 196 C 298 218, 301 236, 299 254 C 298 268, 286 276, 279 288 C 284 304, 296 326, 298 342 C 299 349, 291 352, 284 351 C 278 351, 275 354, 276 359 C 278 364, 287 366, 285 372 C 283 376, 276 377, 276 380 C 277 384, 285 387, 282 393 C 279 398, 272 398, 271 404 C 272 410, 280 414, 276 422 C 268 434, 248 434, 236 440 C 234 462, 236 482, 240 498 C 252 522, 262 560, 264 650 L 26 650 C 26 610, 30 572, 44 548 C 70 506, 120 496, 150 474 C 154 456, 154 430, 148 398 C 136 366, 92 342, 86 292 C 78 214, 128 150, 196 150 Z';
const GUY_EYE = 'M 244 298 Q 257 308 271 299 M 250 304 L 246 311 M 258 306 L 257 313 M 265 304 L 267 311';
const GUY_EAR = 'M 170 290 C 150 290 148 332 172 338';
const GUY_HAIR = 'M 104 210 C 140 132 232 108 286 170 M 122 186 C 168 138 232 132 270 156 M 140 170 C 190 140 240 146 262 170';
const GUY_CURLS = 'M 198 130 a 10 10 0 1 0 -17.0 6.0 M 172 128 a 12 12 0 1 0 -20.4 7.2 M 146 136 a 14 14 0 1 0 -23.8 8.4 M 116 150 a 10 10 0 1 0 -17.0 6.0 M 96 170 a 12 12 0 1 0 -20.4 7.2 M 84 194 a 14 14 0 1 0 -23.8 8.4 M 72 220 a 10 10 0 1 0 -17.0 6.0 M 72 248 a 12 12 0 1 0 -20.4 7.2 M 78 276 a 14 14 0 1 0 -23.8 8.4 M 82 302 a 10 10 0 1 0 -17.0 6.0 M 186 148 a 12 12 0 1 0 -20.4 7.2 M 158 150 a 14 14 0 1 0 -23.8 8.4 M 126 166 a 10 10 0 1 0 -17.0 6.0';
const SIL = new Path2D(GUY_SIL), EYE = new Path2D(GUY_EYE), EAR = new Path2D(GUY_EAR);
const HAIR = new Path2D(GUY_HAIR), CURLS = new Path2D(GUY_CURLS);
const HEART = new Path2D('M 0 -3 C 0 -9 -8 -12 -11 -6 C -14 0 -6 5 0 10 C 6 5 14 0 11 -6 C 8 -12 0 -9 0 -3 Z');

const PINK = '#ff2a8f', BLUE = '#2f55ff', INK = '#141016', PAPER = '#f1ece2', TAPE = '#e8dcc0';
const RAINBOW = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'];
const WHO = {
  shane: { name: 'HOLLANDER', first: 'Shane', color: PINK, core: '#ffd0e8', hair: HAIR },
  ilya: { name: 'ROZANOV', first: 'Ilya', color: BLUE, core: '#d6deff', hair: CURLS },
};
const TO_WIN = 7;

const $ = id => document.getElementById(id);
const cv = $('rink'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, S = .25, frontL = 0, frontR = 0, R = 9;
let dots = null, grain = null;

// ---- a seeded random, so the ransom letters hold still from frame to frame ----
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- textures: halftone dots and xerox grain, drawn once ----
function textures() {
  const d = document.createElement('canvas'); d.width = d.height = 8;
  const dc = d.getContext('2d'); dc.fillStyle = PAPER; dc.beginPath(); dc.arc(4, 4, 1.5, 0, 7); dc.fill();
  dots = ctx.createPattern(d, 'repeat');
  const g = document.createElement('canvas'); g.width = g.height = 160;
  const gc = g.getContext('2d'), img = gc.createImageData(160, 160), r = rng(4);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() < .5 ? 0 : 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = r() * 26;
  }
  gc.putImageData(img, 0, 0);
  grain = ctx.createPattern(g, 'repeat');
}

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  S = Math.min(W * .2 / 275, H * .27 / 500);
  frontL = 6 + 274 * S; frontR = W - frontL;
  R = Math.max(8, Math.min(W, H) * .024);
  textures();
  for (const g of guys) g.y = Math.min(Math.max(g.y || H / 2, minY()), maxY());
}
const BUNT = () => Math.max(16, Math.min(W, H) / 18);  // the bunting's flag size
const HALF = () => 155 * S;                 // half the head's height: the part that hits
const minY = () => 155 * S + BUNT() + 46;  // keep the head clear of the score
const maxY = () => H - 155 * S - 6;

// ---- state ----
let me = 'shane', them = 'ilya';
const guys = [{ side: 'L', y: 0, blink: 0, blush: 0 }, { side: 'R', y: 0, blink: 0, blush: 0 }];
const puck = { x: 0, y: 0, vx: 0, vy: 0, wobble: 0, spin: 0 };
let score = [0, 0], phase = 'pick', phaseT = 0, serveTo = 1, rally = 0, kissed = false, base = 300;
let trail = [], parts = [], calls = [], loon = null, nextLoon = 10, flash = 0, time = 0, targetY = null, cpuErr = 0, flagT = 0;
const keys = {};

// ---- the ransom-note letters ----
const FONTS = ['Georgia, "Times New Roman", serif', 'Impact, "Arial Black", "Avenir Next Condensed", sans-serif',
  '"Courier New", monospace', '"Arial Black", "Avenir Next", sans-serif', '"Times New Roman", serif',
  'Futura, "Avenir Next", sans-serif', '"American Typewriter", "Courier New", monospace'];
const STYLES = [[INK, PAPER], [PINK, INK], ['#cfc8bb', INK], [BLUE, PAPER], [PAPER, INK], [INK, PINK], ['#f6e05e', INK],
  ['#008026', PAPER], ['#ff8c00', INK], ['#732982', PAPER]];
function ransom(text, cx, cy, size, seed) {
  const r = rng(seed * 7919 + text.length * 31), boxes = [];
  let total = 0;
  [...text].forEach((ch, i) => {
    if (ch === ' ') { boxes.push(null); total += size * .4; return; }
    const b = { ch, w: size * (.72 + r() * .26), h: size * (1.02 + r() * .22), rot: (r() - .5) * .3, dy: (r() - .5) * size * .2,
      st: STYLES[(i + seed) % STYLES.length], f: FONTS[(i * 5 + seed) % FONTS.length], gap: size * (.05 + r() * .1) };
    boxes.push(b); total += b.w + b.gap;
  });
  let x = cx - total / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const b of boxes) {
    if (!b) { x += size * .4; continue; }
    ctx.save();
    ctx.translate(x + b.w / 2, cy + b.dy); ctx.rotate(b.rot);
    ctx.fillStyle = b.st[0]; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.fillStyle = b.st[1]; ctx.font = `900 ${size * .78}px ${b.f}`;
    ctx.fillText(b.ch, 0, size * .05);
    ctx.restore();
    x += b.w + b.gap;
  }
}
function call(text, sub, dur = 1.4, size = 0) {
  // one line if it fits at a readable size, else two, split at the space nearest the middle
  let lines = [text];
  const fit = t => Math.min(64, (W * .9) / (t.length * .98 + .5));
  if (text.includes(' ') && fit(text) < 34) {
    const mid = text.length / 2; let best = -1;
    [...text].forEach((ch, i) => { if (ch === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i; });
    lines = [text.slice(0, best), text.slice(best + 1)];
  }
  const sz = size || Math.min(...lines.map(fit));
  calls.push({ text, lines, sub, t: 0, dur, size: Math.min(sz, size || 64) });
}

// ---- particles: hearts, rainbow confetti, feathers ----
function burst(x, y, n, kind, dir = 0) {
  for (let i = 0; i < n; i++) {
    const a = dir ? (dir > 0 ? 0 : Math.PI) + (Math.random() - .5) * 2.4 : Math.random() * Math.PI * 2, v = 80 + Math.random() * 320;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 1.2 + Math.random(), age: 0, kind,
      c: kind === 'heart' ? (Math.random() < .5 ? PINK : RAINBOW[i % 6]) : kind === 'feather' ? (i % 3 ? INK : PAPER) : RAINBOW[i % 6],
      s: kind === 'heart' ? .7 + Math.random() * .9 : 3 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - .5) * 10 });
  }
}
function rainHearts(n) {
  for (let i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: -20 - Math.random() * H * .5, vx: (Math.random() - .5) * 40, vy: 60 + Math.random() * 90,
    life: 4, age: 0, kind: 'heart', c: i % 2 ? PINK : RAINBOW[i % 6], s: .8 + Math.random(), rot: 0, vr: (Math.random() - .5) * 3, float: true });
}

// ---- the game ----
function startMatch(who) {
  me = who; them = who === 'shane' ? 'ilya' : 'shane';
  score = [0, 0]; serveTo = Math.random() < .5 ? 0 : 1;
  for (const g of guys) { g.y = H / 2; g.blink = 0; g.blush = 0; }
  parts = []; calls = []; loon = null; nextLoon = 8 + Math.random() * 6;
  $('pick').hidden = true; $('over').hidden = true;
  serve();
  call('FACE OFF', `${WHO[me].name} vs ${WHO[them].name}`, 1.6);
}
function serve() {
  phase = 'serve'; phaseT = 0; rally = 0; kissed = false; trail = [];
  puck.x = W / 2; puck.y = H / 2; puck.vx = puck.vy = 0; puck.wobble = 0;
  base = Math.max(240, (frontR - frontL) * .62 + 110);
  cpuErr = (Math.random() - .5) * 2 * HALF() * 1.1;
}
function launch() {
  phase = 'play';
  const a = (Math.random() - .5) * .9;
  puck.vx = Math.cos(a) * base * (serveTo === 0 ? -1 : 1);
  puck.vy = Math.sin(a) * base;
}
function goal(scorer) {
  score[scorer]++;
  phase = 'goal'; phaseT = 0; flash = .6; flagT = 1.6;
  const name = WHO[scorer === 0 ? me : them].name;
  const subs = ['HEATED!', 'LOVE WINS', 'NO PENALTY BOX!', 'ALL THE THINGS SHE SAID', 'SLAY', 'ICONIC', 'PRIDE TAPE: ON',
    'RIVALRY: HEATED', 'GOAL, BABY', 'MOTHER IS MOTHERING'];
  call(`${name} SCORES`, subs[(score[0] + score[1] * 3) % subs.length], 1.6);
  burst(scorer === 0 ? W - 10 : 10, puck.y, 70, 'confetti', scorer === 0 ? -1 : 1);
  burst(scorer === 0 ? W - 10 : 10, puck.y, 16, 'heart', scorer === 0 ? -1 : 1);
  serveTo = scorer === 0 ? 1 : 0;
  if (score[scorer] >= TO_WIN) { setTimeout(() => over(scorer === 0), 1500); phase = 'done'; }
}
function over(won) {
  $('overTitle').innerHTML = ''; $('overTitle').appendChild(ransomDom(won ? 'TO THE COTTAGE' : 'STILL HEATED', 3));
  $('overSub').textContent = won
    ? `You win, ${WHO[me].first}. ${score[0]} to ${score[1]}. Somewhere, a loon is calling.`
    : `${WHO[them].first} takes it, ${score[1]} to ${score[0]}. Rematch? You know you want to.`;
  $('over').hidden = false;
  if (won) rainHearts(60);
}

function hitGuy(g, i) {
  const half = HALF();
  if (puck.y < g.y - half - R || puck.y > g.y + half + R) return false;
  const rel = Math.max(-1, Math.min(1, (puck.y - g.y) / half));
  const speed = Math.min(Math.hypot(puck.vx, puck.vy) * 1.05, base * 2.4);
  const a = rel * 1.0;  // up to about 57 degrees
  puck.vx = Math.cos(a) * speed * (i === 0 ? 1 : -1);
  puck.vy = Math.sin(a) * speed;
  puck.x = i === 0 ? frontL + R : frontR - R;
  puck.spin = rel * 8;
  g.blink = .35; rally++;
  burst(puck.x, puck.y, 8, 'confetti', i === 0 ? 1 : -1);
  if (rally % 4 === 0 && rally < 9) {
    const other = WHO[i === 0 ? them : me];
    const lines = ['OOOH', 'THE GAYS ARE FIGHTING', 'SO HEATED', `EYES UP, ${other.name}`, 'TOO CLOSE', 'SERVE', 'CHIRP!', 'YAAAS'];
    call(lines[(rally / 4 + score[0] + score[1]) % lines.length], '', .9, Math.min(W / 12, 34));
  }
  if (rally >= 9 && !kissed) {
    kissed = true; call('KISS CAM', 'the whole arena is screaming', 2.4);
    rainHearts(40); for (const gg of guys) gg.blush = 3;
  }
  if (i === 0) cpuErr = (Math.random() - .5) * 2 * HALF() * Math.max(.45, 1.15 - score[0] * .08);
  return true;
}

function update(dt) {
  time += dt; phaseT += dt; flash = Math.max(0, flash - dt); flagT = Math.max(0, flagT - dt);
  // you: follow the finger, or the keys
  const g0 = guys[0], g1 = guys[1];
  if (keys.up) targetY = (targetY ?? g0.y) - 900 * dt;
  if (keys.down) targetY = (targetY ?? g0.y) + 900 * dt;
  if (targetY != null) { targetY = Math.max(minY(), Math.min(maxY(), targetY)); g0.y += (targetY - g0.y) * Math.min(1, dt * 22); }
  // them: chase where the puck will be, a little wrong, faster as you pull ahead
  let aim = H / 2;
  if (phase === 'play' && puck.vx > 0) {
    const t = (frontR - puck.x) / puck.vx;
    let y = puck.y + puck.vy * t;
    const span = H - 2 * R; y -= R; y = ((y % (2 * span)) + 2 * span) % (2 * span); y = (y > span ? 2 * span - y : y) + R;
    aim = y + cpuErr;
  }
  const cpuSpeed = H * (.62 + score[0] * .06);
  g1.y += Math.max(-cpuSpeed * dt, Math.min(cpuSpeed * dt, aim - g1.y));
  g1.y = Math.max(minY(), Math.min(maxY(), g1.y));
  for (const g of guys) { g.blink = Math.max(0, g.blink - dt); g.blush = Math.max(0, g.blush - dt); }

  if (phase === 'serve' && phaseT > 1.1) launch();
  if (phase === 'goal' && phaseT > 1.4) serve();
  if (phase === 'play') {
    puck.x += puck.vx * dt; puck.y += puck.vy * dt;
    if (puck.wobble > 0) { puck.wobble -= dt; puck.vy += Math.cos(time * 13) * 1100 * dt; }
    puck.spin *= Math.pow(.6, dt);
    if (puck.y < R) { puck.y = R; puck.vy = Math.abs(puck.vy); }
    if (puck.y > H - R) { puck.y = H - R; puck.vy = -Math.abs(puck.vy); }
    if (puck.vx < 0 && puck.x - R <= frontL && puck.x > frontL - 40 * S) hitGuy(g0, 0);
    if (puck.vx > 0 && puck.x + R >= frontR && puck.x < frontR + 40 * S) hitGuy(g1, 1);
    if (puck.x < -R * 2) goal(1);
    else if (puck.x > W + R * 2) goal(0);
    trail.push({ x: puck.x, y: puck.y }); if (trail.length > 26) trail.shift();
    // the wolf bird
    nextLoon -= dt;
    if (!loon && nextLoon <= 0) {
      const dir = Math.random() < .5 ? 1 : -1;
      loon = { x: dir > 0 ? -60 : W + 60, y: H * (.25 + Math.random() * .5), dir, t: 0, hit: false, vy: 0 };
    }
  }
  if (loon) {
    loon.t += dt;
    if (!loon.hit) {
      loon.x += loon.dir * Math.max(70, W * .16) * dt;
      const ly = loon.y + Math.sin(loon.t * 3) * 10, s = Math.max(.7, S * 3.2);
      const dx = (puck.x - loon.x) / (34 * s), dy = (puck.y - ly) / (18 * s);
      if (phase === 'play' && dx * dx + dy * dy < 1.4) {
        loon.hit = true; loon.vy = -200;
        puck.wobble = 3.2; puck.vx *= 1.12;
        call('STUPID CANADIAN', 'WOLF BIRD', 2.0);
        burst(loon.x, ly, 26, 'feather'); burst(loon.x, ly, 30, 'confetti');
      }
    } else { loon.vy += 900 * dt; loon.y += loon.vy * dt; loon.x += loon.dir * 60 * dt; }
    if (loon.x < -120 || loon.x > W + 120 || loon.y > H + 120) { loon = null; nextLoon = 12 + Math.random() * 10; }
  }
  for (const p of parts) {
    p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (!p.float) { p.vy += 520 * dt; p.vx *= Math.pow(.5, dt); }
  }
  parts = parts.filter(p => p.age < p.life && p.y < H + 40);
  for (const c of calls) c.t += dt;
  calls = calls.filter(c => c.t < c.dur);
}

// ---- drawing ----
function drawRink() {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  // the sunburst, turning slowly, pink and blue
  const cx = W / 2, cy = H / 2, n = 24, Rr = Math.hypot(W, H);
  for (let k = 0; k < n; k++) {
    const a0 = time * .05 + (k / n) * Math.PI * 2, a1 = a0 + Math.PI / n;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * Rr, cy + Math.sin(a0) * Rr); ctx.lineTo(cx + Math.cos(a1) * Rr, cy + Math.sin(a1) * Rr);
    ctx.closePath(); ctx.fillStyle = k % 2 ? 'rgba(47,85,255,.13)' : 'rgba(255,42,143,.13)'; ctx.fill();
  }
  // a rainbow over center ice, breathing
  const rb = Math.min(W, H) * (.36 + Math.sin(time * 1.3) * .015), band = Math.min(W, H) * .028;
  ctx.lineWidth = band;
  RAINBOW.forEach((c, i) => { ctx.strokeStyle = c; ctx.globalAlpha = .32; ctx.beginPath(); ctx.arc(cx, cy + rb * .55, rb - i * band, Math.PI, 0); ctx.stroke(); });
  ctx.globalAlpha = 1;
  // center ice: a circle and a heart, and a dashed line of tape
  ctx.strokeStyle = 'rgba(20,16,22,.5)'; ctx.lineWidth = 3; ctx.setLineDash([10, 9]);
  ctx.beginPath(); ctx.arc(cx, cy, Math.min(W, H) * .14, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(2.2, 2.2); ctx.fillStyle = 'rgba(255,42,143,.35)'; ctx.fill(HEART); ctx.restore();
  // the center line is Pride Tape: the rainbow stick tape real players wear
  for (let y = 10, i = 0; y < H; y += 40, i++) {
    ctx.save(); ctx.translate(cx, y); ctx.rotate((i % 3 - 1) * .06); ctx.globalAlpha = .8;
    for (let k = 0; k < 6; k++) { ctx.fillStyle = RAINBOW[k]; ctx.fillRect(-7, k * 4.2, 14, 4.2); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // rainbow bunting along the boards
  const flagW = BUNT();
  for (const top of [true, false]) {
    for (let x = 0, i = 0; x < W + flagW; x += flagW, i++) {
      const y0 = top ? 0 : H, d = top ? 1 : -1, sway = Math.sin(time * 2 + i) * 2;
      ctx.fillStyle = RAINBOW[i % 6];
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + flagW, y0); ctx.lineTo(x + flagW / 2 + sway, y0 + d * flagW * .9); ctx.closePath(); ctx.fill();
    }
  }
  // light off the disco ball, drifting over the ice
  for (let i = 0; i < 26; i++) {
    const a = time * (.3 + (i % 5) * .07) + i * 2.4, rr = Math.min(W, H) * (.15 + (i * 37 % 100) / 100 * .5);
    ctx.fillStyle = RAINBOW[i % 6]; ctx.globalAlpha = .38;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr * (W > H ? 1.4 : .9), cy + Math.sin(a * 1.3) * rr, 3 + (i % 3), 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawDisco() {
  const r = Math.max(12, Math.min(W, H) * .032), x = W / 2, y = BUNT() * .9 + Math.max(26, Math.min(W, H) * .07) * .75;
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - r); ctx.stroke();
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#b9b3c4'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.clip();
  const n = 6;
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const shade = (Math.sin(i * 1.7 + j * 2.3 + time * 4) + 1) / 2;
    ctx.fillStyle = shade > .82 ? RAINBOW[(i + j + 60 + Math.floor(time * 3)) % 6] : `rgba(255,255,255,${.15 + shade * .5})`;
    ctx.fillRect(i * r / 3.2 + ((time * 6) % (r / 3.2)), j * r / 3.2, r / 3.6, r / 3.6);
  }
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
}
function drawFlag() {
  // the pride flag, waving across the ice after a goal
  if (flagT <= 0) return;
  const k = flagT / 1.6, w = W * .8, h = Math.min(H * .3, w * .6), x0 = W / 2 - w / 2 + (1 - k) * W * .1, y0 = H * .52;
  ctx.globalAlpha = Math.min(1, flagT * 2) * .8;
  const cols = 40, sh = h / 6;
  for (let c = 0; c < cols; c++) {
    const x = x0 + (c / cols) * w, wave = Math.sin(c * .35 - time * 9) * h * .08;
    RAINBOW.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(x, y0 + i * sh + wave, w / cols + 1, sh + 1); });
  }
  ctx.globalAlpha = 1;
}
function drawGuy(g, who) {
  const w = WHO[who], s = S;
  ctx.save();
  if (g.side === 'L') { ctx.translate(frontL - 300 * s, g.y - 285 * s); ctx.scale(s, s); }
  else { ctx.translate(frontR + 300 * s, g.y - 285 * s); ctx.scale(-s, s); }
  ctx.beginPath(); ctx.rect(-50, 90, 700, 520); ctx.clip();  // head and shoulders
  // the riso print: color, then halftone, a little off register
  ctx.save(); ctx.translate(-5, 4); ctx.globalAlpha = .9; ctx.fillStyle = w.color; ctx.fill(SIL);
  ctx.globalAlpha = .45; ctx.fillStyle = dots; ctx.fill(SIL); ctx.restore();
  // the neon tube around it
  ctx.lineJoin = ctx.lineCap = 'round';
  const neon = g.blush > 0 ? `hsl(${(time * 300 + (g.side === 'L' ? 0 : 180)) % 360} 95% 58%)` : w.color;
  ctx.shadowColor = neon; ctx.shadowBlur = (g.blush > 0 ? 26 : 16) * DPR;
  ctx.strokeStyle = neon; ctx.lineWidth = (g.blush > 0 ? 5.5 : 4) / s; ctx.stroke(SIL);
  ctx.shadowBlur = 0; ctx.strokeStyle = w.core; ctx.lineWidth = 1.5 / s; ctx.stroke(SIL);
  // ink: eye (open for a moment when he hits it), ear, hair or curls
  ctx.strokeStyle = INK; ctx.lineWidth = 2.8 / s;
  if (g.blink > 0) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(258, 300, 9, 0, 7); ctx.fill(); ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(261, 297, 3, 0, 7); ctx.fill(); }
  else ctx.stroke(EYE);
  ctx.stroke(EAR); ctx.lineWidth = 3.4 / s; ctx.stroke(w.hair);
  if (g.blush > 0) { ctx.globalAlpha = Math.min(1, g.blush) * .7; ctx.fillStyle = '#ff5fae'; ctx.beginPath(); ctx.ellipse(236, 352, 22, 13, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
}
function drawPuck() {
  // the rainbow behind it
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], b = trail[i], k = i / trail.length;
    ctx.strokeStyle = `hsl(${(time * 240 + i * 16) % 360} 95% 55%)`; ctx.globalAlpha = k * .9;
    ctx.lineWidth = R * 1.7 * k * (puck.wobble > 0 ? 1.6 : 1); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(puck.x, puck.y);
  if (puck.wobble > 0) { ctx.lineWidth = 3; ctx.strokeStyle = `hsl(${(time * 600) % 360} 95% 55%)`; ctx.beginPath(); ctx.arc(0, 0, R * 1.6, 0, 7); ctx.stroke(); }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(0, R * .25, R, R * .78, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a2430'; ctx.beginPath(); ctx.ellipse(0, 0, R, R * .72, 0, 0, 7); ctx.fill();
  ctx.rotate(puck.spin * time * .2); ctx.scale(R / 16, R / 22); ctx.fillStyle = `hsl(${(time * 200) % 360} 95% 60%)`; ctx.fill(HEART);
  ctx.restore();
}
function drawLoon() {
  if (!loon) return;
  const s = Math.max(.7, S * 3.2), y = loon.hit ? loon.y : loon.y + Math.sin(loon.t * 3) * 10;
  ctx.save(); ctx.translate(loon.x, y); ctx.scale(loon.dir * s, s);
  if (loon.hit) ctx.rotate(loon.t * 9);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 12, 0, 0, 7); ctx.fill();             // body
  ctx.beginPath(); ctx.moveTo(-28, -2); ctx.lineTo(-40, -8); ctx.lineTo(-36, 4); ctx.fill();  // tail
  ctx.beginPath(); ctx.ellipse(22, -12, 7, 10, -.5, 0, 7); ctx.fill();         // neck
  ctx.beginPath(); ctx.arc(30, -20, 8, 0, 7); ctx.fill();                       // head
  ctx.fillStyle = '#3a3440'; ctx.beginPath(); ctx.moveTo(36, -22); ctx.lineTo(52, -18); ctx.lineTo(36, -16); ctx.fill();  // beak
  ctx.fillStyle = '#e40303'; ctx.beginPath(); ctx.arc(32, -22, 2.2, 0, 7); ctx.fill();   // the red eye
  ctx.fillStyle = PAPER;                                                        // the checkered back, the necklace
  for (let i = -3; i <= 2; i++) for (let j = 0; j < 2; j++) ctx.fillRect(i * 7 - 2 + j * 3, -7 + j * 5, 3, 3);
  ctx.fillRect(18, -14, 8, 2); ctx.fillRect(19, -10, 8, 2);
  // the wing, flapping
  ctx.fillStyle = INK; ctx.save(); ctx.translate(-2, -4); ctx.rotate(Math.sin(loon.t * 14) * .7 - .3);
  ctx.beginPath(); ctx.ellipse(0, -10, 8, 18, .3, 0, 7); ctx.fill(); ctx.restore();
  ctx.restore();
  if (!loon.hit) {
    ctx.font = `700 ${Math.max(11, 13 * s * .8)}px "Courier New", monospace`; ctx.fillStyle = INK; ctx.textAlign = 'center';
    ctx.fillText('a wolf bird?', loon.x, y + 34 * s);
  }
}
function drawParts() {
  for (const p of parts) {
    const fade = 1 - p.age / p.life;
    ctx.globalAlpha = Math.max(0, Math.min(1, fade * 1.5));
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
    if (p.kind === 'heart') { ctx.scale(p.s, p.s); ctx.fill(HEART); }
    else if (p.kind === 'feather') { ctx.beginPath(); ctx.ellipse(0, 0, p.s * 1.6, p.s * .5, 0, 0, 7); ctx.fill(); }
    else ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawHud() {
  const size = Math.max(26, Math.min(W, H) * .07), top = BUNT() * .9 + size * .75;
  ransom(String(score[0]), W / 2 - size * 1.7, top, size, 2);
  ransom(String(score[1]), W / 2 + size * 1.7, top, size, 5);
  ctx.font = `700 ${Math.max(11, size * .36)}px "Courier New", monospace`; ctx.fillStyle = INK; ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillText(`${WHO[me].name} (you)`, 10, top);
  ctx.textAlign = 'right'; ctx.fillText(WHO[them].name, W - 10, top);
  ctx.textAlign = 'center';
  if (phase === 'serve') {
    ctx.font = `700 ${Math.max(13, size * .42)}px "Courier New", monospace`;
    ctx.fillText('drag up and down', W / 2, H - 24);
  }
  for (const c of calls) {
    const pop = Math.min(1, c.t / .14), k = .6 + .4 * pop + Math.sin(Math.min(1, c.t / .3) * Math.PI) * .12;
    ctx.globalAlpha = Math.min(1, (c.dur - c.t) / .3);
    ctx.save(); ctx.translate(W / 2, H * .36); ctx.scale(k, k);
    c.lines.forEach((ln, i) => ransom(ln, 0, (i - (c.lines.length - 1) / 2) * c.size * 1.3, c.size, c.text.length + i));
    const below = (c.lines.length - 1) / 2 * c.size * 1.3;
    ctx.translate(0, below);
    if (c.sub) {
      ctx.font = `700 ${Math.max(13, c.size * .36)}px "Courier New", monospace`; ctx.textAlign = 'center';
      const tw = ctx.measureText(c.sub).width;
      ctx.fillStyle = PAPER; ctx.fillRect(-tw / 2 - 8, c.size * .62, tw + 16, c.size * .5);
      ctx.fillStyle = INK; ctx.fillText(c.sub, 0, c.size * .9);
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
}
function draw() {
  drawRink();
  drawLoon();
  drawGuy(guys[0], me);
  drawGuy(guys[1], them);
  if (phase !== 'pick') drawPuck();
  drawFlag();
  drawParts();
  drawDisco();
  if (flash > 0) { ctx.fillStyle = Math.floor(flash / .2) % 2 ? 'rgba(255,42,143,.22)' : 'rgba(47,85,255,.22)'; ctx.fillRect(0, 0, W, H); }
  if (phase !== 'pick') drawHud();
  ctx.fillStyle = grain; ctx.fillRect(0, 0, W, H);
}

let last = 0, paused = false;
function frame(t) {
  const dt = Math.min(.033, (t - last) / 1000 || 0); last = t;
  if (!paused) { update(dt); draw(); }
  requestAnimationFrame(frame);
}

// ---- a ransom note in the page (for the pick and end screens) ----
function ransomDom(text, seed) {
  const wrap = document.createElement('span'); wrap.className = 'ransom';
  const r = rng(seed * 7919 + text.length * 31);
  let i = 0;
  for (const word of text.split(' ')) {
    const w = document.createElement('span'); w.className = 'word';
    for (const ch of word) {
      const s = document.createElement('span'), st = STYLES[(i + seed) % STYLES.length];
      s.textContent = ch;
      s.style.cssText = `background:${st[0]};color:${st[1]};font-family:${FONTS[(i * 5 + seed) % FONTS.length]};transform:rotate(${((r() - .5) * 16).toFixed(1)}deg) translateY(${((r() - .5) * 8).toFixed(1)}px)`;
      w.appendChild(s); i++;
    }
    wrap.appendChild(w); i++;
  }
  return wrap;
}

// ---- input ----
cv.addEventListener('pointerdown', e => { targetY = e.clientY; if (phase === 'serve' && phaseT > .3) launch(); });
cv.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || e.buttons || true) targetY = e.clientY; });
addEventListener('keydown', e => {
  if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
  if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
  if (e.key === ' ' && phase === 'serve') launch();
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
  if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
});
document.addEventListener('visibilitychange', () => { paused = document.hidden; });
addEventListener('resize', resize);

$('pickTitle').appendChild(ransomDom('HEATED HOCKEY', 1));
$('pickShane').addEventListener('click', () => startMatch('shane'));
$('pickIlya').addEventListener('click', () => startMatch('ilya'));
$('rematch').addEventListener('click', () => startMatch(me));
$('swap').addEventListener('click', () => startMatch(them));

resize();
for (const g of guys) g.y = H / 2;
requestAnimationFrame(frame);

// For tests: the state of play.
window.__hockey = {
  get phase() { return phase; }, get score() { return score.slice(); }, puck, guys, startMatch, goal: s => goal(s),
  get calls() { return calls.map(c => c.text); },
  loon() { nextLoon = 0; }, kiss() { rally = 8; kissed = false; hitGuy(guys[0], 0); },
};

// Heated Rivalry: The Club. Every phone is a light, and every phone on the same channel shows the same color at
// the same moment: the color is a pure function of (channel, world time), so no server is needed, only a shared clock.

// ---- the colors: sampled from the club scene itself (its brightest lit pixels, pushed to full brightness) ----
const PINK = [255, 32, 71];   // the crimson pink of the light panels and faces
const BLUE = [60, 103, 255];  // the cold blue on the shirts and the crowd
const GREEN = [0, 255, 120];
const TEAL_BLUE = [0, 110, 255];

const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const dim = (c, k) => c.map(v => v * k);
// The same "random" number on every phone for the same slot of time, so even the flicker is in sync.
function chance(n) {
  let h = (n % 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// The beat everything locks to. A channel link can carry its own (?bpm=128), so a room can match the song.
const BPM = Math.min(200, Math.max(60, parseFloat(new URLSearchParams(location.search).get('bpm')) || 120));
const BEAT = 60000 / BPM;

// ---- the channels: each one maps a time in ms (since 1970, world clock) to a color ----
const CHANNELS = [
  {
    name: 'The Club',
    blurb: 'Fast pink and blue flicker',
    swatch: [PINK, BLUE],
    color(t) {
      // Sixteenth notes: pink, blue, pink, blue, each a quick hit and then dark, with a few hits dropped and the
      // rest a little uneven, like a strobe that's been going all night. The first hit of every beat always lands.
      const slot = BEAT / 4, n = Math.floor(t / slot), p = (t - n * slot) / slot;
      const c = n % 2 === 0 ? PINK : BLUE;
      if (n % 4 !== 0 && chance(n) < 0.18) return dim(c, 0.03);
      const k = p < 0.6 ? 0.78 + 0.22 * chance(n * 7 + 3) : 0.03;
      return dim(c, k);
    },
  },
  {
    name: 'Slow Burn',
    blurb: 'Green and blue, sliding back and forth',
    swatch: [GREEN, TEAL_BLUE],
    color(t) {
      // Over to blue across two bars, back to green across two more; it rests a moment on each color, and dips a
      // little in the middle of each crossing so it reads as a pulse.
      const span = BEAT * 8, n = Math.floor(t / span), p = (t - n * span) / span;
      const s = p * p * (3 - 2 * p);  // smoothstep: lingers at the ends
      const k = n % 2 === 0 ? s : 1 - s;
      return dim(mix(GREEN, TEAL_BLUE, k), 0.72 + 0.28 * Math.abs(1 - 2 * s));
    },
  },
  {
    name: 'Rivals',
    blurb: 'Pink and blue, slow, melting together',
    swatch: [PINK, BLUE],
    color(t) {
      const span = BEAT * 24, p = (t % span) / span;  // six bars, there and back
      const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * p);  // pink, over to blue, back to pink
      const glow = 0.75 + 0.25 * Math.cos(4 * Math.PI * p);  // a little dimmer in the purple between
      return dim(mix(PINK, BLUE, k), glow);
    },
  },
];

// ---- the shared clock: the phone's own clock, corrected by a world time server when one answers ----
const Clock = (() => {
  let base = Date.now() - performance.now();  // world ms at performance.now() == 0
  let state = { source: 'phone clock', err: null };
  const now = () => performance.now() + base;
  const SOURCES = [
    { name: 'Akamai time', url: 'https://time.akamai.com/?iso&ms', parse: t => Date.parse(t.trim()) },
    {
      name: 'timeapi.io', url: 'https://timeapi.io/api/time/current/zone?timeZone=UTC',
      parse: t => { const j = JSON.parse(t); return Date.UTC(j.year, j.month - 1, j.day, j.hour, j.minute, j.seconds, j.milliSeconds); },
    },
  ];
  async function sample(src) {
    const t0 = performance.now();
    const res = await fetch(src.url, { cache: 'no-store' });
    const text = await res.text();
    const t1 = performance.now();
    const server = src.parse(text);
    if (!res.ok || !Number.isFinite(server)) throw new Error('bad time');
    return { base: server - (t0 + t1) / 2, rtt: t1 - t0 };  // the server read its clock about halfway through
  }
  async function sync() {
    for (const src of SOURCES) {
      const got = [];
      for (let i = 0; i < 6; i++) {
        try { got.push(await sample(src)); } catch (e) { if (i === 1 && !got.length) break; }
      }
      if (got.length) {
        got.sort((a, b) => a.rtt - b.rtt);  // the quickest round trip is the most exact
        base = got[0].base;
        state = { source: src.name, err: Math.round(got[0].rtt / 2) };
        return state;
      }
    }
    state = { source: 'phone clock', err: null };
    return state;
  }
  return { now, sync, state: () => state };
})();

// ---- keeping the screen on ----
const Awake = (() => {
  let lock = null, video = null, want = false;
  async function grab() {
    if (!want) return;
    try {
      if ('wakeLock' in navigator) {
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => { lock = null; });
        return;
      }
    } catch (e) { /* falls through to the video */ }
    // Older phones: a tiny silent video playing on a loop keeps the screen from sleeping.
    if (!video) {
      video = document.createElement('video');
      Object.assign(video, { src: 'vendor/awake.mp4', muted: true, loop: true, playsInline: true });
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
      document.body.appendChild(video);
    }
    video.play().catch(() => {});
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') grab(); });
  return {
    on() { want = true; grab(); },
    off() { want = false; if (lock) lock.release().catch(() => {}); lock = null; if (video) video.pause(); },
  };
})();

// ---- the page ----
const $ = id => document.getElementById(id);
const light = $('light'), start = $('start'), controls = $('controls'), qrBox = $('qr');
const themeMeta = document.querySelector('meta[name="theme-color"]');
const params = new URLSearchParams(location.search);
let channel = Math.min(CHANNELS.length, Math.max(1, parseInt(params.get('ch'), 10) || 1)) - 1;
let running = false, hideTimer = null, lastTheme = '';

const rgb = c => `rgb(${c.map(v => Math.round(v)).join(',')})`;
const query = ch => `?ch=${ch + 1}${BPM !== 120 ? `&bpm=${BPM}` : ''}`;
const shareUrl = ch => `${location.origin}${location.pathname}${query(ch)}`;

function buildChannelButtons(holder, onPick) {
  holder.innerHTML = '';
  CHANNELS.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'chan';
    b.dataset.i = i;
    b.innerHTML = `<span class="num">${i + 1}</span><span class="words"><span class="name"></span><span class="blurb"></span></span><span class="sw"></span>`;
    b.querySelector('.name').textContent = c.name;
    b.querySelector('.blurb').textContent = c.blurb;
    b.querySelector('.sw').style.background = `linear-gradient(135deg, ${rgb(c.swatch[0])} 0 50%, ${rgb(c.swatch[1])} 50% 100%)`;
    b.addEventListener('click', e => { e.stopPropagation(); onPick(i); });
    holder.appendChild(b);
  });
}
function markChannel() {
  document.querySelectorAll('.chan').forEach(b => b.classList.toggle('on', +b.dataset.i === channel));
  history.replaceState(null, '', query(channel));
}
function pick(i) { channel = i; markChannel(); if (!qrBox.hidden) showQr(); }

function frame() {
  if (!running) return;
  const c = CHANNELS[channel].color(Clock.now());
  const css = rgb(c);
  light.style.background = css;
  document.documentElement.style.background = css;
  // the browser's own bars follow along, a few times a second at most
  const t = performance.now();
  if (themeMeta && t - (frame.lastThemeAt || 0) > 120 && css !== lastTheme) {
    themeMeta.setAttribute('content', css); lastTheme = css; frame.lastThemeAt = t;
  }
  requestAnimationFrame(frame);
}

async function go() {
  start.hidden = true;
  light.hidden = false;
  running = true;
  Awake.on();
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch (e) { /* iPhone Safari has no full screen for pages; Add to Home Screen does it */ }
  requestAnimationFrame(frame);
  flashControls();
}
function stop() {
  running = false;
  Awake.off();
  light.hidden = true;
  controls.hidden = true;
  qrBox.hidden = true;
  start.hidden = false;
  document.documentElement.style.background = '';
  if (themeMeta) themeMeta.setAttribute('content', '#000000');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function flashControls() {
  controls.hidden = false;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { controls.hidden = true; }, 3500);
}

function showQr() {
  const url = shareUrl(channel);
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  $('qrCode').innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
  $('qrChan').textContent = `Channel ${channel + 1}: ${CHANNELS[channel].name}`;
  $('qrUrl').textContent = url.replace(/^https?:\/\//, '');
  qrBox.hidden = false;
  clearTimeout(hideTimer);
}

function showSync(s) {
  $('sync').textContent = s.err == null
    ? 'In sync by the phone’s own clock'
    : `In sync with world time (±${Math.max(1, s.err)} ms)`;
}

// ---- wiring ----
buildChannelButtons($('chans'), pick);
buildChannelButtons($('chans2'), i => { pick(i); flashControls(); });
markChannel();
$('go').addEventListener('click', go);
$('share').addEventListener('click', showQr);
$('share2').addEventListener('click', e => { e.stopPropagation(); showQr(); });
$('exit').addEventListener('click', e => { e.stopPropagation(); stop(); });
$('qrClose').addEventListener('click', e => { e.stopPropagation(); qrBox.hidden = true; if (running) flashControls(); });
light.addEventListener('click', () => { if (controls.hidden) flashControls(); else controls.hidden = true; });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && running && !document.fullscreenElement) stop();
  if (/^[1-9]$/.test(e.key) && +e.key <= CHANNELS.length) pick(+e.key - 1);
});
if (/iPhone|iPod/.test(navigator.userAgent) && !navigator.standalone) $('iosTip').hidden = false;

showSync(Clock.state());
Clock.sync().then(showSync);
setInterval(() => Clock.sync().then(showSync), 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') Clock.sync().then(showSync); });

// For tests: which color a channel shows at a world time, and the clock in use.
window.__club = { CHANNELS, Clock, colorAt: (ch, t) => CHANNELS[ch].color(t).map(Math.round), channel: () => channel };

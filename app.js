// Heated Rivalry: The Club. Every phone is a light, and every phone on the same channel shows the same color at
// the same moment: the color is a pure function of (channel, world time), so no server is needed, only a shared clock.

// ---- the colors: first sampled from the club scene, then tuned by eye on a phone ----
const PINK = [255, 28, 140];  // hot pink (Blaine, 2026-10-31: the scene's crimson read too red; "it's pink")
const BLUE = [36, 64, 255];   // the scene's cold blue, a touch deeper

const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const dim = (c, k) => c.map(v => v * k);
// The same "random" number on every phone for the same slot of time, so even the flicker is in sync.
function chance(n) {
  let h = (n % 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// The beat everything locks to. A channel link can carry its own (?bpm=128), so a room can match the song.
const BPM = Math.min(200, Math.max(60, parseFloat(new URLSearchParams(location.search).get('bpm')) || 126));  // 126: the Harrison remix's tempo, by one catalog (unconfirmed)
const BEAT = 60000 / BPM;

// The flicker: pink, blue, pink, blue, one hit a slot, each a quick hit and then dark, with a few hits dropped and
// the rest a little uneven, like a strobe that's been going all night. Every fourth hit always lands.
function flicker(t, slot) {
  const n = Math.floor(t / slot), p = (t - n * slot) / slot;
  const c = n % 2 === 0 ? PINK : BLUE;
  if (n % 4 !== 0 && chance(n) < 0.18) return dim(c, 0.03);
  const k = p < 0.6 ? 0.78 + 0.22 * chance(n * 7 + 3) : 0.03;
  return dim(c, k);
}

// ---- the channels: each one maps a time in ms (since 1970, world clock) to a color ----
const CHANNELS = [
  {
    name: 'The Club',
    blurb: 'Fast pink and blue flicker',
    swatch: [PINK, BLUE],
    color: t => flicker(t, BEAT / 4),  // sixteenth notes
  },
  {
    name: 'Slow Burn',
    blurb: 'The same flicker, four times slower',
    swatch: [PINK, BLUE],
    color: t => flicker(t, BEAT),  // quarter notes (Blaine, 2026-10-31: no green; channel 1, four times slower)
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
const query = ch => `?ch=${ch + 1}${BPM !== 126 ? `&bpm=${BPM}` : ''}`;
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
  document.body.classList.add('lit');
  Awake.on();
  requestAnimationFrame(frame);
  flashControls();
  await fullScreen();
  if (!CAN_FULL && !INSTALLED) FsHelp.maybe();
}

// ---- full screen ----
// Android and desktop browsers allow it on a tap. iPhone Safari doesn't, for any page: there the way is Add to Home
// Screen, which opens the page with no browser bars at all (INSTALLED).
const CAN_FULL = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const INSTALLED = !!navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
async function fullScreen() {
  if (!CAN_FULL || isFull()) return;
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else el.webkitRequestFullscreen();
  } catch (e) { /* refused: the next tap tries again */ }
}
const FsHelp = (() => {
  let shown = false;
  return {
    maybe() {
      let seen = false;
      try { seen = localStorage.getItem('club-fs-help') === '1'; } catch (e) {}
      if (seen || shown) return;
      shown = true;
      $('fsHelp').hidden = false;
      setControls(false);
    },
  };
})();
function stop() {
  running = false;
  Awake.off();
  light.hidden = true;
  setControls(false);
  document.body.classList.remove('lit');
  qrBox.hidden = true;
  start.hidden = false;
  document.documentElement.style.background = '';
  if (themeMeta) themeMeta.setAttribute('content', '#000000');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
// The controls (and, under the lights, the music tray's handle) show for a moment after a tap.
function setControls(on) {
  controls.hidden = !on;
  document.body.classList.toggle('ctl', on);
}
function flashControls() {
  setControls(true);
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { if (!tray.classList.contains('open')) setControls(false); }, 3500);
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
// The music tray: its players load only when someone first opens it, so the lights never wait on Spotify or
// YouTube. Folding it away only slides it off screen, so whatever is playing keeps playing.
const tray = $('tray');
function openTray() {
  document.querySelectorAll('#tray .frame').forEach(f => {
    if (f.firstChild) return;
    const i = document.createElement('iframe');
    i.src = f.dataset.src;
    i.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    i.loading = 'lazy';
    i.title = f.classList.contains('yt') ? 'The club scene, on YouTube' : 'The song, on Spotify';
    if (f.classList.contains('yt')) i.referrerPolicy = 'strict-origin-when-cross-origin';
    f.appendChild(i);
  });
  tray.classList.add('open');
  $('trayHandle').innerHTML = '&#9662; Fold it away';
  clearTimeout(hideTimer);
}
function foldTray() {
  tray.classList.remove('open');
  $('trayHandle').innerHTML = '&#9652; &#9835; Play the song';
  if (running) flashControls();
}
$('trayHandle').addEventListener('click', () => (tray.classList.contains('open') ? foldTray() : openTray()));
$('djOpen').addEventListener('click', openTray);
$('music2').addEventListener('click', e => { e.stopPropagation(); openTray(); });
$('djClose').addEventListener('click', foldTray);

// The secret: a tiny puck in the footer. It shows the zine (art/the-club-zine.svg, an original drawing), or a photo
// picked from this phone instead: that photo stays on the phone (kept in this browser's own storage so it's there all
// night), and never goes anywhere near the site.
const Secret = (() => {
  const DB = 'the-club', STORE = 'secret';
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const run = (mode, fn) => open().then(db => new Promise((res, rej) => {
    const tx = db.transaction(STORE, mode), req = fn(tx.objectStore(STORE));
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
  }));
  let url = null;
  async function load() { try { return await run('readonly', s => s.get('photo')); } catch (e) { return null; } }
  async function save(blob) { try { await run('readwrite', s => s.put(blob, 'photo')); } catch (e) { /* shown for now, just not kept */ } }
  function show(blob) {
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);
    $('secretImg').src = url;
    $('secretSwap').textContent = 'Change photo';
    $('secret').hidden = false;
  }
  function showArt() {
    $('secretImg').src = 'art/the-club-zine.svg';
    $('secretSwap').textContent = 'Use a photo from this phone';
    $('secret').hidden = false;
  }
  $('puck').addEventListener('click', async () => { const b = await load(); if (b) show(b); else showArt(); });
  $('puckFile').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    save(f); show(f); e.target.value = '';
  });
  $('secretSwap').addEventListener('click', () => $('puckFile').click());
  $('secretClose').addEventListener('click', () => { $('secret').hidden = true; });
})();
$('share').addEventListener('click', showQr);
$('share2').addEventListener('click', e => { e.stopPropagation(); showQr(); });
$('exit').addEventListener('click', e => { e.stopPropagation(); stop(); });
$('qrClose').addEventListener('click', e => { e.stopPropagation(); qrBox.hidden = true; if (running) flashControls(); });
light.addEventListener('click', () => {
  fullScreen();  // if the phone dropped out of full screen, a tap puts it back
  if (tray.classList.contains('open')) foldTray();
  else if (controls.hidden) flashControls();
  else setControls(false);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && running && !document.fullscreenElement) stop();
  if (/^[1-9]$/.test(e.key) && +e.key <= CHANNELS.length) pick(+e.key - 1);
});
$('fsOk').addEventListener('click', e => {
  e.stopPropagation();
  $('fsHelp').hidden = true;
  try { localStorage.setItem('club-fs-help', '1'); } catch (err) {}
});

showSync(Clock.state());
Clock.sync().then(showSync);
setInterval(() => Clock.sync().then(showSync), 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') Clock.sync().then(showSync); });

// For tests: which color a channel shows at a world time, and the clock in use.
window.__club = { CHANNELS, Clock, colorAt: (ch, t) => CHANNELS[ch].color(t).map(Math.round), channel: () => channel };

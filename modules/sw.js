// ── SERVICE WORKER ────────────────────────────────────────────────
const CACHE = 'schleudergang-v4';

const ASSETS = [
  '/',
  'index.html',
  'style.css',
  'modules/i18n.js',
  'modules/state.js',
  'modules/audio.js',
  'modules/board.js',
  'modules/animation.js',
  'modules/gamelogic.js',
  'modules/ui.js',
  'modules/bot.js',
  'modules/firebase.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request))
  );
});

self.addEventListener('message', e => {
  if(e.data === 'skipWaiting') self.skipWaiting();
});

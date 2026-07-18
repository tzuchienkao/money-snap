const CACHE_NAME = 'money-snap-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/app.js',
  './src/parser.js',
  './src/aggregator.js',
  './src/denomination.js',
  './src/bank.js',
  './src/config.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
];

// Install: Cache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).catch(err => console.error('快取失敗，請檢查檔案路徑是否存在:', err))
  );
  self.skipWaiting();
});

// Activate: Cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Cache-First strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

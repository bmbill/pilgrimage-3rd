/* 離線快取：網頁先走網路（拿最新版），沒網路才用快取；行事曆檔一律走網路 */
const C = 'pg-20261029180501';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('pg-') && k !== C).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.pathname.endsWith('.ics')) return;
  if (r.mode === 'navigate') {
    // 跳過瀏覽器的 10 分鐘快取，有網路就一定拿最新版
    e.respondWith(fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put('./index.html', cp)); }
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  if (u.origin === location.origin || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); }
      return res;
    })));
  }
});

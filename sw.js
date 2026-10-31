/* 離線快取：網頁先走網路（拿最新版），沒網路才用快取；行事曆檔一律走網路 */
const C = 'pg-20261031152341';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
const IMGS = ['./img/chupo.jpg', './img/fusen-a.jpg', './img/fusen-b.jpg', './img/m31-1102.jpg', './img/m31-1103.jpg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(CORE).then(() => c.addAll(IMGS).catch(() => {}))).then(() => self.skipWaiting()));
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
    e.respondWith((async () => {
      const cached = await caches.match('./index.html');
      // 抓最新版（跳過瀏覽器的 10 分鐘快取）；成功就存進手機
      const net = (async () => {
        let res = await fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' });
        // iPhone Safari 不接受「轉址過」的回應，會整頁空白，所以重新包一次
        if (res.redirected) res = new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
        if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put('./index.html', cp)); }
        return res;
      })();
      net.catch(() => {});
      if (!cached) return net;
      // 手機裡已經有舊版：網路 4 秒內沒回來（山上訊號差）就先顯示舊版，新版在背景存好、下次打開就是新的
      const timeout = new Promise(ok => setTimeout(() => ok(cached), 4000));
      try {
        const res = await Promise.race([net, timeout]);
        return res.ok ? res : cached;
      } catch (_) { return cached; }
    })());
    return;
  }
  if (u.origin === location.origin || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); }
      return res;
    })));
  }
});

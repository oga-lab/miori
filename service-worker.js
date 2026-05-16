/* ============================================
   みおり - Service Worker（開発用：ネットワーク優先）
   制作中は常に最新ファイルを取りに行く。
   オフライン時はキャッシュにフォールバック。
   ============================================ */

const CACHE_NAME = 'miori-dev-024';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  'https://cdn.jsdelivr.net/npm/idb@8/build/umd.js'
];

// インストール時：必要なものをキャッシュ（オフライン用の保険）
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();  // すぐ新SWに切り替え
});

// アクティベート時：古いキャッシュを全削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())  // 既存タブもこのSWの管理下に
  );
});

// フェッチ時：ネットワーク優先、失敗時のみキャッシュ
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 取得できたら、ついでにキャッシュも更新（オフライン用）
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // ネットワーク失敗時のみキャッシュを返す
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // HTMLならトップにフォールバック
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

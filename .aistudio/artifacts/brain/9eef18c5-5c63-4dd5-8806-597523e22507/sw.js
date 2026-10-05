// Service Worker for Prayer Push Notifications, Background Sync & Offline Support
// Version: cave-companions-v9-live-refresh

const CACHE_NAME = 'cave-companions-v9';
const PRECACHE_ASSETS = [
  '/',
  '/?source=pwa',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.png',
  '/favicon.ico',
  '/app_icon.jpg'
];

let cachedPrayerSchedule = [];
let userReminderSettings = null;

// 1. Install event: pre-cache all critical assets for 100% offline coverage
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching critical assets for offline support');
        return Promise.all(
          PRECACHE_ASSETS.map((url) => {
            return cache.add(url).catch((err) => {
              console.warn(`[Service Worker] Failed to pre-cache asset: ${url}`, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activate event: clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting outdated cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Message handler from client
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SYNC_PRAYER_SCHEDULE') {
    cachedPrayerSchedule = event.data.schedule || [];
    userReminderSettings = event.data.settings || null;
    console.log('[Service Worker] Prayer schedule synchronized:', cachedPrayerSchedule.length, 'prayers');
  } else if (event.data.type === 'TRIGGER_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'সালাতের রিমাইন্ডার', options || {});
  }
});

// 4. Background Sync event (triggered when network connectivity is restored)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Sync event triggered:', event.tag);
  if (event.tag === 'cave-offline-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_OFFLINE_QUEUE_SYNC' });
        });
      })
    );
  }
});

// 5. Periodic Background Sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cave-prayer-sync') {
    console.log('[Service Worker] Periodic prayer sync triggered');
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'PERIODIC_PRAYER_TICK' });
        });
      })
    );
  }
});

// 6. Handle incoming Web Push events
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'সালাতের রিমাইন্ডার', body: event.data.text() };
    }
  }

  const title = data.title || '🕌 সালাতের ওয়াক্ত শুরু হয়েছে';
  const options = {
    body: data.body || 'সালাতের ওয়াক্ত শুরু হয়েছে। জামাতে সালাত আদায় করে নিন।',
    icon: '/app_icon.jpg',
    badge: '/app_icon.jpg',
    silent: true, // শব্দবিহীন সাইলেন্ট নোটিফিকেশন
    vibrate: [200, 100, 200],
    tag: data.tag || 'prayer-reminder',
    renotify: true,
    data: data.url || '/',
    actions: [
      { action: 'open_app', title: '📱 অ্যাপ খুলুন' },
      { action: 'dismiss', title: 'ঠিক আছে' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 7. Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// 8. Fetch handler: Differentiate HTML navigation vs Immutable Hashed Assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Prevent caching non-http/https schemes
  if (!url.protocol.startsWith('http')) return;

  // Prevent caching live API mutations
  if (url.pathname.startsWith('/api/')) return;

  const isHtmlNavigation = event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html');
  const isHashedAsset = url.pathname.startsWith('/assets/');

  if (isHtmlNavigation) {
    // Network-First for HTML to prevent stale chunk reference mismatches on new deployments
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = (await caches.match(event.request)) || (await caches.match('/index.html')) || (await caches.match('/'));
          if (cached) return cached;
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable Offline' });
        })
    );
    return;
  }

  if (isHashedAsset) {
    // Cache-First for immutable hashed JS/CSS assets
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Default Network First with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone).catch((err) => {
            console.warn('[Service Worker] Cache put failed:', err);
          });
        });
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable Offline' });
      })
  );
});

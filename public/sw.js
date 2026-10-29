// Shortify Admin Minimal PWA Service Worker
const CACHE_NAME = 'shortify-admin-v1';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    // Pass through network requests directly
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

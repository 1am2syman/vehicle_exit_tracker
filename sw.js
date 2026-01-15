/**
 * Service Worker for Vehicle Exit Tracker
 * Handles caching of core app files for PWA offline support
 */

const CACHE_NAME = 'vehicle-exit-tracker-v2';

// Core app files to cache
const APP_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/logo.png'
];

// Install event - cache core files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app files...');
            return cache.addAll(APP_FILES).catch((error) => {
                console.warn('[SW] Some app files failed to cache:', error);
                // Continue anyway - not all files may exist yet
            });
        }).then(() => {
            console.log('[SW] Installation complete');
            return self.skipWaiting(); // Activate immediately
        })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] Activation complete');
            return self.clients.claim(); // Take control of all pages
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip Google Apps Script API calls (always go to network)
    if (url.includes('script.google.com')) {
        return;
    }

    // Handle app files with app cache (stale-while-revalidate)
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((response) => {
                // Start network fetch in background
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // Update cache with fresh response
                    if (networkResponse.ok) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Network failed, return cached or null
                    return response;
                });

                // Return cached response immediately, or wait for network
                return response || fetchPromise;
            });
        })
    );
});

// Message handler for cache control
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_CACHE_STATUS') {
        caches.open(CACHE_NAME).then(cache => cache.keys()).then((keys) => {
            event.ports[0].postMessage({
                appFilesCached: keys.length,
                cacheReady: keys.length >= APP_FILES.length
            });
        });
    }
});

console.log('[SW] Service worker loaded');

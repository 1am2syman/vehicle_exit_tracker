/**
 * Service Worker for Vehicle Exit Tracker
 * Handles caching of Tesseract.js WASM + language files for offline OCR
 */

const CACHE_NAME = 'vehicle-exit-tracker-v1';
const OCR_CACHE_NAME = 'tesseract-ocr-v1';

// Core app files to cache
const APP_FILES = [
    '/',
    '/index.html',
    '/ocr-engine.js',
    '/manifest.json',
    '/assets/logo.png'
];

// Tesseract.js files to cache (large files, cached separately)
const OCR_FILES = [
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
    // Language data files (~15MB total)
    'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz',
    'https://tessdata.projectnaptha.com/4.0.0/ben.traineddata.gz'
];

// Install event - cache core files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        Promise.all([
            // Cache app files
            caches.open(CACHE_NAME).then((cache) => {
                console.log('[SW] Caching app files...');
                return cache.addAll(APP_FILES).catch((error) => {
                    console.warn('[SW] Some app files failed to cache:', error);
                    // Continue anyway - not all files may exist yet
                });
            }),
            // Pre-cache OCR files
            caches.open(OCR_CACHE_NAME).then((cache) => {
                console.log('[SW] Pre-caching OCR files (this may take a while)...');
                // Use individual fetches to avoid one failure breaking all
                return Promise.all(
                    OCR_FILES.map(url =>
                        fetch(url, { mode: 'cors' })
                            .then(response => {
                                if (response.ok) {
                                    cache.put(url, response);
                                    console.log('[SW] Cached:', url);
                                }
                            })
                            .catch(err => console.warn('[SW] Failed to cache:', url, err))
                    )
                );
            })
        ]).then(() => {
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
                    .filter((name) => name !== CACHE_NAME && name !== OCR_CACHE_NAME)
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

    // Handle Tesseract/OCR related files with OCR cache
    if (url.includes('tesseract') || url.includes('tessdata') || url.includes('.wasm')) {
        event.respondWith(
            caches.open(OCR_CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((response) => {
                    if (response) {
                        console.log('[SW] OCR cache hit:', url);
                        return response;
                    }

                    console.log('[SW] OCR cache miss, fetching:', url);
                    return fetch(event.request).then((networkResponse) => {
                        // Cache the new response
                        if (networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
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
        Promise.all([
            caches.open(CACHE_NAME).then(cache => cache.keys()),
            caches.open(OCR_CACHE_NAME).then(cache => cache.keys())
        ]).then(([appKeys, ocrKeys]) => {
            event.ports[0].postMessage({
                appFilesCached: appKeys.length,
                ocrFilesCached: ocrKeys.length,
                ocrReady: ocrKeys.length >= OCR_FILES.length
            });
        });
    }
});

console.log('[SW] Service worker loaded');

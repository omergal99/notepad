/**
 * SERVICE WORKER
 * Offline support, caching, and background sync
 * Phase 8 implementation
 */

const CACHE_NAME = 'notepad-online-v1';
const URLS_TO_CACHE = [
    '/notepad/',
    '/notepad/index.html',
    '/notepad/manifest.json',
    '/notepad/css/main.css',
    '/notepad/css/desktop.css',
    '/notepad/css/window.css',
    '/notepad/css/editor.css',
    '/notepad/css/modal.css',
    '/notepad/css/responsive.css',
    '/notepad/js/app.js',
    '/notepad/js/utils/eventEmitter.js',
    '/notepad/js/utils/domUtils.js',
    '/notepad/js/modules/StorageEngine.js',
    '/notepad/js/modules/WindowManager.js',
    '/notepad/js/modules/WindowComponent.js',
    '/notepad/js/modules/TabManager.js',
    '/notepad/js/modules/EditorComponent.js',
    '/notepad/js/modules/PreferencesManager.js',
    '/notepad/js/modules/ImageClipboardEngine.js',
    '/notepad/js/modules/HistoryEngine.js',
    '/notepad/js/modules/ExportEngine.js',
    '/notepad/js/modules/SearchReplaceEngine.js',
    '/notepad/js/modules/KeyboardShortcuts.js',
    '/notepad/js/modules/ThemeEngine.js'
];

/**
 * Install event - cache assets
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('✅ Caching app shell');
                return cache.addAll(URLS_TO_CACHE);
            })
            .catch((error) => {
                console.error('❌ Cache failed:', error);
            })
    );
    self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

/**
 * Fetch event - network first with cache fallback
 */
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone the response
                const clonedResponse = response.clone();

                // Cache successful responses
                if (response.status === 200 && event.request.destination !== 'style') {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                }

                return response;
            })
            .catch(() => {
                // Fallback to cache when offline
                return caches.match(event.request)
                    .then((response) => {
                        if (response) {
                            return response;
                        }

                        // Offline page fallback
                        if (event.request.destination === 'document') {
                            return caches.match('/notepad/index.html');
                        }

                        return null;
                    });
            })
    );
});

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('✅ Service Worker loaded');

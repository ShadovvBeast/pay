const CACHE_NAME = 'sb0-pay-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip auth requests - always go to network
  if (event.request.url.includes('/auth')) {
    return;
  }

  // Skip API requests - let them go to network
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Skip Vite HMR and dev requests
  if (event.request.url.includes('/@vite') || 
      event.request.url.includes('/@react-refresh') ||
      event.request.url.includes('/@fs/') ||
      event.request.url.includes('/__vite')) {
    return;
  }

  // Skip chrome extensions
  if (event.request.url.startsWith('chrome-extension:')) {
    return;
  }

  // Only cache requests from our origin
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return cachedResponse;
        }

        // Otherwise fetch from network
        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache the response for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.error('Service Worker: Cache put failed', error);
              });

            return response;
          })
          .catch((error) => {
            console.error('Service Worker: Network fetch failed', error);
            
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            throw error;
          });
      })
  );
});

// Background sync for offline payment queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'payment-sync') {
    console.log('Service Worker: Processing offline payments');
    event.waitUntil(processOfflinePayments());
  }
});

// Process queued payments when back online
async function processOfflinePayments() {
  try {
    // Get queued payments from IndexedDB
    const queuedPayments = await getQueuedPayments();
    
    for (const payment of queuedPayments) {
      try {
        // Attempt to process the payment
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payment.data)
        });

        if (response.ok) {
          // Remove from queue on success
          await removeFromQueue(payment.id);
          console.log('Service Worker: Offline payment processed', payment.id);
        }
      } catch (error) {
        console.error('Service Worker: Failed to process offline payment', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error processing offline payments', error);
  }
}

// IndexedDB helpers for offline payment queue
async function getQueuedPayments() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sb0-pay-offline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['payments'], 'readonly');
      const store = transaction.objectStore('payments');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('payments')) {
        db.createObjectStore('payments', { keyPath: 'id' });
      }
    };
  });
}

async function removeFromQueue(paymentId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sb0-pay-offline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['payments'], 'readwrite');
      const store = transaction.objectStore('payments');
      const deleteRequest = store.delete(paymentId);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}
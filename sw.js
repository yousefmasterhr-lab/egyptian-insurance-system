// ==========================================================================
// Service Worker لنظام إدارة التأمينات - دعم PWA والتحديث التلقائي الفوري
// ==========================================================================

const CACHE_NAME = 'insurance-app-v5.5';
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css?v=5.4',
    './script.js?v=4.2',
    './auth.js?v=4.2',
    './dashboard.js?v=4.2',
    './operations.js?v=4.2',
    './occupations.js?v=4.2',
    './tour.js?v=4.2',
    './logo.png',
    './form_bg.png',
    './form_bg_back.png',
    './form_s6_bg.jpg',
    './form_s6_bg_back.jpg',
    './manifest.json'
];

// 1. التثبيت والتحميل المسبق
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('Some assets could not be cached initially:', err);
            });
        })
    );
});

// 2. التفعيل وحذف الكاش القديم
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. استراتيجية Network-First الذكية لضمان التحديث التلقائي بمجرد رفع تعديل جديد
self.addEventListener('fetch', (event) => {
    // استثناء طلبات Firebase والمكتبات السحابية الخارجية
    const requestUrl = event.request.url;
    if (requestUrl.includes('firestore.googleapis.com') || 
        requestUrl.includes('identitytoolkit') || 
        requestUrl.includes('securetoken') ||
        requestUrl.includes('firebaseio.com') ||
        requestUrl.includes('firebasestorage')) {
        return;
    }

    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // العودة إلى الكاش في حال انقطاع الاتصال
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});

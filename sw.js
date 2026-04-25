// اسم "خزان الذاكرة" (Cache Name) - تغيير هذا الاسم يجبر المتصفح على تحميل ملفات جديدة
const CACHE = 'tallo-v101-force-refresh'; 

// قائمة الملفات الأساسية التي سيتم حفظها في ذاكرة الهاتف ليعمل الموقع بسرعة أو بدون إنترنت
const ASSETS = [
  'index.html',
  'menu.html',
  'menu-en.html',
  'css/menu-final-v1.css',
  'js/design-sync.js',
  'images/tallo-logo.png',
  'images/header-sadu-final.png',
  'images/header-arch-final.png',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

/**
 * 1. مرحلة التثبيت (Install):
 * يتم فيها تحميل كافة الملفات المذكورة في قائمة ASSETS وحفظها في الكاش.
 */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // إجبار النسخة الجديدة على العمل فوراً
});

/**
 * 2. مرحلة التفعيل (Activate):
 * يتم فيها تنظيف الذاكرة القديمة وحذف أي "كاش" قديم لا يحمل نفس الاسم الجديد.
 */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }) // البحث عن الكاش القديم
            .map(function(k) { return caches.delete(k); }) // حذفه نهائياً
      );
    })
  );
  self.clients.claim();
});

/**
 * 3. مرحلة جلب البيانات (Fetch):
 * هي "شرطي المرور" الذي يقرر هل يأتي بالملف من الإنترنت أم من الذاكرة المحفوظة (Cache).
 */
self.addEventListener('fetch', function(e) {
  const url = new URL(e.request.url);
  
  // استثناء: ملفات الصوت والفيديو لا يتم حفظها في الكاش لضمان عدم تعليقها أو اختفائها
  if (url.pathname.endsWith('.m4a') || url.pathname.endsWith('.mp4')) {
    return; // اترك المتصفح يحملها مباشرة من السيرفر (Native)
  }

  // هل الملف المطلوب هو صفحة HTML أو ملف برمجى JS؟
  const isDynamic = url.pathname.endsWith('.html') || url.pathname.includes('js/');

  if (isDynamic) {
    // استراتيجية (الإنترنت أولاً): يحاول جلب النسخة الأحدث من الإنترنت، وإذا انقطع الاتصال يستخدم الكاش.
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  } else {
    // استراتيجية (الكاش أولاً): للصور والخطوط، يأتي بها من الذاكرة لسرعة مذهلة، وإذا لم يجدها يحملها من الإنترنت.
    e.respondWith(
      caches.match(e.request).then(cached => {
        return cached || fetch(e.request).then(res => {
          if (res.status === 200) {
            let clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone)); // حفظ النسخة الجديدة في الذاكرة
          }
          return res;
        });
      })
    );
  }
});

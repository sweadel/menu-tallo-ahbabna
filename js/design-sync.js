/**
 * design-sync.js v3.0
 * هذا الملف هو "المحرك" المسؤول عن مزامنة تصميم الموقع مع الإعدادات في Firebase لحظياً.
 * يقوم بتغيير الألوان، الخطوط، الشعارات، والنصوص دون الحاجة لتعديل الكود يدوياً.
 */

(function() {
    // 1. إنشاء عنصر <style> في رأس الصفحة لحقن الألوان والتصاميم الجديدة
    const style = document.createElement('style');
    style.id = 'firebase-design-styles';
    document.head.appendChild(style);

    // 2. إعدادات الاتصال بقاعدة بيانات Firebase (لا تقم بتغييرها)
    const firebaseConfig = {
        apiKey: "AIzaSyCwMxgmrfnsme4pgLx00tgjGCo-gQBMUo8",
        authDomain: "tallow-ahbabna.firebaseapp.com",
        projectId: "tallow-ahbabna",
        storageBucket: "tallow-ahbabna.firebasestorage.app",
        messagingSenderId: "1025966646494",
        appId: "1:1025966646494:web:f89373fad63d988f298e4f",
        databaseURL: "https://tallow-ahbabna-default-rtdb.firebaseio.com"
    };

    // التأكد من أن مكتبة Firebase محملة بنجاح
    if (!window.firebase) {
        console.error("Firebase SDK not loaded!");
        return;
    }

    // بدء تشغيل Firebase
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    
    // الاستماع للتغييرات في مسار 'settings/design' في قاعدة البيانات
    db.ref('settings/design').on('value', snapshot => {
        const d = snapshot.val(); // جلب البيانات الجديدة
        if (!d) return;
        applyDesign(d); // تطبيق التصميم الجديد
    });

    /**
     * وظيفة تطبيق التصميم (applyDesign):
     * تأخذ البيانات من قاعدة البيانات وتقوم بتحديث الموقع فوراً.
     */
    function applyDesign(d) {
        // --- أ. حقن متغيرات CSS (CSS Variables) ---
        // هنا نقوم بتغيير الألوان والخطوط والأشكال برمجياً
        let css = `
            :root {
                --gold: ${d.primaryColor !== undefined ? d.primaryColor : '#C5A022'}; /* اللون الأساسي */
                --gold-dark: ${d.primaryColor !== undefined ? d.primaryColor : '#a8841c'}; 
                --btn-active-bg: ${d.pillActiveBg !== undefined ? d.pillActiveBg : (d.primaryColor || '#C5A022')}; /* لون الزر المفعل */
                --bg: ${d.pageBg !== undefined ? d.pageBg : '#0B0B0E'}; /* لون خلفية الصفحة */
                --card-bg: ${d.cardBg !== undefined ? d.cardBg : 'rgba(255, 255, 255, 0.03)'}; /* لون كرت الوجبة */
                --font-main: '${d.fontFamily !== undefined ? d.fontFamily : 'IBM Plex Sans Arabic'}', sans-serif; /* نوع الخط */
                --btn-radius: ${d.btnShape !== undefined ? d.btnShape : '8px'}; /* شكل الزوايا (دائري أو حاد) */
                --glass-blur: ${d.glassBlur !== undefined ? d.glassBlur : '10'}px; /* قوة التغبيش الزجاجي */
            }
            body { 
                background-color: var(--bg);
                font-family: var(--font-main);
                font-weight: ${d.fontBold ? '800' : '700'};
            }
            /* تطبيق شكل الزوايا على كل العناصر التفاعلية */
            .pill, .btn, .cat-btn, .search-box { border-radius: var(--btn-radius) !important; }
            .menu-card { 
                background: var(--card-bg) !important; 
                backdrop-filter: blur(var(--glass-blur)) !important;
            }
            /* تحديث خلفية الهيدر (الأقواس أو السدو) */
            .hdr-top { 
                background-image: url('${d.headerBg || 'images/header-sadu-final.png'}') !important;
                background-color: rgba(0,0,0,${(d.headerOpacity !== undefined && d.headerOpacity !== '') ? d.headerOpacity : 0.15}) !important;
            }
            /* تحديث طول اللوجو */
            .logo-wrap img { height: ${d.logoHeight || 145}px !important; }
            .sec-title { color: var(--gold); }
        `;
        style.innerHTML = css;

        // --- ب. تحديث عناصر الصفحة مباشرة (DOM Updates) ---
        
        // 1. تحديث أسماء التصنيفات (عربي، عالمي، تحلية، إلخ)
        const pills = document.querySelectorAll('#mainTabRow .pill');
        if (pills.length >= 5) {
            if(d.labelArabic) pills[0].textContent = d.labelArabic;
            if(d.labelIntl)   pills[1].textContent = d.labelIntl;
            if(d.labelDesserts) pills[2].textContent = d.labelDesserts;
            if(d.labelDrinks)   pills[3].textContent = d.labelDrinks;
            if(d.labelArgileh)  pills[4].textContent = d.labelArgileh;
        }

        // 2. تحديث رابط اللوجو إذا تم تغييره من الإدارة
        const logos = document.querySelectorAll('#main-logo, .logo-wrap img');
        logos.forEach(img => { 
            if(d.logoUrl && !img.src.includes(d.logoUrl)) img.src = d.logoUrl; 
        });

        // 3. إظهار أو إخفاء صندوق البحث
        const searchBox = document.querySelector('.search-row');
        if (searchBox) searchBox.style.display = d.showSearch === false ? 'none' : 'flex';

        // 4. تحديث شريط الإعلانات العلوي (Banner)
        const promo = document.getElementById('promo-banner');
        if (promo) {
            if (d.bannerActive && d.bannerText) {
                promo.style.display = 'block';
                const txtEl = promo.querySelector('.promo-text');
                if(txtEl) txtEl.textContent = d.bannerText;
            } else {
                promo.style.display = 'none';
            }
        }
    }
})();

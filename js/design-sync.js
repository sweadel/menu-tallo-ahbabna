/**
 * design-sync.js v2.0
 * Synchronizes the website design with Firebase settings in real-time.
 */

(function() {
    // 1. Initial Styles to prevent flickering
    const style = document.createElement('style');
    style.id = 'firebase-design-styles';
    document.head.appendChild(style);

    // 2. Firebase Configuration (Same as admin)
    const firebaseConfig = {
        apiKey: "AIzaSyCwMxgmrfnsme4pgLx00tgjGCo-gQBMUo8",
        authDomain: "tallow-ahbabna.firebaseapp.com",
        projectId: "tallow-ahbabna",
        storageBucket: "tallow-ahbabna.firebasestorage.app",
        messagingSenderId: "1025966646494",
        appId: "1:1025966646494:web:f89373fad63d988f298e4f",
        databaseURL: "https://tallow-ahbabna-default-rtdb.firebaseio.com"
    };

    if (!window.firebase) {
        console.error("Firebase SDK not loaded!");
        return;
    }

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const designRef = db.ref('settings/design');

    // 3. Listen for changes
    designRef.on('value', snapshot => {
        const d = snapshot.val();
        if (!d) return;

        applyDesign(d);
    });

    function applyDesign(d) {
        // --- A. CSS Variables ---
        let css = `
            :root {
                --gold: ${d.primaryColor || '#E5C467'} !important;
                --bg: ${d.pageBg || '#14110e'} !important;
                --card: ${d.cardBg || '#26221f'} !important;
                --font-main: '${d.fontFamily || 'IBM Plex Sans Arabic'}', sans-serif !important;
            }
            body { 
                background-color: var(--bg) !important;
                font-family: var(--font-main) !important;
                font-weight: ${d.fontBold ? '800' : '400'} !important;
            }
            .arched-header {
                background-image: url('${d.headerBg || 'images/header-sadu-final.png'}') !important;
            }
            .header-overlay {
                opacity: ${d.headerOpacity || 0.3} !important;
            }
            .logo-img {
                height: ${d.logoHeight || 105}px !important;
            }
            .promo-banner {
                background: var(--gold) !important;
            }
        `;
        style.innerHTML = css;

        // --- B. DOM Elements ---
        
        // Logo
        const logos = document.querySelectorAll('.logo-img, #main-logo');
        logos.forEach(img => { if(d.logoUrl) img.src = d.logoUrl; });

        // Search Bar
        const searchBar = document.querySelector('.search-container, #search-wrap');
        if (searchBar) searchBar.style.display = d.showSearch ? 'flex' : 'none';

        // Tab Labels (Main sections)
        const updateText = (selector, text) => {
            const el = document.querySelector(selector);
            if (el && text) el.textContent = text;
        };

        // Determine if we are in Arabic or English based on html lang
        const isAr = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl';

        if (isAr) {
            updateText('[data-section="arabic"] span', d.labelArabic);
            updateText('[data-section="intl"] span', d.labelIntl);
            updateText('[data-section="desserts"] span', d.labelDesserts);
            updateText('[data-section="drinks"] span', d.labelDrinks);
            updateText('[data-section="argileh"] span', d.labelArgileh);
        }

        // Promotional Banner
        const promo = document.getElementById('promo-banner');
        if (promo) {
            if (d.bannerActive && d.bannerText) {
                promo.style.display = 'block';
                promo.querySelector('.promo-text').textContent = d.bannerText;
            } else {
                promo.style.display = 'none';
            }
        }
    }
})();

/**
 * design-sync.js
 * Automatically syncs global design settings (Logo, Font, Primary Color)
 * to any page that includes this script.
 */

(function() {
    // Wait for Firebase to be ready (assuming 'db' is defined globally)
    const syncDesign = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            console.warn('Firebase not initialized yet. Waiting...');
            setTimeout(syncDesign, 500);
            return;
        }

        const db = firebase.database();
        db.ref('settings/design').on('value', (snapshot) => {
            const d = snapshot.val();
            if (!d) return;

            // 1. Typography
            if (d.fontFamily) {
                document.body.style.setProperty('font-family', `"${d.fontFamily}", sans-serif`, 'important');
                document.querySelectorAll('*').forEach(el => {
                    const tag = el.tagName.toLowerCase();
                    // Skip icons
                    if (el.classList.contains('fa-solid') || el.classList.contains('fa-brands') || tag === 'i') return;
                    el.style.setProperty('font-family', `"${d.fontFamily}", sans-serif`, 'important');
                });
            }
            if (typeof d.fontBold !== 'undefined') {
                document.body.style.fontWeight = d.fontBold ? '700' : '400';
            }

            // 2. Branding Colors
            if (d.primaryColor) {
                document.documentElement.style.setProperty('--gold', d.primaryColor);
                document.documentElement.style.setProperty('--primary', d.primaryColor);
                
                // Specific overrides for buttons if needed
                const goldBtns = document.querySelectorAll('.main-btn.gold, .submit-btn, .primary-btn');
                goldBtns.forEach(btn => {
                    btn.style.setProperty('background', d.primaryColor, 'important');
                    btn.style.setProperty('color', '#000', 'important');
                });
            }

            // 3. Logo URL
            if (d.logoUrl) {
                const logoImgs = document.querySelectorAll('.logo-wrap img, .logo-header img');
                logoImgs.forEach(img => img.src = d.logoUrl);
                const touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
                if(touchIcon) touchIcon.href = d.logoUrl;
            }

            // 4. Backgrounds
            if (d.pageBg) document.documentElement.style.setProperty('--bg', d.pageBg);
            if (d.cardBg) document.documentElement.style.setProperty('--card-bg', d.cardBg);

            // 5. Promotional Banner
            let banner = document.getElementById('offer-banner');
            if (d.bannerActive && d.bannerText) {
                if (!banner) {
                    banner = document.createElement('div');
                    banner.id = 'offer-banner';
                    banner.style.cssText = 'background:var(--gold); color:#000; text-align:center; padding:12px; font-weight:bold; position:sticky; top:0; z-index:2000; box-shadow:0 4px 15px rgba(0,0,0,0.5); font-size:1.05rem;';
                    const hdr = document.getElementById('hdr') || document.querySelector('header');
                    if(hdr) hdr.parentNode.insertBefore(banner, hdr);
                    else document.body.prepend(banner);
                }
                banner.textContent = d.bannerText;
                banner.style.display = 'block';
                if(d.primaryColor) banner.style.background = d.primaryColor;
            } else if (banner) {
                banner.style.display = 'none';
            }

            // 6. Header Visuals
            const hdr = document.getElementById('hdr') || document.querySelector('header');
            const logo = document.querySelector('.logo-wrap img, .logo-header img');
            const searchRow = document.getElementById('searchRow');

            if (hdr) {
                const bgImg = d.headerBg ? `url('${d.headerBg}')` : "url('images/sadu-pattern.jpg')";
                const op = d.headerOpacity || '0.3';
                hdr.style.background = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,${op})), ${bgImg} center / 120px repeat`;
            }
            if (logo && d.logoHeight) {
                logo.style.height = d.logoHeight + 'px';
            }
            if (searchRow) {
                searchRow.style.display = (d.showSearch === false) ? 'none' : 'block';
            }

            // 7. Main Menu Tab Labels
            if (d.labelArabic) {
                const p = document.getElementById('pill-arabic');
                if(p) p.textContent = d.labelArabic;
            }
            if (d.labelIntl) {
                const p = document.getElementById('pill-intl');
                if(p) p.textContent = d.labelIntl;
            }
            if (d.labelDrinks) {
                const p = document.getElementById('pill-drinks');
                if(p) p.textContent = d.labelDrinks;
            }
            if (d.labelArgileh) {
                const p = document.getElementById('pill-argileh');
                if(p) p.textContent = d.labelArgileh;
            }

            // 8. SEO Meta
            if (d.siteTitle) {
                document.title = d.siteTitle;
            }
            if (d.siteDesc) {
                const meta = document.querySelector('meta[name="description"]');
                if(meta) meta.content = d.siteDesc;
                const ogMeta = document.querySelector('meta[property="og:description"]');
                if(ogMeta) ogMeta.content = d.siteDesc;
            }
        });
    };

    if (document.readyState === 'complete') syncDesign();
    else window.addEventListener('load', syncDesign);
})();

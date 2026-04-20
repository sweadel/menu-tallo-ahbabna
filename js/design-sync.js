/**
 * design-sync.js — v2.0 (Full Header Control)
 * يطبق جميع إعدادات التصميم المحفوظة في Firebase على أي صفحة تضمّنه.
 * يشمل التحكم الكامل في: الخلفية، اللوجو، التبويبات، البحث، الأزرار الفرعية.
 */

(function () {
    const injectStyle = (id, css) => {
        let tag = document.getElementById(id);
        if (!tag) { tag = document.createElement('style'); tag.id = id; document.head.appendChild(tag); }
        tag.textContent = css;
    };

    const syncDesign = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            setTimeout(syncDesign, 500);
            return;
        }
        const db = firebase.database();

        // ══════════════════════════════════════════════════════
        // A. Global design settings
        // ══════════════════════════════════════════════════════
        db.ref('settings/design').on('value', (snap) => {
            const d = snap.val();
            if (!d) return;

            // 1. Typography
            if (d.fontFamily) {
                const fontRules = `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(d.fontFamily)}:wght@300;400;500;600;700&display=swap');`;
                injectStyle('ds-font-import', fontRules);
                injectStyle('ds-font', `* { font-family: '${d.fontFamily}', sans-serif !important; }`);
            }
            if (typeof d.fontBold !== 'undefined') {
                document.body.style.fontWeight = d.fontBold ? '700' : '400';
            }

            // 2. Branding Color (--gold and --primary)
            if (d.primaryColor) {
                document.documentElement.style.setProperty('--gold', d.primaryColor);
                document.documentElement.style.setProperty('--primary', d.primaryColor);
            }

            // 3. Global Logo URL
            if (d.logoUrl) {
                document.querySelectorAll('.logo-wrap img, .logo-header img').forEach(img => img.src = d.logoUrl);
            }

            // 4. Page / Card backgrounds
            if (d.pageBg) {
                document.documentElement.style.setProperty('--bg', d.pageBg);
                document.body.style.backgroundColor = d.pageBg;
            }
            if (d.pageBgImage) {
                document.body.style.backgroundImage = `url('${d.pageBgImage}')`;
                document.body.style.backgroundSize = d.pageBgSize || 'cover';
                document.body.style.backgroundAttachment = 'fixed';
            } else {
                document.body.style.backgroundImage = 'none';
            }
            if (d.cardBg) document.documentElement.style.setProperty('--card-bg', d.cardBg);

            // 5. Card Style
            if (d.cardStyle) {
                const cardStyles = {
                    modern:  `.menu-card { box-shadow: 0 4px 20px rgba(0,0,0,.5); border-radius: 14px; }`,
                    classic: `.menu-card { box-shadow: none; border-radius: 6px; }`,
                    glass:   `.menu-card { backdrop-filter: blur(12px); background: rgba(255,255,255,.05) !important; border: 1px solid rgba(255,255,255,.12); border-radius: 16px; }`,
                };
                injectStyle('ds-card-style', cardStyles[d.cardStyle] || '');
            }

            // 6. Promo Banner
            let banner = document.getElementById('offer-banner');
            if (d.bannerActive && d.bannerText) {
                if (!banner) {
                    banner = document.createElement('div');
                    banner.id = 'offer-banner';
                    banner.style.cssText = 'position:sticky;top:0;z-index:2000;text-align:center;padding:12px;font-weight:700;font-size:1rem;box-shadow:0 4px 15px rgba(0,0,0,.5);';
                    const hdr = document.getElementById('hdr') || document.querySelector('header');
                    if (hdr) hdr.parentNode.insertBefore(banner, hdr);
                    else document.body.prepend(banner);
                }
                banner.textContent = d.bannerText;
                banner.style.background = d.primaryColor || 'var(--gold)';
                banner.style.color = '#000';
                banner.style.display = 'block';
            } else if (banner) {
                banner.style.display = 'none';
            }

            // 7. Search row visibility
            const searchRow = document.getElementById('searchRow');
            if (searchRow) searchRow.style.display = (d.showSearch === false) ? 'none' : 'block';

            // 8. Tab Labels
            const tabMap = { arabic: 'd_labelArabic', intl: 'd_labelIntl', drinks: 'd_labelDrinks', argileh: 'd_labelArgileh' };
            [['arabic', d.labelArabic], ['intl', d.labelIntl], ['drinks', d.labelDrinks], ['argileh', d.labelArgileh]].forEach(([key, val]) => {
                if (val) { const el = document.getElementById(`pill-${key}`); if (el) el.textContent = val; }
            });

            // 9. SEO
            if (d.siteTitle) document.title = d.siteTitle;
            if (d.siteDesc) {
                let m = document.querySelector('meta[name="description"]');
                if (m) m.content = d.siteDesc;
            }

            // ══════════════════════════════════════════════════
            // 10. MENU HEADER — Full Control
            // ══════════════════════════════════════════════════
            const h = d.menuHeader;
            if (!h) return;

            const hdr = document.getElementById('hdr') || document.querySelector('header');
            if (hdr) {
                // Background
                const bgSize = h.bgSize || 120;
                if (h.bgImage) {
                    const o1 = h.overlay1 !== undefined ? h.overlay1 : 0.1;
                    const o2 = h.overlay2 !== undefined ? h.overlay2 : 0.3;
                    hdr.style.background = `linear-gradient(rgba(0,0,0,${o1}), rgba(0,0,0,${o2})), url('${h.bgImage}') center/${bgSize}px repeat`;
                } else {
                    hdr.style.background = h.solidColor || '#111111';
                }
            }

            // Logo in header
            const logoImg = document.querySelector('.logo-wrap img');
            if (logoImg) {
                if (h.logoUrl) logoImg.src = h.logoUrl;
                if (h.logoHeight) logoImg.style.height = h.logoHeight + 'px';
                logoImg.style.opacity = h.logoOpacity !== undefined ? h.logoOpacity : 0.93;
                const shadow = h.logoShadow !== undefined ? h.logoShadow : 8;
                logoImg.style.filter = `drop-shadow(0 2px ${shadow}px rgba(0,0,0,.6))`;
            }

            // Back button
            const backBtn = document.querySelector('.back-btn');
            if (backBtn) {
                backBtn.style.display = (h.showBack === false) ? 'none' : 'flex';
                if (h.backText) backBtn.textContent = h.backText;
                if (h.backColor) backBtn.style.color = h.backColor;
            }

            // Pills (main tabs)
            if (h.pills) {
                const p = h.pills;
                const pillCSS = `
                    .pill {
                        font-size: ${p.fontSize || 0.9}rem !important;
                        border-radius: ${p.radius || 22}px !important;
                        padding: ${p.padV || 9}px ${p.padH || 22}px !important;
                        color: ${p.textColor || 'var(--text-dim)'} !important;
                        background: ${p.bgColor || 'rgba(255,255,255,.06)'} !important;
                    }
                    .pill.active {
                        background: ${p.activeBg || 'var(--gold)'} !important;
                        color: ${p.activeText || '#000'} !important;
                        border-color: ${p.activeBg || 'var(--gold)'} !important;
                    }
                `;
                injectStyle('ds-pills', pillCSS);
            }

            // Search box
            if (h.search) {
                const s = h.search;
                const searchCSS = `
                    .search-box {
                        background: ${s.bg || 'rgba(255,255,255,.05)'} !important;
                        border-radius: ${s.radius || 12}px !important;
                    }
                    .search-box svg path { fill: ${s.iconColor || 'var(--gold)'} !important; }
                    .search-box svg { color: ${s.iconColor || 'var(--gold)'} !important; }
                `;
                injectStyle('ds-search', searchCSS);
                const srchInput = document.getElementById('srch');
                if (srchInput && s.placeholder) srchInput.placeholder = s.placeholder;
            }

            // Sub-nav category buttons
            if (h.catbtn) {
                const cb = h.catbtn;
                const catCSS = `
                    .cat-btn {
                        font-size: ${cb.fontSize || 0.78}rem !important;
                        border-radius: ${cb.radius || 50}px !important;
                        padding: ${cb.padV || 5}px ${cb.padH || 14}px !important;
                        color: ${cb.color || 'var(--text-dim)'} !important;
                    }
                    .cat-btn:hover, .cat-btn.active {
                        color: ${cb.activeColor || 'var(--gold)'} !important;
                    }
                `;
                injectStyle('ds-catbtn', catCSS);
            }
        });

        // ══════════════════════════════════════════════════════
        // B. Home page settings
        // ══════════════════════════════════════════════════════
        db.ref('settings/home').on('value', (snap) => {
            const h = snap.val();
            if (!h) return;

            // Buttons visibility
            const btnAr   = document.getElementById('btn-ar-menu')   || document.getElementById('btn_arabic') || document.querySelector('[data-home-btn="ar"]');
            const btnEn   = document.getElementById('btn-en-menu')   || document.getElementById('btn_english') || document.querySelector('[data-home-btn="en"]');
            const btnFeed = document.getElementById('btn-feedback')  || document.getElementById('btn_feedback_ar') || document.getElementById('btn_feedback_en') || document.querySelector('[data-home-btn="feed"]');
            if (btnAr)   btnAr.style.display   = h.showBtnAr   === false ? 'none' : 'flex';
            if (btnEn)   btnEn.style.display   = h.showBtnEn   === false ? 'none' : 'flex';
            if (btnFeed) btnFeed.style.display  = h.showBtnFeed === false ? 'none' : 'flex';

            // Social links
            const wa  = document.getElementById('link_whatsapp') || document.getElementById('link-whatsapp') || document.querySelector('[data-social="whatsapp"]');
            const ig  = document.getElementById('link_instagram') || document.getElementById('link-instagram') || document.querySelector('[data-social="instagram"]');
            const fb  = document.querySelector('.s-link[href*="facebook"]') || document.querySelector('[data-social="facebook"]');
            const gm  = document.getElementById('link_maps') || document.getElementById('link-maps') || document.querySelector('[data-social="maps"]');
            if (wa && h.whatsapp)   wa.href = `https://wa.me/${h.whatsapp.toString().replace(/\D/g,'')}`;
            if (ig && h.instagram)  ig.href = h.instagram;
            if (fb && h.facebook)   fb.href = h.facebook;
            if (gm && h.maps)       gm.href = h.maps;

            // Video background & Overlay
            const vid = document.querySelector('video.bg-video') || document.querySelector('.hero-video video') || document.querySelector('.vid-bg video');
            if (vid && h.homeVideo) {
                const src = vid.querySelector('source') || document.createElement('source');
                if (src.src !== h.homeVideo) {
                    src.src = h.homeVideo; src.type = 'video/mp4';
                    if (!src.parentNode) vid.appendChild(src);
                    vid.load();
                }
            }
            const overlay = document.querySelector('.video-overlay, .hero-overlay, .vid-bg, [data-overlay]');
            if (overlay && h.homeOverlay !== undefined) {
                overlay.style.setProperty('--overlay-op', h.homeOverlay);
                overlay.style.opacity = h.homeOverlay;
            }

            // Tagline
            const tagline = document.querySelector('.hero-tagline, .tagline, [data-tagline]');
            if (tagline && h.homeTagline) tagline.textContent = h.homeTagline;

            // Logo size
            const homeLogo = document.querySelector('.home-logo img, .hero-logo img, .logo-wrap img');
            if (homeLogo && h.homeLogoSize) homeLogo.style.height = h.homeLogoSize + 'px';
        });
    };

    if (document.readyState === 'complete') syncDesign();
    else window.addEventListener('load', syncDesign);
})();

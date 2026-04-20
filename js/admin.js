/**
 * admin.js v4.0 — لوحة التحكم الكاملة
 * طلوا حبابنا | Tallo Ahbabna
 */

// ══════════════ 0. SECURITY ══════════════
if (localStorage.getItem('admin_auth') !== 'true') {
    window.location.href = 'login.html';
}

function logout() {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_user');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('admin_user') || 'المدير العام';
    const el = document.getElementById('current-user-display');
    if (el) el.textContent = user;
});

// ══════════════ 1. FIREBASE ══════════════
const firebaseConfig = {
    apiKey: "AIzaSyCwMxgmrfnsme4pgLx00tgjGCo-gQBMUo8",
    authDomain: "tallow-ahbabna.firebaseapp.com",
    projectId: "tallow-ahbabna",
    storageBucket: "tallow-ahbabna.firebasestorage.app",
    messagingSenderId: "1025966646494",
    appId: "1:1025966646494:web:f89373fad63d988f298e4f",
    databaseURL: "https://tallow-ahbabna-default-rtdb.firebaseio.com"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const REFS = {
    menu:       db.ref('menu_items'),
    deleted:    db.ref('deleted_items'),
    categories: db.ref('categories_meta'),
    logs:       db.ref('audit_logs'),
    users:      db.ref('users'),
    design:     db.ref('settings/design'),
    home:       db.ref('settings/home'),
};

// ══════════════ 2. STATE ══════════════
let menuItems     = [];
let categoryItems = [];
let editingKey    = null;
let editingCatKey = null;
let editingUserKey = null;
let viewMode      = 'table';
let catFilter     = 'all';
let isSavingDesign = false;
let isSavingHome   = false;

const FONTS = [
    'Zain', 'Tajawal', 'Cairo', 'Almarai', 'IBM Plex Sans Arabic', 
    'Roboto', 'Inter', 'Outfit', 'Montserrat'
];

// ══════════════ 3. NAVIGATION ══════════════
document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        navigateTo(this.getAttribute('data-view'));
    });
});

function navigateTo(viewId) {
    document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`[data-view="${viewId}"]`).forEach(b => b.classList.add('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
    document.getElementById('sidebar')?.classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
}

// ══════════════ 4. MENU LISTENER ══════════════
REFS.menu.on('value', snapshot => {
    const data = snapshot.val();
    menuItems = [];
    if (data) {
        Object.entries(data).forEach(([key, val]) => menuItems.push({ firebaseKey: key, ...val }));
        menuItems.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return (a.name || '').localeCompare(b.name || '', 'ar');
        });
    }
    renderTable();
    renderGrid();
    updateStats();
    updateBadge();
}, err => {
    showToast('خطأ في الاتصال بقاعدة البيانات', 'error');
    console.error(err);
});

// ══════════════ 5. CATEGORIES LISTENER ══════════════
REFS.categories.on('value', snapshot => {
    const data = snapshot.val();
    categoryItems = [];
    if (data) {
        Object.entries(data).forEach(([key, val]) => categoryItems.push({ id: key, ...val }));
        categoryItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    rebuildCategorySelects();
    renderCategoryGrid();
    renderTable();
    renderGrid();
    document.getElementById('stat-cats').textContent = categoryItems.length;
});

// ══════════════ 6. DELETED ITEMS LISTENER ══════════════
REFS.deleted.on('value', snapshot => {
    const data  = snapshot.val();
    const tbody = document.getElementById('deleted-items-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-trash-can"></i><h3>السلة فارغة</h3><p>لا توجد أصناف محذوفة</p></div></td></tr>`;
        return;
    }

    Object.entries(data).forEach(([key, item]) => {
        const date    = new Date(item.deletedAt).toLocaleString('ar-EG');
        const catObj  = categoryItems.find(c => c.id === item.category);
        const catName = catObj ? catObj.nameAr : (item.category || '-');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color:var(--text-3);font-size:0.75rem;">${date}</td>
            <td><strong>${item.name || ''}</strong>${item.nameEn ? `<span style="color:var(--text-2);font-size:0.78rem;"> / ${item.nameEn}</span>` : ''}</td>
            <td><span class="cat-chip">${catName}</span></td>
            <td class="price-cell">${item.price ? item.price + ' د.أ' : '—'}</td>
            <td>
                <div class="row-actions">
                    <button class="act-btn toggle" onclick="restoreItem('${key}')" title="استعادة"><i class="fa-solid fa-rotate-left"></i></button>
                    <button class="act-btn del" onclick="permanentDelete('${key}')" title="حذف نهائي"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
});

// ══════════════ 7. DESIGN SETTINGS LISTENER ══════════════
REFS.design.on('value', snapshot => {
    if (isSavingDesign) return; // Don't overwrite while user is saving
    const d = snapshot.val();
    if (!d) return;
    
    // Improved helper: Only update if the user IS NOT typing in the field
    const sv = (id, val) => { 
        const el = document.getElementById(id); 
        if(el && val !== undefined && document.activeElement !== el) el.value = val; 
    };
    const sc = (id, val) => { 
        const el = document.getElementById(id); 
        if(el) el.checked = val !== false; 
    };

    // Colors & Typography
    sv('d_primaryColor', d.primaryColor || '#C8A84B');
    sv('d_primaryColorText', d.primaryColor || '#C8A84B');
    sv('d_pageBg', d.pageBg || '#080808');
    sv('d_pageBgText', d.pageBg || '#080808');
    sv('d_pageBgImage', d.pageBgImage || '');
    sv('d_pageBgSize', d.pageBgSize || 'cover');
    sv('d_cardBg', d.cardBg || '#121212');
    sv('d_cardBgText', d.cardBg || '#121212');
    sv('d_fontFamily', d.fontFamily || 'IBM Plex Sans Arabic');
    sv('d_cardStyle', d.cardStyle || 'modern');
    sc('d_fontBold', d.fontBold);
    sc('d_showSearch', d.showSearch !== false);

    // Logo & Header (legacy fields)
    sv('d_logoUrl', d.logoUrl || '');
    sv('d_headerBg', d.headerBg || '');
    sv('d_logoHeight', d.logoHeight || '');
    sv('d_headerOpacity', d.headerOpacity || '');

    // Tabs Labels
    sv('d_labelArabic', d.labelArabic || '');
    sv('d_labelIntl', d.labelIntl || '');
    sv('d_labelDrinks', d.labelDrinks || '');
    sv('d_labelArgileh', d.labelArgileh || '');

    // Promo Banner
    sv('d_bannerText', d.bannerText || '');
    sc('d_bannerActive', d.bannerActive || false);

    // SEO
    sv('d_siteTitle', d.siteTitle || '');
    sv('d_siteDesc', d.siteDesc || '');

    // ── Menu Header Controls ──
    const h = d.menuHeader || {};
    sv('hdr_bgImage',   h.bgImage   || '');
    sv('hdr_overlay1',  h.overlay1  !== undefined ? h.overlay1 : '');
    sv('hdr_overlay2',  h.overlay2  !== undefined ? h.overlay2 : '');
    sv('hdr_solidColor', h.solidColor || '#111111');
    sv('hdr_solidColorText', h.solidColor || '');
    sv('hdr_bgSize',    h.bgSize    || 80);
    sv('hdr_logoUrl',   h.logoUrl   || '');
    sv('hdr_logoHeight',h.logoHeight|| 48);
    sv('hdr_logoOpacity',h.logoOpacity !== undefined ? h.logoOpacity : '');
    sv('hdr_logoShadow',h.logoShadow|| '');
    sc('hdr_showBack',  h.showBack !== false);
    sv('hdr_backText',  h.backText  || '');
    sv('hdr_backColor', h.backColor || '#E5C467');
    sv('hdr_backColorTxt', h.backColor || '');

    // تحديث معاينة الخلفية بعد التحميل
    setTimeout(() => updateBgPreview(h.bgImage || ''), 200);

    // Pills
    const p = h.pills || {};
    sv('pill_fontSize',    p.fontSize    || '');
    sv('pill_radius',      p.radius      || '');
    sv('pill_padV',        p.padV        || '');
    sv('pill_padH',        p.padH        || '');
    sv('pill_textColor',   p.textColor   || '#8a8580');
    sv('pill_textColorTxt',p.textColor   || '');
    sv('pill_bgColor',     p.bgColor     || '');
    sv('pill_activeText',  p.activeText  || '#000000');
    sv('pill_activeTextTxt', p.activeText || '');
    sv('pill_activeBg',    p.activeBg    || '#E5C467');
    sv('pill_activeBgTxt', p.activeBg    || '');

    // Search
    const s = h.search || {};
    sv('srch_bg',          s.bg          || '');
    sv('srch_radius',      s.radius      || '');
    sv('srch_placeholder', s.placeholder || '');
    sv('srch_iconColor',   s.iconColor   || '#E5C467');
    sv('srch_iconColorTxt',s.iconColor   || '');

    // Cat Buttons
    const cb = h.catbtn || {};
    sv('catbtn_fontSize',    cb.fontSize    || '');
    sv('catbtn_radius',      cb.radius      || '');
    sv('catbtn_padV',        cb.padV        || '');
    sv('catbtn_padH',        cb.padH        || '');
    sv('catbtn_color',       cb.color       || '#8a8580');
    sv('catbtn_colorTxt',    cb.color       || '');
    sv('catbtn_activeColor', cb.activeColor || '#E5C467');
    sv('catbtn_activeColorTxt', cb.activeColor || '');

    // Reset preview on load
    setTimeout(previewDesign, 100);
});

// ── Live Preview Engine ──
function previewDesign() {
    const d = {
        primaryColor: document.getElementById('d_primaryColor')?.value,
        fontFamily:   document.getElementById('d_fontFamily')?.value,
        fontBold:     document.getElementById('d_fontBold')?.checked,
        pageBg:       document.getElementById('d_pageBg')?.value,
        pageBgImage:  document.getElementById('d_pageBgImage')?.value,
        pageBgSize:   document.getElementById('d_pageBgSize')?.value,
        logoUrl:      document.getElementById('d_logoUrl')?.value || document.getElementById('hdr_logoUrl')?.value
    };

    const box = document.getElementById('design-preview-box');
    const logoImg = document.getElementById('preview-logo');
    const pills = [document.getElementById('preview-pill-active'), document.getElementById('preview-pill-dim')];

    if (!box) return;

    // Apply font
    if (d.fontFamily) {
        let link = document.getElementById('ds-preview-font');
        if (!link) {
            link = document.createElement('link'); link.id = 'ds-preview-font'; link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(d.fontFamily)}:wght@400;700;800&display=swap`;
        box.style.fontFamily = `'${d.fontFamily}', sans-serif`;
    }
    box.style.fontWeight = d.fontBold ? '800' : '600';

    // Apply colors
    if (d.primaryColor) {
        document.documentElement.style.setProperty('--gold', d.primaryColor);
        if (pills[0]) pills[0].style.background = d.primaryColor;
    }

    // Apply background
    if (d.pageBgImage) {
        box.style.backgroundImage = `url('${d.pageBgImage}')`;
        box.style.backgroundSize = d.pageBgSize || 'cover';
    } else {
        box.style.backgroundImage = 'none';
        box.style.background = d.pageBg || 'var(--bg-1)';
    }

    // Apply logo
    if (logoImg && d.logoUrl) logoImg.src = d.logoUrl;
}

// Add live listeners
document.addEventListener('DOMContentLoaded', () => {
    const ids = ['d_primaryColor', 'd_fontFamily', 'd_fontBold', 'd_pageBg', 'd_pageBgImage', 'd_pageBgSize', 'd_logoUrl', 'hdr_logoUrl'];
    ids.forEach(id => {
        document.getElementById(id)?.addEventListener('input', previewDesign);
        document.getElementById(id)?.addEventListener('change', previewDesign);
    });
});

// ── Background Image Preview in Admin ──
function updateBgPreview(url) {
    const box = document.getElementById('bg-preview-box');
    if (!box) return;
    if (url && url.trim()) {
        box.innerHTML = '';
        box.style.backgroundImage = `url('${url.trim()}')`;
        box.style.backgroundSize = '120px auto';
        box.style.backgroundRepeat = 'repeat';
        box.style.border = '1px solid var(--border-g)';
    } else {
        box.style.backgroundImage = 'none';
        box.style.background = '#111';
        box.style.border = '1px dashed var(--border)';
        box.innerHTML = '<span style="font-size:0.7rem; color:var(--text-3);">معاينة — أدخل رابط صورة أعلاه</span>';
    }
}

function saveDesign() {
    const gv  = id => document.getElementById(id)?.value || '';
    const gc  = id => document.getElementById(id)?.checked ?? true;
    const gnf = (id, def) => { 
        const val = parseFloat(document.getElementById(id)?.value);
        return isNaN(val) ? def : val;
    };
    const gni = (id, def) => { 
        const val = parseInt(document.getElementById(id)?.value);
        return isNaN(val) ? def : val;
    };

    const designData = {
        primaryColor:  gv('d_primaryColor'),
        pageBg:        gv('d_pageBg'),
        cardBg:        gv('d_cardBg'),
        fontFamily:    gv('d_fontFamily'),
        fontBold:      gc('d_fontBold'),
        cardStyle:     gv('d_cardStyle'),
        logoUrl:       gv('d_logoUrl'),
        headerBg:      gv('d_headerBg'),
        logoHeight:    gv('d_logoHeight'),
        headerOpacity: gv('d_headerOpacity'),
        showSearch:    gc('d_showSearch'),
        bannerActive:  gc('d_bannerActive'),
        bannerText:    gv('d_bannerText'),
        labelArabic:   gv('d_labelArabic'),
        labelIntl:     gv('d_labelIntl'),
        labelDrinks:   gv('d_labelDrinks'),
        labelArgileh:  gv('d_labelArgileh'),
        siteTitle:     gv('d_siteTitle'),
        siteDesc:      gv('d_siteDesc'),
        pageBgImage:   gv('d_pageBgImage'),
        pageBgSize:    gv('d_pageBgSize'),

        // ── Menu Header ──
        menuHeader: {
            bgImage:    gv('hdr_bgImage'),
            overlay1:   gnf('hdr_overlay1', 0.1),
            overlay2:   gnf('hdr_overlay2', 0.3),
            solidColor: gv('hdr_solidColor'),
            bgSize:     gni('hdr_bgSize', 120),
            logoUrl:    gv('hdr_logoUrl'),
            logoHeight: gni('hdr_logoHeight', 62),
            logoOpacity: gnf('hdr_logoOpacity', 0.93),
            logoShadow: gni('hdr_logoShadow', 8),
            showBack:   gc('hdr_showBack'),
            backText:   gv('hdr_backText') || '→',
            backColor:  gv('hdr_backColor'),
            pills: {
                fontSize:   gnf('pill_fontSize', 0.9),
                radius:     gni('pill_radius', 22),
                padV:       gni('pill_padV', 9),
                padH:       gni('pill_padH', 22),
                textColor:  gv('pill_textColor')             || '#8a8580',
                bgColor:    gv('pill_bgColor')               || 'rgba(255,255,255,.06)',
                activeText: gv('pill_activeText')            || '#000000',
                activeBg:   gv('pill_activeBg')              || '#E5C467',
            },
            search: {
                bg:          gv('srch_bg')          || 'rgba(255,255,255,.05)',
                radius:      gni('srch_radius', 12),
                placeholder: gv('srch_placeholder') || 'ابحث في القائمة...',
                iconColor:   gv('srch_iconColor')   || '#E5C467',
            },
            catbtn: {
                fontSize:    gnf('catbtn_fontSize', 0.78),
                radius:      gni('catbtn_radius', 50),
                padV:        gni('catbtn_padV', 5),
                padH:        gni('catbtn_padH', 14),
                color:       gv('catbtn_color')                 || '#8a8580',
                activeColor: gv('catbtn_activeColor')           || '#E5C467',
            },
        }
    };

    isSavingDesign = true;
    const btn = document.querySelector('[onclick="saveDesign()"]');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';

    REFS.design.set(designData)
        .then(() => {
            showToast('✓ تم تطبيق جميع إعدادات التصميم والهيدر على الموقع');
            log('تحديث التصميم', 'تعديل شامل لإعدادات المظهر والهيدر');
        })
        .catch(err => showToast('خطأ: ' + err.message, 'error'))
        .finally(() => {
            isSavingDesign = false;
            if (btn) btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> تطبيق التغييرات';
        });
}

// ══════════════ 8. HOME SETTINGS LISTENER ══════════════
REFS.home.on('value', snapshot => {
    if (isSavingHome) return;
    const d = snapshot.val();
    if (!d) return;
    const sv = (id, val) => { 
        const el = document.getElementById(id); 
        if(el && document.activeElement !== el) el.value = val || ''; 
    };
    const sc = (id, val) => { 
        const el = document.getElementById(id); 
        if(el) el.checked = val !== false; 
    };

    sc('h_btn_ar', d.showBtnAr);
    sc('h_btn_en', d.showBtnEn);
    sc('h_btn_feed', d.showBtnFeed);
    sv('h_whatsapp', d.whatsapp || '');
    sv('h_instagram', d.instagram || '');
    sv('h_facebook', d.facebook || '');
    sv('h_maps', d.maps || '');
    sv('h_video', d.homeVideo || '');
    sv('h_tagline', d.homeTagline || '');
    sv('h_overlay', d.homeOverlay || '');
    sv('h_logoSize', d.homeLogoSize || '');
});

function saveHomeSettings() {
    const gv = id => document.getElementById(id)?.value || '';
    const gc = id => document.getElementById(id)?.checked ?? true;

    const data = {
        showBtnAr:   gc('h_btn_ar'),
        showBtnEn:   gc('h_btn_en'),
        showBtnFeed: gc('h_btn_feed'),
        whatsapp:    gv('h_whatsapp'),
        instagram:   gv('h_instagram'),
        facebook:    gv('h_facebook'),
        maps:        gv('h_maps'),
        homeVideo:   gv('h_video'),
        homeTagline: gv('h_tagline'),
        homeOverlay: gv('h_overlay'),
        homeLogoSize: gv('h_logoSize'),
    };

    isSavingHome = true;
    const btn = document.querySelector('[onclick="saveHomeSettings()"]');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';

    REFS.home.set(data)
        .then(() => {
            showToast('✓ تم حفظ إعدادات الصفحة الرئيسية');
            log('تحديث الرئيسية', 'تعديل إعدادات الصفحة الرئيسية');
        })
        .catch(err => showToast('خطأ: ' + err.message, 'error'))
        .finally(() => {
            isSavingHome = false;
            if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i> حفظ الإعدادات';
        });
}

// ══════════════ 9. USERS LISTENER ══════════════
REFS.users.on('value', snapshot => {
    const data  = snapshot.val();
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-users"></i><h3>لا يوجد حسابات</h3><p>أضف مستخدمين جدد</p></div></td></tr>`;
        return;
    }

    const roleMap = { admin: '👑 مدير نظام', manager: '🛠️ مدير فرع', viewer: '👁️ مشاهد' };
    Object.entries(data).forEach(([key, user]) => {
        const date = user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-EG') : '-';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${user.username}</strong></td>
            <td><span class="cat-chip">${roleMap[user.role] || user.role}</span></td>
            <td style="color:var(--text-3);font-size:0.78rem;">${date}</td>
            <td><span class="status-pill active">نشط</span></td>
            <td>
                <div class="row-actions">
                    <button class="act-btn edit" onclick="editUser('${key}')" title="تعديل"><i class="fa-solid fa-pen"></i></button>
                    <button class="act-btn del" onclick="deleteUser('${key}')" title="حذف"><i class="fa-solid fa-user-slash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
});

function openUserModal() {
    editingUserKey = null;
    document.getElementById('userForm')?.reset();
    document.getElementById('userModalTitle').textContent = 'إضافة حساب جديد';
    document.getElementById('userModal')?.classList.add('open');
}

function closeUserModal() {
    document.getElementById('userModal')?.classList.remove('open');
    editingUserKey = null;
}

function editUser(key) {
    REFS.users.child(key).once('value').then(snap => {
        const user = snap.val();
        if (!user) return;
        editingUserKey = key;
        document.getElementById('userModalTitle').textContent = `تعديل: ${user.username}`;
        document.getElementById('userName').value = user.username;
        document.getElementById('userPass').value = user.password || '';
        document.getElementById('userRole').value = user.role || 'admin';
        document.getElementById('userModal')?.classList.add('open');
    });
}

function saveUser() {
    const username = document.getElementById('userName')?.value.trim();
    const password = document.getElementById('userPass')?.value.trim();
    const role     = document.getElementById('userRole')?.value;

    if (!username || !password) { showToast('يرجى ملء الاسم وكلمة المرور', 'error'); return; }

    const userData = { username, password, role };

    if (editingUserKey) {
        REFS.users.child(editingUserKey).update(userData)
            .then(() => { closeUserModal(); showToast('تم تحديث الحساب ✓'); log('تعديل حساب', `تعديل: ${username}`); })
            .catch(err => showToast('خطأ: ' + err.message, 'error'));
    } else {
        userData.createdAt = Date.now();
        REFS.users.push(userData)
            .then(() => { closeUserModal(); showToast('تم إنشاء الحساب ✓'); log('إضافة حساب', `إضافة: ${username}`); })
            .catch(err => showToast('خطأ: ' + err.message, 'error'));
    }
}

function deleteUser(key) {
    if (!confirm('هل تريد حذف هذا الحساب نهائياً؟')) return;
    REFS.users.child(key).remove()
        .then(() => showToast('تم حذف الحساب'))
        .catch(err => showToast('خطأ: ' + err.message, 'error'));
}

// ══════════════ 10. AUDIT LOG LISTENER ══════════════
REFS.logs.limitToLast(100).on('value', snapshot => {
    const data  = snapshot.val();
    const tbody = document.getElementById('audit-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><h3>لا توجد سجلات</h3><p>ستظهر هنا كل التعديلات التي تقوم بها</p></div></td></tr>`;
        return;
    }

    const entries = Object.entries(data).reverse();
    entries.forEach(([logKey, entry]) => {
        const date = new Date(entry.timestamp).toLocaleString('ar-EG');
        const tr = document.createElement('tr');

        // Build undo button only for item edits with snapshot
        let undoBtn = '—';
        if (entry.snapshot && (entry.action === 'تعديل صنف') && entry.itemKey) {
            undoBtn = `<button class="act-btn toggle" onclick="revertLog('${entry.itemKey}', '${logKey}')" title="تراجع عن التعديل"><i class="fa-solid fa-rotate-left"></i></button>`;
        }

        // Detailed changes formatting
        let detailsHtml = `<div style="font-weight:600;margin-bottom:4px;">${entry.details || ''}</div>`;
        if (entry.diff && entry.diff.length > 0) {
            detailsHtml += `<div class="log-diff-list">`;
            entry.diff.forEach(d => {
                detailsHtml += `<div class="log-diff-item">
                    <span class="field">${d.label}:</span> 
                    <span class="old">${d.old || 'فارغ'}</span> 
                    <i class="fa-solid fa-arrow-left" style="font-size:0.6rem;margin:0 4px;opacity:0.5;"></i>
                    <span class="new">${d.new || 'فارغ'}</span>
                </div>`;
            });
            detailsHtml += `</div>`;
        }

        tr.innerHTML = `
            <td style="color:var(--text-3);font-size:0.75rem;white-space:nowrap;">${date}</td>
            <td><span class="cat-chip">${entry.user || 'Admin'}</span></td>
            <td><span class="status-pill ${getLogClass(entry.action)}" style="font-size:0.72rem;">${entry.action}</span></td>
            <td>${detailsHtml}</td>
            <td>${undoBtn}</td>
        `;
        tbody.appendChild(tr);
    });
});

function getLogClass(action) {
    if (action.includes('إضافة')) return 'active';
    if (action.includes('حذف')) return 'hidden';
    return '';
}

function revertLog(itemKey, logKey) {
    if (!confirm('هل تريد التراجع عن هذا التعديل واستعادة البيانات السابقة؟')) return;
    REFS.logs.child(logKey).once('value').then(snap => {
        const entry = snap.val();
        if (!entry || !entry.snapshot) { showToast('لا يمكن التراجع — لا توجد نسخة سابقة', 'error'); return; }
        REFS.menu.child(itemKey).set(entry.snapshot)
            .then(() => {
                showToast('✓ تم التراجع عن التعديل واستعادة البيانات السابقة');
                log('تراجع عن تعديل', `استعادة نسخة سابقة للصنف`);
            })
            .catch(err => showToast('خطأ: ' + err.message, 'error'));
    });
}

function clearAuditLogs() {
    if (!confirm('هل تريد مسح جميع السجلات؟ لا يمكن استعادتها.')) return;
    REFS.logs.remove().then(() => showToast('تم مسح السجل'));
}

// ══════════════ 11. RENDER TABLE ══════════════
function renderTable() {
    const tbody = document.getElementById('menu-table-body');
    if (!tbody) return;

    const q       = (document.getElementById('filterSearch')?.value || document.getElementById('globalSearch')?.value || '').toLowerCase();
    const catF    = document.getElementById('filterCategory')?.value || 'all';
    const statusF = document.getElementById('filterStatus')?.value   || 'all';

    const filtered = menuItems.filter(item => {
        const matchText = !q || (item.name||'').toLowerCase().includes(q) || (item.nameEn||'').toLowerCase().includes(q);
        const matchCat  = catF === 'all' || item.category === catF;
        const matchStat = statusF === 'all' || (statusF === 'active' ? item.status !== 'inactive' : item.status === 'inactive');
        return matchText && matchCat && matchStat;
    });

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><h3>لا توجد نتائج</h3><p>جرب تغيير البحث أو الفلتر</p></div></td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach(item => {
        const isActive = item.status !== 'inactive';
        const catObj   = categoryItems.find(c => c.id === item.category);
        const catName  = catObj ? catObj.nameAr : (item.category || '—');
        const imgSrc   = item.image || 'images/tallo-logo.png';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div class="item-thumb" style="background-image:url('${imgSrc}');"></div></td>
            <td>
                <div class="item-name-cell">
                    <strong>${item.name || '—'}</strong>
                    ${item.nameEn ? `<div class="en-name">${item.nameEn}</div>` : ''}
                    ${item.desc   ? `<div class="desc">${item.desc}</div>` : ''}
                    ${item.featured ? `<span style="font-size:0.65rem;color:var(--gold);background:var(--gold-glow);padding:2px 6px;border-radius:4px;display:inline-block;margin-top:3px;">⭐ مميز</span>` : ''}
                </div>
            </td>
            <td><span class="cat-chip">${catName}</span></td>
            <td class="price-cell">${item.price ? item.price + ' د.أ' : '—'}</td>
            <td>
                <button class="status-pill ${isActive ? 'active' : 'hidden'}"
                        onclick="toggleStatus('${item.firebaseKey}', '${item.status}')"
                        title="اضغط لتغيير الحالة"
                        style="border:none;cursor:pointer;font-family:inherit;">
                    ${isActive ? 'نشط' : 'مخفي'}
                </button>
            </td>
            <td>
                <div class="row-actions">
                    <button class="act-btn edit" onclick="editItem('${item.firebaseKey}')" title="تعديل"><i class="fa-solid fa-pen"></i></button>
                    <button class="act-btn del"  onclick="deleteItem('${item.firebaseKey}')" title="حذف"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ══════════════ 12. RENDER GRID ══════════════
function renderGrid() {
    const container = document.getElementById('menu-grid-body');
    if (!container) return;

    const q       = (document.getElementById('filterSearch')?.value || '').toLowerCase();
    const catF    = document.getElementById('filterCategory')?.value || 'all';
    const statusF = document.getElementById('filterStatus')?.value   || 'all';

    const filtered = menuItems.filter(item => {
        const matchText = !q || (item.name||'').toLowerCase().includes(q) || (item.nameEn||'').toLowerCase().includes(q);
        const matchCat  = catF === 'all' || item.category === catF;
        const matchStat = statusF === 'all' || (statusF === 'active' ? item.status !== 'inactive' : item.status === 'inactive');
        return matchText && matchCat && matchStat;
    });

    if (!filtered.length) {
        container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-magnifying-glass"></i><h3>لا توجد نتائج</h3></div>`;
        return;
    }

    container.innerHTML = '';
    filtered.forEach(item => {
        const isActive = item.status !== 'inactive';
        const catObj   = categoryItems.find(c => c.id === item.category);
        const catName  = catObj ? catObj.nameAr : '—';

        const card = document.createElement('div');
        card.className = 'menu-card';
        card.innerHTML = `
            <div class="menu-card-img" style="background-image:url('${item.image || 'images/tallo-logo.png'}')">
                <div class="card-status"><span class="status-pill ${isActive ? 'active' : 'hidden'}">${isActive ? 'نشط' : 'مخفي'}</span></div>
                ${item.featured ? `<div style="position:absolute;top:10px;left:10px;background:var(--gold);color:#000;font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:4px;">⭐ مميز</div>` : ''}
            </div>
            <div class="menu-card-body">
                <h3>${item.name || '—'}</h3>
                ${item.nameEn ? `<div class="en">${item.nameEn}</div>` : ''}
                ${item.desc ? `<div style="font-size:0.75rem;color:var(--text-3);margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.desc}</div>` : ''}
                <div class="cat">${catName}</div>
            </div>
            <div class="menu-card-footer">
                <span class="price">${item.price ? item.price + ' د.أ' : '—'}</span>
                <div class="card-actions">
                    <button class="act-btn edit" onclick="editItem('${item.firebaseKey}')" title="تعديل"><i class="fa-solid fa-pen"></i></button>
                    <button class="act-btn del"  onclick="deleteItem('${item.firebaseKey}')" title="حذف"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ══════════════ 13. VIEW MODE TOGGLE ══════════════
function setViewMode(mode) {
    viewMode = mode;
    document.getElementById('tableView').style.display = mode === 'table' ? 'block' : 'none';
    document.getElementById('gridView').style.display  = mode === 'grid'  ? 'block' : 'none';
    document.getElementById('vt-table')?.classList.toggle('active', mode === 'table');
    document.getElementById('vt-grid')?.classList.toggle('active', mode === 'grid');
}

// ══════════════ 14. STATS ══════════════
function updateStats() {
    const el = id => document.getElementById(id);
    if (el('stat-total'))  el('stat-total').textContent  = menuItems.length;
    if (el('stat-active')) el('stat-active').textContent = menuItems.filter(i => i.status !== 'inactive').length;
    if (el('stat-hidden')) el('stat-hidden').textContent = menuItems.filter(i => i.status === 'inactive').length;
}

function updateBadge() {
    const badge = document.getElementById('menu-count-badge');
    if (badge) badge.textContent = menuItems.length;
}

// ══════════════ 15. GLOBAL SEARCH ══════════════
function onGlobalSearch() {
    navigateTo('view-menu');
    const gs = document.getElementById('globalSearch')?.value || '';
    const fs = document.getElementById('filterSearch');
    if (fs) fs.value = gs;
    renderTable();
    renderGrid();
}

// ══════════════ 16. IMAGE PREVIEW ══════════════
function previewImage(url) {
    const img = document.getElementById('img-preview-el');
    const ph  = document.getElementById('img-placeholder');
    if (!img) return;
    if (url && (url.startsWith('http') || url.startsWith('images/'))) {
        img.src = url;
        img.classList.add('visible');
        if (ph) ph.style.display = 'none';
        img.onerror = () => { img.classList.remove('visible'); if(ph) ph.style.display = 'flex'; };
    } else {
        img.classList.remove('visible');
        img.src = '';
        if (ph) ph.style.display = 'flex';
    }
}

// ══════════════ 17. ITEM MODAL ══════════════
function openItemModal() {
    editingKey = null;
    document.getElementById('itemForm')?.reset();
    document.getElementById('modalTitle').textContent = 'إضافة صنف جديد';
    previewImage('');
    document.getElementById('itemModal')?.classList.add('open');
}

function closeItemModal() {
    document.getElementById('itemModal')?.classList.remove('open');
    editingKey = null;
}

function editItem(key) {
    const item = menuItems.find(i => i.firebaseKey === key);
    if (!item) return;
    editingKey = key;
    document.getElementById('modalTitle').textContent       = `تعديل: ${item.name || ''}`;
    document.getElementById('itemName').value     = item.name     || '';
    document.getElementById('itemNameEn').value   = item.nameEn   || '';
    document.getElementById('itemCategory').value = item.category || '';
    document.getElementById('itemPrice').value    = item.price    || '';
    document.getElementById('itemStatus').value   = item.status   || 'active';
    document.getElementById('itemDesc').value     = item.desc     || '';
    document.getElementById('itemDescEn').value   = item.descEn   || '';
    document.getElementById('itemImg').value      = item.image    || '';
    document.getElementById('itemPrepTime').value = item.prepTime || '';
    document.getElementById('itemCalories').value = item.calories || '';
    document.getElementById('itemFeatured').checked = item.featured || false;
    previewImage(item.image || '');
    document.getElementById('itemModal')?.classList.add('open');
}

function saveItem() {
    const name = document.getElementById('itemName').value.trim();
    if (!name) { showToast('يرجى إدخال اسم الصنف', 'error'); return; }

    const itemData = {
        name,
        nameEn:   document.getElementById('itemNameEn').value.trim(),
        category: document.getElementById('itemCategory').value,
        price:    document.getElementById('itemPrice').value.trim(),
        status:   document.getElementById('itemStatus').value,
        desc:     document.getElementById('itemDesc').value.trim(),
        descEn:   document.getElementById('itemDescEn').value.trim(),
        image:    document.getElementById('itemImg').value.trim(),
        prepTime: document.getElementById('itemPrepTime')?.value || '',
        calories: document.getElementById('itemCalories')?.value || '',
        featured: document.getElementById('itemFeatured')?.checked || false,
    };

    const currentUser = localStorage.getItem('admin_user') || 'Admin';

    if (editingKey) {
        // Save snapshot of old data for undo
        const oldItem = menuItems.find(i => i.firebaseKey === editingKey);
        const { firebaseKey: _fk, ...oldSnapshot } = (oldItem || {});

        REFS.menu.child(editingKey).update(itemData)
            .then(() => {
                closeItemModal();
                showToast('تم تحديث الصنف ✓');
                logWithSnapshot('تعديل صنف', `تعديل: ${name}`, editingKey, oldSnapshot);
            })
            .catch(err => showToast('خطأ: ' + err.message, 'error'));
    } else {
        REFS.menu.push({ ...itemData, createdAt: Date.now(), createdBy: currentUser })
            .then(() => {
                closeItemModal();
                showToast('تم إضافة الصنف ✓');
                log('إضافة صنف', `إضافة: ${name}`);
            })
            .catch(err => showToast('خطأ: ' + err.message, 'error'));
    }
}

// ══════════════ 18. STATUS TOGGLE ══════════════
function toggleStatus(key, currentStatus) {
    const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
    REFS.menu.child(key).update({ status: newStatus })
        .then(() => showToast(newStatus === 'active' ? 'تم تفعيل الصنف ✓' : 'تم إخفاء الصنف'))
        .catch(err => showToast('خطأ: ' + err.message, 'error'));
}

// ══════════════ 19. DELETE ══════════════
function deleteItem(key) {
    const item = menuItems.find(i => i.firebaseKey === key);
    if (!item) return;
    if (!confirm(`هل تريد نقل "${item.name}" إلى سلة المحذوفات؟`)) return;

    const currentUser = localStorage.getItem('admin_user') || 'Admin';
    const { firebaseKey: _fk, ...cleanItem } = item;
    const deletedData = { ...cleanItem, deletedAt: Date.now(), deletedBy: currentUser };

    REFS.deleted.child(key).set(deletedData)
        .then(() => REFS.menu.child(key).remove())
        .then(() => {
            showToast(`تم نقل "${item.name}" إلى سلة المحذوفات`);
            log('حذف صنف', `حذف: ${item.name}`);
        })
        .catch(err => showToast('خطأ: ' + err.message, 'error'));
}

function restoreItem(key) {
    REFS.deleted.child(key).once('value').then(snap => {
        const item = snap.val();
        if (!item) return;
        const { deletedAt, deletedBy, ...cleanItem } = item;
        REFS.menu.child(key).set(cleanItem)
            .then(() => {
                REFS.deleted.child(key).remove();
                showToast('تمت استعادة الصنف ✓');
                log('استعادة صنف', `استعادة: ${item.name}`);
            })
            .catch(err => showToast('خطأ: ' + err.message, 'error'));
    });
}

function permanentDelete(key) {
    if (!confirm('سيتم الحذف الكامل ولا يمكن استعادته. متأكد؟')) return;
    REFS.deleted.child(key).remove().then(() => showToast('تم الحذف النهائي'));
}

// ══════════════ 20. CATEGORIES ══════════════
function rebuildCategorySelects() {
    const itemCatSel   = document.getElementById('itemCategory');
    const filterCatSel = document.getElementById('filterCategory');

    if (itemCatSel) {
        const prev = itemCatSel.value;
        itemCatSel.innerHTML = '<option value="" disabled>اختر القسم...</option>';
        categoryItems.forEach(cat => {
            const o = document.createElement('option');
            o.value = cat.id;
            o.textContent = `${cat.nameAr}${cat.nameEn ? ' / ' + cat.nameEn : ''}`;
            itemCatSel.appendChild(o);
        });
        if (prev) itemCatSel.value = prev;
    }

    if (filterCatSel) {
        const prev = filterCatSel.value;
        filterCatSel.innerHTML = '<option value="all">كل الأقسام</option>';
        categoryItems.forEach(cat => {
            const o = document.createElement('option');
            o.value = cat.id;
            o.textContent = cat.nameAr;
            filterCatSel.appendChild(o);
        });
        if (prev) filterCatSel.value = prev;
    }
}

function renderCategoryGrid() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;

    const sectionNames = { arabic: 'المنيو العربي', intl: 'انترناشونل', drinks: 'المشروبات', argileh: 'أراجيل' };
    const filtered = catFilter === 'all' ? categoryItems : categoryItems.filter(c => c.section === catFilter);

    if (!filtered.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-folder-open"></i><h3>لا توجد أقسام</h3><p>أضف قسماً أو استعد الأقسام الافتراضية</p></div>`;
        return;
    }

    grid.innerHTML = '';
    filtered.forEach(cat => {
        const count   = menuItems.filter(i => i.category === cat.id).length;
        const secName = sectionNames[cat.section] || cat.section || '—';

        const card = document.createElement('div');
        card.className = 'cat-card';
        card.innerHTML = `
            <div class="cat-card-icon"><i class="fa-solid ${cat.icon || 'fa-folder'}"></i></div>
            <div class="cat-card-info">
                <h3>${cat.nameAr}</h3>
                <div class="en">${cat.nameEn || '—'}</div>
                <div class="cat-card-meta">
                    <span class="meta-tag gold">${secName}</span>
                    <span class="meta-tag">${count} صنف</span>
                    <span class="meta-tag">#${cat.order || 0}</span>
                </div>
            </div>
            <div class="cat-card-actions">
                <button class="act-btn edit" onclick="editCategory('${cat.id}')" title="تعديل"><i class="fa-solid fa-pen"></i></button>
                <button class="act-btn del"  onclick="deleteCategory('${cat.id}')" title="حذف"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
}

document.querySelectorAll('.section-filter').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.section-filter').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        catFilter = this.getAttribute('data-sec');
        renderCategoryGrid();
    });
});

function openCatModal() {
    editingCatKey = null;
    document.getElementById('catForm')?.reset();
    document.getElementById('catModalTitle').textContent = 'إضافة قسم جديد';
    
    // Hide items section when adding new cat
    const itemsSection = document.getElementById('catItemsSection');
    if (itemsSection) itemsSection.style.display = 'none';

    document.getElementById('catModal')?.classList.add('open');
}

function closeCatModal() {
    document.getElementById('catModal')?.classList.remove('open');
    editingCatKey = null;
}

function editCategory(key) {
    const cat = categoryItems.find(c => c.id === key);
    if (!cat) return;
    editingCatKey = key;
    document.getElementById('catModalTitle').textContent = `تعديل: ${cat.nameAr}`;
    document.getElementById('catNameAr').value  = cat.nameAr || '';
    document.getElementById('catNameEn').value  = cat.nameEn || '';
    document.getElementById('catSection').value = cat.section || 'arabic';
    document.getElementById('catIcon').value    = cat.icon   || '';
    document.getElementById('catOrder').value   = cat.order  || 0;
    
    // Show items list
    document.getElementById('catItemsSection').style.display = 'block';
    renderItemsInCategory(key);

    document.getElementById('catModal')?.classList.add('open');
}

function renderItemsInCategory(catId) {
    const container = document.getElementById('catItemsList');
    if (!container) return;
    container.innerHTML = '';

    const items = menuItems.filter(i => i.category === catId);
    if (items.length === 0) {
        container.innerHTML = '<div style="font-size:0.75rem; color:var(--text-3); text-align:center; padding:10px;">لا توجد أصناف في هذا القسم حالياً</div>';
        return;
    }

    items.forEach(item => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:8px; background:var(--bg-2); border-radius:8px; border:1px solid var(--border);';
        
        row.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:30px; height:30px; background-image:url(\'${item.image || 'images/tallo-logo.png'}\'); background-size:cover; border-radius:4px;"></div>
                <div style="font-size:0.8rem; font-weight:600;">${item.name}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <select onchange="moveItemToCategory(\'${item.firebaseKey}\', this.value, \'${catId}\')" style="font-size:0.7rem; padding:4px; border-radius:4px; background:var(--bg-3); color:var(--text); border:1px solid var(--border); outline:none; max-width:120px;">
                    <option value="" disabled selected>نقل إلى قسم آخر...</option>
                    ${categoryItems.filter(c => c.id !== catId).map(c => `<option value="${c.id}">${c.nameAr}</option>`).join('')}
                </select>
                <i class="fa-solid fa-up-down-left-right" title="نقل" style="font-size:0.7rem; color:var(--text-3);"></i>
            </div>
        `;
        container.appendChild(row);
    });
}

function moveItemToCategory(itemKey, newCatId, oldCatId) {
    const item = menuItems.find(i => i.firebaseKey === itemKey);
    const newCat = categoryItems.find(c => c.id === newCatId);
    const oldCat = categoryItems.find(c => c.id === oldCatId);

    if (!item || !newCat) return;

    if (!confirm(`هل أنت متأكد من نقل "${item.name}" من قسم "${oldCat?.nameAr}" إلى قسم "${newCat.nameAr}"؟`)) {
        renderItemsInCategory(oldCatId); // Reset UI
        return;
    }

    REFS.menu.child(itemKey).update({ category: newCatId })
        .then(() => {
            showToast(`✓ تم نقل "${item.name}" إلى ${newCat.nameAr}`);
            log('نقل صنف', `نقل "${item.name}" من ${oldCat?.nameAr || 'قسم'} إلى ${newCat.nameAr}`);
            renderItemsInCategory(oldCatId); // Refresh list
        })
        .catch(err => showToast('خطأ: ' + err.message, 'error'));
}

function saveCategory() {
    const nameAr = document.getElementById('catNameAr').value.trim();
    if (!nameAr) { showToast('يرجى إدخال اسم القسم', 'error'); return; }

    const catData = {
        nameAr,
        nameEn:  document.getElementById('catNameEn').value.trim(),
        section: document.getElementById('catSection').value,
        icon:    document.getElementById('catIcon').value.trim(),
        order:   parseInt(document.getElementById('catOrder').value) || 0,
    };

    if (editingCatKey) {
        REFS.categories.child(editingCatKey).update(catData)
            .then(() => { closeCatModal(); showToast('تم تحديث القسم ✓'); log('تعديل قسم', `تعديل: ${nameAr}`); })
            .catch(err => showToast('خطأ: ' + err.message, 'error'));
    } else {
        REFS.categories.push(catData)
            .then(() => { closeCatModal(); showToast('تم إضافة القسم ✓'); log('إضافة قسم', `إضافة: ${nameAr}`); })
            .catch(err => showToast('خطأ: ' + err.message, 'error'));
    }
}

function deleteCategory(key) {
    const count = menuItems.filter(i => i.category === key).length;
    if (count > 0) { showToast(`لا يمكن الحذف — يحتوي على ${count} أصناف`, 'error'); return; }
    if (!confirm('هل تريد حذف هذا القسم نهائياً؟')) return;
    REFS.categories.child(key).remove()
        .then(() => showToast('تم حذف القسم'))
        .catch(err => showToast('خطأ: ' + err.message, 'error'));
}

function restoreDefaultCategories() {
    if (!confirm('سيتم إضافة الأقسام الأساسية. متابعة؟')) return;
    const defaults = [
        { id: 'ar-break',   nameAr: 'الإفطار والمناقيش',   nameEn: 'Breakfast',             section: 'arabic',   order: 1,  icon: 'fa-bread-slice' },
        { id: 'ar-cold',    nameAr: 'مقبلات وسلطات',       nameEn: 'Starters & Salads',      section: 'arabic',   order: 2,  icon: 'fa-leaf' },
        { id: 'ar-lunch',   nameAr: 'أطباق الغداء',         nameEn: 'Main Dishes',            section: 'arabic',   order: 3,  icon: 'fa-utensils' },
        { id: 'ar-grill',   nameAr: 'مشاوي على الجمر',      nameEn: 'Charcoal Grills',        section: 'arabic',   order: 4,  icon: 'fa-fire' },
        { id: 'ar-sweets',  nameAr: 'الحلويات',             nameEn: 'Desserts',               section: 'arabic',   order: 5,  icon: 'fa-ice-cream' },
        { id: 'in-app',     nameAr: 'مقبلات عالمية',        nameEn: 'International Starters', section: 'intl',     order: 10, icon: 'fa-cheese' },
        { id: 'in-main',    nameAr: 'أطباق عالمية',         nameEn: 'Main Course',            section: 'intl',     order: 11, icon: 'fa-plate-wheat' },
        { id: 'in-pizza',   nameAr: 'بيتزا',                nameEn: 'Pizza',                  section: 'intl',     order: 12, icon: 'fa-pizza-slice' },
        { id: 's-hot',      nameAr: 'مشروبات ساخنة',        nameEn: 'Hot Drinks',             section: 'drinks',   order: 20, icon: 'fa-mug-hot' },
        { id: 's-ice',      nameAr: 'مشروبات مثلجة',        nameEn: 'Cold Drinks',            section: 'drinks',   order: 21, icon: 'fa-glass-water' },
        { id: 's-smoothie', nameAr: 'سموذي وميلك شيك',      nameEn: 'Smoothies',              section: 'drinks',   order: 22, icon: 'fa-blender' },
        { id: 's-other',    nameAr: 'مياه وغازيات',         nameEn: 'Soft Drinks',            section: 'drinks',   order: 23, icon: 'fa-bottle-water' },
        { id: 'arg-all',    nameAr: 'أراجيل منوعة',         nameEn: 'Argileh Selection',      section: 'argileh',  order: 30, icon: 'fa-smoking' },
    ];
    Promise.all(defaults.map(({ id, ...data }) => REFS.categories.child(id).set(data)))
        .then(() => { showToast('تمت استعادة الأقسام الأساسية ✓'); log('استعادة أقسام', 'استيراد الأقسام الافتراضية'); })
        .catch(err => showToast('خطأ: ' + err.message, 'error'));
}

// ══════════════ 21. MODAL OVERLAY CLOSE ══════════════
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
    });
});

// ══════════════ 22. AUDIT LOG HELPERS ══════════════
function log(action, details) {
    const user = localStorage.getItem('admin_user') || 'Admin';
    REFS.logs.push({ user, action, details, timestamp: Date.now() }).catch(() => {});
}

function logWithSnapshot(action, details, itemKey, snapshot, diff = []) {
    const user = localStorage.getItem('admin_user') || 'Admin';
    REFS.logs.push({ user, action, details, itemKey, snapshot, diff, timestamp: Date.now() }).catch(() => {});
}

function calculateItemDiff(oldObj, newObj) {
    const fields = {
        name:     'الاسم العربي',
        nameEn:   'الاسم الإنجليزي',
        category: 'القسم',
        price:    'السعر',
        status:   'الحالة',
        desc:     'الوصف العربي',
        descEn:   'الوصف الإنجليزي',
        prepTime: 'وقت التحضير',
        calories: 'السعرات',
        featured: 'مميز'
    };
    const diff = [];
    Object.keys(fields).forEach(key => {
        let oldVal = oldObj[key];
        let newVal = newObj[key];
        
        // Normalize for comparison
        if (oldVal === undefined || oldVal === null) oldVal = '';
        if (newVal === undefined || newVal === null) newVal = '';
        
        if (String(oldVal) !== String(newVal)) {
            let oldDisp = oldVal;
            let newDisp = newVal;
            
            // Map values for better readability
            if (key === 'status') {
                oldDisp = oldVal === 'inactive' ? 'مخفي' : 'نشط';
                newDisp = newVal === 'inactive' ? 'مخفي' : 'نشط';
            }
            if (key === 'featured') {
                oldDisp = oldVal ? 'نعم' : 'لا';
                newDisp = newVal ? 'نعم' : 'لا';
            }
            if (key === 'category') {
                const cOld = categoryItems.find(c => c.id === oldVal);
                const cNew = categoryItems.find(c => c.id === newVal);
                oldDisp = cOld ? cOld.nameAr : oldVal;
                newDisp = cNew ? cNew.nameAr : newVal;
            }

            diff.push({ label: fields[key], old: oldDisp, new: newDisp });
        }
    });
    return diff;
}

// ══════════════ 23. TOAST ══════════════
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.success} toast-icon"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.cssText = 'opacity:0;transform:translateX(20px);transition:0.3s;';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

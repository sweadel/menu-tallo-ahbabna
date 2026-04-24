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
    feedback:   db.ref('feedback'),
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
    const grid  = document.getElementById('deleted-items-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!data) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-trash-can"></i><h3>السلة فارغة</h3><p>لا توجد أصناف محذوفة</p></div>`;
        return;
    }

    Object.entries(data).forEach(([key, item]) => {
        const date    = new Date(item.deletedAt).toLocaleString('ar-EG');
        const catObj  = categoryItems.find(c => c.id === item.category);
        const catName = catObj ? catObj.nameAr : (item.category || '-');
        
        const card = document.createElement('div');
        card.className = 'deleted-card';
        card.innerHTML = `
            <div class="dc-header">
                <div class="dc-thumb" style="background-image:url('${item.image || 'images/tallo-logo.png'}')"></div>
                <div class="dc-info">
                    <div class="dc-name">${item.name || 'بدون اسم'}</div>
                    <div class="dc-en">${item.nameEn || ''}</div>
                </div>
            </div>
            <div class="dc-meta">
                <div><i class="fa-solid fa-folder"></i> ${catName}</div>
                <div><i class="fa-solid fa-clock"></i> ${date}</div>
                <div><i class="fa-solid fa-tag"></i> ${item.price ? item.price + ' د.أ' : '—'}</div>
            </div>
            <div class="dc-actions">
                <button class="btn btn-secondary btn-sm" onclick="restoreItem('${key}')" style="flex:1;"><i class="fa-solid fa-rotate-left"></i> استعادة</button>
                <button class="btn btn-danger btn-sm" onclick="permanentDelete('${key}')" style="padding:7px 10px;"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
});

// ══════════════ 7. DESIGN SETTINGS LISTENER ══════════════
REFS.design.on('value', snapshot => {
    if (isSavingDesign) return; 
    const d = snapshot.val();
    if (!d) return;
    
    const sv = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) {
            const strVal = String(val);
            if (document.activeElement !== el && el.value !== strVal) el.value = strVal;
        }
    };
    const sc = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.checked = val === true;
    };

    // 1. Colors
    sv('d_primaryColor', d.primaryColor || '#E5C467');
    sv('d_primaryColorText', d.primaryColor || '#E5C467');
    sv('d_pageBg', d.pageBg || '#14110e');
    sv('d_pageBgText', d.pageBg || '#14110e');
    sv('d_cardBg', d.cardBg || '#26221f');
    sv('d_cardBgText', d.cardBg || '#26221f');

    // 2. Typography
    sv('d_fontFamily', d.fontFamily || 'IBM Plex Sans Arabic');
    sc('d_fontBold', d.fontBold !== false);
    sv('d_cardStyle', d.cardStyle || 'modern');

    // 3. Header
    sv('d_logoUrl', d.logoUrl || 'images/tallo-logo.png');
    sv('d_logoHeight', d.logoHeight || 105);
    sv('d_headerBg', d.headerBg || 'images/header-sadu-final.png');
    sv('d_headerOpacity', d.headerOpacity || 0.3);

    // 4. Tabs & Search
    sv('d_labelArabic', d.labelArabic || 'المنيو العربي');
    sv('d_labelIntl', d.labelIntl || 'الانترناشونال');
    sv('d_labelDesserts', d.labelDesserts || 'الحلويات');
    sv('d_labelDrinks', d.labelDrinks || 'المشروبات');
    sv('d_labelArgileh', d.labelArgileh || 'الأراجيل');
    sc('d_showSearch', d.showSearch !== false);
    sv('pill_activeBg', d.pillActiveBg || '#E5C467');
    sv('pill_textColor', d.pillTextColor || '#8a8580');

    // 5. Promo Banner
    sc('d_bannerActive', d.bannerActive || false);
    sv('d_bannerText', d.bannerText || '');
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
    
    const designData = {
        primaryColor:  gv('d_primaryColor'),
        pageBg:        gv('d_pageBg'),
        cardBg:        gv('d_cardBg'),
        fontFamily:    gv('d_fontFamily'),
        fontBold:      gc('d_fontBold'),
        cardStyle:     gv('d_cardStyle'),
        logoUrl:       gv('d_logoUrl'),
        logoHeight:    gv('d_logoHeight'),
        headerBg:      gv('d_headerBg'),
        headerOpacity: gv('d_headerOpacity'),
        labelArabic:   gv('d_labelArabic'),
        labelIntl:     gv('d_labelIntl'),
        labelDesserts: gv('d_labelDesserts'),
        labelDrinks:   gv('d_labelDrinks'),
        labelArgileh:  gv('d_labelArgileh'),
        showSearch:    gc('d_showSearch'),
        pillActiveBg:  gv('pill_activeBg'),
        pillTextColor: gv('pill_textColor'),
        bannerActive:  gc('d_bannerActive'),
        bannerText:    gv('d_bannerText'),
        updatedAt:     Date.now()
    };

    isSavingDesign = true;
    const btn = document.querySelector('[onclick="saveDesign()"]');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';

    REFS.design.set(designData)
        .then(() => {
            showToast('✓ تم تطبيق وحفظ إعدادات التصميم بنجاح');
            log('تحديث التصميم', 'تعديل شامل للمظهر من لوحة التحكم');
        })
        .catch(err => showToast('خطأ: ' + err.message, 'error'))
        .finally(() => {
            setTimeout(() => { isSavingDesign = false; }, 1000);
            if (btn) btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> حفظ وتطبيق التصميم';
        });
}

// ══════════════ 8. HOME SETTINGS LISTENER ══════════════
REFS.home.on('value', snapshot => {
    if (isSavingHome) return;
    const h = snapshot.val();
    if (!h) return;
    
    const sv = (id, val) => { 
        const el = document.getElementById(id); 
        if(el && document.activeElement !== el) el.value = val || ''; 
    };
    const sc = (id, val) => { 
        const el = document.getElementById(id); 
        if(el) el.checked = val !== false; 
    };

    sc('h_btn_ar', h.showBtnAr);
    sc('h_btn_en', h.showBtnEn);
    sc('h_btn_feed', h.showBtnFeed);
    sv('h_whatsapp', h.whatsapp);
    sv('h_instagram', h.instagram);
    sv('h_facebook', h.facebook);
    sv('h_maps', h.maps);
    sv('h_video', h.homeVideo);
    sv('h_tagline', h.homeTagline);
    sv('h_overlay', h.homeOverlay);
    sv('h_logoSize', h.homeLogoSize);
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
    const grid = document.getElementById('users-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const data = snapshot.val();
    if (!data) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-users"></i><h3>لا توجد حسابات</h3><p>أضف حسابات للمدراء والمحررين</p></div>`;
        return;
    }

    const roleMap = { admin: '👑 مدير نظام', manager: '🛠️ مدير فرع', viewer: '👁️ مشاهد' };
    Object.entries(data).forEach(([key, user]) => {
        const date = user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-EG') : '-';
        const card = document.createElement('div');
        card.className = 'user-card';
        card.innerHTML = `
            <div class="user-card-header">
                <div class="user-avatar"><i class="fa-solid fa-user-shield"></i></div>
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    <div class="user-role">${roleMap[user.role] || user.role}</div>
                </div>
            </div>
            <div class="user-card-body">
                <div class="u-meta"><i class="fa-regular fa-calendar"></i> انضم في: ${date}</div>
                <div class="u-meta"><i class="fa-solid fa-circle-check" style="color:var(--green)"></i> حالة الحساب: نشط</div>
            </div>
            <div class="user-card-actions">
                <button class="btn btn-secondary btn-sm" onclick="editUser('${key}')"><i class="fa-solid fa-pen"></i> تعديل</button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser('${key}')"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
        `;
        grid.appendChild(card);
    });
});

// ══════════════ 10. AUDIT LOG LISTENER ══════════════
REFS.logs.on('value', snapshot => {
    const timeline = document.getElementById('audit-timeline');
    if (!timeline) return;
    timeline.innerHTML = '';

    const data = snapshot.val();
    if (!data) {
        timeline.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-3);">لا يوجد نشاط مسجل حالياً</div>`;
        return;
    }

    // Newest first
    const entries = Object.entries(data).sort((a,b) => b[1].timestamp - a[1].timestamp).slice(0, 50);

    entries.forEach(([logKey, entry]) => {
        const date = new Date(entry.timestamp).toLocaleString('ar-EG');
        const item = document.createElement('div');
        item.className = 'timeline-item';

        let icon = 'fa-pen';
        let iconBg = 'var(--blue)';
        if(entry.action?.includes('إضافة') || entry.action?.includes('استعادة')) { icon = 'fa-plus'; iconBg = 'var(--green)'; }
        if(entry.action?.includes('حذف')) { icon = 'fa-trash'; iconBg = 'var(--red)'; }

        let detailsHtml = `<div class="tl-title">${entry.details || ''}</div>`;
        if (entry.diff && entry.diff.length > 0) {
            detailsHtml += `<div class="log-diff-list">`;
            entry.diff.forEach(d => {
                detailsHtml += `<div class="log-diff-item">
                    <span class="field">${d.label}:</span> 
                    <span class="old">${d.old || '—'}</span> 
                    <i class="fa-solid fa-arrow-left" style="font-size:0.6rem;margin:0 6px;opacity:0.5;"></i>
                    <span class="new">${d.new || '—'}</span>
                </div>`;
            });
            detailsHtml += `</div>`;
        }

        item.innerHTML = `
            <div class="tl-icon" style="background:${iconBg}"><i class="fa-solid ${icon}"></i></div>
            <div class="tl-content">
                <div class="tl-header">
                    <span class="tl-action">${entry.action || 'عملية'}</span>
                    <span class="tl-date">${date}</span>
                </div>
                <div class="tl-user"><i class="fa-solid fa-user-circle"></i> بواسطة: ${entry.user || 'Admin'}</div>
                <div class="tl-body">${detailsHtml}</div>
                ${entry.snapshot && entry.itemKey ? `<div class="tl-actions"><button class="btn btn-secondary btn-sm" onclick="revertLog('${entry.itemKey}', '${logKey}')"><i class="fa-solid fa-rotate-left"></i> تراجع</button></div>` : ''}
            </div>
        `;
        timeline.appendChild(item);
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
    
    // Add feedback count stat if the element exists
    REFS.feedback.once('value').then(snap => {
        const feedCount = snap.val() ? Object.keys(snap.val()).length : 0;
        if (el('stat-feedback')) el('stat-feedback').textContent = feedCount;
    });
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
    
    if (!url) {
        img.classList.remove('visible');
        img.src = '';
        if (ph) ph.style.display = 'flex';
        return;
    }

    // Try to load the image
    img.src = url;
    img.onload = () => {
        img.classList.add('visible');
        if (ph) ph.style.display = 'none';
    };
    
    img.onerror = () => {
        // If it's a relative path starting with images/ and fails, it might need to climb up one level or be absolute
        console.warn("Retrying image load for:", url);
        img.classList.remove('visible');
        if (ph) ph.style.display = 'flex';
    };
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
                const diff = calculateItemDiff(oldSnapshot, itemData);
                logWithSnapshot('تعديل صنف', `تعديل: ${name}`, editingKey, oldSnapshot, diff);
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
        const isHidden = cat.status === 'hidden';

        const card = document.createElement('div');
        card.className = `cat-card ${isHidden ? 'dimmed' : ''}`;
        card.innerHTML = `
            <div class="cat-card-icon"><i class="fa-solid ${cat.icon || 'fa-folder'}"></i></div>
            <div class="cat-card-info">
                <h3>${cat.nameAr} ${isHidden ? '<span style="font-size:0.6rem;color:var(--red);">(مخفي)</span>' : ''}</h3>
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
    
    // Default values
    document.getElementById('catStatus').value = 'active';

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
    document.getElementById('catStatus').value  = cat.status || 'active';
    
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
        status:  document.getElementById('catStatus').value || 'active'
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
        // ── المنيو العربي (arabic) ──
        { id: 'ar-break',   nameAr: 'الإفطار والمناقيش',   nameEn: 'Breakfast & Manaqeesh',  section: 'arabic',   order: 1,  icon: 'fa-bread-slice' },
        { id: 'ar-salads',  nameAr: 'مقبلات وسلطات',       nameEn: 'Starters & Salads',      section: 'arabic',   order: 2,  icon: 'fa-leaf' },
        { id: 'ar-cold',    nameAr: 'مقبلات باردة',        nameEn: 'Cold Appetizers',        section: 'arabic',   order: 2,  icon: 'fa-bowl-rice' },
        { id: 'ar-hot',     nameAr: 'مقبلات ساخنة',        nameEn: 'Hot Appetizers',         section: 'arabic',   order: 3,  icon: 'fa-fire-burner' },
        { id: 'ar-lunch',   nameAr: 'أطباق الغداء',         nameEn: 'Main Lunch Dishes',      section: 'arabic',   order: 4,  icon: 'fa-utensils' },
        { id: 'ar-grill',   nameAr: 'مشاوي على الجمر',      nameEn: 'Charcoal Grills',        section: 'arabic',   order: 5,  icon: 'fa-fire' },
        { id: 'ar-sweets',  nameAr: 'الحلويات',             nameEn: 'Desserts',               section: 'arabic',   order: 6,  icon: 'fa-ice-cream' },

        // ── انترناشونل (intl) ──
        { id: 'in-salads',  nameAr: 'سلطات عالمية',         nameEn: 'International Salads',   section: 'intl',     order: 10, icon: 'fa-leaf' },
        { id: 'in-app',     nameAr: 'مقبلات عالمية',        nameEn: 'International Starters', section: 'intl',     order: 11, icon: 'fa-cheese' },
        { id: 'in-lunch',   nameAr: 'ساندويشات غداء',        nameEn: 'Lunch Sandwiches',       section: 'intl',     order: 12, icon: 'fa-hamburger' },
        { id: 'in-main',    nameAr: 'أطباق عالمية',         nameEn: 'International Main',     section: 'intl',     order: 13, icon: 'fa-plate-wheat' },
        { id: 'in-pizza',   nameAr: 'بيتزا',                nameEn: 'Pizza',                  section: 'intl',     order: 14, icon: 'fa-pizza-slice' },

        // ── المشروبات (drinks) ──
        { id: 's-specialty',nameAr: 'قهوة مختصة',           nameEn: 'Specialty Coffee',       section: 'drinks',   order: 20, icon: 'fa-coffee' },
        { id: 's-hot',      nameAr: 'مشروبات ساخنة',        nameEn: 'Hot Drinks',             section: 'drinks',   order: 21, icon: 'fa-mug-hot' },
        { id: 's-ice',      nameAr: 'مشروبات مثلجة',        nameEn: 'Iced Coffee',            section: 'drinks',   order: 22, icon: 'fa-glass-water' },
        { id: 's-smoothie', nameAr: 'سموذي وميلك شيك',      nameEn: 'Smoothies & Shakes',     section: 'drinks',   order: 23, icon: 'fa-blender' },
        { id: 's-mojito',   nameAr: 'موهيتو',               nameEn: 'Mojito Selection',       section: 'drinks',   order: 24, icon: 'fa-glass-citrus' },
        { id: 's-cold',     nameAr: 'عصائر طازجة',          nameEn: 'Fresh Juices',           section: 'drinks',   order: 25, icon: 'fa-carrot' },
        { id: 's-other',    nameAr: 'مواه وغازيات',         nameEn: 'Water & Soft Drinks',    section: 'drinks',   order: 26, icon: 'fa-bottle-water' },

        // ── أراجيل (argileh) ──
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

// ══════════════ 24. EXPORT TO CSV ══════════════
function exportToCSV() {
    if (!menuItems || menuItems.length === 0) {
        showToast('لا توجد بيانات للتصدير', 'error');
        return;
    }
    
    // Create CSV header
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Adding BOM for Arabic support
    csvContent += "الاسم العربي,الاسم الانجليزي,القسم,السعر,الحالة,الفئة (الرئيسية)\r\n";

    menuItems.forEach(item => {
        const catObj = categoryItems.find(c => c.id === item.category);
        const catName = catObj ? catObj.nameAr : '-';
        const secName = catObj ? catObj.section : '-';
        const price = item.price ? item.price : '0';
        const status = item.status === 'inactive' ? 'مخفي' : 'نشط';
        
        let row = [
            `"${item.name || ''}"`,
            `"${item.nameEn || ''}"`,
            `"${catName}"`,
            `"${price}"`,
            `"${status}"`,
            `"${secName}"`
        ];
        csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `menu_prices_export_${new Date().toLocaleDateString('ar-EG').replace(/\//g,'-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('تم تصدير ملف الأسعار ✓');
    log('تصدير بيانات', 'تم تصدير ملف المنيو والأسعار');
}

// ══════════════ 25. FEEDBACK MANAGEMENT ══════════════
REFS.feedback.on('value', snapshot => {
    const data = snapshot.val();
    const grid = document.getElementById('feedback-grid');
    const badge = document.getElementById('feedback-count-badge');
    if (!grid) return;
    grid.innerHTML = '';

    if (!data) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-comment-dots"></i><h3>لا توجد آراء حالياً</h3><p>ستظهر هنا التقييمات المرسلة من الزبائن</p></div>`;
        if(badge) badge.textContent = '0';
        return;
    }

    const entries = Object.entries(data).reverse(); // Newest first
    if(badge) badge.textContent = entries.length;

    entries.forEach(([key, f]) => {
        const date = f.timestamp ? new Date(f.timestamp).toLocaleString('ar-EG') : (f.dateStr || '-');
        const card = document.createElement('div');
        card.className = 'feedback-card';
        
        let ratingsHtml = '<div class="f-ratings">';
        if(f.ratings) {
            Object.entries(f.ratings).forEach(([label, val]) => {
                const labelAr = { service: 'الخدمة', food: 'الطعام', atmosphere: 'الأجواء' }[label] || label;
                ratingsHtml += `<div class="f-rate-item"><span>${labelAr}</span> <span class="stars">${'⭐'.repeat(val)}${'<i class="fa-regular fa-star" style="color:var(--text-3);opacity:0.3;font-size:0.7rem;"></i>'.repeat(5-val)}</span></div>`;
            });
        }
        ratingsHtml += '</div>';

        card.innerHTML = `
            <div class="f-card-header">
                <div class="f-avatar"><i class="fa-solid fa-user"></i></div>
                <div class="f-user-info">
                    <div class="f-name">${f.name || 'زبون (غير معروف)'}</div>
                    <div class="f-date">${date}</div>
                </div>
                <button class="icon-btn danger f-del" onclick="deleteFeedback('${key}')" title="حذف"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="f-card-meta">
                ${f.phone ? `<div><i class="fa-solid fa-phone"></i> ${f.phone}</div>` : ''}
                ${f.table ? `<div><i class="fa-solid fa-chair"></i> طاولة: ${f.table}</div>` : ''}
            </div>
            ${ratingsHtml}
            <div class="f-card-comment">
                ${f.comments ? `"${f.comments}"` : '<span style="color:var(--text-3);font-style:italic;">بدون تعليق نصي</span>'}
            </div>
        `;
        grid.appendChild(card);
    });
});

function deleteFeedback(key) {
    if(!confirm('هل تريد حذف هذا التقييم؟')) return;
    REFS.feedback.child(key).remove()
        .then(() => showToast('تم حذف التقييم'))
        .catch(err => showToast('خطأ: ' + err.message, 'error'));
}

function clearFeedback() {
    if(!confirm('تحذير: سيتم مسح كافة التقييمات نهائياً. هل أنت متأكد؟')) return;
    REFS.feedback.remove()
        .then(() => showToast('تم مسح جميع التقييمات'))
        .catch(err => showToast('خطأ: ' + err.message, 'error'));
}

// ══════════════ 26. AUDIT LOG ACTIONS ══════════════
function revertLog(itemKey, logKey) {
    if (!confirm('هل تريد التراجع عن هذا التعديل وإعادة الصنف لحالته السابقة؟')) return;
    
    REFS.logs.child(logKey).once('value').then(snap => {
        const entry = snap.val();
        if (!entry || !entry.snapshot) { 
            showToast('لا يمكن التراجع عن هذه العملية (لا توجد نسخة احتياطية)', 'error'); 
            return; 
        }
        
        REFS.menu.child(itemKey).update(entry.snapshot)
            .then(() => {
                showToast('تم التراجع عن التعديل بنجاح ✓');
                log('تراجع (Undo)', `تم التراجع عن العملية: ${entry.action}`);
            })
            .catch(err => showToast('خطأ في استرجاع البيانات: ' + err.message, 'error'));
    });
}

function clearAuditLogs() {
    if (!confirm('هل أنت متأكد من مسح سجل العمليات بالكامل؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    REFS.logs.remove()
        .then(() => showToast('تم مسح السجل بنجاح'))
        .catch(err => showToast('خطأ: ' + err.message, 'error'));
}

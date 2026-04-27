/**
 * js/admin.js v15.0 — النسخة الاحترافية الشاملة والمطورة
 * مطعم طلو احبابنا | Tallo Ahbabna
 * تم إعادة هيكلة الكود بالكامل لضمان الأداء العالي ومنع التكرار.
 */

// 1. التحقق من الصلاحيات
if (localStorage.getItem('admin_auth') !== 'true') {
    window.location.href = 'login.html';
}

// 2. إعدادات Firebase
const fbCfg = {
    apiKey: "AIzaSyCwMxgmrfnsme4pgLx00tgjGCo-gQBMUo8",
    authDomain: "tallow-ahbabna.firebaseapp.com",
    projectId: "tallow-ahbabna",
    storageBucket: "tallow-ahbabna.firebasestorage.app",
    messagingSenderId: "1025966646494",
    appId: "1:1025966646494:web:f89373fad63d988f298e4f",
    databaseURL: "https://tallow-ahbabna-default-rtdb.firebaseio.com"
};
if (!firebase.apps.length) firebase.initializeApp(fbCfg);
const db = firebase.database();

const REFS = {
    menu: db.ref('menu_items'),
    cats: db.ref('categories_meta'),
    logs: db.ref('audit_logs'),
    trash: db.ref('deleted_items'),
    design: db.ref('settings/design'),
    home: db.ref('settings/home'),
    feed: db.ref('feedback')
};

// 3. المتغيرات العامة
let menuItems = [], catItems = [], feedItems = [];
let editKey = null, editCatKey = null, isSaving = false, activeFilterCat = 'all';

// ══════════════════════════════════════════════
// 4. نظام التنقل والتحكم في الواجهة
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════
// 4. نظام التنقل والتحكم في الواجهة
// ══════════════════════════════════════════════

function navigateTo(id) {
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-view="${id}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });

    const targetView = document.getElementById(id);
    if (targetView) {
        targetView.classList.add('active');
    }

    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    localStorage.setItem('last_admin_view', id);

    // تحديث الجداول عند التنقل
    if (id === 'view-menu') renderTable();
    if (id === 'view-categories') renderCatTable();
    if (id === 'view-feedback') renderFeedTable();
    if (id === 'view-design') loadDesign();
    if (id === 'view-settings') {
        const u = document.getElementById('current-user-display-settings');
        if(u) u.textContent = localStorage.getItem('admin_user') || 'المدير العام';
    }
}

function loadDesign() {
    REFS.design.once('value', s => {
        const d = s.val() || {};
        if (document.getElementById('design-gold')) document.getElementById('design-gold').value = d.gold || '#C5A022';
        if (document.getElementById('design-bg')) document.getElementById('design-bg').value = d.bg || '#0a0a0a';
        if (document.getElementById('design-font')) document.getElementById('design-font').value = d.font || "'Cairo', sans-serif";
    });
    
    REFS.home.once('value', s => {
        const h = s.val() || {};
        if (document.getElementById('promo-status')) document.getElementById('promo-status').value = h.promoShow ? 'show' : 'hide';
        if (document.getElementById('promo-text')) document.getElementById('promo-text').value = h.promoText || '';
    });
}

function saveDesign() {
    if (isSaving) return;
    isSaving = true;
    
    const dData = {
        gold: document.getElementById('design-gold').value,
        bg: document.getElementById('design-bg').value,
        font: document.getElementById('design-font').value,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    const hData = {
        promoShow: document.getElementById('promo-status').value === 'show',
        promoText: document.getElementById('promo-text').value.trim(),
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    Promise.all([
        REFS.design.update(dData),
        REFS.home.update(hData)
    ]).then(() => {
        showToast('تم حفظ إعدادات التصميم بنجاح ✨');
    }).catch(err => {
        showToast('خطأ أثناء الحفظ', 'error');
        console.error(err);
    }).finally(() => isSaving = false);
}

function toggleSidebar() {
    const s = document.getElementById('sidebar');
    if(s) s.classList.toggle('open');
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    const color = type === 'success' ? 'var(--green)' : 'var(--red)';
    
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color:${color}; font-size:1.2rem;"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-20px)';
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}

// ══════════════════════════════════════════════
// 5. إدارة البيانات والرندرة
// ══════════════════════════════════════════════

REFS.menu.on('value', snap => {
    menuItems = [];
    if (snap.exists()) Object.entries(snap.val()).forEach(([k, v]) => menuItems.push({ key: k, ...v }));
    renderTable();
    updateStats();
});

REFS.cats.on('value', snap => {
    catItems = [];
    if (snap.exists()) Object.entries(snap.val()).forEach(([k, v]) => catItems.push({ id: k, ...v }));
    catItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    rebuildSelects();
    renderCatTable();
    updateStats();
});

function updateStats() {
    const t = document.getElementById('stat-total'), 
          c = document.getElementById('stat-cats'), 
          f = document.getElementById('stat-feed');
    if (t) t.textContent = menuItems.length;
    if (c) c.textContent = catItems.filter(cat => cat.status !== 'hidden').length;
    
    // جلب عدد التعليقات
    REFS.feed.once('value', s => {
        if (f) f.textContent = s.numChildren();
        feedItems = [];
        if (s.exists()) Object.entries(s.val()).forEach(([k,v]) => feedItems.push({key:k, ...v}));
        feedItems.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
    });
}

function renderFeedTable() {
    const body = document.getElementById('feed-table-body');
    if (!body) return;

    if (feedItems.length === 0) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:50px; color:var(--text-dim);">لا توجد ملاحظات حالياً</td></tr>';
        return;
    }

    body.innerHTML = feedItems.map(item => {
        const date = item.timestamp ? new Date(item.timestamp).toLocaleString('ar-JO') : 'غير معروف';
        const rating = '⭐'.repeat(item.rating || 5);
        return `
            <tr>
                <td><b>${item.name || 'زائر'}</b><br><small>${item.phone || ''}</small></td>
                <td><div style="color:var(--gold);">${rating}</div></td>
                <td><div style="max-width:300px; white-space:normal;">${item.comment || 'بدون تعليق'}</div></td>
                <td><small>${date}</small></td>
                <td>
                    <button class="btn-icon" style="color:var(--red);" onclick="deleteFeed('${item.key}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
    }).join('');
}

function deleteFeed(key) {
    if (confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
        REFS.feed.child(key).remove().then(() => showToast('تم الحذف'));
    }
}

function renderTable() {
    const tableBody = document.getElementById('menu-table-body');
    if (!tableBody) return;

    const searchQuery = (document.getElementById('globalSearch')?.value || '').toLowerCase();
    const filtered = menuItems.filter(item => {
        const matchesCat = (activeFilterCat === 'all' || item.category === activeFilterCat);
        const matchesSearch = (!searchQuery || (item.name || '').toLowerCase().includes(searchQuery) || (item.nameEn || '').toLowerCase().includes(searchQuery));
        return matchesCat && matchesSearch;
    });

    tableBody.innerHTML = filtered.map(item => {
        const isActive = item.status !== 'inactive';
        let badgeHtml = '';
        if (item.badge === 'HOT') badgeHtml = `<span class="status-pill" style="background:rgba(255, 94, 87, 0.1); color:var(--red); border:none; padding:4px 8px; font-size:0.7rem;">حار 🔥</span>`;
        if (item.badge === 'NEW') badgeHtml = `<span class="status-pill" style="background:rgba(29, 209, 161, 0.1); color:var(--green); border:none; padding:4px 8px; font-size:0.7rem;">جديد ✨</span>`;
        if (item.badge === 'SPECIAL') badgeHtml = `<span class="status-pill" style="background:rgba(197, 160, 34, 0.1); color:var(--gold); border:none; padding:4px 8px; font-size:0.7rem;">مميز ⭐</span>`;
        
        const catName = catItems.find(c => c.id === item.category)?.nameAr || item.category;

        return `
            <tr>
                <td><input type="checkbox" class="bulk-item" data-key="${item.key}" onchange="updateBulkPanel()" /></td>
                <td>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <img src="${item.image || 'images/tallo-logo.png'}" class="item-thumb" onerror="this.src='images/tallo-logo.png'" />
                        <div>
                            <div style="display:flex; align-items:center; gap:8px;">${badgeHtml} <span class="item-name">${item.name}</span></div>
                            <small class="item-en" style="display:block;">${item.nameEn || ''}</small>
                        </div>
                    </div>
                </td>
                <td><span style="background:rgba(255,255,255,0.05); padding:5px 12px; border-radius:10px; font-size:0.85rem;">${catName}</span></td>
                <td style="color:var(--gold); font-weight:800; font-size:1.1rem;">${item.price} <small>JD</small></td>
                <td>
                    <div class="status-pill ${isActive ? 'status-active' : 'status-hidden'}" onclick="toggleItem('${item.key}','${item.status}')" style="cursor:pointer;">
                        <i class="fas ${isActive ? 'fa-eye' : 'fa-eye-slash'}"></i> ${isActive ? 'نشط' : 'مخفي'}
                    </div>
                </td>
                <td>
                    <div class="action-btns" style="justify-content:center;">
                        <button class="btn-icon" onclick="editItem('${item.key}')" title="تعديل"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-icon" style="color:var(--red);" onclick="deleteItem('${item.key}')" title="حذف"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
    updateBulkPanel();
}

function updateBulkPanel() {
    const checked = document.querySelectorAll('.bulk-item:checked');
    const panel = document.getElementById('itemsBulkActions');
    const count = document.getElementById('bulkCount');
    if (panel) {
        panel.style.display = checked.length > 0 ? 'flex' : 'none';
        if(count) count.textContent = checked.length;
    }
}

function bulkDeleteItems() {
    const checked = document.querySelectorAll('.bulk-item:checked');
    if (confirm(`هل أنت متأكد من حذف ${checked.length} طبق؟`)) {
        checked.forEach(el => {
            const key = el.getAttribute('data-key');
            REFS.menu.child(key).remove();
        });
        showToast(`تم حذف ${checked.length} طبق بنجاح`);
    }
}

// ══════════════════════════════════════════════
// 6. المودالات والوظائف التفاعلية
// ══════════════════════════════════════════════

function openItemModal(key = null) {
    editKey = key;
    const modal = document.getElementById('itemModal');
    const form = document.getElementById('itemForm');
    form.reset();
    document.getElementById('itemKey').value = key || '';
    document.getElementById('itemModalTitle').textContent = key ? 'تعديل بيانات الطبق' : 'إضافة طبق ملكي جديد';
    
    // إخفاء حقول الأوزان افتراضياً
    const weightFields = document.getElementById('weightPricesFields');
    if (weightFields) weightFields.style.display = 'none';
    
    previewItemImage('');

    if (key) {
        const item = menuItems.find(i => i.key === key);
        if (item) {
            document.getElementById('itemName').value = item.name || '';
            document.getElementById('itemNameEn').value = item.nameEn || '';
            document.getElementById('itemPrice').value = item.price || '';
            document.getElementById('itemCategory').value = item.category || '';
            document.getElementById('itemImage').value = item.image || '';
            document.getElementById('itemBadge').value = item.badge || '';
            document.getElementById('itemPrepTime').value = item.prepTime || '';
            document.getElementById('itemDesc').value = item.desc || '';
            document.getElementById('itemDescEn').value = item.descEn || '';
            
            // تعبئة الأوزان إذا وجدت
            if (item.prices) {
                document.getElementById('priceQuarter').value = item.prices.quarter || '';
                document.getElementById('priceHalf').value = item.prices.half || '';
                document.getElementById('priceKilo').value = item.prices.kilo || '';
            }
            
            onCategoryChange(item.category);
            previewItemImage(item.image);
        }
    }
    modal.classList.add('active');
}

function onCategoryChange(catId) {
    const weightFields = document.getElementById('weightPricesFields');
    if (!weightFields) return;
    
    // إظهار حقول الأوزان فقط لقسم المشاوي
    if (catId === 'ar-grill') {
        weightFields.style.display = 'block';
    } else {
        weightFields.style.display = 'none';
    }
}

function closeItemModal() {
    document.getElementById('itemModal').classList.remove('active');
}

function saveItem() {
    if (isSaving) return;
    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    if (!name || !category) return showToast('يرجى ملء الاسم والقسم', 'error');

    isSaving = true;
    const data = {
        name,
        nameEn: document.getElementById('itemNameEn').value.trim(),
        category,
        price: document.getElementById('itemPrice').value.trim(),
        image: document.getElementById('itemImage').value.trim(),
        desc: document.getElementById('itemDesc').value.trim(),
        descEn: document.getElementById('itemDescEn').value.trim(),
        badge: document.getElementById('itemBadge').value || '',
        prepTime: document.getElementById('itemPrepTime')?.value.trim() || '',
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    // إضافة الأوزان إذا كان القسم هو المشاوي
    if (category === 'ar-grill') {
        data.prices = {
            quarter: document.getElementById('priceQuarter').value.trim(),
            half: document.getElementById('priceHalf').value.trim(),
            kilo: document.getElementById('priceKilo').value.trim()
        };
    } else {
        data.prices = null; // إزالة الأوزان إذا تم تغيير القسم
    }

    const ref = editKey ? REFS.menu.child(editKey) : REFS.menu.push();
    ref.update(data).then(() => {
        showToast('تم الحفظ بنجاح ✨');
        closeItemModal();
    }).finally(() => isSaving = false);
}

function renderCatTable() {
    const body = document.getElementById('cat-table-body');
    if (!body) return;

    body.innerHTML = catItems.map(cat => {
        const isActive = cat.status !== 'hidden';
        const itemCount = menuItems.filter(i => i.category === cat.id).length;
        
        return `
            <tr>
                <td><div class="stat-icon" style="width:45px; height:45px; font-size:1.2rem;"><i class="fa-solid ${cat.icon || 'fa-folder'}"></i></div></td>
                <td>
                    <div style="font-weight:800; color:#fff;">${cat.nameAr}</div>
                    <small style="color:var(--text-dim);">${cat.nameEn || ''}</small>
                </td>
                <td><span class="status-pill" style="background:rgba(255,255,255,0.05); border:none; color:var(--text-dim);">${cat.section}</span></td>
                <td><b style="color:var(--gold);">${itemCount}</b> <small>طبق</small></td>
                <td>
                    <div class="status-pill ${isActive ? 'status-active' : 'status-hidden'}" onclick="toggleCat('${cat.id}','${cat.status}')" style="cursor:pointer;">
                        ${isActive ? 'ظاهر للزبائن' : 'مخفي حالياً'}
                    </div>
                </td>
                <td>
                    <div class="action-btns" style="justify-content:center;">
                        <button class="btn-icon" onclick="editCat('${cat.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-icon" style="color:var(--red);" onclick="deleteCat('${cat.id}')"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function previewItemImage(url) {
    const img = document.getElementById('img-prev');
    if (img) img.src = url || 'images/tallo-logo.png';
}

function updateIconPreview(val) {
    const p = document.getElementById('icon-preview');
    if (p) p.innerHTML = `<i class="fa-solid ${val || 'fa-folder'}"></i>`;
}

function rebuildSelects() {
    const tabs = document.getElementById('categoryTabs');
    const select = document.getElementById('itemCategory');
    if (tabs) {
        tabs.innerHTML = `<button class="cat-filter-tab ${activeFilterCat==='all'?'active':''}" onclick="setFilterCat('all')">الكل</button>` +
            catItems.map(c => `<button class="cat-filter-tab ${activeFilterCat===c.id?'active':''}" onclick="setFilterCat('${c.id}')">${c.nameAr}</button>`).join('');
    }
    if (select) {
        select.innerHTML = '<option value="" disabled selected>اختر القسم...</option>' + 
            catItems.map(c => `<option value="${c.id}">${c.nameAr}</option>`).join('');
    }
}

function setFilterCat(id) { activeFilterCat = id; renderTable(); rebuildSelects(); }

function toggleItem(key, cur) {
    const next = cur === 'inactive' ? 'active' : 'inactive';
    REFS.menu.child(key).update({status: next}).then(() => showToast('تم تحديث الحالة'));
}

function toggleCat(id, cur) {
    const next = cur === 'hidden' ? 'active' : 'hidden';
    REFS.cats.child(id).update({status: next}).then(() => showToast('تم تحديث حالة القسم'));
}

function deleteItem(key) {
    if (confirm('هل أنت متأكد من حذف هذا الطبق؟')) {
        REFS.menu.child(key).remove().then(() => showToast('تم الحذف بنجاح'));
    }
}

function deleteCat(id) {
    if (confirm('هل أنت متأكد من حذف هذا القسم بالكامل؟')) {
        REFS.cats.child(id).remove().then(() => showToast('تم حذف القسم'));
    }
}

// ══════════════════════════════════════════════
// 8. تهيئة التطبيق
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('catIcon')?.addEventListener('input', e => updateIconPreview(e.target.value));
    
    const lastView = localStorage.getItem('last_admin_view') || 'view-dashboard';
    navigateTo(lastView);

    const userDisplay = document.getElementById('current-user-display');
    if (userDisplay) userDisplay.textContent = `مرحباً، ${localStorage.getItem('admin_user') || 'المدير العام'}`;

    // Select All logic
    document.getElementById('selectAllItems')?.addEventListener('change', (e) => {
        document.querySelectorAll('.bulk-item').forEach(cb => {
            cb.checked = e.target.checked;
        });
        updateBulkPanel();
    });
});

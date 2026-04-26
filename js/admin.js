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

function navigateTo(id) {
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-view="${id}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    document.querySelectorAll('.view').forEach(v => {
        v.style.display = 'none';
        v.classList.remove('active');
    });

    const targetView = document.getElementById(id);
    if (targetView) {
        targetView.style.display = 'block';
        setTimeout(() => targetView.classList.add('active'), 10);
    }

    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    localStorage.setItem('last_admin_view', id);

    // تحديث الجداول عند التنقل
    if (id === 'view-menu') renderTable();
    if (id === 'view-categories') renderCatTable();
    if (id === 'view-feedback') renderFeedTable();
    if (id === 'view-logs') renderLogsTable();
    if (id === 'view-trash') renderTrashTable();
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style = `
        padding: 14px 22px; background: #1a1a1a; 
        border-right: 4px solid ${type === 'success' ? '#2ecc71' : '#e74c3c'}; 
        color: #fff; border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.4); 
        font-size: 0.9rem; font-weight: 500; display: flex; align-items: center; 
        gap: 12px; margin-bottom: 10px; animation: toastSlideIn 0.4s ease forwards;
        pointer-events: all;
    `;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color:${type === 'success' ? '#2ecc71' : '#e74c3c'};"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ══════════════════════════════════════════════
// 5. إدارة البيانات (Menu & Categories)
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

function renderTable() {
    const canEdit = (localStorage.getItem('admin_role') || 'editor') !== 'viewer';
    const tableBody = document.getElementById('menu-table-body');
    if (!tableBody) return;

    const searchQuery = (document.getElementById('globalSearch')?.value || '').toLowerCase();
    const filtered = menuItems.filter(item => {
        const matchesCat = (activeFilterCat === 'all' || item.category === activeFilterCat);
        const matchesSearch = (!searchQuery || (item.name || '').toLowerCase().includes(searchQuery) || (item.nameEn || '').toLowerCase().includes(searchQuery));
        return matchesCat && matchesSearch;
    });
    filtered.sort((a, b) => (a.order || 0) - (b.order || 0));

    const itemsPerPage = 20;
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentPage = parseInt(localStorage.getItem('itemsPage') || '1');
    const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const paginationEl = document.getElementById('itemsPagination');
    if (paginationEl) {
        paginationEl.innerHTML = Array.from({length: totalPages}, (_, i) => 
            `<button class="btn-primary-sm ${i+1===currentPage?'active':''}" onclick="goToPage(${i+1})">${i+1}</button>`
        ).join('');
    }

    tableBody.innerHTML = pageItems.map(item => {
        const isActive = item.status !== 'inactive';
        let badgeHtml = '';
        if (item.badge === 'HOT') badgeHtml = `<span class="badge-tag bg-red">حار 🔥</span>`;
        if (item.badge === 'NEW') badgeHtml = `<span class="badge-tag bg-green">جديد ✨</span>`;
        if (item.badge === 'SPECIAL') badgeHtml = `<span class="badge-tag bg-gold">مميز ⭐</span>`;
        
        return `
            <tr>
                <td>${canEdit ? `<input type="checkbox" class="bulk-item" data-key="${item.key}" onchange="updateBulkPanel()" />` : ''}</td>
                <td><img src="${item.image || 'images/tallo-logo.png'}" class="item-thumb" onerror="this.src='images/tallo-logo.png'" /></td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">${badgeHtml} <span class="item-name">${item.name}</span></div>
                    <small class="item-en">${item.nameEn || ''}</small>
                </td>
                <td>
                    <select class="form-control-sm" onchange="quickMoveItem('${item.key}', this.value)" ${!canEdit?'disabled':''}>
                        ${catItems.map(c => `<option value="${c.id}" ${item.category === c.id ? 'selected' : ''}>${c.nameAr}</option>`).join('')}
                    </select>
                </td>
                <td style="color:var(--gold); font-weight:bold;">${item.price} JD</td>
                <td>
                    <button onclick="toggleItem('${item.key}','${item.status}')" class="status-pill ${isActive ? 'status-active' : 'status-hidden'}" ${!canEdit?'disabled':''}>
                        ${isActive ? 'نشط' : 'مخفي'}
                    </button>
                </td>
                <td>${item.badge || '---'}</td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-icon" onclick="moveItemOrder('${item.key}', -1)" ${!canEdit?'disabled':''}><i class="fa-solid fa-chevron-up"></i></button>
                        <button class="btn-icon" onclick="moveItemOrder('${item.key}', 1)" ${!canEdit?'disabled':''}><i class="fa-solid fa-chevron-down"></i></button>
                    </div>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon clone" onclick="cloneItem('${item.key}')" title="نسخ" ${!canEdit?'disabled':''}><i class="fa-solid fa-copy"></i></button>
                        <button class="btn-icon edit" onclick="editItem('${item.key}')" title="تعديل" ${!canEdit?'disabled':''}><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon delete" onclick="deleteItem('${item.key}')" title="حذف" ${!canEdit?'disabled':''}><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
    updateBulkPanel();
}

function updateBulkPanel() {
    const canEdit = (localStorage.getItem('admin_role') || 'editor') !== 'viewer';
    const anyChecked = document.querySelectorAll('.bulk-item:checked').length > 0;
    const bulkPanel = document.getElementById('itemsBulkActions');
    if (bulkPanel) bulkPanel.style.display = (canEdit && anyChecked) ? 'block' : 'none';
}

function goToPage(p) { localStorage.setItem('itemsPage', p); renderTable(); }

// ══════════════════════════════════════════════
// 6. التعامل مع المودالات (Modals)
// ══════════════════════════════════════════════

function openItemModal(key = null) {
    editKey = key;
    const modal = document.getElementById('itemModal');
    const form = document.getElementById('itemForm');
    form.reset();
    document.getElementById('itemKey').value = key || '';
    document.getElementById('itemModalTitle').textContent = key ? 'تعديل طبق' : 'إضافة طبق جديد';
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
            document.getElementById('itemStatus').value = item.status || 'active';
            document.getElementById('itemDesc').value = item.desc || '';
            document.getElementById('itemDescEn').value = item.descEn || '';
            previewItemImage(item.image);
        }
    }
    modal.classList.add('active');
    modal.style.display = 'flex';

    // إظهار حقول أسعار الأوزان إذا كان القسم "مشاوي"
    const weightPrices = document.getElementById('weightPricesFields');
    if (weightPrices) {
        const item = key ? menuItems.find(i => i.key === key) : null;
        if ((item && item.category === 'ar-grill') || document.getElementById('itemCategory').value === 'ar-grill') {
            weightPrices.style.display = 'block';
            if (item) {
                document.getElementById('priceQuarter').value = item.prices?.quarter || '';
                document.getElementById('priceHalf').value = item.prices?.half || '';
                document.getElementById('priceKilo').value = item.prices?.kilo || '';
            }
        } else {
            weightPrices.style.display = 'none';
        }
    }
}

function onCategoryChange(catId) {
    const weightPrices = document.getElementById('weightPricesFields');
    if (weightPrices) {
        weightPrices.style.display = (catId === 'ar-grill') ? 'block' : 'none';
    }
}

function closeItemModal() {
    const modal = document.getElementById('itemModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 400);
}

function saveItem() {
    if (isSaving) return;
    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    if (!name || !category) return showToast('يرجى ملء الحقول المطلوبة', 'error');

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
        status: document.getElementById('itemStatus').value || 'active',
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (category === 'ar-grill') {
        data.prices = {
            quarter: document.getElementById('priceQuarter').value.trim(),
            half: document.getElementById('priceHalf').value.trim(),
            kilo: document.getElementById('priceKilo').value.trim()
        };
    }

    if (!editKey) data.order = menuItems.length + 1;

    const ref = editKey ? REFS.menu.child(editKey) : REFS.menu.push();
    ref.update(data).then(() => {
        showToast('تم حفظ البيانات بنجاح');
        closeItemModal();
        log(editKey ? 'تعديل طبق' : 'إضافة طبق', name);
    }).finally(() => isSaving = false);
}

function openCatModal(key = null) {
    editCatKey = key;
    const modal = document.getElementById('catModal');
    const form = document.getElementById('catForm');
    form.reset();
    document.getElementById('catKey').value = key || '';
    document.getElementById('catModalTitle').textContent = key ? 'تعديل قسم' : 'إضافة قسم جديد';
    
    if (key) {
        const cat = catItems.find(c => c.id === key);
        if (cat) {
            document.getElementById('catNameAr').value = cat.nameAr || '';
            document.getElementById('catNameEn').value = cat.nameEn || '';
            document.getElementById('catSection').value = cat.section || 'food';
            document.getElementById('catIcon').value = cat.icon || '';
            document.getElementById('catOrder').value = cat.order || 0;
            document.getElementById('catDescAr').value = cat.descAr || '';
            document.getElementById('catDescEn').value = cat.descEn || '';
            document.querySelector(`input[name="catStatus"][value="${cat.status || 'active'}"]`).checked = true;
            updateIconPreview(cat.icon);
        }
    }
    modal.classList.add('active');
    modal.style.display = 'flex';
}

function closeCatModal() {
    const modal = document.getElementById('catModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 400);
}

function saveCategory() {
    const nameAr = document.getElementById('catNameAr').value.trim();
    if (!nameAr) return showToast('الاسم العربي مطلوب', 'error');

    const data = {
        nameAr,
        nameEn: document.getElementById('catNameEn').value.trim(),
        section: document.getElementById('catSection').value,
        order: parseInt(document.getElementById('catOrder').value) || 0,
        icon: document.getElementById('catIcon').value.trim() || 'fa-folder',
        descAr: document.getElementById('catDescAr').value.trim(),
        descEn: document.getElementById('catDescEn').value.trim(),
        status: document.querySelector('input[name="catStatus"]:checked').value,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    const id = editCatKey || nameAr.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u0621-\u064A-]/g, '');
    REFS.cats.child(id).update(data).then(() => {
        showToast('تم حفظ القسم بنجاح');
        closeCatModal();
        log('إدارة الأقسام', `حفظ قسم: ${nameAr}`);
    });
}

// ══════════════════════════════════════════════
// 7. وظائف إضافية
// ══════════════════════════════════════════════

function editItem(k) { openItemModal(k); }
function editCat(id) { openCatModal(id); }

function renderCatTable() {
    const body = document.getElementById('cat-table-body');
    if (!body) return;
    const canEdit = (localStorage.getItem('admin_role') || 'editor') !== 'viewer';

    body.innerHTML = catItems.map(cat => {
        const isActive = cat.status !== 'hidden';
        const itemCount = menuItems.filter(i => i.category === cat.id).length;
        
        return `
            <tr>
                <td><i class="fa-solid ${cat.icon || 'fa-folder'}" style="font-size:1.2rem; color:var(--gold);"></i></td>
                <td>
                    <div style="font-weight:bold;">${cat.nameAr}</div>
                    <small style="opacity:0.6;">${cat.nameEn || ''}</small>
                </td>
                <td><span class="badge-tag">${cat.section}</span></td>
                <td><span class="count-badge">${itemCount} طبق</span></td>
                <td>${cat.order || 0}</td>
                <td>
                    <button onclick="toggleCat('${cat.id}','${cat.status}')" class="status-pill ${isActive ? 'status-active' : 'status-hidden'}" ${!canEdit?'disabled':''}>
                        ${isActive ? 'ظاهر' : 'مخفي'}
                    </button>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon edit" onclick="editCat('${cat.id}')" title="تعديل" ${!canEdit?'disabled':''}><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon delete" onclick="deleteCat('${cat.id}')" title="حذف" ${!canEdit?'disabled':''}><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function deleteCat(id) {
    const cat = catItems.find(x => x.id === id);
    if (!cat) return;
    if (confirm(`هل أنت متأكد من حذف قسم "${cat.nameAr}"؟`)) {
        REFS.cats.child(id).remove().then(() => {
            showToast('تم حذف القسم بنجاح');
            log('حذف قسم', cat.nameAr);
        });
    }
}

function deleteItem(key) {
    const item = menuItems.find(i => i.key === key);
    if (confirm(`نقل "${item?.name}" إلى سلة المحذوفات؟`)) {
        REFS.trash.push({...item, deletedAt: firebase.database.ServerValue.TIMESTAMP});
        REFS.menu.child(key).remove().then(() => showToast('تم النقل بنجاح'));
    }
}

function toggleItem(key, cur) {
    const next = cur === 'inactive' ? 'active' : 'inactive';
    REFS.menu.child(key).update({status: next}).then(() => showToast('تم تحديث الحالة'));
}

function toggleCat(id, cur) {
    const next = cur === 'hidden' ? 'active' : 'hidden';
    REFS.cats.child(id).update({status: next}).then(() => showToast('تم تحديث حالة القسم'));
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

function setFilterCat(id) { activeFilterCat = id; localStorage.setItem('itemsPage', '1'); renderTable(); rebuildSelects(); }

function updateStats() {
    const t = document.getElementById('stat-total'), c = document.getElementById('stat-cats'), f = document.getElementById('stat-feed');
    if (t) t.textContent = menuItems.length;
    if (c) c.textContent = catItems.length;
    if (f) { REFS.feed.once('value', s => f.textContent = s.numChildren()); }
}

function log(action, details) {
    REFS.logs.push({ action, details, user: localStorage.getItem('admin_user') || 'المدير', timestamp: firebase.database.ServerValue.TIMESTAMP });
}

function logout() { localStorage.clear(); window.location.href = 'login.html'; }

// ══════════════════════════════════════════════
// 8. تهيئة التطبيق
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // تهيئة القوائم والأزرار
    document.getElementById('catIcon')?.addEventListener('input', e => updateIconPreview(e.target.value));
    
    // الأزرار العامة
    document.getElementById('exportItemsBtn')?.addEventListener('click', () => {
        const csv = ['key,name,ename,price,category', ...menuItems.map(i => `${i.key},${i.name},${i.nameEn},${i.price},${i.category}`)].join('\n');
        const blob = new Blob([csv], {type:'text/csv'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'menu.csv'; a.click();
    });

    const lastView = localStorage.getItem('last_admin_view') || 'view-dashboard';
    navigateTo(lastView);

    const userDisplay = document.getElementById('current-user-display');
    if (userDisplay) userDisplay.textContent = `مرحباً، ${localStorage.getItem('admin_user') || 'المدير'}`;
});

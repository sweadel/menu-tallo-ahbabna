/**
 * Added dark-mode support and bulk actions visibility handling */
 * js/admin.js v13.0 — النسخة الاحترافية الشاملة والمصححة
 * مطعم طلو احبابنا | Tallo Ahbabna
 * ملاحظة: تم التركيز على إدارة المنيو والأقسام كما طلب المستخدم.
 */

// التحقق من تسجيل الدخول
if (localStorage.getItem('admin_auth') !== 'true') {
    window.location.href = 'login.html';
}

// إعدادات Firebase
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

// مراجع قاعدة البيانات
const REFS = {
    menu: db.ref('menu_items'),
    cats: db.ref('categories_meta'),
    logs: db.ref('audit_logs'),
    trash: db.ref('deleted_items'),
    design: db.ref('settings/design'),
    home: db.ref('settings/home'),
    feed: db.ref('feedback')
};

// المتغيرات العامة
let menuItems = [], catItems = [], feedItems = [];
let editKey = null, editCatKey = null, isSaving = false, activeFilterCat = 'all';

// ══════════════════════════════════════════════
// 1. نظام التنقل (Navigation)
// ══════════════════════════════════════════════

function navigateTo(id) {
    // تحديث الأزرار في القائمة الجانبية
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-view="${id}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // إخفاء كافة الأقسام وإظهار القسم المطلوب
    document.querySelectorAll('.view').forEach(v => {
        v.style.display = 'none';
        v.classList.remove('active');
    });

    const targetView = document.getElementById(id);
    if (targetView) {
        targetView.style.display = 'block';
        // إضافة حركة دخول ناعمة
        setTimeout(() => targetView.classList.add('active'), 10);
    }

    // إغلاق القائمة الجانبية في وضع الموبايل
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // حفظ آخر قسم تمت زيارته
    localStorage.setItem('last_admin_view', id);

    // تحميل البيانات الخاصة بالأقسام التفاعلية
    if (id === 'view-feedback') renderFeedTable();
    if (id === 'view-logs') renderLogsTable();
    if (id === 'view-trash') renderTrashTable();
}

// ══════════════════════════════════════════════
// 2. مراقبة البيانات (Realtime Listeners)
// ══════════════════════════════════════════════

// مراقبة الوجبات
REFS.menu.on('value', snap => {
    menuItems = [];
    if (snap.exists()) {
        Object.entries(snap.val()).forEach(([k, v]) => {
            menuItems.push({ key: k, ...v });
        });
    }
    renderTable();
    renderCatTable();
    updateStats();
});

// مراقبة الأقسام
REFS.cats.on('value', snap => {
    catItems = [];
    if (snap.exists()) {
        Object.entries(snap.val()).forEach(([k, v]) => {
            catItems.push({ id: k, ...v });
        });
    }
    // الترتيب حسب الحقل order
    catItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    rebuildSelects();
    renderCatTable();
    renderTable();
    updateStats();
});

// مراقبة الآراء
REFS.feed.on('value', s => {
    feedItems = [];
    if (s.exists()) {
        Object.entries(s.val()).forEach(([k, v]) => {
            feedItems.push({ key: k, ...v });
        });
    }
    renderFeedTable();
    updateStats();
});

// ══════════════════════════════════════════════
// 3. إدارة المنيو (Menu Items Management)
// ══════════════════════════════════════════════

function renderTable() {
    // Update bulk panel visibility based on selections
    const checkboxes = document.querySelectorAll('.bulk-item');
    const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
    const bulkPanel = document.getElementById('itemsBulkActions');
    if (bulkPanel) bulkPanel.style.display = anyChecked ? 'block' : 'none';

    const tableBody = document.getElementById('itemsBody');
    if (!tableBody) return;

    const searchQuery = (document.getElementById('globalSearch')?.value || '').toLowerCase();
    const filtered = menuItems.filter(item => {
        const matchesCat = (activeFilterCat === 'all' || item.category === activeFilterCat);
        const matchesSearch = (!searchQuery || (item.name || '').toLowerCase().includes(searchQuery) || (item.nameEn || '').toLowerCase().includes(searchQuery));
        return matchesCat && matchesSearch;
    });
    filtered.sort((a, b) => (a.order || 0) - (b.order || 0));

    // ---------- Pagination ----------
    const itemsPerPage = 20;
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentPage = parseInt(localStorage.getItem('itemsPage') || '1');
    const startIdx = (currentPage - 1) * itemsPerPage;
    const pageItems = filtered.slice(startIdx, startIdx + itemsPerPage);

    // Render pagination UI
    const paginationEl = document.getElementById('itemsPagination');
    if (paginationEl) {
        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="btn-primary-sm ${i===currentPage?'active':''}" onclick="goToPage(${i})">${i}</button>`;
        }
        paginationEl.innerHTML = html;
    }
    // ---------------------------------

    tableBody.innerHTML = '';
    pageItems.forEach(item => {
        const isActive = item.status !== 'inactive';
        const catOptions = catItems.map(c => `<option value="${c.id}" ${item.category === c.id ? 'selected' : ''}>${c.nameAr}</option>`).join('');
        let badgeHtml = '';
        if (item.badge === 'HOT') badgeHtml = `<span class="badge-tag bg-red">حار 🔥</span>`;
        if (item.badge === 'NEW') badgeHtml = `<span class="badge-tag bg-green">جديد ✨</span>`;
        if (item.badge === 'SPECIAL') badgeHtml = `<span class="badge-tag bg-gold">مميز ⭐</span>`;
        // Checkbox for bulk selection (only for users with edit rights)
        const canEdit = (localStorage.getItem('admin_role') || 'editor') !== 'viewer';
        const checkbox = canEdit ? `<input type="checkbox" class="bulk-item" data-key="${item.key}" />` : '';
        tableBody.innerHTML += `
            <tr>
                <td>${checkbox}</td>
                <td><img src="${item.image || 'images/tallo-logo.png'}" class="item-thumb" onerror="this.src='images/tallo-logo.png'" /></td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${badgeHtml}
                        <span class="item-name">${item.name}</span>
                    </div>
                    <small class="item-en">${item.nameEn || ''}</small>
                </td>
                <td>
                    <select class="form-control-sm" onchange="quickMoveItem('${item.key}', this.value)">
                        ${catOptions}
                    </select>
                </td>
                <td style="color:var(--gold); font-weight:bold;">${item.price} JD</td>
                <td>
                    <button onclick="toggleItem('${item.key}','${item.status}')" class="status-pill ${isActive ? 'status-active' : 'status-hidden'}">
                        ${isActive ? 'نشط' : 'مخفي'}
                    </button>
                </td>
                <td>${item.badge || ''}</td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-icon" onclick="moveItemOrder('${item.key}', -1)" title="للأعلى"><i class="fa-solid fa-chevron-up"></i></button>
                        <button class="btn-icon" onclick="moveItemOrder('${item.key}', 1)" title="للأسفل"><i class="fa-solid fa-chevron-down"></i></button>
                    </div>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon edit" onclick="editItem('${item.key}')" title="تعديل"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon delete" onclick="deleteItem('${item.key}')" title="حذف"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    });
    // show/hide bulk actions panel based on any checkbox selected
    const bulkPanel = document.getElementById('itemsBulkActions');
    if (bulkPanel) bulkPanel.style.display = canEdit ? 'block' : 'none';
}

function goToPage(page) {
    localStorage.setItem('itemsPage', page);
    renderTable();
}

// ---------- Bulk Action Handlers ----------
function getSelectedItemKeys() {
    return Array.from(document.querySelectorAll('.bulk-item:checked')).map(cb => cb.dataset.key);
}

function bulkActivateItems() {
    const keys = getSelectedItemKeys();
    keys.forEach(k => REFS.menu.child(k).update({status:'active'}));
    showToast('تم تفعيل العناصر المختارة');
}
function bulkDeactivateItems() {
    const keys = getSelectedItemKeys();
    keys.forEach(k => REFS.menu.child(k).update({status:'inactive'}));
    showToast('تم إلغاء تفعيل العناصر المختارة');
}
function bulkDeleteItems() {
    const keys = getSelectedItemKeys();
    if (!keys.length) return;
    if (confirm('حذف العناصر المختارة نهائيًا؟')) {
        keys.forEach(k => {
            const item = menuItems.find(i=>i.key===k);
            REFS.trash.push({...item, deletedAt: firebase.database.ServerValue.TIMESTAMP}).then(()=> REFS.menu.child(k).remove());
        });
        showToast('تم نقل العناصر إلى سلة المحذوفات');
    }
}
function exportSelectedItems() {
    const keys = getSelectedItemKeys();
    const rows = menuItems.filter(i=>keys.includes(i.key)).map(i=>[
        i.key,i.name,i.nameEn,i.category,i.price,i.status,i.badge,i.image,i.desc,i.descEn,i.order
    ].join(','));
    const csv = ['key,name,ename,category,price,status,badge,image,desc,descEn,order',...rows].join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'selected_items.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير العناصر المختارة');
}

// ---------- CSV Import ----------
function importItemsFromFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(l=>l.trim());
        const header = lines.shift().split(',').map(h=>h.trim());
        lines.forEach(line=>{
            const cols = line.split(',');
            const data = {};
            header.forEach((h,i)=>{ data[h]=cols[i]; });
            // map to Firebase fields (ignore key if exists)
            const newItem = {
                name: data.name,
                nameEn: data.ename,
                category: data.category,
                price: data.price,
                status: data.status || 'active',
                badge: data.badge || '',
                image: data.image || '',
                desc: data.desc || '',
                descEn: data.descEn || '',
                order: parseInt(data.order)||0,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            // push new record
            REFS.menu.push(newItem);
        });
        showToast('تم استيراد العناصر من CSV');
    };
    reader.readAsText(file);
}

// ---------- Event Listeners (init) ----------
function initAdminUI() {
    document.getElementById('exportItemsBtn')?.addEventListener('click',()=>{
        const rows = menuItems.map(i=>[
            i.key,i.name,i.nameEn,i.category,i.price,i.status,i.badge,i.image,i.desc,i.descEn,i.order
        ].join(','));
        const csv = ['key,name,ename,category,price,status,badge,image,desc,descEn,order',...rows].join('\n');
        const blob = new Blob([csv],{type:'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=url; a.download='menu_items.csv'; a.click();
        URL.revokeObjectURL(url);
    });
    document.getElementById('importItemsBtn')?.addEventListener('click',()=>{
        document.getElementById('importItemsInput')?.click();
    });
    document.getElementById('importItemsInput')?.addEventListener('change',e=>{
        const file = e.target.files[0];
        if (file) importItemsFromFile(file);
    });
    // Bulk action buttons
    document.getElementById('bulkActivateItems')?.addEventListener('click',bulkActivateItems);
    document.getElementById('bulkDeactivateItems')?.addEventListener('click',bulkDeactivateItems);
    document.getElementById('bulkDeleteItems')?.addEventListener('click',bulkDeleteItems);
    document.getElementById('exportSelectedItems')?.addEventListener('click',exportSelectedItems);
    // Dark mode toggle (simple class switch)
    const darkToggle = document.createElement('button');
    darkToggle.className='btn-primary-sm';
    darkToggle.innerHTML='<i class="fas fa-moon"></i>الوضع الليلي';
    darkToggle.onclick=()=>{document.body.classList.toggle('dark-mode');};
    document.querySelector('.header-actions')?.appendChild(darkToggle);
    // Role based UI: hide bulk actions for viewer
    const role = localStorage.getItem('admin_role') || 'editor';
    if (role==='viewer') {
        document.getElementById('itemsBulkActions').style.display='none';
        // also hide edit/delete buttons later in renderTable (handled by canEdit variable)
    }
}

// Call init after DOM ready (already done at bottom of script)
// Select‑all handler
    const selectAll = document.getElementById('selectAllItems');
    if (selectAll) {
        selectAll.addEventListener('change', e => {
            const checked = e.target.checked;
            document.querySelectorAll('.bulk-item').forEach(cb => cb.checked = checked);
            // update bulk panel visibility after toggling
            const bulkPanel = document.getElementById('itemsBulkActions');
            if (bulkPanel) bulkPanel.style.display = checked ? 'block' : 'none';
        });
    }
    initAdminUI();

    const tableBody = document.getElementById('menu-table-body');
    if (!tableBody) return;

    const searchQuery = (document.getElementById('globalSearch')?.value || '').toLowerCase();
    
    // الفلترة حسب القسم المختار وحسب نص البحث
    const filtered = menuItems.filter(item => {
        const matchesCat = (activeFilterCat === 'all' || item.category === activeFilterCat);
        const matchesSearch = (!searchQuery || 
                               (item.name || '').toLowerCase().includes(searchQuery) || 
                               (item.nameEn || '').toLowerCase().includes(searchQuery));
        return matchesCat && matchesSearch;
    });

    filtered.sort((a, b) => (a.order || 0) - (b.order || 0));

    tableBody.innerHTML = '';
    filtered.forEach(item => {
        const isActive = item.status !== 'inactive';
        const catOptions = catItems.map(c => `<option value="${c.id}" ${item.category === c.id ? 'selected' : ''}>${c.nameAr}</option>`).join('');
        
        // بناء الشارة
        let badgeHtml = '';
        if (item.badge === 'HOT') badgeHtml = '<span class="badge-tag bg-red">حار 🔥</span>';
        if (item.badge === 'NEW') badgeHtml = '<span class="badge-tag bg-green">جديد ✨</span>';
        if (item.badge === 'SPECIAL') badgeHtml = '<span class="badge-tag bg-gold">مميز ⭐</span>';

        tableBody.innerHTML += `
            <tr>
                <td><img src="${item.image || 'images/tallo-logo.png'}" class="item-thumb" onerror="this.src='images/tallo-logo.png'"></td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${badgeHtml}
                        <span class="item-name">${item.name}</span>
                    </div>
                    <small class="item-en">${item.nameEn || ''}</small>
                </td>
                <td>
                    <select class="form-control-sm" onchange="quickMoveItem('${item.key}', this.value)">
                        ${catOptions}
                    </select>
                </td>
                <td style="color:var(--gold); font-weight:bold;">${item.price} JD</td>
                <td>
                    <button onclick="toggleItem('${item.key}','${item.status}')" class="status-pill ${isActive ? 'status-active' : 'status-hidden'}">
                        ${isActive ? 'نشط' : 'مخفي'}
                    </button>
                </td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-icon" onclick="moveItemOrder('${item.key}', -1)" title="للأعلى"><i class="fa-solid fa-chevron-up"></i></button>
                        <button class="btn-icon" onclick="moveItemOrder('${item.key}', 1)" title="للأسفل"><i class="fa-solid fa-chevron-down"></i></button>
                    </div>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon edit" onclick="editItem('${item.key}')" title="تعديل"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon delete" onclick="deleteItem('${item.key}')" title="حذف"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    });
}

function saveItem() {
    if (isSaving) return;
    
    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    
    if (!name || !category) {
        return showToast('يرجى إدخال اسم الوجبة والقسم', 'error');
    }

    isSaving = true;
    const data = {
        name: name,
        nameEn: document.getElementById('itemNameEn').value.trim(),
        category: category,
        price: document.getElementById('itemPrice').value.trim(),
        image: document.getElementById('itemImg').value.trim(),
        desc: document.getElementById('itemDesc').value.trim(),
        descEn: document.getElementById('itemDescEn').value.trim(),
        badge: document.getElementById('itemBadge').value || '',
        status: document.getElementById('itemStatus').value || 'active',
        order: parseInt(editKey ? (menuItems.find(x=>x.key===editKey)?.order || 0) : (menuItems.length + 1)),
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    const targetRef = editKey ? REFS.menu.child(editKey) : REFS.menu.push();
    
    // نستخدم update بدلاً من set للحفاظ على أي حقول إضافية غير موجودة في النموذج
    targetRef.update(data)
        .then(() => {
            closeItemModal();
            showToast('تم حفظ بيانات الوجبة بنجاح');
            log(editKey ? 'تعديل وجبة' : 'إضافة وجبة', name);
        })
        .catch(err => {
            console.error(err);
            showToast('حدث خطأ أثناء الحفظ', 'error');
        })
        .finally(() => isSaving = false);
}

// ══════════════════════════════════════════════
// 4. إدارة الأقسام (Categories Management)
// ══════════════════════════════════════════════

function renderCatTable() {
    const tableBody = document.getElementById('cat-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    catItems.forEach(cat => {
        const isVisible = cat.status !== 'hidden';
        const itemCount = menuItems.filter(i => i.category === cat.id).length;
        
        tableBody.innerHTML += `
            <tr>
                <td style="font-size:1.2rem; color:var(--gold);"><i class="fa-solid ${cat.icon || 'fa-folder'}"></i></td>
                <td>
                    <span class="item-name">${cat.nameAr}</span>
                    <br><small class="item-en">${cat.nameEn || ''}</small>
                </td>
                <td><span class="section-tag">${getSectionLabel(cat.section)}</span></td>
                <td><b>${itemCount}</b> وجبة</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button class="btn-icon" style="width:28px; height:28px;" onclick="moveCatOrder('${cat.id}', -1)"><i class="fa-solid fa-arrow-up"></i></button>
                        <span class="order-badge">${cat.order || 0}</span>
                        <button class="btn-icon" style="width:28px; height:28px;" onclick="moveCatOrder('${cat.id}', 1)"><i class="fa-solid fa-arrow-down"></i></button>
                    </div>
                </td>
                <td>
                    <button onclick="toggleCat('${cat.id}','${cat.status}')" class="status-pill ${isVisible ? 'status-active' : 'status-hidden'}">
                        ${isVisible ? 'ظاهر' : 'مخفي'}
                    </button>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon edit" onclick="editCat('${cat.id}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon delete" onclick="deleteCat('${cat.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    });
}

function saveCategory() {
    const nameAr = document.getElementById('catNameAr').value.trim();
    if (!nameAr) return showToast('الاسم العربي مطلوب', 'error');

    const statusRadio = document.querySelector('input[name="catStatus"]:checked');
    const status = statusRadio ? statusRadio.value : 'active';

    const data = {
        nameAr: nameAr,
        nameEn: document.getElementById('catNameEn').value.trim(),
        section: document.getElementById('catSection').value,
        order: parseInt(document.getElementById('catOrder').value) || 0,
        icon: document.getElementById('catIcon').value.trim() || 'fa-folder',
        descAr: document.getElementById('catDescAr').value.trim(),
        descEn: document.getElementById('catDescEn').value.trim(),
        status: status,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    // إذا كان تعديلاً نستخدم المفتاح القديم، وإذا كان جديداً ننشئ مفتاحاً من الاسم
    const catId = editCatKey || nameAr.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u0621-\u064A-]/g, '');

    REFS.cats.child(catId).update(data)
        .then(() => {
            closeCatModal();
            showToast('تم حفظ القسم بنجاح');
            log('إدارة الأقسام', `حفظ القسم: ${nameAr}`);
        })
        .catch(err => {
            console.error(err);
            showToast('خطأ في حفظ القسم', 'error');
        });
}

// ══════════════════════════════════════════════
// 5. الوظائف المساعدة والجمالية
// ══════════════════════════════════════════════

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style = `
        padding: 14px 22px; 
        background: #1a1a1a; 
        border-right: 4px solid ${type === 'success' ? '#2ecc71' : '#e74c3c'}; 
        color: #fff; 
        border-radius: 12px; 
        box-shadow: 0 8px 25px rgba(0,0,0,0.4); 
        font-size: 0.9rem; 
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
        animation: toastSlideIn 0.4s ease forwards;
        pointer-events: all;
    `;

    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    const color = type === 'success' ? '#2ecc71' : '#e74c3c';
    
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color:${color}; font-size:1.1rem;"></i> <span>${msg}</span>`;
    
    container.appendChild(toast);

    // إزالة الإشعار بعد 3 ثوانٍ
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// معاينة الصورة في مودال الوجبات
function previewItemImage(url) {
    const previewContainer = document.getElementById('item-img-preview');
    if (!previewContainer) return;
    
    if (url && url.length > 5) {
        previewContainer.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
    } else {
        previewContainer.innerHTML = `<i class="fa-solid fa-image" style="font-size:3rem; color:rgba(255,255,255,0.05);"></i>`;
    }
}

// الاستماع لكود الأيقونة في مودال الأقسام
document.getElementById('catIcon')?.addEventListener('input', (e) => {
    const iconCode = e.target.value.trim() || 'fa-circle-question';
    const preview = document.getElementById('icon-preview');
    if (preview) preview.innerHTML = `<i class="fa-solid ${iconCode}"></i>`;
});

function quickMoveItem(key, newCat) {
    REFS.menu.child(key).update({ category: newCat })
        .then(() => {
            showToast('تم نقل الوجبة إلى القسم المختار');
            log('نقل سريع', `تغيير قسم الوجبة`);
        });
}

// تعديل ترتيب العنصر (تحريك للأعلى أو للأسفل)
function moveItemOrder(key, step) {
    const item = menuItems.find(i => i.key === key);
    if (!item) return;
    const newOrder = (item.order || 0) + step;
    REFS.menu.child(key).update({ order: newOrder })
        .then(() => {
            showToast('تم تعديل ترتيب العنصر');
            log('تعديل ترتيب', `${item.name} → ${newOrder}`);
        });
}

function rebuildSelects() {
    const filterTabs = document.getElementById('categoryTabs');
    const itemSelect = document.getElementById('itemCategory');
    
    if (filterTabs) {
        let html = `<button class="cat-filter-tab ${activeFilterCat === 'all' ? 'active' : ''}" onclick="setFilterCat('all')">الكل</button>`;
        catItems.forEach(c => {
            html += `<button class="cat-filter-tab ${activeFilterCat === c.id ? 'active' : ''}" onclick="setFilterCat('${c.id}')">${c.nameAr}</button>`;
        });
        filterTabs.innerHTML = html;
    }
    
    if (itemSelect) {
        itemSelect.innerHTML = '<option value="" disabled selected>اختر القسم...</option>' + 
                               catItems.map(c => `<option value="${c.id}">${c.nameAr}</option>`).join('');
    }
}

function updateStats() {
    const totalEl = document.getElementById('stat-total');
    const catsEl = document.getElementById('stat-cats');
    const feedEl = document.getElementById('stat-feed');
    
    if (totalEl) totalEl.textContent = menuItems.length;
    if (catsEl) catsEl.textContent = catItems.length;
    if (feedEl) feedEl.textContent = feedItems.length;
}

function log(action, details) {
    REFS.logs.push({
        action: action,
        details: details,
        user: localStorage.getItem('admin_user') || 'المدير',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function setFilterCat(id) {
    activeFilterCat = id;
    renderTable();
    rebuildSelects(); // لتحديث حالة الأزرار (Active)
}

function getSectionLabel(key) {
    const map = {
        'arabic': 'المنيو العربي',
        'intl': 'انترناشونال',
        'desserts': 'الحلويات',
        'drinks': 'المشروبات',
        'argileh': 'الأراجيل'
    };
    return map[key] || 'غير محدد';
}

// ══════════════════════════════════════════════
// 6. التعامل مع المودالات (Modals)
// ══════════════════════════════════════════════

function openItemModal() {
    editKey = null;
    document.getElementById('itemForm').reset();
    previewItemImage('');
    document.getElementById('modalTitle').textContent = 'إضافة وجبة جديدة';
    document.getElementById('itemModal').classList.add('active');
}
function closeItemModal() { document.getElementById('itemModal').classList.remove('active'); }

function openCatModal() {
    editCatKey = null;
    document.getElementById('catForm').reset();
    document.getElementById('catModalTitle').textContent = 'إضافة قسم جديد';
    document.getElementById('icon-preview').innerHTML = '<i class="fa-solid fa-circle-question"></i>';
    document.getElementById('catModal').classList.add('active');
}
function closeCatModal() { document.getElementById('catModal').classList.remove('active'); }

function editItem(key) {
    const item = menuItems.find(x => x.key === key);
    if (!item) return;
    
    editKey = key;
    document.getElementById('modalTitle').textContent = 'تعديل بيانات الوجبة';
    
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemNameEn').value = item.nameEn || '';
    document.getElementById('itemCategory').value = item.category || '';
    document.getElementById('itemPrice').value = item.price || '';
    document.getElementById('itemImg').value = item.image || '';
    document.getElementById('itemDesc').value = item.desc || '';
    document.getElementById('itemDescEn').value = item.descEn || '';
    document.getElementById('itemBadge').value = item.badge || '';
    document.getElementById('itemStatus').value = item.status || 'active';
    
    previewItemImage(item.image);
    document.getElementById('itemModal').classList.add('active');
}

function editCat(id) {
    const cat = catItems.find(x => x.id === id);
    if (!cat) return;
    
    editCatKey = id;
    document.getElementById('catModalTitle').textContent = 'تعديل بيانات القسم';
    
    document.getElementById('catNameAr').value = cat.nameAr || '';
    document.getElementById('catNameEn').value = cat.nameEn || '';
    document.getElementById('catSection').value = cat.section || 'arabic';
    document.getElementById('catOrder').value = cat.order || 0;
    document.getElementById('catIcon').value = cat.icon || '';
    document.getElementById('catDescAr').value = cat.descAr || '';
    document.getElementById('catDescEn').value = cat.descEn || '';
    
    const statusVal = cat.status || 'active';
    const rad = document.querySelector(`input[name="catStatus"][value="${statusVal}"]`);
    if (rad) rad.checked = true;
    
    document.getElementById('icon-preview').innerHTML = `<i class="fa-solid ${cat.icon || 'fa-folder'}"></i>`;
    document.getElementById('catModal').classList.add('active');
}

// ══════════════════════════════════════════════
// 7. العمليات السريعة (Delete, Toggle)
// ══════════════════════════════════════════════

function deleteItem(key) {
    const item = menuItems.find(x => x.key === key);
    if (!item) return;

    if (confirm(`هل أنت متأكد من حذف الوجبة "${item.name}"؟`)) {
        // النقل لسلة المحذوفات قبل الحذف
        REFS.trash.push({ ...item, deletedAt: firebase.database.ServerValue.TIMESTAMP })
            .then(() => {
                REFS.menu.child(key).remove().then(() => {
                    showToast('تم نقل الوجبة إلى سلة المحذوفات');
                    log('حذف وجبة', item.name);
                });
            });
    }
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

function toggleItem(key, currentStatus) {
    const nextStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
    REFS.menu.child(key).update({ status: nextStatus })
        .then(() => {
            showToast(`الوجبة الآن ${nextStatus === 'active' ? 'نشطة وظاهرة' : 'مخفية'}`);
        });
}

function toggleCat(id, currentStatus) {
    const nextStatus = currentStatus === 'hidden' ? 'active' : 'hidden';
    REFS.cats.child(id).update({ status: nextStatus })
        .then(() => {
            showToast(`القسم الآن ${nextStatus === 'active' ? 'ظاهر' : 'مخفي عن الزبائن'}`);
        });
}

// ══════════════════════════════════════════════
// 8. الجداول الإضافية (Feedback, Logs, Trash)
// ══════════════════════════════════════════════

function renderFeedTable() {
    const body = document.getElementById('feed-table-body');
    if (!body) return;
    
    body.innerHTML = '';
    const sorted = [...feedItems].reverse();
    
    if (sorted.length === 0) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; opacity:0.5;">لا توجد آراء حالياً</td></tr>';
        return;
    }

    sorted.forEach(f => {
        body.innerHTML += `
            <tr>
                <td>${new Date(f.timestamp).toLocaleString('ar-EG')}</td>
                <td><b>${f.name || 'مجهول'}</b></td>
                <td style="color:#f1c40f;">${'⭐'.repeat(f.rating || 0)}</td>
                <td>${f.message || ''}</td>
            </tr>`;
    });
}

function renderLogsTable() {
    const body = document.getElementById('logs-table-body');
    if (!body) return;
    
    REFS.logs.limitToLast(50).once('value', s => {
        body.innerHTML = '';
        if (!s.exists()) {
            body.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:30px; opacity:0.5;">السجل فارغ</td></tr>';
            return;
        }
        
        Object.values(s.val()).reverse().forEach(l => {
            body.innerHTML += `
                <tr>
                    <td style="white-space:nowrap;">${new Date(l.timestamp).toLocaleString('ar-EG')}</td>
                    <td><span class="action-tag">${l.action}</span></td>
                    <td>${l.details} <br><small style="color:var(--text-dim)">بواسطة: ${l.user}</small></td>
                </tr>`;
        });
    });
}

function renderTrashTable() {
    const body = document.getElementById('trash-table-body');
    if (!body) return;

    REFS.trash.once('value', s => {
        body.innerHTML = '';
        if (!s.exists()) {
            body.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:40px; opacity:0.5;">سلة المحذوفات فارغة</td></tr>';
            return;
        }

        Object.entries(s.val()).reverse().forEach(([k, v]) => {
            body.innerHTML += `
                <tr>
                    <td><b>${v.name}</b></td>
                    <td>${new Date(v.deletedAt).toLocaleString('ar-EG')}</td>
                    <td>
                        <button class="btn-primary-sm" onclick="restoreItem('${k}')">استعادة</button>
                        <button class="btn-danger-sm" onclick="hardDeleteItem('${k}')">حذف نهائي</button>
                    </td>
                </tr>`;
        });
    });
}

function restoreItem(trashKey) {
    REFS.trash.child(trashKey).once('value', s => {
        if (!s.exists()) return;
        const data = s.val();
        const restoreData = { ...data };
        delete restoreData.deletedAt; // إزالة تاريخ الحذف قبل الاستعادة
        
        REFS.menu.push(restoreData).then(() => {
            REFS.trash.child(trashKey).remove().then(() => {
                showToast('تمت استعادة الوجبة بنجاح');
                renderTrashTable();
            });
        });
    });
}

function hardDeleteItem(trashKey) {
    if (confirm('هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع عن هذه العملية.')) {
        REFS.trash.child(trashKey).remove().then(() => {
            showToast('تم الحذف النهائي للوجبة');
            renderTrashTable();
        });
    }
}

// ══════════════════════════════════════════════
// 9. تهيئة الصفحة (Initialization)
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // استعادة آخر عرض أو البدء بلوحة التحكم
    const lastView = localStorage.getItem('last_admin_view') || 'view-dashboard';
    navigateTo(lastView);

    // عرض اسم المستخدم
    const userDisplay = document.getElementById('current-user-display');
    if (userDisplay) {
        userDisplay.textContent = localStorage.getItem('admin_user') || 'المدير العام';
    }
});

// وظيفة البحث العالمي
function onGlobalSearch() { renderTable(); }

// ══════════════════════════════════════════════
// 9. وظائف إعادة الترتيب (Reordering)
// ══════════════════════════════════════════════

function moveCatOrder(id, direction) {
    const idx = catItems.findIndex(c => c.id === id);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= catItems.length) return;

    const current = catItems[idx];
    const other = catItems[targetIdx];

    const tempOrder = current.order || 0;
    REFS.cats.child(current.id).update({ order: other.order || 0 });
    REFS.cats.child(other.id).update({ order: tempOrder }).then(() => {
        showToast('تم تغيير ترتيب الأقسام');
    });
}

function moveItemOrder(key, direction) {
    // نحصل على القائمة المفلترة حالياً (نفس القسم) لضمان الترتيب الصحيح
    const q = (document.getElementById('globalSearch')?.value || '').toLowerCase();
    const currentList = menuItems.filter(i => (activeFilterCat === 'all' || i.category === activeFilterCat) && (!q || (i.name || '').toLowerCase().includes(q)));
    currentList.sort((a, b) => (a.order || 0) - (b.order || 0));

    const idx = currentList.findIndex(i => i.key === key);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;

    const current = currentList[idx];
    const other = currentList[targetIdx];

    const tempOrder = current.order || 0;
    REFS.menu.child(current.key).update({ order: other.order || 0 });
    REFS.menu.child(other.key).update({ order: tempOrder }).then(() => {
        showToast('تم تغيير ترتيب الوجبات');
    });
}

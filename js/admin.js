console.log("Admin System Version: 2.0 - Loaded");
// ── 0. Security Check ─────────────────────────────────────────────
if (localStorage.getItem('admin_auth') !== 'true') {
    window.location.href = 'login.html';
}

function logout() {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_user');
    window.location.href = 'login.html';
}

// Display current user
document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('admin_user') || 'المدير العام';
    const display = document.getElementById('current-user-display');
    if (display) display.textContent = user;
});

// ── 1. Firebase Init ──────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyCwMxgmrfnsme4pgLx00tgjGCo-gQBMUo8",
    authDomain: "tallow-ahbabna.firebaseapp.com",
    projectId: "tallow-ahbabna",
    storageBucket: "tallow-ahbabna.firebasestorage.app",
    messagingSenderId: "1025966646494",
    appId: "1:1025966646494:web:f89373fad63d988f298e4f",
    databaseURL: "https://tallow-ahbabna-default-rtdb.firebaseio.com"
};

// Prevent double-init if page reloaded
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db       = firebase.database();
const menuRef    = db.ref('menu_items');
const settRef    = db.ref('settings/home');
const logsRef    = db.ref('audit_logs');
const deletedRef = db.ref('deleted_items');
const usersRef   = db.ref('users');
const designRef  = db.ref('settings/design');
const catNamesRef = db.ref('settings/categories');

// ── 2. Mobile Sidebar ─────────────────────────────────────────────
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

// ── 3. Navigation ─────────────────────────────────────────────────
document.querySelectorAll('.sidebar-nav .nav-item[data-target]').forEach(item => {
    item.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        this.classList.add('active');
        const target = this.getAttribute('data-target');
        const section = document.getElementById(target);
        if (section) section.classList.add('active');
        if (window.innerWidth <= 768) {
            document.querySelector('.sidebar').classList.remove('active');
        }
    });
});

// ── 4. State ──────────────────────────────────────────────────────
let menuItems  = [];
let editingKey = null;

// ── 5. Real-Time Listener ─────────────────────────────────────────
menuRef.on('value', (snapshot) => {
    const data = snapshot.val();
    menuItems = [];
    if (data) {
        Object.keys(data).forEach(key => {
            menuItems.push({ firebaseKey: key, ...data[key] });
        });
    }
    renderTable();
    updateStats();
}, (error) => {
    console.error('Firebase read error:', error);
    showToast('خطأ في الاتصال بقاعدة البيانات', 'error');
});

// ── 6. Render Table ───────────────────────────────────────────────
function renderTable() {
    const tbody = document.getElementById('menu-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filterSearchEl = document.getElementById('filterSearch');
    const filterCategoryEl = document.getElementById('filterCategory');

    const q = filterSearchEl ? filterSearchEl.value.toLowerCase() : '';
    const cat = filterCategoryEl ? filterCategoryEl.value : 'all';

    const filtered = menuItems.filter(item => {
        const matchesText = (item.name && item.name.toLowerCase().includes(q)) || 
                            (item.nameEn && item.nameEn.toLowerCase().includes(q));
        
        let matchesCat = false;
        if (cat === 'all') matchesCat = true;
        else if (cat === 'section_drinks') matchesCat = item.category && item.category.startsWith('s-');
        else if (cat === 'section_arabic') matchesCat = item.category && item.category.startsWith('ar-');
        else if (cat === 'section_intl')   matchesCat = item.category && item.category.startsWith('in-');
        else matchesCat = (item.category === cat);

        return matchesText && matchesCat;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-secondary);">لا يوجد أصناف حالياً</td></tr>`;
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        const isActive  = item.status !== 'inactive';
        const statusCls = isActive ? 'status-active' : 'status-inactive';
        const statusTxt = isActive ? 'نشط' : 'مخفي';
        const imgSrc    = item.image ? item.image : 'images/tallo-logo.png';

        tr.innerHTML = `
            <td><div class="item-img-mini" style="background-image:url('${imgSrc}');background-size:cover;background-position:center;width:44px;height:44px;border-radius:8px;"></div></td>
            <td>
                <strong>${item.name || ''}</strong>
                ${item.nameEn ? `<span style="color:var(--text-secondary);font-size:.85rem;"> / ${item.nameEn}</span>` : ''}
                ${item.desc   ? `<br><span style="color:var(--text-secondary);font-size:.8rem;">${item.desc}</span>` : ''}
            </td>
            <td><span style="font-size:.85rem;">${item.category || '-'}</span></td>
            <td style="font-weight:600;color:var(--gold);">${item.price ? item.price + ' د.أ' : '-'}</td>
            <td><span class="status-badge ${statusCls}">${statusTxt}</span></td>
            <td>
                <button class="action-btn edit" onclick="editItem('${item.firebaseKey}')" title="تعديل">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="action-btn delete" onclick="deleteItem('${item.firebaseKey}')" title="حذف">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ── 7. Filter ─────────────────────────────────────────────────────
function filterTable() {
    renderTable();
}

// ── 8. Stats Update ───────────────────────────────────────────────
function updateStats() {
    const totalEl  = document.getElementById('stat-total');
    const activeEl = document.getElementById('stat-active');
    const hiddenEl = document.getElementById('stat-hidden');
    if (totalEl)  totalEl.textContent  = menuItems.length;
    if (activeEl) activeEl.textContent = menuItems.filter(i => i.status !== 'inactive').length;
    if (hiddenEl) hiddenEl.textContent = menuItems.filter(i => i.status === 'inactive').length;
}

// ── 9. Modal: Open (Add) ──────────────────────────────────────────
function openItemModal() {
    editingKey = null;
    const form  = document.getElementById('itemForm');
    const title = document.getElementById('modalTitle');
    if (form)  form.reset();
    if (title) title.textContent = 'إضافة صنف جديد';
    document.getElementById('itemModal').classList.add('open');
}

// ── 10. Modal: Close ─────────────────────────────────────────────
function closeItemModal() {
    document.getElementById('itemModal').classList.remove('open');
    editingKey = null;
}

// ── 11. Modal: Edit ──────────────────────────────────────────────
function editItem(key) {
    const item = menuItems.find(i => i.firebaseKey === key);
    if (!item) return;

    editingKey = key;
    document.getElementById('modalTitle').textContent  = 'تعديل: ' + (item.name || '');
    document.getElementById('itemName').value          = item.name    || '';
    document.getElementById('itemNameEn').value        = item.nameEn  || '';
    document.getElementById('itemCategory').value      = item.category || '';
    document.getElementById('itemPrice').value         = item.price   || '';
    document.getElementById('itemStatus').value        = item.status  || 'active';
    document.getElementById('itemDesc').value          = item.desc    || '';
    document.getElementById('itemDescEn').value        = item.descEn  || '';
    document.getElementById('itemImg').value           = item.image   || '';
    document.getElementById('itemModal').classList.add('open');
}

// ── 12. Save (Add / Update) ───────────────────────────────────────
function saveItem() {
    const name     = document.getElementById('itemName').value.trim();
    const nameEn   = document.getElementById('itemNameEn').value.trim();
    const category = document.getElementById('itemCategory').value;
    const price    = document.getElementById('itemPrice').value.trim();
    const status   = document.getElementById('itemStatus').value;
    const desc     = document.getElementById('itemDesc').value.trim();
    const descEn   = document.getElementById('itemDescEn').value.trim();
    const image    = document.getElementById('itemImg').value.trim();

    if (!name) {
        showToast('الرجاء إدخال اسم الصنف بالعربي', 'error');
        return;
    }

    const itemData = { name, nameEn, category, price, status, desc, descEn, image };
    const currentUser = localStorage.getItem('admin_user') || 'Admin';

    if (editingKey) {
        const oldItem = menuItems.find(i => i.firebaseKey === editingKey);
        menuRef.child(editingKey).update(itemData)
            .then(() => {
                logAction('تعديل صنف', `تعديل صنف: ${name}`, { from: oldItem, to: itemData });
                closeItemModal();
                showToast('تم تحديث الصنف بنجاح');
            })
            .catch(err => showToast('خطأ: ' + err.message, 'error'));
    } else {
        menuRef.push({ ...itemData, createdAt: Date.now(), createdBy: currentUser })
            .then(() => {
                logAction('إضافة صنف', `إضافة صنف جديد: ${name}`, itemData);
                closeItemModal();
                showToast('تم إضافة الصنف بنجاح');
            })
            .catch(err => showToast('خطأ: ' + err.message, 'error'));
    }
}

// ── 13. Delete (Soft Delete) ──────────────────────────────────────
function deleteItem(key) {
    const item = menuItems.find(i => i.firebaseKey === key);
    if (!item) return;

    if (!confirm(`هل أنت متأكد من حذف (${item.name})؟ سيتم نقله إلى سلة المحذوفات.`)) return;

    const currentUser = localStorage.getItem('admin_user') || 'Admin';
    const deletedData = {
        ...item,
        deletedAt: Date.now(),
        deletedBy: currentUser
    };

    deletedRef.child(key).set(deletedData)
        .then(() => menuRef.child(key).remove())
        .then(() => {
            logAction('حذف صنف', `حذف صنف: ${item.name}`, item);
            showToast('تم نقل الصنف إلى سلة المحذوفات');
        })
        .catch(err => showToast('خطأ: ' + err.message, 'error'));
}

// ── 14. Audit Action Logger ───────────────────────────────────────
function logAction(type, description, details = {}) {
    const logEntry = {
        timestamp: Date.now(),
        user: localStorage.getItem('admin_user') || 'المدير العام',
        action: type,
        details: description,
        data: details
    };
    logsRef.push(logEntry);
}

// ── 14. Toast Notification ────────────────────────────────────────
function showToast(msg, type = 'success') {
    let toast = document.getElementById('adminToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adminToast';
        toast.style.cssText = `
            position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
            padding:12px 28px; border-radius:10px; font-size:1rem; font-weight:600;
            z-index:99999; transition:opacity .4s; opacity:0; pointer-events:none;
            box-shadow:0 4px 20px rgba(0,0,0,.4);
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.background = type === 'error' ? '#c0392b' : '#27ae60';
    toast.style.color = '#fff';
    toast.style.opacity = '1';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// ── 15. Settings ──────────────────────────────────────────────────
settRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    const fields = ['set_btn_ar','set_btn_en','set_btn_feed','set_whatsapp','set_instagram','set_maps'];
    const keys   = ['showBtnAr','showBtnEn','showBtnFeed','whatsapp','instagram','maps'];
    fields.forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') {
            el.checked = data[keys[i]] !== false;
        } else {
            el.value = data[keys[i]] || '';
        }
    });
});

function saveSettings() {
    const data = {
        showBtnAr:   document.getElementById('set_btn_ar')?.checked   ?? true,
        showBtnEn:   document.getElementById('set_btn_en')?.checked   ?? true,
        showBtnFeed: document.getElementById('set_btn_feed')?.checked ?? true,
        whatsapp:    document.getElementById('set_whatsapp')?.value   || '',
        instagram:   document.getElementById('set_instagram')?.value  || '',
        maps:        document.getElementById('set_maps')?.value       || '',
    };
    settRef.set(data)
        .then(() => showToast('تم حفظ الإعدادات بنجاح'))
        .catch(err => showToast('خطأ: ' + err.message, 'error'));
}

// ── 16. Sync Info ─────────────────────────────────────────────────
function syncData() {
    showToast('البيانات متزامنة تلقائياً مع Firebase');
}

// ── 17. Design & Appearance Settings ──────────────────────────────
const designRef = db.ref('settings/design');
const catNamesRef = db.ref('settings/categories');

// Listen for Design Settings
designRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    if(document.getElementById('set_font_family')) document.getElementById('set_font_family').value = data.fontFamily || 'IBM Plex Sans Arabic';
    if(document.getElementById('set_font_bold')) document.getElementById('set_font_bold').checked = data.fontBold !== false;
    if(document.getElementById('set_page_bg')) document.getElementById('set_page_bg').value = data.pageBg || '#080808';
    if(document.getElementById('set_card_bg')) document.getElementById('set_card_bg').value = data.cardBg || '#121212';
    if(document.getElementById('set_banner_active')) document.getElementById('set_banner_active').checked = data.bannerActive || false;
    if(document.getElementById('set_banner_text')) document.getElementById('set_banner_text').value = data.bannerText || '';
    
    // New fields
    if(document.getElementById('set_logo_url')) document.getElementById('set_logo_url').value = data.logoUrl || '';
    if(document.getElementById('set_primary_color')) document.getElementById('set_primary_color').value = data.primaryColor || '#c3922e';
    if(document.getElementById('set_secondary_text')) document.getElementById('set_secondary_text').value = data.secondaryText || '#888888';
    if(document.getElementById('set_card_style')) document.getElementById('set_card_style').value = data.cardStyle || 'modern';
});

// Listen for custom category names
catNamesRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    document.querySelectorAll('.cat-rename').forEach(input => {
        const catId = input.getAttribute('data-cat');
        input.value = data[catId] || '';
    });
});

function saveDesignSettings() {
    // 1. Save Design
    const designData = {
        fontFamily: document.getElementById('set_font_family')?.value || 'IBM Plex Sans Arabic',
        fontBold: document.getElementById('set_font_bold')?.checked ?? true,
        pageBg: document.getElementById('set_page_bg')?.value || '#0a0a0a',
        cardBg: document.getElementById('set_card_bg')?.value || '#121212',
        bannerActive: document.getElementById('set_banner_active')?.checked ?? false,
        bannerText: document.getElementById('set_banner_text')?.value || '',
        logoUrl: document.getElementById('set_logo_url')?.value || '',
        primaryColor: document.getElementById('set_primary_color')?.value || '#c3922e',
        secondaryText: document.getElementById('set_secondary_text')?.value || '#888888',
        cardStyle: document.getElementById('set_card_style')?.value || 'modern'
    };
    
    // 2. Save Categories
    const catData = {};
    document.querySelectorAll('.cat-rename').forEach(input => {
        const val = input.value.trim();
        if (val) {
            const catId = input.getAttribute('data-cat');
            catData[catId] = val;
        }
    });

    Promise.all([
        designRef.set(designData),
        catNamesRef.set(catData)
    ])
    .then(() => {
        logAction('تحديث التصميم', 'قام بتعديل إعدادات المظهر العام والأقسام');
        showToast('تم حفظ إعدادات التصميم والأقسام بنجاح');
    })
    .catch(err => showToast('خطأ: ' + err.message, 'error'));
}

// ── 18. Audit Logs Display ────────────────────────────────────────
logsRef.limitToLast(50).on('value', snapshot => {
    const tbody = document.getElementById('audit-logs-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const data = snapshot.val();
    if (!data) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">لا يوجد سجلات حالياً</td></tr>';
        return;
    }
    Object.keys(data).reverse().forEach(key => {
        const log = data[key];
        const date = new Date(log.timestamp).toLocaleString('ar-EG');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${date}</td>
            <td style="color:var(--gold); font-weight:600;">${log.user}</td>
            <td><span class="badge" style="background:rgba(195,146,46,0.1); color:var(--gold); padding:2px 8px; border-radius:4px;">${log.action}</span></td>
            <td>${log.details}</td>
        `;
        tbody.appendChild(tr);
    });
});

function clearAuditLogs() {
    if (!confirm('هل أنت متأكد من مسح جميع السجلات؟')) return;
    logsRef.remove().then(() => showToast('تم مسح السجل'));
}

// ── 19. Trash Can (Deleted Items) ────────────────────────────────
deletedRef.on('value', snapshot => {
    const tbody = document.getElementById('deleted-items-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const data = snapshot.val();
    if (!data) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">السلة فارغة حالياً</td></tr>';
        return;
    }
    Object.keys(data).forEach(key => {
        const item = data[key];
        const date = new Date(item.deletedAt).toLocaleString('ar-EG');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${date}</td>
            <td><strong>${item.name}</strong></td>
            <td>${item.category}</td>
            <td>${item.deletedBy || 'Admin'}</td>
            <td>
                <button class="primary-btn" onclick="restoreItem('${key}')" title="استعادة" style="padding:5px 12px; font-size:0.8rem;">
                    <i class="fa-solid fa-rotate-left"></i> استعادة
                </button>
                <button class="action-btn delete" onclick="permanentDelete('${key}')" title="حذف نهائي" style="margin-right:10px;">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
});

function restoreItem(key) {
    deletedRef.child(key).once('value').then(snapshot => {
        const item = snapshot.val();
        if (!item) return;
        const { deletedAt, deletedBy, ...cleanItem } = item;
        menuRef.child(key).set(cleanItem).then(() => {
            deletedRef.child(key).remove();
            logAction('استعادة صنف', `قام باستعادة الصنف: ${item.name}`, item);
            showToast('تمت استعادة الصنف بنجاح');
        });
    });
}

function permanentDelete(key) {
    if (!confirm('سيتم حذف هذا الصنف للأبد، هل أنت متأكد؟')) return;
    deletedRef.child(key).remove().then(() => showToast('تم الحذف النهائي'));
}

// ── 20. Tabs Logic ────────────────────────────────────────────────
document.querySelectorAll('[data-log-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-log-tab');
        document.querySelectorAll('.log-tab-content').forEach(c => c.style.display = 'none');
        document.getElementById(target + '-tab').style.display = 'block';
        document.querySelectorAll('[data-log-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// ── 21. User Accounts Management ──────────────────────────────────
let editingUserKey = null;

usersRef.on('value', snapshot => {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const data = snapshot.val();
    if (!data) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا يوجد حسابات أخرى</td></tr>';
        return;
    }
    Object.keys(data).forEach(key => {
        const user = data[key];
        const date = new Date(user.createdAt).toLocaleDateString('ar-EG');
        const roleMap = { admin: 'مدير نظام', manager: 'مدير فرع', viewer: 'مشاهد' };
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${user.username}</strong></td>
            <td>${roleMap[user.role] || user.role}</td>
            <td>${date}</td>
            <td><span class="status-badge status-active">نشط</span></td>
            <td>
                <button class="action-btn edit" onclick="editUser('${key}')"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete" onclick="deleteUser('${key}')"><i class="fa-solid fa-user-slash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
});

function openUserModal() {
    editingUserKey = null;
    document.getElementById('userForm').reset();
    document.getElementById('userModalTitle').textContent = 'إضافة حساب جديد';
    document.getElementById('userModal').classList.add('open');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('open');
}

function saveUser() {
    const username = document.getElementById('userName').value.trim();
    const password = document.getElementById('userPass').value.trim();
    const role     = document.getElementById('userRole').value;

    if (!username || !password) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }

    const userData = { username, password, role };

    if (editingUserKey) {
        usersRef.child(editingUserKey).update(userData).then(() => {
            logAction('تعديل حساب', `تعديل بيانات المستخدم: ${username}`);
            closeUserModal();
            showToast('تم تحديث الحساب');
        });
    } else {
        userData.createdAt = Date.now();
        usersRef.push(userData).then(() => {
            logAction('إنشاء حساب', `إضافة مستخدم جديد: ${username}`);
            closeUserModal();
            showToast('تم إشاء الحساب بنجاح');
        });
    }
}

function editUser(key) {
    usersRef.child(key).once('value').then(snapshot => {
        const user = snapshot.val();
        if (!user) return;
        editingUserKey = key;
        document.getElementById('userModalTitle').textContent = 'تعديل حساب: ' + user.username;
        document.getElementById('userName').value = user.username;
        document.getElementById('userPass').value = user.password;
        document.getElementById('userRole').value = user.role;
        document.getElementById('userModal').classList.add('open');
    });
}

function deleteUser(key) {
    if (!confirm('هل تريد حذف هذا الحساب؟')) return;
    usersRef.child(key).remove().then(() => {
        showToast('تم حذف الحساب');
        logAction('حذف حساب', `حذف مستخدم بصلاحية معينة`);
    });
}

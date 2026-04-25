/**
 * js/admin.js v6.5 — النسخة النهائية الكاملة والشاملة
 * مطعم طلوا حبابنا | Tallo Ahbabna
 * شرح تفصيلي سطر بسطر لكل الوظائف (بما فيها المحذوفات والحسابات)
 */

// ══════════════ 1. الأمان والربط (Auth & Config) ══════════════

if (localStorage.getItem('admin_auth') !== 'true') {
    window.location.href = 'login.html'; // حماية اللوحة
}

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
    categories: db.ref('categories_meta'),
    design:     db.ref('settings/design'),
    home:       db.ref('settings/home'),
    feedback:   db.ref('feedback'),
    logs:       db.ref('audit_logs'),
    trash:      db.ref('deleted_items'),
    users:      db.ref('users'),
};

let menuItems      = [];
let categoryItems  = [];
let editingKey     = null;
let isSaving       = false;

// ══════════════ 2. نظام التنقل (Navigation) ══════════════

function navigateTo(viewId) {
    document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-view="${viewId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
        view.classList.remove('active');
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';
        targetView.classList.add('active');
    }
}

// ══════════════ 3. مراقبة البيانات اللحظية (Listeners) ══════════════

// مراقبة الوجبات
REFS.menu.on('value', snapshot => {
    const data = snapshot.val();
    menuItems = [];
    if (data) {
        Object.entries(data).forEach(([key, val]) => {
            menuItems.push({ firebaseKey: key, ...val });
        });
    }
    renderTable();
    updateStats();
});

// مراقبة الأقسام
REFS.categories.on('value', snapshot => {
    const data = snapshot.val();
    categoryItems = [];
    if (data) {
        Object.entries(data).forEach(([key, val]) => {
            categoryItems.push({ id: key, ...val });
        });
    }
    rebuildCategorySelects();
    renderCategories();
});

// مراقبة سجل العمليات
REFS.logs.limitToLast(50).on('value', snapshot => {
    const tbody = document.getElementById('logs-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const logs = [];
    snapshot.forEach(c => { logs.push(c.val()); });
    logs.reverse().forEach(log => {
        const d = new Date(log.timestamp).toLocaleString('ar-EG');
        tbody.innerHTML += `<tr><td>${d}</td><td>${log.user}</td><td>${log.action}</td><td>${log.details}</td></tr>`;
    });
});

// مراقبة سلة المحذوفات
REFS.trash.on('value', snapshot => {
    const tbody = document.getElementById('trash-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const data = snapshot.val();
    if (data) {
        Object.entries(data).forEach(([key, val]) => {
            const d = new Date(val.deletedAt).toLocaleString('ar-EG');
            tbody.innerHTML += `
                <tr>
                    <td>${val.name}</td>
                    <td>${d}</td>
                    <td>${val.deletedBy || '—'}</td>
                    <td>
                        <button class="btn-primary" style="background:#2ecc71; color:#fff;" onclick="restoreItem('${key}')">استعادة</button>
                        <button class="btn-primary" style="background:#e74c3c; color:#fff;" onclick="permanentlyDelete('${key}')">حذف نهائي</button>
                    </td>
                </tr>`;
        });
    }
});

// مراقبة الحسابات
REFS.users.on('value', snapshot => {
    const grid = document.getElementById('users-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const data = snapshot.val();
    if (data) {
        Object.entries(data).forEach(([key, val]) => {
            grid.innerHTML += `
                <div class="stat-card">
                    <div class="stat-icon"><i class="fa-solid fa-user-gear"></i></div>
                    <div class="stat-info">
                        <h3>${val.name}</h3>
                        <p style="font-size:0.8rem; color:var(--text-dim);">${val.role || 'مدير'}</p>
                    </div>
                </div>`;
        });
    }
});

// ══════════════ 4. إدارة المنيو (Menu Management) ══════════════

function renderTable() {
    const tbody = document.getElementById('menu-table-body');
    if (!tbody) return;
    const q = (document.getElementById('globalSearch')?.value || '').toLowerCase();
    const catF = document.getElementById('filterCategory')?.value || 'all';
    const filtered = menuItems.filter(i => {
        const mt = !q || (i.name||'').toLowerCase().includes(q) || (i.nameEn||'').toLowerCase().includes(q);
        const mc = catF === 'all' || i.category === catF;
        return mt && mc;
    });
    tbody.innerHTML = '';
    filtered.forEach(i => {
        const active = i.status !== 'inactive';
        tbody.innerHTML += `
            <tr>
                <td><img src="${i.image || 'images/tallo-logo.png'}" class="item-thumb"></td>
                <td>
                    <div class="item-name">${i.name}</div>
                    <div class="item-en">${i.nameEn || ''}</div>
                </td>
                <td>${i.category || '—'}</td>
                <td style="color:var(--gold); font-weight:bold;">${i.price} JD</td>
                <td><button onclick="toggleStatus('${i.firebaseKey}','${i.status}')" class="status-pill ${active?'status-active':'status-hidden'}">${active?'نشط':'مخفي'}</button></td>
                <td>
                    <button class="btn-primary" style="padding:6px 10px;" onclick="editItem('${i.firebaseKey}')">تعديل</button>
                    <button class="btn-primary" style="padding:6px 10px; background:#e74c3c;" onclick="moveToTrash('${i.firebaseKey}')">حذف</button>
                </td>
            </tr>`;
    });
}

function saveItem() {
    if (isSaving) return;
    const name = document.getElementById('itemName').value.trim();
    if (!name) return alert('أدخل الاسم');
    const data = {
        name,
        nameEn: document.getElementById('itemNameEn').value,
        category: document.getElementById('itemCategory').value,
        price: document.getElementById('itemPrice').value,
        image: document.getElementById('itemImg').value,
        desc: document.getElementById('itemDesc').value,
        updatedAt: Date.now()
    };
    isSaving = true;
    const ref = editingKey ? REFS.menu.child(editingKey) : REFS.menu.push();
    ref.set(data).then(() => {
        closeItemModal();
        logActivity(editingKey?'تعديل':'إضافة', name);
    }).finally(() => isSaving = false);
}

// ══════════════ 5. إدارة المحذوفات (Trash Logic) ══════════════

function moveToTrash(key) {
    if (!confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
    const item = menuItems.find(i => i.firebaseKey === key);
    const trashData = { ...item, deletedAt: Date.now(), deletedBy: localStorage.getItem('admin_user') };
    REFS.trash.push(trashData).then(() => {
        REFS.menu.child(key).remove();
        logActivity('حذف صنف', item.name);
    });
}

function restoreItem(key) {
    REFS.trash.child(key).once('value', snap => {
        const data = snap.val();
        const { deletedAt, deletedBy, ...itemData } = data;
        REFS.menu.push(itemData).then(() => {
            REFS.trash.child(key).remove();
            logActivity('استعادة صنف', data.name);
        });
    });
}

function permanentlyDelete(key) {
    if (!confirm('سيتم الحذف نهائياً، لا يمكن التراجع!')) return;
    REFS.trash.child(key).remove().then(() => logActivity('حذف نهائي', 'صنف من السلة'));
}

// ══════════════ 6. وظائف مساعدة ══════════════

function logActivity(action, details) {
    REFS.logs.push({ action, details, user: localStorage.getItem('admin_user')||'المدير', timestamp: Date.now() });
}

function updateStats() {
    if(document.getElementById('stat-total')) document.getElementById('stat-total').textContent = menuItems.length;
    if(document.getElementById('stat-cats')) document.getElementById('stat-cats').textContent = categoryItems.length;
}

function rebuildCategorySelects() {
    const s = document.getElementById('itemCategory'), f = document.getElementById('filterCategory');
    if(s) {
        s.innerHTML = '<option disabled selected>اختر القسم...</option>';
        categoryItems.forEach(c => s.innerHTML += `<option value="${c.id}">${c.nameAr}</option>`);
    }
    if(f) {
        f.innerHTML = '<option value="all">الكل</option>';
        categoryItems.forEach(c => f.innerHTML += `<option value="${c.id}">${c.nameAr}</option>`);
    }
}

function logout() { localStorage.clear(); window.location.href='login.html'; }

// تشغيل النظام
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('current-user-display').textContent = localStorage.getItem('admin_user') || 'المدير';
});

/**
 * js/admin.js v5.0 — لوحة التحكم الفاخرة
 * مطعم طلوا حبابنا | Tallo Ahbabna
 * شرح تفصيلي لكل الأوامر البرمجية والربط مع قاعدة البيانات.
 */

// ══════════════ 1. الأمان والتحقق من الهوية ══════════════
// التأكد من أن المستخدم قام بتسجيل الدخول، وإلا يتم تحويله لصفحة login.html
if (localStorage.getItem('admin_auth') !== 'true') {
    window.location.href = 'login.html';
}

// ══════════════ 2. مفاتيح الربط مع Firebase ══════════════
const firebaseConfig = {
    apiKey: "AIzaSyCwMxgmrfnsme4pgLx00tgjGCo-gQBMUo8",
    authDomain: "tallow-ahbabna.firebaseapp.com",
    projectId: "tallow-ahbabna",
    storageBucket: "tallow-ahbabna.firebasestorage.app",
    messagingSenderId: "1025966646494",
    appId: "1:1025966646494:web:f89373fad63d988f298e4f",
    databaseURL: "https://tallow-ahbabna-default-rtdb.firebaseio.com"
};

// تشغيل Firebase
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// مراجع الجداول (المسارات في الداتابيز)
const REFS = {
    menu:       db.ref('menu_items'),       // جدول الوجبات
    categories: db.ref('categories_meta'),  // الأقسام
    design:     db.ref('settings/design'),  // إعدادات التصميم
    home:       db.ref('settings/home'),    // إعدادات الصفحة الرئيسية
    feedback:   db.ref('feedback'),         // آراء الزبائن
};

// ══════════════ 3. المتغيرات والبيانات المؤقتة ══════════════
let menuItems     = []; // مصفوفة لتخزين الوجبات
let categoryItems = []; // مصفوفة لتخزين الأقسام
let editingKey    = null; // كود الوجبة التي يتم تعديلها حالياً

// ══════════════ 4. نظام التنقل (Navigation System) ══════════════
/**
 * وظيفة التبديل بين الشاشات (مثلاً من الإحصائيات إلى المنيو)
 * @param {string} viewId - الـ ID الخاص بالقسم المراد إظهاره
 */
function navigateTo(viewId) {
    // إزالة اللون الذهبي من كل أزرار القائمة الجانبية
    document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));
    
    // تفعيل الزر المختار
    const activeBtn = document.querySelector(`[data-view="${viewId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // إخفاء كل الصفحات (Views)
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
        view.classList.remove('active');
    });

    // إظهار الصفحة المختارة فقط
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';
        targetView.classList.add('active');
    }
}

// ══════════════ 5. مراقبة البيانات (Live Listeners) ══════════════

// مراقبة الوجبات وتحديث الجدول فوراً عند أي إضافة أو حذف
REFS.menu.on('value', snapshot => {
    const data = snapshot.val();
    menuItems = [];
    if (data) {
        Object.entries(data).forEach(([key, val]) => {
            menuItems.push({ firebaseKey: key, ...val });
        });
    }
    renderTable(); // إعادة رسم الجدول
    updateStats(); // تحديث الأرقام الإحصائية
});

// مراقبة الأقسام (لحوم، مقبلات...)
REFS.categories.on('value', snapshot => {
    const data = snapshot.val();
    categoryItems = [];
    if (data) {
        Object.entries(data).forEach(([key, val]) => {
            categoryItems.push({ id: key, ...val });
        });
        categoryItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    rebuildCategorySelects(); // تحديث قائمة الأقسام في المودال
});

// ══════════════ 6. وظائف الرسم (Rendering) ══════════════

/**
 * تحديث الجدول الرئيسي لعرض الوجبات
 */
function renderTable() {
    const tbody = document.getElementById('menu-table-body');
    if (!tbody) return;

    // البحث: فلترة المنيو بناءً على النص المكتوب في خانة البحث
    const q = (document.getElementById('globalSearch')?.value || '').toLowerCase();
    const catF = document.getElementById('filterCategory')?.value || 'all';

    const filtered = menuItems.filter(item => {
        const matchText = !q || (item.name||'').toLowerCase().includes(q) || (item.nameEn||'').toLowerCase().includes(q);
        const matchCat  = catF === 'all' || item.category === catF;
        return matchText && matchCat;
    });

    tbody.innerHTML = '';
    filtered.forEach(item => {
        const isActive = item.status !== 'inactive';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${item.image || 'images/tallo-logo.png'}" class="item-thumb"></td>
            <td>
                <div class="item-name">${item.name || '—'}</div>
                <div class="item-en">${item.nameEn || ''}</div>
            </td>
            <td>${item.category || '—'}</td>
            <td style="font-weight:bold; color:var(--gold);">${item.price || '—'} JD</td>
            <td><span class="status-pill ${isActive ? 'status-active' : 'status-hidden'}">${isActive ? 'نشط' : 'مخفي'}</span></td>
            <td>
                <button class="btn-primary" style="padding:6px 12px; font-size:0.8rem; background:rgba(255,255,255,0.05); color:#fff;" onclick="editItem('${item.firebaseKey}')">
                    تعديل
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * تحديث عدادات الإحصائيات في الصفحة الرئيسية للوحة
 */
function updateStats() {
    const total = menuItems.length;
    const active = menuItems.filter(i => i.status !== 'inactive').length;
    const hidden = total - active;

    if (document.getElementById('stat-total'))  document.getElementById('stat-total').textContent = total;
    if (document.getElementById('stat-active')) document.getElementById('stat-active').textContent = active;
    if (document.getElementById('stat-hidden')) document.getElementById('stat-hidden').textContent = hidden;
    if (document.getElementById('stat-cats'))   document.getElementById('stat-cats').textContent = categoryItems.length;
}

// ══════════════ 7. إدارة الوجبات (CRUD Operations) ══════════════

function openItemModal() {
    editingKey = null;
    document.getElementById('itemForm').reset();
    document.getElementById('modalTitle').textContent = 'إضافة صنف جديد';
    document.getElementById('itemModal').classList.add('active');
}

function closeItemModal() {
    document.getElementById('itemModal').classList.remove('active');
}

function saveItem() {
    const itemData = {
        name:     document.getElementById('itemName').value.trim(),
        nameEn:   document.getElementById('itemNameEn').value.trim(),
        category: document.getElementById('itemCategory').value,
        price:    document.getElementById('itemPrice').value.trim(),
        image:    document.getElementById('itemImg').value.trim(),
        desc:     document.getElementById('itemDesc').value.trim(),
        updatedAt: Date.now()
    };

    if (!itemData.name) return alert('يرجى إدخال اسم الوجبة');

    if (editingKey) {
        REFS.menu.child(editingKey).update(itemData)
            .then(() => { closeItemModal(); });
    } else {
        REFS.menu.push(itemData)
            .then(() => { closeItemModal(); });
    }
}

function editItem(key) {
    const item = menuItems.find(i => i.firebaseKey === key);
    if (!item) return;
    editingKey = key;
    document.getElementById('modalTitle').textContent = 'تعديل الوجبة';
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemNameEn').value = item.nameEn || '';
    document.getElementById('itemCategory').value = item.category || '';
    document.getElementById('itemPrice').value = item.price || '';
    document.getElementById('itemImg').value = item.image || '';
    document.getElementById('itemDesc').value = item.desc || '';
    document.getElementById('itemModal').classList.add('active');
}

function onGlobalSearch() { renderTable(); }

function rebuildCategorySelects() {
    const sel = document.getElementById('itemCategory');
    const fillCat = document.getElementById('filterCategory');
    if (sel) {
        sel.innerHTML = '<option value="" disabled selected>اختر القسم...</option>';
        categoryItems.forEach(c => sel.innerHTML += `<option value="${c.id}">${c.nameAr}</option>`);
    }
    if (fillCat) {
        fillCat.innerHTML = '<option value="all">كل الأقسام</option>';
        categoryItems.forEach(c => fillCat.innerHTML += `<option value="${c.id}">${c.nameAr}</option>`);
    }
}

// ══════════════ 8. التحكم بالتصميم ══════════════

REFS.design.on('value', snapshot => {
    const d = snapshot.val();
    if (!d) return;
    if (document.getElementById('d_primaryColor')) document.getElementById('d_primaryColor').value = d.primaryColor || '#C5A022';
    if (document.getElementById('d_pageBg')) document.getElementById('d_pageBg').value = d.pageBg || '#0a0a0a';
});

function saveDesign() {
    const data = {
        primaryColor: document.getElementById('d_primaryColor').value,
        pageBg: document.getElementById('d_pageBg').value,
        updatedAt: Date.now()
    };
    REFS.design.update(data).then(() => alert('تم الحفظ بنجاح ✓'));
}

// ══════════════ 9. الخروج ══════════════
function logout() {
    localStorage.removeItem('admin_auth');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('admin_user') || 'المدير العام';
    if (document.getElementById('current-user-display')) {
        document.getElementById('current-user-display').textContent = user;
    }
});

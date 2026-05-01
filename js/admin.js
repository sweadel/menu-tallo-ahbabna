/**
 * مطعم طلو احبابنا - مادبا
 * ملف التحكم الرئيسي - يربط لوحة الإدارة بقاعدة بيانات Firebase
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
const storage = firebase.storage();

const REFS = {
    menu: db.ref('menu_items'),
    cats: db.ref('categories_meta'),
    design: db.ref('settings/design'),
    reviews: db.ref('feedback'),
    deleted: db.ref('deleted_items')
};

// 3. المتغيرات العامة
let menuItems = [], catItems = [], reviewItems = [], deletedItems = [];
let editKey = null, editCatKey = null, restoreKey = null, isSaving = false;

// ══════════════════════════════════════════════
// 4. نظام التنقل
// ══════════════════════════════════════════════

window.navigateTo = function(id) {

    
    // 1. تحديث أزرار القائمة الجانبية
    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-view') === id) btn.classList.add('active');
    });

    // 2. تحديث الواجهات
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
        if (view.id === id) view.classList.add('active');
    });

    localStorage.setItem('last_admin_view', id);

    // 3. تحميل البيانات الخاصة بكل واجهة
    if (id === 'view-menu') renderTable();
    if (id === 'view-categories') renderCatTable();
    if (id === 'view-design') loadDesign();
    if (id === 'view-reviews') renderReviews();
    if (id === 'view-bulk') renderBulkTable();
    if (id === 'view-deleted') renderDeletedTable();
};

// ══════════════════════════════════════════════
// 5. إدارة البيانات والرندرة
// ══════════════════════════════════════════════

// الاستماع للتغييرات في قاعدة البيانات
REFS.menu.on('value', snap => {
    menuItems = [];
    if (snap.exists()) {
        Object.entries(snap.val()).forEach(([k, v]) => menuItems.push({ key: k, ...v }));
    }
    renderTable();
    updateStats();
});

REFS.cats.on('value', snap => {
    catItems = [];
    if (snap.exists()) {
        Object.entries(snap.val()).forEach(([k, v]) => catItems.push({ id: k, ...v }));
    }
    catItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    rebuildSelects();
    renderCatTable();
    updateStats();
});

REFS.reviews.on('value', snap => {
    reviewItems = [];
    if (snap.exists()) {
        Object.entries(snap.val()).forEach(([k, v]) => reviewItems.push({ key: k, ...v }));
    }
    reviewItems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    renderReviews();
    updateStats();
});

REFS.deleted.on('value', snap => {
    deletedItems = [];
    if (snap.exists()) {
        Object.entries(snap.val()).forEach(([k, v]) => deletedItems.push({ key: k, ...v }));
    }
    renderDeletedTable();
});

function updateStats() {
    const statItems = document.getElementById('stat-items');
    const statCats = document.getElementById('stat-cats');
    const statReviews = document.getElementById('stat-reviews');

    if (statItems) statItems.textContent = menuItems.length;
    if (statCats) statCats.textContent = catItems.length;
    if (statReviews) statReviews.textContent = reviewItems.length;
}

// ── إدارة الأطباق ──
function renderTable() {
    const tableBody = document.getElementById('menu-table-body');
    if (!tableBody) return;

    const searchQuery = (document.getElementById('item-search')?.value || '').toLowerCase();
    const catFilter = document.getElementById('item-cat-filter')?.value || 'all';

    const filtered = menuItems.filter(item => {
        const matchesCat = (catFilter === 'all' || item.category === catFilter);
        const matchesSearch = (!searchQuery || 
            (item.name || '').toLowerCase().includes(searchQuery) || 
            (item.nameEn || '').toLowerCase().includes(searchQuery));
        return matchesCat && matchesSearch;
    });

    tableBody.innerHTML = filtered.map(item => {
        const cat = catItems.find(c => c.id === item.category);
        const catName = cat ? cat.nameAr : item.category;
        const isActive = item.status !== 'inactive';

        return `
            <tr>
                <td><img src="${item.image || 'images/tallo-logo.png'}" class="item-img" onerror="this.src='images/tallo-logo.png'"></td>
                <td>
                    <div style="font-weight:600;">${item.name}</div>
                    <small style="color:#777;">${item.nameEn || ''}</small>
                </td>
                <td><span style="background:rgba(255,255,255,0.05); padding:4px 10px; border-radius:8px; font-size:0.8rem;">${catName}</span></td>
                <td style="color:var(--gold); font-weight:700;">${item.price} JD</td>
                <td>
                    <label class="switch">
                        <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleItemStatus('${item.key}', this.checked)">
                        <span class="slider"></span>
                    </label>
                </td>
                <td>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn btn-icon btn-edit" onclick="openItemModal('${item.key}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-icon btn-delete" onclick="deleteItem('${item.key}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function toggleItemStatus(key, active) {
    const status = active ? 'active' : 'inactive';
    REFS.menu.child(key).update({ status }).then(() => {
        showToast(active ? 'تم تفعيل الطبق' : 'تم إخفاء الطبق');
    });
}

function openItemModal(key = null) {
    editKey = key;
    const modal = document.getElementById('item-modal');
    const form = document.getElementById('item-form');
    const title = document.getElementById('modal-title');
    const progress = document.getElementById('upload-progress');
    
    form.reset();
    if (progress) {
        progress.style.display = 'none';
        progress.querySelector('.progress-fill').style.width = '0%';
    }
    
    title.textContent = key ? 'تعديل بيانات الطبق' : 'إضافة طبق جديد';
    document.getElementById('img-prev').src = 'images/tallo-logo.png';
    document.getElementById('item-img-url').value = 'images/tallo-logo.png';

    if (key) {
        const item = menuItems.find(i => i.key === key);
        if (item) {
            document.getElementById('item-name').value = item.name || '';
            document.getElementById('item-name-en').value = item.nameEn || '';
            document.getElementById('item-cat').value = item.category || '';
            document.getElementById('item-price').value = item.price || '';
            document.getElementById('item-desc').value = item.desc || '';
            document.getElementById('item-desc-en').value = item.descEn || '';
            document.getElementById('item-img-url').value = item.image || 'images/tallo-logo.png';
            document.getElementById('img-prev').src = item.image || 'images/tallo-logo.png';
        }
    }
    modal.style.display = 'flex';
}

async function saveItem() {
    if (isSaving) return;
    const saveBtn = document.querySelector('#item-form button[type="submit"]');
    const originalBtnText = saveBtn.innerHTML;
    
    const name = document.getElementById('item-name').value.trim();
    const cat = document.getElementById('item-cat').value;
    const price = document.getElementById('item-price').value;
    
    if (!name || !cat || !price) return showToast('يرجى تعبئة الحقول الأساسية', 'error');

    isSaving = true;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    const file = document.getElementById('item-file').files[0];
    const progressBar = document.getElementById('upload-progress');
    const progressFill = progressBar ? progressBar.querySelector('.progress-fill') : null;

    const data = {
        name,
        nameEn: document.getElementById('item-name-en').value.trim(),
        category: cat,
        price: price,
        desc: document.getElementById('item-desc').value.trim(),
        descEn: document.getElementById('item-desc-en').value.trim(),
        image: document.getElementById('item-img-url').value || 'images/tallo-logo.png',
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (!editKey) data.status = 'active';

    const performSave = (imgUrl = null) => {
        if (imgUrl) data.image = imgUrl;
        const ref = editKey ? REFS.menu.child(editKey) : REFS.menu.push();
        ref.update(data).then(() => {
            closeModal('item-modal');
            showToast('تم حفظ الطبق بنجاح ✨');
        }).catch(err => {
            console.error(err);
            showToast('حدث خطأ أثناء الحفظ في قاعدة البيانات: ' + err.message, 'error');
        }).finally(() => {
            isSaving = false;
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
        });
    };

    try {
        if (file) {
            const compressedBlob = await compressImage(file);
            if (progressBar) progressBar.style.display = 'block';
            const storageRef = storage.ref(`menu/${Date.now()}.jpg`);
            const uploadTask = storageRef.put(compressedBlob);

            uploadTask.on('state_changed', 
                (snap) => {
                    const p = (snap.bytesTransferred / snap.totalBytes) * 100;
                    if (progressFill) progressFill.style.width = p + '%';
                },
                (err) => {
                    console.error('Upload Error:', err);
                    showToast('خطأ في رفع الصورة: ' + err.message, 'error');
                    isSaving = false;
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalBtnText;
                },
                () => {
                    uploadTask.snapshot.ref.getDownloadURL().then(url => performSave(url));
                }
            );
        } else {
            performSave();
        }
    } catch (e) {
        console.error(e);
        isSaving = false;
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
        showToast('حدث خطأ غير متوقع: ' + e.message, 'error');
    }
}

function deleteItem(key) {
    if (confirm('هل أنت متأكد من نقل هذا الطبق إلى سلة المهملات؟')) {
        const item = menuItems.find(i => i.key === key);
        if (!item) return;

        const deletedData = {
            ...item,
            deletedAt: firebase.database.ServerValue.TIMESTAMP
        };

        showLoading(true);
        // 1. Move to deleted_items
        REFS.deleted.child(key).set(deletedData).then(() => {
            // 2. Remove from menu_items
            return REFS.menu.child(key).remove();
        }).then(() => {
            showToast('تم نقل الطبق إلى السجل المحذوف');
            showLoading(false);
        }).catch(err => {
            console.error(err);
            showLoading(false);
            showToast('حدث خطأ أثناء الحذف', 'error');
        });
    }
}

// ── سجل المحذوفات ──
function renderDeletedTable() {
    const body = document.getElementById('deleted-table-body');
    if (!body) return;

    if (deletedItems.length === 0) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:3rem; color:#666;">لا توجد أصناف محذوفة حالياً</td></tr>';
        return;
    }

    body.innerHTML = deletedItems.map(item => {
        const cat = catItems.find(c => c.id === item.category);
        const catName = cat ? cat.nameAr : item.category;
        const date = item.deletedAt ? new Date(item.deletedAt).toLocaleString('ar-JO') : 'غير معروف';

        return `
            <tr>
                <td>
                    <div style="font-weight:600;">${item.name}</div>
                    <small style="color:#777;">${item.category}</small>
                </td>
                <td><span style="background:rgba(255,255,255,0.05); padding:4px 10px; border-radius:8px; font-size:0.8rem;">${catName}</span></td>
                <td>${date}</td>
                <td>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn btn-icon btn-edit" onclick="openRestoreModal('${item.key}')" title="تعديل واستعادة"><i class="fas fa-undo"></i></button>
                        <button class="btn btn-icon btn-delete" onclick="permanentDelete('${item.key}')" title="حذف نهائي"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function openRestoreModal(key) {
    restoreKey = key;
    const item = deletedItems.find(i => i.key === key);
    if (!item) return;

    // Reuse existing item-modal
    openItemModal();
    const title = document.getElementById('modal-title');
    title.innerHTML = '<i class="fas fa-trash-restore"></i> استعادة الصنف';
    
    // Override form fields
    document.getElementById('item-name').value = item.name || '';
    document.getElementById('item-name-en').value = item.nameEn || '';
    document.getElementById('item-cat').value = item.category || '';
    document.getElementById('item-price').value = item.price || '';
    document.getElementById('item-desc').value = item.desc || '';
    document.getElementById('item-desc-en').value = item.descEn || '';
    document.getElementById('item-img-url').value = item.image || '';
    document.getElementById('img-prev').src = item.image || 'images/tallo-logo.png';

    // Override save button behavior
    const form = document.getElementById('item-form');
    const originalSubmit = form.onsubmit;
    
    form.onsubmit = function(e) {
        e.preventDefault();
        confirmRestore(item);
        form.onsubmit = originalSubmit; // Reset after done
    };
}

function confirmRestore(originalData) {
    const name = document.getElementById('item-name').value.trim();
    const cat = document.getElementById('item-cat').value;
    const price = document.getElementById('item-price').value;

    if (!name || !cat || !price) return showToast('يرجى تعبئة الحقول الأساسية', 'error');

    showLoading(true);
    const newData = {
        ...originalData,
        name,
        nameEn: document.getElementById('item-name-en').value.trim(),
        category: cat,
        price: price,
        desc: document.getElementById('item-desc').value.trim(),
        descEn: document.getElementById('item-desc-en').value.trim(),
        status: 'active',
        restoredAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Remove extra keys from deleted_items node
    delete newData.deletedAt;
    delete newData.key;

    // 1. Add back to menu_items
    REFS.menu.child(restoreKey).set(newData).then(() => {
        // 2. Remove from deleted_items
        return REFS.deleted.child(restoreKey).remove();
    }).then(() => {
        closeModal('item-modal');
        showToast('تمت استعادة الصنف بنجاح ✨');
        showLoading(false);
        restoreKey = null;
    }).catch(err => {
        console.error(err);
        showLoading(false);
        showToast('حدث خطأ أثناء الاستعادة', 'error');
    });
}

function permanentDelete(key) {
    if (confirm('هل أنت متأكد من حذف هذا الصنف نهائياً؟ لا يمكن التراجع عن هذه العملية.')) {
        REFS.deleted.child(key).remove().then(() => showToast('تم الحذف النهائي'));
    }
}

// ── إدارة الأقسام ──
function renderCatTable() {
    const body = document.getElementById('cats-table-body');
    if (!body) return;

    body.innerHTML = catItems.map(cat => `
        <tr>
            <td><i class="fas ${cat.icon || 'fa-utensils'}" style="color:var(--gold);"></i></td>
            <td>${cat.nameAr}</td>
            <td>${cat.nameEn}</td>
            <td>${cat.section}</td>
            <td>${cat.order || 0}</td>
            <td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-icon btn-edit" onclick="openCatModal('${cat.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-icon btn-delete" onclick="deleteCat('${cat.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openCatModal(id = null) {
    editCatKey = id;
    const modal = document.getElementById('cat-modal');
    document.getElementById('cat-form').reset();

    if (id) {
        const cat = catItems.find(c => c.id === id);
        if (cat) {
            document.getElementById('cat-name-ar').value = cat.nameAr || '';
            document.getElementById('cat-name-en').value = cat.nameEn || '';
            document.getElementById('cat-icon').value = cat.icon || '';
            document.getElementById('cat-section').value = cat.section || 'arabic';
            document.getElementById('cat-order').value = cat.order || 0;
        }
    }
    modal.style.display = 'flex';
}

function saveCategory() {
    if (isSaving) return;
    const nameAr = document.getElementById('cat-name-ar').value.trim();
    const nameEn = document.getElementById('cat-name-en').value.trim();
    if (!nameAr || !nameEn) return showToast('يرجى تعبئة الأسماء', 'error');

    isSaving = true;
    showLoading(true);

    const data = {
        nameAr,
        nameEn,
        icon: document.getElementById('cat-icon').value.trim() || 'fa-utensils',
        section: document.getElementById('cat-section').value,
        order: parseInt(document.getElementById('cat-order').value) || 0,
        status: 'active'
    };

    const id = editCatKey || `cat_${Date.now()}`;
    REFS.cats.child(id).update(data).then(() => {
        closeModal('cat-modal');
        showToast('تم حفظ القسم بنجاح ✅');
        showLoading(false);
        isSaving = false;
    });
}

function deleteCat(id) {
    if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
        REFS.cats.child(id).remove().then(() => showToast('تم حذف القسم'));
    }
}

// ── إعدادات التصميم ──
function loadDesign() {
    REFS.design.once('value', snap => {
        const d = snap.val() || {};
        const gold = d.gold || '#C5A022';
        const bg = d.bg || '#121212';
        
        document.getElementById('design-gold').value = gold;
        document.getElementById('design-gold-txt').value = gold;
        document.getElementById('design-bg').value = bg;
        document.getElementById('design-bg-txt').value = bg;
        document.getElementById('design-font').value = d.font || "'Noto Kufi Arabic', sans-serif";
        document.getElementById('design-ticker').value = d.ticker || '';
    });
}

function saveDesign() {
    showLoading(true);
    const data = {
        gold: document.getElementById('design-gold-txt').value || document.getElementById('design-gold').value,
        bg: document.getElementById('design-bg-txt').value || document.getElementById('design-bg').value,
        font: document.getElementById('design-font').value,
        ticker: document.getElementById('design-ticker').value,
        promoShow: true, // تفعيل الشريط تلقائياً عند كتابة نص
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    REFS.design.update(data).then(() => {
        showLoading(false);
        showToast('تم حفظ إعدادات التصميم ✨');
    });
}

// ── آراء الزبائن ──
function renderReviews() {
    const list = document.getElementById('reviews-list');
    if (!list) return;

    if (reviewItems.length === 0) {
        list.innerHTML = '<p style="grid-column: span 3; text-align:center; padding:3rem; color:#666;">لا توجد تقييمات حالياً</p>';
        return;
    }

    list.innerHTML = reviewItems.map(rev => `
        <div class="stat-card" style="flex-direction:column; align-items:flex-start; gap:1rem; position:relative;">
            <div style="display:flex; justify-content:space-between; width:100%;">
                <div style="font-weight:700; color:var(--gold);">${rev.name || 'زائر'}</div>
                <div style="color:#ffc107;">${'★'.repeat(rev.rating || 5)}${'☆'.repeat(5-(rev.rating||5))}</div>
            </div>
            <p style="font-size:0.9rem; color:#ccc; margin:0;">${rev.comment || 'بدون تعليق'}</p>
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center; margin-top:0.5rem;">
                <small style="color:#555;">${rev.timestamp ? new Date(rev.timestamp).toLocaleDateString('ar-JO') : ''}</small>
                <button class="btn btn-icon btn-delete" style="width:30px; height:30px;" onclick="deleteReview('${rev.key}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function deleteReview(key) {
    if (confirm('حذف التقييم؟')) REFS.reviews.child(key).remove();
}

// ── تعديل الأسعار بالجملة ──
function renderBulkTable() {
    const body = document.getElementById('bulk-table-body');
    const filter = document.getElementById('bulk-cat-filter');
    if (!body || !filter) return;

    const catId = filter.value;
    const filtered = menuItems.filter(item => item.category === catId);

    body.innerHTML = filtered.map(item => `
        <tr>
            <td>
                <div style="font-weight:600;">${item.name}</div>
            </td>
            <td><small style="color:#777;">${item.nameEn || ''}</small></td>
            <td>
                <input type="number" step="0.01" class="bulk-price-input" 
                       data-key="${item.key}" value="${item.price || ''}" 
                       style="border-color: var(--gold); background: rgba(197, 160, 34, 0.05);">
            </td>
        </tr>
    `).join('');
    
    if(filtered.length === 0) {
        body.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:3rem; color:#666;">لا توجد أطباق في هذا القسم</td></tr>';
    }
}

function saveBulkPrices() {
    const inputs = document.querySelectorAll('.bulk-price-input');
    const updates = {};
    let count = 0;

    inputs.forEach(input => {
        const key = input.getAttribute('data-key');
        const newPrice = input.value;
        const originalItem = menuItems.find(i => i.key === key);
        
        if (originalItem && originalItem.price !== newPrice) {
            updates[`${key}/price`] = newPrice;
            count++;
        }
    });

    if (count === 0) return showToast('لم يتم تغيير أي أسعار');

    showLoading(true);
    REFS.menu.update(updates).then(() => {
        showLoading(false);
        showToast(`تم تحديث أسعار ${count} طبق بنجاح ✨`);
    }).catch(err => {
        console.error(err);
        showLoading(false);
        showToast('حدث خطأ أثناء الحفظ', 'error');
    });
}

// ── المساعدات ──
function rebuildSelects() {
    const select = document.getElementById('item-cat');
    const filter = document.getElementById('item-cat-filter');
    if (select) {
        select.innerHTML = '<option value="" disabled selected>اختر القسم...</option>' + 
            catItems.map(c => `<option value="${c.id}">${c.nameAr}</option>`).join('');
    }
    if (filter) {
        const current = filter.value;
        filter.innerHTML = '<option value="all">كل الأقسام</option>' + 
            catItems.map(c => `<option value="${c.id}">${c.nameAr}</option>`).join('');
        filter.value = current || 'all';
    }

    const bulkFilter = document.getElementById('bulk-cat-filter');
    if (bulkFilter) {
        const current = bulkFilter.value;
        bulkFilter.innerHTML = catItems.map(c => `<option value="${c.id}">${c.nameAr}</option>`).join('');
        if (!current && catItems.length > 0) bulkFilter.value = catItems[0].id;
        else bulkFilter.value = current;
    }
}

window.closeModal = function(id) {
    document.getElementById(id).style.display = 'none';
};

window.previewImage = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('img-prev').src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
};

// ── ملحق ضغط الصور ──
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            };
        };
    });
}

// 6. التهيئة عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    // مزامنة حقول الألوان
    document.getElementById('design-gold')?.addEventListener('input', e => document.getElementById('design-gold-txt').value = e.target.value);
    document.getElementById('design-bg')?.addEventListener('input', e => document.getElementById('design-bg-txt').value = e.target.value);

    // التحميل الأولي
    const lastView = localStorage.getItem('last_admin_view') || 'view-dashboard';
    navigateTo(lastView);
});


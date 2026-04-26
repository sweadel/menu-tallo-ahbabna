/**
 * js/admin.js v12.0 — النسخة الاحترافية الشاملة
 * مطعم طلو احبابنا | Tallo Ahbabna
 */

if (localStorage.getItem('admin_auth') !== 'true') window.location.href = 'login.html';

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

let menuItems=[], catItems=[], feedItems=[], editKey=null, editCatKey=null, isSaving=false, activeFilterCat='all';

// ══════════════ التنقل ══════════════

function navigateTo(id) {
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-view="${id}"]`)?.classList.add('active');
    document.querySelectorAll('.view').forEach(v => { v.style.display='none'; v.classList.remove('active'); });
    const t = document.getElementById(id);
    if(t) { 
        t.style.display='block'; 
        setTimeout(()=>t.classList.add('active'),10); 
    }
    document.getElementById('sidebar')?.classList.remove('open');
    localStorage.setItem('last_admin_view', id);
    
    if(id === 'view-feedback') renderFeedTable();
    if(id === 'view-logs') renderLogsTable();
    if(id === 'view-trash') renderTrashTable();
}

// ══════════════ المراقبة والتحميل ══════════════

REFS.menu.on('value', snap => {
    menuItems = [];
    if(snap.exists()) Object.entries(snap.val()).forEach(([k,v]) => menuItems.push({key:k, ...v}));
    renderTable();
    renderCatTable();
    updateStats();
});

REFS.cats.on('value', snap => {
    catItems = [];
    if(snap.exists()) Object.entries(snap.val()).forEach(([k,v]) => catItems.push({id:k, ...v}));
    catItems.sort((a,b) => (a.order||0) - (b.order||0));
    rebuildSelects();
    renderCatTable();
    renderTable();
    updateStats();
});

REFS.feed.on('value', s => { 
    feedItems=[]; if(s.exists()) Object.entries(s.val()).forEach(([k,v])=>feedItems.push({key:k, ...v})); 
    renderFeedTable(); 
    updateStats(); 
});

// ══════════════ إدارة المنيو ══════════════

function renderTable() {
    const b = document.getElementById('menu-table-body');
    if(!b) return;
    const q = (document.getElementById('globalSearch')?.value || '').toLowerCase();
    const filtered = menuItems.filter(i => (activeFilterCat==='all'||i.category===activeFilterCat) && (!q || (i.name||'').toLowerCase().includes(q) || (i.nameEn||'').toLowerCase().includes(q)));
    
    b.innerHTML = '';
    filtered.forEach(i => {
        const act = i.status!=='inactive';
        let opts = catItems.map(c => `<option value="${c.id}" ${i.category===c.id?'selected':''}>${c.nameAr}</option>`).join('');
        
        let badgeHtml = '';
        if(i.badge === 'HOT') badgeHtml = '<span style="background:#e74c3c; color:#fff; font-size:0.6rem; padding:2px 6px; border-radius:4px; margin-right:5px;">HOT 🔥</span>';
        if(i.badge === 'NEW') badgeHtml = '<span style="background:#2ecc71; color:#fff; font-size:0.6rem; padding:2px 6px; border-radius:4px; margin-right:5px;">NEW ✨</span>';
        if(i.badge === 'SPECIAL') badgeHtml = '<span style="background:#f1c40f; color:#000; font-size:0.6rem; padding:2px 6px; border-radius:4px; margin-right:5px;">STAR ⭐</span>';

        b.innerHTML += `<tr>
            <td><img src="${i.image||'images/tallo-logo.png'}" class="item-thumb" onerror="this.src='images/tallo-logo.png'"></td>
            <td>
                <div style="display:flex; align-items:center;">
                    ${badgeHtml}
                    <b>${i.name}</b>
                </div>
                <small>${i.nameEn||''}</small>
            </td>
            <td><select class="form-control" style="padding:5px 10px; font-size:0.8rem;" onchange="quickMoveItem('${i.key}', this.value)">${opts}</select></td>
            <td style="color:var(--gold); font-weight:bold;">${i.price} JD</td>
            <td><button onclick="toggleItem('${i.key}','${i.status}')" class="status-pill ${act?'status-active':'status-hidden'}">${act?'نشط':'مخفي'}</button></td>
            <td><div style="display:flex; gap:5px;">
                <button class="btn-primary" style="padding:6px 10px;" onclick="editItem('${i.key}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-primary" style="background:rgba(231,76,60,0.1); color:#e74c3c; padding:6px 10px;" onclick="deleteItem('${i.key}')"><i class="fa-solid fa-trash"></i></button>
            </div></td></tr>`;
    });
}

function saveItem() {
    if(isSaving) return; 
    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    if(!name || !category) return showToast('يرجى إدخال الاسم والقسم', 'error');
    
    isSaving=true;
    const data = { 
        name, 
        nameEn: document.getElementById('itemNameEn').value.trim(), 
        category: category, 
        price: document.getElementById('itemPrice').value.trim(), 
        image: document.getElementById('itemImg').value.trim(), 
        desc: document.getElementById('itemDesc').value.trim(), 
        descEn: document.getElementById('itemDescEn').value.trim(), 
        badge: document.getElementById('itemBadge').value || '',
        status: document.getElementById('itemStatus').value || 'active',
        updatedAt: firebase.database.ServerValue.TIMESTAMP 
    };
    
    const r = editKey ? REFS.menu.child(editKey) : REFS.menu.push();
    r.set(data).then(() => { 
        closeItemModal(); 
        showToast('تم حفظ الوجبة بنجاح');
        log(editKey?'تعديل وجبة':'إضافة وجبة', name); 
    }).catch(err => showToast('حدث خطأ أثناء الحفظ', 'error'))
    .finally(() => isSaving=false);
}

// ══════════════ إدارة الأقسام ══════════════

function renderCatTable() {
    const b = document.getElementById('cat-table-body');
    if(!b) return; b.innerHTML = '';
    catItems.forEach(c => {
        const act = c.status !== 'hidden';
        const itemCount = menuItems.filter(i => i.category === c.id).length;
        b.innerHTML += `<tr>
            <td style="font-size:1.2rem; color:var(--gold);"><i class="fa-solid ${c.icon || 'fa-folder'}"></i></td>
            <td><b>${c.nameAr}</b><br><small>${c.nameEn || ''}</small></td>
            <td><span class="status-pill" style="background:rgba(255,255,255,0.05); color:#ccc;">${c.section || '---'}</span></td>
            <td><b>${itemCount}</b> وجبة</td>
            <td>${c.order || 0}</td>
            <td><button onclick="toggleCat('${c.id}','${c.status}')" class="status-pill ${act?'status-active':'status-hidden'}">${act?'ظاهر':'مخفي'}</button></td>
            <td><div style="display:flex; gap:5px;">
                <button class="btn-primary" style="padding:6px 10px;" onclick="editCat('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-primary" style="background:rgba(231,76,60,0.1); color:#e74c3c; padding:6px 10px;" onclick="deleteCat('${c.id}')"><i class="fa-solid fa-trash"></i></button>
            </div></td></tr>`;
    });
}

function saveCategory() {
    const name = document.getElementById('catNameAr').value.trim();
    if(!name) return showToast('يرجى إدخال اسم القسم', 'error');
    
    const statusRadio = document.querySelector('input[name="catStatus"]:checked');
    const status = statusRadio ? statusRadio.value : 'active';
    
    const data = {
        nameAr: name, 
        nameEn: document.getElementById('catNameEn').value.trim(),
        section: document.getElementById('catSection').value,
        order: parseInt(document.getElementById('catOrder').value) || 0,
        icon: document.getElementById('catIcon').value.trim(),
        descAr: document.getElementById('catDescAr').value.trim(),
        descEn: document.getElementById('catDescEn').value.trim(),
        status: status,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    const id = editCatKey || name.toLowerCase().replace(/\s+/g, '-');
    REFS.cats.child(id).update(data).then(() => { 
        closeCatModal(); 
        showToast('تم حفظ القسم بنجاح');
        log('إدارة الأقسام', `حفظ القسم: ${name}`); 
    }).catch(err => showToast('خطأ في الحفظ', 'error'));
}

// ══════════════ وظائف مساعدة وإشعارات ══════════════

function showToast(msg, type='success') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const t = document.createElement('div');
    t.className = 'toast-notification';
    t.style = `padding:15px 25px; background:#1a1a1a; border-right:4px solid ${type==='success'?'#2ecc71':'#e74c3c'}; color:#fff; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,0.5); font-size:0.9rem; animation:slideIn 0.3s ease forwards; margin-bottom:10px;`;
    t.innerHTML = `<i class="fa-solid ${type==='success'?'fa-check-circle':'fa-exclamation-circle'}" style="margin-left:10px; color:${type==='success'?'#2ecc71':'#e74c3c'}"></i> ${msg}`;
    container.appendChild(t);
    setTimeout(() => { 
        t.style.opacity='0'; 
        t.style.transform='translateX(-20px)'; 
        setTimeout(()=>t.remove(),300); 
    }, 3000);
}

function previewItemImage(url) {
    const p = document.getElementById('item-img-preview');
    if(!p) return;
    if(url && url.length > 10) p.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
    else p.innerHTML = `<i class="fa-solid fa-image" style="font-size:3rem; color:rgba(255,255,255,0.1);"></i>`;
}

document.getElementById('catIcon')?.addEventListener('input', (e) => {
    const icon = e.target.value.trim() || 'fa-circle-question';
    const p = document.getElementById('icon-preview');
    if(p) p.innerHTML = `<i class="fa-solid ${icon}"></i>`;
});

function quickMoveItem(k, c) { REFS.menu.child(k).update({ category: c }).then(() => { showToast('تم نقل الوجبة بنجاح'); log('نقل سريع', 'تغيير قسم الوجبة'); }); }

function rebuildSelects() {
    const t = document.getElementById('catFilterTabs'), s = document.getElementById('itemCategory'); 
    if(t) {
        t.innerHTML = `<button class="cat-filter-tab ${activeFilterCat==='all'?'active':''}" onclick="setFilterCat('all')">الكل</button>`;
        catItems.forEach(c => t.innerHTML += `<button class="cat-filter-tab ${activeFilterCat===c.id?'active':''}" onclick="setFilterCat('${c.id}')">${c.nameAr}</button>`);
    }
    if(s) s.innerHTML = '<option value="" disabled selected>اختر القسم...</option>' + catItems.map(c => `<option value="${c.id}">${c.nameAr}</option>`).join('');
}

function updateStats() {
    if(document.getElementById('stat-total')) document.getElementById('stat-total').textContent = menuItems.length;
    if(document.getElementById('stat-cats')) document.getElementById('stat-cats').textContent = catItems.length;
    if(document.getElementById('stat-feed')) document.getElementById('stat-feed').textContent = feedItems.length;
}

function log(a, d) { REFS.logs.push({ action: a, details: d, user: localStorage.getItem('admin_user')||'المدير', timestamp: firebase.database.ServerValue.TIMESTAMP }); }
function logout() { localStorage.clear(); window.location.href='login.html'; }
function setFilterCat(id) { activeFilterCat=id; renderTable(); }

function openItemModal() { 
    editKey=null; 
    document.getElementById('itemForm').reset(); 
    previewItemImage(''); 
    document.getElementById('modalTitle').textContent = 'إضافة وجبة جديدة';
    document.getElementById('itemModal').classList.add('active'); 
}
function closeItemModal() { document.getElementById('itemModal').classList.remove('active'); }

function openCatModal() { 
    editCatKey=null; 
    document.getElementById('catForm').reset(); 
    document.getElementById('catModalTitle').textContent = 'إضافة قسم جديد';
    document.getElementById('icon-preview').innerHTML = '<i class="fa-solid fa-circle-question"></i>';
    document.getElementById('catModal').classList.add('active'); 
}
function closeCatModal() { document.getElementById('catModal').classList.remove('active'); }

function editItem(k) { 
    const i=menuItems.find(x=>x.key===k); 
    if(!i) return; 
    editKey=k; 
    document.getElementById('modalTitle').textContent = 'تعديل الوجبة';
    document.getElementById('itemName').value=i.name; 
    document.getElementById('itemNameEn').value=i.nameEn||''; 
    document.getElementById('itemCategory').value=i.category; 
    document.getElementById('itemPrice').value=i.price; 
    document.getElementById('itemImg').value=i.image; 
    document.getElementById('itemDesc').value=i.desc; 
    document.getElementById('itemDescEn').value=i.descEn; 
    document.getElementById('itemBadge').value=i.badge || '';
    document.getElementById('itemStatus').value=i.status || 'active';
    previewItemImage(i.image);
    document.getElementById('itemModal').classList.add('active'); 
}

function editCat(id) { 
    const c=catItems.find(x=>x.id===id); 
    if(!c) return; 
    editCatKey=id; 
    document.getElementById('catModalTitle').textContent = 'تعديل القسم';
    document.getElementById('catNameAr').value=c.nameAr; 
    document.getElementById('catNameEn').value=c.nameEn||''; 
    document.getElementById('catSection').value=c.section; 
    document.getElementById('catOrder').value=c.order; 
    document.getElementById('catIcon').value=c.icon; 
    document.getElementById('catDescAr').value=c.descAr||''; 
    document.getElementById('catDescEn').value=c.descEn||''; 
    const rad = document.querySelector(`input[name="catStatus"][value="${c.status || 'active'}"]`);
    if(rad) rad.checked = true;
    document.getElementById('icon-preview').innerHTML = `<i class="fa-solid ${c.icon || 'fa-circle-question'}"></i>`;
    document.getElementById('catModal').classList.add('active'); 
}

function deleteItem(k) { 
    if(confirm('هل أنت متأكد من حذف هذه الوجبة؟ ستنتقل إلى سلة المحذوفات.')) { 
        const i=menuItems.find(x=>x.key===k); 
        REFS.trash.push({...i, deletedAt: firebase.database.ServerValue.TIMESTAMP}).then(() => {
            REFS.menu.child(k).remove().then(() => {
                showToast('تم حذف الوجبة بنجاح');
                log('حذف وجبة', i.name);
            });
        });
    } 
}

function deleteCat(id) { 
    if(confirm('حذف القسم سيؤدي لإخفاء وجباته. هل أنت متأكد؟')) {
        REFS.cats.child(id).remove().then(() => {
            showToast('تم حذف القسم بنجاح');
            log('حذف قسم', id);
        });
    }
}

function toggleItem(k, s) { 
    const next = s==='inactive'?'active':'inactive';
    REFS.menu.child(k).update({ status: next }).then(() => {
        showToast(`الوجبة الآن ${next==='active'?'نشطة':'مخفية'}`);
    });
}
function toggleCat(id, s) { 
    const next = s==='hidden'?'active':'hidden';
    REFS.cats.child(id).update({ status: next }).then(() => {
        showToast(`القسم الآن ${next==='active'?'ظاهر':'مخفي'}`);
    });
}

function onGlobalSearch() { renderTable(); }

function renderFeedTable() { 
    const b = document.getElementById('feed-table-body'); 
    if(!b) return; b.innerHTML = ''; 
    [...feedItems].reverse().forEach(f => { 
        b.innerHTML += `<tr><td>${new Date(f.timestamp).toLocaleString('ar-EG')}</td><td>${f.name}</td><td>${f.rating}⭐</td><td>${f.message}</td></tr>`; 
    }); 
}

function renderLogsTable() {
    const b = document.getElementById('logs-table-body');
    if(!b) return;
    REFS.logs.limitToLast(50).once('value', s => {
        b.innerHTML = '';
        if(!s.exists()) return;
        Object.values(s.val()).reverse().forEach(l => {
            b.innerHTML += `<tr>
                <td>${new Date(l.timestamp).toLocaleString('ar-EG')}</td>
                <td><span class="status-pill" style="background:rgba(197,160,34,0.1); color:var(--gold);">${l.action}</span></td>
                <td>${l.details} <br><small style="color:var(--text-dim)">بواسطة: ${l.user}</small></td>
            </tr>`;
        });
    });
}

function renderTrashTable() {
    const b = document.getElementById('trash-table-body');
    if(!b) return;
    REFS.trash.once('value', s => {
        b.innerHTML = '';
        if(!s.exists()) return b.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:40px; opacity:0.5;">سلة المحذوفات فارغة</td></tr>';
        Object.entries(s.val()).reverse().forEach(([k, v]) => {
            b.innerHTML += `<tr>
                <td><b>${v.name}</b></td>
                <td>${new Date(v.deletedAt).toLocaleString('ar-EG')}</td>
                <td>
                    <button class="btn-primary" style="padding:6px 12px; font-size:0.8rem;" onclick="restoreItem('${k}')">استعادة</button>
                    <button class="btn-primary" style="background:rgba(231,76,60,0.1); color:#e74c3c; padding:6px 12px; font-size:0.8rem;" onclick="hardDeleteItem('${k}')">حذف نهائي</button>
                </td>
            </tr>`;
        });
    });
}

function restoreItem(k) {
    REFS.trash.child(k).once('value', s => {
        if(!s.exists()) return;
        const data = s.val();
        const restoreData = {...data};
        delete restoreData.deletedAt;
        REFS.menu.push(restoreData).then(() => {
            REFS.trash.child(k).remove().then(() => {
                showToast('تمت استعادة الوجبة بنجاح');
                renderTrashTable();
            });
        });
    });
}

function hardDeleteItem(k) {
    if(confirm('هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع عن هذه الخطوة.')) {
        REFS.trash.child(k).remove().then(() => {
            showToast('تم الحذف النهائي بنجاح');
            renderTrashTable();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => { 
    const currentView = localStorage.getItem('last_admin_view') || 'view-dashboard';
    navigateTo(currentView);
    if(document.getElementById('current-user-display')) 
        document.getElementById('current-user-display').textContent = localStorage.getItem('admin_user')||'المدير';
});

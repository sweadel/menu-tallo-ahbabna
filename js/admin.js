/**
 * js/admin.js v11.0 — النسخة الاحترافية المطورة
 * إدارة أقسام ذكية + عداد وجبات + وصف مزدوج
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

function navigateTo(id) {
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-view="${id}"]`)?.classList.add('active');
    document.querySelectorAll('.view').forEach(v => { v.style.display='none'; v.classList.remove('active'); });
    const t = document.getElementById(id);
    if(t) { t.style.display='block'; setTimeout(()=>t.classList.add('active'),10); }
    document.getElementById('sidebar')?.classList.remove('open');
}

// ══════════════ مراقبة البيانات ══════════════

REFS.menu.on('value', snap => {
    menuItems = [];
    if(snap.exists()) Object.entries(snap.val()).forEach(([k,v]) => menuItems.push({key:k, ...v}));
    renderTable();
    renderCatTable(); // تحديث عداد الوجبات في جدول الأقسام
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

REFS.feed.on('value', s => { feedItems=[]; if(s.exists()) Object.entries(s.val()).forEach(([k,v])=>feedItems.push({key:k, ...v})); renderFeedTable(); updateStats(); });

// ══════════════ إدارة الأقسام (المطورة) ══════════════

function renderCatTable() {
    const b = document.getElementById('cat-table-body');
    if(!b) return; b.innerHTML = '';
    
    catItems.forEach(c => {
        const act = c.status !== 'hidden';
        const itemCount = menuItems.filter(i => i.category === c.id).length;
        
        b.innerHTML += `<tr>
            <td style="font-size:1.2rem; color:var(--gold);"><i class="fa-solid ${c.icon || 'fa-folder'}"></i></td>
            <td>
                <div style="font-weight:600;">${c.nameAr}</div>
                <div style="font-size:0.75rem; color:#888;">${c.nameEn || 'No translation'}</div>
            </td>
            <td><span class="status-pill" style="background:rgba(255,255,255,0.05); color:#ccc;">${c.section || '---'}</span></td>
            <td><b style="color:var(--gold);">${itemCount}</b> وجبة</td>
            <td><span style="background:var(--gold); color:#000; padding:2px 8px; border-radius:5px; font-weight:bold;">${c.order || 0}</span></td>
            <td>
                <button onclick="toggleCat('${c.id}','${c.status}')" class="status-pill ${act?'status-active':'status-hidden'}">
                    ${act?'ظاهر':'مخفي'}
                </button>
            </td>
            <td>
                <div style="display:flex; gap:5px;">
                    <button class="btn-primary" style="padding:6px;" onclick="editCat('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-primary" style="background:rgba(231,76,60,0.1); color:#e74c3c; padding:6px;" onclick="deleteCat('${c.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    });
}

function saveCategory() {
    const name = document.getElementById('catNameAr').value.trim();
    if(!name) return alert('أدخل الاسم العربي');
    
    const data = {
        nameAr: name,
        nameEn: document.getElementById('catNameEn').value.trim(),
        section: document.getElementById('catSection').value,
        order: parseInt(document.getElementById('catOrder').value) || 0,
        icon: document.getElementById('catIcon').value.trim(),
        descAr: document.getElementById('catDescAr').value.trim(),
        descEn: document.getElementById('catDescEn').value.trim(),
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    // إذا كان تعديل نستخدم نفس المعرف، إذا كان جديد ننشئ واحد من الاسم
    const id = editCatKey || name.toLowerCase().replace(/\s+/g, '-');
    REFS.cats.child(id).update(data).then(() => {
        closeCatModal();
        log('إدارة الأقسام', `حفظ القسم: ${name}`);
    });
}

function editCat(id) {
    const c = catItems.find(x => x.id === id);
    if(!c) return;
    editCatKey = id;
    document.getElementById('catNameAr').value = c.nameAr || '';
    document.getElementById('catNameEn').value = c.nameEn || '';
    document.getElementById('catSection').value = c.section || 'arabic';
    document.getElementById('catOrder').value = c.order || 0;
    document.getElementById('catIcon').value = c.icon || '';
    document.getElementById('catDescAr').value = c.descAr || '';
    document.getElementById('catDescEn').value = c.descEn || '';
    
    updateIconPreview(c.icon);
    document.getElementById('catModal').classList.add('active');
}

// ══════════════ المنيو والوظائف الأخرى ══════════════

function renderTable() {
    const b = document.getElementById('menu-table-body');
    if(!b) return;
    const q = (document.getElementById('globalSearch')?.value || '').toLowerCase();
    const filtered = menuItems.filter(i => (activeFilterCat==='all'||i.category===activeFilterCat) && (!q || (i.name||'').toLowerCase().includes(q) || (i.nameEn||'').toLowerCase().includes(q)));
    b.innerHTML = '';
    filtered.forEach(i => {
        const act = i.status!=='inactive';
        let opts = catItems.map(c => `<option value="${c.id}" ${i.category===c.id?'selected':''}>${c.nameAr}</option>`).join('');
        b.innerHTML += `<tr><td><img src="${i.image||'images/tallo-logo.png'}" class="item-thumb"></td><td><b>${i.name}</b><br><small>${i.nameEn||''}</small></td><td><select class="form-control" onchange="quickMoveItem('${i.key}', this.value)">${opts}</select></td><td>${i.price} JD</td><td><button onclick="toggleItem('${i.key}','${i.status}')" class="status-pill ${act?'status-active':'status-hidden'}">${act?'نشط':'مخفي'}</button></td><td><button onclick="editItem('${i.key}')" class="btn-primary">تعديل</button></td></tr>`;
    });
}

function saveItem() {
    if(isSaving) return; const name = document.getElementById('itemName').value; if(!name) return; isSaving=true;
    const data = { name, nameEn: document.getElementById('itemNameEn').value, category: document.getElementById('itemCategory').value, price: document.getElementById('itemPrice').value, image: document.getElementById('itemImg').value, desc: document.getElementById('itemDesc').value, descEn: document.getElementById('itemDescEn').value, updatedAt: firebase.database.ServerValue.TIMESTAMP };
    const r = editKey ? REFS.menu.child(editKey) : REFS.menu.push();
    r.set(data).then(() => { closeItemModal(); isSaving=false; });
}

function updateIconPreview(val) {
    const p = document.getElementById('icon-preview');
    if(p) p.innerHTML = `<i class="fa-solid ${val || 'fa-circle-question'}"></i>`;
}

// إعداد مراقب الأيقونة
document.addEventListener('DOMContentLoaded', () => {
    const iconInput = document.getElementById('catIcon');
    if(iconInput) iconInput.oninput = (e) => updateIconPreview(e.target.value);
    if(document.getElementById('current-user-display')) document.getElementById('current-user-display').textContent = localStorage.getItem('admin_user')||'المدير';
});

// وظائف مساعدة
function quickMoveItem(k, c) { REFS.menu.child(k).update({ category: c }); }
function setFilterCat(id) { activeFilterCat=id; rebuildSelects(); renderTable(); }
function rebuildSelects() {
    const t = document.getElementById('catFilterTabs'); if(!t) return;
    t.innerHTML = `<button class="cat-filter-tab ${activeFilterCat==='all'?'active':''}" onclick="setFilterCat('all')">الكل</button>`;
    catItems.forEach(c => t.innerHTML += `<button class="cat-filter-tab ${activeFilterCat===c.id?'active':''}" onclick="setFilterCat('${c.id}')">${c.nameAr}</button>`);
    const s = document.getElementById('itemCategory'); if(s) s.innerHTML = catItems.map(c => `<option value="${c.id}">${c.nameAr}</option>`).join('');
}
function updateStats() {
    if(document.getElementById('stat-total')) document.getElementById('stat-total').textContent = menuItems.length;
    if(document.getElementById('stat-cats')) document.getElementById('stat-cats').textContent = catItems.length;
    if(document.getElementById('stat-feed')) document.getElementById('stat-feed').textContent = feedItems.length;
}
function log(a, d) { REFS.logs.push({ action: a, details: d, user: localStorage.getItem('admin_user')||'المدير', timestamp: firebase.database.ServerValue.TIMESTAMP }); }
function openCatModal() { editCatKey=null; document.getElementById('catForm').reset(); updateIconPreview(''); document.getElementById('catModal').classList.add('active'); }
function closeCatModal() { document.getElementById('catModal').classList.remove('active'); }
function toggleCat(id, s) { REFS.cats.child(id).update({ status: s==='hidden'?'active':'hidden' }); }
function deleteCat(id) { if(confirm('حذف القسم؟ سيتم حذف التصنيف فقط ولن تُحذف الوجبات.')) REFS.cats.child(id).remove(); }
function toggleItem(k, s) { REFS.menu.child(k).update({ status: s==='inactive'?'active':'inactive' }); }
function editItem(k) { const i=menuItems.find(x=>x.key===k); if(!i) return; editKey=k; document.getElementById('itemName').value=i.name; document.getElementById('itemCategory').value=i.category; document.getElementById('itemPrice').value=i.price; document.getElementById('itemImg').value=i.image; document.getElementById('itemDesc').value=i.desc; document.getElementById('itemDescEn').value=i.descEn; document.getElementById('itemModal').classList.add('active'); }
function closeItemModal() { document.getElementById('itemModal').classList.remove('active'); }
function openItemModal() { editKey=null; document.getElementById('itemForm').reset(); document.getElementById('itemModal').classList.add('active'); }
function onGlobalSearch() { renderTable(); }
function logout() { localStorage.clear(); window.location.href='login.html'; }
function renderFeedTable() { const b = document.getElementById('feed-table-body'); if(!b) return; b.innerHTML = ''; feedItems.reverse().forEach(f => { b.innerHTML += `<tr><td>${new Date(f.timestamp).toLocaleString()}</td><td>${f.name}</td><td>${f.rating}⭐</td><td>${f.message}</td></tr>`; }); }

import { ref, onValue, push, update, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { rtdb } from "./firebase.js";

const menuRef = ref(rtdb, 'menu_items');

export function renderMenu() {
    const tableBody = document.querySelector("#menuTable tbody");
    if (!tableBody) return;

    onValue(menuRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            tableBody.innerHTML = '<tr><td colspan="5">No menu items found.</td></tr>';
            return;
        }

        const items = Object.entries(data).map(([key, val]) => ({ key, ...val }));
        tableBody.innerHTML = items.map(item => `
            <tr>
                <td><img src="${item.image || 'images/tallo-logo.png'}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;" /></td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.price} JD</td>
                <td>
                    <button class="btn-action" onclick="editMenuItem('${item.key}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-action" style="color:var(--red);" onclick="deleteMenuItem('${item.key}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    });
}

export function setupMenuActions() {
    const addBtn = document.getElementById('addMenuItemBtn');
    const modal = document.getElementById('itemModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const form = document.getElementById('menuItemForm');

    if (addBtn) addBtn.onclick = () => {
        modal.style.display = 'flex';
        form.reset();
        document.getElementById('modalTitle').textContent = 'Add Menu Item';
    };

    if (closeBtn) closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    if (form) form.onsubmit = (e) => {
        e.preventDefault();
        const newItem = {
            name: document.getElementById('itemName').value,
            nameEn: document.getElementById('itemNameEn').value,
            category: document.getElementById('itemCategory').value,
            price: document.getElementById('itemPrice').value,
            image: document.getElementById('itemImage').value,
            desc: document.getElementById('itemDesc').value,
            status: 'active',
            updatedAt: Date.now()
        };

        push(menuRef, newItem).then(() => {
            modal.style.display = 'none';
            alert('Item added successfully!');
        }).catch(err => {
            console.error("Error adding item:", err);
        });
    };

    // Expose global functions for onclick handlers
    window.deleteMenuItem = (key) => {
        if (confirm('Are you sure you want to delete this item?')) {
            remove(ref(rtdb, `menu_items/${key}`));
        }
    };

    window.editMenuItem = (key) => {
        // Implementation for edit
        console.log("Edit item:", key);
    };
}

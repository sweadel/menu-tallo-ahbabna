import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase.js";

export async function renderUsers() {
    const tableBody = document.querySelector("#usersTable tbody");
    if (!tableBody) return;

    try {
        // Fetch users from Firestore (assuming a 'users' collection exists)
        // const querySnapshot = await getDocs(collection(db, "users"));
        // For now, use mock data as per the UI design
        const mockUsers = [
            { name: "Adel S.", email: "adel@example.com", role: "admin" },
            { name: "Ahmad J.", email: "ahmad@example.com", role: "editor" },
            { name: "Sara K.", email: "sara@example.com", role: "user" }
        ];

        tableBody.innerHTML = mockUsers.map(user => `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="badge ${user.role}">${user.role.toUpperCase()}</span></td>
                <td>
                    <button class="btn-action"><i class="fas fa-edit"></i></button>
                    <button class="btn-action" style="color:var(--red);"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        // Update stats
        const totalUsersEl = document.getElementById('totalUsers');
        if (totalUsersEl) totalUsersEl.textContent = mockUsers.length;

    } catch (error) {
        console.error("Error rendering users:", error);
    }
}

export function setupUserActions() {
    console.log("User actions setup complete.");
}

import { API_CONFIG } from "@/utils/apiConfig";

export async function getAllUsers() {
    try {
        const res = await fetch(`${API_CONFIG.API_BASE}/users`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("Lỗi API getAllUsers:", err);
        throw err;
    }
}

export async function getUserById(id) {
    if (!id) throw new Error("User ID is required");
    try {
        const res = await fetch(`${API_CONFIG.API_BASE}/users/${id}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`Lỗi API getUserById(${id}):`, err);
        throw err;
    }
}

export async function createUser(userDto) {
    try {
        const res = await fetch(`${API_CONFIG.API_BASE}/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userDto)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("Lỗi API createUser:", err);
        throw err;
    }
}

export async function updateUser(id, userDto) {
    if (!id) throw new Error("User ID is required");
    try {
        const res = await fetch(`${API_CONFIG.API_BASE}/users/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userDto)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`Lỗi API updateUser(${id}):`, err);
        throw err;
    }
}

export async function activateUser(id) {
    if (!id) throw new Error("User ID is required");
    try {
        const res = await fetch(`${API_CONFIG.API_BASE}/users/${id}/activate`, {
            method: "PATCH"
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return true;
    } catch (err) {
        console.error(`Lỗi API activateUser(${id}):`, err);
        throw err;
    }
}

export async function deactivateUser(id) {
    if (!id) throw new Error("User ID is required");
    try {
        const res = await fetch(`${API_CONFIG.API_BASE}/users/${id}/deactivate`, {
            method: "PATCH"
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return true;
    } catch (err) {
        console.error(`Lỗi API deactivateUser(${id}):`, err);
        throw err;
    }
}

export async function toggleActive(id, active) {
    return active ? deactivateUser(id) : activateUser(id); // Đổi logic: nếu đang active thì deactivate (khóa), ngược lại activate (mở)
}
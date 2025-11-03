const API_BASE = 'http://157.66.26.217:5000/api';

// Lấy tất cả users
export async function getAllUsers() {
    try {
        const res = await fetch(`${API_BASE}/users`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('Lỗi khi gọi API get-all users:', err);
        throw err;
    }
}

// Lấy user theo ID
export async function getUserById(id) {
    if (!id) throw new Error("User ID is required");
    try {
        const res = await fetch(`${API_BASE}/users/${id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`Lỗi khi gọi API get-user/${id}:`, err);
        throw err;
    }
}

// Tạo user mới
export async function createUser(userDto) {
    try {
        const res = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userDto)
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('Lỗi khi gọi API create-user:', err);
        throw err;
    }
}

// Cập nhật user
export async function updateUser(id, userDto) {
    if (!id) throw new Error("User ID is required");
    try {
        const res = await fetch(`${API_BASE}/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userDto)
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`Lỗi khi gọi API update-user/${id}:`, err);
        throw err;
    }
}

// Kích hoạt user
export async function activateUser(id) {
    if (!id) throw new Error("User ID is required");
    try {
        const res = await fetch(`${API_BASE}/users/${id}/activate`, { method: 'PATCH' });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return true;
    } catch (err) {
        console.error(`Lỗi khi gọi API activate-user/${id}:`, err);
        throw err;
    }
}

// Vô hiệu hóa user
export async function deactivateUser(id) {
    if (!id) throw new Error("User ID is required");
    try {
        const res = await fetch(`${API_BASE}/users/${id}/deactivate`, { method: 'PATCH' });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return true;
    } catch (err) {
        console.error(`Lỗi khi gọi API deactivate-user/${id}:`, err);
        throw err;
    }
}

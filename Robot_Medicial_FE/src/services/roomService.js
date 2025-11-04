// 📁 src/services/roomService.js
import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = `${API_CONFIG.API_BASE}/Rooms`;

/**
 * 🏠 Lấy danh sách tất cả phòng (include map)
 * GET /api/rooms
 */
export async function getAllRooms() {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error("Không thể tải danh sách phòng");
    return await res.json();
}

/**
 * 🔍 Lấy chi tiết một phòng theo ID
 * GET /api/rooms/{id}
 */
export async function getRoomById(id) {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error(`Không tìm thấy phòng với ID = ${id}`);
    return await res.json();
}

/**
 * ➕ Tạo mới phòng
 * POST /api/rooms
 * @param {Object} data - Dữ liệu phòng cần tạo
 */
export async function createRoom(data) {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Không thể tạo phòng: ${err}`);
    }
    return await res.json();
}

/**
 * ✏️ Cập nhật phòng
 * PUT /api/rooms/{id}
 * @param {number} id - ID phòng cần cập nhật
 * @param {Object} data - Dữ liệu cập nhật
 */
export async function updateRoom(id, data) {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Không thể cập nhật phòng: ${err}`);
    }
    return await res.json();
}

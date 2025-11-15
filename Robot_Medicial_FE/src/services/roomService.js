import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = `${API_CONFIG.API_BASE}/Rooms`;

export async function getAllRooms() {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error("Không thể tải danh sách phòng");
    return await res.json();
}

export async function getRoomById(id) {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Không thể tải thông tin phòng");
    return await res.json();
}

export async function createRoom(data) {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

export async function updateRoom(id, data) {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

export async function movePatientToRoom(patientId, newRoomId) {
    const res = await fetch(`${BASE_URL}/${patientId}/move-room`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRoomId }),
    });

    if (!res.ok) {
        let msg = "";
        try {
            msg = await res.text();
        } catch (_) {
            msg = "Có lỗi xảy ra khi chuyển phòng";
        }
        throw new Error(msg);
    }

    return await res.json();
}

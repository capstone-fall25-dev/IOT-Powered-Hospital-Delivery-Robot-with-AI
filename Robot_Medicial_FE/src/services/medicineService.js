import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = `${API_CONFIG.API_BASE}/medicines`;

export async function getAllMedicines(categoryId, status) {
    const params = new URLSearchParams();
    if (categoryId) params.append("categoryId", categoryId);
    if (status) params.append("status", status);
    const res = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!res.ok) throw new Error("Không thể tải danh sách thuốc");
    return await res.json();
}

export async function getMedicineById(id) {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Không thể tải thông tin thuốc");
    return await res.json();
}

export async function createMedicine(medicineDto) {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(medicineDto),
    });
    if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Không thể tạo thuốc mới");
    }
    return await res.json();
}

export async function updateMedicine(id, medicineDto) {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(medicineDto),
    });
    if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Không thể cập nhật thuốc");
    }
    return await res.json();
}

export async function scanExpired(flagOnly = true) {
    const res = await fetch(`${BASE_URL}/scan-expired`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagOnly }),
    });
    if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Không thể scan thuốc hết hạn");
    }
    return await res.json();
}

export async function removeExpired() {
    const res = await fetch(`${BASE_URL}/remove-expired`, { method: "DELETE" });
    if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Không thể xóa thuốc hết hạn");
    }
    return await res.json();
}

export async function getStockReport(threshold = 10) {
    const res = await fetch(`${BASE_URL}/stock-report?threshold=${threshold}`);
    if (!res.ok) throw new Error("Không thể tải báo cáo tồn kho");
    return await res.json();
}

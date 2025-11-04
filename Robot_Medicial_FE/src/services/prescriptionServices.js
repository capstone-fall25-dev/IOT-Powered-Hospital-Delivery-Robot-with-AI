import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = `${API_CONFIG.API_BASE}`;

// --- Lấy danh sách đơn thuốc (có thể lọc theo patientId và status)
export async function getAllPrescriptions(patientId = null, status = null) {
    let url = new URL(`${BASE_URL}/prescriptions`);
    if (patientId) url.searchParams.append("patientId", patientId);
    if (status) url.searchParams.append("status", status);

    const res = await fetch(url);
    if (!res.ok) throw new Error("Lỗi khi lấy danh sách đơn thuốc");
    return res.json();
}

// --- Lấy chi tiết một đơn thuốc theo id
export async function getPrescriptionById(id) {
    const res = await fetch(`${BASE_URL}/prescriptions/${id}`);
    if (!res.ok) throw new Error("Lỗi khi lấy chi tiết đơn thuốc");
    return res.json();
}

// --- Tạo đơn thuốc mới
export async function createPrescription(prescriptionDto) {
    const res = await fetch(`${BASE_URL}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prescriptionDto),
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Lỗi khi tạo đơn thuốc mới");
    }
    return res.json();
}

// --- Cập nhật trạng thái đơn thuốc
export async function updatePrescriptionStatus(id, status) {
    const res = await fetch(`${BASE_URL}/prescriptions/${id}/status/${status}`, {
        method: "PATCH",
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Lỗi khi cập nhật trạng thái đơn thuốc");
    }
    return res.json();
}

// --- Thêm item vào đơn thuốc
export async function addPrescriptionItem(prescriptionId, itemDto) {
    const res = await fetch(`${BASE_URL}/prescriptions/${prescriptionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemDto),
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Lỗi khi thêm item vào đơn thuốc");
    }
    return res.json();
}

// --- Assign đơn thuốc vào task
export async function assignPrescriptionToTask(prescriptionId, taskId) {
    const res = await fetch(`${BASE_URL}/prescriptions/${prescriptionId}/assign-task/${taskId}`, {
        method: "POST",
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Lỗi khi assign đơn thuốc vào task");
    }
    return res.json();
}

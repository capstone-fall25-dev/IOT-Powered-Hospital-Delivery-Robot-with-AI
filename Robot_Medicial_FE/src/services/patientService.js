import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = `${API_CONFIG.API_BASE}/Patients`;

export const patientService = {
    getAllPatients,
    getPatientById,
    createPatient,
    updatePatient,
    dischargePatient,
    getMedicineHistory,
    getReport,
};

// Lấy danh sách tất cả bệnh nhân
export async function getAllPatients() {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error("Lỗi khi lấy danh sách bệnh nhân");
    return res.json();
}

// Lấy chi tiết bệnh nhân theo id
export async function getPatientById(id) {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Bệnh nhân không tồn tại");
    return res.json();
}

// Tạo mới bệnh nhân
export async function createPatient(patientDto) {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientDto),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
    }
    return res.json();
}

// Cập nhật bệnh nhân
export async function updatePatient(id, patientDto) {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientDto),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
    }
    return res.json();
}

// Xuất viện bệnh nhân
export async function dischargePatient(id, reason) {
    const res = await fetch(`${BASE_URL}/${id}/discharge`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }), // ✅ đúng định dạng API
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Discharge failed");
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

// Lấy lịch sử thuốc của bệnh nhân
export async function getMedicineHistory(id) {
    const res = await fetch(`${BASE_URL}/${id}/medicine-history`);
    if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
    }
    return res.json();
}

// Lấy báo cáo tổng hợp bệnh nhân
export async function getReport(id) {
    const res = await fetch(`${BASE_URL}/${id}/report`);
    if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
    }
    return res.json();
}

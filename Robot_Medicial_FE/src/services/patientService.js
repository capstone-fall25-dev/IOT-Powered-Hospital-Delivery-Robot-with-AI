import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = `${API_CONFIG.API_BASE}/Patients`;

// Export default object (nếu cần dùng dạng patientService.*)
export const patientService = {
    getAllPatients,
    getPatientById,
    createPatient,
    updatePatient,
    dischargePatient,
    getMedicineHistory,
    getReport
};

// ================================
// ✔ LẤY TẤT CẢ BỆNH NHÂN
// ================================
export async function getAllPatients() {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error("Không thể tải danh sách bệnh nhân");
    return res.json();
}

// ================================
// ✔ LẤY CHI TIẾT THEO ID
// ================================
export async function getPatientById(id) {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Không tìm thấy bệnh nhân");
    return res.json();
}

// ================================
// ✔ THÊM BỆNH NHÂN
// ================================
export async function createPatient(dto) {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// ================================
// ✔ UPDATE BỆNH NHÂN
// ================================
export async function updatePatient(id, dto) {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// ================================
// ✔ XUẤT VIỆN
// ================================
export async function dischargePatient(id, reason) {
    const res = await fetch(`${BASE_URL}/${id}/discharge`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// ================================
// ✔ LỊCH SỬ ĐƠN THUỐC
// ================================
export async function getMedicineHistory(id) {
    const res = await fetch(`${BASE_URL}/${id}/medicine-history`);
    if (!res.ok) throw new Error("Không thể tải lịch sử thuốc");
    return res.json();
}

// ================================
// ✔ BÁO CÁO TỔNG HỢP
// ================================
export async function getReport(id) {
    const res = await fetch(`${BASE_URL}/${id}/report`);
    if (!res.ok) throw new Error("Không thể tải báo cáo");
    return res.json();
}

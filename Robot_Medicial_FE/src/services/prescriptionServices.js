// src/services/prescriptionServices.js
import axios from "axios";
import { API_CONFIG } from "@/utils/apiConfig";

// ========== PRESCRIPTION ==========

// GET: danh sách đơn (có thể filter theo patientId, status)
export const getAllPrescriptions = async (filters = {}) => {
    const res = await axios.get(`${API_CONFIG.API_BASE}/prescriptions`, {
        params: {
            patientId: filters.patientId || undefined,
            status: filters.status || undefined,
        },
    });
    return res.data; // PrescriptionResponseDto[]
};

// GET: chi tiết đơn
export const getPrescriptionById = async (id) => {
    const res = await axios.get(`${API_CONFIG.API_BASE}/prescriptions/${id}`);
    return res.data; // PrescriptionResponseDto
};

// POST: tạo đơn (chỉ tạo prescription, chưa thêm items)
export const createPrescription = async (dto) => {
    // dto: { prescriptionCode, patientId }
    const res = await axios.post(`${API_CONFIG.API_BASE}/prescriptions`, dto);
    return res.data; // PrescriptionResponseDto
};

// PUT: update đơn (code/patient/status)
export const updatePrescription = async (id, dto) => {
    // dto: { prescriptionCode?, patientId?, status? }
    const res = await axios.put(`${API_CONFIG.API_BASE}/prescriptions/${id}`, dto);
    return res.data; // PrescriptionResponseDto
};

// DELETE: soft delete (status = canceled)
export const softDeletePrescription = async (id) => {
    const res = await axios.delete(`${API_CONFIG.API_BASE}/prescriptions/${id}`);
    return res.data; // true/false or PrescriptionResponseDto (tùy BE)
};

// PATCH: restore (status từ canceled → pending)
export const restorePrescription = async (id) => {
    const res = await axios.patch(`${API_CONFIG.API_BASE}/prescriptions/${id}/restore`);
    return res.data; // PrescriptionResponseDto
};

// ========== PRESCRIPTION ITEMS ==========

// POST: thêm item vào đơn
export const addPrescriptionItem = async (prescriptionId, dto) => {
    // dto: { medicineId, quantity, dosage, instructions }
    const res = await axios.post(
        `${API_CONFIG.API_BASE}/prescriptions/${prescriptionId}/items`,
        dto
    );
    return res.data; // PrescriptionItemResponseDto
};

// PUT: update item
export const updatePrescriptionItem = async (itemId, dto) => {
    // dto: { medicineId, quantity, dosage, instructions }
    const res = await axios.put(
        `${API_CONFIG.API_BASE}/prescriptions/items/${itemId}`,
        dto
    );
    return res.data; // PrescriptionItemResponseDto
};

// DELETE: xóa item khỏi đơn
export const deletePrescriptionItem = async (itemId) => {
    const res = await axios.delete(
        `${API_CONFIG.API_BASE}/prescriptions/items/${itemId}`
    );
    return res.data; // bool
};
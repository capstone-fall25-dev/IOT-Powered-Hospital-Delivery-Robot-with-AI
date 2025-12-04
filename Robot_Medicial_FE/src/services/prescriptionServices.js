// src/services/prescriptionServices.js
import { apiFetch } from "./api";

export const getAllPrescriptions = (filters = {}) =>
  apiFetch(`/prescriptions?${new URLSearchParams(filters)}`);

export const getPrescriptionById = (id) =>
  apiFetch(`/prescriptions/${id}`);

export const createPrescription = (dto) =>
  apiFetch(`/prescriptions`, {
    method: "POST",
    body: JSON.stringify(dto),
  });

export const updatePrescription = (id, dto) =>
  apiFetch(`/prescriptions/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });

export const softDeletePrescription = (id) =>
  apiFetch(`/prescriptions/${id}`, { method: "DELETE" });

export const restorePrescription = (id) =>
  apiFetch(`/prescriptions/${id}/restore`, { method: "PATCH" });

// -------- ITEMS ----------
export const addPrescriptionItem = (prescriptionId, dto) =>
  apiFetch(`/prescriptions/${prescriptionId}/items`, {
    method: "POST",
    body: JSON.stringify(dto),
  });

export const updatePrescriptionItem = (itemId, dto) =>
  apiFetch(`/prescriptions/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });

export const deletePrescriptionItem = (itemId) =>
  apiFetch(`/prescriptions/items/${itemId}`, { method: "DELETE" });

// Xác nhận đơn thuốc theo mã code (dùng khi tạo task)
export const approvePrescriptionByCode = (prescriptionCode) =>
  apiFetch(`/prescriptions/approve-by-code`, {
    method: "POST",
    body: JSON.stringify({ prescriptionCode }),
  });
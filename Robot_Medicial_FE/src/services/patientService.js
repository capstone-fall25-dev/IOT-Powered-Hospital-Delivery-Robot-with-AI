// src/services/patientService.js
import { apiFetch } from "./api";

const API = "/Patients";

export const getAllPatients = () => apiFetch(API);

export const getPatientById = (id) => apiFetch(`${API}/${id}`);

export const createPatient = (dto) =>
  apiFetch(API, {
    method: "POST",
    body: JSON.stringify(dto),
  });

export const updatePatient = (id, dto) =>
  apiFetch(`${API}/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });

export const dischargePatient = (id, reason) =>
  apiFetch(`${API}/${id}/discharge`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });

export const getMedicineHistory = (id) =>
  apiFetch(`${API}/${id}/medicine-history`);

export const getReport = (id) =>
  apiFetch(`${API}/${id}/report`);

export const patientService = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  dischargePatient,
  getMedicineHistory,
  getReport,
};

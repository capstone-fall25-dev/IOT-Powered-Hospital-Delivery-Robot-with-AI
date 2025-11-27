// src/services/medicineService.js
import { apiFetch } from "./api";

export const getAllCategories = () =>
  apiFetch(`/medicine/categories`);

export const createCategory = (data) =>
  apiFetch(`/medicine/categories`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateCategory = (id, data) =>
  apiFetch(`/medicine/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteCategory = (id) =>
  apiFetch(`/medicine/categories/${id}`, { method: "DELETE" });

export const getAllMedicines = () =>
  apiFetch(`/medicine/list`);

export const getMedicine = (id) =>
  apiFetch(`/medicine/${id}`);

export const createMedicine = (data) =>
  apiFetch(`/medicine`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateMedicine = (id, data) =>
  apiFetch(`/medicine/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteMedicine = (id) =>
  apiFetch(`/medicine/${id}`, { method: "DELETE" });

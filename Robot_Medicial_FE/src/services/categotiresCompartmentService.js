// src/services/categoriesCompartmentService.js
import { apiFetch } from "./api";

const API = "/CompartmentCategories";

export const getAllCategoryCompartment = () => apiFetch(API);

export const getCategoryById = (id) => apiFetch(`${API}/${id}`);

export const createCategory = (payload) =>
  apiFetch(API, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateCategory = (id, payload) =>
  apiFetch(`${API}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteCategory = (id) =>
  apiFetch(`${API}/${id}`, { method: "DELETE" });

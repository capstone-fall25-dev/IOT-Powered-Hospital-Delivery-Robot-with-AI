// src/services/compartmentService.js
import { apiFetch } from "./api";

const API = "/CompartmentAssignments";

export const getAllCompartments = () => apiFetch(API);

export const getCompartmentById = (id) => apiFetch(`${API}/${id}`);

export const createCompartment = (dto) =>
  apiFetch(API, {
    method: "POST",
    body: JSON.stringify(dto),
  });

export const updateCompartment = (id, dto) =>
  apiFetch(`${API}/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });

export const loadCompartment = (id, loadDto) =>
  apiFetch(`${API}/${id}/load`, {
    method: "PATCH",
    body: JSON.stringify(loadDto),
  });

export const bulkLoadCompartments = (taskId, loadDtos) =>
  apiFetch(`${API}/tasks/${taskId}/load-compartments`, {
    method: "POST",
    body: JSON.stringify(loadDtos),
  });

// src/services/mapService.js
import { apiFetch } from "./api";

const BASE = "/maps";

export const getAllMaps = () => apiFetch(BASE);
export const getMapById = (id) => apiFetch(`${BASE}/${id}`);

export async function getMapImage(id) {
  const blob = await apiFetch(`${BASE}/${id}/image`, {
    method: "GET",
  });
  return URL.createObjectURL(blob);
}

export const createMap = (mapDto, imageFile) => {
  const formData = new FormData();
  Object.entries(mapDto).forEach(([k, v]) => formData.append(k, v));
  if (imageFile) formData.append("imageFile", imageFile);

  return apiFetch(BASE, { method: "POST", body: formData });
};

export const updateMap = (id, mapDto, imageFile) => {
  const formData = new FormData();
  Object.entries(mapDto).forEach(([k, v]) => formData.append(k, v));
  if (imageFile) formData.append("imageFile", imageFile);

  return apiFetch(`${BASE}/${id}`, { method: "PUT", body: formData });
};

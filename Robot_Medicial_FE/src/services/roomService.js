// src/services/roomService.js
import { apiFetch } from "./api";
import { API_CONFIG } from "@/utils/apiConfig";

const BASE = "/Rooms";

export const getAllRooms = () => apiFetch(BASE);
export const getRoomById = (id) => apiFetch(`${BASE}/${id}`);

export const createRoom = (data) =>
  apiFetch(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateRoom = (id, data) =>
  apiFetch(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const movePatientToRoom = (patientId, newRoomId) =>
  apiFetch(`${BASE}/${patientId}/move-room`, {
    method: "PATCH",
    body: JSON.stringify({ newRoomId }),
  });

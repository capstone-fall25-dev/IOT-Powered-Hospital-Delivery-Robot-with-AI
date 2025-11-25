// src/services/profileService.js
import { apiFetch } from "./api";

export const getMyProfile = () => apiFetch("/profile");
export const updateMyProfile = (data) => apiFetch("/profile", { method: "PUT", body: JSON.stringify(data) });
export const changePassword = (data) => apiFetch("/profile/change-password", { method: "PUT", body: JSON.stringify(data) });
// src/services/userService.js
import { apiFetch } from "./api";

export const getAllUsers = () => apiFetch("/users");
export const getUserById = (id) => apiFetch(`/users/${id}`);
export const createUser = (data) => apiFetch("/users", { method: "POST", body: JSON.stringify(data) });
export const updateUser = (id, data) => apiFetch(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const activateUser = (id) => apiFetch(`/users/${id}/activate`, { method: "PATCH" });
export const deactivateUser = (id) => apiFetch(`/users/${id}/deactivate`, { method: "PATCH" });
export async function toggleActive(id, active) {
    return active ? deactivateUser(id) : activateUser(id); // Đổi logic: nếu đang active thì deactivate (khóa), ngược lại activate (mở)
}
// src/services/taskService.js
import { apiFetch } from "./api";

/**
 * 1. Lấy toàn bộ task (list view)
 */
export const getAllTasks = (filters = {}) => {
  const query = new URLSearchParams({
    robotId: filters.robotId || "",
    status: filters.status || "",
    priority: filters.priority || "",
  }).toString();

  return apiFetch(`/tasks?${query}`);
};

/**
 * 2. Lấy chi tiết task theo ID
 */
export const getTaskById = (id) => apiFetch(`/tasks/${id}`);

/**
 * 3. Tạo task
 */
export const createTask = (dto) =>
  apiFetch("/tasks", {
    method: "POST",
    body: JSON.stringify(dto),
  });

/**
 * Lấy data cho trang edit (task + stop + meta)
 */
export const getTaskEditData = (id) =>
  apiFetch(`/tasks/${id}/edit`);

/**
 * 4. Cập nhật task (status / priority / name / robotId...)
 */
export const updateTask = (id, dto) =>
  apiFetch(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });

/**
 * 5. Xóa task
 */
export const deleteTask = (id) =>
  apiFetch(`/tasks/${id}`, {
    method: "DELETE",
  });

/**
 * 6. Update stop status
 */
export const updateStopStatus = (taskId, stopId, status) =>
  apiFetch(`/tasks/${taskId}/stops/${stopId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });


export async function fetchTaskHistory(params) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(`/taskhistory?${query}`);
}

export async function fetchTaskHistoryDetail(id) {
    return await apiFetch(`/taskhistory/${id}`);
}
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

/**
 * Hủy nhiệm vụ (chỉ cho phép khi task chưa bắt đầu - pending)
 */
export const cancelTask = (taskId, reason = null) =>
  apiFetch(`/tasks/${taskId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

/**
 * Kiểm tra robot có task pending không
 */
export const checkRobotPendingTask = (robotId) =>
  apiFetch(`/tasks/check-robot-pending/${robotId}`);

/**
 * Lấy thông tin chạy nhiệm vụ (run-info)
 */
export const getRunInfo = (taskId) =>
  apiFetch(`/tasks/${taskId}/run-info`);

/**
 * Bắt đầu nhiệm vụ
 */
export const startTask = (taskId) =>
  apiFetch(`/tasks/${taskId}/start`, {
    method: "POST",
  });
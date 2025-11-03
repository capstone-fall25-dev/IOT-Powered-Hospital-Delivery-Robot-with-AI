// src/services/taskService.js
import axios from "axios";
import { API_CONFIG } from "@/utils/apiConfig";

// 1. Lấy danh sách task, optional filter priority
export const getAllTasks = async (priority) => {
    const params = priority ? { priority } : {};
    const res = await axios.get(`${API_CONFIG.API_BASE}/tasks`, { params });
    return res.data; // Array<TaskResponseDto>
};

// 2. Lấy chi tiết task theo ID
export const getTaskById = async (id) => {
    const res = await axios.get(`${API_CONFIG.API_BASE}/tasks/${id}`);
    return res.data; // TaskResponseDto
};

// 3. Lấy task theo user
export const getTasksByUser = async (userId) => {
    const res = await axios.get(`${API_CONFIG.API_BASE}/tasks/by-user/${userId}`);
    return res.data; // Array<TaskResponseDto>
};

// 4. Tạo task mới
export const createTask = async (taskDto) => {
    const res = await axios.post(`${API_CONFIG.API_BASE}/tasks`, taskDto);
    return res.data;
};

// 5. Cập nhật task
export const updateTask = async (id, taskDto) => {
    const res = await axios.put(`${API_CONFIG.API_BASE}/tasks/${id}`, taskDto);
    return res.data;
};

// 6. Hủy task
export const cancelTask = async (id) => {
    const res = await axios.delete(`${API_CONFIG.API_BASE}/tasks/cancel/${id}`);
    return res.data;
};

// 7. Submit task
export const submitTask = async (id, submitDto) => {
    const res = await axios.post(`${API_CONFIG.API_BASE}/tasks/${id}/submit`, submitDto);
    return res.data;
};

// 8. Confirm task (admin)
export const confirmTask = async (id) => {
    const res = await axios.post(`${API_CONFIG.API_BASE}/tasks/${id}/confirm`);
    return res.data;
};

// 9. Cập nhật tiến độ task
export const updateTaskProgress = async (id, progressDto) => {
    const res = await axios.patch(`${API_CONFIG.API_BASE}/tasks/${id}/progress`, progressDto);
    return res.data;
};

// 10. Cập nhật priority task
export const setTaskPriority = async (id, priorityDto) => {
    const res = await axios.patch(`${API_CONFIG.API_BASE}/tasks/${id}/priority`, priorityDto);
    return res.data;
};

// 11. Scheduler: assign pending tasks
export const schedulePendingTasks = async () => {
    const res = await axios.post(`${API_CONFIG.API_BASE}/tasks/schedule-pending`);
    return res.data; // { AssignedCount, Message }
};

// 12. Lấy báo cáo task
export const getTaskReport = async ({ robotId, startDate, endDate }) => {
    const params = {};
    if (robotId) params.robotId = robotId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const res = await axios.get(`${API_CONFIG.API_BASE}/tasks/report`, { params });
    return res.data; // Array<TaskReportDto>
};

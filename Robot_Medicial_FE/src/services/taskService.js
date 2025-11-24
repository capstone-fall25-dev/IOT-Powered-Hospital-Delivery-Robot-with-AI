import axios from "axios";
import { API_CONFIG } from "@/utils/apiConfig";

// 1. Lấy toàn bộ task (list view)
export const getAllTasks = async (filters = {}) => {
    const res = await axios.get(`${API_CONFIG.API_BASE}/tasks`, {
        params: {
            robotId: filters.robotId,
            status: filters.status,
            priority: filters.priority
        }
    });
    return res.data; // TaskListItemDto[]
};

// 2. Lấy chi tiết task theo ID (TaskDetailDto)
export const getTaskById = async (id) => {
    const res = await axios.get(`${API_CONFIG.API_BASE}/tasks/${id}`);
    return res.data; 
};

// 3. Tạo task
export const createTask = async (dto) => {
    const res = await axios.post(`${API_CONFIG.API_BASE}/tasks`, dto);
    return res.data; // TaskResponseDto
};

export const getTaskEditData = async (id) => {
    const res = await axios.get(`${API_CONFIG.API_BASE}/tasks/${id}/edit`);
    return res.data;
};

// 4. Cập nhật task (status / priority...)
export const updateTask = async (id, dto) => {
    const res = await axios.put(`${API_CONFIG.API_BASE}/tasks/${id}`, dto);
    return res.data; // TaskResponseDto
};

// 5. Xóa task
export const deleteTask = async (id) => {
    const res = await axios.delete(`${API_CONFIG.API_BASE}/tasks/${id}`);
    return res.data;
};

// 6. Update stop status
export const updateStopStatus = async (taskId, stopId, status) => {
    const res = await axios.put(
        `${API_CONFIG.API_BASE}/tasks/${taskId}/stops/${stopId}/status`,
        { status }
    );
    return res.data;
};

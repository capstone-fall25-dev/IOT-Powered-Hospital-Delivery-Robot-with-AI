// src/services/robotService.js
import axios from "axios";
import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = `${API_CONFIG.API_BASE}/Robots`;

// 1. Lấy danh sách robot, optional filter status
export const getAllRobots = async (status) => {
    const params = status ? { status } : {};
    const res = await axios.get(`${BASE_URL}`, { params }); 
    return res.data;
};

// 2. Lấy chi tiết robot theo ID (numeric)
export const getRobotById = async (id) => {

    const res = await axios.get(`${BASE_URL}/${id}`);  
    return res.data;
};

// 3. Tạo robot mới
export const createRobot = async (robotDto) => {
    const res = await axios.post(BASE_URL, robotDto);
    return res.data;
};

// 4. Cập nhật status robot
export const updateRobotStatus = async (id, status) => {
    const res = await axios.patch(`${BASE_URL}/${id}/status`, { status });
    return res.data;
};

// 5. Assign map cho robot
export const assignRobotMap = async (robotId, mapId) => {
    const res = await axios.put(`${BASE_URL}/${robotId}/assign-map/${mapId}`);
    return res.data;
};

// 6. Cập nhật vị trí robot
export const updateRobotPosition = async (id, positionDto) => {
    const res = await axios.patch(`${BASE_URL}/${id}/position`, positionDto);
    return res.data;
};

// 7. Lấy robot at_station
export const getAvailableRobots = async () => {
    const res = await axios.get(`${BASE_URL}/available`);
    return res.data;
};
// src/services/robotService.js
import axios from "axios";

const API_BASE = "/api/robots";

// 1. Lấy danh sách robot, optional filter status
export const getAllRobots = async (status) => {
    const params = status ? { status } : {};
    const res = await axios.get(API_BASE, { params });
    return res.data; // array of RobotResponseDto
};

// 2. Lấy chi tiết robot theo ID
export const getRobotById = async (id) => {
    const res = await axios.get(`${API_BASE}/${id}`);
    return res.data; // RobotResponseDto
};

// 3. Tạo robot mới
export const createRobot = async (robotDto) => {
    const res = await axios.post(API_BASE, robotDto);
    return res.data; // RobotResponseDto
};

// 4. Cập nhật status robot
export const updateRobotStatus = async (id, status) => {
    const res = await axios.patch(`${API_BASE}/${id}/status`, { status });
    return res.data; // RobotResponseDto
};

// 5. Assign map cho robot
export const assignRobotMap = async (robotId, mapId) => {
    const res = await axios.put(`${API_BASE}/${robotId}/assign-map/${mapId}`);
    return res.data; // AssignMapResponseDto
};

// 6. Cập nhật vị trí robot
export const updateRobotPosition = async (id, positionDto) => {
    const res = await axios.patch(`${API_BASE}/${id}/position`, positionDto);
    return res.data; // RobotResponseDto
};

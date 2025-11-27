// // src/services/robotService.js
// import axios from "axios";
// import { API_CONFIG } from "@/utils/apiConfig";

// const BASE_URL = `${API_CONFIG.API_BASE}/Robots`;

// // 1. Lấy danh sách robot, optional filter status
// export const getAllRobots = async (status) => {
//     const params = status ? { status } : {};
//     const res = await axios.get(`${BASE_URL}`, { params }); 
//     return res.data;
// };

// // 2. Lấy chi tiết robot theo ID (numeric)
// export const getRobotById = async (id) => {

//     const res = await axios.get(`${BASE_URL}/${id}`);  
//     return res.data;
// };

// // 3. Tạo robot mới
// export const createRobot = async (robotDto) => {
//     const res = await axios.post(BASE_URL, robotDto);
//     return res.data;
// };

// // 4. Cập nhật status robot
// export const updateRobotStatus = async (id, status) => {
//     const res = await axios.patch(`${BASE_URL}/${id}/status`, { status });
//     return res.data;
// };

// // 5. Assign map cho robot
// export const assignRobotMap = async (robotId, mapId) => {
//     const res = await axios.put(`${BASE_URL}/${robotId}/assign-map/${mapId}`);
//     return res.data;
// };

// // 6. Cập nhật vị trí robot
// export const updateRobotPosition = async (id, positionDto) => {
//     const res = await axios.patch(`${BASE_URL}/${id}/position`, positionDto);
//     return res.data;
// };

// // 7. Lấy robot at_station
// export const getAvailableRobots = async () => {
//     const res = await axios.get(`${BASE_URL}/available`);

//     const data = res.data;

//     // Nếu BE trả mảng trực tiếp
//     if (Array.isArray(data)) return data;

//     // Nếu BE bọc vào { data: [...] }
//     if (Array.isArray(data?.data)) return data.data;

//     // Nếu BE trả object lỗi → tránh crash FE
//     return [];
// };

// // 4. CẬP NHẬT ROBOT (PUT) - DÙNG CHO TRANG CHỈNH SỬA
// export const updateRobot = async (id, robotDto) => {
//     const res = await axios.put(`${BASE_URL}/${id}`, robotDto);
//     return res.data;
// };

// src/services/robotService.js
import { apiFetch } from "./api";

const API = "/Robots"; // ngắn gọn hơn

export const getAllRobots = (status) =>
  apiFetch(`${API}${status ? `?status=${status}` : ""}`);

export const getRobotById = (id) => apiFetch(`${API}/${id}`);

export const createRobot = (robotDto) =>
  apiFetch(API, { method: "POST", body: JSON.stringify(robotDto) });

export const updateRobot = (id, robotDto) =>
  apiFetch(`${API}/${id}`, {
    method: "PUT",
    body: JSON.stringify(robotDto),
  });

export const updateRobotStatus = (id, status) =>
  apiFetch(`${API}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const assignRobotMap = (robotId, mapId) =>
  apiFetch(`${API}/${robotId}/assign-map/${mapId}`, { method: "PUT" });

export const updateRobotPosition = (id, positionDto) =>
  apiFetch(`${API}/${id}/position`, {
    method: "PATCH",
    body: JSON.stringify(positionDto),
  });

export const getAvailableRobots = () => apiFetch(`${API}/available`);
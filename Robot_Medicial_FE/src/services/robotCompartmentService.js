// src/services/robotCompartmentService.js
import axios from "axios";
import { API_CONFIG } from "@/utils/apiConfig";

// 🔥 Lấy toàn bộ ngăn chứa theo robot
export async function getCompartmentsByRobot(robotId) {
    const res = await axios.get(
        `${API_CONFIG.API_BASE}/RobotCompartments/robot/${robotId}`
    );
    return res.data;
}

// 🔥 Lấy danh sách Category ngăn chứa
export async function getAllCategories() {
    const res = await axios.get(
        `${API_CONFIG.API_BASE}/CompartmentCategories`
    );
    return res.data;
}

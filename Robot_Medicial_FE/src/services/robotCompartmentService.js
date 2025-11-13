// src/services/robotCompartmentService.js
import axios from "axios";
import { API_CONFIG } from "@/utils/apiConfig";

// export async function getCompartmentsByRobot(categoryId, robotId) {
//     const res = await axios.get(
//         `${API_CONFIG.API_BASE}/RobotCompartments/category/${categoryId}/robot/${robotId}`
//     );
//     return res.data;
// }

// 🔥 Lấy toàn bộ ngăn chứa theo robot
export async function getCompartmentsByRobot(robotId) {
    const res = await axios.get(
        `${API_CONFIG.API_BASE}/RobotCompartments/robot/${robotId}`
    );
    return res.data;
}
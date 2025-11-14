// src/services/robotCompartmentService.js
import axios from "axios";
import { API_CONFIG } from "@/utils/apiConfig";

/**
 * Lấy tất cả ngăn chứa UNLOCKED theo robot,
 * không filter category.
 * -> Dùng khi user vừa chọn robot.
 */
export async function getUnlockedCompartments(robotId) {
    const res = await axios.get(
        `${API_CONFIG.API_BASE}/RobotCompartments/robot/${robotId}/all`
    );
    return res.data;
}

/**
 * Lấy ngăn chứa UNLOCKED theo robot + category.
 * -> Dùng khi user chọn category trong stop.
 */
export async function getCompartmentsByRobotAndCategory(robotId, categoryId) {
    const res = await axios.get(
        `${API_CONFIG.API_BASE}/RobotCompartments/robot/${robotId}/category/${categoryId}`
    );
    return res.data;
}

// API LẤY DANH SÁCH CATEGORY
export async function getAllCategories() {
    const res = await axios.get(`${API_CONFIG.API_BASE}/CompartmentCategories`);
    return res.data;
}


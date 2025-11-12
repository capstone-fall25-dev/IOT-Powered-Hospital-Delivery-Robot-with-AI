import axios from "axios";
import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = `${API_CONFIG.API_BASE}/CompartmentAssignments`;

export async function getAllCompartments() {
    // params = { taskId: number, status: string }
    try {
        const response = await axios.get(BASE_URL);
        return response.data;
    } catch (err) {
        console.error("Lỗi getAllCompartments:", err);
        return [];
    }
}

export async function getCompartmentById(id) {
    try {
        const response = await axios.get(`${BASE_URL}/${id}`);
        return response.data;
    } catch (err) {
        console.error("Lỗi getCompartmentById:", err);
        return null;
    }
}

export async function createCompartment(assignmentDto) {
    try {
        const response = await axios.post(BASE_URL, assignmentDto);
        return response.data;
    } catch (err) {
        console.error("Lỗi createCompartment:", err);
        throw err;
    }
}

export async function updateCompartment(id, assignmentDto) {
    try {
        const response = await axios.put(`${BASE_URL}/${id}`, assignmentDto);
        return response.data;
    } catch (err) {
        console.error("Lỗi updateCompartment:", err);
        throw err;
    }
}

export async function loadCompartment(id, loadDto) {
    try {
        const response = await axios.patch(`${BASE_URL}/${id}/load`, loadDto);
        return response.data;
    } catch (err) {
        console.error("Lỗi loadCompartment:", err);
        throw err;
    }
}

export async function bulkLoadCompartments(taskId, loadDtos) {
    try {
        const response = await axios.post(`${BASE_URL}/tasks/${taskId}/load-compartments`, loadDtos);
        return response.data;
    } catch (err) {
        console.error("Lỗi bulkLoadCompartments:", err);
        throw err;
    }
}

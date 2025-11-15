import { API_CONFIG } from "@/utils/apiConfig";

// =============== CATEGORY API ==================

export async function getAllCategories() {
    const res = await fetch(`${API_CONFIG.API_BASE}/medicine/categories`);
    return res.json();
}

export async function createCategory(data) {
    const res = await fetch(`${API_CONFIG.API_BASE}/medicine/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function updateCategory(id, data) {
    const res = await fetch(`${API_CONFIG.API_BASE}/medicine/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function deleteCategory(id) {
    const res = await fetch(`${API_CONFIG.API_BASE}/medicine/categories/${id}`, {
        method: "DELETE"
    });
    return res.json();
}

// =============== MEDICINE API ==================

export async function getAllMedicines() {
    const res = await fetch(`${API_CONFIG.API_BASE}/medicine/list`);
    return res.json();
}

export async function getMedicine(id) {
    const res = await fetch(`${API_CONFIG.API_BASE}/medicine/${id}`);
    return res.json();
}

export async function createMedicine(data) {
    const res = await fetch(`${API_CONFIG.API_BASE}/medicine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function updateMedicine(id, data) {
    const res = await fetch(`${API_CONFIG.API_BASE}/medicine/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function deleteMedicine(id) {
    const res = await fetch(`${API_CONFIG.API_BASE}/medicine/${id}`, { method: "DELETE" });
    return res.json();
}
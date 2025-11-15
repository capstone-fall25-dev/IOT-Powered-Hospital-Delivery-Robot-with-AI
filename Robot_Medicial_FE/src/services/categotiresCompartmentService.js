import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = `${API_CONFIG.API_BASE}/CompartmentCategories`;

export async function getAllCategoryCompartment() {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error("Failed to fetch compartment categories");
    return res.json();
}
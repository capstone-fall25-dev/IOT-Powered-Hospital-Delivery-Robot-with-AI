import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = `${API_CONFIG.API_BASE}/CompartmentCategories`;

export async function getAllCategoryCompartment() {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error("Failed to fetch compartment categories");
    return res.json();
}


export async function getCategoryById(id) {
const res = await fetch(`${BASE_URL}/${id}`);
if (!res.ok) throw new Error("Failed to fetch category by id");
return res.json();
}


// CREATE
export async function createCategory(payload) {
const res = await fetch(BASE_URL, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload),
});


const body = await res.json();
if (!res.ok) throw body;
return body;
}


// UPDATE
export async function updateCategory(id, payload) {
const res = await fetch(`${BASE_URL}/${id}`, {
method: "PUT",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload),
});


const body = await res.json();
if (!res.ok) throw body;
return body;
}


// DELETE
export async function deleteCategory(id) {
const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });


const body = await res.json();
if (!res.ok) throw body;
return body;
}
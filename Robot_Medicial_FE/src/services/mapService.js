import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = `${API_CONFIG.API_BASE}/Patients`;

export async function getAllMaps() {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error("Failed to fetch maps");
    return res.json();
}

export async function getMapById(id) {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch map with id ${id}`);
    return res.json();
}

export async function getMapImage(id) {
    const res = await fetch(`${BASE_URL}/${id}/image`);
    if (!res.ok) throw new Error(`Failed to fetch map image with id ${id}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob); // trả về URL tạm thời để dùng <img src={...} />
}

export async function createMap(mapDto, imageFile) {
    const formData = new FormData();
    for (const key in mapDto) {
        if (mapDto[key] !== undefined && mapDto[key] !== null) {
            formData.append(key, mapDto[key]);
        }
    }
    if (imageFile) {
        formData.append("imageFile", imageFile);
    }

    const res = await fetch(BASE_URL, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to create map");
    }

    return res.json();
}

export async function updateMap(id, mapDto, imageFile) {
    const formData = new FormData();
    for (const key in mapDto) {
        if (mapDto[key] !== undefined && mapDto[key] !== null) {
            formData.append(key, mapDto[key]);
        }
    }
    if (imageFile) {
        formData.append("imageFile", imageFile);
    }

    const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        body: formData,
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Failed to update map with id ${id}`);
    }

    return res.json();
}

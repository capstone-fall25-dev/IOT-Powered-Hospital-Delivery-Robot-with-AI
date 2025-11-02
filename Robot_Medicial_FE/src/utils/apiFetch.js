export async function apiFetch(url, options = {}) {
    try {
        const token = sessionStorage.getItem("token");
        const headers = {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            ...options.headers
        };

        const res = await fetch(url, { ...options, headers });

        if (!res.ok) {
            const errorBody = await res.json().catch(() => ({}));
            const err = new Error(`HTTP error ${res.status}`);
            err.status = res.status;
            err.body = errorBody;
            throw err;
        }

        // Nếu response không có body, trả về null
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return null;

        return await res.json();
    } catch (err) {
        console.error(`apiFetch lỗi tại ${url}:`, err);
        throw err;
    }
}

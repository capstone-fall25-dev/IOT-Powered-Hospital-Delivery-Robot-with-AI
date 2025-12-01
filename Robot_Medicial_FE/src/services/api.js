// src/services/api.js
import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = API_CONFIG.API_BASE;

function getCleanToken() {
  const raw = localStorage.getItem("token") || "";
  return raw.replace(/^Bearer\s+/i, "").trim();
}

export async function apiFetch(url, options = {}) {
  const token = getCleanToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // Nếu là FormData thì KHÔNG set Content-Type (browser tự set boundary)
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const response = await fetch(BASE_URL + url, {
    ...options,
    headers,
  });

  // TỰ ĐỘNG LOGOUT KHI 401
  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    return;
  }

  if (!response.ok) {
    let message = "Đã có lỗi xảy ra";
    try {
      const text = await response.text();
      const json = text ? JSON.parse(text) : null;
      message = json?.message || json?.error || message;
    } catch {
      message = await response.text();
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  // Nếu response rỗng (204 No Content) → trả về null
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
// src/services/api.js
import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = API_CONFIG.API_BASE;

/**
 * Lấy token sạch (loại bỏ "Bearer " nếu có)
 */
function getCleanToken() {
  const raw = sessionStorage.getItem("token") || "";
  return raw.replace(/^Bearer\s+/i, "").trim();
}

/**
 * Hàm gọi API chung cho toàn app
 * → Tự động gắn Authorization: Bearer <token sạch>
 * → Tự động xử lý lỗi + trả message từ backend
 */
export async function apiFetch(url, options = {}) {
  const token = getCleanToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(BASE_URL + url, {
    ...options,
    headers,
  });

  // Xử lý lỗi
  if (!response.ok) {
    let message = `Lỗi HTTP ${response.status}`;
    try {
      const text = await response.text();
      const json = text ? JSON.parse(text) : null;
      message = json?.message || message;
    } catch {}
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  // Nếu response rỗng (204 No Content) → trả về null
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
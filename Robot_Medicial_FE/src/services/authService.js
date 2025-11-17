// src/services/authService.js
import { API_CONFIG } from "@/utils/apiConfig";
const BASE_URL = API_CONFIG.API_BASE;

async function apiFetch(url, options = {}) {
  const token = sessionStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const response = await fetch(BASE_URL + url, { ...options, headers });
  
  if (!response.ok) {
    // Fix: Parse JSON an toàn trong try-catch riêng, chỉ throw fallback nếu parse fail
    // Nếu parse ok, throw message từ BE sau try-catch (không bị catch)
    let responseText = '';
    let errData = null;
    try {
      responseText = await response.text();
      if (responseText) {
        errData = JSON.parse(responseText);
      }
    } catch (parseErr) {
      console.error('Failed to parse error body:', parseErr, 'Raw text:', responseText);
      // Chỉ throw fallback nếu parse fail
      throw new Error(`Lỗi HTTP ${response.status}`);
    }
    
    // Sau try-catch: Nếu đến đây, parse ok → throw message từ BE
    const errorMessage = errData?.message || `Lỗi HTTP ${response.status}`;
    throw new Error(errorMessage);
  }
  
  // Success path
  return await response.json();
}

export async function login(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(email) {
  return apiFetch(`/auth/logout?username=${encodeURIComponent(email)}`, {
    method: "POST",
  });
}
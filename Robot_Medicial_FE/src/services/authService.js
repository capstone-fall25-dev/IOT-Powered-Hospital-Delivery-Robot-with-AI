// src/services/authService.js
import { apiFetch } from "./api";
import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = API_CONFIG.API_BASE;

// Login không cần token
export async function login(email, password) {
  const response = await fetch(BASE_URL + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.text();
    let msg = "Đăng nhập thất bại";
    try { msg = JSON.parse(err).message || msg; } catch {}
    throw new Error(msg);
  }
  return response.json();
}

export async function logout() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch (e) {
    console.warn("Logout API failed:", e.message);
  } finally {
    sessionStorage.removeItem("token");
  }
}

export async function getUserByToken(token) {
  const cleanToken = (token || "").replace(/^Bearer\s+/i, "").trim();
  if (!cleanToken) throw new Error("Không có token");

  try {
    const data = await apiFetch("/auth/check-login-status");
    return {
      email: data.email,
      fullName: data.fullName,
      role: data.role,
    };
  } catch (err) {
    console.warn("check-login-status failed:", err.message);
    function decodeJwt(token) {
      const base64 = token.split('.')[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c =>
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
      );

      return JSON.parse(jsonPayload);
    }

    try {
      const payload = decodeJwt(cleanToken);
      return {
        email: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || payload.email || "user@example.com", 
        fullName: payload.FullName || payload.fullName || "User", 
        role: payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload.role || "user", };
    } catch {
      throw new Error("Token không hợp lệ");
    }
  }
}
// src/services/authService.js
import { apiFetch } from "./api";
import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = API_CONFIG.API_BASE;

export async function login(email, password) {
  const response = await fetch(BASE_URL + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.text();
    let msg = "Đăng nhập thất bại";
    try {
      msg = JSON.parse(err).message || msg;
    } catch { }
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
    localStorage.removeItem("token");
  }
}

// Dùng để check token còn sống không khi load app
export async function getUserByToken() {
  try {
    const data = await apiFetch("/auth/check-login-status");
    // Lấy user ID từ JWT token
    const token = localStorage.getItem("token");
    let userId = null;
    if (token) {
      const decoded = decodeJwt(token.replace(/^Bearer\s+/i, "").trim());
      userId = decoded[Object.keys(decoded).find(key => 
        key.includes("nameidentifier") || key.includes("sub") || key === "id"
      )] || decoded.id || decoded.sub;
    }
    return {
      id: userId ? Number(userId) : null,
      email: data.email,
      fullName: data.fullName,
      role: data.role,
    };
  } catch (err) {
    throw err; // để AuthProvider bắt và xóa token
  }
}

// Decode JWT fallback (khi BE trả 401 nhưng token vẫn còn payload)
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

// =======================
// FORGOT PASSWORD
// =======================

// Step 1 — gửi OTP
export async function requestForgotPassword(email) {
  return apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// Step 2 — verify OTP + mật khẩu mới
export async function verifyForgotPassword({ email, otp, newPassword }) {
  return apiFetch("/auth/verify-otp-forgotPassword", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword }),
  });
}

export async function resetPassword(payload) {
  return apiFetch("/auth/reset-password-byForgot", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

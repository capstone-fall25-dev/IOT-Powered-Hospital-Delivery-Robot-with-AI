// src/services/authService.js
import { API_CONFIG } from "@/utils/apiConfig";
const BASE_URL = API_CONFIG.API_BASE;

async function apiFetch(url, options = {}) {
  const token = sessionStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: token }),
    ...options.headers,
  };
  const response = await fetch(BASE_URL + url, { ...options, headers });
  
  if (!response.ok) {
    let responseText = '';
    let errData = null;
    try {
      responseText = await response.text();
      if (responseText) {
        errData = JSON.parse(responseText);
      }
    } catch (parseErr) {
      console.error('Failed to parse error body:', parseErr, 'Raw text:', responseText);
      throw new Error(`Lỗi HTTP ${response.status}`);
    }
    
    const errorMessage = errData?.message || `Lỗi HTTP ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return await response.json();
}

// Decode JWT token để lấy thông tin user
function decodeToken(token) {
  try {
    const cleanToken = token.replace("Bearer ", "");
    const base64Url = cleanToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Lỗi decode token:", error);
    return null;
  }
}

export async function login(email, password) {
  const response = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  
  return response;
}

// Lấy thông tin user từ token
export async function getUserByToken(token) {
  // Option 1: Gọi API check-login-status
  try {
    const response = await fetch(BASE_URL + "/auth/check-login-status", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        email: data.email,
        fullName: data.fullName,
        role: data.role,
      };
    }
  } catch (error) {
    console.error("Lỗi gọi check-login-status:", error);
  }
  
  // Option 2: Fallback - decode token locally
  const decoded = decodeToken(token);
  
  if (decoded) {
    // ⬇️ FIX: Kiểm tra cả FullName (chữ hoa) và fullName (chữ thường)
    const userData = {
      email: decoded.email 
          || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"]
          || decoded.unique_name 
          || decoded.sub,
      
      // ⬇️ QUAN TRỌNG: Kiểm tra FullName (chữ F HOA) trước
      fullName: decoded.FullName        // ⬅️ Backend dùng chữ F HOA
             || decoded.fullName        // ⬅️ Fallback chữ f thường
             || decoded.name 
             || decoded.given_name 
             || "User",
      
      role: decoded.role 
         || decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]
         || "user",
    };
    
    return userData;
  }
  
  throw new Error("Không thể lấy thông tin user từ token");
}

export async function logout(email) {
  return apiFetch("/auth/logout", {
    method: "POST",
  });
}

export async function getMyProfile() {
  return apiFetch("/profile");
}

/**
 * Cập nhật profile của user hiện tại
 */
export async function updateMyProfile(profileData) {
  return apiFetch("/profile", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
}

/**
 * Đổi mật khẩu
 */
export async function changePassword(passwordData) {
  return apiFetch("/profile/change-password", {
    method: "PUT",
    body: JSON.stringify(passwordData),
  });
}
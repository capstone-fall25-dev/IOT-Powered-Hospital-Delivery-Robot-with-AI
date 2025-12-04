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

  // Đọc response text một lần duy nhất
  const text = await response.text();

  if (!response.ok) {
    let message = "Đã có lỗi xảy ra";
    
    if (!text || text.trim() === "") {
      // Response rỗng
      message = `Lỗi ${response.status}: ${response.statusText || "Không có thông tin"}`;
    } else {
      try {
        // Thử parse JSON
        const json = JSON.parse(text);
        
        // Backend có thể trả về:
        // 1. { message: "..." } 
        // 2. { error: "..." }
        // 3. { Message: "..." } (PascalCase)
        // 4. { errors: { field: ["error1", "error2"] } } (ASP.NET Core validation errors)
        // 5. { Errors: [...] } (ModelState errors)
        // 6. String trực tiếp
        
        if (typeof json === "string") {
          // Nếu parse ra là string (hiếm khi xảy ra)
          message = json;
        } else if (json?.errors && typeof json.errors === "object") {
          // ASP.NET Core validation errors format: { errors: { field: ["error1"] } }
          // Lấy message đầu tiên từ errors object
          const errorFields = Object.keys(json.errors);
          if (errorFields.length > 0) {
            const firstField = errorFields[0];
            const fieldErrors = json.errors[firstField];
            if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
              message = fieldErrors[0]; // Lấy message đầu tiên
            } else if (typeof fieldErrors === "string") {
              message = fieldErrors;
            } else {
              message = json.title || "Có lỗi validation xảy ra";
            }
          } else {
            message = json.title || "Có lỗi validation xảy ra";
          }
        } else if (json?.message) {
          message = json.message;
        } else if (json?.Message) {
          message = json.Message;
        } else if (json?.error) {
          message = json.error;
        } else if (json?.Error) {
          message = json.Error;
        } else if (json?.title) {
          // ASP.NET Core ProblemDetails format
          message = json.title;
        } else if (json?.Errors && Array.isArray(json.Errors)) {
          // ModelState errors - lấy message đầu tiên
          const firstError = json.Errors[0];
          if (typeof firstError === "string") {
            message = firstError;
          } else if (firstError?.ErrorMessage) {
            message = firstError.ErrorMessage;
          } else if (firstError?.message) {
            message = firstError.message;
          } else {
            message = json.title || "Có lỗi validation xảy ra";
          }
        } else if (typeof json === "object") {
          // Nếu là object nhưng không có message/error, thử lấy title hoặc stringify
          message = json.title || JSON.stringify(json);
        } else {
          message = text;
        }
      } catch (parseError) {
        // Không phải JSON, dùng text trực tiếp
        message = text;
      }
    }
    
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  // Nếu response rỗng (204 No Content) → trả về null
  return text ? JSON.parse(text) : null;
}
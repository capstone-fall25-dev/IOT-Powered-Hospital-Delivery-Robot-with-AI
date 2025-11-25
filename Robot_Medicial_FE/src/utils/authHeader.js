// src/utils/authHeader.js
export function authHeader() {
    const token = sessionStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

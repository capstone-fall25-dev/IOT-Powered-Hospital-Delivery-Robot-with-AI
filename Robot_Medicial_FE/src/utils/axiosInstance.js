import axios from "axios";
import { API_CONFIG } from "@/utils/apiConfig";

const api = axios.create({
    baseURL: API_CONFIG.API_BASE
});

api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;

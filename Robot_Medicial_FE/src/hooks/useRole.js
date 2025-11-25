// src/hooks/useRole.js
import { useAuth } from "@/utils/authContext";

export const useRole = () => {
    const { user } = useAuth();
    
    const isAdmin = () => user?.role === "admin";
    const isDoctor = () => user?.role === "doctor";
    const isPharmacist = () => user?.role === "pharmacist";
    
    const hasRole = (role) => {
        if (Array.isArray(role)) {
            return role.includes(user?.role);
        }
        return user?.role === role;
    };
    
    return {
        role: user?.role,
        isAdmin,
        isDoctor,
        isPharmacist,
        hasRole,
    };
};
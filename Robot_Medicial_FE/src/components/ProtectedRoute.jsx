// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/utils/authContext";

/**
 * ProtectedRoute: Yêu cầu đăng nhập
 * Cho phép kiểm tra role nếu có
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    // Đang loading
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
                <div className="spinner-border" style={{ color: '#0d9488' }} role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    // Chưa đăng nhập
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Kiểm tra role (nếu có)
    if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.role)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    // Có quyền truy cập
    return children;
};

export default ProtectedRoute;
// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/utils/authContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    // Đang loading, hiển thị spinner hoặc skeleton
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    // Chưa đăng nhập
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Kiểm tra role (nếu có yêu cầu role)
    if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.role)) {
            // Không có quyền truy cập -> redirect về trang chủ hoặc trang lỗi
            return <Navigate to="/" replace />;
        }
    }

    // Có quyền truy cập
    return children;
};

export default ProtectedRoute;
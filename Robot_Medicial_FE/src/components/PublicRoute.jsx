// src/components/PublicRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/utils/authContext";

/**
 * PublicRoute: Chỉ cho phép truy cập khi CHƯA đăng nhập
 * Nếu đã đăng nhập -> redirect về dashboard
 */
const PublicRoute = ({ children }) => {
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

    // Đã đăng nhập -> redirect về dashboard
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    // Chưa đăng nhập -> cho phép truy cập
    return children;
};

export default PublicRoute;
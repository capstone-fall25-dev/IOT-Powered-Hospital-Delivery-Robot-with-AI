// src/components/Header.jsx
import React, { useState } from "react";
import { Navbar, Nav, Container, Dropdown, Image } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/utils/authContext";
import { logout as logoutAPI } from "@/services/authService";
import logo from '../assets/image/logo.png';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const [showMenu, setShowMenu] = useState(false);

    // Lấy thông tin user từ AuthContext
    const userName = user?.fullName || "User";
    const userRole = user?.role || "guest";

    // Map role sang tiếng Việt
    const getRoleDisplay = (role) => {
        switch(role) {
            case "admin":
                return "Quản trị viên";
            case "doctor":
                return "Bác sĩ";
            case "pharmacist":
                return "Dược sĩ";
            default:
                return "Người dùng";
        }
    };

    // Get role color for badge
    const getRoleColor = (role) => {
        switch(role) {
            case "admin":
                return "#dc2626"; // Red
            case "doctor":
                return "#0891b2"; // Teal
            case "pharmacist":
                return "#16a34a"; // Green
            default:
                return "#64748b"; // Gray
        }
    };

    const handleNavigate = async (path) => {
        if (path === "logout") {
            try {
                // Gọi API logout
                if (user?.email) {
                    await logoutAPI(user.email);
                }
            } catch (error) {
                console.error("Lỗi khi logout:", error);
            } finally {
                // Xóa token và user info
                logout();
                navigate("/login");
            }
        } else {
            navigate(`/${path}`);
        }
        setShowMenu(false);
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    // Nếu chưa login, không hiển thị header
    if (!user) {
        return null;
    }

    return (
        <Navbar 
            expand="lg" 
            className="shadow-sm fixed-top"
            style={{
                background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
            }}
        >
            <Container fluid>
                <Navbar.Brand
                    style={{ 
                        cursor: "pointer", 
                        display: "flex", 
                        alignItems: "center",
                        color: "white"
                    }}
                >
                    <img
                        src={logo}
                        alt="Logo"
                        style={{
                            height: "40px",
                            width: "40px",
                            objectFit: "contain",
                            marginRight: "12px",
                            borderRadius: "8px",
                            backgroundColor: "white",
                            padding: "4px"
                        }}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span className="fw-bold" style={{ fontSize: "18px" }}>
                            Robot Y Tế Thông Minh
                        </span>
                        <span style={{ fontSize: "11px", opacity: 0.9 }}>
                            Giải pháp vận chuyển tự động
                        </span>
                    </div>
                </Navbar.Brand>

                <Navbar.Toggle 
                    aria-controls="basic-navbar-nav" 
                    style={{ 
                        backgroundColor: "white",
                        border: "none" 
                    }}
                />
                
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto d-flex align-items-center gap-3">
                        <Nav.Link
                            onClick={() => handleNavigate("")}
                            className={isActive("/") ? "active" : ""}
                            style={{
                                color: "white",
                                fontWeight: isActive("/") ? "bold" : "normal",
                                borderBottom: isActive("/") ? "2px solid white" : "none",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                transition: "all 0.3s"
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive("/")) {
                                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                            }}
                        >
                            <i className="bi bi-house-door me-2"></i>
                            Trang chủ
                        </Nav.Link>

                        <Nav.Link
                            onClick={() => handleNavigate("dashboard")}
                            className={isActive("/dashboard") ? "active" : ""}
                            style={{
                                color: "white",
                                fontWeight: isActive("/dashboard") ? "bold" : "normal",
                                borderBottom: isActive("/dashboard") ? "2px solid white" : "none",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                transition: "all 0.3s"
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive("/dashboard")) {
                                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                            }}
                        >
                            <i className="bi bi-clipboard-check me-2"></i>
                            Nhiệm vụ
                        </Nav.Link>

                        <Nav.Link
                            onClick={() => handleNavigate("team")}
                            className={isActive("/team") ? "active" : ""}
                            style={{
                                color: "white",
                                fontWeight: isActive("/team") ? "bold" : "normal",
                                borderBottom: isActive("/team") ? "2px solid white" : "none",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                transition: "all 0.3s"
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive("/team")) {
                                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                            }}
                        >
                            <i className="bi bi-cpu me-2"></i>
                            Robot
                        </Nav.Link>
                                                {/* ⭐ NÚT ĐIỂM ĐẾN MỚI THÊM Ở ĐÂY ⭐ */}
                        <Nav.Link
                            onClick={() => handleNavigate("destinationlist")}
                            className={isActive("/destinationlist") ? "active" : ""}
                            style={{
                                color: "white",
                                fontWeight: isActive("/destinationlist") ? "bold" : "normal",
                                borderBottom: isActive("/destinationlist") ? "2px solid white" : "none",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                transition: "all 0.3s"
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive("/destinationlist")) {
                                    e.currentTarget.style.backgroundColor =
                                        "rgba(255, 255, 255, 0.15)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                            }}
                        >
                            <i className="bi bi-geo-alt-fill me-2"></i>
                            Điểm đến
                        </Nav.Link>

                        <Dropdown 
                            align="end" 
                            show={showMenu} 
                            onToggle={(isOpen) => setShowMenu(isOpen)}
                        >
                            <Dropdown.Toggle
                                as="div"
                                id="user-menu"
                                className="d-flex align-items-center gap-2"
                                style={{ 
                                    cursor: "pointer",
                                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                                    padding: "6px 12px",
                                    borderRadius: "20px",
                                    border: "1px solid rgba(255, 255, 255, 0.3)",
                                    transition: "all 0.3s ease"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                                }}
                            >
                                <Image
                                    src="https://cdn-icons-png.flaticon.com/512/847/847969.png"
                                    alt="avatar"
                                    roundedCircle
                                    style={{ 
                                        width: "32px", 
                                        height: "32px", 
                                        objectFit: "cover",
                                        border: "2px solid white"
                                    }}
                                />
                                <div 
                                    className="d-none d-lg-block text-start" 
                                    style={{ color: "white" }}
                                >
                                    <div style={{ fontSize: "13px", fontWeight: "600" }}>
                                        {userName}
                                    </div>
                                    <div style={{ fontSize: "10px", opacity: 0.85 }}>
                                        {getRoleDisplay(userRole)}
                                    </div>
                                </div>
                            </Dropdown.Toggle>

                            <Dropdown.Menu 
                                className="shadow-lg border-0"
                                style={{
                                    minWidth: "240px",
                                    borderRadius: "12px",
                                    padding: "8px",
                                    marginTop: "8px"
                                }}
                            >
                                <div className="px-3 py-2 mb-2" style={{
                                    background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
                                    borderRadius: "8px",
                                    color: "white"
                                }}>
                                    <div className="fw-bold" style={{ fontSize: "15px" }}>
                                        {userName}
                                    </div>
                                    <div className="d-flex align-items-center gap-2 mt-1">
                                        <small style={{ opacity: 0.9 }}>
                                            {getRoleDisplay(userRole)}
                                        </small>
                                        <span 
                                            style={{
                                                fontSize: "9px",
                                                padding: "2px 8px",
                                                borderRadius: "10px",
                                                backgroundColor: "rgba(255, 255, 255, 0.25)",
                                                textTransform: "uppercase",
                                                fontWeight: "600"
                                            }}
                                        >
                                            {userRole}
                                        </span>
                                    </div>
                                </div>

                                <Dropdown.Item 
                                    onClick={() => handleNavigate("user-profile")}
                                    className="rounded my-1 d-flex align-items-center"
                                    style={{ 
                                        transition: "all 0.2s",
                                        padding: "10px 12px"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f0fdfa";
                                        e.currentTarget.style.transform = "translateX(5px)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                        e.currentTarget.style.transform = "translateX(0)";
                                    }}
                                >
                                    <i className="bi bi-person-circle me-2" style={{ 
                                        fontSize: "18px", 
                                        color: "#0d9488" 
                                    }}></i> 
                                    <span>Thông tin cá nhân</span>
                                </Dropdown.Item>

                                <Dropdown.Item 
                                    onClick={() => handleNavigate("change-password")}
                                    className="rounded my-1 d-flex align-items-center"
                                    style={{ 
                                        transition: "all 0.2s",
                                        padding: "10px 12px"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f1f5f9";
                                        e.currentTarget.style.transform = "translateX(5px)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                        e.currentTarget.style.transform = "translateX(0)";
                                    }}
                                >
                                    <i className="bi bi-key me-2" style={{ 
                                        fontSize: "18px", 
                                        color: "#64748b" 
                                    }}></i> 
                                    <span>Đổi mật khẩu</span>
                                </Dropdown.Item>

                                <Dropdown.Divider className="my-2" />

                                <Dropdown.Item
                                    onClick={() => handleNavigate("logout")}
                                    className="rounded my-1 d-flex align-items-center"
                                    style={{ 
                                        transition: "all 0.2s",
                                        padding: "10px 12px",
                                        color: "#dc2626",
                                        fontWeight: "600"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#fef2f2";
                                        e.currentTarget.style.transform = "translateX(5px)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                        e.currentTarget.style.transform = "translateX(0)";
                                    }}
                                >
                                    <i className="bi bi-box-arrow-right me-2" style={{ fontSize: "18px" }}></i> 
                                    <span>Đăng xuất</span>
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default Header;
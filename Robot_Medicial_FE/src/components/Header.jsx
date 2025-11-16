import React, { useState } from "react";
import { Navbar, Nav, Container, Dropdown, Image } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import logo from '../assets/image/logo.png';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showMenu, setShowMenu] = useState(false);

    const userName = localStorage.getItem("userName") || "User";
    const userRole = localStorage.getItem("userRole") || "Staff";

    const handleNavigate = (path) => {
        if (path === "logout") {
            localStorage.removeItem("token");
            localStorage.removeItem("userName");
            localStorage.removeItem("userRole");
            console.log("Logging out...");
            navigate("/login");
        } else {
            navigate(`/${path}`);
        }
        setShowMenu(false);
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

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
                    onClick={() => navigate("/")}
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
                            onClick={() => handleNavigate("tasks")}
                            className={isActive("/tasks") ? "active" : ""}
                            style={{
                                color: "white",
                                fontWeight: isActive("/tasks") ? "bold" : "normal",
                                borderBottom: isActive("/tasks") ? "2px solid white" : "none",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                transition: "all 0.3s"
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive("/tasks")) {
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
                            onClick={() => handleNavigate("robots")}
                            className={isActive("/robots") ? "active" : ""}
                            style={{
                                color: "white",
                                fontWeight: isActive("/robots") ? "bold" : "normal",
                                borderBottom: isActive("/robots") ? "2px solid white" : "none",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                transition: "all 0.3s"
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive("/robots")) {
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
                                        {userRole}
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
                                    <div className="fw-bold" style={{ fontSize: "15px" }}>{userName}</div>
                                    <small style={{ opacity: 0.9 }}>{userRole}</small>
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
                                    onClick={() => handleNavigate("settings")}
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
                                    <i className="bi bi-gear me-2" style={{ 
                                        fontSize: "18px", 
                                        color: "#64748b" 
                                    }}></i> 
                                    <span>Cài đặt</span>
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
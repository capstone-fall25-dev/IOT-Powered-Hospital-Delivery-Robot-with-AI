import React, { useState } from "react";
import { Navbar, Nav, Container, Dropdown, Image } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import logo from '../assets/image/logo.jpg';

const Header = () => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);

    const handleNavigate = (path) => {
        if (path === "logout") {
            // Xử lý logout ở đây
            console.log("Logging out...");
            // navigate("/login"); // Ví dụ chuyển về login
        } else {
            navigate(`/${path}`);
        }
    };

    return (
        <Navbar bg="light" expand="lg" className="shadow-sm fixed-top">
            <Container fluid>
                <Navbar.Brand
                    style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                    onClick={() => navigate("/")}
                >
                    <img
                        src={logo}
                        alt="Logo"
                        style={{
                            height: "30px",
                            width: "30px",
                            objectFit: "contain",
                            marginRight: "10px",
                        }}
                    />
                    <span className="fw-bold text-primary">SEP490_G35</span>
                </Navbar.Brand>
                <Nav className="ms-auto">
                    <Dropdown align="end" show={showMenu} onToggle={(isOpen) => setShowMenu(isOpen)}>
                        <Dropdown.Toggle
                            as="div"
                            id="user-menu"
                            className="d-flex align-items-center"
                            style={{ cursor: "pointer" }}
                        >
                            <Image
                                src="https://cdn-icons-png.flaticon.com/512/847/847969.png"
                                alt="avatar"
                                roundedCircle
                                style={{ width: "40px", height: "40px", objectFit: "cover" }}
                            />
                        </Dropdown.Toggle>

                        <Dropdown.Menu className="shadow-sm border-0">
                            <Dropdown.Item onClick={() => handleNavigate("profile")}>
                                <i className="bi bi-person-circle me-2"></i> Thông tin người dùng
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item
                                onClick={() => handleNavigate("logout")}
                                className="text-danger fw-semibold"
                            >
                                <i className="bi bi-box-arrow-right me-2"></i> Đăng xuất
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </Nav>
            </Container>
        </Navbar>
    );
};

export default Header;

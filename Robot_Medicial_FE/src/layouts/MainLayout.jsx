import React from "react";
import Header from "../components/Header";
import Sidebar from "../components/SideBar";

const MainLayout = ({ children }) => {
    return (
        <div className="main-layout">
            <Header />
            <Sidebar />
            <div className="main-content container-fluid pt-5 mt-4">
                {children}
            </div>

            {/* CSS inline cho dễ chỉnh */}
            <style jsx="true">{`
                .main-layout {
                    display: flex;
                    flex-direction: row;
                }

                /* Sidebar luôn nằm bên trái, content bên phải */
                .main-content {
                    flex: 1;
                    margin-left: 240px; /* chiều rộng sidebar */
                    transition: margin-left 0.3s ease;
                }

                /* ---------- TABLET (<= 1024px) ---------- */
                @media (max-width: 1024px) {
                    .main-layout {
                        flex-direction: column;
                    }

                    .main-content {
                        margin-left: 0;
                        padding-top: 4.5rem; /* chừa chỗ cho header */
                    }

                    .sidebar {
                        width: 100%;
                        display: flex;
                        flex-direction: row;
                        justify-content: space-around;
                        border-bottom: 1px solid #e0e0e0;
                        background: white;
                        padding: 0.5rem 0;
                    }
                }

                /* ---------- MOBILE (<= 768px) ---------- */
                @media (max-width: 768px) {
                    .main-content {
                        margin-left: 0;
                        padding: 1rem;
                        padding-top: 5rem;
                    }

                    /* Sidebar thu gọn */
                    .sidebar {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        background: white;
                        box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
                        display: flex;
                        justify-content: space-around;
                        padding: 0.5rem 0;
                        z-index: 1000;
                    }

                    /* Header cố định trên cùng */
                    header {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        z-index: 1001;
                    }
                }
            `}</style>
        </div>
    );
};

export default MainLayout;

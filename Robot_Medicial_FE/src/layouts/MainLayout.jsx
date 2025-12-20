import React from "react";
import Header from "../components/Header";
import Sidebar from "../components/SideBar";

const MainLayout = ({ children }) => {
    return (
        <div className="main-layout">
            <Header />
            <Sidebar />
            <main className="page-wrapper main-content container-fluid pt-5 mt-4">
                {children}
            </main>

            {/* CSS inline cho responsive và tích hợp */}
            <style jsx="true">{`
                .main-layout {
                    display: flex;
                    flex-direction: row;
                }

                .page-wrapper.main-content {
                    flex: 1;
                    transition: margin-left 0.3s ease;
                    padding-top: 80px; /* Chừa chỗ cho header */
                }

                /* ---------- TABLET (<= 1024px) ---------- */
                @media (max-width: 1024px) {
                    .main-layout {
                        flex-direction: column;
                    }

                    .page-wrapper.main-content {
                        margin-left: 0 !important;
                        padding-top: 70px;
                    }

                    .sidebar {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        z-index: 999 !important;
                    }
                }

                /* ---------- MOBILE (<= 768px) ---------- */
                @media (max-width: 768px) {
                    .page-wrapper.main-content {
                        margin-left: 0 !important;
                        padding: 1rem;
                        padding-top: 60px;
                        padding-bottom: 80px !important; /* Chừa chỗ cho bottom navigation bar */
                    }

                    .sidebar {
                        display: none !important;
                    }

                    /* Header fixed */
                    .navbar {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        z-index: 1000 !important;
                    }
                }

                /* ---------- SMALL MOBILE (<= 480px) ---------- */
                @media (max-width: 480px) {
                    .page-wrapper.main-content {
                        padding-top: 55px;
                        padding-bottom: 60px;
                    }
                }
            `}</style>
        </div>
    );
};

export default MainLayout;
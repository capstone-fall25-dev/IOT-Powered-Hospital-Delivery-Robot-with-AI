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

            {/* CSS inline cho responsive và tích hợp - dựa hoàn toàn vào Sidebar CSS cho desktop */}
            <style jsx="true">{`
                .main-layout {
                    display: flex;
                    flex-direction: row;
                }

                /* Không override background/margin ở đây, để Sidebar CSS xử lý .page-wrapper */
                .page-wrapper.main-content {
                    flex: 1;
                    transition: margin-left 0.3s ease;
                }

                /* ---------- TABLET (<= 1024px) ---------- */
                @media (max-width: 1024px) {
                    .main-layout {
                        flex-direction: column;
                    }

                    .page-wrapper.main-content {
                        margin-left: 0 !important;
                        padding-top: 4.5rem; /* Chừa chỗ cho header */
                    }

                    .sidebar {
                        width: 100% !important;
                        height: auto !important;
                        position: relative !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        border-right: none !important;
                        display: flex !important;
                        flex-direction: row !important;
                        justify-content: space-around !important;
                        border-bottom: 1px solid #e0e0e0;
                        background: white;
                        padding: 0.5rem 0;
                        margin: 0;
                    }

                    .sidebar ul {
                        display: flex !important;
                        flex-direction: row !important;
                        width: 100% !important;
                        justify-content: space-around !important;
                        margin: 0;
                        padding: 0;
                    }

                    .sidebar li {
                        margin: 0 0.5rem !important;
                        padding: 0.5rem !important;
                        flex: 1 !important;
                        text-align: center !important;
                        justify-content: center !important;
                    }

                    .sidebar .logo {
                        display: none !important; /* Ẩn logo toggle trên tablet */
                    }

                    .sidebar .footer {
                        display: none !important;
                    }
                }

                /* ---------- MOBILE (<= 768px) ---------- */
                @media (max-width: 768px) {
                    .page-wrapper.main-content {
                        margin-left: 0 !important;
                        padding: 1rem;
                        padding-top: 5rem;
                    }

                    /* Sidebar bottom bar cho mobile */
                    .sidebar {
                        position: fixed !important;
                        bottom: 0 !important;
                        left: 0 !important;
                        top: auto !important;
                        width: 100% !important;
                        height: auto !important;
                        border-radius: 0 !important;
                        box-shadow: 0 -2px 8px rgba(0,0,0,0.1) !important;
                        border-right: none !important;
                        display: flex !important;
                        flex-direction: row !important;
                        justify-content: space-around !important;
                        padding: 0.5rem 0 !important;
                        z-index: 1000 !important;
                        background: white !important;
                        margin: 0;
                    }

                    .sidebar ul {
                        display: flex !important;
                        flex-direction: row !important;
                        width: 100% !important;
                        justify-content: space-around !important;
                        margin: 0;
                        padding: 0;
                    }

                    .sidebar li {
                        margin: 0 !important;
                        padding: 0.5rem !important;
                        flex: 1 !important;
                        text-align: center !important;
                        justify-content: center !important;
                        gap: 0 !important;
                    }

                    .sidebar li span {
                        display: none !important; /* Chỉ icon trên mobile */
                    }

                    .sidebar .logo {
                        display: none !important;
                    }

                    .sidebar .footer {
                        display: none !important;
                    }

                    /* Header fixed */
                    header {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        z-index: 1001 !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default MainLayout;
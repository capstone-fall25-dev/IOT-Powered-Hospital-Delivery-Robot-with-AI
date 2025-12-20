import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/utils/authContext";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMenuClick = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    // Exact match
    if (location.pathname === path) {
      return true;
    }
    
    // Check if pathname starts with the path (for sub-routes)
    // Ví dụ: "/users" sẽ active cho "/users/create", "/users/edit/123"
    if (location.pathname.startsWith(path + "/")) {
      return true;
    }
    
    // Special cases for routes with different patterns
    // "/user-detail/:id" should be active when path is "/users"
    if (path === "/users" && location.pathname.startsWith("/user-detail/")) {
      return true;
    }
    
    // "/patient/:id" should be active when path is "/patients"
    // Chú ý: cần kiểm tra không phải "/patients/" để tránh match "/patients/add"
    if (path === "/patients" && location.pathname.startsWith("/patient/") && !location.pathname.startsWith("/patients/")) {
      return true;
    }
    
    // Task-related routes should be active when path is "/dashboard"
    if (path === "/dashboard") {
      const taskRoutes = ["/task-detail/", "/task-edit/", "/run-task/", "/addtasks", "/history-mission", "/tasks/history/"];
      return taskRoutes.some(route => location.pathname.startsWith(route));
    }
    
    // Robot-related routes should be active when path is "/team"
    if (path === "/team") {
      const robotRoutes = ["/robot-detail/", "/robot-edit/", "/createRobot"];
      return robotRoutes.some(route => location.pathname.startsWith(route));
    }
    
    // Map-related routes should be active when path is "/viewlistmap"
    if (path === "/viewlistmap") {
      const mapRoutes = ["/maps/", "/create-map", "/run-map"];
      return mapRoutes.some(route => location.pathname.startsWith(route));
    }
    
    return false;
  };

  // Kiểm tra quyền truy cập menu
  const isAdmin = user?.role === "admin";
  const isDoctor = user?.role === "doctor"

  return (
    <>
      <div className={`sidebar glass d-flex flex-column`}>
      <style>{`
        :root {
          --teal: #4CE1C6;
          --teal-dark: #0d9488;
          --ink: #0f172a;
        }

        .page-wrapper {
          background: radial-gradient(900px 500px at 20% 10%, rgba(76,225,198,.16), transparent 60%),
                      radial-gradient(800px 400px at 85% 8%, rgba(76,225,198,.12), transparent 60%),
                      linear-gradient(180deg, #f6faf9 0%, #eef6f5 20%, #e9f3f1 60%, #e8f0ee 100%);
          font-family: 'Inter', system-ui, sans-serif;
          min-height: 100vh;
          transition: margin-left 0.2s ease-in-out;
        }

        .page-wrapper {
          margin-left: 250px;
          transition: margin-left 0.2s ease-in-out;
        }

        body.sidebar-collapsed .page-wrapper {
          margin-left: 60px;
        }

        .sidebar {
          width: 250px;
          height: 100vh;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(14px);
          border-right: 1px solid rgba(13, 148, 136, 0.15);
          box-shadow: 4px 0 25px rgba(15,23,42,0.08);
          border-radius: 0 24px 24px 0;
          position: fixed;
          top: 0;
          left: 0;
          transition: width 0.2s ease-in-out, border-radius 0.2s ease-in-out, padding 0.2s ease-in-out;
          z-index: 999;
          overflow: hidden;
          padding: 1rem;
        }

        body.sidebar-collapsed .sidebar {
          width: 60px;
          border-radius: 0;
          padding: 0.5rem 0.4rem;
        }

        /* Phần logo - cố định không scroll */
        .sidebar-header {
          flex-shrink: 0;
          padding-bottom: 1rem;
          margin-top: 1rem;
        }

        .sidebar .logo {
          font-weight: 800;
          font-size: 1.2rem;
          color: var(--ink);
          text-align: center;
          margin-bottom: 1rem;
          cursor: pointer;
          padding: 0.8rem;
          border-radius: 12px;
          transition: all 0.2s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.78) 0%, rgba(8, 145, 178, 0.78) 100%);
          color: white;
        }

        body.sidebar-collapsed .sidebar .logo {
          margin-bottom: 0.5rem;
          padding: 0.6rem;
        }

        .sidebar .logo:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.28);
        }

        .sidebar .logo i {
          font-size: 1.8rem;
        }

        body.sidebar-collapsed .sidebar .logo i {
          font-size: 1.5rem;
        }

        /* Phần menu - có scroll */
        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 4px;
        }

        .sidebar-content::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-content::-webkit-scrollbar-thumb {
          background: rgba(13, 148, 136, 0.3);
          border-radius: 3px;
        }

        .sidebar-content::-webkit-scrollbar-thumb:hover {
          background: rgba(13, 148, 136, 0.5);
        }

        .sidebar ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .sidebar li {
          padding: 0.9rem 1rem;
          border-radius: 12px;
          margin: 0.4rem 0;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          font-weight: 600;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
        }

        .sidebar li:hover {
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.07) 0%, rgba(8, 145, 178, 0.05) 100%);
          color: var(--teal-dark);
          transform: translateX(5px);
        }

        .sidebar li.active {
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.78) 0%, rgba(8, 145, 178, 0.78) 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.22);
        }

        .sidebar li.active:hover {
          transform: translateX(0);
        }

        .sidebar li i {
          font-size: 1.3rem;
          min-width: 24px;
          text-align: center;
        }

        .sidebar li span {
          transition: opacity 0.2s ease-in-out;
          font-size: 0.95rem;
        }

        /* Collapsed state - Hình vuông sát lề trái */
        body.sidebar-collapsed .sidebar li {
          justify-content: center;
          padding: 0.65rem;
          gap: 0;
          margin: 0.35rem 0;
          width: 100%;
          height: auto;
          display: flex;
          align-items: center;
        }

        body.sidebar-collapsed .sidebar li:hover {
          transform: translateX(0);
          transform: scale(1.05);
        }

        body.sidebar-collapsed .sidebar li span {
          display: none;
        }

        body.sidebar-collapsed .sidebar li i {
          font-size: 1.2rem;
        }

        /* Footer - cố định */
        .sidebar-footer {
          flex-shrink: 0;
          text-align: center;
          font-size: 0.85rem;
          color: #64748b;
          padding: 1rem 0.5rem 0.5rem;
          border-top: 1px solid rgba(13, 148, 136, 0.15);
          transition: opacity 0.2s ease-in-out;
          margin-top: 1rem;
        }

        .sidebar-footer strong {
          color: var(--teal-dark);
          font-weight: 700;
        }

        body.sidebar-collapsed .sidebar-footer {
          opacity: 0;
          height: 0;
          margin: 0;
          padding: 0;
          overflow: hidden;
          border: none;
        }

        /* Mobile Bottom Navigation Bar */
        .mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(13, 148, 136, 0.15);
          box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.1);
          z-index: 1001;
          padding: 0.4rem 0.25rem;
          height: 70px;
          width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
        }

        .mobile-bottom-nav::-webkit-scrollbar {
          display: none;
        }

        .mobile-bottom-nav {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .mobile-bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.3rem 0.4rem;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #64748b;
          text-decoration: none;
          border-radius: 8px;
          margin: 0 0.15rem;
          min-width: 0;
        }

        .mobile-bottom-nav-item:hover {
          background: rgba(13, 148, 136, 0.08);
          color: var(--teal-dark);
        }

        .mobile-bottom-nav-item.active {
          color: var(--teal-dark);
          background: rgba(13, 148, 136, 0.12);
        }

        .mobile-bottom-nav-item i {
          font-size: 1.2rem;
          margin-bottom: 0.15rem;
        }

        .mobile-bottom-nav-item span {
          font-size: 0.65rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        /* Responsive Styles - Mobile */
        @media (max-width: 768px) {
          .sidebar {
            display: none !important;
          }

          .page-wrapper {
            margin-left: 0 !important;
            padding-bottom: 75px !important;
          }

          .mobile-bottom-nav {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 1001 !important;
          }
        }

      `}</style>


      {/* Header - Cố định */}
      <div className="sidebar-header">
        <div className="logo mt-5" onClick={toggleSidebar}>
          {isCollapsed ? (
            <i className="bi bi-list"></i>
          ) : (
            <i className="bi bi-hospital"></i>
          )}
        </div>
      </div>

      {/* Content - Có scroll */}
      <div className="sidebar-content">
        <ul>
          <li
            onClick={() => handleMenuClick("/dashboard")}
            className={isActive("/dashboard") ? "active" : ""}
          >
          <i className="bi bi-list-task"></i>
            <span>Nhiệm vụ</span>
          </li>
           <li
            onClick={() => handleMenuClick("/report")}
            className={isActive("/report") ? "active" : ""}
          >
          <i className="bi bi-bar-chart-line"></i>
            <span>Thống kê nhiệm vụ</span>
          </li>
          <li
            onClick={() => handleMenuClick("/team")}
            className={isActive("/team") ? "active" : ""}
          >
            <i className="bi bi-robot"></i>
            <span>Robot</span>
          </li>
          <li
            onClick={() => handleMenuClick("/viewlistmap")}
            className={isActive("/viewlistmap") ? "active" : ""}
          >
            <i className="bi bi-map"></i>
            <span>Bản đồ</span>
          </li>
          <li
            onClick={() => handleMenuClick("/destinationlist")}
            className={isActive("/destinationlist") ? "active" : ""}
          >
            <i className="bi bi-geo-alt-fill"></i>
            <span>Điểm đến</span>
          </li>
          {/* Người dùng - CHỈ ADMIN */}
          {isAdmin && (
          <li
            onClick={() => handleMenuClick("/users")}
            className={isActive("/users") ? "active" : ""}
          >
            <i className="bi bi-people"></i>
            <span>Người dùng</span>
          </li>
          )}
          <li 
            onClick={() => handleMenuClick("/patients")}
            className={isActive("/patients") ? "active" : ""}
          >
            <i className="bi bi-person-lines-fill"></i>
            <span>Bệnh nhân</span>
          </li>
          <li
            onClick={() => handleMenuClick("/compartment-categories")}
            className={isActive("/compartment-categories") ? "active" : ""}
          >
            <i className="bi bi-grid-3x3-gap-fill"></i>
            <span>Ngăn chứa</span>
          </li>
          <li hidden 
            onClick={() => handleMenuClick("/rooms")}
            className={isActive("/rooms") ? "active" : ""}
          >
            <i className="bi bi-hospital"></i>
            <span>Phòng bệnh</span>
          </li>
          <li hidden 
            onClick={() => handleMenuClick("/prescriptions")}
            className={isActive("/prescriptions") ? "active" : ""}
          >
            <i className="bi bi-file-medical"></i>
            <span>Đơn thuốc</span>
          </li>
          <li hidden 
            onClick={() => handleMenuClick("/medicines")}
            className={isActive("/medicines") ? "active" : ""}
          >
            <i className="bi bi-box-seam"></i>
            <span>Kho thuốc</span>
          </li>
        </ul>
      </div>

      {/* Footer - Cố định */}
      <div className="sidebar-footer">
        <strong>Robot Y Tế</strong>
        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
          © 2025
        </div>
      </div>

      </div>

      {/* Mobile Bottom Navigation Bar - Render outside sidebar container */}
      <div className="mobile-bottom-nav">
        <div
          className={`mobile-bottom-nav-item ${isActive("/dashboard") ? "active" : ""}`}
          onClick={() => handleMenuClick("/dashboard")}
        >
          <i className="bi bi-list-task"></i>
          <span>Nhiệm vụ</span>
        </div>
        <div
          className={`mobile-bottom-nav-item ${isActive("/team") ? "active" : ""}`}
          onClick={() => handleMenuClick("/team")}
        >
          <i className="bi bi-robot"></i>
          <span>Robot</span>
        </div>
        <div
          className={`mobile-bottom-nav-item ${isActive("/viewlistmap") ? "active" : ""}`}
          onClick={() => handleMenuClick("/viewlistmap")}
        >
          <i className="bi bi-map"></i>
          <span>Bản đồ</span>
        </div>
        <div
          className={`mobile-bottom-nav-item ${isActive("/destinationlist") ? "active" : ""}`}
          onClick={() => handleMenuClick("/destinationlist")}
        >
          <i className="bi bi-geo-alt-fill"></i>
          <span>Điểm đến</span>
        </div>
        <div
          className={`mobile-bottom-nav-item ${isActive("/patients") ? "active" : ""}`}
          onClick={() => handleMenuClick("/patients")}
        >
          <i className="bi bi-person-lines-fill"></i>
          <span>Bệnh nhân</span>
        </div>
        <div
          className={`mobile-bottom-nav-item ${isActive("/compartment-categories") ? "active" : ""}`}
          onClick={() => handleMenuClick("/compartment-categories")}
        >
          <i className="bi bi-grid-3x3-gap-fill"></i>
          <span>Ngăn chứa</span>
        </div>
        {isAdmin && (
          <div
            className={`mobile-bottom-nav-item ${isActive("/users") ? "active" : ""}`}
            onClick={() => handleMenuClick("/users")}
          >
            <i className="bi bi-people"></i>
            <span>Người dùng</span>
          </div>
        )}
      </div>
    </>
  );
}

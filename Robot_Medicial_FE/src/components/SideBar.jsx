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

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Kiểm tra quyền truy cập menu
  const isAdmin = user?.role === "admin";
  const isDoctor = user?.role === "doctor"

  return (
    <div className="sidebar glass d-flex flex-column">
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
            onClick={() => navigate("/report")}
            className={isActive("/report") ? "active" : ""}
          >
            <i className="bi bi-bar-chart-line"></i>
            <span>Thống kê task</span>
          </li>

          <li
            onClick={() => navigate("/dashboard")}
            className={isActive("/dashboard") ? "active" : ""}
          >
            <i className="bi bi-list-task"></i>
            <span>Nhiệm vụ</span>
          </li>
          <li
            onClick={() => navigate("/team")}
            className={isActive("/team") ? "active" : ""}
          >
            <i className="bi bi-robot"></i>
            <span>Robot</span>
          </li>
          <li
            onClick={() => navigate("/viewlistmap")}
            className={isActive("/viewlistmap") ? "active" : ""}
          >
            <i className="bi bi-map"></i>
            <span>Bản đồ</span>
          </li>

          {/* Người dùng - CHỈ ADMIN */}
          {isAdmin && (
          <li
            onClick={() => navigate("/users")}
            className={isActive("/users") ? "active" : ""}
          >
            <i className="bi bi-people"></i>
            <span>Người dùng</span>
          </li>
          )}

          <li
            onClick={() => navigate("/patients")}
            className={isActive("/patients") ? "active" : ""}
          >
            <i className="bi bi-person-lines-fill"></i>
            <span>Bệnh nhân</span>
          </li>
          <li
            onClick={() => navigate("/compartment-categories")}
            className={isActive("/compartment-categories") ? "active" : ""}
          >
            <i className="bi bi-grid-3x3-gap-fill"></i>
            <span>Loại ngăn chứa</span>
          </li>
          <li
            onClick={() => navigate("/rooms")}
            className={isActive("/rooms") ? "active" : ""}
          >
            <i className="bi bi-hospital"></i>
            <span>Phòng bệnh</span>
          </li>
          <li
            onClick={() => navigate("/prescriptions")}
            className={isActive("/prescriptions") ? "active" : ""}
          >
            <i className="bi bi-file-medical"></i>
            <span>Đơn thuốc</span>
          </li>
          <li
            onClick={() => navigate("/medicines")}
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
        <br />
        <small>© 2025 Thông Minh</small>
      </div>
    </div>
  );
}

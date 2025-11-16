import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const navigate = useNavigate();
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

  return (
    <div className="sidebar glass p-4 d-flex flex-column justify-content-between">
      <style>{`
        :root {
          --teal: #4CE1C6;
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

        /* Target trực tiếp .page-wrapper (vì nó ở trên main-content) */
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
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(14px);
          border-right: 1px solid rgba(255,255,255,0.85);
          box-shadow: 4px 0 25px rgba(15,23,42,0.08);
          border-radius: 0 24px 24px 0;
          position: fixed;
          top: 0;
          left: 0;
          transition: width 0.2s ease-in-out, border-radius 0.2s ease-in-out;
          z-index: 999; /* Đảm bảo sidebar trên header nếu cần */
        }

        body.sidebar-collapsed .sidebar {
          width: 60px;
          border-radius: 0;
        }

        .sidebar .logo {
          font-weight: 800;
          font-size: 1.4rem;
          color: var(--ink);
          text-align: center;
          margin-bottom: 2rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: background-color 0.2s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar .logo:hover {
          background-color: rgba(76,225,198,0.15);
        }

        .sidebar .logo i {
          font-size: 1.8rem;
        }

        .sidebar ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .sidebar li {
          padding: 0.8rem 1rem;
          border-radius: 12px;
          margin: 0.3rem 0;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          font-weight: 600;
          color: #0b1324;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sidebar li:hover {
          background-color: rgba(76,225,198,0.15);
          color: var(--teal);
        }

        .sidebar li i {
          font-size: 1.2rem;
          min-width: 20px;
        }

        .sidebar li span {
          transition: opacity 0.2s ease-in-out;
        }

        body.sidebar-collapsed .sidebar li {
          justify-content: center;
          padding: 0.8rem 0.5rem;
          gap: 0;
        }

        body.sidebar-collapsed .sidebar li span {
          display: none;
        }

        .sidebar .footer {
          text-align: center;
          font-size: 0.9rem;
          opacity: 0.7;
          transition: opacity 0.2s ease-in-out;
        }

        body.sidebar-collapsed .sidebar .footer {
          opacity: 0;
          height: 0;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>

      <div>
        <div className="logo mt-5" onClick={toggleSidebar}>
          {isCollapsed ? (
            <i className="bi bi-list"></i>
          ) : (
            <i className="bi bi-hospital"></i>
          )}
        </div>
        <ul>
          <li onClick={() => navigate("/team")}><i className="bi bi-robot"></i><span>Robot</span></li>
          <li onClick={() => navigate("/patients")}><i className="bi bi-person-lines-fill"></i><span>Bệnh nhân</span></li>
          <li onClick={() => navigate("/users")}><i className="bi bi-people"></i><span>Người dùng</span></li>
          <li onClick={() => navigate("/dashboard")}><i className="bi bi-list-task"></i><span>Nhiệm vụ</span></li>
          <li onClick={() => navigate("/viewlistmap")}><i className="bi bi-map"></i><span>Bản đồ</span></li>
          <li onClick={() => navigate("/rooms")}><i className="bi bi-hospital"></i><span>Phòng bệnh</span></li>
          <li onClick={() => navigate("/prescriptions")}><i className="bi bi-file-medical"></i><span>Đơn thuốc</span></li>
          <li onClick={() => navigate("/medicines")}><i className="bi bi-box-seam"></i><span>Kho thuốc</span></li>
        </ul>
      </div>

      <div className="footer">
        <small>© 2025 SEP490_G35</small>
      </div>
    </div>
  );
}
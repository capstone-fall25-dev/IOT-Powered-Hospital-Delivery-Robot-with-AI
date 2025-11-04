import { useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
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
        }

        .sidebar .logo {
          font-weight: 800;
          font-size: 1.4rem;
          color: var(--ink);
          text-align: center;
          margin-bottom: 2rem;
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
        }

        .sidebar .footer {
          text-align: center;
          font-size: 0.9rem;
          opacity: 0.7;
        }
      `}</style>

      <div>
        <div className="logo">
          <i className="bi bi-robot text-success me-2"></i> MedFleet
        </div>
        <ul>
          <li onClick={() => navigate("/team")}><i className="bi bi-robot"></i> Đội Robot</li>
          <li onClick={() => navigate("/patients")}><i className="bi bi-person-lines-fill"></i> Bệnh nhân</li>
          <li onClick={() => navigate("/doctor")}><i className="bi bi-capsule"></i> Bác sĩ</li>
          <li onClick={() => navigate("/dashboard")}><i className="bi bi-list-task"></i> Nhiệm vụ</li>
          <li onClick={() => navigate("/viewlistmap")}><i className="bi bi-map"></i> Bản đồ</li>
          <li onClick={() => navigate("/rooms/all")}><i className="bi bi-hospital me-2"></i> Phòng bệnh</li>
          <li onClick={() => navigate("/prescriptions")}><i className="bi bi-file-medical me-2"></i> Đơn thuốc</li>
          <li onClick={() => navigate("/medicines")}><i className="bi bi-box-seam me-2"></i> Kho thuốc</li>
        </ul>
      </div>

      <div className="footer">
        <small>© 2025 MedFleet</small>
      </div>
    </div>
  );
}

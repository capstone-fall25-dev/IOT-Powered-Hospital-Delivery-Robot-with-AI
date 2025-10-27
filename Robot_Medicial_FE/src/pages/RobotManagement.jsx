import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RobotFleetCards() {
    const navigate = useNavigate();

    // Load Bootstrap/Icons/Fonts (chỉ dùng cho demo)
    useEffect(() => {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
        document.head.appendChild(css);

        const icons = document.createElement("link");
        icons.rel = "stylesheet";
        icons.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css";
        document.head.appendChild(icons);

        const font = document.createElement("link");
        font.rel = "stylesheet";
        font.href =
            "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
        document.head.appendChild(font);

        const js = document.createElement("script");
        js.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
        js.defer = true;
        document.body.appendChild(js);

        return () => {
            document.head.removeChild(css);
            document.head.removeChild(icons);
            document.head.removeChild(font);
            document.body.removeChild(js);
        };
    }, []);

    const styles = (
        <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(1200px 600px at 15% 10%,rgba(76,225,198,.18),transparent 60%),radial-gradient(900px 500px at 90% 5%,rgba(76,225,198,.12),transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 20%,#e9f3f1 60%,#e8f0ee 100%);min-height:100vh}
      .title{font-weight:900;color:#0b1432}
      .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
      .btn-teal:hover{filter:brightness(1.05)}
      .robot-card{background:#0e1a2b;color:#eef7f5;border:1px solid rgba(255,255,255,.06);border-radius:16px;box-shadow:0 8px 22px rgba(2,6,23,.18);transition:transform .2s ease, box-shadow .2s ease;cursor:pointer}
      .robot-card:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(2,6,23,.22)}
      .robot-card .muted{color:#cfe9e5;opacity:.85}
      .badge-status{border:1px solid rgba(255,255,255,.2); font-weight:700}
      .badge-warn{background:#ffefc6;color:#8a6a00}
      .badge-ready{background:#d6fffb;color:#0b3e3c}
      .badge-stop{background:#e9d6ff;color:#5b2d86}
      .progress-dark{--bs-progress-bg:rgba(255,255,255,.1); --bs-progress-height: 8px}
    `}</style>
    );

    const [robots, setRobots] = useState([
        { id: "RB-001", battery: 78, mission: 50, status: "chobangiao" },
        { id: "RB-002", battery: 55, mission: 95, status: "chobangiao" },
        { id: "RB-003", battery: 60, mission: 95, status: "chobangiao" },
        { id: "RB-004", battery: 77, mission: 0, status: "tamtam" },
    ]);

    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");

    const filtered = useMemo(
        () =>
            robots.filter(
                (r) =>
                    (status === "all" || r.status === status) &&
                    r.id.toLowerCase().includes(q.toLowerCase())
            ),
        [robots, q, status]
    );

    function statusBadge(s) {
        if (s === "chobangiao")
            return <span className="badge badge-warn badge-status">Chờ bàn giao</span>;
        if (s === "tamtam")
            return <span className="badge badge-stop badge-status">Tạm dừng</span>;
        if (s === "taitram")
            return <span className="badge badge-warn badge-status">Tại trạm</span>;
        return <span className="badge badge-ready badge-status">Sẵn sàng</span>;
    }

    return (
        <div className="page">
            {styles}
            <div className="container-xl py-3 py-lg-4">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                    <h5 className="title mb-0">Đội Robot Y Tế</h5>
                    <div className="d-flex gap-2">
                        <input
                            className="form-control"
                            style={{ width: 220 }}
                            placeholder="Tìm robot (RB-xxx)"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                        <select
                            className="form-select"
                            style={{ width: 180 }}
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="chobangiao">Chờ bàn giao</option>
                            <option value="taitram">Tại trạm</option>
                            <option value="sansang">Sẵn sàng</option>
                            <option value="tamtam">Tạm dừng</option>
                        </select>
                        <button className="btn btn-teal">
                            <i className="bi bi-plus-lg me-1"></i> Thêm robot
                        </button>
                    </div>
                </div>

                <div className="row g-3">
                    {filtered.map((r) => (
                        <div className="col-12 col-sm-6 col-lg-3" key={r.id}>
                            <div
                                className="robot-card p-3 h-100"
                                onClick={() => navigate(`/robot-detail/${r.id}`)}
                            >
                                <div className="fw-bold mb-1">{r.id}</div>
                                <div className="mb-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-battery-half"></i>
                                        <span className="muted">Ắc quy: {r.battery}%</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-graph-up"></i>
                                        <span className="muted">Tiến độ: {r.mission}%</span>
                                    </div>
                                </div>
                                <div
                                    className="progress progress-dark mb-2"
                                    role="progressbar"
                                    aria-label={`mission-${r.id}`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                >
                                    <div
                                        className="progress-bar"
                                        style={{ width: `${r.mission}%` }}
                                    ></div>
                                </div>
                                {statusBadge(r.status)}
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="text-muted">Không có robot phù hợp.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

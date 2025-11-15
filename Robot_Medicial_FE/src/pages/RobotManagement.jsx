import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRobots } from "@/services/robotService";

export default function RobotFleetCards() {
    const navigate = useNavigate();

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

    // Map trạng thái từ API sang badge status
    const statusMap = {
        transporting: "dangvanchuyen",
        awaiting_handover: "chobangiao",
        returning_to_station: "dangquayve",
        at_station: "taitram",
        completed: "sansang",
        charging: "sac",
        needs_attention: "chobangiao",
        offline: "khonghoatdong",
    };

    const [robots, setRobots] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");

    useEffect(() => {
        async function fetchRobots() {
            try {
                const data = await getAllRobots();
                const formatted = data.map((r) => ({
                    id: r.code,
                    name: r.name,
                    battery: r.batteryPercent ?? 0,
                    mission: r.progressOverallPct ?? 0,
                    status: statusMap[r.status] || "sansang",
                }));
                setRobots(formatted);
            } catch (err) {
                console.error("Lỗi khi load robots:", err);
            }
        }
        fetchRobots();
    }, []);

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
        switch (s) {
            case "chobangiao":
                return <span className="badge badge-warn badge-status">Chờ bàn giao</span>;
            case "dangvanchuyen":
                return <span className="badge badge-ready badge-status">Đang vận chuyển</span>;
            case "dangquayve":
                return <span className="badge badge-ready badge-status">Đang quay về</span>;
            case "taitram":
                return <span className="badge badge-warn badge-status">Tại trạm</span>;
            case "sac":
                return <span className="badge badge-warn badge-status">Đang sạc</span>;
            case "sansang":
                return <span className="badge badge-ready badge-status">Sẵn sàng</span>;
            case "khonghoatdong":
                return <span className="badge badge-stop badge-status">Không hoạt động</span>;
            default:
                return <span className="badge badge-ready badge-status">Trạng thái khác</span>;
        }
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
                            <option value="dangvanchuyen">Đang vận chuyển</option>
                            <option value="dangquayve">Đang quay về</option>
                            <option value="taitram">Tại trạm</option>
                            <option value="sac">Đang sạc</option>
                            <option value="sansang">Sẵn sàng</option>
                            <option value="khonghoatdong">Không hoạt động</option>
                        </select>
                        <button className="btn btn-teal"onClick={() => navigate(`/createRobot`)}>
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
                                </div>
                                <div className="progress-bar" style={{ width: `${r.mission}%` }}></div>
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

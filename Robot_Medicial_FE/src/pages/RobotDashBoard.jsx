import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRobots } from "@/services/robotService";

export default function RobotDashboard() {
    const navigate = useNavigate();
    const [period, setPeriod] = useState("day");
    const [robots, setRobots] = useState([]);

    // Map status API sang tiếng Việt
    const statusMap = {
        transporting: "Đang vận chuyển",
        awaiting_handover: "Chờ bàn giao",
        returning_to_station: "Trở về trạm",
        at_station: "Tại trạm",
        completed: "Hoàn thành",
        charging: "Đang sạc",
        needs_attention: "Cần hỗ trợ",
        manual_control: "Điều khiển thủ công",
        offline: "Ngoại tuyến"
    };

    // Gọi API lấy dữ liệu robot
    useEffect(() => {
        async function fetchRobots() {
            try {
                const data = await getAllRobots();
                const formatted = data.map(r => ({
                    id: r.code,
                    name: r.name,
                    dest: r.tasks?.[0]?.destination || "N/A",
                    progress: r.progressOverallPct,
                    status: statusMap[r.status] || r.status,
                }));
                setRobots(formatted);
            } catch (err) {
                console.error("Lỗi khi load robots:", err);
            }
        }
        fetchRobots();
    }, []);

    // Tính summary dựa trên dữ liệu API
    const summary = useMemo(() => ({
        total: robots.length,
        moving: robots.filter(r => r.status === "Đang vận chuyển").length,
        handover: robots.filter(r => r.status === "Chờ bàn giao").length,
        disinfect: robots.filter(r => r.status === "Khử khuẩn").length,
        assist: robots.filter(r => r.status === "Cần hỗ trợ").length,
        ready: robots.filter(r => r.status === "Hoàn thành").length,
    }), [robots]);

    const perf = useMemo(() => ({
        done: 0,
        errors: 0,
        avgTime: "N/A",
    }), [period]);

    useEffect(() => {
        const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"; document.head.appendChild(css);
        const icons = document.createElement("link"); icons.rel = "stylesheet"; icons.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css"; document.head.appendChild(icons);
        const font = document.createElement("link"); font.rel = "stylesheet"; font.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap"; document.head.appendChild(font);
        const js = document.createElement("script"); js.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"; js.defer = true; document.body.appendChild(js);
        return () => { document.head.removeChild(css); document.head.removeChild(icons); document.head.removeChild(font); document.body.removeChild(js); };
    }, []);

    const styles = (
        <style>{`
            :root{--teal:#4CE1C6;--ink:#0f172a}
            .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(1200px 600px at 15% 10%,rgba(76,225,198,.18),transparent 60%),radial-gradient(900px 500px at 90% 5%,rgba(76,225,198,.12),transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 20%,#e9f3f1 60%,#e8f0ee 100%);min-height:100vh}
            .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.85);box-shadow:0 16px 48px rgba(15,23,42,.08);border-radius:22px}
            .kpi{border-radius:18px}
            .kpi h2{font-weight:900}
            .title{font-weight:900;color:#0b1432}
            .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
            .btn-teal:hover{filter:brightness(1.05)}
            .chip{display:inline-block;padding:.25rem .6rem;border-radius:999px;background:rgba(20,226,193,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
            .badge-soft{background:rgba(20,226,193,.18);color:#0b3e3c;border:1px solid rgba(20,226,193,.35)}
            .table thead th{background:#e9f6f3}
        `}</style>
    );

    return (
        <div className="page">
            {styles}
            <div className="container-fluid py-3 py-lg-4">
                <div className="container-x">
                    {/* Current Status */}
                    <h5 className="fw-bold mb-3">Trạng Thái Hiện Tại</h5>
                    <div className="row g-4 mb-4">
                        {[
                            { label: 'Tổng số robot', value: robots.length, icon: 'robot' },
                            { label: statusMap.transporting, value: robots.filter(r => r.status === statusMap.transporting).length, icon: 'truck' },
                            { label: statusMap.awaiting_handover, value: robots.filter(r => r.status === statusMap.awaiting_handover).length, icon: 'hourglass-split' },
                            { label: statusMap.returning_to_station, value: robots.filter(r => r.status === statusMap.returning_to_station).length, icon: 'arrow-return-left' },
                            { label: statusMap.at_station, value: robots.filter(r => r.status === statusMap.at_station).length, icon: 'house' },
                            { label: statusMap.completed, value: robots.filter(r => r.status === statusMap.completed).length, icon: 'check2-circle' },
                            { label: statusMap.charging, value: robots.filter(r => r.status === statusMap.charging).length, icon: 'battery-half' },
                            { label: statusMap.needs_attention, value: robots.filter(r => r.status === statusMap.needs_attention).length, icon: 'exclamation-triangle' },
                            { label: statusMap.manual_control, value: robots.filter(r => r.status === statusMap.manual_control).length, icon: 'hand-index' },
                            { label: statusMap.offline, value: robots.filter(r => r.status === statusMap.offline).length, icon: 'slash-circle' }
                        ].map((k, i) => (
                            <div className="col-6 col-md-4 col-xl-2" key={i}>
                                <div className="glass p-3 kpi d-flex align-items-center gap-3" style={{ minWidth: '220px' }}>
                                    <span className="badge-soft rounded-3 p-2"><i className={`bi bi-${k.icon}`}></i></span>
                                    <div>
                                        <div className="small text-muted" >{k.label}</div>
                                        <h4 className="mb-0 fw-bold">{k.value}</h4>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Performance */}
                    <h5 className="fw-bold mb-3">Thống Kê Hiệu Suất</h5>
                    <div className="row g-3 mb-4">
                        <div className="col-md-4">
                            <div className="glass p-3 d-flex align-items-center gap-3">
                                <div className="badge-soft rounded-3 p-2"><i className="bi bi-trophy"></i></div>
                                <div>
                                    <div className="text-muted small">Nhiệm vụ hoàn thành</div>
                                    <h4 className="mb-0 fw-bold">{perf.done}</h4>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="glass p-3 d-flex align-items-center gap-3">
                                <div className="badge-soft rounded-3 p-2"><i className="bi bi-exclamation-triangle"></i></div>
                                <div>
                                    <div className="text-muted small">Lỗi phát sinh</div>
                                    <h4 className="mb-0 fw-bold">{perf.errors}</h4>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="glass p-3 d-flex align-items-center justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="badge-soft rounded-3 p-2"><i className="bi bi-stopwatch"></i></div>
                                    <div>
                                        <div className="text-muted small">TG vận chuyển TB</div>
                                        <h4 className="mb-0 fw-bold">{perf.avgTime}</h4>
                                    </div>
                                </div>
                                <div className="btn-group">
                                    <button className={`btn btn-outline-secondary btn-sm ${period === 'day' ? 'active' : ''}`} onClick={() => setPeriod('day')}>Hôm nay</button>
                                    <button className={`btn btn-outline-secondary btn-sm ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>Tháng này</button>
                                    <button className={`btn btn-outline-secondary btn-sm ${period === 'year' ? 'active' : ''}`} onClick={() => setPeriod('year')}>Năm nay</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Overview + Tasks */}
                    <div className="row g-3">
                        <div className="col-lg-7">
                            <div className="glass p-3 p-md-4">
                                <h6 className="title mb-3">Tổng Quan Trạng Thái</h6>
                                <div className="mb-3">
                                    <div className="small mb-1 text-muted">Chờ bàn giao ({summary.handover}/{summary.total})</div>
                                    <div className="progress" role="progressbar" aria-label="handover" aria-valuemin={0} aria-valuemax={summary.total}>
                                        <div className="progress-bar bg-warning" style={{ width: `${(summary.handover / summary.total) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <div className="small mb-1 text-muted">Tại trạm ({robots.filter(r => r.status === "Tại trạm").length}/{summary.total})</div>
                                    <div className="progress" role="progressbar" aria-label="dock" aria-valuemin={0} aria-valuemax={summary.total}>
                                        <div className="progress-bar" style={{ width: `${(robots.filter(r => r.status === "Tại trạm").length / summary.total) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="small mb-1 text-muted">Sẵn sàng ({summary.ready}/{summary.total})</div>
                                    <div className="progress" role="progressbar" aria-label="ready" aria-valuemin={0} aria-valuemax={summary.total}>
                                        <div className="progress-bar bg-secondary" style={{ width: `${(summary.ready / summary.total) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-5">
                            <div className="glass p-2 p-md-3">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <h6 className="title mb-0">Tiến Trình Nhiệm Vụ</h6>
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-teal btn-sm" onClick={() => navigate('/addtasks')}><i className="bi bi-plus-lg me-1" ></i> Thêm Nhiệm Vụ</button>
                                        <button className="btn btn-teal btn-sm" onClick={() => navigate('/history-mission')}> Lịch sử hoạt động</button>
                                    </div>
                                </div>
                                <div className="table-responsive">
                                    <table className="table align-middle mb-0">
                                        <thead>
                                            <tr>
                                                <th>Robot</th>
                                                <th>Đích đến</th>
                                                <th>Tiến độ</th>
                                                <th>Trạng thái</th>
                                                <th className="text-end"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {robots.map(r => (
                                                <tr key={r.id}>
                                                    <td className="fw-semibold">{r.name}</td>
                                                    <td>{r.dest}</td>
                                                    <td style={{ minWidth: 120 }}>
                                                        <div className="progress" role="progressbar" aria-label={`progress-${r.id}`} aria-valuemin={0} aria-valuemax={100}>
                                                            <div className="progress-bar" style={{ width: `${r.progress}%` }}></div>
                                                        </div>
                                                    </td>
                                                    <td><span className="badge bg-warning-subtle text-warning border">{r.status}</span></td>
                                                    <td className="text-end">
                                                        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/robot-tasks")}>Theo dõi</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

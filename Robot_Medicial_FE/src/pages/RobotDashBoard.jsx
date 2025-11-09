import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRobots } from "@/services/robotService";
import { getAllTasks } from "@/services/taskService";

export default function RobotDashboard() {
    const navigate = useNavigate();
    const [robots, setRobots] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const tasksPerPage = 10; // số hàng mỗi trang

    const statusMap = {
        transporting: "Đang vận chuyển",
        awaiting_handover: "Chờ bàn giao",
        returning_to_station: "Trở về trạm",
        at_station: "Tại trạm",
        completed: "Hoàn thành",
        charging: "Đang sạc",
        needs_attention: "Cần hỗ trợ",
        manual_control: "Điều khiển thủ công",
        offline: "Ngoại tuyến",
        pending: "Đang chờ",
        canceled: "Đã hủy",
        in_progress: "Đang tiến hành"
    };

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

    useEffect(() => {
        async function fetchTasks() {
            try {
                const data = await getAllTasks();
                const activeTasks = data.filter(
                    t => t.status !== "completed" && t.status !== "canceled"
                );
                const formatted = activeTasks.map(t => ({
                    id: t.id,
                    robotName: t.robotName,
                    assignedBy: t.assignedByUsername,
                    status: statusMap[t.status] || t.status,
                    createdAt: new Date(t.createdAt).toLocaleString("vi-VN"),
                    updatedAt: new Date(t.updatedAt).toLocaleString("vi-VN"),
                    totalErrors: t.totalErrors ?? 0,
                    totalDurationS: t.totalDurationS
                        ? `${Math.round(t.totalDurationS / 60)} phút`
                        : "—",
                    priority: t.priority === 1 ? "Cao" : "Thường",
                }));
                setTasks(formatted);
            } catch (err) {
                console.error("Lỗi khi load tasks:", err);
            }
        }
        fetchTasks();
    }, []);


    const totalPages = Math.max(1, Math.ceil(tasks.length / tasksPerPage));

    const displayedTasks = tasks.slice(
        (currentPage - 1) * tasksPerPage,
        currentPage * tasksPerPage
    );

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

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
            .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.85);box-shadow:0 16px 48px rgba(15,23,42,.08);border-radius:22px}
            .kpi{border-radius:18px}
            .title{font-weight:900;color:#0b1432}
            .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
            .btn-teal:hover{filter:brightness(1.05)}
            .badge-soft{background:rgba(20,226,193,.18);color:#0b3e3c;border:1px solid rgba(20,226,193,.35)}
            .table thead th{background:#e9f6f3}
            .task-table-wrapper { max-height: calc(100vh - 400px); overflow-y: auto; }
        `}</style>
    );

    return (
        <div className="page">
            {styles}
            <div className="container-fluid py-3 py-lg-4">
                <div className="container-x">
                    {/* --- Trạng Thái Hiện Tại --- */}
                    <h5 className="fw-bold mb-3">Trạng Thái Hiện Tại</h5>
                    <div className="row g-4 mb-4">
                        {[
                            { label: "Tổng số robot", value: robots.length, icon: "robot" },
                            { label: statusMap.transporting, value: robots.filter(r => r.status === statusMap.transporting).length, icon: "truck" },
                            { label: statusMap.awaiting_handover, value: robots.filter(r => r.status === statusMap.awaiting_handover).length, icon: "hourglass-split" },
                            { label: statusMap.returning_to_station, value: robots.filter(r => r.status === statusMap.returning_to_station).length, icon: "arrow-return-left" },
                            { label: statusMap.at_station, value: robots.filter(r => r.status === statusMap.at_station).length, icon: "house" },
                            { label: statusMap.completed, value: robots.filter(r => r.status === statusMap.completed).length, icon: "check2-circle" },
                            { label: statusMap.charging, value: robots.filter(r => r.status === statusMap.charging).length, icon: "battery-half" },
                            { label: statusMap.needs_attention, value: robots.filter(r => r.status === statusMap.needs_attention).length, icon: "exclamation-triangle" },
                            { label: statusMap.manual_control, value: robots.filter(r => r.status === statusMap.manual_control).length, icon: "hand-index" },
                            { label: statusMap.offline, value: robots.filter(r => r.status === statusMap.offline).length, icon: "slash-circle" },
                        ].map((k, i) => (
                            <div className="col-6 col-md-4 col-xl-2" key={i}>
                                <div className="glass p-3 kpi d-flex align-items-center gap-3" style={{ minWidth: "220px" }}>
                                    <span className="badge-soft rounded-3 p-2">
                                        <i className={`bi bi-${k.icon}`}></i>
                                    </span>
                                    <div>
                                        <div className="small text-muted">{k.label}</div>
                                        <h4 className="mb-0 fw-bold">{k.value}</h4>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* --- Tiến Trình Nhiệm Vụ --- */}
                    <div className="row g-3">
                        <div className="col-lg-12">
                            <div className="glass p-2 p-md-3">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <h6 className="title mb-0">Tiến Trình Nhiệm Vụ</h6>
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-teal btn-sm" onClick={() => navigate("/addtasks")}>
                                            <i className="bi bi-plus-lg me-1"></i> Thêm Nhiệm Vụ
                                        </button>
                                        <button className="btn btn-teal btn-sm" onClick={() => navigate("/history-mission")}>
                                            Lịch sử hoạt động
                                        </button>
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="table align-middle mb-0" style={{ minHeight: "600px" }}>
                                        <thead>
                                            <tr>
                                                <th>Tên robot</th>
                                                <th>Người giao</th>
                                                <th>Trạng thái</th>
                                                <th>Độ ưu tiên</th>
                                                <th>Lỗi</th>
                                                <th>Thời lượng</th>
                                                <th>Thời gian tạo</th>
                                                <th>Thời gian cập nhật</th>
                                                <th className="text-end"></th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ height: "600px" }}>
                                            {displayedTasks.length > 0 ? (
                                                <>
                                                    {displayedTasks.map((t) => (
                                                        <tr key={t.id}>
                                                            <td>{t.robotName}</td>
                                                            <td>{t.assignedBy}</td>
                                                            <td>
                                                                <span className="badge bg-warning-subtle text-warning border">
                                                                    {t.status}
                                                                </span>
                                                            </td>
                                                            <td>{t.priority}</td>
                                                            <td>{t.totalErrors}</td>
                                                            <td>{t.totalDurationS}</td>
                                                            <td>{t.createdAt}</td>
                                                            <td>{t.updatedAt}</td>
                                                            <td className="text-end">
                                                                <button
                                                                    className="btn btn-outline-secondary btn-sm"
                                                                    onClick={() => navigate(`/robot-tasks`)}
                                                                >
                                                                    Theo dõi
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}


                                                    {Array.from({ length: Math.max(0, 10 - displayedTasks.length) }).map(
                                                        (_, i) => (
                                                            <tr key={`empty-${i}`}>
                                                                <td colSpan="9" style={{ height: "48px" }}></td>
                                                            </tr>
                                                        )
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {/* Khi không có nhiệm vụ */}
                                                    {Array.from({ length: 10 }).map((_, i) => (
                                                        <tr key={`empty-${i}`}>
                                                            {i === 0 ? (
                                                                <td colSpan="9" className="text-center text-muted py-3">
                                                                    Không có nhiệm vụ nào đang hoạt động
                                                                </td>
                                                            ) : (
                                                                <td colSpan="9" style={{ height: "48px" }}></td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* ✅ Phân trang luôn hiển thị */}
                                <div className="d-flex justify-content-center mt-3">
                                    <nav>
                                        <ul className="pagination mb-0">
                                            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                                                <button
                                                    className="page-link"
                                                    onClick={() => handlePageChange(currentPage - 1)}
                                                >
                                                    «
                                                </button>
                                            </li>
                                            {[...Array(totalPages)].map((_, i) => (
                                                <li
                                                    key={i}
                                                    className={`page-item ${currentPage === i + 1 ? "active" : ""}`}
                                                >
                                                    <button
                                                        className="page-link"
                                                        onClick={() => handlePageChange(i + 1)}
                                                    >
                                                        {i + 1}
                                                    </button>
                                                </li>
                                            ))}
                                            <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                                                <button
                                                    className="page-link"
                                                    onClick={() => handlePageChange(currentPage + 1)}
                                                >
                                                    »
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

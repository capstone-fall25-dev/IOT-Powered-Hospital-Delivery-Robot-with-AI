import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRobots } from "@/services/robotService";
import { getAllTasks } from "@/services/taskService";
import styles from "@/assets/styles/robotDashboard.module.css";

export default function RobotTaskDashboard() {
    const navigate = useNavigate();
    const [robots, setRobots] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [tasksPerPage, setTasksPerPage] = useState(5);

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

    // -------------------------
    // LOAD ROBOTS
    // -------------------------
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

    // -------------------------
    // LOAD TASKS
    // -------------------------
    useEffect(() => {
        async function fetchTasks() {
            try {
                const data = await getAllTasks();

                // 👉 Không lọc theo status nữa, hiển thị tất cả
                const formatted = data.map(t => {
                    const patientCount = t.patients?.length || 0;
                    const firstPatient = t.patients?.[0]?.patientName || "—";
                    const medicineSummary = t.patients?.map(p => p.medicineSummary).join("; ") || "—";

                    return {
                        id: t.id,
                        robotName: t.robotName,
                        assignedBy: t.assignedBy,
                        status: statusMap[t.status] || t.status,
                        createdAt: new Date(t.createdAt).toLocaleString("vi-VN"),
                        scheduledStartAt: t.scheduledStartAt
                            ? new Date(t.scheduledStartAt).toLocaleString("vi-VN")
                            : "—",
                        scheduledStartAtRaw: t.scheduledStartAt,
                        totalStops: t.totalStops,
                        firstDestination: t.firstDestination || "—",
                        patientCount,
                        firstPatient,
                        medicineSummary,
                        priority:
                            t.priority === 2 ? "Khẩn cấp" :
                            t.priority === 1 ? "Cao" :
                            "Thường"
                    };
                });

                setTasks(formatted);
            } catch (err) {
                console.error("Lỗi khi load tasks:", err);
            }
        }
        fetchTasks();
    }, []);

    // -------------------------
    // PAGINATION
    // -------------------------
    const totalPages = Math.max(1, Math.ceil(tasks.length / tasksPerPage));

    const displayedTasks = tasks.slice(
        (currentPage - 1) * tasksPerPage,
        currentPage * tasksPerPage
    );

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    // Get status badge class
    const getStatusBadgeClass = (status) => {
        if (status === "Đang chờ") return styles.badgePending;
        if (status === "Đang tiến hành") return styles.badgeInProgress;
        if (status === "Hoàn thành") return styles.badgeCompleted;
        if (status === "Đã hủy") return styles.badgeCanceled;
        return styles.badgePending;
    };

    // Get priority badge class
    const getPriorityBadgeClass = (priority) => {
        if (priority === "Khẩn cấp") return styles.badgeEmergency;
        if (priority === "Cao") return styles.badgeHigh;
        return styles.badgeNormal;
    };

    // Get schedule time class
    const getScheduleClass = (scheduledStartAt) => {
        if (!scheduledStartAt || scheduledStartAt === "—") return "";
        
        const now = new Date();
        const start = new Date(scheduledStartAt);
        const diffMs = start - now;
        const diffMin = diffMs / 1000 / 60;

        if (diffMin <= 0) return styles.scheduleTimeOverdue;
        if (diffMin <= 1) return styles.scheduleTimeSoon;
        return styles.scheduleTimeUpcoming;
    };

    // KPI data
    const kpiData = [
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
    ];

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">

                {/* =================== TRẠNG THÁI HIỆN TẠI =================== */}
                <h5 className={styles.sectionTitle}>
                    <i className="bi bi-speedometer2 me-2" style={{ color: 'var(--teal-dark)' }}></i>
                    Trạng Thái Hiện Tại
                </h5>

                <div className="row g-3 mb-4">
                    {kpiData.map((k, i) => (
                        <div className="col-6 col-md-4 col-xl-2" key={i}>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiIcon}>
                                    <i className={`bi bi-${k.icon}`}></i>
                                </div>
                                <div>
                                    <div className={styles.kpiLabel}>{k.label}</div>
                                    <h4 className={styles.kpiValue}>{k.value}</h4>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* =================== BẢNG TIẾN TRÌNH NHIỆM VỤ =================== */}
                <div className={`${styles.glass} p-3 p-md-4`}>
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <h5 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                            <i className="bi bi-list-task me-2" style={{ color: 'var(--teal-dark)' }}></i>
                            Tiến Trình Nhiệm Vụ
                        </h5>

                       <div className="d-flex gap-2 flex-wrap align-items-center">

                        {/* DROPDOWN chọn số bản ghi */}
                        <select
                            className="form-select"
                            style={{
                                width: "150px",
                            }}
                            value={tasksPerPage}
                            onChange={(e) => {
                                setTasksPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            <option value={5}>5 / trang</option>
                            <option value={10}>10 / trang</option>
                            <option value={20}>20 / trang</option>
                            <option value={50}>50 / trang</option>
                        </select>

                        {/* BUTTONS */}
                        <button 
                            className={styles.btnTeal}
                            onClick={() => navigate("/addtasks")}
                        >
                            <i className="bi bi-plus-lg me-1"></i>
                            Thêm Nhiệm Vụ
                        </button>
                        <button 
                            className={styles.btnTeal}
                            onClick={() => navigate("/history-mission")}
                        >
                            <i className="bi bi-clock-history me-1"></i>
                            Lịch sử hoạt động
                        </button>

                    </div>
                    </div>

                    <div className="table-responsive">
                        <table className={`table ${styles.table} align-middle mb-0`}>
                            <thead>
                                <tr>
                                    <th>Nhiệm vụ</th>
                                    <th>Người giao</th>
                                    <th>Trạng thái</th>
                                    <th>Ngày tạo</th>
                                    <th className="text-end">Thao tác</th>
                                </tr>
                            </thead>

                            <tbody>
                                {displayedTasks.map(t => {
                                    const scheduleClass = getScheduleClass(t.scheduledStartAtRaw);
                                    
                                    return (
                                        <tr key={t.id}>
                                            <td>
                                                <div className={styles.taskTitle}>
                                                    #{t.id} — {t.robotName}
                                                </div>

                                                <div className={styles.taskInfo}>
                                                    <span className={scheduleClass}>
                                                        <i className="bi bi-clock me-1"></i>
                                                        Bắt đầu: {t.scheduledStartAt}
                                                    </span>
                                                </div>

                                                <div className={styles.taskInfo}>
                                                    <strong>Điểm dừng:</strong> {t.firstDestination}
                                                    {t.totalStops > 1 && <> (+{t.totalStops - 1})</>}
                                                </div>

                                                <div className={styles.taskInfo}>
                                                    <strong>Bệnh nhân:</strong> {t.firstPatient}
                                                    {t.patientCount > 1 && <> (và {t.patientCount - 1} bệnh nhân khác)</>}
                                                </div>

                                                <div className={styles.taskInfo}>
                                                    <strong>Ghi chú:</strong> {t.medicineSummary}
                                                </div>
                                            </td>

                                            <td className="fw-semibold">{t.assignedBy}</td>

                                            <td>
                                                <span className={getStatusBadgeClass(t.status)}>
                                                    {t.status}
                                                </span>
                                            </td>

                                            <td hidden>
                                                <span className={getPriorityBadgeClass(t.priority)}>
                                                    {t.priority}
                                                </span>
                                            </td>

                                            <td>{t.createdAt}</td>

                                            <td>
                                                <div className="d-flex gap-1 justify-content-end">
                                                    <button
                                                        className={styles.btnSecondary}
                                                        onClick={() => navigate(`/run-task/${t.id}`)}
                                                        title="Theo dõi"
                                                    >
                                                        <i className="bi bi-eye"></i>
                                                    </button>
                                                    <button
                                                        className={styles.btnView}
                                                        onClick={() => navigate(`/task-detail/${t.id}`)}
                                                        title="Xem thêm"
                                                    >
                                                        <i className="bi bi-info-circle"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}
                    <div className="d-flex justify-content-center mt-4">
                        <nav>
                            <ul className={`pagination ${styles.pagination} mb-0`}>
                                <li className={`${styles.pageItem} ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button 
                                        className={styles.pageLink}
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        <i className="bi bi-chevron-left"></i>
                                    </button>
                                </li>

                                {[...Array(totalPages)].map((_, i) => (
                                    <li 
                                        key={i} 
                                        className={`${styles.pageItem} ${currentPage === i + 1 ? 'active' : ''}`}
                                    >
                                        <button 
                                            className={styles.pageLink}
                                            onClick={() => handlePageChange(i + 1)}
                                        >
                                            {i + 1}
                                        </button>
                                    </li>
                                ))}

                                <li className={`${styles.pageItem} ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button 
                                        className={styles.pageLink}
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        <i className="bi bi-chevron-right"></i>
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>

            </div>
        </div>
    );
}
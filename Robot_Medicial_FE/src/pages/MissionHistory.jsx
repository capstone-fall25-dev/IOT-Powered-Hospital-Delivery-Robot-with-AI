import { useEffect, useMemo, useState } from "react";
import { fetchTaskHistory } from "../services/taskService";
import { useNavigate } from "react-router-dom";

export default function TaskHistoryPage() {
    const navigate = useNavigate();

    // =========================
    // THEME STYLES
    // =========================
    const styles = (
        <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(1200px 600px at 15% 10%,rgba(76,225,198,.18),transparent 60%),radial-gradient(900px 500px at 90% 5%,rgba(76,225,198,.12),transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 15%,#e9f3f1 35%,#e8f0ee 100%);min-height:100vh}
      .glass{background:rgba(255,255,255,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.7);box-shadow:0 10px 30px rgba(15,23,42,.08);border-radius:24px}
      .rounded-2xl{border-radius:28px}
      .btn-teal{background:var(--teal);color:#052a2b;font-weight:700;border:none}
      .btn-teal:hover{background:#39d7bf;color:#052a2b}
      .chip{display:inline-block;padding:.25rem .6rem;border-radius:999px;background:rgba(20,226,193,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
      .status-dot{width:10px;height:10px;border-radius:50%}
      .timeline{position:relative;padding-left:28px}
      .timeline::before{content:'';position:absolute;left:12px;top:0;bottom:0;width:2px;background:linear-gradient(180deg,rgba(76,225,198,.7),rgba(76,225,198,0))}
      .t-item{position:relative;margin-bottom:18px}
      .t-item::before{content:'';position:absolute;left:-18px;top:6px;width:12px;height:12px;border-radius:999px;background:var(--teal);box-shadow:0 0 0 4px rgba(76,225,198,.2)}
      .cursor-pointer{cursor:pointer}
      .badge-pill{border-radius:999px}
      .small-muted{font-size:0.8rem;color:#6b7280}
    `}</style>
    );

    // =========================
    // STATE
    // =========================
    const [rawData, setRawData] = useState([]);      // danh sách snapshot từ API
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Filters
    const [robot, setRobot] = useState("all");
    const [status, setStatus] = useState("all");
    const [q, setQ] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [view, setView] = useState("table");

    // Task đang expand để xem snapshot
    const [expandedTaskIds, setExpandedTaskIds] = useState({}); // { [taskId]: true/false }

    // =========================
    // HELPERS
    // =========================
    const toggleExpand = (taskId) => {
        setExpandedTaskIds(prev => ({
            ...prev,
            [taskId]: !prev[taskId]
        }));
    };

    const formatDuration = (totalSeconds) => {
        if (!totalSeconds || totalSeconds <= 0) return null;
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}ph ${secs}s`;
    };

    const formatDateTime = (value) => {
        if (!value) return "-";
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
    };

    const formatTime = (value) => {
        if (!value) return "-";
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return d.toLocaleTimeString("vi-VN", { timeStyle: "short" });
    };

    const StatusBadge = ({ s }) => {
        const map = {
            completed: "success",
            failed: "danger",
            canceled: "secondary",
            in_progress: "primary",
            awaiting_handover: "warning",
        };
        const textMap = {
            completed: "Hoàn thành",
            failed: "Thất bại",
            canceled: "Hủy",
            in_progress: "Đang chạy",
            awaiting_handover: "Chờ bàn giao",
        };

        const cls = map[s] || "secondary";
        return (
            <span className={`badge text-bg-${cls}`}>
                {textMap[s] || s || "Unknown"}
            </span>
        );
    };

    const StatusDot = ({ s }) => {
        const map = {
            completed: "#22c55e",
            in_progress: "#0ea5a5",
            failed: "#ef4444",
            canceled: "#94a3b8",
            awaiting_handover: "#eab308",
        };
        return <span className="status-dot me-2" style={{ background: map[s] || "#9ca3af" }} />;
    };

    const priorityClass = (p) => {
        if (p === "Urgent") return "bg-danger";
        if (p === "High") return "bg-warning text-dark";
        if (p === "Normal") return "bg-secondary";
        if (p === "Low") return "bg-light text-dark";
        return "bg-secondary";
    };

    // =========================
    // LOAD DATA
    // =========================
    const loadData = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await fetchTaskHistory({
                robotId: robot !== "all" ? robot : "",
                status: status !== "all" ? status : "",
                search: q,
                fromDate: fromDate || "",
                toDate: toDate || "",
                page: currentPage,
                pageSize: pageSize
            });

            setRawData(res.data || []);
            setTotalCount(res.totalCount || 0);
            setTotalPages(res.totalPages || 1);
        } catch (err) {
            console.error(err);
            setError("Không tải được lịch sử nhiệm vụ. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [robot, status, q, fromDate, toDate, currentPage, pageSize]);

    // =========================
    // DERIVED DATA
    // =========================

    // Danh sách robot (để filter)
    const robots = useMemo(() => {
        const setCodes = new Set();
        rawData.forEach(x => {
            if (x.robotCode) setCodes.add(x.robotCode);
        });
        return Array.from(setCodes);
    }, [rawData]);

    // Group snapshot theo taskId
    const groupedByTask = useMemo(() => {
        const map = {};
        rawData.forEach(h => {
            if (!map[h.taskId]) map[h.taskId] = [];
            map[h.taskId].push(h);
        });

        // sort snapshot mỗi task theo recordedAt tăng dần
        Object.keys(map).forEach(taskId => {
            map[taskId].sort((a, b) => {
                const ta = new Date(a.recordedAt).getTime();
                const tb = new Date(b.recordedAt).getTime();
                return ta - tb;
            });
        });

        return map;
    }, [rawData]);

    // Lấy snapshot mới nhất của mỗi task để hiển thị trong bảng / timeline
    const latestSnapshots = useMemo(() => {
        const arr = [];
        Object.keys(groupedByTask).forEach(taskId => {
            const snapshots = groupedByTask[taskId];
            if (snapshots.length > 0) {
                arr.push(snapshots[snapshots.length - 1]);
            }
        });

        // sort theo recordedAt mới nhất (task mới nhất lên đầu)
        arr.sort((a, b) => {
            const ta = new Date(b.recordedAt).getTime();
            const tb = new Date(a.recordedAt).getTime();
            return ta - tb;
        });

        return arr;
    }, [groupedByTask]);

    // Stats tổng quan (dùng latestSnapshots)
    const stats = useMemo(() => {
        const s = {
            totalTasks: latestSnapshots.length,
            completed: 0,
            failed: 0,
            inProgress: 0,
            canceled: 0,
            awaiting: 0
        };

        latestSnapshots.forEach(h => {
            switch (h.finalStatus) {
                case "completed": s.completed++; break;
                case "failed": s.failed++; break;
                case "in_progress": s.inProgress++; break;
                case "canceled": s.canceled++; break;
                case "awaiting_handover": s.awaiting++; break;
                default: break;
            }
        });

        return s;
    }, [latestSnapshots]);

    // =========================
    // RENDER
    // =========================

    const renderExpandedRow = (taskId) => {
        const snapshots = groupedByTask[taskId] || [];
        if (snapshots.length <= 1) return null;

        return (
            <tr>
                <td colSpan={10} className="bg-light">
                    <div className="px-3 py-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="fw-semibold">Timeline snapshots của Task #{taskId}</div>
                            <div className="small text-muted">
                                Tổng snapshot: {snapshots.length}
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-lg-7">
                                {/* snapshot list */}
                                <ol className="mb-0" style={{ paddingLeft: "1.2rem" }}>
                                    {snapshots.map((h, idx) => (
                                        <li key={h.id} className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <div>
                                                    <span className="small text-muted">
                                                        Snapshot #{idx + 1} • {formatTime(h.recordedAt)}
                                                    </span>
                                                    <div>
                                                        <StatusBadge s={h.finalStatus} />
                                                        <span className="ms-2 small-muted">
                                                            Delivered: {h.deliveredStops}/{h.totalStops}
                                                            {h.failedStops > 0 && (
                                                                <span className="text-danger ms-2">
                                                                    Failed: {h.failedStops}
                                                                </span>
                                                            )}
                                                            {h.skippedStops > 0 && (
                                                                <span className="text-warning ms-2">
                                                                    Skipped: {h.skippedStops}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            <div className="col-lg-5 mt-3 mt-lg-0">
                                {/* stops của snapshot mới nhất */}
                                {snapshots.length > 0 && (
                                    <>
                                        <div className="fw-semibold mb-2">
                                            Stops (snapshot mới nhất)
                                        </div>
                                        <ul className="list-unstyled mb-0">
                                            {snapshots[snapshots.length - 1].stops?.map(stop => (
                                                <li key={stop.seqNo} className="mb-1">
                                                    <span className="badge bg-light text-dark me-2">
                                                        #{stop.seqNo}
                                                    </span>
                                                    <span className="fw-semibold">{stop.destinationName}</span>
                                                    {stop.itemDesc && (
                                                        <span className="small-muted"> • {stop.itemDesc}</span>
                                                    )}
                                                    <span className="ms-2 badge badge-pill bg-secondary">
                                                        {stop.status}
                                                    </span>
                                                </li>
                                            ))}
                                            {(!snapshots[snapshots.length - 1].stops ||
                                                snapshots[snapshots.length - 1].stops.length === 0) && (
                                                <li className="small-muted">Không có thông tin điểm dừng</li>
                                            )}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="small text-muted">
                    Tổng {totalCount} snapshot • Trang {currentPage}/{totalPages}
                </div>
                <div className="btn-group">
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                        « Trước
                    </button>
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                        Sau »
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="page">
            {styles}

            <div className="container-lg py-4 py-lg-5">

                {/* Header */}
                <div className="d-flex justify-content-between flex-wrap mb-4">
                    <div>
                        <h2 className="fw-bold">Lịch sử nhiệm vụ robot</h2>
                        <div className="chip mt-2">
                            Tra cứu hành trình • Xem timeline theo Task • Lọc nâng cao
                        </div>
                    </div>
                     {/* STATS CARD */}
                    <div className="col-lg-4">
                         <div className="d-flex flex-column align-items-end gap-2">
                            <div>
                                <h5 className="fw-bold mb-3">Thống kê nhanh</h5>
                                <div className="small lh-lg">
                                    <div>Tổng task: <strong>{stats.total}</strong></div>
                                    <div className="text-success">Hoàn thành: {stats.completed}</div>
                                    <div className="text-primary">Đang chạy: {stats.in_progress}</div>
                                    <div className="text-danger">Lỗi: {stats.failed}</div>
                                    <div className="text-warning">Chờ bàn giao: {stats.awaiting}</div>
                                    <div className="text-muted">Đã hủy: {stats.canceled}</div>
                                </div>
                            </div>
                            <div className="mt-4 d-flex gap-2">
                                <button className={`btn flex-fill ${view === 'table' ? styles.btnTeal : styles.btnOutlineTeal}`} onClick={() => setView('table')}>
                                    <i className="bi bi-table me-1"></i> Bảng
                                </button>
                                <button className={`btn flex-fill ${view === 'timeline' ? styles.btnTeal : styles.btnOutlineTeal}`} onClick={() => setView('timeline')}>
                                    <i className="bi bi-clock-history me-1"></i> Timeline
                                </button>
                            </div>
                        </div>
                    </div>
                    
                </div>

                {/* Filters */}
                <div className="glass p-4 rounded-2xl mb-4">
                    <div className="row g-3">

                        {/* Robot */}
                        <div className="col-md-3">
                            <label className="form-label">Robot</label>
                            <select
                                className="form-select"
                                value={robot}
                                onChange={e => { setRobot(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="all">Tất cả</option>
                                {robots.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div className="col-md-3">
                            <label className="form-label">Trạng thái</label>
                            <select
                                className="form-select"
                                value={status}
                                onChange={e => { setStatus(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="all">Tất cả</option>
                                <option value="completed">Hoàn thành</option>
                                <option value="in_progress">Đang chạy</option>
                                <option value="awaiting_handover">Chờ bàn giao</option>
                                <option value="failed">Thất bại</option>
                                <option value="canceled">Hủy</option>
                            </select>
                        </div>

                        {/* Date filters */}
                        <div className="col-md-3">
                            <label className="form-label">Từ ngày</label>
                            <input
                                type="date"
                                className="form-control"
                                value={fromDate}
                                onChange={e => { setFromDate(e.target.value); setCurrentPage(1); }}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Đến ngày</label>
                            <input
                                type="date"
                                className="form-control"
                                value={toDate}
                                onChange={e => { setToDate(e.target.value); setCurrentPage(1); }}
                            />
                        </div>

                        {/* Search */}
                        <div className="col-md-9">
                            <label className="form-label">Tìm kiếm</label>
                            <input
                                className="form-control"
                                placeholder="Robot, người tạo, điểm đến…"
                                value={q}
                                onChange={e => { setQ(e.target.value); setCurrentPage(1); }}
                            />
                        </div>

                        {/* Page size */}
                        <div className="col-md-3">
                            <label className="form-label">Số snapshot / trang</label>
                            <select
                                className="form-select"
                                value={pageSize}
                                onChange={e => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                    </div>
                </div>

                {error && (
                    <div className="alert alert-danger">{error}</div>
                )}

                {loading && (
                    <div className="text-center py-5 text-muted">
                        Đang tải dữ liệu lịch sử nhiệm vụ…
                    </div>
                )}

                {!loading && view === "table" && (
                    <div className="glass p-0 rounded-2xl overflow-hidden">
                        <table className="table table-hover mb-0 align-middle">
                            <thead className="bg-white">
                                <tr>
                                    <th style={{ width: "40px" }}></th>
                                    <th style={{ width: "100px" }}>Task</th>
                                    <th style={{ width: "140px" }}>Robot</th>
                                    <th style={{ width: "150px" }}>Người tạo</th>
                                    <th style={{ width: "140px" }}>Bản đồ</th>
                                    <th style={{ width: "150px" }}>Tiến độ</th>
                                    <th style={{ width: "170px" }}>Thời gian</th>
                                    <th style={{ width: "80px" }}>Lỗi</th>
                                    <th className="text-end" style={{ width: "140px" }}>Trạng thái</th>
                                </tr>
                            </thead>

                            <tbody>
                                {latestSnapshots.map(h => (
                                    <>
                                        <tr key={h.taskId} className="cursor-pointer">
                                            <td
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleExpand(h.taskId);
                                                }}
                                            >
                                                <button
                                                    className="btn btn-sm btn-outline-secondary"
                                                    type="button"
                                                >
                                                    {expandedTaskIds[h.taskId] ? "−" : "+"}
                                                </button>
                                            </td>
                                            <td
                                                onClick={() => navigate(`/tasks/history/${h.id}`)}
                                            >
                                                <span className="badge bg-light text-dark border">
                                                    #{h.taskId}
                                                </span>
                                                <div className="small-muted">
                                                    {groupedByTask[h.taskId]?.length || 1} snapshot
                                                </div>
                                            </td>
                                            <td
                                                onClick={() => navigate(`/tasks/history/${h.id}`)}
                                            >
                                                <div className="fw-semibold">{h.robotCode}</div>
                                                <small className="text-muted">{h.robotName}</small>
                                            </td>
                                            <td
                                                onClick={() => navigate(`/tasks/history/${h.id}`)}
                                            >
                                                <div>{h.assignedByName}</div>
                                                <small className="text-muted">
                                                    {h.assignedByEmail}
                                                </small>
                                            </td>
                                            <td onClick={() => navigate(`/tasks/history/${h.id}`)}>
                                                <small className="text-muted">{h.mapName}</small>
                                            </td>
                                            <td onClick={() => navigate(`/tasks/history/${h.id}`)}>
                                                <div className="d-flex align-items-center gap-1">
                                                    <span className="fw-semibold text-success">
                                                        {h.deliveredStops}
                                                    </span>
                                                    <span className="text-muted">
                                                        / {h.totalStops}
                                                    </span>
                                                </div>
                                                {h.skippedStops > 0 && (
                                                    <small className="text-warning d-block">
                                                        Bỏ qua: {h.skippedStops}
                                                    </small>
                                                )}
                                                {h.failedStops > 0 && (
                                                    <small className="text-danger d-block">
                                                        Thất bại: {h.failedStops}
                                                    </small>
                                                )}
                                            </td>
                                            <td onClick={() => navigate(`/tasks/history/${h.id}`)}>
                                                <div>
                                                    <small className="text-muted">Bắt đầu:</small>
                                                    <div>
                                                        {formatDateTime(h.startedAt || h.createdAt)}
                                                    </div>
                                                </div>
                                                {h.completedAt && (
                                                    <div className="mt-1">
                                                        <small className="text-muted">
                                                            Hoàn thành:
                                                        </small>
                                                        <div>{formatDateTime(h.completedAt)}</div>
                                                    </div>
                                                )}
                                                {h.totalDurationS && (
                                                    <small className="text-info">
                                                        {formatDuration(h.totalDurationS)}
                                                    </small>
                                                )}
                                            </td>
                                            <td onClick={() => navigate(`/tasks/history/${h.id}`)}>
                                                {h.totalErrors > 0 ? (
                                                    <span className="badge bg-danger">
                                                        {h.totalErrors}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                            <td className="text-end">
                                                <StatusBadge s={h.finalStatus} />
                                                <div className="mt-1 small-muted">
                                                    Cập nhật: {formatTime(h.recordedAt)}
                                                </div>
                                            </td>
                                        </tr>

                                        {expandedTaskIds[h.taskId] && renderExpandedRow(h.taskId)}
                                    </>
                                ))}

                                {latestSnapshots.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="text-center py-4 text-muted">
                                            Không có dữ liệu
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div className="px-3 pb-3">
                            {renderPagination()}
                        </div>
                    </div>
                )}

             {!loading && view === "timeline" && (
                    <>
                        <div className="glass p-4 rounded-2xl timeline">
                            {latestSnapshots.map(h => {
                                const snapshots = groupedByTask[h.taskId] || [];
                                const isExpanded = expandedTaskIds[h.taskId];
                                
                                return (
                                    <div className="t-item" key={h.taskId}>
                                        {/* Header card */}
                                        <div className="card border-0 shadow-sm mb-3">
                                            <div className="card-body">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div className="d-flex align-items-start gap-2 flex-grow-1">
                                                        <StatusDot s={h.finalStatus} />
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                                <span className="fw-bold">Task #{h.taskId}</span>
                                                                <span className="badge bg-light text-dark border">
                                                                    {h.robotCode}
                                                                </span>
                                                                <span className={`badge ${priorityClass(h.priority)}`}>
                                                                    {h.priority}
                                                                </span>
                                                                {h.totalErrors > 0 && (
                                                                    <span className="badge bg-danger">
                                                                        {h.totalErrors} lỗi
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="small text-muted">
                                                                <i className="bi bi-geo-alt me-1"></i>
                                                                {h.mapName} • 
                                                                <i className="bi bi-person ms-2 me-1"></i>
                                                                {h.assignedByName}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="text-end">
                                                        <StatusBadge s={h.finalStatus} />
                                                        <div className="small text-muted mt-1">
                                                            {snapshots.length} snapshot
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="mb-2">
                                                    <div className="d-flex justify-content-between small mb-1">
                                                        <span className="text-muted">Tiến độ</span>
                                                        <span className="fw-semibold">
                                                            {h.deliveredStops}/{h.totalStops} điểm
                                                        </span>
                                                    </div>
                                                    <div className="progress" style={{ height: "8px" }}>
                                                        <div 
                                                            className="progress-bar bg-success" 
                                                            style={{ width: `${(h.deliveredStops / h.totalStops * 100) || 0}%` }}
                                                        ></div>
                                                        {h.failedStops > 0 && (
                                                            <div 
                                                                className="progress-bar bg-danger" 
                                                                style={{ width: `${(h.failedStops / h.totalStops * 100) || 0}%` }}
                                                            ></div>
                                                        )}
                                                        {h.skippedStops > 0 && (
                                                            <div 
                                                                className="progress-bar bg-warning" 
                                                                style={{ width: `${(h.skippedStops / h.totalStops * 100) || 0}%` }}
                                                            ></div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Time info */}
                                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                                                    <div className="small">
                                                        {h.startedAt && (
                                                            <span className="me-3">
                                                                <i className="bi bi-play-circle text-success me-1"></i>
                                                                {formatDateTime(h.startedAt)}
                                                            </span>
                                                        )}
                                                        {h.completedAt && (
                                                            <span className="me-3">
                                                                <i className="bi bi-check-circle text-primary me-1"></i>
                                                                {formatDateTime(h.completedAt)}
                                                            </span>
                                                        )}
                                                        {h.totalDurationS && (
                                                            <span className="badge bg-info">
                                                                <i className="bi bi-clock me-1"></i>
                                                                {formatDuration(h.totalDurationS)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="d-flex gap-2 justify-content-end">
                                                    {snapshots.length > 1 && (
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => toggleExpand(h.taskId)}
                                                        >
                                                            <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} me-1`}></i>
                                                            {isExpanded ? 'Thu gọn' : 'Xem timeline'}
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-sm btn-teal"
                                                        onClick={() => navigate(`/tasks/history/${h.id}`)}
                                                    >
                                                        <i className="bi bi-box-arrow-up-right me-1"></i>
                                                        Chi tiết
                                                    </button>
                                                </div>

                                                {/* Expanded snapshots timeline */}
                                                {isExpanded && snapshots.length > 1 && (
                                                    <div className="mt-3 pt-3 border-top">
                                                        <div className="fw-semibold mb-3">
                                                            <i className="bi bi-clock-history me-2"></i>
                                                            Timeline chi tiết ({snapshots.length} snapshots)
                                                        </div>
                                                        <div className="position-relative" style={{ paddingLeft: "32px" }}>
                                                            {/* Vertical line */}
                                                            <div 
                                                                style={{
                                                                    position: "absolute",
                                                                    left: "10px",
                                                                    top: "8px",
                                                                    bottom: "8px",
                                                                    width: "2px",
                                                                    background: "linear-gradient(180deg, var(--teal), rgba(76,225,198,0.3))"
                                                                }}
                                                            ></div>
                                                            
                                                            {snapshots.map((snap, idx) => (
                                                                <div 
                                                                    key={snap.id} 
                                                                    className="position-relative mb-3"
                                                                    style={{ paddingLeft: "8px" }}
                                                                >
                                                                    {/* Dot */}
                                                                    <div 
                                                                        style={{
                                                                            position: "absolute",
                                                                            left: "-22px",
                                                                            top: "4px",
                                                                            width: "12px",
                                                                            height: "12px",
                                                                            borderRadius: "50%",
                                                                            background: idx === snapshots.length - 1 ? "var(--teal)" : "#94a3b8",
                                                                            boxShadow: idx === snapshots.length - 1 ? "0 0 0 4px rgba(76,225,198,0.2)" : "none",
                                                                            border: "2px solid white"
                                                                        }}
                                                                    ></div>
                                                                    
                                                                    <div className="small">
                                                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                                                            <div>
                                                                                <span className="badge bg-light text-dark me-2">
                                                                                    #{idx + 1}
                                                                                </span>
                                                                                <span className="text-muted">
                                                                                    {formatDateTime(snap.recordedAt)}
                                                                                </span>
                                                                                {idx === snapshots.length - 1 && (
                                                                                    <span className="badge bg-primary ms-2">Mới nhất</span>
                                                                                )}
                                                                            </div>
                                                                            <StatusBadge s={snap.finalStatus} />
                                                                        </div>
                                                                        <div className="text-muted">
                                                                            Hoàn thành: {snap.deliveredStops}/{snap.totalStops}
                                                                            {snap.failedStops > 0 && (
                                                                                <span className="text-danger ms-2">
                                                                                    • Lỗi: {snap.failedStops}
                                                                                </span>
                                                                            )}
                                                                            {snap.skippedStops > 0 && (
                                                                                <span className="text-warning ms-2">
                                                                                    • Bỏ qua: {snap.skippedStops}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {latestSnapshots.length === 0 && (
                                <div className="text-center py-4 text-muted">
                                    Không có dữ liệu
                                </div>
                            )}
                        </div>
                        
                        <div className="px-3">
                            {renderPagination()}
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}

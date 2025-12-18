import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTaskById, updateStopStatus, cancelTask } from "@/services/taskService";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";
import styles from "@/assets/styles/taskDetail.module.css";

export default function TaskDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast, showToast } = useToast();

    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stopStatusEdit, setStopStatusEdit] = useState({});
    const [tick, setTick] = useState(0);

    // Modal hủy task
    const [cancelModal, setCancelModal] = useState({
        show: false,
        reason: "",
        loading: false,
    });

    // ============================================
    // FORMAT DATETIME
    // ============================================
    function formatVNDateTime(dateStr) {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (isNaN(d)) return "—";
        return d.toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function getScheduleClass(startTime) {
        if (!startTime) return "";
        
        // ❗ Nếu task bị hủy (canceled) hoặc thất bại (failed) → không hiển thị màu "Quá giờ"
        if (task?.status === "canceled" || task?.status === "failed") {
            return ""; // Không có class đặc biệt
        }
        
        const now = new Date();
        const start = new Date(startTime);
        const diffMin = (start - now) / 1000 / 60;
        const BUFFER_MINUTES = 10; // Buffer 10 phút như BE
        
        // Chỉ hiển thị "Quá giờ" sau khi đã qua thời gian bắt đầu + 10 phút (và task vẫn pending)
        if (diffMin <= -BUFFER_MINUTES && task?.status === "pending") {
            return styles.scheduleTimeOverdue;
        }
        // Trong khoảng 0 đến -10 phút: vẫn còn hiệu lực (chỉ khi pending)
        if (diffMin <= 0 && task?.status === "pending") return styles.scheduleTimeSoon;
        if (diffMin <= 1) return styles.scheduleTimeSoon;
        return styles.scheduleTimeUpcoming;
    }

    // ============================================
    // MAPPING TRẠNG THÁI
    // ============================================
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
        in_progress: "Đang tiến hành",
        delivered: "Đã giao",
        skipped: "Bỏ qua",
        failed: "Thất bại",
    };

    function getStatusText(status) {
        return statusMap[status] || "Không xác định";
    }

    function getStatusBadgeClass(status) {
        if (status === "pending") return styles.badgePending;
        if (status === "in_progress") return styles.badgeInProgress;
        if (status === "awaiting_handover") return styles.badgePending;
        if (status === "delivered") return styles.badgeCompleted;
        if (status === "skipped") return styles.badgePending;
        if (status === "failed") return styles.badgeCanceled;
        return styles.badgePending;
    }

    // ============================================
    // TÍNH THỜI GIAN ĐẾM NGƯỢC
    // ============================================
    function getCountdownInfo() {
        if (!task?.scheduledStartAt) {
            return { text: "—", className: "", note: null };
        }

        const now = new Date();
        const scheduled = new Date(task.scheduledStartAt);
        const BUFFER_MINUTES = 10; // Buffer 10 phút như BE

        // ❗ Nếu task đã hoàn thành (completed) → hiển thị "Đã hoàn thành" với note nếu hoàn thành sớm
        if (task.status === "completed") {
            let note = null;
            // Kiểm tra nếu hoàn thành sớm (dựa trên thời điểm bắt đầu so với scheduledStartAt)
            if (task.startedAt && scheduled) {
                const started = new Date(task.startedAt);
                const diffMs = scheduled.getTime() - started.getTime();
                if (diffMs > 1000) { // Hoàn thành sớm > 1 giây (dựa trên thời điểm khởi động sớm)
                    const diffMin = Math.floor(diffMs / 60000);
                    const diffSec = Math.floor((diffMs % 60000) / 1000);
                    note = diffMin >= 1
                        ? `Hoàn thành sớm ${diffMin} phút ${diffSec} giây trước giờ dự kiến`
                        : `Hoàn thành sớm ${diffSec} giây trước giờ dự kiến`;
                }
            }
            return { text: "Đã hoàn thành", className: styles.countdownStarted || "", note: note };
        }

        // ❗ Nếu task thất bại (failed) → không hiển thị thời gian đếm ngược
        if (task.status === "failed") {
            return { text: null, className: "", note: null };
        }

        // ❗ Nếu task bị hủy (canceled) → kiểm tra xem có phải do quá giờ không
        if (task.status === "canceled") {
            // Nếu hủy TRƯỚC scheduledStartAt → hủy có chủ đích, không hiển thị "Quá giờ"
            if (now < scheduled) {
                return { text: null, className: "", note: null };
            }
            // Nếu hủy SAU scheduledStartAt + 10 phút → hủy do quá giờ, hiển thị "Quá giờ"
            const diffMs = scheduled.getTime() - now.getTime();
            const overdueMin = Math.floor(Math.abs(diffMs) / 60000);
            if (overdueMin >= BUFFER_MINUTES) {
                return { text: "Quá giờ", className: styles.countdownOverdue || "", note: null };
            }
            // Nếu hủy trong khoảng 0-10 phút sau scheduledStartAt → không hiển thị
            return { text: null, className: "", note: null };
        }

        // ❗ Nếu task ĐANG CHẠY (in_progress hoặc awaiting_handover) → hiển thị "Đang chạy" với note nếu chạy sớm
        if (task.status === "in_progress" || task.status === "awaiting_handover") {
            let note = null;
            // Kiểm tra nếu chạy sớm (có startedAt)
            if (task.startedAt && scheduled) {
                const started = new Date(task.startedAt);
                const diffMs = scheduled.getTime() - started.getTime();
                if (diffMs > 1000) { // Chạy sớm > 1 giây
                    const diffMin = Math.floor(diffMs / 60000);
                    const diffSec = Math.floor((diffMs % 60000) / 1000);
                    note = diffMin >= 1
                        ? `Khởi động sớm ${diffMin} phút ${diffSec} giây trước giờ dự kiến`
                        : `Khởi động sớm ${diffSec} giây trước giờ dự kiến`;
                }
            }
            return { text: "Đang chạy", className: styles.countdownStarted || "", note: note };
        }

        // Chưa chạy → đếm ngược bình thường
        const diffMs = scheduled.getTime() - now.getTime();

        // Nếu đã qua thời gian bắt đầu
        if (diffMs < 0) {
            const overdueMs = Math.abs(diffMs); // Số ms đã qua
            const overdueMin = Math.floor(overdueMs / 60000);
            const overdueSec = Math.floor((overdueMs % 60000) / 1000);
            const remainingMin = BUFFER_MINUTES - overdueMin; // Số phút còn lại trong buffer

            // Nếu đã qua hơn 10 phút → quá giờ (chỉ hiển thị nếu task vẫn còn pending)
            if (overdueMin >= BUFFER_MINUTES && task.status === "pending") {
                return { text: "Quá giờ", className: styles.countdownOverdue || "", note: null };
            }

            // Trong khoảng 0 đến 10 phút: vẫn còn hiệu lực, hiển thị số phút đã qua
            if (task.status === "pending") {
                return { 
                    text: `-${overdueMin}p ${overdueSec}s`, 
                    className: styles.countdownSoon || "", 
                    note: `Còn ${remainingMin} phút` 
                };
            }
        }

        const diffMin = Math.floor(diffMs / 60000);
        const diffSec = Math.floor((diffMs % 60000) / 1000);

        if (diffMin === 0)
            return { text: `${diffSec}s`, className: styles.countdownSoon || "", note: null };
        if (diffMin < 60)
            return { text: `${diffMin}p ${diffSec}s`, className: styles.countdownNormal || "", note: null };

        const hours = Math.floor(diffMin / 60);
        const mins = diffMin % 60;
        return { text: `${hours}h ${mins}p`, className: styles.countdownFar || "", note: null };
    }

    // ============================================
    // KẾT NỐI SIGNALR REALTIME
    // ============================================
    useEffect(() => {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_CONFIG.API_BASE1}/hubs/task`, {
                skipNegotiation: true,
                transport: signalR.HttpTransportType.WebSockets,
            })
            .withAutomaticReconnect()
            .build();

        const refresh = async () => {
            try {
                const data = await getTaskById(id);
                setTask(data);
                const mapped = {};
                data.stops?.forEach((s) => {
                    mapped[s.seqNo] = s.assignmentStatus;
                });
                setStopStatusEdit(mapped);
            } catch (err) {
                console.error("Error refreshing task:", err);
            }
        };

        // Lắng nghe các sự kiện từ SignalR
        connection.on("ConnectedToTaskHub", (data) => {
            console.log("✅ TaskHub:", data.message);
        });
        connection.on("TaskUpdated", (data) => {
            if (data.id === parseInt(id)) {
                refresh();
            }
        });
        connection.on("TaskStarted", (data) => {
            if (data.id === parseInt(id)) {
                showToast("success", "Nhiệm vụ đã được kích hoạt!");
                refresh();
            }
        });
        connection.on("TaskCanceled", (data) => {
            if (data.taskId === parseInt(id)) {
                showToast("error", `Nhiệm vụ bị hủy!\nLý do: ${data.reason}`, 6000);
                refresh();
            }
        });

        // Kết nối SignalR
        connection
            .start()
            .then(() => console.log("SignalR TaskHub connected!"))
            .catch((err) => console.error("SignalR Error:", err));

        // Cleanup khi component unmount
        return () => connection.stop();
    }, [id]);

    // ============================================
    // BỘ ĐẾM THỜI GIAN THỰC
    // ============================================
    useEffect(() => {
        const interval = setInterval(() => {
            setTick((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // ============================================
    // LOAD TASK DETAIL
    // ============================================
    useEffect(() => {
        async function load() {
            try {
                const data = await getTaskById(id);
                setTask(data);

                // Map trạng thái stop vào state để binding select
                const mapped = {};
                data.stops?.forEach((s) => {
                    mapped[s.seqNo] = s.assignmentStatus;
                });
                setStopStatusEdit(mapped);

                setLoading(false);
            } catch (err) {
                console.error(err);
                showToast("error", err.message);
                setLoading(false);
            }
        }

        load();
    }, [id]);

    // ============================================
    // RULE: LOCK STOP
    // ============================================
    function isStopLocked(status) {
        return status === "delivered";
    }

    // ============================================
    // UPDATE STOP STATUS
    // ============================================
    const handleUpdateStop = async (stop) => {
        const newStatus = stopStatusEdit[stop.seqNo];
        if (!newStatus) {
            showToast("warning", "Vui lòng chọn trạng thái!");
            return;
        }

        const sid = stop.stopId;
        if (!sid) {
            console.error("Stop ID không tồn tại", stop);
            showToast("error", "Không tìm thấy StopId!");
            return;
        }

        try {
            await updateStopStatus(id, sid, newStatus);

            // Load lại task
            const fresh = await getTaskById(id);
            setTask(fresh);

            showToast("success", "Cập nhật trạng thái điểm dừng thành công!");
        } catch (err) {
            console.error(err);
            showToast("error", err.message);
        }
    };

    // ============================================
    // HỦY TASK
    // ============================================
    const handleCancelTask = async () => {
        if (!cancelModal.reason.trim()) {
            showToast("warning", "Vui lòng nhập lý do hủy nhiệm vụ.");
            return;
        }

        setCancelModal((prev) => ({ ...prev, loading: true }));

        try {
            await cancelTask(id, cancelModal.reason.trim());

            // Load lại task để cập nhật status
            const fresh = await getTaskById(id);
            setTask(fresh);

            // Đóng modal
            setCancelModal({ show: false, reason: "", loading: false });

            showToast("success", "Đã hủy nhiệm vụ thành công!");
        } catch (err) {
            console.error("Error cancel task:", err);
            showToast("error", err.message);
            setCancelModal((prev) => ({ ...prev, loading: false }));
        }
    };

    // ============================================
    // RENDER UI
    // ============================================
    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingContainer}>
                    <div className="spinner-border text-primary"></div>
                    <p className={styles.loadingText}>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className={styles.page}>
                <div className="container-xl py-4">
                    <div className={styles.emptyState}>
                        <i className="bi bi-exclamation-triangle fs-1"></i>
                        <p>Không tìm thấy nhiệm vụ</p>
                    </div>
                </div>
            </div>
        );
    }

    const countdownInfo = getCountdownInfo();

    return (
        <>
            <Toast toast={toast} showToast={showToast} />
            <div className={styles.page}>
                <div className="container-xl py-4">
                    {/* BREADCRUMB */}
                    <nav aria-label="breadcrumb" className="mb-4">
                        <ol className={`breadcrumb ${styles.breadcrumb}`}>
                            <li className={styles.breadcrumbItem}>
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate("/dashboard");
                                    }}
                                    className={styles.breadcrumbLink}
                                >
                                    Nhiệm vụ -
                                </a>
                            </li>
                            <li className={`${styles.breadcrumbItem} ${styles.breadcrumbActive}`}>
                                - Chi tiết #{task.id}
                            </li>
                        </ol>
                    </nav>

                    {/* HEADER */}
                    <div className={`${styles.glass} p-4 p-md-5 mb-4`}>
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                            <div>
                                <h1 className={styles.pageTitle}>Nhiệm vụ #{task.id}</h1>
                                <p className={styles.subtitle}>
                                    Robot: <strong>{task.robotName}</strong>
                                </p>
                                <span className={getStatusBadgeClass(task.status)}>
                                    {getStatusText(task.status).toUpperCase()}
                                </span>
                            </div>

                            <div className="d-flex gap-2 flex-wrap">
                                <button
                                    className={styles.btnEdit}
                                    onClick={() => navigate(`/task-edit/${task.id}`)}
                                >
                                    <i className="bi bi-pencil me-1"></i>Sửa
                                </button>

                                {/* Nút bắt đầu task - chỉ hiển thị khi task ở trạng thái pending */}
                                {/* Chuyển sang trang RunTask để xử lý start task */}
                                {task.status === "pending" && (
                                    <button
                                        className="btn btn-success"
                                        onClick={() => navigate(`/run-task/${task.id}`)}
                                        style={{ borderRadius: "5px" }}
                                    >
                                        <i className="bi bi-play-circle me-1"></i>Bắt đầu nhiệm vụ
                                    </button>
                                )}

                                {/* Nút hủy task - chỉ hiển thị khi task chưa bắt đầu (pending) */}
                                {task.status === "pending" && (
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => setCancelModal({ show: true, reason: "", loading: false })}
                                        style={{ borderRadius: "5px" }}
                                    >
                                        <i className="bi bi-x-circle me-1"></i>Hủy nhiệm vụ
                                    </button>
                                )}

                                <button
                                    className={styles.btnBack}
                                    onClick={() => navigate("/dashboard")}
                                >
                                    <i className="bi bi-arrow-left me-1"></i>Quay lại
                                </button>

                                {/* Hidden theo yêu cầu */}
                                <button hidden className={styles.btnComplete}>
                                    Hoàn thành
                                </button>
                            </div>
                        </div>

                        {/* TASK INFO */}
                        <div className={styles.infoSection}>
                            <div className="row g-4">
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <div className={styles.infoLabel}>Người giao</div>
                                        <div className={styles.infoValue}>
                                            <strong>{task.assignedByFullName}</strong><br />
                                            <small className="text-muted">{task.assignedByEmail}</small>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div className={styles.infoLabel}>Ngày tạo</div>
                                        <div className={styles.infoValue}>
                                            {formatVNDateTime(task.createdAt)}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <div className="d-flex align-items-start gap-3 flex-wrap">
                                            <div style={{ flex: "1", minWidth: "200px" }}>
                                                <div className={styles.infoLabel}>Bắt đầu lúc</div>
                                                <span className={`${styles.scheduleTime} ${getScheduleClass(task.scheduledStartAt)}`}>
                                                    {formatVNDateTime(task.scheduledStartAt)}
                                                </span>
                                            </div>
                                            {countdownInfo.text && countdownInfo.text !== "—" && (
                                                <div style={{ flex: "1", minWidth: "200px" }}>
                                                    <div className={styles.infoLabel}>Đếm ngược</div>
                                                    {countdownInfo.note ? (
                                                        <div className="d-inline-block">
                                                            <span className={countdownInfo.className}>
                                                                {countdownInfo.text}
                                                            </span>
                                                            <div className="tooltip" style={{ position: "relative", display: "inline-block" }}>
                                                                <i className="bi bi-info-circle ms-1 text-muted" style={{ cursor: "help" }}></i>
                                                                <div className="tooltip-text" style={{
                                                                    visibility: "hidden",
                                                                    position: "absolute",
                                                                    bottom: "100%",
                                                                    left: "50%",
                                                                    transform: "translateX(-50%)",
                                                                    backgroundColor: "#333",
                                                                    color: "#fff",
                                                                    padding: "5px 10px",
                                                                    borderRadius: "4px",
                                                                    fontSize: "0.85rem",
                                                                    whiteSpace: "nowrap",
                                                                    zIndex: 1000
                                                                }}>
                                                                    {countdownInfo.note}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className={countdownInfo.className}>
                                                            {countdownInfo.text}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div className={styles.infoLabel}>Bản đồ</div>
                                        <div className={`${styles.infoValue} text-primary`}>
                                            {task.nameMapFE || task.mapName}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ===================== STOP LIST ===================== */}
                    <div className={`${styles.glass} p-4 p-md-5`}>
                        <h2 className={styles.sectionTitle}>
                            <i className="bi bi-geo-alt-fill"></i>
                            Danh sách điểm dừng
                        </h2>

                        {(!task.stops || task.stops.length === 0) ? (
                            <div className={styles.emptyState}>
                                <i className="bi bi-inbox fs-1"></i>
                                Chưa có điểm dừng nào
                            </div>
                        ) : (
                            task.stops.map((s) => {
                                const locked = isStopLocked(s.assignmentStatus);

                                return (
                                    <div key={s.seqNo} className={styles.stopCard}>
                                        <div className={styles.stopHeader}>
                                            <div className={styles.stopNumber}>{s.seqNo}</div>
                                            <div className={styles.stopTitle}>Điểm dừng #{s.seqNo}</div>
                                            <span className={getStatusBadgeClass(s.assignmentStatus)}>
                                                {getStatusText(s.assignmentStatus).toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <div className={styles.infoLabel}>Điểm đến</div>
                                                <div className={styles.infoValue}>{s.destinationName}</div>
                                            </div>

                                            <div className="col-md-6">
                                                <div className={styles.infoLabel}>Bệnh nhân</div>
                                                <div className={styles.infoValue}>
                                                    <strong>{s.patientName}</strong><br />
                                                    <small className="text-muted">Mã: {s.patientCode}</small>
                                                </div>
                                            </div>

                                            {/* ===================== UPDATE STOP STATUS hidden ===================== */}
                                            <div className="col-md-12 mt-3" hidden>
                                                <label className={styles.infoLabel}>Cập nhật trạng thái</label>
                                                <div className="d-flex align-items-center gap-2 mt-2">
                                                    <select
                                                        className="form-select"
                                                        style={{ maxWidth: "260px" }}
                                                        disabled={locked}
                                                        value={stopStatusEdit[s.seqNo] || ""}
                                                        onChange={(e) =>
                                                            setStopStatusEdit({
                                                                ...stopStatusEdit,
                                                                [s.seqNo]: e.target.value,
                                                            })
                                                        }
                                                    >
                                                        <option value="">-- Chọn trạng thái --</option>
                                                        <option value="pending">Chờ xử lý</option>
                                                        <option value="in_progress">Đang xử lý</option>
                                                        <option value="awaiting_handover">Chờ bàn giao</option>
                                                        <option value="delivered">Đã giao</option>
                                                        <option value="skipped">Bỏ qua</option>
                                                        <option value="failed">Thất bại</option>
                                                    </select>
                                                    <button
                                                        className="btn btn-primary"
                                                        disabled={locked}
                                                        onClick={() => handleUpdateStop(s)}
                                                    >
                                                        Cập nhật
                                                    </button>
                                                </div>
                                            </div>

                                            {s.itemDesc && (
                                                <div className="col-md-6">
                                                    <div className={styles.infoLabel}>Ghi chú hàng hóa</div>
                                                    <div className={styles.infoValue}>{s.itemDesc}</div>
                                                </div>
                                            )}

                                            {s.customName && (
                                                <div className="col-md-6">
                                                    <div className={styles.infoLabel}>Mã đơn thuốc</div>
                                                    <div className={styles.infoValue}>{s.customName || "—"}</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* ===================== PRESCRIPTION hidden - Giữ lại để sau này sử dụng ===================== */}
                                        {s.prescription && s.prescription.items && (
                                            <div className={styles.prescriptionBox} hidden>
                                                <h6 className={styles.prescriptionTitle}>
                                                    <i className="bi bi-file-medical-fill"></i>
                                                    Đơn thuốc: {s.prescription.prescriptionCode}
                                                </h6>
                                                {s.prescription.items.map((it, idx) => (
                                                    <div key={idx} className={styles.prescriptionItem}>
                                                        <div className={styles.medicineName}>{it.medicineName}</div>
                                                        <div className={styles.medicineInfo}>
                                                            <strong>Số lượng:</strong> {it.quantity} •{" "}
                                                            <strong>Liều dùng:</strong> {it.dosage}
                                                        </div>
                                                        <div className={styles.medicineInfo}>
                                                            <strong>Hướng dẫn:</strong> {it.instructions}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* MODAL XÁC NHẬN HỦY TASK */}
                    {cancelModal.show && (
                        <div
                            className="modal fade show"
                            style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
                            tabIndex="-1"
                        >
                            <div className="modal-dialog modal-dialog-centered">
                                <div className="modal-content">
                                    <div className="modal-header bg-danger text-white">
                                        <h5 className="modal-title">
                                            <i className="bi bi-exclamation-triangle me-2"></i>
                                            Xác nhận hủy nhiệm vụ #{task.id}
                                        </h5>
                                        <button
                                            type="button"
                                            className="btn-close btn-close-white"
                                            onClick={() => setCancelModal({ show: false, reason: "", loading: false })}
                                            disabled={cancelModal.loading}
                                        ></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="alert alert-warning">
                                            <i className="bi bi-info-circle me-2"></i>
                                            <strong>Lưu ý:</strong> Khi hủy nhiệm vụ, tất cả các ngăn chứa sẽ được giải phóng và robot sẽ về trạm. 
                                            Nhiệm vụ sẽ được lưu với trạng thái "canceled".
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                <strong>Lý do hủy <span className="text-danger">*</span></strong>
                                            </label>

                                            {/* Gợi ý lý do hủy */}
                                            <div className="mb-2">
                                                <small className="text-muted d-block mb-2">
                                                    <i className="bi bi-lightbulb me-1"></i>
                                                    Gợi ý lý do hủy (click để chọn):
                                                </small>
                                                <div className="d-flex flex-wrap gap-2">
                                                    {[
                                                        "Robot gặp sự cố kỹ thuật",
                                                        "Bệnh nhân đã xuất viện",
                                                        "Thay đổi kế hoạch điều trị",
                                                        "Robot cần bảo trì",
                                                        "Hủy theo yêu cầu bác sĩ",
                                                        "Lỗi hệ thống",
                                                        "Khẩn cấp khác",
                                                    ].map((suggestion, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary"
                                                            onClick={() =>
                                                                setCancelModal((prev) => ({ ...prev, reason: suggestion }))
                                                            }
                                                            disabled={cancelModal.loading}
                                                            style={{ fontSize: "0.85rem", borderRadius: "20px" }}
                                                        >
                                                            <i className="bi bi-plus-circle me-1"></i>
                                                            {suggestion}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <textarea
                                                className="form-control"
                                                rows="3"
                                                placeholder="Nhập lý do hủy nhiệm vụ hoặc chọn từ gợi ý bên trên..."
                                                value={cancelModal.reason}
                                                onChange={(e) =>
                                                    setCancelModal((prev) => ({ ...prev, reason: e.target.value }))
                                                }
                                                disabled={cancelModal.loading}
                                            />
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => setCancelModal({ show: false, reason: "", loading: false })}
                                            disabled={cancelModal.loading}
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger"
                                            onClick={handleCancelTask}
                                            disabled={cancelModal.loading || !cancelModal.reason.trim()}
                                        >
                                            {cancelModal.loading ? (
                                                <>
                                                    <span
                                                        className="spinner-border spinner-border-sm me-2"
                                                        role="status"
                                                    ></span>
                                                    Đang xử lý...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-x-circle me-2"></i>
                                                    Xác nhận hủy
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

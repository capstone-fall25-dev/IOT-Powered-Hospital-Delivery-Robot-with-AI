import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTaskById, updateTask } from "@/services/taskService";
import styles from "@/assets/styles/taskDetail.module.css";

export default function TaskDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);

    // Local state để lưu trạng thái stop muốn update
    const [stopStatusEdit, setStopStatusEdit] = useState({});

    // ===========================
    // FORMATTERS
    // ===========================
    function formatVNDateTime(dateStr) {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (isNaN(d)) return "—";
        return d.toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function getScheduleClass(startTime) {
        if (!startTime) return "";
        const now = new Date();
        const start = new Date(startTime);
        const diffMin = (start - now) / 1000 / 60;

        if (diffMin <= 0) return styles.scheduleTimeOverdue;
        if (diffMin <= 1) return styles.scheduleTimeSoon;
        return styles.scheduleTimeUpcoming;
    }

    function getStatusBadgeClass(status) {
        if (status === "pending") return styles.badgePending;
        if (status === "in_progress") return styles.badgeInProgress;
        if (status === "completed") return styles.badgeCompleted;
        if (status === "canceled") return styles.badgeCanceled;
        if (status === "delivered") return styles.badgeCompleted;
        if (status === "failed") return styles.badgeCanceled;
        if (status === "skipped") return styles.badgePending;
        return styles.badgePending;
    }

    function getPriorityBadgeClass(priority) {
        if (priority === 1) return styles.badgeLow;
        if (priority === 2) return styles.badgeMedium;
        return styles.badgeHigh;
    }

    function getPriorityText(priority) {
        if (priority === 1) return "Thấp";
        if (priority === 2) return "Trung bình";
        return "Cao";
    }

    // ===========================
    // LOAD DATA
    // ===========================
    useEffect(() => {
        async function load() {
            try {
                const data = await getTaskById(id);
                setTask(data);
                setLoading(false);
            } catch (e) {
                console.error("Lỗi load detail:", e);
                setLoading(false);
            }
        }
        load();
    }, [id]);

    // ===========================
    // UPDATE STOP STATUS
    // ===========================
    const handleUpdateStop = async (stop) => {
        const newStatus = stopStatusEdit[stop.seqNo];
        if (!newStatus) return alert("Chưa chọn trạng thái!");

        const payload = {
            stops: [
                {
                    stopId: stop.stopId ?? stop.id ?? stop._id, // fallback
                    status: newStatus
                }
            ]
        };

        try {
            const updated = await updateTask(id, payload);
            setTask(updated);

            // Auto refresh
            const fresh = await getTaskById(id);
            setTask(fresh);
            alert("Cập nhật điểm dừng thành công!");
        } catch (err) {
            console.error(err);
            alert("Lỗi cập nhật điểm dừng");
        }
    };

    // ===========================
    // COMPLETE TASK
    // ===========================
    const handleCompleteTask = async () => {
        if (!window.confirm("Xác nhận hoàn thành nhiệm vụ?")) return;

        const payload = {
            status: "completed"
        };

        try {
            const updated = await updateTask(id, payload);
            setTask(updated);

            const fresh = await getTaskById(id);
            setTask(fresh);

            alert("Nhiệm vụ đã hoàn thành!");
        } catch (err) {
            console.error(err);
            alert("Lỗi hoàn thành nhiệm vụ");
        }
    };

    // ===========================
    // UI
    // ===========================
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
                        <i className="bi bi-exclamation-triangle" style={{ fontSize: '3rem' }}></i>
                        <p>Không tìm thấy nhiệm vụ</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">

                {/* =================== BREADCRUMB =================== */}
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

                {/* =================== TASK HEADER =================== */}
                <div className={`${styles.glass} p-4 p-md-5 mb-4`}>
                    <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-3">
                        <div>
                            <h1 className={styles.pageTitle}>Nhiệm vụ #{task.id}</h1>
                            <p className={styles.subtitle}>
                                Robot: <strong>{task.robotName}</strong>
                            </p>
                            <span className={getStatusBadgeClass(task.status)}>
                                {task.status.toUpperCase()}
                            </span>
                        </div>

                        <div className="d-flex gap-2 flex-wrap">
                            <button
                                className={styles.btnEdit}
                                onClick={() => navigate(`/task-edit/${task.id}`)}
                            >
                                <i className="bi bi-pencil me-1"></i>
                                Sửa
                            </button>

                            <button
                                className={styles.btnBack}
                                onClick={() => navigate("/dashboard")}
                            >
                                <i className="bi bi-arrow-left me-1"></i>
                                Quay lại
                            </button>

                            <button
                                className={styles.btnComplete}
                                onClick={handleCompleteTask}
                                style={{ background: "#28a745", color: "white" }}
                            >
                                <i className="bi bi-check-circle me-1"></i>
                                Hoàn thành nhiệm vụ
                            </button>
                        </div>
                    </div>

                    {/* INFO */}
                    <div className={styles.infoSection}>
                        <div className="row g-4">
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <div className={styles.infoLabel}>Người giao</div>
                                    <div className={styles.infoValue}>
                                        <strong>{task.assignedByFullName}</strong>
                                        <br />
                                        <small className="text-muted">{task.assignedByEmail}</small>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <div className={styles.infoLabel}>Ngày tạo</div>
                                    <div className={`${styles.infoValue} text-muted`}>
                                        {formatVNDateTime(task.createdAt)}
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="mb-3">
                                    <div className={styles.infoLabel}>Bắt đầu lúc</div>
                                    <span className={`${styles.scheduleTime} ${getScheduleClass(task.scheduledStartAt)}`}>
                                        {formatVNDateTime(task.scheduledStartAt)}
                                    </span>
                                </div>

                                <div className="mb-3">
                                    <div className={styles.infoLabel}>Bản đồ</div>
                                    <div className={`${styles.infoValue} text-primary`}>
                                        {task.mapName}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* =================== STOP LIST =================== */}
                <div className={`${styles.glass} p-4 p-md-5`}>
                    <h2 className={styles.sectionTitle}>
                        <i className="bi bi-geo-alt-fill"></i>
                        Danh sách điểm dừng
                    </h2>

                    {!task.stops || task.stops.length === 0 ? (
                        <div className={styles.emptyState}>
                            <i className="bi bi-inbox" style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}></i>
                            Chưa có điểm dừng nào
                        </div>
                    ) : (
                        task.stops.map((s, idx) => (
                            <div key={idx} className={styles.stopCard}>
                                <div className={styles.stopHeader}>
                                    <div className={styles.stopNumber}>{s.seqNo}</div>
                                    <div className={styles.stopTitle}>Điểm dừng #{s.seqNo}</div>
                                    <span className={getStatusBadgeClass(s.assignmentStatus)}>
                                        {s.assignmentStatus?.toUpperCase()}
                                    </span>
                                </div>

                                {/* STOP INFO */}
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className={styles.infoLabel}>Điểm đến</div>
                                        <div className={styles.infoValue}>{s.destinationName}</div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className={styles.infoLabel}>Bệnh nhân</div>
                                        <div className={styles.infoValue}>
                                            <strong>{s.patientName}</strong>
                                            <br />
                                            <small className="text-muted">Mã: {s.patientCode}</small>
                                        </div>
                                    </div>

                                    <div className="col-md-12">
                                        {/* ===================== UPDATE STOP STATUS ===================== */}
                                        <div className="mt-3">
                                            <label className={styles.infoLabel}>Cập nhật trạng thái điểm dừng</label>

                                            <div className="d-flex gap-2 align-items-center mt-2">
                                                <select
                                                    className="form-select"
                                                    style={{ maxWidth: "220px" }}
                                                    value={stopStatusEdit[s.seqNo] || ""}
                                                    onChange={(e) =>
                                                        setStopStatusEdit({
                                                            ...stopStatusEdit,
                                                            [s.seqNo]: e.target.value
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
                                                    onClick={() => handleUpdateStop(s)}
                                                >
                                                    Cập nhật
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ItemDesc */}
                                    {s.itemDesc && (
                                        <div className="col-12">
                                            <div className={styles.infoLabel}>Ghi chú hàng hóa</div>
                                            <div className={`${styles.infoValue} text-muted`}>
                                                {s.itemDesc}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* PRESCRIPTION */}
                                {s.prescription ? (
                                    <div className={styles.prescriptionBox}>
                                        <h6 className={styles.prescriptionTitle}>
                                            <i className="bi bi-file-medical-fill"></i>
                                            Đơn thuốc: {s.prescription.prescriptionCode}
                                        </h6>

                                        {s.prescription.items.map((it, itemIdx) => (
                                            <div key={itemIdx} className={styles.prescriptionItem}>
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
                                ) : (
                                    <div className="mt-3">
                                        <div className={`${styles.infoValue} text-muted fst-italic`}>
                                            Không có đơn thuốc
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

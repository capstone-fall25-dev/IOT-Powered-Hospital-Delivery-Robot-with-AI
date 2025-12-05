import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchTaskHistoryDetail } from "../services/taskService";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";
import styles from "@/assets/styles/taskHistoryDetail.module.css";

export default function TaskHistoryDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast, showToast } = useToast();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // =========================
    // HELPERS
    // =========================
    const formatDateTime = (value) => {
        if (!value) return "-";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString("vi-VN", {
            dateStyle: "short",
            timeStyle: "short"
        });
    };

    const formatDuration = (seconds) => {
        if (!seconds && seconds !== 0) return "-";
        const s = Number(seconds);
        const m = Math.floor(s / 60);
        const r = s % 60;
        if (m <= 0) return `${s}s`;
        return `${m}ph ${r ? r + "s" : ""}`;
    };

    // Mapping priority sang tiếng Việt
    const priorityMap = {
        "Urgent": "Khẩn cấp",
        "High": "Cao",
        "Normal": "Bình thường",
        "Low": "Thấp",
    };

    const getPriorityText = (p) => {
        if (!p && p !== 0) return "Bình thường";
        // Nếu là số (0, 1, 2)
        if (typeof p === "number") {
            if (p === 2 || p === 1) return "Khẩn cấp";
            if (p === 0) return "Bình thường";
        }
        // Nếu là string
        return priorityMap[p] || p;
    };

    const getPriorityClass = (priority) => {
        const priorityText = getPriorityText(priority);
        if (priorityText === "Khẩn cấp" || priority === "Urgent" || priority === 2 || priority === 1) {
            return `${styles.pill} ${styles.pillPriorityHigh}`;
        }
        if (priorityText === "Cao" || priority === "High") {
            return `${styles.pill} ${styles.pillPriorityHigh}`;
        }
        if (priorityText === "Thấp" || priority === "Low") {
            return `${styles.pill} ${styles.pillPriorityLow}`;
        }
        return `${styles.pill} ${styles.pillPriorityNormal}`;
    };

    const getStatusClass = (status) => {
        if (!status) return styles.statusBadge;
        const s = status.toLowerCase();
        if (s === "completed") return `${styles.statusBadge} ${styles.statusCompleted}`;
        if (s === "in_progress" || s === "awaiting_handover" || s === "returning") {
            return `${styles.statusBadge} ${styles.statusInProgress}`;
        }
        if (s === "failed") return `${styles.statusBadge} ${styles.statusFailed}`;
        if (s === "canceled") return `${styles.statusBadge} ${styles.statusCanceled}`;
        return styles.statusBadge;
    };

    const getStopStatusLabel = (s) => {
        if (!s) return "-";
        const v = s.toLowerCase();
        if (v === "delivered") return "Đã giao";
        if (v === "pending") return "Chờ xử lý";
        if (v === "in_progress") return "Đang xử lý";
        if (v === "awaiting_handover") return "Chờ bàn giao";
        if (v === "skipped") return "Bỏ qua";
        if (v === "failed") return "Thất bại";
        return s;
    };

    const getTaskStatusLabel = (s) => {
        if (!s) return "-";
        const v = s.toLowerCase();
        if (v === "completed") return "Hoàn thành";
        if (v === "in_progress") return "Đang thực hiện";
        if (v === "awaiting_handover") return "Chờ bàn giao";
        if (v === "returning") return "Đang quay về trạm";
        if (v === "at_station") return "Đang ở trạm";
        if (v === "failed") return "Thất bại";
        if (v === "canceled") return "Đã hủy";
        if (v === "pending") return "Đang chờ";
        return s;
    };

    // =========================
    // LOAD DATA
    // =========================
    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                setLoading(true);
                const res = await fetchTaskHistoryDetail(id);
                if (!mounted) return;
                setData(res);
            } catch (err) {
                console.error("Lỗi tải lịch sử nhiệm vụ:", err);
                if (!mounted) return;
                showToast("error", err.message || "Không tải được dữ liệu lịch sử.");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const sortedStops = useMemo(() => {
        if (!data?.stops) return [];
        return [...data.stops].sort((a, b) => a.seqNo - b.seqNo);
    }, [data]);

    // =========================
    // RENDER
    // =========================
    if (loading) {
        return (
            <div className={styles.page}>
                <Toast toast={toast} showToast={showToast} />
                <div className="container-lg py-5 text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                    </div>
                    <div className="text-muted">Đang tải lịch sử nhiệm vụ...</div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className={styles.page}>
                <Toast toast={toast} showToast={showToast} />
                <div className="container-lg py-5">
                    <button className="btn btn-outline-secondary mb-3" onClick={() => navigate(-1)}>
                        <i className="bi bi-arrow-left me-1"></i>
                        Quay lại
                    </button>
                    <div className="alert alert-warning">
                        Không tìm thấy bản ghi lịch sử.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <Toast toast={toast} showToast={showToast} />

            <div className="container-lg py-4 py-lg-5">
                {/* Header */}
                <div className={`${styles.glass} p-4 ${styles.rounded2xl} mb-4`}>
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                        <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-3 mb-2">
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => navigate(-1)}
                                    title="Quay lại"
                                >
                                    <i className="bi bi-arrow-left me-1"></i>
                                    Quay lại
                                </button>
                                <div>
                                    <h2 className="fw-bold mb-1">
                                        Lịch sử nhiệm vụ #{data.taskId}
                                    </h2>
                                    <div className={`${styles.chip} mt-1`}>
                                        <i className="bi bi-file-text me-1"></i>
                                        Bản ghi lịch sử ID: {data.id} • Robot {data.robotName
                                        ? `${data.robotName} (${data.robotCode})`
                                        : data.robotCode}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-end">
                            <div className={getStatusClass(data.finalStatus)}>
                                {getTaskStatusLabel(data.finalStatus)}
                            </div>
                            <div className="mt-2">
                                <span className={getPriorityClass(data.priority)}>
                                    {getPriorityText(data.priority)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SUMMARY CARD */}
                <div className={`${styles.glass} p-4 ${styles.rounded2xl} mb-4`}>
                    <div className="row g-4">
                        {/* Left column */}
                        <div className="col-md-6 border-end border-light-subtle">
                            <h5 className="fw-semibold mb-3">
                                <i className="bi bi-info-circle me-2"></i>
                                Thông tin chung
                            </h5>
                            <dl className="row mb-0 small">
                                <dt className="col-sm-4 text-muted">Robot</dt>
                                <dd className="col-sm-8">
                                    {data.robotName
                                        ? `${data.robotName} (${data.robotCode})`
                                        : data.robotCode}
                                </dd>

                                <dt className="col-sm-4 text-muted">Bản đồ</dt>
                                <dd className="col-sm-8">{data.nameMapFE || data.mapName || "-"}</dd>

                                <dt className="col-sm-4 text-muted">Người giao</dt>
                                <dd className="col-sm-8">
                                    {data.assignedByName || "-"}
                                    {data.assignedByEmail && (
                                        <span className="text-muted"> ({data.assignedByEmail})</span>
                                    )}
                                </dd>

                                <dt className="col-sm-4 text-muted">Tạo lúc</dt>
                                <dd className="col-sm-8">{formatDateTime(data.createdAt)}</dd>

                                <dt className="col-sm-4 text-muted">Dự kiến bắt đầu</dt>
                                <dd className="col-sm-8">{formatDateTime(data.scheduledStartAt)}</dd>

                                <dt className="col-sm-4 text-muted">Bắt đầu thực tế</dt>
                                <dd className="col-sm-8">{formatDateTime(data.startedAt)}</dd>

                                <dt className="col-sm-4 text-muted">Hoàn thành</dt>
                                <dd className="col-sm-8">{formatDateTime(data.completedAt)}</dd>

                                <dt className="col-sm-4 text-muted">Thời lượng</dt>
                                <dd className="col-sm-8">{formatDuration(data.totalDurationS)}</dd>

                                <dt className="col-sm-4 text-muted">Thời điểm ghi</dt>
                                <dd className="col-sm-8">{formatDateTime(data.recordedAt)}</dd>
                            </dl>
                        </div>

                        {/* Right column */}
                        <div className="col-md-6">
                            <h5 className="fw-semibold mb-3">
                                <i className="bi bi-bar-chart me-2"></i>
                                Tổng quan điểm dừng
                            </h5>
                            <div className="row g-3">
                                <div className="col-6 col-lg-3">
                                    <div className={`${styles.stopCard} p-3 text-center`}>
                                        <div className="text-muted small">Tổng điểm dừng</div>
                                        <div className="fs-4 fw-bold">{data.totalStops}</div>
                                    </div>
                                </div>
                                <div className="col-6 col-lg-3">
                                    <div className={`${styles.stopCard} p-3 text-center`}>
                                        <div className="text-muted small">Đã giao</div>
                                        <div className="fs-4 fw-bold text-success">{data.deliveredStops}</div>
                                    </div>
                                </div>
                                <div className="col-6 col-lg-3">
                                    <div className={`${styles.stopCard} p-3 text-center`}>
                                        <div className="text-muted small">Bỏ qua</div>
                                        <div className="fs-4 fw-bold text-secondary">{data.skippedStops}</div>
                                    </div>
                                </div>
                                <div className="col-6 col-lg-3">
                                    <div className={`${styles.stopCard} p-3 text-center`}>
                                        <div className="text-muted small">Thất bại</div>
                                        <div className="fs-4 fw-bold text-danger">{data.failedStops}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 small text-muted">
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                Tổng lỗi trong hành trình: <strong>{data.totalErrors}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* STOPS TIMELINE */}
                <div className={`${styles.glass} p-4 p-lg-5 ${styles.rounded2xl}`}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-semibold mb-0">
                            <i className="bi bi-clock-history me-2"></i>
                            Timeline các điểm dừng
                        </h5>
                        <span className="text-muted small">
                            {sortedStops.length} điểm dừng • Robot: {data.robotCode}
                        </span>
                    </div>

                    <div className={styles.timeline}>
                        {sortedStops.length === 0 && (
                            <div className="text-center text-muted py-4">
                                <i className="bi bi-inbox me-2"></i>
                                Không có lịch sử điểm dừng.
                            </div>
                        )}

                        {sortedStops.map((s) => (
                            <div key={s.seqNo} className={styles.tItem}>
                                <div className={`${styles.stopCard} p-3 p-md-4`}>
                                    <div className="d-flex justify-content-between flex-wrap gap-2 mb-1">
                                        <div className="flex-grow-1">
                                            <div className="small text-muted mb-1">
                                                <i className="bi bi-geo-alt me-1"></i>
                                                Điểm dừng #{s.seqNo} • {s.destinationName || "Không rõ điểm đến"}
                                            </div>
                                            <div className="fw-semibold">
                                                {s.patientName
                                                    ? (
                                                        <>
                                                            <i className="bi bi-person me-1"></i>
                                                            {s.patientName}
                                                            {s.patientCode && (
                                                                <span className="text-muted small ms-1">
                                                                    ({s.patientCode})
                                                                </span>
                                                            )}
                                                        </>
                                                    )
                                                    : (
                                                        <span className="text-muted">
                                                            <i className="bi bi-person-x me-1"></i>
                                                            Không có thông tin bệnh nhân
                                                        </span>
                                                    )}
                                            </div>
                                        </div>
                                        <div className="text-end small">
                                            <div className={getStatusClass(s.status)}>
                                                {getStopStatusLabel(s.status)}
                                            </div>
                                            <div className="mt-1 text-muted">
                                                <i className="bi bi-clock me-1"></i>
                                                {formatDuration(s.durationSeconds)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row small g-2 mt-2">
                                        <div className="col-md-4">
                                            <div className="text-muted">
                                                <i className="bi bi-door-open me-1"></i>
                                                Phòng / giường
                                            </div>
                                            <div>{s.roomNumber || "-"}</div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="text-muted">
                                                <i className="bi bi-box me-1"></i>
                                                Khoang chứa
                                            </div>
                                            <div>{s.compartmentCode || "-"}</div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="text-muted">
                                                <i className="bi bi-calendar-event me-1"></i>
                                                Khoảng thời gian
                                            </div>
                                            <div>
                                                {s.arrivedAt && (
                                                    <>
                                                        Đến: {formatDateTime(s.arrivedAt)}
                                                        <br />
                                                    </>
                                                )}
                                                {s.deliveredAt && (
                                                    <>Giao xong: {formatDateTime(s.deliveredAt)}</>
                                                )}
                                                {!s.arrivedAt && !s.deliveredAt && "-"}
                                            </div>
                                        </div>
                                    </div>

                                    {s.itemDesc && (
                                        <div className="mt-2 small">
                                            <div className="text-muted">
                                                <i className="bi bi-file-medical me-1"></i>
                                                Nội dung / thuốc
                                            </div>
                                            <div>{s.itemDesc}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

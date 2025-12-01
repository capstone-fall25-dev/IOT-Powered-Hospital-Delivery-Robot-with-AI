import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchTaskHistoryDetail } from "../services/taskService";

export default function TaskHistoryDetail() {
    const { id } = useParams();          // historyId
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // =========================
    // THEME STYLES (giống mẫu)
    // =========================
    const styles = (
        <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(1200px 600px at 15% 10%,rgba(76,225,198,.18),transparent 60%),radial-gradient(900px 500px at 90% 5%,rgba(76,225,198,.12),transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 15%,#e9f3f1 35%,#e8f0ee 100%);min-height:100vh}
      .glass{background:rgba(255,255,255,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.7);box-shadow:0 10px 30px rgba(15,23,42,.08);border-radius:24px}
      .rounded-2xl{border-radius:28px}
      .chip{display:inline-block;padding:.25rem .6rem;border-radius:999px;background:rgba(20,226,193,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
      .btn-teal{background:var(--teal);color:#052a2b;font-weight:700;border:none}
      .btn-teal:hover{background:#39d7bf;color:#052a2b}
      .pill{border-radius:999px;padding:.25rem .7rem;font-size:.8rem;font-weight:600}
      .pill-priority-high{background:rgba(248,113,113,.12);color:#b91c1c}
      .pill-priority-normal{background:rgba(59,130,246,.12);color:#1d4ed8}
      .pill-priority-low{background:rgba(34,197,94,.12);color:#166534}
      .status-badge{padding:.25rem .6rem;border-radius:999px;font-size:.8rem;font-weight:600}
      .status-completed{background:rgba(34,197,94,.12);color:#15803d}
      .status-in_progress{background:rgba(56,189,248,.12);color:#0369a1}
      .status-failed{background:rgba(248,113,113,.12);color:#b91c1c}
      .status-canceled{background:rgba(148,163,184,.18);color:#334155}

      .timeline{position:relative;padding-left:28px}
      .timeline::before{content:'';position:absolute;left:12px;top:0;bottom:0;width:2px;background:linear-gradient(180deg,rgba(76,225,198,.7),rgba(76,225,198,0))}
      .t-item{position:relative;margin-bottom:20px}
      .t-item::before{content:'';position:absolute;left:-18px;top:8px;width:12px;height:12px;border-radius:999px;background:var(--teal);box-shadow:0 0 0 4px rgba(76,225,198,.25)}
      .stop-card{border-radius:18px;border:1px solid rgba(148,163,184,.25);background:rgba(255,255,255,.9)}
    `}</style>
    );

    // =========================
    // HELPERS
    // =========================
    const formatDateTime = (value) => {
        if (!value) return "-";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString("vi-VN");
    };

    const formatDuration = (seconds) => {
        if (!seconds && seconds !== 0) return "-";
        const s = Number(seconds);
        const m = Math.floor(s / 60);
        const r = s % 60;
        if (m <= 0) return `${s}s`;
        return `${m} phút ${r ? r + "s" : ""}`;
    };

    const getPriorityClass = (priority) => {
        if (!priority) return "pill";
        const p = priority.toLowerCase();
        if (p.includes("high") || p.includes("urgent")) return "pill pill-priority-high";
        if (p.includes("low")) return "pill pill-priority-low";
        return "pill pill-priority-normal";
    };

    const getStatusClass = (status) => {
        if (!status) return "status-badge";
        const s = status.toLowerCase();
        if (s === "completed") return "status-badge status-completed";
        if (s === "in_progress" || s === "awaiting_handover" || s === "returning") return "status-badge status-in_progress";
        if (s === "failed") return "status-badge status-failed";
        if (s === "canceled") return "status-badge status-canceled";
        return "status-badge";
    };

    const getStopStatusLabel = (s) => {
        if (!s) return "-";
        const v = s.toLowerCase();
        if (v === "delivered") return "Đã giao";
        if (v === "pending") return "Đang chờ";
        if (v === "in_progress") return "Đang giao";
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
                setError("");
               const res = await fetchTaskHistoryDetail(id);
                if (!mounted) return;
                setData(res);
            } catch (err) {
                console.error(err);
                if (!mounted) return;
                setError("Không tải được dữ liệu lịch sử.");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => { mounted = false; };
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
            <div className="page">
                {styles}
                <div className="container-lg py-5 text-center">
                    <div className="spinner-border text-teal mb-3" role="status" />
                    <div>Đang tải lịch sử nhiệm vụ...</div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="page">
                {styles}
                <div className="container-lg py-5">
                    <button className="btn btn-outline-secondary mb-3" onClick={() => navigate(-1)}>
                        <i className="bi bi-arrow-left"></i> Quay lại
                    </button>
                    <div className="alert alert-danger">{error || "Không tìm thấy bản ghi lịch sử."}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            {styles}

            <div className="container-lg py-4 py-lg-5">

                {/* Header */}
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                    <div>
                        <button className="btn btn-outline-secondary btn-sm mb-2" onClick={() => navigate(-1)}>
                            <i className="bi bi-arrow-left"></i> Quay lại
                        </button>
                        <h2 className="fw-bold mb-1">
                            Lịch sử nhiệm vụ #{data.taskId}
                        </h2>
                        <div className="chip mt-1">
                            Bản ghi lịch sử ID: {data.id} • Robot {data.robotCode}
                        </div>
                    </div>
                    <div className="text-end">
                        <div className={getStatusClass(data.finalStatus)}>
                            {getTaskStatusLabel(data.finalStatus)}
                        </div>
                        <div className="mt-2">
                            <span className={getPriorityClass(data.priority)}>
                                Priority: {data.priority}
                            </span>
                        </div>
                    </div>
                </div>

                {/* SUMMARY CARD */}
                <div className="glass p-4 rounded-2xl mb-4">
                    <div className="row g-4">
                        {/* Left column */}
                        <div className="col-md-6 border-end border-light-subtle">
                            <h5 className="fw-semibold mb-3">Thông tin chung</h5>
                            <dl className="row mb-0 small">
                                <dt className="col-sm-4 text-muted">Robot</dt>
                                <dd className="col-sm-8">
                                    {data.robotName
                                        ? `${data.robotName} (${data.robotCode})`
                                        : data.robotCode}
                                </dd>

                                <dt className="col-sm-4 text-muted">Bản đồ</dt>
                                <dd className="col-sm-8">{data.mapName || "-"}</dd>

                                <dt className="col-sm-4 text-muted">Người giao</dt>
                                <dd className="col-sm-8">
                                    {data.assignedByName} <span className="text-muted">({data.assignedByEmail})</span>
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
                            <h5 className="fw-semibold mb-3">Tổng quan điểm dừng</h5>
                            <div className="row g-3">
                                <div className="col-6 col-lg-3">
                                    <div className="stop-card p-3 text-center">
                                        <div className="text-muted small">Tổng stops</div>
                                        <div className="fs-4 fw-bold">{data.totalStops}</div>
                                    </div>
                                </div>
                                <div className="col-6 col-lg-3">
                                    <div className="stop-card p-3 text-center">
                                        <div className="text-muted small">Đã giao</div>
                                        <div className="fs-4 fw-bold text-success">{data.deliveredStops}</div>
                                    </div>
                                </div>
                                <div className="col-6 col-lg-3">
                                    <div className="stop-card p-3 text-center">
                                        <div className="text-muted small">Bỏ qua</div>
                                        <div className="fs-4 fw-bold text-secondary">{data.skippedStops}</div>
                                    </div>
                                </div>
                                <div className="col-6 col-lg-3">
                                    <div className="stop-card p-3 text-center">
                                        <div className="text-muted small">Thất bại</div>
                                        <div className="fs-4 fw-bold text-danger">{data.failedStops}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 small text-muted">
                                Tổng lỗi trong hành trình: <strong>{data.totalErrors}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* STOPS TIMELINE */}
                <div className="glass p-4 p-lg-5 rounded-2xl">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-semibold mb-0">Timeline các điểm dừng</h5>
                        <span className="text-muted small">
                            {sortedStops.length} điểm dừng • Robot: {data.robotCode}
                        </span>
                    </div>

                    <div className="timeline">
                        {sortedStops.length === 0 && (
                            <div className="text-center text-muted">Không có stop history.</div>
                        )}

                        {sortedStops.map((s) => (
                            <div key={s.seqNo} className="t-item">
                                <div className="stop-card p-3 p-md-4">
                                    <div className="d-flex justify-content-between flex-wrap gap-2 mb-1">
                                        <div>
                                            <div className="small text-muted">
                                                Stop #{s.seqNo} • {s.destinationName || "Không rõ điểm đến"}
                                            </div>
                                            <div className="fw-semibold">
                                                {s.patientName
                                                    ? `${s.patientName} (${s.patientCode || "Không có mã"})`
                                                    : "Không có thông tin bệnh nhân"}
                                            </div>
                                        </div>
                                        <div className="text-end small">
                                            <div className={getStatusClass(s.status)}>
                                                {getStopStatusLabel(s.status)}
                                            </div>
                                            <div className="mt-1 text-muted">
                                                ⏱ {formatDuration(s.durationSeconds)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row small g-2 mt-2">
                                        <div className="col-md-4">
                                            <div className="text-muted">Phòng / giường</div>
                                            <div>{s.roomNumber || "-"}</div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="text-muted">Khoang chứa</div>
                                            <div>{s.compartmentCode || "-"}</div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="text-muted">Khoảng thời gian</div>
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
                                            <div className="text-muted">Nội dung / thuốc</div>
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

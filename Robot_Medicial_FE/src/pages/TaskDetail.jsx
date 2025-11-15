import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTaskById } from "@/services/taskService";

export default function TaskDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);

    const statusColor = {
        pending: "warning",
        in_progress: "info",
        completed: "success",
        canceled: "secondary"
    };

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

    function getBlink(startTime) {
        if (!startTime) return "";
        const now = new Date();
        const start = new Date(startTime);
        const diffMin = (start - now) / 1000 / 60;

        if (diffMin <= 0) return "blink blink-yellow";
        if (diffMin <= 1) return "blink blink-red";
        return "blink blink-green";
    }

    useEffect(() => {
        async function load() {
            try {
                const data = await getTaskById(id);
                setTask(data);
            } catch (e) {
                console.error("Lỗi load detail:", e);
            }
        }
        load();
    }, [id]);

    if (!task) return <div className="text-center mt-5">Đang tải dữ liệu...</div>;

    const handleEdit = () => {
        navigate(`/task-edit/${task.id}`);
    };

    const handleBack = () => {
        navigate("/dashboard");
    };

    return (
        <>
            <style>{`
                :root{--teal:#4CE1C6;}
                .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(12px);
                       border-radius:8px;border:1px solid rgba(255,255,255,.85);
                       box-shadow:0 8px 24px rgba(15,23,42,.08);}
                @keyframes blink{50%{opacity:.25}}
                .blink{animation:blink 1s infinite;font-weight:700}
                .blink-green{color:#16a34a!important}
                .blink-red{color:#dc2626!important}
                .blink-yellow{color:#f59e0b!important}

                /* Padding động dựa trên sidebar width để full hơn */
                .task-detail-padding {
                    padding-right: 1rem;
                    transition: padding-left 0.2s ease-in-out;
                }

                body.sidebar-collapsed .task-detail-padding {
                    padding-left: calc(60px + 1rem);
                }

                @media (max-width: 1024px) {
                    .task-detail-padding {
                        padding-left: 1rem !important;
                    }
                }

                /* Breadcrumb style */
                .breadcrumb-item + .breadcrumb-item::before {
                    content: " > ";
                    color: #6c757d;
                }

                /* Button group responsive */
                .btn-group-sm .btn { padding: 0.25rem 0.5rem; font-size: 0.875rem; }

                /* Stop section đơn giản */
                .stop-section { margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; }
                .prescription-list { list-style: none; padding: 0; }
                .prescription-list li { padding: 0.5rem 0; border-bottom: 1px solid #dee2e6; }
                .prescription-list li:last-child { border-bottom: none; }
            `}</style>

            <div className="task-detail-padding">
                {/* BREADCRUMBS & BUTTONS */}
                <nav aria-label="breadcrumb" className="mb-3 mt-3">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><a href="#" onClick={handleBack} className="text-decoration-none text-muted">Nhiệm vụ</a></li>
                        <li className="breadcrumb-item active" aria-current="page">Chi Tiết #{task.id}</li>
                    </ol>
                </nav>

                {/* TASK HEADER CARD */}
                <div className="glass p-4 mb-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h1 className="fw-bold mb-2">Nhiệm vụ #{task.id}</h1>
                            <p className="text-muted mb-2">Robot: <strong>{task.robotName}</strong></p>
                            <span className={`badge bg-${statusColor[task.status] ?? "secondary"}`}>
                                {task.status.toUpperCase()}
                            </span>
                        </div>
                        <div className="btn-group btn-group-sm" role="group">
                            <button className="btn btn-outline-primary" onClick={handleEdit}>
                                Sửa
                            </button>
                            <button className="btn btn-outline-secondary" onClick={handleBack}>
                                Quay lại
                            </button>
                        </div>
                    </div>

                    <div className="row g-3">
                        <div className="col-md-6">
                            <dl>
                                <dt>Người giao:</dt>
                                <dd>{task.assignedByFullName} ({task.assignedByEmail})</dd>
                                <dt>Độ ưu tiên:</dt>
                                <dd>
                                    <span className={`badge bg-${task.priority === 1 ? 'success' : task.priority === 2 ? 'warning' : 'danger'}`}>
                                        {task.priority === 1 ? 'Thấp' : task.priority === 2 ? 'Trung bình' : 'Cao'}
                                    </span>
                                </dd>
                                <dt>Ngày tạo:</dt>
                                <dd className="text-muted">{formatVNDateTime(task.createdAt)}</dd>
                            </dl>
                        </div>
                        <div className="col-md-6">
                            <dl>
                                <dt className={getBlink(task.scheduledStartAt)}>Bắt đầu lúc:</dt>
                                <dd className={getBlink(task.scheduledStartAt)}>{formatVNDateTime(task.scheduledStartAt)}</dd>
                                <dt>Bản đồ:</dt>
                                <dd className="text-primary">{task.mapName}</dd>
                                <dt>Tổng điểm dừng:</dt>
                                <dd><span className="badge bg-info">{task.stops?.length || 0}</span></dd>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* STOPS SECTION */}
                <div className="glass p-4 mb-3">
                    <h2 className="fw-bold mb-3">Danh sách điểm dừng</h2>

                    {task.stops.length === 0 ? (
                        <p className="text-muted text-center">Chưa có điểm dừng nào.</p>
                    ) : (
                        task.stops.map((s, idx) => (
                            <div key={idx} className="stop-section mb-4">
                                <h3 className="fw-semibold mb-2">Điểm dừng #{s.seqNo}</h3>
                                <p className="text-muted mb-3">Trạng thái giao: <span className={`badge bg-${s.assignmentStatus === 'pending' ? 'warning' : s.assignmentStatus === 'in_progress' ? 'info' : 'success'}`}>
                                    {s.assignmentStatus.toUpperCase()}
                                </span></p>

                                <dl className="row g-3">
                                    <div className="col-md-6">
                                        <dt className="col-sm-4">Điểm đến:</dt>
                                        <dd className="col-sm-8">{s.destinationName}</dd>
                                    </div>
                                    <div className="col-md-6">
                                        <dt className="col-sm-4">Bệnh nhân:</dt>
                                        <dd className="col-sm-8"><strong>{s.patientName}</strong> ({s.patientCode})</dd>
                                    </div>
                                    <div className="col-md-4">
                                        <dt className="col-sm-4">Phòng:</dt>
                                        <dd className="col-sm-8">{s.roomNumber || '—'}</dd>
                                    </div>
                                    <div className="col-md-4">
                                        <dt className="col-sm-4">Khoa:</dt>
                                        <dd className="col-sm-8">{s.department || '—'}</dd>
                                    </div>
                                    <div className="col-md-4">
                                        <dt className="col-sm-4">Khoang:</dt>
                                        <dd className="col-sm-8">
                                            <strong>{s.compartmentCode}</strong> — {s.compartmentCategory || '—'}<br />
                                            <small className={`badge bg-${s.compartmentStatus === 'locked' ? 'danger' : 'success'}`}>
                                                {s.compartmentStatus}
                                            </small>
                                        </dd>
                                    </div>
                                </dl>

                                {s.itemDesc && (
                                    <div className="mt-3">
                                        <dt className="fw-semibold">Ghi chú hàng hóa:</dt>
                                        <dd className="text-muted">{s.itemDesc}</dd>
                                    </div>
                                )}

                                {/* PRESCRIPTION */}
                                {s.prescription ? (
                                    <div className="mt-4">
                                        <h4 className="fw-semibold mb-2">Đơn thuốc</h4>
                                        <dl className="row g-2 mb-3">
                                            <div className="col-md-4">
                                                <dt>Mã đơn:</dt>
                                                <dd>{s.prescription.prescriptionCode}</dd>
                                            </div>
                                            <div className="col-md-4">
                                                <dt>Ngày tạo:</dt>
                                                <dd>{formatVNDateTime(s.prescription.createdAt)}</dd>
                                            </div>
                                            <div className="col-md-4">
                                                <dt>Trạng thái:</dt>
                                                <dd>
                                                    <span className={`badge bg-${s.prescription.status === 'approved' ? 'success' : s.prescription.status === 'pending' ? 'warning' : 'secondary'}`}>
                                                        {s.prescription.status}
                                                    </span>
                                                </dd>
                                            </div>
                                        </dl>

                                        <ul className="prescription-list">
                                            {s.prescription.items.map((it, itemIdx) => (
                                                <li key={itemIdx}>
                                                    <strong>{it.medicineName}</strong> — SL: {it.quantity}, {it.dosage}<br />
                                                    <small className="text-muted">{it.instructions}</small>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <p className="text-muted mt-2">Không có đơn thuốc.</p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
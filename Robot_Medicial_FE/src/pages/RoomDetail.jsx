import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRoomById, getAllRooms, movePatientToRoom } from "@/services/roomService";

export default function RoomDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [room, setRoom] = useState(null);
    const [allRooms, setAllRooms] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [newRoomId, setNewRoomId] = useState("");
    const [isMoving, setIsMoving] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const data = await getRoomById(id);
                setRoom(data);

                const rooms = await getAllRooms();
                setAllRooms(rooms);
            } catch (err) {
                alert("Không thể tải phòng: " + err.message);
            }
        }
        load();
    }, [id]);

    if (!room) return <p className="text-center mt-4">Đang tải...</p>;

    return (
        <>

            {/* CSS dành riêng cho trang này */}
            <style>{`
                .page-title {
                    font-weight: 800;
                    letter-spacing: -0.3px;
                }

                .info-card {
                    border-radius: 18px;
                    padding: 24px;
                    background: rgba(255,255,255,0.75);
                    backdrop-filter: blur(6px);
                    border: 1px solid rgba(255,255,255,0.4);
                    transition: 0.25s;
                }

                .info-card:hover {
                    transform: translateY(-2px);
                }

                .section-title {
                    font-weight: 700;
                    display:flex;
                    align-items:center;
                    gap:10px;
                }

                .patients-table th {
                    background: #f8fafc;
                    font-weight: 600;
                }

                .btn-action {
                    min-width: 95px;
                }

                /* Modal đẹp */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.55);
                    backdrop-filter: blur(3px);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    z-index:2000;
                    animation: fadeIn .25s ease;
                }

                .modal-box {
                    width: 100%;
                    max-width: 520px;
                    background: #fff;
                    border-radius: 14px;
                    animation: slideUp .28s ease;
                }

                @keyframes fadeIn {
                    from { opacity:0; }
                    to { opacity:1; }
                }

                @keyframes slideUp {
                    from { 
                        transform: translateY(40px);
                        opacity:0;
                    }
                    to {
                        transform: translateY(0);
                        opacity:1;
                    }
                }
                    /* Modal medical theme */
.modal-medical {
    width: 100%;
    max-width: 520px;
    border-radius: 18px;
    background: #ffffff;
    overflow: hidden;
    animation: slideUp .28s ease;
}

.modal-medical-header {
    background: linear-gradient(90deg, #0d6efd, #0a58ca);
    color: white;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.modal-medical-title {
    font-weight: 700;
    margin: 0;
}

.modal-medical-body {
    padding: 20px;
    background: #f8fafc;
}

.modal-medical-footer {
    padding: 16px 20px;
    background: #f1f5f9;
    display: flex;
    justify-content: space-between;
}

.btn-medical-cancel {
    padding: 10px 18px;
    border-radius: 10px;
    font-weight: 600;
    color: #475569;
}

.btn-medical-confirm {
    padding: 10px 22px;
    border-radius: 10px;
    font-weight: 600;
}

/* Input select */
.medical-select {
    border-radius: 14px !important;
    padding: 12px 14px;
    border: 1px solid #d1d5db;
}

            `}</style>

            <div className="container py-4 fadeIn">

               {/* =================== HEADER ==================== */}
<div className="d-flex align-items-center justify-content-between mb-4">
    <h3 className="page-title d-flex align-items-center gap-2">
        <i className="bi bi-hospital"></i>
        Chi tiết phòng — {room.roomName}
    </h3>

    <div className="d-flex gap-2">
        {/* Nút Edit */}
        <button
            className="btn btn-primary d-flex align-items-center gap-1"
            onClick={() => navigate(`/rooms/${id}/edit`)}
        >
            <i className="bi bi-pencil-square"></i>
            Chỉnh sửa
        </button>

        {/* Nút quay lại */}
        <button
            className="btn btn-outline-secondary d-flex align-items-center gap-1"
            onClick={() => navigate("/rooms")}
        >
            <i className="bi bi-arrow-left"></i>
            Quay lại
        </button>
    </div>
</div>


                {/* =================== THÔNG TIN PHÒNG ==================== */}
                <div className="info-card mb-4 shadow-sm">
                    <h5 className="section-title">
                        <i className="bi bi-door-open text-primary"></i>
                        Thông tin phòng
                    </h5>

                    <div className="row mt-3">
                        <div className="col-md-6 mb-2">
                            <p className="mb-1 text-muted">Tên phòng</p>
                            <p className="fw-bold">{room.roomName}</p>
                        </div>
                        <div className="col-md-6 mb-2">
                            <p className="mb-1 text-muted">Map ID</p>
                            <p className="fw-bold">{room.mapId ?? "---"}</p>
                        </div>

                        <div className="col-md-6 mb-2">
                            <p className="mb-1 text-muted">Tọa độ</p>
                            <p className="fw-bold">
                                {room.latitude}, {room.longitude}
                            </p>
                        </div>
                        <div className="col-md-6 mb-2">
                            <p className="mb-1 text-muted">Số bệnh nhân</p>
                            <p className="fw-bold text-primary">{room.patientCount}</p>
                        </div>
                    </div>
                </div>

                {/* =================== DANH SÁCH BỆNH NHÂN ==================== */}
                <div className="info-card shadow-sm">
                    <h5 className="section-title mb-3">
                        <i className="bi bi-people text-primary"></i>
                        Danh sách bệnh nhân
                    </h5>

                    {room.patients.length === 0 ? (
                        <p className="text-muted">Không có bệnh nhân trong phòng này.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table patients-table align-middle">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Mã BN</th>
                                        <th>Họ tên</th>
                                        <th>Giới tính</th>
                                        <th>Trạng thái</th>
                                        <th>Ngày tạo</th>
                                        <th className="text-end">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {room.patients.map((p, i) => (
                                        <tr key={p.id}>
                                            <td>{i + 1}</td>
                                            <td>{p.patientCode}</td>
                                            <td className="fw-semibold">{p.fullName}</td>
                                            <td>{p.gender}</td>
                                            <td>
                                                <span className="badge bg-info text-dark px-3 py-2">{p.status}</span>
                                            </td>
                                            <td>{p.createdAt ? new Date(p.createdAt).toLocaleDateString("vi-VN") : "-"}</td>

                                            <td className="text-end d-flex justify-content-end gap-2">

                                                <button
                                                    className="btn btn-outline-primary btn-sm btn-action"
                                                    onClick={() => navigate(`/patient/${p.id}`)}
                                                >
                                                    <i className="bi bi-eye"></i> Xem
                                                </button>

                                                <button
                                                    className="btn btn-warning btn-sm text-white btn-action"
                                                    onClick={() => {
                                                        setSelectedPatient(p);
                                                        setNewRoomId("");
                                                    }}
                                                >
                                                    <i className="bi bi-arrow-left-right"></i> Chuyển
                                                </button>

                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* =================== MODAL CHUYỂN PHÒNG ==================== */}
{selectedPatient && (
    <div className="modal-overlay">

        <div className="modal-medical shadow-lg">

            {/* HEADER */}
            <div className="modal-medical-header">
                <h5 className="modal-medical-title">
                    <i className="bi bi-arrow-left-right me-2"></i>
                    Chuyển phòng — <b>{selectedPatient.fullName}</b>
                </h5>

                <button
                    className="btn-close btn-close-white"
                    onClick={() => setSelectedPatient(null)}
                ></button>
            </div>

            {/* BODY */}
            <div className="modal-medical-body">
                <label className="form-label text-muted fw-semibold mb-1">Chọn phòng mới</label>

                <select
                    className="form-select form-select-lg medical-select"
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value)}
                >
                    <option value="">-- Chọn phòng --</option>
                    {allRooms
                        .filter(r => r.id !== Number(id))
                        .map(r => (
                            <option key={r.id} value={r.id}>
                                {r.roomName} — Map {r.mapId || "N/A"}
                            </option>
                        ))}
                </select>
            </div>

            {/* FOOTER */}
            <div className="modal-medical-footer">

                <button
                    className="btn btn-light btn-medical-cancel"
                    onClick={() => setSelectedPatient(null)}
                >
                    <i className="bi bi-x-circle me-1"></i>
                    Hủy
                </button>

                <button
                    className="btn btn-primary btn-medical-confirm"
                    disabled={!newRoomId || isMoving}
                    onClick={async () => {
                        try {
                            setIsMoving(true);

                            await movePatientToRoom(selectedPatient.id, Number(newRoomId));

                            alert("Chuyển phòng thành công!");

                            const updated = await getRoomById(id);
                            setRoom(updated);

                            setSelectedPatient(null);
                            setIsMoving(false);

                        } catch (err) {
                            setIsMoving(false);
                            alert("Lỗi: " + err.message);
                        }
                    }}
                >
                    {isMoving ? (
                        <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                        <>
                            <i className="bi bi-check-circle me-1"></i>
                            Xác nhận
                        </>
                    )}
                </button>

            </div>
        </div>
    </div>
)}
        </>
    );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRoomById, getAllRooms, movePatientToRoom } from "@/services/roomService";
import styles from "../assets/styles/roomDetail.module.css";

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

    if (!room) {
        return (
            <div className={styles.loadingState}>
                <div className="spinner-border text-primary mb-3" role="status"></div>
                <p>Đang tải thông tin phòng...</p>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">

                {/* =================== HEADER ==================== */}
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                    <h3 className={styles.pageTitle}>
                        <i className="bi bi-hospital"></i>
                        Chi tiết phòng — {room.roomName}
                    </h3>

                    <div className="d-flex gap-2 flex-wrap">
                        <button
                            className={styles.btnTeal}
                            onClick={() => navigate(`/rooms/${id}/edit`)}
                        >
                            <i className="bi bi-pencil-square"></i>
                            Chỉnh sửa
                        </button>

                        <button
                            className={styles.btnOutline}
                            onClick={() => navigate("/rooms")}
                        >
                            <i className="bi bi-arrow-left"></i>
                            Quay lại
                        </button>
                    </div>
                </div>

                {/* =================== THÔNG TIN PHÒNG ==================== */}
                <div className={`${styles.infoCard} mb-4`}>
                    <h5 className={styles.sectionTitle}>
                        <i className="bi bi-door-open"></i>
                        Thông tin phòng
                    </h5>

                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <p className={styles.infoLabel}>Tên phòng</p>
                            <p className={styles.infoValue}>{room.roomName}</p>
                        </div>
                        <div className="col-md-6 mb-3">
                            <p className={styles.infoLabel}>Map ID</p>
                            <p className={styles.infoValue}>{room.mapId ?? "---"}</p>
                        </div>

                        <div className="col-md-6 mb-3">
                            <p className={styles.infoLabel}>Tọa độ (Lat, Long)</p>
                            <p className={styles.infoValue}>
                                {room.latitude}, {room.longitude}
                            </p>
                        </div>
                        <div className="col-md-6 mb-3">
                            <p className={styles.infoLabel}>Số bệnh nhân hiện tại</p>
                            <p className={styles.infoValueHighlight}>
                                <i className="bi bi-people-fill me-2"></i>
                                {room.patientCount}
                            </p>
                        </div>
                    </div>
                </div>

                {/* =================== DANH SÁCH BỆNH NHÂN ==================== */}
                <div className={styles.infoCard}>
                    <h5 className={styles.sectionTitle}>
                        <i className="bi bi-people"></i>
                        Danh sách bệnh nhân
                    </h5>

                    {room.patients.length === 0 ? (
                        <div className={styles.emptyState}>
                            <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                            Không có bệnh nhân trong phòng này
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className={`table ${styles.patientsTable} align-middle mb-0`}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>#</th>
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
                                            <td className="fw-semibold">{p.patientCode}</td>
                                            <td className={styles.patientName}>{p.fullName}</td>
                                            <td>{p.gender}</td>
                                            <td>
                                                <span className={styles.statusBadge}>{p.status}</span>
                                            </td>
                                            <td>
                                                {p.createdAt 
                                                    ? new Date(p.createdAt).toLocaleDateString("vi-VN") 
                                                    : "-"}
                                            </td>

                                            <td className="text-end">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <button
                                                        className={styles.btnView}
                                                        onClick={() => navigate(`/patient/${p.id}`)}
                                                    >
                                                        <i className="bi bi-eye me-1"></i>
                                                        Xem
                                                    </button>

                                                    <button
                                                        className={styles.btnMove}
                                                        onClick={() => {
                                                            setSelectedPatient(p);
                                                            setNewRoomId("");
                                                        }}
                                                    >
                                                        <i className="bi bi-arrow-left-right me-1"></i>
                                                        Chuyển
                                                    </button>
                                                </div>
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
                <div className={styles.modalOverlay} onClick={(e) => {
                    if (e.target === e.currentTarget) setSelectedPatient(null);
                }}>
                    <div className={styles.modalBox}>

                        {/* HEADER */}
                        <div className={styles.modalHeader}>
                            <h5 className={styles.modalTitle}>
                                <i className="bi bi-arrow-left-right me-2"></i>
                                Chuyển phòng — {selectedPatient.fullName}
                            </h5>

                            <button
                                className="btn-close btn-close-white"
                                onClick={() => setSelectedPatient(null)}
                            ></button>
                        </div>

                        {/* BODY */}
                        <div className={styles.modalBody}>
                            <label className={`form-label ${styles.modalLabel}`}>
                                Chọn phòng mới
                            </label>

                            <select
                                className={`form-select form-select-lg ${styles.modalSelect}`}
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
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.btnModalCancel}
                                onClick={() => setSelectedPatient(null)}
                            >
                                <i className="bi bi-x-circle me-1"></i>
                                Hủy
                            </button>

                            <button
                                className={styles.btnModalConfirm}
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
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Đang xử lý...
                                    </>
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
        </div>
    );
}
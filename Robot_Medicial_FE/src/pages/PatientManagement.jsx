import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPatients, getMedicineHistory } from "@/services/patientService";
import styles from '@/assets/styles/patientsManagement.module.css';

export default function PatientsManagement() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");

    const [showModal, setShowModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [medicineHistory, setMedicineHistory] = useState([]);

    useEffect(() => {
        getAllPatients()
            .then((patients) => {
                const mapped = patients.map((p) => ({
                    id: p.id,
                    patientCode: p.patientCode,
                    fullName: p.fullName,
                    gender: p.gender === "male" ? "Nam" : p.gender === "female" ? "Nữ" : "Khác",
                    dob: p.dob ? new Date(p.dob).toLocaleDateString("vi-VN") : "-",
                    department: p.department,
                    roomName: p.roomName || "-",
                    phone: p.phone || "-",
                    status: p.status === "active" ? "Đang điều trị" : "Đã xuất viện",
                    createdAt: new Date(p.createdAt).toLocaleString("vi-VN"),
                }));
                setRows(mapped);
            })
            .catch((err) => {
                console.error("Lỗi khi lấy dữ liệu bệnh nhân:", err);
                alert("Không thể tải danh sách bệnh nhân");
            });
    }, []);

    const filtered = useMemo(() => {
        return rows.filter(
            (r) =>
                status === "all" || (status === "active" ? r.status === "Đang điều trị" : r.status === "Đã xuất viện") &&
                (q === "" || [r.fullName, r.patientCode, r.department, r.roomName].join(" ").toLowerCase().includes(q.toLowerCase()))
        );
    }, [rows, q, status]);

    const handleViewMedicineHistory = async (patient) => {
        setSelectedPatient(patient);
        try {
            const history = await getMedicineHistory(patient.id);
            setMedicineHistory(history);
            setShowModal(true);
        } catch (err) {
            console.error("Lỗi khi tải lịch sử đơn thuốc:", err);
            alert("Không thể tải lịch sử đơn thuốc!");
        }
    };

    return (
        <div className={styles.page}>
            <div className="container-fluid py-4">
                <div className="container-lg">

                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className={styles.chip}><i className="bi bi-people-fill me-1"></i></span>
                            <h4 className="mb-0 fw-bold">Quản lý bệnh nhân</h4>
                        </div>
                        <div>
                            <button className={`btn ${styles.btnTeal} rounded-pill`} onClick={() => navigate("/patients/add")}>
                                <i className="bi bi-plus-lg me-1"></i> Thêm mới
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className={`glass ${styles.glass} ${styles.rounded2xl} p-3 p-md-4 mb-3 toolbar`}>
                        <div className="row g-2 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label">Tìm kiếm</label>
                                <input
                                    className="form-control"
                                    placeholder="Tên, mã bệnh nhân, phòng..."
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Trạng thái</label>
                                <select
                                    className="form-select"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="active">Đang điều trị</option>
                                    <option value="discharged">Đã xuất viện</option>
                                </select>
                            </div>
                            <div className="col-md-2 text-md-end">
                                <label className="form-label d-block"> </label>
                                <button
                                    className="btn btn-light rounded-pill w-100"
                                    onClick={() => { setQ(""); setStatus("all"); }}
                                >
                                    <i className="bi bi-x-circle me-1"></i> Xóa lọc
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className={`glass ${styles.glass} ${styles.rounded2xl} p-2 p-md-3`}>
                        <div className="table-responsive">
                            <table className="table align-middle ">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Mã BN</th>
                                        <th>Họ tên</th>
                                        <th>Giới tính</th>
                                        <th>Ngày sinh</th>
                                        <th>Khoa</th>
                                        <th>Phòng</th>
                                        <th>SĐT</th>
                                        <th>Trạng thái</th>
                                        <th>Đơn thuốc</th>
                                        <th className="text-end">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((r, idx) => (
                                        <tr key={r.id}>
                                            <td>{idx + 1}</td>
                                            <td>{r.patientCode}</td>
                                            <td>{r.fullName}</td>
                                            <td>{r.gender}</td>
                                            <td>{r.dob}</td>
                                            <td>{r.department}</td>
                                            <td>{r.roomName}</td>
                                            <td>{r.phone}</td>
                                            <td>
                                                <span className={`badge ${r.status === "Đang điều trị" ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary"}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn btn-outline-primary btn-sm" onClick={() => handleViewMedicineHistory(r)}>Xem</button>
                                            </td>
                                            <td className="text-end">
                                                <div className="btn-group btn-group-sm">
                                                    <button className="btn btn-outline-info" onClick={() => navigate(`/patient/${r.id}`)} title="Xem chi tiết">
                                                        <i className="bi bi-eye"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={11} className="text-center text-muted py-4">Không có dữ liệu</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Modal Lịch sử đơn thuốc */}
                    {showModal && (
                        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                            <div className="modal-dialog modal-lg modal-dialog-centered">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title">Lịch sử đơn thuốc - {selectedPatient.fullName}</h5>
                                        <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                    </div>
                                    <div className="modal-body">
                                        {medicineHistory.length === 0 ? (
                                            <p>Chưa có đơn thuốc nào.</p>
                                        ) : (
                                            <table className="table table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Tên thuốc</th>
                                                        <th>Liều lượng</th>
                                                        <th>Tổng số lượng</th>
                                                        <th>Ngày kê lần cuối</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {medicineHistory.map((m, i) => (
                                                        <tr key={i}>
                                                            <td>{i + 1}</td>
                                                            <td>{m.medicineName}</td>
                                                            <td>{m.dosage}</td>
                                                            <td>{m.totalPrescribedQuantity}</td>
                                                            <td>{new Date(m.lastPrescribedAt).toLocaleDateString("vi-VN")}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                    <div className="modal-footer">
                                        <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Đóng</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

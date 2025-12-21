import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPatients, getMedicineHistory, getReport } from "@/services/patientService";
import styles from "@/assets/styles/patientsManagement.module.css";

export default function PatientsManagement() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [medicineHistory, setMedicineHistory] = useState([]);

    const [showReport, setShowReport] = useState(false);
    const [report, setReport] = useState(null);

    useEffect(() => {
        setLoading(true);
        getAllPatients()
            .then((patients) => {
                const mapped = patients.map((p) => ({
                    id: p.id,
                    patientCode: p.patientCode,
                    fullName: p.fullName,
                    gender: p.gender === "male" ? "Nam" : p.gender === "female" ? "Nữ" : "Khác",
                    dob: p.dob ? new Date(p.dob).toLocaleDateString("vi-VN") : "-",
                    department: p.department || "-",
                    roomName: p.roomName || "-",
                    phone: p.phone || "-",
                    rawStatus: p.status,
                    status: p.status === "active" ? "Đang điều trị" : "Đã xuất viện",
                    createdAt: new Date(p.createdAt).toLocaleString("vi-VN"),
                }));
                setRows(mapped);
            })
            .catch(() => alert("Không thể tải danh sách bệnh nhân"))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        return rows.filter((r) =>
            (status === "all" || r.rawStatus === status) &&
            (q === "" ||
                [r.fullName, r.patientCode, r.department, r.roomName]
                    .join(" ")
                    .toLowerCase()
                    .includes(q.toLowerCase()))
        );
    }, [rows, q, status]);

    const handleViewMedicineHistory = async (patient) => {
        setSelectedPatient(patient);
        try {
            const history = await getMedicineHistory(patient.id);
            setMedicineHistory(history);
            setShowModal(true);
        } catch {
            alert("Không thể tải lịch sử đơn thuốc!");
        }
    };

    const handleViewReport = async (patient) => {
        setSelectedPatient(patient);
        try {
            const rp = await getReport(patient.id);
            setReport(rp);
            setShowReport(true);
        } catch {
            alert("Không thể tải báo cáo!");
        }
    };

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">

                {/* =================== HEADER ==================== */}
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <span className={styles.chip}>
                            <i className="bi bi-people-fill"></i>
                        </span>
                        <h4 className={`${styles.pageTitle} mb-0`}>Quản lý bệnh nhân</h4>
                    </div>

                    <button
                        className={styles.btnTeal}
                        onClick={() => navigate("/patients/add")}
                    >
                        <i className="bi bi-plus-lg me-2"></i>
                        Thêm bệnh nhân
                    </button>
                </div>

                {/* =================== FILTER TOOLBAR ==================== */}
                <div className={`${styles.glass} ${styles.toolbar} p-3 p-md-4 mb-3`}>
                    <div className="row g-3 align-items-end">
                        <div className="col-md-5">
                            <label className={`form-label ${styles.formLabel}`}>Tìm kiếm</label>
                            <input
                                className={`form-control ${styles.formControl}`}
                                placeholder="Tên, mã bệnh nhân, phòng..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className={`form-label ${styles.formLabel}`}>Trạng thái</label>
                            <select
                                className={`form-select ${styles.formSelect}`}
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="all">Tất cả</option>
                                <option value="active">Đang điều trị</option>
                                <option value="discharged">Đã xuất viện</option>
                            </select>
                        </div>

                        <div className="col-md-2">
                            <label className="form-label d-none d-md-block">&nbsp;</label>
                            <button
                                className={`${styles.btnClear} w-100`}
                                onClick={() => { setQ(""); setStatus("all"); }}
                            >
                                <i className="bi bi-x-circle me-1"></i>
                                Xóa lọc
                            </button>
                        </div>
                    </div>
                </div>

                {/* =================== TABLE ==================== */}
                <div className={`${styles.glass} ${styles.tableCard} p-2 p-md-3`}>
                    <div className="table-responsive">
                        <table className={`table ${styles.table} align-middle mb-0`}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Mã BN</th>
                                    <th>Họ tên</th>
                                    <th>Giới tính</th>
                                    <th>Ngày sinh</th>
                                    <th>Khoa</th>
                                    {/* <th>Phòng</th> */}
                                    <th>SĐT</th>
                                    <th>Trạng thái</th>
                                    <th>Đơn thuốc</th>
                                    {/* <th>Báo cáo</th> */}
                                    <th className="text-end">Thao tác</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="12" className={styles.emptyState}>
                                            <div className="spinner-border text-primary mb-2"></div>
                                            <p className="mb-0">Đang tải dữ liệu...</p>
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className={styles.emptyState}>
                                            <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                            Không tìm thấy bệnh nhân
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((p, i) => (
                                        <tr key={p.id}>
                                            <td>{i + 1}</td>
                                            <td className="fw-semibold">{p.patientCode}</td>
                                            <td className="fw-semibold">{p.fullName}</td>
                                            <td>{p.gender}</td>
                                            <td>{p.dob}</td>
                                            <td>{p.department}</td>
                                            {/* <td>{p.roomName}</td> */}
                                            <td>{p.phone}</td>

                                            <td>
                                                <span className={p.rawStatus === "active" ? styles.badgeActive : styles.badgeDischarged}>
                                                    {p.status}
                                                </span>
                                            </td>

                                            <td> 
                                                <button
                                                    className={styles.btnView}
                                                    onClick={() => handleViewMedicineHistory(p)}
                                                    title="Xem lịch sử đơn thuốc"
                                                >
                                                    <i className="bi bi-prescription2"></i>
                                                </button>
                                            </td>

                                            <td hidden> 
                                                <button
                                                    className={styles.btnView}
                                                    onClick={() => handleViewReport(p)}
                                                    title="Báo cáo tổng hợp"
                                                >
                                                    <i className="bi bi-clipboard-data"></i>
                                                </button>
                                            </td>

                                            <td>
                                                <div className="d-flex justify-content-end gap-1">
                                                    <button
                                                        className={styles.btnEdit}
                                                        onClick={() => navigate(`/patients/edit/${p.id}`)}
                                                        title="Chỉnh sửa"
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </button>

                                                    <button
                                                        className={styles.btnInfo}
                                                        onClick={() => navigate(`/patient/${p.id}`)}
                                                        title="Xem chi tiết"
                                                    >
                                                        <i className="bi bi-eye"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* =================== MEDICINE HISTORY MODAL ==================== */}
                {showModal && (
                    <div className={styles.modalOverlay} onClick={(e) => {
                        if (e.target === e.currentTarget) setShowModal(false);
                    }}>
                        <div className={styles.modalContent}>
                            <div className={styles.modalHeader}>
                                <h5 className={styles.modalTitle}>
                                    <i className="bi bi-prescription2 me-2"></i>
                                    Lịch sử đơn thuốc – {selectedPatient?.fullName}
                                </h5>
                                <button
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>

                            <div className={styles.modalBody}>
                                {medicineHistory.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <i className="bi bi-inbox mb-2" style={{ fontSize: '2rem', display: 'block' }}></i>
                                        Chưa có đơn thuốc nào
                                    </div>
                                ) : (
                                    <table className="table table-hover mb-0">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '50px' }}>#</th>
                                                {/* <th>Thuốc</th> */}
                                                <th>Mã đơn thuốc</th>
                                                <th>Tổng SL</th>
                                                <th>Ngày kê lần cuối</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {medicineHistory.map((m, i) => (
                                                <tr key={i}>
                                                    <td>{i + 1}</td>
                                                    {/* <td className="fw-semibold">{m.medicineName}</td> */}
                                                    <td className="fw-semibold text-primary">{m.prescriptionCode || "-"}</td>
                                                    <td>{m.totalPrescribedQuantity}</td>
                                                    <td>{new Date(m.lastPrescribedAt).toLocaleDateString("vi-VN")}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className={styles.modalFooter}>
                                <button
                                    className={styles.btnModalClose}
                                    onClick={() => setShowModal(false)}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* =================== REPORT MODAL ==================== */}
                {showReport && (
                    <div className={styles.modalOverlay} onClick={(e) => {
                        if (e.target === e.currentTarget) setShowReport(false);
                    }}>
                        <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
                            <div className={styles.modalHeader}>
                                <h5 className={styles.modalTitle}>
                                    <i className="bi bi-clipboard-data me-2"></i>
                                    Báo cáo bệnh nhân
                                </h5>
                                <button
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowReport(false)}
                                ></button>
                            </div>

                            <div className={styles.modalBody}>
                                {report ? (
                                    <div className="row g-3">
                                        <div className="col-6" hidden>
                                            <div className="p-3 bg-white rounded" style={{ border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                                                <small className="text-muted d-block mb-1">Tổng số lần khám</small>
                                                <h4 className="mb-0 fw-bold" style={{ color: 'var(--teal-dark)' }}>{report.totalVisits}</h4>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="p-3 bg-white rounded" style={{ border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                                                <small className="text-muted d-block mb-1">Số loại thuốc đã kê</small>
                                                <h4 className="mb-0 fw-bold" style={{ color: 'var(--teal-dark)' }}>{report.totalMedicinesPrescribed}</h4>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="p-3 bg-white rounded" style={{ border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                                                <small className="text-muted d-block mb-1">Lần khám gần nhất</small>
                                                <div className="fw-semibold">
                                                    {report.lastVisit
                                                        ? new Date(report.lastVisit).toLocaleDateString("vi-VN")
                                                        : "-"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="p-3 bg-white rounded" style={{ border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                                                <small className="text-muted d-block mb-1">Phòng hiện tại</small>
                                                <div className="fw-semibold">{report.currentRoom || "-"}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        Không có dữ liệu báo cáo
                                    </div>
                                )}
                            </div>

                            <div className={styles.modalFooter}>
                                <button
                                    className={styles.btnModalClose}
                                    onClick={() => setShowReport(false)}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

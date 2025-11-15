import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPatients, getMedicineHistory, getReport } from "@/services/patientService";
import styles from "@/assets/styles/patientsManagement.module.css";

export default function PatientsManagement() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");

    const [showModal, setShowModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [medicineHistory, setMedicineHistory] = useState([]);

    // Modal Report
    const [showReport, setShowReport] = useState(false);
    const [report, setReport] = useState(null);

    // LOAD DATA
    useEffect(() => {
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
            .catch(() => alert("Không thể tải danh sách bệnh nhân"));
    }, []);

    // FILTER
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

    // VIEW MEDICINE HISTORY
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

    // VIEW REPORT
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
            <div className="container-fluid py-4">
                <div className="container-lg">

                    {/* HEADER */}
                    <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className={styles.chip}>
                                <i className="bi bi-people-fill me-1"></i>
                            </span>
                            <h4 className="mb-0 fw-bold">Quản lý bệnh nhân</h4>
                        </div>

                        <button
                            className={`btn ${styles.btnTeal} rounded-pill px-3 py-2`}
                            onClick={() => navigate("/patients/add")}
                        >
                            <i className="bi bi-plus-lg me-1"></i>
                            Thêm bệnh nhân
                        </button>
                    </div>

                    {/* FILTER BAR */}
                    <div className={`glass ${styles.glass} ${styles.rounded2xl} p-3 p-md-4 mb-4`}>
                        <div className="row g-3 align-items-end">

                            <div className="col-md-4">
                                <label className="form-label fw-semibold">Tìm kiếm</label>
                                <input
                                    className="form-control"
                                    placeholder="Tên, mã bệnh nhân, phòng..."
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label fw-semibold">Trạng thái</label>
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

                            <div className="col-md-2">
                                <button
                                    className="btn btn-light rounded-pill mt-md-4 w-100"
                                    onClick={() => { setQ(""); setStatus("all"); }}
                                >
                                    <i className="bi bi-x-circle me-1"></i> Xóa lọc
                                </button>
                            </div>

                        </div>
                    </div>

                    {/* TABLE */}
                    <div className={`glass ${styles.glass} ${styles.rounded2xl} p-3`}>
                        <div className="table-responsive">
                            <table className="table align-middle">
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
                                        <th>Báo cáo</th>
                                        <th className="text-end">Thao tác</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filtered.map((p, i) => (
                                        <tr key={p.id}>
                                            <td>{i + 1}</td>
                                            <td>{p.patientCode}</td>
                                            <td className="fw-semibold">{p.fullName}</td>
                                            <td>{p.gender}</td>
                                            <td>{p.dob}</td>
                                            <td>{p.department}</td>
                                            <td>{p.roomName}</td>
                                            <td>{p.phone}</td>

                                            <td>
                                                <span
                                                    className={`badge px-3 py-2 ${
                                                        p.rawStatus === "active"
                                                            ? "bg-success-subtle text-success fw-semibold"
                                                            : "bg-secondary-subtle text-secondary fw-semibold"
                                                    }`}
                                                    style={{ borderRadius: "12px" }}
                                                >
                                                    {p.status}
                                                </span>
                                            </td>

                                            <td>
                                                <button
                                                    className="btn btn-outline-primary btn-sm"
                                                    onClick={() => handleViewMedicineHistory(p)}
                                                >
                                                    Xem
                                                </button>
                                            </td>

                                            <td>
                                                <button
                                                    className="btn btn-outline-primary btn-sm"
                                                    title="Báo cáo tổng hợp"
                                                    onClick={() => handleViewReport(p)}
                                                    style={{ borderRadius: "10px" }}
                                                >
                                                    <i className="bi bi-clipboard-data"></i>
                                                </button>
                                            </td>

                                            <td>

                                                {/* EDIT */}
                                                <button
                                                    className="btn btn-outline-warning btn-sm me-2"
                                                    onClick={() => navigate(`/patients/edit/${p.id}`)}
                                                    title="Chỉnh sửa"
                                                >
                                                    <i className="bi bi-pencil-square"></i>
                                                </button>

                                                {/* VIEW */}
                                                <button
                                                    className="btn btn-outline-info btn-sm"
                                                    onClick={() => navigate(`/patient/${p.id}`)}
                                                    title="Xem chi tiết"
                                                >
                                                    <i className="bi bi-eye"></i>
                                                </button>

                                            </td>

                                        </tr>
                                    ))}

                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan="11" className="text-center text-muted py-4">
                                                Không có dữ liệu
                                            </td>
                                        </tr>
                                    )}
                                </tbody>

                            </table>
                        </div>
                    </div>

                    {/* MEDICINE HISTORY MODAL */}
                    {showModal && (
                        <div className="modal fade show d-block"
                            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                            <div className="modal-dialog modal-lg modal-dialog-centered">
                                <div className="modal-content">

                                    <div className="modal-header bg-primary text-white">
                                        <h5 className="modal-title">
                                            Lịch sử đơn thuốc – {selectedPatient.fullName}
                                        </h5>
                                        <button
                                            className="btn-close btn-close-white"
                                            onClick={() => setShowModal(false)}
                                        ></button>
                                    </div>

                                    <div className="modal-body">
                                        {medicineHistory.length === 0 ? (
                                            <p className="text-muted">Chưa có đơn thuốc nào.</p>
                                        ) : (
                                            <table className="table table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Thuốc</th>
                                                        <th>Liều</th>
                                                        <th>Tổng SL</th>
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
                                        <button
                                            className="btn btn-secondary px-4"
                                            onClick={() => setShowModal(false)}
                                        >
                                            Đóng
                                        </button>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}

                    {/* REPORT MODAL */}
                    {showReport && (
                        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
                            <div className="modal-dialog modal-md modal-dialog-centered">
                                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "20px" }}>

                                    {/* HEADER */}
                                    <div
                                        className="modal-header text-white"
                                        style={{
                                            background: "linear-gradient(135deg, #3aaed8, #4bc0c8)",
                                            borderTopLeftRadius: "20px",
                                            borderTopRightRadius: "20px"
                                        }}
                                    >
                                        <h5 className="modal-title fw-bold">
                                            <i className="bi bi-clipboard-data me-2"></i>
                                            Báo cáo bệnh nhân
                                        </h5>
                                        <button className="btn-close btn-close-white" onClick={() => setShowReport(false)}></button>
                                    </div>

                                    {/* BODY */}
                                    <div className="modal-body" style={{ background: "#f8fafc" }}>
                                        {report ? (
                                            <ul className="list-group list-group-flush">

                                                <li className="list-group-item py-3">
                                                    <strong>Tổng số lần khám: </strong>
                                                    <span className="badge bg-info text-dark px-3">{report.totalVisits}</span>
                                                </li>

                                                <li className="list-group-item py-3">
                                                    <strong>Số loại thuốc đã kê: </strong>
                                                    <span className="badge bg-primary-subtle text-primary px-3">
                                                        {report.totalMedicinesPrescribed}
                                                    </span>
                                                </li>

                                                <li className="list-group-item py-3">
                                                    <strong>Lần khám gần nhất: </strong>
                                                    {report.lastVisit
                                                        ? new Date(report.lastVisit).toLocaleDateString("vi-VN")
                                                        : "-"}
                                                </li>

                                                <li className="list-group-item py-3">
                                                    <strong>Phòng hiện tại: </strong>
                                                    {report.currentRoom || "-"}
                                                </li>

                                            </ul>
                                        ) : (
                                            <p className="text-muted">Không có dữ liệu báo cáo.</p>
                                        )}
                                    </div>

                                    {/* FOOTER */}
                                    <div
                                        className="modal-footer"
                                        style={{ background: "#eef4f7", borderBottomLeftRadius: "20px", borderBottomRightRadius: "20px" }}
                                    >
                                        <button
                                            className="btn btn-secondary rounded-pill px-4"
                                            onClick={() => setShowReport(false)}
                                        >
                                            Đóng
                                        </button>
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

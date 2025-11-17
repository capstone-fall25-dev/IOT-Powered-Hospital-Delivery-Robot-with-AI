// src/pages/PrescriptionManagement.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPrescriptions, softDeletePrescription, restorePrescription } from "@/services/prescriptionServices";
import styles from "@/assets/styles/prescriptionManagement.module.css";

const statusLabel = (status) => {
    switch (status) {
        case "pending": return "Chờ duyệt";
        case "approved": return "Đã duyệt";
        case "dispensed": return "Đã cấp phát";
        case "canceled": return "Đã hủy";
        default: return status;
    }
};

const statusBadgeClass = (status) => {
    switch (status) {
        case "pending": return styles.badgePending;
        case "approved": return styles.badgeApproved;
        case "dispensed": return styles.badgeDispensed;
        case "canceled": return styles.badgeCanceled;
        default: return "";
    }
};

export default function PrescriptionManagement() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await getAllPrescriptions();
                setRows(data);
            } catch (err) {
                console.error("Lỗi khi tải danh sách đơn thuốc:", err);
                alert("Không thể tải danh sách đơn thuốc");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const filtered = useMemo(() => {
        return rows.filter((r) => {
            const matchStatus =
                status === "all" ? true : r.status === status;
            const keyword = q.trim().toLowerCase();
            const matchSearch =
                keyword === "" ||
                [r.prescriptionCode, r.patientName]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(keyword);

            return matchStatus && matchSearch;
        });
    }, [rows, q, status]);

    const handleSoftDelete = async (id) => {
        if (!window.confirm("Bạn có chắc muốn hủy đơn thuốc này?")) return;
        try {
            await softDeletePrescription(id);
            setRows((prev) =>
                prev.map((p) =>
                    p.id === id ? { ...p, status: "canceled" } : p
                )
            );
        } catch (err) {
            console.error(err);
            alert("Không thể hủy đơn thuốc");
        }
    };

    const handleRestore = async (id) => {
        try {
            const res = await restorePrescription(id);
            setRows((prev) =>
                prev.map((p) => (p.id === id ? { ...p, status: res.status } : p))
            );
        } catch (err) {
            console.error(err);
            alert("Không thể khôi phục đơn thuốc");
        }
    };

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">

                {/* =================== HEADER ==================== */}
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <span className={styles.chip}>
                            <i className="bi bi-file-medical-fill"></i>
                        </span>
                        <h4 className={`${styles.pageTitle} mb-0`}>Quản lý đơn thuốc</h4>
                    </div>

                    <button
                        className={styles.btnTeal}
                        onClick={() => navigate("/prescriptions/add")}
                    >
                        <i className="bi bi-plus-lg me-2"></i>
                        Thêm đơn thuốc
                    </button>
                </div>

                {/* =================== FILTER TOOLBAR ==================== */}
                <div className={`${styles.glass} ${styles.toolbar} p-3 p-md-4 mb-3`}>
                    <div className="row g-3 align-items-end">
                        <div className="col-md-5">
                            <label className={`form-label ${styles.formLabel}`}>Tìm kiếm</label>
                            <input
                                className={`form-control ${styles.formControl}`}
                                placeholder="Mã đơn, tên bệnh nhân..."
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
                                <option value="pending">Chờ duyệt</option>
                                <option value="approved">Đã duyệt</option>
                                <option value="dispensed">Đã cấp phát</option>
                                <option value="canceled">Đã hủy</option>
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
                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <div className="spinner-border text-primary"></div>
                            <p className={styles.loadingText}>Đang tải dữ liệu...</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className={`table ${styles.table} align-middle mb-0`}>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Mã đơn</th>
                                        <th>Bệnh nhân</th>
                                        <th>Thuốc</th>
                                        <th>Trạng thái</th>
                                        <th>Ngày tạo</th>
                                        <th className="text-end">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className={styles.emptyState}>
                                                <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                                Không tìm thấy đơn thuốc
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((r, idx) => {
                                            const medicineSummary =
                                                (r.items || [])
                                                    .map((i) => i.medicineName || i.medicineCode)
                                                    .filter(Boolean)
                                                    .slice(0, 3)
                                                    .join(", ") +
                                                ((r.items || []).length > 3 ? "..." : "");

                                            return (
                                                <tr key={r.id}>
                                                    <td>{idx + 1}</td>
                                                    <td className="fw-semibold">{r.prescriptionCode}</td>
                                                    <td className="fw-semibold">{r.patientName}</td>
                                                    <td style={{ maxWidth: 260 }}>
                                                        <small className="text-muted">
                                                            {medicineSummary || "—"}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <span className={statusBadgeClass(r.status)}>
                                                            {statusLabel(r.status)}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(r.createdAt).toLocaleString("vi-VN")}</td>
                                                    <td>
                                                        <div className="d-flex justify-content-end gap-1">
                                                            <button
                                                                className={styles.btnView}
                                                                onClick={() => navigate(`/prescriptions/${r.id}`)}
                                                                title="Xem chi tiết"
                                                            >
                                                                <i className="bi bi-eye"></i>
                                                            </button>
                                                            <button
                                                                className={styles.btnEdit}
                                                                onClick={() => navigate(`/prescriptions/${r.id}/edit`)}
                                                                title="Chỉnh sửa"
                                                            >
                                                                <i className="bi bi-pencil"></i>
                                                            </button>
                                                            {r.status !== "canceled" ? (
                                                                <button
                                                                    className={styles.btnDelete}
                                                                    onClick={() => handleSoftDelete(r.id)}
                                                                    title="Hủy đơn"
                                                                >
                                                                    <i className="bi bi-x-circle"></i>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className={styles.btnRestore}
                                                                    onClick={() => handleRestore(r.id)}
                                                                    title="Khôi phục"
                                                                >
                                                                    <i className="bi bi-arrow-counterclockwise"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllMedicines, getAllCategories, deleteMedicine } from "@/services/medicineService";
import styles from '@/assets/styles/medicinesManagement.module.css';

export default function MedicinesManagement() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [categories, setCategories] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [selectedMedicine, setSelectedMedicine] = useState(null);
    const [medicineHistory, setMedicineHistory] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setLoading(true);
        Promise.all([getAllMedicines(), getAllCategories()])
            .then(([medicines, cats]) => {
                const mapped = medicines.map((m) => ({
                    id: m.id,
                    medicineCode: m.medicineCode,
                    name: m.name,
                    categoryName: m.categoryName || "-",
                    categoryId: m.categoryId,
                    unit: m.unit,
                    stockQuantity: m.stockQuantity,
                    expiryDate: m.expiryDate ? new Date(m.expiryDate).toLocaleDateString("vi-VN") : "-",
                    status: m.status === 0 ? "Sẵn sàng" : "Hết hạn",
                    description: m.description || "-",
                }));
                setRows(mapped);
                setCategories(cats);
            })
            .catch((err) => {
                console.error("Lỗi khi tải dữ liệu:", err);
                alert("Không thể tải dữ liệu");
            })
            .finally(() => setLoading(false));
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa thuốc "${name}"?`)) return;
        
        try {
            await deleteMedicine(id);
            alert("Xóa thuốc thành công!");
            loadData();
        } catch (err) {
            console.error("Lỗi khi xóa thuốc:", err);
            alert("Không thể xóa thuốc");
        }
    };

    const filtered = useMemo(() => {
        return rows.filter(
            (r) =>
                (status === "all" || r.status === status) &&
                (categoryFilter === "all" || r.categoryId === Number(categoryFilter)) &&
                (q === "" || [r.name, r.medicineCode, r.description, r.categoryName].join(" ").toLowerCase().includes(q.toLowerCase()))
        );
    }, [rows, q, status, categoryFilter]);

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">

                {/* =================== HEADER ==================== */}
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <span className={styles.chip}>
                            <i className="bi bi-capsule"></i>
                        </span>
                        <h4 className={`${styles.pageTitle} mb-0`}>Kho thuốc</h4>
                    </div>

                    <div className="d-flex gap-2 flex-wrap">
                        <button 
                            className={styles.btnSecondary}
                            onClick={() => navigate("/categories")}
                        >
                            <i className="bi bi-grid me-1"></i>
                            Quản lý danh mục
                        </button>
                        <button 
                            className={styles.btnTeal}
                            onClick={() => navigate("/medicines/add")}
                        >
                            <i className="bi bi-plus-lg me-2"></i>
                            Thêm mới
                        </button>
                    </div>
                </div>

                {/* =================== FILTER TOOLBAR ==================== */}
                <div className={`${styles.glass} ${styles.toolbar} p-3 p-md-4 mb-3`}>
                    <div className="row g-3 align-items-end">
                        <div className="col-md-4">
                            <label className={`form-label ${styles.formLabel}`}>Tìm kiếm</label>
                            <input
                                className={`form-control ${styles.formControl}`}
                                placeholder="Tên, mã thuốc, mô tả..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className={`form-label ${styles.formLabel}`}>Danh mục</label>
                            <select 
                                className={`form-select ${styles.formSelect}`}
                                value={categoryFilter} 
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="all">Tất cả</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-3">
                            <label className={`form-label ${styles.formLabel}`}>Trạng thái</label>
                            <select 
                                className={`form-select ${styles.formSelect}`}
                                value={status} 
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="all">Tất cả</option>
                                <option value="Sẵn sàng">Sẵn sàng</option>
                                <option value="Hết hạn">Hết hạn</option>
                            </select>
                        </div>

                        <div className="col-md-2">
                            <label className="form-label d-none d-md-block">&nbsp;</label>
                            <button
                                className={`${styles.btnClear} w-100`}
                                onClick={() => {
                                    setQ("");
                                    setStatus("all");
                                    setCategoryFilter("all");
                                }}
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
                                    <th style={{ width: '50px' }}>#</th>
                                    <th>Mã thuốc</th>
                                    <th>Tên thuốc</th>
                                    <th>Danh mục</th>
                                    <th>Đơn vị</th>
                                    <th>Số lượng tồn</th>
                                    <th>Hạn sử dụng</th>
                                    <th>Trạng thái</th>
                                    <th>Mô tả</th>
                                    <th className="text-end">Thao tác</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="10" className={styles.loadingState}>
                                            <div className="spinner-border text-primary mb-2"></div>
                                            <p className="mb-0">Đang tải dữ liệu...</p>
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className={styles.emptyState}>
                                            <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                            Không tìm thấy thuốc
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((r, idx) => (
                                        <tr key={r.id}>
                                            <td>{idx + 1}</td>
                                            <td className="fw-semibold">{r.medicineCode}</td>
                                            <td className="fw-semibold">{r.name}</td>
                                            <td>{r.categoryName}</td>
                                            <td>{r.unit}</td>
                                            <td>
                                                <span className={r.stockQuantity < 10 ? styles.stockLow : styles.stockNormal}>
                                                    {r.stockQuantity}
                                                </span>
                                            </td>
                                            <td>{r.expiryDate}</td>
                                            <td>
                                                <span className={r.status === "Sẵn sàng" ? styles.badgeAvailable : styles.badgeExpired}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="text-truncate" style={{ maxWidth: '150px' }}>
                                                {r.description}
                                            </td>
                                            <td>
                                                <div className="d-flex justify-content-end gap-1">
                                                    <button 
                                                        className={styles.btnView}
                                                        onClick={() => navigate(`/medicines/${r.id}`)}
                                                        title="Xem chi tiết"
                                                    >
                                                        <i className="bi bi-eye"></i>
                                                    </button>
                                                    <button 
                                                        className={styles.btnEdit}
                                                        onClick={() => navigate(`/medicines/edit/${r.id}`)}
                                                        title="Sửa"
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button 
                                                        className={styles.btnDelete}
                                                        onClick={() => handleDelete(r.id, r.name)}
                                                        title="Xóa"
                                                    >
                                                        <i className="bi bi-trash"></i>
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

                {/* =================== MODAL ==================== */}
                {showModal && (
                    <div className={styles.modalOverlay} onClick={(e) => {
                        if (e.target === e.currentTarget) setShowModal(false);
                    }}>
                        <div className={styles.modalContent}>
                            <div className={styles.modalHeader}>
                                <h5 className={styles.modalTitle}>
                                    <i className="bi bi-clock-history me-2"></i>
                                    Lịch sử thuốc - {selectedMedicine?.name}
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
                                        Chưa có lịch sử thuốc
                                    </div>
                                ) : (
                                    <table className="table table-hover mb-0">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '50px' }}>#</th>
                                                <th>Tên bệnh nhân</th>
                                                <th>Liều lượng</th>
                                                <th>Số lượng kê</th>
                                                <th>Ngày kê lần cuối</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {medicineHistory.map((m, i) => (
                                                <tr key={i}>
                                                    <td>{i + 1}</td>
                                                    <td className="fw-semibold">{m.patientName}</td>
                                                    <td>{m.dosage}</td>
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

            </div>
        </div>
    );
}
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

    const [showModal, setShowModal] = useState(false);
    const [selectedMedicine, setSelectedMedicine] = useState(null);
    const [medicineHistory, setMedicineHistory] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        getAllMedicines()
            .then((medicines) => {
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
            })
            .catch((err) => {
                console.error("Lỗi khi lấy danh sách thuốc:", err);
                alert("Không thể tải danh sách thuốc");
            });

        getAllCategories()
            .then(setCategories)
            .catch((err) => {
                console.error("Lỗi khi lấy danh mục:", err);
            });
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
            <div className="container-fluid py-4">
                <div className="container-lg">
                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className={styles.chip}><i className="bi bi-box-seam me-1"></i></span>
                            <h4 className="mb-0 fw-bold">Kho thuốc</h4>
                        </div>
                        <div className="d-flex gap-2 flex-wrap">
                            <button 
                                className={`btn btn-outline-secondary rounded-pill`} 
                                onClick={() => navigate("/categories")}
                            >
                                <i className="bi bi-grid me-1"></i> Quản lý danh mục
                            </button>
                            <button 
                                className={`btn ${styles.btnTeal} rounded-pill`} 
                                onClick={() => navigate("/medicines/add")}
                            >
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
                                    placeholder="Tên, mã thuốc, mô tả..."
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">Danh mục</label>
                                <select 
                                    className="form-select" 
                                    value={categoryFilter} 
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                >
                                    <option value="all">Tất cả</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.categoryName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">Trạng thái</label>
                                <select 
                                    className="form-select" 
                                    value={status} 
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="Sẵn sàng">Sẵn sàng</option>
                                    <option value="Hết hạn">Hết hạn</option>
                                </select>
                            </div>
                            <div className="col-md-2 text-md-end">
                                <label className="form-label d-block"> </label>
                                <button
                                    className="btn btn-light rounded-pill w-100"
                                    onClick={() => {
                                        setQ("");
                                        setStatus("all");
                                        setCategoryFilter("all");
                                    }}
                                >
                                    <i className="bi bi-x-circle me-1"></i> Xóa lọc
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className={`glass ${styles.glass} ${styles.rounded2xl} p-2 p-md-3`}>
                        <div className="table-responsive">
                            <table className="table align-middle">
                                <thead>
                                    <tr>
                                        <th>#</th>
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
                                    {filtered.map((r, idx) => (
                                        <tr key={r.id}>
                                            <td>{idx + 1}</td>
                                            <td>{r.medicineCode}</td>
                                            <td>{r.name}</td>
                                            <td>{r.categoryName}</td>
                                            <td>{r.unit}</td>
                                            <td>{r.stockQuantity}</td>
                                            <td>{r.expiryDate}</td>
                                            <td>
                                                <span className={`badge ${r.status === "Sẵn sàng" ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td>{r.description}</td>
                                            <td className="text-end">
                                                <div className="d-flex gap-1 justify-content-end">
                                                    <button 
                                                        className="btn btn-outline-info btn-sm" 
                                                        onClick={() => navigate(`/medicines/${r.id}`)}
                                                        title="Xem chi tiết"
                                                    >
                                                        <i className="bi bi-eye"></i>
                                                    </button>
                                                    <button 
                                                        className="btn btn-outline-primary btn-sm" 
                                                        onClick={() => navigate(`/medicines/edit/${r.id}`)}
                                                        title="Sửa"
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button 
                                                        className="btn btn-outline-danger btn-sm" 
                                                        onClick={() => handleDelete(r.id, r.name)}
                                                        title="Xóa"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="text-center text-muted py-4">
                                                <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                                                Không có dữ liệu
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Modal */}
                    {showModal && (
                        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                            <div className="modal-dialog modal-lg modal-dialog-centered">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title">Lịch sử thuốc - {selectedMedicine?.name}</h5>
                                        <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                    </div>
                                    <div className="modal-body">
                                        {medicineHistory.length === 0 ? (
                                            <p>Chưa có lịch sử thuốc.</p>
                                        ) : (
                                            <table className="table table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
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
                                                            <td>{m.patientName}</td>
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
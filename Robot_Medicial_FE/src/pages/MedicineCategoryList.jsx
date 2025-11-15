import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllCategories, createCategory, updateCategory, deleteCategory, getAllMedicines } from "@/services/medicineService";
import styles from '@/assets/styles/medicinesManagement.module.css';

export default function MedicineCategoryList() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);

    const [newName, setNewName] = useState("");
    const [editData, setEditData] = useState({ id: "", name: "" });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        try {
            // Load cả categories và medicines
            const [categories, medicines] = await Promise.all([
                getAllCategories(),
                getAllMedicines()
            ]);

            // Đếm số lượng thuốc cho mỗi category
            const categoriesWithCount = categories.map(cat => {
                const medicineCount = medicines.filter(med => med.categoryId === cat.id).length;
                return {
                    ...cat,
                    medicineCount
                };
            });

            console.log("Categories with count:", categoriesWithCount); // Debug
            setRows(categoriesWithCount);
        } catch (err) {
            console.error("Lỗi khi tải danh mục:", err);
            alert("Không thể tải danh sách danh mục");
        } finally {
            setLoading(false);
        }
    }

    async function handleAdd(e) {
        e.preventDefault();
        if (!newName.trim()) {
            alert("Vui lòng nhập tên danh mục!");
            return;
        }

        setSubmitting(true);
        try {
            await createCategory({ name: newName.trim() });
            alert("Thêm danh mục thành công!");
            setShowAdd(false);
            setNewName("");
            load();
        } catch (err) {
            console.error("Lỗi khi thêm danh mục:", err);
            alert("Không thể thêm danh mục. Vui lòng thử lại!");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleEdit(e) {
        e.preventDefault();
        if (!editData.name.trim()) {
            alert("Vui lòng nhập tên danh mục!");
            return;
        }

        setSubmitting(true);
        try {
            await updateCategory(editData.id, { name: editData.name.trim() });
            alert("Cập nhật danh mục thành công!");
            setShowEdit(false);
            load();
        } catch (err) {
            console.error("Lỗi khi cập nhật danh mục:", err);
            alert("Không thể cập nhật danh mục. Vui lòng thử lại!");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id, name, medicineCount) {
        if (medicineCount > 0) {
            if (!window.confirm(`Danh mục "${name}" đang có ${medicineCount} thuốc. Bạn có chắc chắn muốn xóa?`)) return;
        } else {
            if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}"?`)) return;
        }
        
        try {
            await deleteCategory(id);
            alert("Xóa danh mục thành công!");
            load();
        } catch (err) {
            console.error("Lỗi khi xóa danh mục:", err);
            alert("Không thể xóa danh mục. Có thể danh mục đang được sử dụng!");
        }
    }

    return (
        <div className={styles.page}>
            <div className="container-fluid py-4">
                <div className="container-lg">
                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className={styles.chip}>
                                <i className="bi bi-grid me-1"></i>
                            </span>
                            <h4 className="mb-0 fw-bold" style={{ color: '#0b1324' }}>Quản lý danh mục thuốc</h4>
                        </div>
                        <div className="d-flex gap-2 flex-wrap">
                            <button 
                                className="btn btn-outline-secondary rounded-pill" 
                                onClick={() => navigate("/medicines")}
                            >
                                <i className="bi bi-arrow-left me-1"></i> Quay lại
                            </button>
                            <button 
                                className={`btn ${styles.btnTeal} rounded-pill`}
                                onClick={() => setShowAdd(true)}
                            >
                                <i className="bi bi-plus-lg me-1"></i> Thêm danh mục
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className={`glass ${styles.glass} ${styles.rounded2xl} p-3 p-md-4`}>
                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Đang tải...</span>
                                </div>
                                <p className="mt-3 text-muted">Đang tải danh mục...</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className={`table align-middle ${styles.categoryTable}`}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '80px', color: '#0b1324' }}>#</th>
                                            <th style={{ color: '#0b1324' }}>Tên danh mục</th>
                                            <th style={{ width: '180px', color: '#0b1324' }}>Số lượng thuốc</th>
                                            <th className="text-end" style={{ width: '180px', color: '#0b1324' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((c, i) => (
                                            <tr key={c.id}>
                                                <td style={{ color: '#0b1324' }}>{i + 1}</td>
                                                <td>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className={styles.chip}>
                                                            <i className="bi bi-tag-fill"></i>
                                                        </span>
                                                        <span className="fw-semibold" style={{ color: '#0b1324' }}>
                                                            {c.name || c.categoryName || "Không có tên"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${c.medicineCount > 0 ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'}`}>
                                                        <i className="bi bi-capsule me-1"></i>
                                                        {c.medicineCount} thuốc
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <div className="d-flex gap-1 justify-content-end">
                                                        <button
                                                            className="btn btn-outline-primary btn-sm"
                                                            onClick={() => {
                                                                setEditData({ id: c.id, name: c.name || c.categoryName });
                                                                setShowEdit(true);
                                                            }}
                                                            title="Sửa"
                                                        >
                                                            <i className="bi bi-pencil"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => handleDelete(c.id, c.name || c.categoryName, c.medicineCount)}
                                                            title="Xóa"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {rows.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="text-center text-muted py-5">
                                                    <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                                                    <p className="mb-0">Chưa có danh mục nào</p>
                                                    <small>Nhấn "Thêm danh mục" để tạo mới</small>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                       {/* Stats Footer */}
                        {!loading && rows.length > 0 && (
                            <div className="mt-3 pt-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div className="text-muted small">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Tổng cộng: <strong>{rows.length}</strong> danh mục
                                </div>
                                <div className="text-muted small">
                                    <i className="bi bi-capsule me-1"></i>
                                    Tổng thuốc: <strong>
                                        {rows.reduce((sum, category) => {
                                            const count = parseInt(category.medicineCount) || 0;
                                            return sum + count;
                                        }, 0)}
                                    </strong>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modal: Add */}
                    {showAdd && (
                        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                            <div className="modal-dialog modal-dialog-centered">
                                <div className={`modal-content border-0 shadow-lg`} style={{ 
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: '20px'
                                }}>
                                    <form onSubmit={handleAdd}>
                                        <div className="modal-header border-bottom">
                                            <h5 className="modal-title fw-bold" style={{ color: '#0b1324' }}>
                                                <i className="bi bi-plus-circle me-2" style={{ color: '#14e2c1' }}></i>
                                                Thêm danh mục mới
                                            </h5>
                                            <button 
                                                type="button" 
                                                className="btn-close" 
                                                onClick={() => setShowAdd(false)}
                                                disabled={submitting}
                                            ></button>
                                        </div>
                                        <div className="modal-body py-4">
                                            <label className="form-label fw-semibold" style={{ color: '#0b1324' }}>
                                                Tên danh mục <span className="text-danger">*</span>
                                            </label>
                                            <input 
                                                className="form-control"
                                                style={{ 
                                                    borderRadius: '12px',
                                                    border: '1px solid rgba(11, 19, 36, 0.1)',
                                                    padding: '0.65rem 1rem'
                                                }}
                                                placeholder="Nhập tên danh mục thuốc"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                disabled={submitting}
                                                required 
                                                autoFocus
                                            />
                                            <small className="text-muted d-block mt-2">
                                                Ví dụ: Thuốc giảm đau, Kháng sinh, Vitamin...
                                            </small>
                                        </div>
                                        <div className="modal-footer border-top">
                                            <button 
                                                type="button"
                                                className="btn btn-outline-secondary rounded-pill px-4" 
                                                onClick={() => setShowAdd(false)}
                                                disabled={submitting}
                                            >
                                                <i className="bi bi-x-circle me-1"></i> Hủy
                                            </button>
                                            <button 
                                                type="submit"
                                                className={`btn ${styles.btnTeal} rounded-pill px-4`}
                                                disabled={submitting}
                                            >
                                                {submitting ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                                        Đang lưu...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-check-circle me-1"></i> Lưu
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal: Edit */}
                    {showEdit && (
                        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                            <div className="modal-dialog modal-dialog-centered">
                                <div className={`modal-content border-0 shadow-lg`} style={{ 
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: '20px'
                                }}>
                                    <form onSubmit={handleEdit}>
                                        <div className="modal-header border-bottom">
                                            <h5 className="modal-title fw-bold" style={{ color: '#0b1324' }}>
                                                <i className="bi bi-pencil-square me-2 text-primary"></i>
                                                Chỉnh sửa danh mục
                                            </h5>
                                            <button 
                                                type="button" 
                                                className="btn-close" 
                                                onClick={() => setShowEdit(false)}
                                                disabled={submitting}
                                            ></button>
                                        </div>
                                        <div className="modal-body py-4">
                                            <label className="form-label fw-semibold" style={{ color: '#0b1324' }}>
                                                Tên danh mục <span className="text-danger">*</span>
                                            </label>
                                            <input 
                                                className="form-control"
                                                style={{ 
                                                    borderRadius: '12px',
                                                    border: '1px solid rgba(11, 19, 36, 0.1)',
                                                    padding: '0.65rem 1rem'
                                                }}
                                                placeholder="Nhập tên danh mục thuốc"
                                                value={editData.name}
                                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                disabled={submitting}
                                                required 
                                                autoFocus
                                            />
                                            <small className="text-muted d-block mt-2">
                                                ID: #{editData.id}
                                            </small>
                                        </div>
                                        <div className="modal-footer border-top">
                                            <button 
                                                type="button"
                                                className="btn btn-outline-secondary rounded-pill px-4" 
                                                onClick={() => setShowEdit(false)}
                                                disabled={submitting}
                                            >
                                                <i className="bi bi-x-circle me-1"></i> Hủy
                                            </button>
                                            <button 
                                                type="submit"
                                                className={`btn ${styles.btnTeal} rounded-pill px-4`}
                                                disabled={submitting}
                                            >
                                                {submitting ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                                        Đang cập nhật...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-check-circle me-1"></i> Cập nhật
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
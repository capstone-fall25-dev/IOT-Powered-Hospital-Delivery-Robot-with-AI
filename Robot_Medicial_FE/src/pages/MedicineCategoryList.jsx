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
            const [categories, medicines] = await Promise.all([
                getAllCategories(),
                getAllMedicines()
            ]);

            const categoriesWithCount = categories.map(cat => {
                const medicineCount = medicines.filter(med => med.categoryId === cat.id).length;
                return {
                    ...cat,
                    medicineCount
                };
            });

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
            <div className="container-xl py-4">

                {/* =================== HEADER ==================== */}
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <span className={styles.chip}>
                            <i className="bi bi-grid"></i>
                        </span>
                        <h4 className={`${styles.pageTitle} mb-0`}>Quản lý danh mục thuốc</h4>
                    </div>

                    <div className="d-flex gap-2 flex-wrap">
                        <button 
                            className={styles.btnBack}
                            onClick={() => navigate("/medicines")}
                        >
                            <i className="bi bi-arrow-left me-1"></i>
                            Quay lại
                        </button>
                        <button 
                            className={styles.btnTeal}
                            onClick={() => setShowAdd(true)}
                        >
                            <i className="bi bi-plus-lg me-2"></i>
                            Thêm danh mục
                        </button>
                    </div>
                </div>

                {/* =================== TABLE ==================== */}
                <div className={`${styles.glass} ${styles.tableCard} p-3 p-md-4`}>
                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <div className="spinner-border text-primary"></div>
                            <p className={styles.loadingText}>Đang tải danh mục...</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <table className={`table ${styles.table} align-middle mb-0`}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '60px' }}>#</th>
                                            <th>Tên danh mục</th>
                                            <th style={{ width: '180px' }}>Số lượng thuốc</th>
                                            <th className="text-end" style={{ width: '150px' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className={styles.emptyState}>
                                                    <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                                    Chưa có danh mục nào
                                                    <div className="mt-2">
                                                        <small className="text-muted">Nhấn "Thêm danh mục" để tạo mới</small>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            rows.map((c, i) => (
                                                <tr key={c.id}>
                                                    <td>{i + 1}</td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span className={styles.chip} style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}>
                                                                <i className="bi bi-tag-fill"></i>
                                                            </span>
                                                            <span className="fw-semibold">
                                                                {c.name || c.categoryName || "Không có tên"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={c.medicineCount > 0 ? styles.badgeAvailable : styles.badgeExpired}>
                                                            <i className="bi bi-capsule"></i>
                                                            {c.medicineCount} thuốc
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex gap-1 justify-content-end">
                                                            <button
                                                                className={styles.btnEdit}
                                                                onClick={() => {
                                                                    setEditData({ id: c.id, name: c.name || c.categoryName });
                                                                    setShowEdit(true);
                                                                }}
                                                                title="Sửa"
                                                            >
                                                                <i className="bi bi-pencil"></i>
                                                            </button>
                                                            <button
                                                                className={styles.btnDelete}
                                                                onClick={() => handleDelete(c.id, c.name || c.categoryName, c.medicineCount)}
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

                            {/* Stats Footer */}
                            {rows.length > 0 && (
                                <div className={styles.additionalInfo}>
                                    <div className="row g-3">
                                        <div className="col-md-6"> 
                                            <div className={`${styles.metaItem}`}>
                                                <small className={styles.metaLabel}>
                                                    <i className="bi bi-grid me-1"></i>
                                                    Tổng danh mục: <span className={styles.metaValue}>{rows.length}</span>
                                                </small>
                                            </div>
                                        </div>
                                        <div className="col-md-6 text-end"> 
                                            <div className={styles.metaItem}>
                                                <small className={styles.metaLabel}>
                                                    <i className="bi bi-capsule me-1"></i>
                                                    Tổng thuốc: 
                                                    <span className={styles.metaValue}>
                                                        {rows.reduce((sum, category) => sum + (parseInt(category.medicineCount) || 0), 0)}
                                                    </span>
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* =================== MODAL: ADD ==================== */}
                {showAdd && (
                    <div className={styles.modalOverlay} onClick={(e) => {
                        if (e.target === e.currentTarget && !submitting) setShowAdd(false);
                    }}>
                        <div className={styles.modalContent} style={{ maxWidth: '500px' }}>
                            <form onSubmit={handleAdd}>
                                <div className={styles.modalHeader}>
                                    <h5 className={styles.modalTitle}>
                                        <i className="bi bi-plus-circle me-2"></i>
                                        Thêm danh mục mới
                                    </h5>
                                    <button 
                                        type="button" 
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowAdd(false)}
                                        disabled={submitting}
                                    ></button>
                                </div>

                                <div className={styles.modalBody}>
                                    <label className={`form-label ${styles.formLabel}`}>
                                        Tên danh mục <span className="text-danger">*</span>
                                    </label>
                                    <input 
                                        className={`form-control ${styles.formControl}`}
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

                                <div className={styles.modalFooter}>
                                    <button 
                                        type="button"
                                        className={styles.btnModalClose}
                                        onClick={() => setShowAdd(false)}
                                        disabled={submitting}
                                    >
                                        <i className="bi bi-x-circle me-1"></i>
                                        Hủy
                                    </button>
                                    <button 
                                        type="submit"
                                        className={styles.btnTeal}
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Đang lưu...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-check-circle me-1"></i>
                                                Lưu
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* =================== MODAL: EDIT ==================== */}
                {showEdit && (
                    <div className={styles.modalOverlay} onClick={(e) => {
                        if (e.target === e.currentTarget && !submitting) setShowEdit(false);
                    }}>
                        <div className={styles.modalContent} style={{ maxWidth: '500px' }}>
                            <form onSubmit={handleEdit}>
                                <div className={styles.modalHeader}>
                                    <h5 className={styles.modalTitle}>
                                        <i className="bi bi-pencil-square me-2"></i>
                                        Chỉnh sửa danh mục
                                    </h5>
                                    <button 
                                        type="button" 
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowEdit(false)}
                                        disabled={submitting}
                                    ></button>
                                </div>

                                <div className={styles.modalBody}>
                                    <label className={`form-label ${styles.formLabel}`}>
                                        Tên danh mục <span className="text-danger">*</span>
                                    </label>
                                    <input 
                                        className={`form-control ${styles.formControl}`}
                                        placeholder="Nhập tên danh mục thuốc"
                                        value={editData.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                        disabled={submitting}
                                        required 
                                        autoFocus
                                    />
                                    <small className="text-muted d-block mt-2">
                                        Ví dụ: Thuốc giảm đau, Kháng sinh, Vitamin...
                                    </small>
                                </div>

                                <div className={styles.modalFooter}>
                                    <button 
                                        type="button"
                                        className={styles.btnModalClose}
                                        onClick={() => setShowEdit(false)}
                                        disabled={submitting}
                                    >
                                        <i className="bi bi-x-circle me-1"></i>
                                        Hủy
                                    </button>
                                    <button 
                                        type="submit"
                                        className={styles.btnTeal}
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Đang cập nhật...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-check-circle me-1"></i>
                                                Cập nhật
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
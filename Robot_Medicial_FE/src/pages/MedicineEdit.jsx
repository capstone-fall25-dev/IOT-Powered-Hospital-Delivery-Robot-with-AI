import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMedicine, updateMedicine, getAllCategories } from "@/services/medicineService";
import styles from '@/assets/styles/medicinesManagement.module.css';

export default function MedicineEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        Promise.all([
            getMedicine(id),
            getAllCategories()
        ])
            .then(([medicine, cats]) => {
                // Format expiryDate để hiển thị trong input[type="date"]
                if (medicine.expiryDate) {
                    medicine.expiryDate = medicine.expiryDate.split("T")[0];
                }
                setForm(medicine);
                setCategories(cats);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Lỗi khi tải dữ liệu:", err);
                setError("Không thể tải thông tin thuốc");
                setLoading(false);
            });
    }, [id]);

    function handleChange(e) {
        const { name, value, type } = e.target;
        setForm({ 
            ...form, 
            [name]: type === "number" ? Number(value) : value 
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        
        // Validation
        if (!form.categoryId) {
            alert("Vui lòng chọn danh mục!");
            return;
        }

        setSubmitting(true);
        try {
            await updateMedicine(id, form);
            alert("Cập nhật thuốc thành công!");
            navigate("/medicines");
        } catch (err) {
            console.error("Lỗi khi cập nhật thuốc:", err);
            alert("Không thể cập nhật thuốc. Vui lòng thử lại!");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <div className="container-fluid py-4">
                    <div className="container-lg">
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Đang tải...</span>
                            </div>
                            <p className="mt-3 text-muted">Đang tải thông tin thuốc...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !form) {
        return (
            <div className={styles.page}>
                <div className="container-fluid py-4">
                    <div className="container-lg">
                        <div className={`glass ${styles.glass} ${styles.rounded2xl} p-5 text-center`}>
                            <i className="bi bi-exclamation-triangle fs-1 text-warning d-block mb-3"></i>
                            <h5>{error || "Không tìm thấy thuốc"}</h5>
                            <button 
                                className="btn btn-outline-secondary rounded-pill mt-3"
                                onClick={() => navigate("/medicines")}
                            >
                                <i className="bi bi-arrow-left me-1"></i> Quay lại danh sách
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="container-fluid py-4">
                <div className="container-lg">
                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className={styles.chip}>
                                <i className="bi bi-pencil-square me-1"></i>
                            </span>
                            <h4 className="mb-0 fw-bold">Chỉnh sửa thuốc</h4>
                        </div>
                        <button 
                            className="btn btn-outline-secondary rounded-pill" 
                            onClick={() => navigate("/medicines")}
                        >
                            <i className="bi bi-arrow-left me-1"></i> Quay lại
                        </button>
                    </div>

                    {/* Form */}
                    <div className={`glass ${styles.glass} ${styles.rounded2xl} p-4 p-md-5`}>
                        {/* Medicine Info Header */}
                        <div className="mb-4 pb-3 border-bottom">
                            <h5 className="mb-1 text-primary">{form.name}</h5>
                            <p className="text-muted mb-0 small">
                                <i className="bi bi-upc-scan me-1"></i>
                                Mã thuốc: <span className="fw-semibold">{form.medicineCode}</span>
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                {/* Mã thuốc */}
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        Mã thuốc <span className="text-danger">*</span>
                                    </label>
                                    <input 
                                        name="medicineCode" 
                                        className="form-control"
                                        placeholder="Nhập mã thuốc"
                                        value={form.medicineCode} 
                                        onChange={handleChange} 
                                        required 
                                    />
                                </div>

                                {/* Tên thuốc */}
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        Tên thuốc <span className="text-danger">*</span>
                                    </label>
                                    <input 
                                        name="name" 
                                        className="form-control"
                                        placeholder="Nhập tên thuốc"
                                        value={form.name} 
                                        onChange={handleChange} 
                                        required 
                                    />
                                </div>

                                {/* Danh mục */}
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        Danh mục <span className="text-danger">*</span>
                                    </label>
                                    <select 
                                        name="categoryId" 
                                        className="form-select" 
                                        value={form.categoryId || ""}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">-- Chọn danh mục --</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.categoryName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Đơn vị */}
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        Đơn vị <span className="text-danger">*</span>
                                    </label>
                                    <input 
                                        name="unit" 
                                        className="form-control"
                                        placeholder="Ví dụ: viên, hộp, lọ..."
                                        value={form.unit || ""} 
                                        onChange={handleChange} 
                                        required 
                                    />
                                </div>

                                {/* Số lượng tồn */}
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        Số lượng tồn <span className="text-danger">*</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        name="stockQuantity" 
                                        className="form-control"
                                        placeholder="Nhập số lượng"
                                        min="0"
                                        value={form.stockQuantity || 0} 
                                        onChange={handleChange}
                                        required 
                                    />
                                </div>

                                {/* Hạn sử dụng */}
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        Hạn sử dụng
                                    </label>
                                    <input 
                                        type="date" 
                                        name="expiryDate" 
                                        className="form-control"
                                        value={form.expiryDate || ""} 
                                        onChange={handleChange} 
                                    />
                                </div>

                                {/* Trạng thái */}
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        Trạng thái
                                    </label>
                                    <select 
                                        name="status" 
                                        className="form-select"
                                        value={form.status}
                                        onChange={handleChange}
                                    >
                                        <option value={0}>Sẵn sàng</option>
                                        <option value={1}>Hết hạn</option>
                                    </select>
                                </div>

                                {/* Mô tả */}
                                <div className="col-12">
                                    <label className="form-label fw-semibold">
                                        Mô tả
                                    </label>
                                    <textarea 
                                        name="description" 
                                        className="form-control"
                                        rows="4"
                                        placeholder="Nhập mô tả về thuốc (tùy chọn)"
                                        value={form.description || ""} 
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="d-flex gap-2 justify-content-end mt-4 pt-3 border-top">
                                <button 
                                    type="button"
                                    className="btn btn-outline-secondary rounded-pill px-4" 
                                    onClick={() => navigate(`/medicines/${id}`)}
                                    disabled={submitting}
                                >
                                    <i className="bi bi-x-circle me-1"></i> Hủy
                                </button>
                                <button 
                                    type="button"
                                    className="btn btn-outline-info rounded-pill px-4" 
                                    onClick={() => navigate(`/medicines/${id}`)}
                                    disabled={submitting}
                                >
                                    <i className="bi bi-eye me-1"></i> Xem chi tiết
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
                                            <i className="bi bi-check-circle me-1"></i> Cập nhật
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
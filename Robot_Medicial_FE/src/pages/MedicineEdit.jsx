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
                <div className="container-xl py-4">
                    <div className={styles.loadingContainer}>
                        <div className="spinner-border text-primary"></div>
                        <p className={styles.loadingText}>Đang tải thông tin thuốc...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !form) {
        return (
            <div className={styles.page}>
                <div className="container-xl py-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <div className={`${styles.glass} p-5`}>
                                <div className={styles.errorContainer}>
                                    <i className={`bi bi-exclamation-triangle ${styles.errorIcon}`}></i>
                                    <h5 className={styles.errorTitle}>{error || "Không tìm thấy thuốc"}</h5>
                                    <button 
                                        className={styles.btnBack}
                                        onClick={() => navigate("/medicines")}
                                    >
                                        <i className="bi bi-arrow-left me-1"></i>
                                        Quay lại danh sách
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isAvailable = form.status === 0;

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-10">

                        {/* =================== HEADER ==================== */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                            <div className="d-flex align-items-center gap-3">
                                <span className={styles.chip}>
                                    <i className="bi bi-pencil-square"></i>
                                </span>
                                <h4 className={`${styles.pageTitle} mb-0`}>Chỉnh sửa thuốc</h4>
                            </div>

                            <button 
                                className={styles.btnBack}
                                onClick={() => navigate("/medicines")}
                            >
                                <i className="bi bi-arrow-left me-1"></i>
                                Quay lại
                            </button>
                        </div>

                        {/* =================== FORM ==================== */}
                        <div className={`${styles.glass} p-4 p-md-5`}>

                            {/* Medicine Info Header */}
                            <div className={styles.medicineHeader}>
                                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                                    <div>
                                        <h5 className={styles.medicineName}>{form.name}</h5>
                                        <p className={`${styles.medicineCode} mb-0`}>
                                            <i className="bi bi-upc-scan me-2"></i>
                                            Mã thuốc: <span className={styles.medicineCodeValue}>{form.medicineCode}</span>
                                        </p>
                                    </div>
                                    <span className={`${isAvailable ? styles.badgeAvailable : styles.badgeExpired} ${styles.badgeLarge}`}>
                                        <i className={`bi ${isAvailable ? 'bi-check-circle' : 'bi-exclamation-circle'}`}></i>
                                        {isAvailable ? "Sẵn sàng" : "Hết hạn"}
                                    </span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="row g-4">

                                    {/* Mã thuốc */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Mã thuốc <span className="text-danger">*</span>
                                        </label>
                                        <input 
                                            name="medicineCode" 
                                            className={`form-control ${styles.formControl}`}
                                            placeholder="Nhập mã thuốc"
                                            value={form.medicineCode} 
                                            onChange={handleChange} 
                                            required 
                                        />
                                    </div>

                                    {/* Tên thuốc */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Tên thuốc <span className="text-danger">*</span>
                                        </label>
                                        <input 
                                            name="name" 
                                            className={`form-control ${styles.formControl}`}
                                            placeholder="Nhập tên thuốc"
                                            value={form.name} 
                                            onChange={handleChange} 
                                            required 
                                        />
                                    </div>

                                    {/* Danh mục */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Danh mục <span className="text-danger">*</span>
                                        </label>
                                        <select 
                                            name="categoryId" 
                                            className={`form-select ${styles.formSelect}`}
                                            value={form.categoryId || ""}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">-- Chọn danh mục --</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Đơn vị */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Đơn vị <span className="text-danger">*</span>
                                        </label>
                                        <input 
                                            name="unit" 
                                            className={`form-control ${styles.formControl}`}
                                            placeholder="Ví dụ: viên, hộp, lọ..."
                                            value={form.unit || ""} 
                                            onChange={handleChange} 
                                            required 
                                        />
                                    </div>

                                    {/* Số lượng tồn */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Số lượng tồn <span className="text-danger">*</span>
                                        </label>
                                        <input 
                                            type="number" 
                                            name="stockQuantity" 
                                            className={`form-control ${styles.formControl}`}
                                            placeholder="Nhập số lượng"
                                            min="0"
                                            value={form.stockQuantity || 0} 
                                            onChange={handleChange}
                                            required 
                                        />
                                    </div>

                                    {/* Hạn sử dụng */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Hạn sử dụng
                                        </label>
                                        <input 
                                            type="date" 
                                            name="expiryDate" 
                                            className={`form-control ${styles.formControl}`}
                                            value={form.expiryDate || ""} 
                                            onChange={handleChange} 
                                        />
                                    </div>

                                    {/* Trạng thái */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Trạng thái
                                        </label>
                                        <select 
                                            name="status" 
                                            className={`form-select ${styles.formSelect}`}
                                            value={form.status}
                                            onChange={handleChange}
                                        >
                                            <option value={0}>Sẵn sàng</option>
                                            <option value={1}>Hết hạn</option>
                                        </select>
                                    </div>

                                    {/* Mô tả */}
                                    <div className="col-12">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Mô tả
                                        </label>
                                        <textarea 
                                            name="description" 
                                            className={`form-control ${styles.formControl}`}
                                            rows="4"
                                            placeholder="Nhập mô tả về thuốc (tùy chọn)"
                                            value={form.description || ""} 
                                            onChange={handleChange}
                                        />
                                    </div>

                                </div>

                                {/* Action Buttons */}
                                <div className={styles.actionSection}>
                                    <button 
                                        type="button"
                                        className={styles.btnModalClose}
                                        onClick={() => navigate(`/medicines/${id}`)}
                                        disabled={submitting}
                                    >
                                        <i className="bi bi-x-circle me-1"></i>
                                        Hủy
                                    </button>
                                    <button 
                                        type="button"
                                        className={styles.btnView}
                                        onClick={() => navigate(`/medicines/${id}`)}
                                        disabled={submitting}
                                    >
                                        <i className="bi bi-eye me-1"></i>
                                        Xem chi tiết
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
                                                Cập nhật
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
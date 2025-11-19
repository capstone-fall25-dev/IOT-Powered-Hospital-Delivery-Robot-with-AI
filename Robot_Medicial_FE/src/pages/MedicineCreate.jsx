import { useState, useEffect } from "react";
import { createMedicine, getAllCategories } from "@/services/medicineService";
import { useNavigate } from "react-router-dom";
import styles from '@/assets/styles/medicinesManagement.module.css';

export default function MedicineCreate() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        medicineCode: "",
        name: "",
        unit: "",
        stockQuantity: 0,
        description: "",
        categoryId: "",
        expiryDate: "",
        status: 0
    });

    useEffect(() => {
        getAllCategories()
            .then(setCategories)
            .catch(err => {
                console.error("Lỗi khi lấy danh mục:", err);
                alert("Không thể tải danh mục");
            });
    }, []);

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

        setLoading(true);
        try {
            await createMedicine(form);
            alert("Tạo thuốc thành công!");
            navigate("/medicines");
        } catch (err) {
            console.error("Lỗi khi tạo thuốc:", err);
            alert("Không thể tạo thuốc. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-10">

                        {/* =================== HEADER ==================== */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                            <div className="d-flex align-items-center gap-3">
                                <span className={styles.chip}>
                                    <i className="bi bi-plus-circle"></i>
                                </span>
                                <h4 className={`${styles.pageTitle} mb-0`}>Thêm thuốc mới</h4>
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
                                            value={form.categoryId}
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
                                            value={form.unit} 
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
                                            value={form.stockQuantity} 
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
                                            value={form.expiryDate} 
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
                                            value={form.description} 
                                            onChange={handleChange}
                                        />
                                    </div>

                                </div>

                                {/* Action Buttons */}
                                <div className={styles.actionSection}>
                                    <button 
                                        type="button"
                                        className={styles.btnModalClose}
                                        onClick={() => navigate("/medicines")}
                                        disabled={loading}
                                    >
                                        <i className="bi bi-x-circle me-1"></i>
                                        Hủy
                                    </button>
                                    <button 
                                        type="submit"
                                        className={styles.btnTeal}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Đang lưu...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-check-circle me-1"></i>
                                                Lưu thuốc
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
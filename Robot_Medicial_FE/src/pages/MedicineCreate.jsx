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
        
        // Validation
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
            <div className="container-fluid py-4">
                <div className="container-lg">
                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className={styles.chip}>
                                <i className="bi bi-plus-circle me-1"></i>
                            </span>
                            <h4 className="mb-0 fw-bold">Thêm thuốc mới</h4>
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
                                        value={form.categoryId}
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
                                        value={form.unit} 
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
                                        value={form.stockQuantity} 
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
                                        value={form.expiryDate} 
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
                                        value={form.description} 
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="d-flex gap-2 justify-content-end mt-4 pt-3 border-top">
                                <button 
                                    type="button"
                                    className="btn btn-outline-secondary rounded-pill px-4" 
                                    onClick={() => navigate("/medicines")}
                                    disabled={loading}
                                >
                                    <i className="bi bi-x-circle me-1"></i> Hủy
                                </button>
                                <button 
                                    type="submit"
                                    className={`btn ${styles.btnTeal} rounded-pill px-4`}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-check-circle me-1"></i> Lưu thuốc
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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUser } from "@/services/userService";
import styles from '@/assets/styles/userForm.module.css';
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast"; 

export default function UserCreate() {
    const navigate = useNavigate();
    const { toast, showToast } = useToast();

    const [form, setForm] = useState({
        email: "",
        password: "",
        fullName: "",
        role: "doctor",
        isActive: true
    });

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!form.email || !form.password || !form.fullName) {
            showToast("warning", "Vui lòng điền đầy đủ thông tin!");
            return;
        }

        if (form.password.length < 8) {
            showToast("warning", "Mật khẩu phải có ít nhất 8 ký tự!");
            return;
        }

        setLoading(true);

        try {
            await createUser({
                email: form.email,
                password: form.password,
                fullName: form.fullName,
                role: form.role,
                isActive: form.isActive
            });

            showToast("success", "Tạo tài khoản thành công!");
            navigate("/users");
        } catch (err) {
            showToast("error", err.message || "Tạo tài khoản thất bại!");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">

                {/* =================== HEADER ==================== */}
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <span className={styles.chip}>
                            <i className="bi bi-person-plus-fill"></i>
                        </span>
                        <div>
                            <h3 className={styles.pageTitle}>Thêm người dùng mới</h3>
                            <p className={styles.pageSubtitle}>
                                Tạo tài khoản mới cho hệ thống
                            </p>
                        </div>
                    </div>
                    <button 
                        className={styles.btnBack}
                        onClick={() => navigate("/users")}
                    >
                        <i className="bi bi-arrow-left me-1"></i>
                        Quay lại
                    </button>
                </div>

                {/* =================== FORM CARD ==================== */}
                <div className={`${styles.glass} p-3 p-md-4`}>
                    <form onSubmit={handleSubmit}>

                        {/* Thông tin cơ bản */}
                        <div className={styles.sidebarTitle}>
                            <i className="bi bi-info-circle me-2"></i>
                            Thông tin cơ bản
                        </div>

                        <div className="row g-4 mb-4">
                            {/* EMAIL */}
                            <div className="col-md-6">
                                <label className={styles.formLabel}>
                                    Email
                                    <span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="email"
                                    className={`form-control ${styles.formControl}`}
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="doctor@hospital.vn"
                                />
                                <div className={styles.formText}>
                                    Email dùng để đăng nhập vào hệ thống
                                </div>
                            </div>

                            {/* FULL NAME */}
                            <div className="col-md-6">
                                <label className={styles.formLabel}>
                                    Họ và tên
                                    <span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="text"
                                    className={`form-control ${styles.formControl}`}
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    required
                                    placeholder="Nguyễn Văn A"
                                />
                                <div className={styles.formText}>
                                    Tên đầy đủ của người dùng
                                </div>
                            </div>

                            {/* PASSWORD */}
                            <div className="col-12">
                                <label className={styles.formLabel}>
                                    Mật khẩu
                                    <span className={styles.required}>*</span>
                                </label>
                                <div className={`input-group ${styles.inputGroup}`}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className={`form-control ${styles.formControl}`}
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ít nhất 8 ký tự"
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        className={`btn ${styles.btnOutlineSecondary}`}
                                        onClick={() => setShowPassword(s => !s)}
                                        title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    >
                                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                    </button>
                                </div>
                                <div className={styles.formText}>
                                    Mật khẩu nên có ít nhất 8 ký tự, bao gồm chữ và số
                                </div>
                            </div>
                        </div>

                        {/* Phân quyền */}
                        <div className={styles.sidebarTitle}>
                            <i className="bi bi-shield-check me-2"></i>
                            Phân quyền & Trạng thái
                        </div>

                        <div className="row g-4">
                            {/* ROLE */}
                            <div className="col-md-6">
                                <label className={styles.formLabel}>
                                    Vai trò
                                    <span className={styles.required}>*</span>
                                </label>
                                <select
                                    className={`form-select ${styles.formSelect}`}
                                    name="role"
                                    value={form.role}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="doctor">Bác sĩ</option>
                                    <option value="pharmacist">Dược sĩ</option>
                                </select>
                                <div className={styles.formText}>
                                    Quyền hạn được áp dụng theo vai trò
                                </div>
                            </div>

                            {/* ACTIVE STATUS */}
                            <div className="col-md-6">
                                <label className={styles.formLabel}>
                                    Trạng thái tài khoản
                                </label>
                                <select
                                    className={`form-select ${styles.formSelect}`}
                                    name="isActive"
                                    value={form.isActive.toString()}
                                    onChange={(e) =>
                                        setForm({ ...form, isActive: e.target.value === "true" })
                                    }
                                >
                                    <option value="true">Hoạt động</option>
                                    <option value="false">Tạm dừng</option>
                                </select>
                                <div className={styles.formText}>
                                    Chọn "Hoạt động" để cho phép đăng nhập ngay
                                </div>
                            </div>
                        </div>

                        {/* INFO ALERT */}
                        <div className={`${styles.infoAlert} mt-4`}>
                            <i className="bi bi-lightbulb me-2"></i>
                            Người dùng sẽ nhận email thông báo sau khi tài khoản được tạo
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                            <button
                                type="button"
                                className={styles.btnBack}
                                onClick={() => navigate("/users")}
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
                                        Đang tạo...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-circle me-2"></i>
                                        Tạo tài khoản
                                    </>
                                )}
                            </button>
                        </div>

                    </form>
                </div>

            </div>
            <Toast toast={toast} showToast={showToast} />
        </div>
    );
}
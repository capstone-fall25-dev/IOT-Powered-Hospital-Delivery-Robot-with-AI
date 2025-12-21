import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUserById, updateUser } from "@/services/userService";
import styles from '@/assets/styles/userForm.module.css';
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";

export default function UserEdit() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { toast, showToast } = useToast();
    const [user, setUser] = useState(null);
    const [showPwd, setShowPwd] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!userId) return;
        getUserById(userId)
            .then(u => setUser(u))
            .catch(err => {
                console.error("Không thể load user:", err);
                showToast("error", err.message || "Không thể tải thông tin người dùng");
            });
    }, [userId]);

    function genPassword() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
        let s = "";
        for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    }

    const strength = useMemo(() => {
        const v = user?.password || "";
        let n = 0;
        if (v.length >= 8) n++;
        if (/[A-Z]/.test(v)) n++;
        if (/[a-z]/.test(v)) n++;
        if (/\d/.test(v)) n++;
        if (/[^\w\s]/.test(v)) n++;
        
        let label = "Yếu";
        let labelClass = styles.strengthLabelWeak;
        let barClass = styles.strengthWeak;
        let width = "25%";

        if (n === 3) {
            label = "Trung bình";
            labelClass = styles.strengthLabelMedium;
            barClass = styles.strengthMedium;
            width = "60%";
        } else if (n >= 4) {
            label = "Mạnh";
            labelClass = styles.strengthLabelStrong;
            barClass = styles.strengthStrong;
            width = "100%";
        }

        return { n, label, labelClass, barClass, width };
    }, [user?.password]);

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setUser(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    }

    function isValid() {
        if (!user) return false;
        const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email);
        const okName = user.fullName?.trim().length > 3;
        return okEmail && okName;
    }

    const save = async () => {
        if (!isValid()) {
            showToast("warning", "Vui lòng kiểm tra lại các trường bắt buộc.");
            return;
        }
        setSaving(true);
        try {
            const userDto = { ...user };
            if (!userDto.password || userDto.password.trim() === "") {
                delete userDto.password;
            }
            await updateUser(userId, userDto);
            showToast("success", "Lưu thành công!");
            setTimeout(() => navigate("/users"), 800);
        } catch (err) {
            console.error("Lỗi khi lưu:", err);
            showToast("error", err.message || "Không thể lưu thay đổi. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingContainer}>
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className={styles.loadingText}>Đang tải thông tin người dùng...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">

                {/* =================== HEADER ==================== */}
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <button
                            className={styles.btnBack}
                            onClick={() => navigate(-1)}
                        >
                            <i className="bi bi-arrow-left me-1"></i>
                            Quay lại
                        </button>
                        <div>
                            <h3 className={styles.pageTitle}>Cập nhật thông tin người dùng</h3>
                            <p className={styles.pageSubtitle}>
                                Chỉnh sửa chi tiết tài khoản {user.fullName}
                            </p>
                        </div>
                    </div>
                    <span className={`${styles.statusBadge} ${user.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                        <i className={`bi ${user.isActive ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
                        {user.isActive ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                </div>

                {/* =================== MAIN FORM ==================== */}
                <div className={`${styles.glass} p-3 p-md-4`}>
                    <div className="row g-4">

                        {/* LEFT COLUMN: BASIC INFO */}
                        <div className="col-lg-8">
                            <div className="row g-4">

                                {/* FULL NAME */}
                                <div className="col-12">
                                    <label className={styles.formLabel}>
                                        Tên đầy đủ
                                        <span className={styles.required}>*</span>
                                    </label>
                                    <input
                                        name="fullName"
                                        className={`form-control ${styles.formControl}`}
                                        value={user.fullName || ""}
                                        onChange={handleChange}
                                        placeholder="Nhập họ và tên đầy đủ"
                                        required
                                    />
                                    <div className={styles.formText}>
                                        Tên hiển thị trên hệ thống.
                                    </div>
                                </div>

                                {/* EMAIL */}
                                <div className="col-12">
                                    <label className={styles.formLabel}>
                                        Email
                                        <span className={styles.required}>*</span>
                                    </label>
                                    <input
                                        name="email"
                                        type="email"
                                        className={`form-control ${styles.formControl}`}
                                        value={user.email || ""}
                                        onChange={handleChange}
                                        placeholder="example@hospital.vn"
                                        required
                                    />
                                    <div className={styles.formText}>
                                        Email dùng để đăng nhập và gửi thông báo.
                                    </div>
                                </div>

                                {/* PASSWORD */}
                                <div className="col-12">
                                    <label className={styles.formLabel}>
                                        Mật khẩu (tùy chọn)
                                    </label>
                                    <div className={`input-group ${styles.inputGroup}`}>
                                        <input
                                            type={showPwd ? 'text' : 'password'}
                                            name="password"
                                            className={`form-control ${styles.formControl}`}
                                            value={user.password || ""}
                                            onChange={handleChange}
                                            placeholder="Nhập mật khẩu mới hoặc để trống"
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            className={`btn ${styles.btnOutlineSecondary}`}
                                            onClick={() => setShowPwd(s => !s)}
                                            title={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                        >
                                            <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${styles.btnOutlinePrimary}`}
                                            onClick={() => setUser(u => ({ ...u, password: genPassword() }))}
                                            title="Tạo mật khẩu ngẫu nhiên mạnh"
                                        >
                                            <i className="bi bi-stars me-1"></i>
                                            Tạo
                                        </button>
                                    </div>

                                    {user.password && (
                                        <div className="mt-2">
                                            <div className={`${styles.strengthLabel} ${strength.labelClass}`}>
                                                <small className="text-muted me-1">Độ mạnh:</small>
                                                {strength.label}
                                            </div>
                                            <div className={styles.strengthMeter}>
                                                <div 
                                                    className={`${styles.strengthBar} ${strength.barClass}`} 
                                                    style={{ width: strength.width }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles.formText}>
                                        Để trống nếu không muốn thay đổi. Mật khẩu mới phải có ít nhất 8 ký tự.
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* RIGHT COLUMN: SETTINGS */}
                        <div className="col-lg-4">
                            <div className={styles.sidebarCard}>
                                <h6 className={styles.sidebarTitle}>Cài đặt tài khoản</h6>

                                {/* ACTIVE TOGGLE */}
                                <div className="mb-4">
                                    <div className={`form-check form-switch ${styles.formSwitch}`}>
                                        <input
                                            className={`form-check-input ${styles.formSwitchInput}`}
                                            type="checkbox"
                                            id="isActive"
                                            name="isActive"
                                            checked={user.isActive}
                                            onChange={handleChange}
                                        />
                                        <label 
                                            className={`form-check-label ${styles.formSwitchLabel}`} 
                                            htmlFor="isActive"
                                        >
                                            Kích hoạt tài khoản
                                        </label>
                                    </div>
                                    <div className={styles.formText}>
                                        Bật để cho phép đăng nhập. Tắt để tạm khóa.
                                    </div>
                                </div>

                                {/* ROLE SELECT */}
                                <div className="mb-4">
                                    <label className={styles.formLabel}>Vai trò</label>
                                    <select
                                        name="role"
                                        className={`form-select ${styles.formSelect}`}
                                        value={user.role || ""}
                                        onChange={handleChange}
                                    >
                                        <option value="">- Chọn vai trò -</option>
                                        <option value="doctor">Bác sĩ</option>
                                        <option value="pharmacist">Dược sĩ</option>
                                    </select>
                                    <div className={styles.formText}>
                                        Quyền hạn được áp dụng theo vai trò.
                                    </div>
                                </div>

                                {/* INFO */}
                                <div className={styles.infoAlert}>
                                    <i className="bi bi-info-circle me-2"></i>
                                    Thay đổi sẽ được áp dụng ngay sau khi lưu.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SAVE BUTTON */}
                    <div className="row mt-4 pt-3 border-top">
                        <div className="col-12">
                            <div className="d-flex justify-content-end">
                                <button
                                    className={styles.btnTeal}
                                    onClick={save}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-check-circle me-2"></i>
                                            Lưu thay đổi
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            <Toast toast={toast} showToast={showToast} />
        </div>
    );
}
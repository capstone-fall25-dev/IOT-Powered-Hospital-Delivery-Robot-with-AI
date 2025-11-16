import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUserById, updateUser } from "@/services/userService";
import styles from '@/assets/styles/doctorEdit.module.css'; // import CSS module (giả sử có các class tương tự userManagement)

export default function UserEdit() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showPwd, setShowPwd] = useState(false);
    const [saving, setSaving] = useState(false);

    // Load user từ API
    useEffect(() => {
        if (!userId) return;
        getUserById(userId)
            .then(u => setUser(u))
            .catch(err => {
                console.error("Không thể load user:", err);
                alert("Không thể tải thông tin người dùng");
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
        const label = n <= 2 ? "Yếu" : n === 3 ? "Trung bình" : "Mạnh";
        const variant = n <= 2 ? "danger" : n === 3 ? "warning" : "success";
        const width = n <= 2 ? "25%" : n === 3 ? "60%" : "100%";
        return { n, label, variant, width };
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
        if (!isValid()) return alert("Vui lòng kiểm tra lại các trường bắt buộc.");
        setSaving(true);
        try {
            const userDto = { ...user };
            if (!userDto.password || userDto.password.trim() === "") {
                delete userDto.password;
            }
            await updateUser(userId, userDto);
            alert("Lưu thành công!");
        } catch (err) {
            console.error("Lỗi khi lưu:", err);
            alert("Không thể lưu thay đổi. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    if (!user) return (
        <div className={styles.page}>
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className={styles.page}>
            <div className="container-lg py-3">
                {/* HEADER */}
                <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                        <button
                            className="btn btn-outline-secondary rounded-pill px-2 py-1"
                            onClick={() => navigate(-1)}
                        >
                            <i className="bi bi-arrow-left me-1"></i> Quay lại
                        </button>
                        <div>
                            <h3 className="mb-0 fw-bold text-dark">Cập nhật thông tin người dùng</h3>
                            <p className="text-muted small mb-0">Chỉnh sửa chi tiết tài khoản {user.fullName}</p>
                        </div>
                    </div>
                    <span className={`badge ${user.isActive ? 'bg-success' : 'bg-secondary'} px-2 py-1`}>
                        <i className={`bi ${user.isActive ? 'bi-check-circle-fill me-1' : 'bi-x-circle-fill me-1'}`}></i>
                        {user.isActive ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                </div>

                {/* MAIN FORM LAYOUT */}
                <div className={`${styles.glass} ${styles.rounded2xl} p-3 p-md-4`}>
                    <div className="row g-3">
                        {/* LEFT COLUMN: BASIC INFO */}
                        <div className="col-lg-8">
                            <div className="row g-3">
                                {/* FULL NAME */}
                                <div className="col-12">
                                    <label className="form-label fw-semibold mb-1">Tên đầy đủ <span className="text-danger">*</span></label>
                                    <input
                                        name="fullName"
                                        className="form-control"
                                        value={user.fullName || ""}
                                        onChange={handleChange}
                                        placeholder="Nhập họ và tên đầy đủ"
                                        required
                                    />
                                    <div className="form-text">Tên hiển thị trên hệ thống.</div>
                                </div>

                                {/* EMAIL */}
                                <div className="col-12">
                                    <label className="form-label fw-semibold mb-1">Email <span className="text-danger">*</span></label>
                                    <input
                                        name="email"
                                        type="email"
                                        className="form-control"
                                        value={user.email || ""}
                                        onChange={handleChange}
                                        placeholder="example@benhvien.vn"
                                        required
                                    />
                                    <div className="form-text">Email dùng để đăng nhập và gửi thông báo.</div>
                                </div>

                                {/* PASSWORD SECTION */}
                                <div className="col-12">
                                    <label className="form-label fw-semibold mb-1">Mật khẩu (tùy chọn)</label>
                                    <div className="input-group">
                                        <input
                                            type={showPwd ? 'text' : 'password'}
                                            name="password"
                                            className="form-control"
                                            value={user.password || ""}
                                            onChange={handleChange}
                                            placeholder="Nhập mật khẩu mới hoặc để trống để giữ nguyên"
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowPwd(s => !s)}
                                            title={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                        >
                                            <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary"
                                            onClick={() => setUser(u => ({ ...u, password: genPassword() }))}
                                            title="Tạo mật khẩu ngẫu nhiên mạnh"
                                        >
                                            <i className="bi bi-stars me-1"></i>Tạo
                                        </button>
                                    </div>
                                    {user.password && (
                                        <div className="mt-2">
                                            <div className="mb-1">
                                                <small className="text-muted me-1">Độ mạnh mật khẩu:</small>
                                                <small className={`fw-semibold text-${strength.variant}`}>
                                                    {strength.label}
                                                </small>
                                            </div>
                                            <div className="progress" style={{ height: '6px' }}>
                                                <div className={`progress-bar bg-${strength.variant}`} style={{ width: strength.width }}></div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="form-text">
                                        Để trống nếu không muốn thay đổi. Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: SETTINGS */}
                        <div className="col-lg-4">
                            <div className={`${styles.glass} ${styles.rounded2xl} p-3 h-100`}>
                                <h6 className="fw-bold mb-3 border-bottom pb-2">Cài đặt tài khoản</h6>
                               
                                {/* ACTIVE TOGGLE */}
                                <div className="mb-3">
                                    <div className="form-check form-switch">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="isActive"
                                            name="isActive"
                                            checked={user.isActive}
                                            onChange={handleChange}
                                        />
                                        <label className="form-check-label fw-medium" htmlFor="isActive">
                                            Kích hoạt tài khoản
                                        </label>
                                    </div>
                                    <div className="form-text">
                                        Bật để cho phép đăng nhập. Tắt để tạm khóa tài khoản.
                                    </div>
                                </div>

                                {/* ROLE SELECT */}
                                <div className="mb-3">
                                    <label className="form-label fw-semibold mb-1">Vai trò</label>
                                    <select
                                        name="role"
                                        className="form-select"
                                        value={user.role || ""}
                                        onChange={handleChange}
                                    >
                                        <option value="">Chọn vai trò</option>
                                        <option value="admin">Quản trị viên</option>
                                        <option value="doctor">Bác sĩ</option>
                                        <option value="pharmacist">Dược sĩ</option>
                                        <option value="operator">Người vận hành</option>
                                        <option value="nurse">Y tá</option>
                                    </select>
                                    <div className="form-text">
                                        Quyền hạn sẽ được áp dụng theo vai trò.
                                    </div>
                                </div>

                                {/* INFO CARD */}
                                <div className="mt-auto pt-2 border-top">
                                    <small className="text-muted">
                                        <i className="bi bi-info-circle me-1"></i>
                                        Thay đổi sẽ được áp dụng ngay sau khi lưu.
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SAVE BUTTON - FULL WIDTH FOOTER */}
                    <div className="row mt-3">
                        <div className="col-12">
                            <div className="d-flex justify-content-end">
                                <button
                                    className={`${styles.btnTeal} rounded-pill px-4 py-2 fw-bold`}
                                    onClick={save}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-check-circle-fill me-2"></i>
                                            Lưu thay đổi
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
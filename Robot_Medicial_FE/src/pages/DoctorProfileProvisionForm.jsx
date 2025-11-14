import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getUserById } from "@/services/userService";
import styles from '@/assets/styles/doctorEdit.module.css'; // import CSS module

export default function DoctorEdit() {
    const { userId } = useParams();
    const [user, setUser] = useState(null);
    const [showPwd, setShowPwd] = useState(false);

    // Load user từ API
    useEffect(() => {
        if (!userId) return;
        getUserById(userId)
            .then(u => setUser(u))
            .catch(err => {
                console.error("Không thể load user:", err);
                alert("Không thể tải thông tin bác sĩ");
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
        const okUser = user.username?.trim().length > 4;
        return okEmail && okName && okUser;
    }

    function save() {
        if (!isValid()) return alert("Vui lòng kiểm tra lại các trường bắt buộc.");
        console.log("Dữ liệu gửi đi:", user);
        alert("Lưu thành công!");
    }

    if (!user) return <div>Đang tải dữ liệu...</div>;

    return (
        <div className={styles.page}>

            <div className="container-lg py-3 py-md-4">
                <a href="/doctor" className="btn btn-outline-secondary btn-sm rounded-pill mb-3">
                    <i className="bi bi-arrow-left me-1"></i> Quay lại danh sách
                </a>
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h4 className={styles.sectionTitle + " mb-0"}>Cập nhật thông tin người dùng</h4>
                    <span className={`badge ${user.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <p className="text-muted mb-3">Điền thông tin bổ sung khi cấp tài khoản cho người dùng</p>

                <div className="row g-3 g-lg-4">
                    <div className="col-lg-8">
                        <div className={`${styles.glass} p-3 p-md-4 ${styles.rounded2xl} mb-3`}>
                            <div className="row g-3">
                                <div className="col-md-12">
                                    <label className="form-label">Tên đầy đủ</label>
                                    <input name="fullName" className="form-control" value={user.fullName || ""} onChange={handleChange} placeholder="Họ và tên" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Email</label>
                                    <input name="email" type="email" className="form-control" value={user.email || ""} onChange={handleChange} placeholder="email@benhvien.vn" />
                                </div>

                                <div className="col-md-12">
                                    <div className="fieldset">
                                        <div className="row g-3">
                                            <div className="col-md-9">
                                                <label className="form-label">Mật khẩu</label>
                                                <div className="input-group">
                                                    <input type={showPwd ? 'text' : 'password'} name="password" className="form-control" value={user.password || ""} onChange={handleChange} placeholder="Nhập mật khẩu hoặc tạo tự động..." />
                                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPwd(s => !s)}>{showPwd ? 'Ẩn' : 'Hiện'}</button>
                                                    <button type="button" className="btn btn-outline-primary" onClick={() => setUser(u => ({ ...u, password: genPassword() }))}><i className="bi bi-stars me-1"></i>Tạo mới</button>
                                                </div>
                                                <div className="progress mt-2" role="progressbar" aria-label="Độ mạnh mật khẩu" aria-valuemin={0} aria-valuemax={5}>
                                                    <div className={`progress-bar bg-${strength.variant}`} style={{ width: strength.width }}></div>
                                                </div>
                                                <div className="small text-muted mt-1">Độ mạnh: <strong>{strength.label}</strong></div>
                                            </div>
                                            <div className="col-md-3 d-flex align-items-end"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 d-flex justify-content-end gap-2">
                                    <button className={`${styles.btnTeal} rounded-pill`} onClick={save}><i className="bi bi-save2 me-1"></i> Lưu thay đổi</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className={`${styles.glass} p-3 p-md-4 ${styles.rounded2xl} mb-3`}>
                            <div className="form-check form-switch">
                                <input className="form-check-input" id="active" type="checkbox" name="isActive" checked={user.isActive} onChange={handleChange} />
                                <label htmlFor="active" className="form-check-label">Kích hoạt tài khoản</label>
                            </div>
                            <div className="mt-3">
                                <label className="form-label">Vai trò</label>
                                <select name="role" className="form-select" value={user.role} onChange={handleChange}>
                                    <option>Người vận hành</option>
                                    <option>Quản trị</option>
                                </select>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUser } from "@/services/userService";
import styles from "@/assets/styles/userManagement.module.css";

export default function UserCreate() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: "",
        fullName: "",
        role: "doctor",
        isActive: true
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await createUser({
                email: form.email,
                password: form.password,
                fullName: form.fullName,
                role: form.role,
                isActive: form.isActive
            });

            alert("Tạo tài khoản thành công!");
            navigate("/users");
        } catch (err) {
            alert("Tạo tài khoản thất bại!");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className="container py-4">

                {/* Header */}
                <div className="d-flex align-items-center gap-2 mb-4">
                    <span className={styles.chip}>
                        <i className="bi bi-person-plus-fill me-1"></i>
                    </span>
                    <h3 className="fw-bold mb-0">Thêm người dùng mới</h3>
                </div>

                {/* FORM CARD */}
                <div className={`${styles.glass} p-4 rounded-4`}>

                    <form onSubmit={handleSubmit} className="row g-3">

                        <div className="col-md-6">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-control rounded-3"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                                placeholder="doctor@example.com"
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Mật khẩu</label>
                            <input
                                type="password"
                                className="form-control rounded-3"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                required
                                placeholder="Ít nhất 6 ký tự"
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Họ và tên</label>
                            <input
                                type="text"
                                className="form-control rounded-3"
                                name="fullName"
                                value={form.fullName}
                                onChange={handleChange}
                                required
                                placeholder="Nguyễn Văn A"
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Vai trò</label>
                            <select
                                className="form-select rounded-3"
                                name="role"
                                value={form.role}
                                onChange={handleChange}
                            >
                                <option value="doctor">Bác sĩ</option>
                                <option value="pharmacist">Dược sĩ</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Trạng thái</label>
                            <select
                                className="form-select rounded-3"
                                name="isActive"
                                value={form.isActive}
                                onChange={(e) =>
                                    setForm({ ...form, isActive: e.target.value === "true" })
                                }
                            >
                                <option value="true">Hoạt động</option>
                                <option value="false">Tạm dừng</option>
                            </select>
                        </div>

                        {/* BUTTONS */}
                        <div className="col-12 d-flex justify-content-end gap-2 mt-3">
                            <button
                                type="button"
                                className="btn btn-light rounded-pill px-4"
                                onClick={() => navigate("/users")}
                            >
                                <i className="bi bi-arrow-left"></i> Quay lại
                            </button>

                            <button
                                type="submit"
                                className={`${styles.btnTeal} rounded-pill px-4`}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="spinner-border spinner-border-sm"></span>
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
    );
}

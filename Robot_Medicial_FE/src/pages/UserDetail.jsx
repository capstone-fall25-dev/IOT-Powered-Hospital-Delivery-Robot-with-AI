import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getUserById,
    activateUser,
    deactivateUser
} from "@/services/userService";

import styles from "@/assets/styles/userManagement.module.css";

export default function UserDetail() {
    const { userId } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        loadUser();
    }, [userId]);

    async function loadUser() {
        try {
            const data = await getUserById(userId);
            setUser(data);
        } catch (err) {
            alert("Không thể tải thông tin user");
        } finally {
            setLoading(false);
        }
    }

    async function handleToggleStatus() {
        if (!user) return;

        const active = user.isActive;
        const confirmText = active
            ? "Bạn có chắc chắn muốn vô hiệu hoá tài khoản này?"
            : "Bạn có chắc chắn muốn kích hoạt tài khoản này?";

        if (!window.confirm(confirmText)) return;

        try {
            setToggling(true);

            if (active) await deactivateUser(user.id);
            else await activateUser(user.id);

            await loadUser();
        } catch (err) {
            alert("Thao tác thất bại");
        } finally {
            setToggling(false);
        }
    }

    if (loading)
        return (
            <div className="text-center mt-5">
                <div className="spinner-border text-success"></div>
                <p>Đang tải dữ liệu...</p>
            </div>
        );

    if (!user)
        return (
            <div className="text-center text-danger mt-5">
                Không tìm thấy người dùng!
            </div>
        );

    return (
        <div className={`${styles.page} py-5 d-flex justify-content-center`}>
            <div className={`${styles.glass} p-5`} style={{ maxWidth: 900, width: "95%" }}>

                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="fw-bold">
                        <i className="bi bi-person-badge text-primary me-2"></i>
                        Chi tiết người dùng
                    </h3>

                    <button
                        className={`${styles.btnTeal} btn rounded-pill px-3`}
                        onClick={() => navigate("/user")}
                    >
                        <i className="bi bi-arrow-left-circle me-1"></i> Quay lại
                    </button>
                </div>

                {/* USER CARD */}
                <div className="row g-4">

                    <div className="col-md-6">
                        <label className="fw-semibold">Họ tên</label>
                        <div className="form-control">{user.fullName}</div>
                    </div>

                    <div className="col-md-6">
                        <label className="fw-semibold">Email</label>
                        <div className="form-control">{user.email}</div>
                    </div>

                    <div className="col-md-4">
                        <label className="fw-semibold">Vai trò</label>
                        <div className="form-control text-capitalize">{user.role}</div>
                    </div>

                    <div className="col-md-4">
                        <label className="fw-semibold">Trạng thái</label>
                        <div className="form-control">
                            {user.isActive ? (
                                <span className="text-success fw-bold">Hoạt động</span>
                            ) : (
                                <span className="text-danger fw-bold">Tạm dừng</span>
                            )}
                        </div>
                    </div>

                    <div className="col-md-4">
                        <label className="fw-semibold">Online</label>
                        <div className="form-control">
                            {user.isOnline ? (
                                <span className="text-success">
                                    <i className="bi bi-circle-fill me-1"></i> Đang hoạt động
                                </span>
                            ) : (
                                <span className="text-secondary">
                                    <i className="bi bi-circle me-1"></i> Offline
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="col-md-6">
                        <label className="fw-semibold">Ngày tạo</label>
                        <div className="form-control">
                            {new Date(user.createdAt).toLocaleString("vi-VN")}
                        </div>
                    </div>

                    <div className="col-md-6">
                        <label className="fw-semibold">Cập nhật lần cuối</label>
                        <div className="form-control">
                            {new Date(user.updatedAt).toLocaleString("vi-VN")}
                        </div>
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="d-flex justify-content-end gap-3 mt-4">

                    <button
                        className="btn btn-outline-secondary rounded-pill"
                        onClick={() => navigate(`/user-detail/${user.id}`)}
                    >
                        <i className="bi bi-pencil-square me-1"></i> Chỉnh sửa
                    </button>

                    <button
                        className="btn btn-danger rounded-pill"
                        onClick={handleToggleStatus}
                        disabled={toggling}
                    >
                        {toggling ? (
                            <span className="spinner-border spinner-border-sm"></span>
                        ) : user.isActive ? (
                            <>
                                <i className="bi bi-lock me-1"></i> Vô hiệu hóa
                            </>
                        ) : (
                            <>
                                <i className="bi bi-unlock me-1"></i> Kích hoạt
                            </>
                        )}
                    </button>
                </div>

                {/* TASK LIST */}
                <div className="mt-5">
                    <h5 className="fw-bold mb-3">
                        <i className="bi bi-list-task text-success me-2"></i>
                        Nhiệm vụ đã giao
                    </h5>

                    {user.tasks && user.tasks.length > 0 ? (
                        <ul className="list-group">
                            {user.tasks.map((t) => (
                                <li key={t.id} className="list-group-item">
                                    {t.title}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted">Không có nhiệm vụ nào.</p>
                    )}
                </div>

                {/* SESSIONS */}
                <div className="mt-4">
                    <h5 className="fw-bold mb-3">
                        <i className="bi bi-wifi text-primary me-2"></i>
                        Phiên hoạt động
                    </h5>

                    {user.activeSessions && user.activeSessions.length > 0 ? (
                        <ul className="list-group">
                            {user.activeSessions.map((s) => (
                                <li key={s.id} className="list-group-item">
                                    <b>Đăng nhập:</b> {new Date(s.createdAt).toLocaleString("vi-VN")}  
                                    <br />
                                    <b>Hết hạn:</b> {new Date(s.expiresAt).toLocaleString("vi-VN")}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted">Không có phiên hoạt động.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

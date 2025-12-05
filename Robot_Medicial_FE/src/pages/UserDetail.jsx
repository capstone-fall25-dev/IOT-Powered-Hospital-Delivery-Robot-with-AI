import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getUserById,
    activateUser,
    deactivateUser
} from "@/services/userService";
import styles from '@/assets/styles/userDetail.module.css';
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";

export default function UserDetail() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { toast, showToast } = useToast();

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
            showToast("error", err.message || "Không thể tải thông tin user");
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
            showToast("success", user.isActive ? "Đã vô hiệu hóa tài khoản thành công!" : "Đã kích hoạt tài khoản thành công!");
        } catch (err) {
            showToast("error", err.message || "Thao tác thất bại");
        } finally {
            setToggling(false);
        }
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingContainer}>
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className={styles.loadingText}>Đang tải thông tin người dùng...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={styles.page}>
                <div className={styles.errorContainer}>
                    <i className="bi bi-exclamation-circle text-danger" style={{ fontSize: '3rem' }}></i>
                    <p className={styles.errorText}>Không tìm thấy người dùng!</p>
                    <button 
                        className={styles.btnBack}
                        onClick={() => navigate("/users")}
                    >
                        <i className="bi bi-arrow-left me-1"></i>
                        Quay lại danh sách
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-10">

                        {/* =================== HEADER ==================== */}
                        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                            <h3 className={styles.pageTitle}>
                                <i className="bi bi-person-badge"></i>
                                Chi tiết người dùng
                            </h3>

                            <button
                                className={styles.btnBack}
                                onClick={() => navigate("/users")}
                            >
                                <i className="bi bi-arrow-left me-1"></i>
                                Quay lại
                            </button>
                        </div>

                        {/* =================== USER INFO CARD ==================== */}
                        <div className={`${styles.glass} p-3 p-md-4 mb-4`}>
                            <div className="row g-4">

                                {/* FULL NAME */}
                                <div className="col-md-6">
                                    <div className={styles.infoGroup}>
                                        <label className={styles.infoLabel}>Họ và tên</label>
                                        <div className={styles.infoValue}>{user.fullName}</div>
                                    </div>
                                </div>

                                {/* EMAIL */}
                                <div className="col-md-6">
                                    <div className={styles.infoGroup}>
                                        <label className={styles.infoLabel}>Email</label>
                                        <div className={styles.infoValue}>{user.email}</div>
                                    </div>
                                </div>

                                {/* ROLE */}
                                <div className="col-md-4">
                                    <div className={styles.infoGroup}>
                                        <label className={styles.infoLabel}>Vai trò</label>
                                        <div className={styles.infoValue}>
                                            <span className={styles.roleBadge}>{user.role}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ACTIVE STATUS */}
                                <div className="col-md-4">
                                    <div className={styles.infoGroup}>
                                        <label className={styles.infoLabel}>Trạng thái tài khoản</label>
                                        <div className={styles.infoValue}>
                                            {user.isActive ? (
                                                <span className={styles.statusActive}>
                                                    <i className="bi bi-check-circle-fill"></i>
                                                    Hoạt động
                                                </span>
                                            ) : (
                                                <span className={styles.statusInactive}>
                                                    <i className="bi bi-x-circle-fill"></i>
                                                    Tạm dừng
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ONLINE STATUS */}
                                <div className="col-md-4">
                                    <div className={styles.infoGroup}>
                                        <label className={styles.infoLabel}>Trạng thái kết nối</label>
                                        <div className={styles.infoValue}>
                                            {user.isOnline ? (
                                                <span className={styles.statusOnline}>
                                                    <i className="bi bi-circle-fill"></i>
                                                    Đang online
                                                </span>
                                            ) : (
                                                <span className={styles.statusOffline}>
                                                    <i className="bi bi-circle"></i>
                                                    Offline
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* CREATED AT */}
                                <div className="col-md-6">
                                    <div className={styles.infoGroup}>
                                        <label className={styles.infoLabel}>Ngày tạo</label>
                                        <div className={styles.infoValue}>
                                            <i className="bi bi-calendar3 me-2 text-muted"></i>
                                            {new Date(user.createdAt).toLocaleString("vi-VN")}
                                        </div>
                                    </div>
                                </div>

                                {/* UPDATED AT */}
                                <div className="col-md-6">
                                    <div className={styles.infoGroup}>
                                        <label className={styles.infoLabel}>Cập nhật lần cuối</label>
                                        <div className={styles.infoValue}>
                                            <i className="bi bi-clock-history me-2 text-muted"></i>
                                            {new Date(user.updatedAt).toLocaleString("vi-VN")}
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                                <button
                                    className={styles.btnEdit}
                                    onClick={() => navigate(`/users/edit/${user.id}`)}
                                >
                                    <i className="bi bi-pencil-square me-1"></i>
                                    Chỉnh sửa
                                </button>

                                <button
                                    className={`${styles.btnToggle} ${!user.isActive ? styles.btnActivate : ''}`}
                                    onClick={handleToggleStatus}
                                    disabled={toggling}
                                >
                                    {toggling ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Đang xử lý...
                                        </>
                                    ) : user.isActive ? (
                                        <>
                                            <i className="bi bi-lock me-1"></i>
                                            Vô hiệu hóa
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-unlock me-1"></i>
                                            Kích hoạt
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* =================== TASKS SECTION ==================== */}
                        <div className={styles.sectionCard}>
                            <h5 className={styles.sectionTitle}>
                                <i className="bi bi-list-task"></i>
                                Nhiệm vụ đã giao
                            </h5>

                            {user.tasks && user.tasks.length > 0 ? (
                                <div>
                                    {user.tasks.map((t) => (
                                        <div key={t.id} className={styles.listItem}>
                                            <i className="bi bi-check2-square me-2 text-success"></i>
                                            {t.title}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <i className="bi bi-inbox mb-2" style={{ fontSize: '2rem', display: 'block' }}></i>
                                    Không có nhiệm vụ nào
                                </div>
                            )}
                        </div>

                        {/* =================== SESSIONS SECTION ==================== */}
                        <div className={styles.sectionCard}>
                            <h5 className={styles.sectionTitle}>
                                <i className="bi bi-activity"></i>
                                Phiên hoạt động
                            </h5>

                            {user.activeSessions && user.activeSessions.length > 0 ? (
                                <div>
                                    {user.activeSessions.map((s) => (
                                        <div key={s.id} className={styles.listItem}>
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <div className="mb-1">
                                                        <i className="bi bi-box-arrow-in-right me-2 text-success"></i>
                                                        <strong>Đăng nhập:</strong> {new Date(s.createdAt).toLocaleString("vi-VN")}
                                                    </div>
                                                    <div>
                                                        <i className="bi bi-hourglass-split me-2 text-warning"></i>
                                                        <strong>Hết hạn:</strong> {new Date(s.expiresAt).toLocaleString("vi-VN")}
                                                    </div>
                                                </div>
                                                <span className="badge bg-success">Active</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <i className="bi bi-wifi-off mb-2" style={{ fontSize: '2rem', display: 'block' }}></i>
                                    Không có phiên hoạt động
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
            <Toast toast={toast} showToast={showToast} />
        </div>
    );
}
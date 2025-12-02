import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllUsers, toggleActive, kickAllSessions } from '@/services/userService';
import styles from '@/assets/styles/userManagement.module.css';

export default function UserManagementPage() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [specFilter, setSpecFilter] = useState("all");
    const [toDelete, setToDelete] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const users = await getAllUsers();
            const mapped = users.map(u => ({
                id: u.id,
                fullName: u.fullName,
                email: u.email,
                role: u.role,
                isActive: u.isActive,
                isOnline: u.isOnline,
                createdAt: new Date(u.createdAt).toLocaleString("vi-VN"),
            }));
            setRows(mapped);
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu users:", err);
            alert("Không thể tải danh sách người dùng");
        } finally {
            setLoading(false);
        }
    };

    function openEdit(row) {
        navigate(`/users/edit/${row.id}`);
    }

    function confirmDelete(row) {
        if (window.confirm(`Bạn có chắc muốn ${row.isActive ? 'khóa' : 'mở khóa'} người dùng "${row.fullName}"?`)) {
            handleToggleActive(row);
        }
    }

    const handleKickAll = async (row) => {
        if (!window.confirm(`Bạn có chắc muốn ĐÁ TẤT CẢ THIẾT BỊ của "${row.fullName}"?`)) return;

        try {
            await kickAllSessions(row.id);
            alert(`Đã đá tất cả thiết bị của ${row.fullName}`);
            await loadUsers();
        } catch (err) {
            console.error("Lỗi khi đá thiết bị:", err);
            alert("Không thể đá tất cả thiết bị!");
        }
    };

    const handleToggleActive = async (row) => {
        try {
            await toggleActive(row.id, row.isActive);
            await loadUsers();
            alert(row.isActive ? "Người dùng đã được khóa thành công." : "Người dùng đã được kích hoạt thành công.");
        } catch (err) {
            console.error("Lỗi khi toggle trạng thái:", err);
            alert("Không thể thay đổi trạng thái người dùng");
        }
    };

    const filteredRows = useMemo(() => {
        return rows.filter(r => {
            const matchesQ = q
                ? r.fullName.toLowerCase().includes(q.toLowerCase()) ||
                r.email.toLowerCase().includes(q.toLowerCase())
                : true;

            const matchesStatus =
                status === "all" ? true :
                    status === "active" ? r.isActive :
                        !r.isActive;

            const matchesSpec =
                specFilter === "all" ? true : r.role === specFilter;

            return matchesQ && matchesStatus && matchesSpec;
        });
    }, [rows, q, status, specFilter]);

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">

                {/* =================== HEADER ==================== */}
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <span className={styles.chip}>
                            <i className="bi bi-people"></i>
                        </span>
                        <h4 className={`${styles.pageTitle} mb-0`}>Quản lý người dùng</h4>
                    </div>
                    <button 
                        className={styles.btnTeal} 
                        onClick={() => navigate("/users/create")}
                    >
                        <i className="bi bi-plus-lg me-2"></i>
                        Thêm mới
                    </button>
                </div>

                {/* =================== FILTER TOOLBAR ==================== */}
                <div className={`${styles.glass} ${styles.toolbar} p-3 p-md-4 mb-3`}>
                    <div className="row g-3 align-items-end">
                        <div className="col-md-4">
                            <label className="form-label">Tìm kiếm</label>
                            <input
                                className="form-control"
                                placeholder="Tên, email..."
                                value={q}
                                onChange={e => setQ(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Trạng thái</label>
                            <select 
                                className="form-select" 
                                value={status} 
                                onChange={e => setStatus(e.target.value)}
                            >
                                <option value="all">Tất cả</option>
                                <option value="active">Hoạt động</option>
                                <option value="suspended">Tạm dừng</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Vai trò</label>
                            <select 
                                className="form-select" 
                                value={specFilter} 
                                onChange={e => setSpecFilter(e.target.value)}
                            >
                                <option value="all">Tất cả</option>
                                <option value="doctor">Bác sĩ</option>
                                <option value="admin">Quản trị viên</option>
                               
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label d-none d-md-block">&nbsp;</label>
                            <button
                                className={`${styles.btnClear} w-100`}
                                onClick={() => { 
                                    setQ(''); 
                                    setStatus('all'); 
                                    setSpecFilter('all'); 
                                }}
                            >
                                <i className="bi bi-x-circle me-1"></i>
                                Xóa lọc
                            </button>
                        </div>
                    </div>
                </div>

                {/* =================== TABLE ==================== */}
                <div className={`${styles.glass} ${styles.tableCard} p-2 p-md-3`}>
                    <div className="table-responsive">
                        <table className={`table ${styles.table} align-middle mb-0`}>
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>#</th>
                                    <th>Họ tên</th>
                                    <th>Email</th>
                                    <th>Vai trò</th>
                                    <th>Trạng thái</th>
                                    <th style={{ width: '80px' }}>Online</th>
                                    <th>Ngày tạo</th>
                                    <th className="text-end">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className={styles.loadingState}>
                                            <div className="spinner-border text-primary mb-2" role="status"></div>
                                            <p className="mb-0">Đang tải dữ liệu...</p>
                                        </td>
                                    </tr>
                                ) : filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className={styles.emptyState}>
                                            <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                            Không tìm thấy người dùng
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((r, idx) => (
                                        <tr key={r.id}>
                                            <td>{idx + 1}</td>
                                            <td className="fw-semibold">{r.fullName}</td>
                                            <td>{r.email}</td>
                                            <td>
                                                <span className={styles.badgeTeal}>{r.role==="admin" ? "Quản trị viên" : r.role==="doctor" ? "Bác sĩ" : r.role}</span>
                                            </td>
                                            <td>
                                                {r.isActive ? (
                                                    <span className={styles.badgeActive}>Hoạt động</span>
                                                ) : (
                                                    <span className={styles.badgeInactive}>Tạm dừng</span>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                {r.isOnline ? (
                                                    <i className={`bi bi-check-circle-fill ${styles.iconOnline}`}></i>
                                                ) : (
                                                    <i className={`bi bi-x-circle ${styles.iconOffline}`}></i>
                                                )}
                                            </td>
                                            <td>{r.createdAt}</td>
                                            <td>
                                                <div className="d-flex justify-content-end gap-1">
                                                    <button
                                                        className={styles.btnView}
                                                        onClick={() => navigate(`/user-detail/${r.id}`)}
                                                        title="Xem chi tiết"
                                                    >
                                                        <i className="bi bi-eye"></i>
                                                    </button>

                                                    <button
                                                        className={styles.btnEdit}
                                                        onClick={() => openEdit(r)}
                                                        title="Chỉnh sửa"
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </button>

                                                    <button
                                                        className={styles.btnDanger}
                                                        onClick={() => handleKickAll(r)}
                                                        title="Đá toàn bộ thiết bị"
                                                    >
                                                        <i className="bi bi-box-arrow-right"></i>
                                                    </button>

                                                    <button
                                                        className={r.isActive ? styles.btnLock : styles.btnUnlock}
                                                        onClick={() => confirmDelete(r)}
                                                        title={r.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                                    >
                                                        <i className={`bi ${r.isActive ? 'bi-lock' : 'bi-unlock'}`}></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

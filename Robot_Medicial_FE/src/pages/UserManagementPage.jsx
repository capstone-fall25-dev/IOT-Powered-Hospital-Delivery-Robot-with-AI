import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllUsers, toggleActive } from '@/services/userService';
import styles from '@/assets/styles/userManagement.module.css'; // import CSS module

export default function UserManagementPage() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [specFilter, setSpecFilter] = useState("all");
    const [toDelete, setToDelete] = useState(null);
    const [loading, setLoading] = useState(false);

    // Load users
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
        setToDelete(row);
        // Giả sử bạn có modal #confirm, nếu không thì gọi trực tiếp handleToggle
        if (window.bootstrap?.Modal) {
            window.bootstrap?.Modal.getOrCreateInstance("#confirm").show();
        } else {
            // Fallback: gọi trực tiếp nếu không có modal
            handleToggleActive(row);
        }
    }

    const handleToggleActive = async (row) => {
        try {
            await toggleActive(row.id, row.isActive);
            await loadUsers(); // Refresh list
            alert(row.isActive ? "Người dùng đã được khóa thành công." : "Người dùng đã được kích hoạt thành công.");
        } catch (err) {
            console.error("Lỗi khi toggle trạng thái:", err);
            alert("Không thể thay đổi trạng thái người dùng");
        }
    };

    // Nếu có modal confirm, thêm event listener hoặc onConfirm handler để gọi handleToggleActive(toDelete)
    // Ví dụ: trong modal, button confirm onClick={() => { handleToggleActive(toDelete); window.bootstrap.Modal.getInstance("#confirm").hide(); setToDelete(null); }}

    // Filtered rows
    const filteredRows = useMemo(() => {
        return rows.filter(r => {
            // search filter
            const matchesQ = q
                ? r.fullName.toLowerCase().includes(q.toLowerCase()) ||
                r.email.toLowerCase().includes(q.toLowerCase())
                : true;

            // status filter
            const matchesStatus =
                status === "all" ? true :
                    status === "active" ? r.isActive :
                        !r.isActive;

            // spec/role filter
            const matchesSpec =
                specFilter === "all" ? true : r.role === specFilter;

            return matchesQ && matchesStatus && matchesSpec;
        });
    }, [rows, q, status, specFilter]);

    return (
        <div className={styles.page}>
            <div className="container-fluid py-4">
                <div className="container-lg">
                    {/* HEADER */}
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className={styles.chip}><i className="bi bi-person-lines-fill me-1"></i></span>
                            <h4 className="mb-0 fw-bold">Quản lý người dùng</h4>
                        </div>
                        <div className="d-flex gap-2">
                            <button className={`${styles.btnTeal} rounded-pill px-3 py-2`} onClick={() => navigate("/users/create")}>
                                <i className="bi bi-plus-lg me-1"></i> Thêm mới
                            </button>
                        </div>
                    </div>

                    {/* FILTER TOOLBAR */}
                    <div className={`${styles.glass} ${styles.rounded2xl} p-3 p-md-4 mb-3 toolbar`}>
                        <div className="row g-2 align-items-end">
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
                                <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                                    <option value="all">Tất cả</option>
                                    <option value="active">Hoạt động</option>
                                    <option value="suspended">Tạm dừng</option>
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Vai trò</label>
                                <select className="form-select" value={specFilter} onChange={e => setSpecFilter(e.target.value)}>
                                    <option value="all">Tất cả</option>
                                    <option value="doctor">Doctor</option>
                                    <option value="admin">Admin</option>
                                    <option value="nurse">Nurse</option>
                                </select>
                            </div>
                            <div className="col-md-2 text-md-end">
                                <label className="form-label d-block">&nbsp;</label>
                                <button
                                    className="btn btn-light rounded-pill w-100"
                                    onClick={() => { setQ(''); setStatus('all'); setSpecFilter('all'); }}
                                >
                                    <i className="bi bi-x-circle me-1"></i> Xóa lọc
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className={`${styles.glass} ${styles.rounded2xl} p-2 p-md-3`}>
                        <div className="table-responsive">
                            <table className="table align-middle">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Họ tên</th>
                                        <th>Email</th>
                                        <th>Vai trò</th>
                                        <th>Trạng thái</th>
                                        <th>Online</th>
                                        <th>Ngày tạo</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={8} className="text-center text-muted py-4">
                                                <div className="spinner-border" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredRows.map((r, idx) => (
                                        <tr key={r.id}>
                                            <td>{idx + 1}</td>
                                            <td>{r.fullName}</td>
                                            <td>{r.email}</td>
                                            <td>
                                                <span className="badge bg-info-subtle text-dark border">{r.role}</span>
                                            </td>
                                            <td>
                                                {r.isActive ? (
                                                    <span className="badge bg-success-subtle text-success border">Hoạt động</span>
                                                ) : (
                                                    <span className="badge bg-secondary-subtle text-secondary border">Tạm dừng</span>
                                                )}
                                            </td>
                                            <td>
                                                {r.isOnline ? (
                                                    <i className="bi bi-check-circle-fill text-success"></i>
                                                ) : (
                                                    <i className="bi bi-x-circle-fill text-danger"></i>
                                                )}
                                            </td>
                                            <td>{r.createdAt}</td>
                                            <td className="">
                                                <div className="btn-group btn-group-sm">

                                                    {/* VIEW DETAIL */}
                                                    <button
                                                        className="btn btn-outline-info"
                                                        onClick={() => navigate(`/user-detail/${r.id}`)}
                                                    >
                                                        <i className="bi bi-eye-fill"></i> Xem
                                                    </button>

                                                    {/* EDIT */}
                                                    <button
                                                        className="btn btn-outline-secondary"
                                                        onClick={() => openEdit(r)}
                                                    >
                                                        <i className="bi bi-pencil"></i> Sửa
                                                    </button>

                                                    {/* ACTIVE / DEACTIVATE */}
                                                    <button
                                                        className={`btn ${r.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                                        onClick={() => confirmDelete(r)}
                                                    >
                                                        <i className={`bi ${r.isActive ? 'bi-lock-fill' : 'bi-unlock-fill'}`}></i>
                                                        {r.isActive ? ' Khóa' : ' Mở'}
                                                    </button>

                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {loading === false && filteredRows.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="text-center text-muted py-4">Không có dữ liệu</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
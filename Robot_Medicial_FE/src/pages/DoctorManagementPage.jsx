import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllUsers } from '@/services/userService';
import styles from '@/assets/styles/doctorManagement.module.css'; // import CSS module

export default function DoctorManagement() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [specFilter, setSpecFilter] = useState("all");
    const [sort, setSort] = useState({ key: "name", dir: "asc" });
    const [toDelete, setToDelete] = useState(null);

    useEffect(() => {
        getAllUsers()
            .then(users => {
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
            })
            .catch(err => {
                console.error("Lỗi khi lấy dữ liệu users:", err);
                alert("Không thể tải danh sách người dùng");
            });
    }, []);

    function openEdit(row) {
        navigate(`/doctor-profile/${row.id}`);
    }

    function confirmDelete(row) {
        setToDelete(row);
        window.bootstrap?.Modal.getOrCreateInstance("#confirm").show();
    }

    return (
        <div className={styles.page}>
            <div className="container-fluid py-4">
                <div className="container-lg">
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className={styles.chip}><i className="bi bi-person-lines-fill me-1"></i></span>
                            <h4 className="mb-0 fw-bold">Quản lý người dùng</h4>
                        </div>
                        <div className="d-flex gap-2">
                            <button className={`${styles.btnTeal} rounded-pill`} onClick={() => navigate("/doctor-profile")}>
                                <i className="bi bi-plus-lg me-1"></i> Thêm mới
                            </button>
                        </div>
                    </div>

                    <div className={`${styles.glass} ${styles.rounded2xl} p-3 p-md-4 mb-3 toolbar`}>
                        <div className="row g-2 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label">Tìm kiếm</label>
                                <input
                                    className="form-control"
                                    placeholder="Tên, email, bệnh viện..."
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
                            <div className="col-md-2 text-md-end">
                                <label className="form-label d-block"> </label>
                                <button
                                    className="btn btn-light rounded-pill w-100"
                                    onClick={() => { setQ(''); setStatus('all'); setSpecFilter('all'); }}
                                >
                                    <i className="bi bi-x-circle me-1"></i> Xóa lọc
                                </button>
                            </div>
                        </div>
                    </div>

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
                                        <th className="text-end">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, idx) => (
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
                                                    <i className="bi bi-circle-fill text-success"></i>
                                                ) : (
                                                    <i className="bi bi-circle text-muted"></i>
                                                )}
                                            </td>
                                            <td>{r.createdAt}</td>
                                            <td className="text-end">
                                                <div className="btn-group btn-group-sm">
                                                    <button className="btn btn-outline-secondary" onClick={() => openEdit(r)}>
                                                        <i className="bi bi-pencil"></i> Sửa
                                                    </button>
                                                    <button className="btn btn-outline-danger" onClick={() => confirmDelete(r)}>
                                                        <i className="bi bi-file-lock"></i> Khóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {rows.length === 0 && (
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

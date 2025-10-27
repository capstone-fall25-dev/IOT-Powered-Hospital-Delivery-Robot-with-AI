
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
/**
 * MedFleet — Doctor Management (React + Bootstrap)
 * Tone: teal/seafoam + glass (match other screens)
 * Features:
 *  - Search, filter by status/specialty, sort by column
 *  - Add/Edit doctor in offcanvas form
 *  - Delete with confirmation
 *  - Status badges, specialty chips
 *  - Export CSV
 */
export default function DoctorManagement() {
    // Load Bootstrap/Icons/Fonts for standalone preview
    useEffect(() => {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
        document.head.appendChild(css);

        const icons = document.createElement("link");
        icons.rel = "stylesheet";
        icons.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css";
        document.head.appendChild(icons);

        const font = document.createElement("link");
        font.rel = "stylesheet";
        font.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
        document.head.appendChild(font);

        const js = document.createElement("script");
        js.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
        js.defer = true; document.body.appendChild(js);

        return () => { document.head.removeChild(css); document.head.removeChild(icons); document.head.removeChild(font); document.body.removeChild(js); };
    }, []);
    const navigate = useNavigate();
    const styles = (
        <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(900px 500px at 20% 10%, rgba(76,225,198,.16), transparent 60%),radial-gradient(800px 400px at 85% 8%, rgba(76,225,198,.12), transparent 60%),linear-gradient(180deg, #f6faf9 0%, #eef6f5 20%, #e9f3f1 60%, #e8f0ee 100%);min-height:100vh}
      .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.85);box-shadow:0 18px 56px rgba(15,23,42,.08);border-radius:24px}
      .rounded-2xl{border-radius:24px}
      .chip{display:inline-block;padding:.25rem .6rem;border-radius:999px;background:rgba(20,226,193,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
      .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
      .btn-teal:hover{filter:brightness(1.05)}
      .badge-soft{background:rgba(20,226,193,.18);color:#0b3e3c}
      .table thead th{white-space:nowrap}
      .table tbody td{vertical-align:middle}
      .toolbar .form-control, .toolbar .form-select{border-radius:12px}
      .offcanvas{--bs-offcanvas-width: 520px}
    `}</style>
    );

    // Khai báo dữ liệu bác sĩ mặc định
    const [rows, setRows] = useState([
        {
            id: "1",
            name: "BS. Nguyễn Văn A",
            email: "nguyenvana@example.com",
            hospital: "Bệnh viện Bạch Mai",
            specialty: "Nội khoa",
            status: "active",
            username: "bsvana",
        },
        {
            id: "2",
            name: "BS. Trần Thị B",
            email: "tranthib@example.com",
            hospital: "Bệnh viện 108",
            specialty: "Da liễu",
            status: "suspended",
            username: "bstranthiB",
        },
    ]);

    // Bộ lọc & sắp xếp
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [specFilter, setSpecFilter] = useState("all");

    // Lấy danh sách chuyên khoa duy nhất
    const specs = useMemo(
        () => Array.from(new Set(rows.map((r) => r.specialty))),
        [rows]
    );

    // Sắp xếp ban đầu
    const [sort, setSort] = useState({ key: "name", dir: "asc" });

    // --- Bộ lọc tổng hợp
    const filtered = useMemo(() => {
        return rows.filter(
            (r) =>
                (status === "all" || r.status === status) &&
                (specFilter === "all" || r.specialty === specFilter) &&
                (q === "" ||
                    [r.name, r.email, r.hospital, r.specialty, r.username]
                        .join(" ")
                        .toLowerCase()
                        .includes(q.toLowerCase()))
        );
    }, [rows, q, status, specFilter]);

    // --- Sắp xếp dữ liệu hiển thị
    const data = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a, b) => {
            const va = String(a[sort.key]).toLowerCase();
            const vb = String(b[sort.key]).toLowerCase();
            return sort.dir === "asc"
                ? va.localeCompare(vb)
                : vb.localeCompare(va);
        });
        return arr;
    }, [filtered, sort]);

    // --- Toggle sắp xếp cột
    function toggleSort(k) {
        setSort((s) =>
            s.key === k
                ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" }
                : { key: k, dir: "asc" }
        );
    }

    // --- CRUD (in-memory)
    const emptyForm = {
        id: "",
        name: "",
        email: "",
        hospital: "",
        specialty: "Nội khoa",
        status: "active",
        username: "",
    };

    const [form, setForm] = useState(emptyForm);
    const [mode, setMode] = useState("add");
    const [toDelete, setToDelete] = useState(null);


    function save() {
        if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            alert("Vui lòng nhập Tên & Email hợp lệ");
            return;
        }
        setRows((prev) => {
            const exists = prev.some((r) => r.id === form.id);
            return exists ? prev.map((r) => (r.id === form.id ? form : r)) : [...prev, form];
        });
        window.bootstrap?.Offcanvas.getOrCreateInstance("#drawer").hide();
    }
    function openEdit(row) {
        navigate("/doctor-profile", { state: { doctor: row, mode: "edit" } });
    }
    function confirmDelete(row) {
        setToDelete(row);
        window.bootstrap?.Modal.getOrCreateInstance("#confirm").show();
    }

    function doDelete() {
        if (!toDelete) return;
        setRows((prev) => prev.filter((r) => r.id !== toDelete.id));
        window.bootstrap?.Modal.getOrCreateInstance("#confirm").hide();
    }

    function exportCSV() {
        const rowsCsv = [
            ["Tên bác sĩ", "Email", "Bệnh viện", "Chuyên khoa", "Trạng thái", "Tài khoản"],
            ...data.map((r) => [
                r.name,
                r.email,
                r.hospital,
                r.specialty,
                r.status === "active" ? "Hoạt động" : "Tạm dừng",
                r.username,
            ]),
        ];
        const csv = rowsCsv
            .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "doctors.csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="page">
            {styles}
            <div className="container-fluid py-4">
                <div className="container-lg">
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className="chip"><i className="bi bi-person-lines-fill me-1"></i> Bác sĩ</span>
                            <h4 className="mb-0 fw-bold">Quản lý bác sĩ</h4>
                        </div>
                        <div className="d-flex gap-2">
                            <button className="btn btn-outline-secondary rounded-pill" onClick={exportCSV}><i className="bi bi-download me-1"></i> Xuất CSV</button>
                            <button className="btn btn-teal rounded-pill" onClick={() => navigate("/doctor-profile")}><i className="bi bi-plus-lg me-1"></i> Thêm mới bác sĩ</button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="glass rounded-2xl p-3 p-md-4 mb-3 toolbar">
                        <div className="row g-2 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label">Tìm kiếm</label>
                                <input className="form-control" placeholder="Tên, email, bệnh viện..." value={q} onChange={e => setQ(e.target.value)} />
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
                                <label className="form-label">Chuyên khoa</label>
                                <select className="form-select" value={specFilter} onChange={e => setSpecFilter(e.target.value)}>
                                    <option value="all">Tất cả</option>
                                    {specs.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="col-md-2 text-md-end">
                                <label className="form-label d-block"> </label>
                                <button className="btn btn-light rounded-pill w-100" onClick={() => { setQ(''); setStatus('all'); setSpecFilter('all'); }}><i className="bi bi-x-circle me-1"></i> Xóa lọc</button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass rounded-2xl p-2 p-md-3">
                        <div className="table-responsive">
                            <table className="table align-middle">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th role="button" onClick={() => toggleSort('name')}>Tên bác sĩ {sort.key === 'name' && (sort.dir === 'asc' ? '▲' : '▼')}</th>
                                        <th role="button" onClick={() => toggleSort('email')}>Email {sort.key === 'email' && (sort.dir === 'asc' ? '▲' : '▼')}</th>
                                        <th>Bệnh viện</th>
                                        <th>Chuyên khoa</th>
                                        <th>Trạng thái</th>
                                        <th>Tài khoản</th>
                                        <th className="text-end">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((r, idx) => (
                                        <tr key={r.id}>
                                            <td>{idx + 1}</td>
                                            <td>{r.name}</td>
                                            <td>{r.email}</td>
                                            <td>{r.hospital}</td>
                                            <td><span className="badge rounded-pill bg-light text-dark border">{r.specialty}</span></td>
                                            <td>
                                                {r.status === 'active' ? (
                                                    <span className="badge bg-success-subtle text-success border">Hoạt động</span>
                                                ) : (
                                                    <span className="badge bg-secondary-subtle text-secondary border">Tạm dừng</span>
                                                )}
                                            </td>
                                            <td>{r.username}</td>
                                            <td className="text-end">
                                                <div className="btn-group btn-group-sm">
                                                    <button className="btn btn-outline-secondary" onClick={() => openEdit(r)} ><i className="bi bi-pencil"></i> Sửa</button>
                                                    <button className="btn btn-outline-danger" onClick={() => confirmDelete(r)}><i className="bi bi-trash"></i> Xóa</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {data.length === 0 && (
                                        <tr><td colSpan={8} className="text-center text-muted py-4">Không có dữ liệu</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm delete */}
            <div className="modal fade" id="confirm" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title"><i className="bi bi-exclamation-triangle text-danger me-2"></i>Xóa bác sĩ?</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
                        </div>
                        <div className="modal-body">
                            Bạn có chắc muốn xóa <strong>{toDelete?.name}</strong>? Hành động này không thể hoàn tác.
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Hủy</button>
                            <button type="button" className="btn btn-danger" onClick={doDelete}>Xóa</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

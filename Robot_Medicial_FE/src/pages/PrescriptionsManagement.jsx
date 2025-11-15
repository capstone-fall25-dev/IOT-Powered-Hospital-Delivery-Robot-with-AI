// src/pages/PrescriptionManagement.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPrescriptions, softDeletePrescription, restorePrescription } from "@/services/prescriptionServices";

const styles = (
    <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(900px 500px at 20% 10%, rgba(76,225,198,.16), transparent 60%),radial-gradient(800px 400px at 85% 8%, rgba(76,225,198,.12), transparent 60%),linear-gradient(180deg, #f6faf9 0%, #eef6f5 20%, #e9f3f1 60%, #e8f0ee 100%);min-height:100vh}
      .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.85);box-shadow:0 18px 56px rgba(15,23,42,.08);border-radius:5px}
      .chip{display:inline-block;padding:.25rem .6rem;border-radius:999px;background:rgba(20,226,193,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
      .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
      .btn-teal:hover{filter:brightness(1.05)}
      .toolbar .form-control, .toolbar .form-select{border-radius:12px}
      .table thead th{white-space:nowrap}
      .table tbody td{vertical-align:middle}
    `}</style>
);

const statusLabel = (status) => {
    switch (status) {
        case "pending": return "Chờ duyệt";
        case "approved": return "Đã duyệt";
        case "dispensed": return "Đã cấp phát";
        case "canceled": return "Đã hủy";
        default: return status;
    }
};

const statusBadgeClass = (status) => {
    switch (status) {
        case "pending": return "bg-warning-subtle text-warning";
        case "approved": return "bg-success-subtle text-success";
        case "dispensed": return "bg-primary-subtle text-primary";
        case "canceled": return "bg-secondary-subtle text-secondary";
        default: return "bg-light text-dark";
    }
};

export default function PrescriptionManagement() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await getAllPrescriptions();
                setRows(data);
            } catch (err) {
                console.error("Lỗi khi tải danh sách đơn thuốc:", err);
                alert("Không thể tải danh sách đơn thuốc");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const filtered = useMemo(() => {
        return rows.filter((r) => {
            const matchStatus =
                status === "all" ? true : r.status === status;
            const keyword = q.trim().toLowerCase();
            const matchSearch =
                keyword === "" ||
                [r.prescriptionCode, r.patientName]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(keyword);

            return matchStatus && matchSearch;
        });
    }, [rows, q, status]);

    const handleSoftDelete = async (id) => {
        if (!window.confirm("Bạn có chắc muốn hủy đơn thuốc này?")) return;
        try {
            await softDeletePrescription(id);
            setRows((prev) =>
                prev.map((p) =>
                    p.id === id ? { ...p, status: "canceled" } : p
                )
            );
        } catch (err) {
            console.error(err);
            alert("Không thể hủy đơn thuốc");
        }
    };

    const handleRestore = async (id) => {
        try {
            const res = await restorePrescription(id);
            setRows((prev) =>
                prev.map((p) => (p.id === id ? { ...p, status: res.status } : p))
            );
        } catch (err) {
            console.error(err);
            alert("Không thể khôi phục đơn thuốc");
        }
    };

    return (
        <div className="page">
            {styles}
            <div className="container-fluid py-4">
                <div className="container-lg">

                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className="chip"><i className="bi bi-file-medical me-1"></i></span>
                            <h4 className="mb-0 fw-bold">Quản lý đơn thuốc</h4>
                        </div>
                        <div>
                            <button
                                className="btn btn-teal rounded-pill"
                                onClick={() => navigate("/prescriptions/add")}
                            >
                                <i className="bi bi-plus-lg me-1"></i> Thêm đơn thuốc
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="glass p-3 p-md-4 mb-3 toolbar">
                        <div className="row g-2 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label">Tìm kiếm</label>
                                <input
                                    className="form-control"
                                    placeholder="Mã đơn, tên bệnh nhân..."
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Trạng thái</label>
                                <select
                                    className="form-select"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="pending">Chờ duyệt</option>
                                    <option value="approved">Đã duyệt</option>
                                    <option value="dispensed">Đã cấp phát</option>
                                    <option value="canceled">Đã hủy</option>
                                </select>
                            </div>
                            <div className="col-md-2 text-md-end">
                                <label className="form-label d-block"> </label>
                                <button
                                    className="btn btn-light rounded-pill w-100"
                                    onClick={() => { setQ(""); setStatus("all"); }}
                                >
                                    <i className="bi bi-x-circle me-1"></i> Xóa lọc
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass p-2 p-md-3">
                        {loading ? (
                            <div className="text-center py-4">Đang tải...</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table align-middle">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Mã đơn</th>
                                            <th>Bệnh nhân</th>
                                            <th>Thuốc</th>
                                            <th>Trạng thái</th>
                                            <th>Ngày tạo</th>
                                            <th className="text-end">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((r, idx) => {
                                            const medicineSummary =
                                                (r.items || [])
                                                    .map((i) => i.medicineName || i.medicineCode)
                                                    .filter(Boolean)
                                                    .slice(0, 3)
                                                    .join(", ") +
                                                ((r.items || []).length > 3 ? "..." : "");

                                            return (
                                                <tr key={r.id}>
                                                    <td>{idx + 1}</td>
                                                    <td>{r.prescriptionCode}</td>
                                                    <td>{r.patientName}</td>
                                                    <td style={{ maxWidth: 260 }}>
                                                        <small className="text-muted">
                                                            {medicineSummary || "—"}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${statusBadgeClass(r.status)}`}>
                                                            {statusLabel(r.status)}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(r.createdAt).toLocaleString("vi-VN")}</td>
                                                    <td className="text-end">
                                                        <div className="btn-group">
                                                            <button
                                                                className="btn btn-outline-secondary btn-sm"
                                                                onClick={() => navigate(`/prescriptions/${r.id}`)}
                                                            >
                                                                Xem
                                                            </button>
                                                            <button
                                                                className="btn btn-outline-primary btn-sm"
                                                                onClick={() => navigate(`/prescriptions/${r.id}/edit`)}
                                                            >
                                                                Sửa
                                                            </button>
                                                            {r.status !== "canceled" ? (
                                                                <button
                                                                    className="btn btn-outline-danger btn-sm"
                                                                    onClick={() => handleSoftDelete(r.id)}
                                                                >
                                                                    Hủy
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="btn btn-outline-success btn-sm"
                                                                    onClick={() => handleRestore(r.id)}
                                                                >
                                                                    Khôi phục
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filtered.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={7} className="text-center text-muted py-4">
                                                    Không có dữ liệu
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
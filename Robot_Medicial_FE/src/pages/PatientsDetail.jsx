import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { patientService, dischargePatient } from "@/services/patientService";

export default function PatientDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [reason, setReason] = useState("");
    const [dischargeLoading, setDischargeLoading] = useState(false);

    // 🧩 Load dữ liệu bệnh nhân
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

        patientService
            .getPatientById(id)
            .then((data) => setForm(data))
            .catch(() => alert("Không thể tải thông tin bệnh nhân"));

        return () => {
            document.head.removeChild(css);
            document.head.removeChild(icons);
            document.head.removeChild(font);
        };
    }, [id]);

    if (!form)
        return (
            <div className="text-center mt-5">
                <div className="spinner-border text-success" role="status"></div>
                <p>Đang tải thông tin bệnh nhân...</p>
            </div>
        );

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // 🧩 Cập nhật thông tin bệnh nhân
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await patientService.updatePatient(id, form);
            alert("Cập nhật bệnh nhân thành công!");
            navigate("/patients");
        } catch (err) {
            console.error(err);
            alert("Cập nhật thất bại!");
        } finally {
            setLoading(false);
        }
    };

    // 🧩 Xử lý xuất viện
    const handleDischarge = async () => {
        if (!reason.trim()) {
            alert("Vui lòng nhập lý do xuất viện!");
            return;
        }
        setDischargeLoading(true);
        try {
            await dischargePatient(id, reason);
            alert("Bệnh nhân đã được xuất viện!");
            setShowModal(false);
            navigate("/patients");
        } catch (err) {
            console.error("Discharge error:", err);
            alert("Xuất viện thất bại!");
        } finally {
            setDischargeLoading(false);
        }
    };

    return (
        <div className="page d-flex flex-column align-items-center py-5">
            <style>{`
        :root { --teal:#4CE1C6; --ink:#0f172a; }
        .page {
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          color: #0b1324;
          background: radial-gradient(900px 500px at 20% 10%, rgba(76,225,198,.16), transparent 60%),
                      radial-gradient(800px 400px at 85% 8%, rgba(76,225,198,.12), transparent 60%),
                      linear-gradient(180deg, #f6faf9 0%, #eef6f5 20%, #e9f3f1 60%, #e8f0ee 100%);
          min-height: 100vh;
        }
        .glass {
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,.85);
          box-shadow: 0 18px 56px rgba(15,23,42,.08);
          border-radius: 24px;
        }
        .btn-teal { background: var(--teal); border: none; color: #052a2b; font-weight: 700; }
        .btn-teal:hover { filter: brightness(1.05); }
      `}</style>

            <div className="container glass p-5" style={{ maxWidth: 800 }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="fw-bold">
                        <i className="bi bi-person-vcard me-2 text-success"></i>
                        Thông tin bệnh nhân
                    </h3>
                    <button className="btn btn-teal" onClick={() => navigate("/patients")}>
                        <i className="bi bi-arrow-left-circle me-1"></i> Quay lại
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label">Mã bệnh nhân</label>
                            <input type="text" name="patientCode" value={form.patientCode} onChange={handleChange} className="form-control" required />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Họ tên</label>
                            <input type="text" name="fullName" value={form.fullName} onChange={handleChange} className="form-control" required />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Giới tính</label>
                            <select name="gender" value={form.gender} onChange={handleChange} className="form-select">
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                            </select>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Ngày sinh</label>
                            <input type="date" name="dob" value={form.dob?.slice(0, 10)} onChange={handleChange} className="form-control" required />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Số điện thoại</label>
                            <input type="text" name="phone" value={form.phone} onChange={handleChange} className="form-control" />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Địa chỉ</label>
                            <input type="text" name="address" value={form.address} onChange={handleChange} className="form-control" />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Khoa</label>
                            <input type="text" name="department" value={form.department} onChange={handleChange} className="form-control" />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Phòng</label>
                            <input type="text" name="roomName" value={form.roomName} onChange={handleChange} className="form-control" />
                        </div>

                        <div className="col-12 text-end mt-4">
                            <button type="button" className="btn btn-outline-secondary rounded-pill me-2" onClick={() => navigate("/patients")}>
                                Hủy
                            </button>
                            <button type="submit" className="btn btn-teal rounded-pill me-2" disabled={loading}>
                                {loading ? "Đang lưu..." : "Cập nhật bệnh nhân"}
                            </button>
                            <button type="button" className="btn btn-success rounded-pill" onClick={() => setShowModal(true)} disabled={form.status === "discharged"}>
                                Xuất viện
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* 🧩 Modal nhập lý do xuất viện */}
            {showModal && (
                <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog">
                        <div className="modal-content p-3">
                            <h5 className="modal-title mb-3">Lý do xuất viện</h5>
                            <textarea
                                className="form-control mb-3"
                                rows={3}
                                placeholder="Nhập lý do xuất viện..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            ></textarea>
                            <div className="text-end">
                                <button className="btn btn-outline-secondary me-2" onClick={() => setShowModal(false)}>
                                    Hủy
                                </button>
                                <button className="btn btn-teal" onClick={handleDischarge} disabled={dischargeLoading}>
                                    {dischargeLoading ? "Đang xử lý..." : "Xác nhận xuất viện"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

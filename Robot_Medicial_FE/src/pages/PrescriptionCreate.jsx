// src/pages/PrescriptionCreate.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPrescription } from "@/services/prescriptionServices";
import { getAllPatients } from "@/services/patientService";

const styles = (
    <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(900px 500px at 20% 10%, rgba(76,225,198,.16), transparent 60%),radial-gradient(800px 400px at 85% 8%, rgba(76,225,198,.12), transparent 60%),linear-gradient(180deg, #f6faf9 0%, #eef6f5 20%, #e9f3f1 60%, #e8f0ee 100%);min-height:100vh}
      .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.85);box-shadow:0 18px 56px rgba(15,23,42,.08);border-radius:5px}
      .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
      .btn-teal:hover{filter:brightness(1.05)}
    `}</style>
);

export default function PrescriptionCreate() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [form, setForm] = useState({
        prescriptionCode: "",
        patientId: "",
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const data = await getAllPatients();
                setPatients(data);
            } catch (err) {
                console.error(err);
                alert("Không tải được danh sách bệnh nhân");
            }
        }
        load();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.prescriptionCode || !form.patientId) {
            setMessage("Vui lòng nhập đầy đủ Mã đơn và Bệnh nhân.");
            return;
        }
        setSaving(true);
        setMessage("");
        try {
            const payload = {
                prescriptionCode: form.prescriptionCode.trim(),
                patientId: Number(form.patientId),
            };
            const created = await createPrescription(payload);
            setMessage("Tạo đơn thuốc thành công!");
            setTimeout(() => {
                navigate(`/prescriptions/${created.id}`);
            }, 800);
        } catch (err) {
            console.error(err);
            setMessage(err.response?.data || "Tạo đơn thuốc thất bại");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="page">
            {styles}
            <div className="container-lg py-4">
                <div className="mb-3">
                    <button className="btn btn-link px-0" onClick={() => navigate(-1)}>
                        <i className="bi bi-arrow-left"></i> Quay lại
                    </button>
                    <h4 className="fw-bold mt-2">Tạo đơn thuốc mới</h4>
                </div>

                <div className="glass p-4">
                    <form onSubmit={handleSubmit} className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label fw-semibold">Mã đơn thuốc</label>
                            <input
                                className="form-control"
                                value={form.prescriptionCode}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, prescriptionCode: e.target.value }))
                                }
                                placeholder="VD: RX001"
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label fw-semibold">Bệnh nhân</label>
                            <select
                                className="form-select"
                                value={form.patientId}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, patientId: e.target.value }))
                                }
                            >
                                <option value="">— Chọn bệnh nhân —</option>
                                {patients.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.fullName} ({p.patientCode})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-12">
                            <small className="text-muted">
                                Sau khi tạo đơn, bạn có thể thêm thuốc (items) ở màn chi tiết.
                            </small>
                        </div>

                        <div className="col-12 mt-2">
                            <button
                                type="submit"
                                className="btn btn-teal w-100 py-2"
                                disabled={saving}
                            >
                                {saving ? "Đang lưu..." : "Tạo đơn thuốc"}
                            </button>
                        </div>

                        {message && (
                            <div className="col-12 text-center mt-2 fw-semibold">
                                {message}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
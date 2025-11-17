// src/pages/PrescriptionCreate.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPrescription } from "@/services/prescriptionServices";
import { getAllPatients } from "@/services/patientService";
import styles from "@/assets/styles/prescriptionForm.module.css";

export default function PrescriptionCreate() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [form, setForm] = useState({
        prescriptionCode: "",
        patientId: "",
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

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
            setMessage({ 
                text: "Vui lòng nhập đầy đủ Mã đơn và Bệnh nhân.", 
                type: "error" 
            });
            return;
        }
        setSaving(true);
        setMessage({ text: "", type: "" });
        try {
            const payload = {
                prescriptionCode: form.prescriptionCode.trim(),
                patientId: Number(form.patientId),
            };
            const created = await createPrescription(payload);
            setMessage({ 
                text: "Tạo đơn thuốc thành công!", 
                type: "success" 
            });
            setTimeout(() => {
                navigate(`/prescriptions/${created.id}`);
            }, 800);
        } catch (err) {
            console.error(err);
            setMessage({ 
                text: err.response?.data || "Tạo đơn thuốc thất bại", 
                type: "error" 
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-8">

                        {/* =================== HEADER ==================== */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                            <div className="d-flex align-items-center gap-3">
                                <span className={styles.chip}>
                                    <i className="bi bi-file-earmark-plus-fill"></i>
                                </span>
                                <h4 className={`${styles.pageTitle} mb-0`}>Tạo đơn thuốc mới</h4>
                            </div>

                            <button 
                                className={styles.btnBack}
                                onClick={() => navigate(-1)}
                            >
                                <i className="bi bi-arrow-left me-1"></i>
                                Quay lại
                            </button>
                        </div>

                        {/* =================== FORM ==================== */}
                        <div className={`${styles.glass} p-4 p-md-5`}>
                            <form onSubmit={handleSubmit}>
                                <div className="row g-4">

                                    {/* Mã đơn thuốc */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Mã đơn thuốc <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`form-control ${styles.formControl}`}
                                            value={form.prescriptionCode}
                                            onChange={(e) =>
                                                setForm((f) => ({ ...f, prescriptionCode: e.target.value }))
                                            }
                                            placeholder="VD: RX001"
                                            required
                                        />
                                    </div>

                                    {/* Bệnh nhân */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Bệnh nhân <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className={`form-select ${styles.formSelect}`}
                                            value={form.patientId}
                                            onChange={(e) =>
                                                setForm((f) => ({ ...f, patientId: e.target.value }))
                                            }
                                            required
                                        >
                                            <option value="">— Chọn bệnh nhân —</option>
                                            {patients.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.fullName} ({p.patientCode})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Info note */}
                                    <div className="col-12">
                                        <div className={styles.messageInfo}>
                                            <i className="bi bi-info-circle me-2"></i>
                                            Sau khi tạo đơn, bạn có thể thêm thuốc (items) ở màn chi tiết.
                                        </div>
                                    </div>

                                </div>

                                {/* Action Buttons */}
                                <div className={styles.actionSection}>
                                    <button
                                        type="button"
                                        className={styles.btnCancel}
                                        onClick={() => navigate(-1)}
                                    >
                                        <i className="bi bi-x-circle me-1"></i>
                                        Hủy
                                    </button>

                                    <button
                                        type="submit"
                                        className={styles.btnTeal}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Đang lưu...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-check-circle me-1"></i>
                                                Tạo đơn thuốc
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Message */}
                                {message.text && (
                                    <div className={
                                        message.type === "success" 
                                            ? styles.messageSuccess 
                                            : styles.messageError
                                    }>
                                        <i className={`bi ${message.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"} me-2`}></i>
                                        {message.text}
                                    </div>
                                )}
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
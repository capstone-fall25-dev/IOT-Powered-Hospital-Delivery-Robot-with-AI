// src/pages/PrescriptionEdit.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPrescriptionById, updatePrescription } from "@/services/prescriptionServices";
import { getAllPatients } from "@/services/patientService";
import styles from "@/assets/styles/prescriptionForm.module.css";

export default function PrescriptionEdit() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [patients, setPatients] = useState([]);
    const [form, setForm] = useState({
        prescriptionCode: "",
        patientId: "",
        status: "pending",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    useEffect(() => {
        async function load() {
            try {
                const [pres, patientsData] = await Promise.all([
                    getPrescriptionById(id),
                    getAllPatients(),
                ]);

                setPatients(patientsData);
                setForm({
                    prescriptionCode: pres.prescriptionCode,
                    patientId: pres.patientId?.toString() || "",
                    status: pres.status || "pending",
                });
            } catch (err) {
                console.error(err);
                alert("Không tải được dữ liệu đơn thuốc");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: "", type: "" });

        try {
            const payload = {
                prescriptionCode: form.prescriptionCode.trim(),
                patientId: form.patientId ? Number(form.patientId) : undefined,
                status: form.status,
            };
            await updatePrescription(id, payload);
            setMessage({ 
                text: "Cập nhật đơn thuốc thành công!", 
                type: "success" 
            });
            setTimeout(() => {
                navigate(`/prescriptions/${id}`);
            }, 800);
        } catch (err) {
            console.error(err);
            setMessage({ 
                text: err.response?.data || "Cập nhật thất bại", 
                type: "error" 
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingContainer}>
                    <div className="spinner-border text-primary"></div>
                    <p className={styles.loadingText}>Đang tải thông tin đơn thuốc...</p>
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
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                            <div className="d-flex align-items-center gap-3">
                                <span className={styles.chip}>
                                    <i className="bi bi-pencil-square"></i>
                                </span>
                                <h4 className={`${styles.pageTitle} mb-0`}>Chỉnh sửa đơn thuốc</h4>
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
                                    <div className="col-md-4">
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
                                            required
                                        />
                                    </div>

                                    {/* Bệnh nhân */}
                                    <div className="col-md-4">
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

                                    {/* Trạng thái */}
                                    <div className="col-md-4">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Trạng thái
                                        </label>
                                        <select
                                            className={`form-select ${styles.formSelect}`}
                                            value={form.status}
                                            onChange={(e) =>
                                                setForm((f) => ({ ...f, status: e.target.value }))
                                            }
                                        >
                                            <option value="pending">Chờ duyệt</option>
                                            <option value="approved">Đã duyệt</option>
                                            <option value="dispensed">Đã cấp phát</option>
                                            <option value="canceled">Đã hủy</option>
                                        </select>
                                    </div>

                                </div>

                                {/* Action Buttons */}
                                <div className={styles.actionSection}>
                                    <button
                                        type="button"
                                        className={styles.btnCancel}
                                        onClick={() => navigate(`/prescriptions/${id}`)}
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
                                                Lưu thay đổi
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
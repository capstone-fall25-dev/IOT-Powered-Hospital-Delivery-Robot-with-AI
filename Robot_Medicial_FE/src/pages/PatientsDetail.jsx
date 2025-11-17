import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { patientService, dischargePatient } from "@/services/patientService";
import styles from '@/assets/styles/patientDetail.module.css';

const reasonSuggestions = [
    "Đủ điều kiện sức khỏe",
    "Đã hồi phục hoàn toàn",
    "Không cần điều trị nội trú",
    "Xuất viện theo yêu cầu",
    "Chuyển tuyến điều trị",
];

export default function PatientDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [reason, setReason] = useState("");
    const [dischargeLoading, setDischargeLoading] = useState(false);

    useEffect(() => {
        patientService
            .getPatientById(id)
            .then((data) => setForm(data))
            .catch(() => alert("Không thể tải thông tin bệnh nhân"));
    }, [id]);

    if (!form) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingContainer}>
                    <div className="spinner-border text-primary"></div>
                    <p className={styles.loadingText}>Đang tải thông tin bệnh nhân...</p>
                </div>
            </div>
        );
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await patientService.updatePatient(id, form);
            alert("Cập nhật bệnh nhân thành công!");
        } catch (err) {
            console.error(err);
            alert("Cập nhật thất bại!");
        } finally {
            setLoading(false);
        }
    };

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

    const isActive = form.status === "active";

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-10">

                        {/* =================== HEADER ==================== */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                            <div className="d-flex align-items-center gap-3">
                                <span className={styles.chip}>
                                    <i className="bi bi-person-vcard"></i>
                                </span>
                                <div>
                                    <h4 className={`${styles.pageTitle} mb-0`}>Thông tin bệnh nhân</h4>
                                    <small className="text-muted">Mã BN: {form.patientCode}</small>
                                </div>
                            </div>

                            <div className="d-flex gap-2 align-items-center flex-wrap">
                                <span className={isActive ? styles.statusActive : styles.statusDischarged}>
                                    <i className={`bi ${isActive ? 'bi-activity' : 'bi-check-circle'}`}></i>
                                    {isActive ? 'Đang điều trị' : 'Đã xuất viện'}
                                </span>
                                <button 
                                    className={styles.btnBack}
                                    onClick={() => navigate("/patients")}
                                >
                                    <i className="bi bi-arrow-left me-1"></i>
                                    Quay lại
                                </button>
                            </div>
                        </div>

                        {/* =================== FORM ==================== */}
                        <div className={`${styles.glass} p-4 p-md-5`}>
                            <form onSubmit={handleSubmit}>
                                <div className="row g-4">

                                    {/* Mã bệnh nhân */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Mã bệnh nhân <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="patientCode"
                                            value={form.patientCode}
                                            onChange={handleChange}
                                            className={`form-control ${styles.formControl}`}
                                            required
                                        />
                                    </div>

                                    {/* Họ tên */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Họ tên <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={form.fullName}
                                            onChange={handleChange}
                                            className={`form-control ${styles.formControl}`}
                                            required
                                        />
                                    </div>

                                    {/* Giới tính */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Giới tính
                                        </label>
                                        <select
                                            name="gender"
                                            value={form.gender}
                                            onChange={handleChange}
                                            className={`form-select ${styles.formSelect}`}
                                        >
                                            <option value="male">Nam</option>
                                            <option value="female">Nữ</option>
                                            <option value="other">Khác</option>
                                        </select>
                                    </div>

                                    {/* Ngày sinh */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Ngày sinh
                                        </label>
                                        <input
                                            type="date"
                                            name="dob"
                                            value={form.dob?.slice(0, 10)}
                                            onChange={handleChange}
                                            className={`form-control ${styles.formControl}`}
                                        />
                                    </div>

                                    {/* Số điện thoại */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Số điện thoại
                                        </label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={form.phone || ""}
                                            onChange={handleChange}
                                            className={`form-control ${styles.formControl}`}
                                        />
                                    </div>

                                    {/* Địa chỉ */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Địa chỉ
                                        </label>
                                        <input
                                            type="text"
                                            name="address"
                                            value={form.address || ""}
                                            onChange={handleChange}
                                            className={`form-control ${styles.formControl}`}
                                        />
                                    </div>

                                    {/* Khoa */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Khoa
                                        </label>
                                        <input
                                            type="text"
                                            name="department"
                                            value={form.department || ""}
                                            onChange={handleChange}
                                            className={`form-control ${styles.formControl}`}
                                        />
                                    </div>

                                    {/* Phòng */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Phòng
                                        </label>
                                        <input
                                            type="text"
                                            name="roomName"
                                            value={form.roomName || ""}
                                            onChange={handleChange}
                                            className={`form-control ${styles.formControl}`}
                                        />
                                    </div>

                                </div>

                                {/* Action Buttons */}
                                <div className={styles.actionSection}>
                                    <button
                                        type="button"
                                        className={styles.btnCancel}
                                        onClick={() => navigate("/patients")}
                                    >
                                        <i className="bi bi-x-circle me-1"></i>
                                        Hủy
                                    </button>

                                    <button
                                        type="submit"
                                        className={styles.btnTeal}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Đang lưu...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-check-circle me-1"></i>
                                                Cập nhật bệnh nhân
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        className={styles.btnDischarge}
                                        onClick={() => setShowModal(true)}
                                        disabled={form.status === "discharged"}
                                    >
                                        <i className="bi bi-door-open me-1"></i>
                                        Xuất viện
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>

            {/* =================== DISCHARGE MODAL ==================== */}
            {showModal && (
                <div className={styles.modalOverlay} onClick={(e) => {
                    if (e.target === e.currentTarget && !dischargeLoading) setShowModal(false);
                }}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h5 className={styles.modalTitle}>
                                <i className="bi bi-chat-quote"></i>
                                Lý do xuất viện
                            </h5>
                            <button 
                                type="button" 
                                className="btn-close btn-close-white"
                                onClick={() => setShowModal(false)}
                                disabled={dischargeLoading}
                            ></button>
                        </div>

                        <div className={styles.modalBody}>
                            {/* Suggestions */}
                            <label className={`form-label ${styles.formLabel} mb-2`}>
                                Gợi ý lý do
                            </label>
                            <div className={styles.suggestionChips}>
                                {reasonSuggestions.map((s, i) => (
                                    <div
                                        key={i}
                                        className={styles.suggestionChip}
                                        onClick={() => setReason(s)}
                                    >
                                        {s}
                                    </div>
                                ))}
                            </div>

                            {/* Manual input */}
                            <label className={`form-label ${styles.formLabel} mt-3 mb-2`}>
                                Hoặc nhập lý do <span className="text-danger">*</span>
                            </label>
                            <textarea
                                className={`form-control ${styles.formControl}`}
                                rows={4}
                                placeholder="Nhập lý do xuất viện..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={dischargeLoading}
                            />
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                className={styles.btnCancel}
                                onClick={() => setShowModal(false)}
                                disabled={dischargeLoading}
                            >
                                <i className="bi bi-x-circle me-1"></i>
                                Hủy
                            </button>

                            <button
                                className={styles.btnDischarge}
                                onClick={handleDischarge}
                                disabled={dischargeLoading}
                            >
                                {dischargeLoading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-circle me-1"></i>
                                        Xác nhận xuất viện
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
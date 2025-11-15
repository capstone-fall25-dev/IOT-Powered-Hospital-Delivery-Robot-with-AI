import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { patientService, dischargePatient } from "@/services/patientService";
import styles from "@/assets/styles/patientDetail.module.css";

// Gợi ý lý do
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

    // LOAD PATIENT DATA
    useEffect(() => {
        patientService
            .getPatientById(id)
            .then((data) => setForm(data))
            .catch(() => alert("Không thể tải thông tin bệnh nhân"));
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

    return (
        <div className={`${styles.page} d-flex flex-column align-items-center py-5`}>
            <div className={`${styles.glass} container p-5`} style={{ maxWidth: 900 }}>

                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="fw-bold">
                        <i className="bi bi-person-vcard me-2 text-success"></i>
                        Thông tin bệnh nhân
                    </h3>

                    <button className={`${styles.btnTeal} btn`} onClick={() => navigate("/patients")}>
                        <i className="bi bi-arrow-left-circle me-1"></i> Quay lại
                    </button>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit}>
                    <div className="row g-3">

                        <div className="col-md-6">
                            <label className="form-label">Mã bệnh nhân</label>
                            <input
                                type="text"
                                name="patientCode"
                                value={form.patientCode}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Họ tên</label>
                            <input
                                type="text"
                                name="fullName"
                                value={form.fullName}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Giới tính</label>
                            <select
                                name="gender"
                                value={form.gender}
                                onChange={handleChange}
                                className="form-select"
                            >
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                                <option value="other">Khác</option>
                            </select>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Ngày sinh</label>
                            <input
                                type="date"
                                name="dob"
                                value={form.dob?.slice(0, 10)}
                                onChange={handleChange}
                                className="form-control"
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Số điện thoại</label>
                            <input
                                type="text"
                                name="phone"
                                value={form.phone || ""}
                                onChange={handleChange}
                                className="form-control"
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Địa chỉ</label>
                            <input
                                type="text"
                                name="address"
                                value={form.address || ""}
                                onChange={handleChange}
                                className="form-control"
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Khoa</label>
                            <input
                                type="text"
                                name="department"
                                value={form.department || ""}
                                onChange={handleChange}
                                className="form-control"
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Phòng</label>
                            <input
                                type="text"
                                name="roomName"
                                value={form.roomName || ""}
                                onChange={handleChange}
                                className="form-control"
                            />
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="col-12 text-end mt-4">
                            <button
                                type="button"
                                className="btn btn-outline-secondary rounded-pill me-2"
                                onClick={() => navigate("/patients")}
                            >
                                Hủy
                            </button>

                            <button
                                type="submit"
                                className={`${styles.btnTeal} btn rounded-pill me-2`}
                                disabled={loading}
                            >
                                {loading ? "Đang lưu..." : "Cập nhật bệnh nhân"}
                            </button>

                            <button
                                type="button"
                                className="btn btn-success rounded-pill"
                                onClick={() => setShowModal(true)}
                                disabled={form.status === "discharged"}
                            >
                                Xuất viện
                            </button>
                        </div>

                    </div>
                </form>
            </div>

            {/* DISCHARGE MODAL */}
            {showModal && (
                <div className="modal fade show"
                     style={{ display: "block", background: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog">
                        <div className="modal-content p-3">

                            <h5 className="modal-title mb-3 fw-bold">
                                <i className="bi bi-chat-quote text-success me-2"></i>
                                Lý do xuất viện
                            </h5>

                            {/* Suggestions */}
                            <div className="mb-3">
                                <label className="form-label fw-semibold">Gợi ý lý do</label>
                                <div className="d-flex flex-wrap">
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
                            </div>

                            {/* Manual input */}
                            <textarea
                                className="form-control mb-3"
                                rows={3}
                                placeholder="Nhập lý do xuất viện..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />

                            <div className="text-end">
                                <button
                                    className="btn btn-outline-secondary me-2"
                                    onClick={() => setShowModal(false)}
                                >
                                    Hủy
                                </button>

                                <button
                                    className={`${styles.btnTeal} btn`}
                                    onClick={handleDischarge}
                                    disabled={dischargeLoading}
                                >
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

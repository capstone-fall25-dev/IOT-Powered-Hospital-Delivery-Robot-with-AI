import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPatientById, updatePatient } from "@/services/patientService";
import styles from "@/assets/styles/patientForm.module.css";

export default function PatientEdit() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const data = await getPatientById(id);

                setForm({
                    patientCode: data.patientCode,
                    fullName: data.fullName,
                    gender: data.gender,
                    dob: data.dob ? data.dob.split("T")[0] : "",
                    address: data.address || "",
                    phone: data.phone || "",
                    department: data.department || "",
                    roomId: data.roomId || "",
                    roomName: data.roomName || "",
                    status: data.status
                });

                setLoading(false);
            } catch (err) {
                alert("Lỗi tải dữ liệu bệnh nhân");
                navigate("/patients");
            }
        }
        load();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingContainer}>
                    <div className="spinner-border text-primary"></div>
                    <p className={styles.loadingText}>Đang tải thông tin bệnh nhân...</p>
                </div>
            </div>
        );
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setSaving(true);

            await updatePatient(id, {
                ...form,
                roomId: form.roomId ? Number(form.roomId) : null
            });

            alert("Cập nhật thành công!");
            navigate(`/patient/${id}`);
        } catch (err) {
            alert("Lỗi: " + err.message);
        } finally {
            setSaving(false);
        }
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
                                    <i className="bi bi-person-lines-fill"></i>
                                </span>
                                <h4 className={`${styles.pageTitle} mb-0`}>Chỉnh sửa bệnh nhân</h4>
                            </div>

                            <button 
                                className={styles.btnBack}
                                onClick={() => navigate("/patients")}
                            >
                                <i className="bi bi-arrow-left me-1"></i>
                                Quay lại
                            </button>
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
                                            onChange={(e) => setForm({ ...form, patientCode: e.target.value })}
                                            className={`form-control ${styles.formControl}`}
                                            required
                                        />
                                    </div>

                                    {/* Họ tên */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Họ và tên <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={form.fullName}
                                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
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
                                            onChange={(e) => setForm({ ...form, gender: e.target.value })}
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
                                            value={form.dob}
                                            onChange={(e) => setForm({ ...form, dob: e.target.value })}
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
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                                            value={form.address}
                                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                                            className={`form-control ${styles.formControl}`}
                                        />
                                    </div>

                                    {/* Khoa */}
                                    <div className="col-md-6" hidden>
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Khoa / Phòng ban
                                        </label>
                                        <input
                                            type="text"
                                            name="department"
                                            value={form.department}
                                            onChange={(e) => setForm({ ...form, department: e.target.value })}
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
                                            value={form.roomName}
                                            onChange={(e) => setForm({ ...form, roomName: e.target.value })}
                                            className={`form-control ${styles.formControl}`}
                                        />
                                    </div>

                                    {/* Trạng thái */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Trạng thái
                                        </label>
                                        <select
                                            name="status"
                                            value={form.status}
                                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                                            className={`form-select ${styles.formSelect}`}
                                        >
                                            <option value="active">Đang điều trị</option>
                                            <option value="discharged">Đã xuất viện</option>
                                        </select>
                                    </div>

                                </div>

                                {/* Action Buttons */}
                                <div className={styles.actionSection}>
                                    <button
                                        type="button"
                                        className={styles.btnCancel}
                                        onClick={() => navigate(`/patient/${id}`)}
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
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
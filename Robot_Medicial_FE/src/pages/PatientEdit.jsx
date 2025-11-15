import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPatientById, updatePatient } from "@/services/patientService";
import styles from "@/assets/styles/patientsManagement.module.css";

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
                    roomNumber: data.roomNumber || "",
                    status: data.status
                });

                setLoading(false);
            } catch (err) {
                alert("Lỗi tải dữ liệu bệnh nhân");
                navigate("/patients");
            }
        }
        load();
    }, [id]);

    if (loading) return <p className="text-center mt-4">Đang tải...</p>;

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
            <div className="container-lg py-4">

                {/* HEADER */}
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div className="d-flex align-items-center gap-2">
                        <span className={styles.chip}>
                            <i className="bi bi-person-lines-fill me-1"></i>
                        </span>
                        <h4 className="fw-bold mb-0">Chỉnh sửa bệnh nhân</h4>
                    </div>

                    <button className="btn btn-outline-secondary rounded-pill px-3"
                        onClick={() => navigate("/patients")}>
                        <i className="bi bi-arrow-left me-1"></i>Quay lại
                    </button>
                </div>

                {/* FORM */}
                <form
                    onSubmit={handleSubmit}
                    className={`p-4 p-md-5 ${styles.glass} ${styles.rounded2xl}`}
                >

                    {/* PATIENT CODE */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Mã bệnh nhân</label>
                        <input
                            className="form-control"
                            value={form.patientCode}
                            onChange={(e) => setForm({ ...form, patientCode: e.target.value })}
                            required
                        />
                    </div>

                    {/* NAME */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Họ và tên</label>
                        <input
                            className="form-control"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                            required
                        />
                    </div>

                    {/* GENDER & DOB */}
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-semibold">Giới tính</label>
                            <select
                                className="form-select"
                                value={form.gender}
                                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                            >
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                                <option value="other">Khác</option>
                            </select>
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-semibold">Ngày sinh</label>
                            <input
                                type="date"
                                className="form-control"
                                value={form.dob}
                                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* CONTACT INFO */}
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-semibold">Số điện thoại</label>
                            <input
                                className="form-control"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-semibold">Địa chỉ</label>
                            <input
                                className="form-control"
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* DEPARTMENT & ROOM */}
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-semibold">Khoa</label>
                            <input
                                className="form-control"
                                value={form.department}
                                onChange={(e) => setForm({ ...form, department: e.target.value })}
                            />
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-semibold">Số phòng</label>
                            <input
                                className="form-control"
                                value={form.roomNumber}
                                onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* STATUS */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Trạng thái</label>
                        <select
                            className="form-select"
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                        >
                            <option value="active">Đang điều trị</option>
                            <option value="discharged">Đã xuất viện</option>
                        </select>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="d-flex justify-content-end gap-3 pt-2">
                        <button
                            type="button"
                            className="btn btn-light rounded-pill px-4"
                            onClick={() => navigate(`/patient/${id}`)}
                        >
                            Hủy
                        </button>

                        <button
                            type="submit"
                            className={`btn ${styles.btnTeal} rounded-pill px-4`}
                            disabled={saving}
                        >
                            {saving ? (
                                <span className="spinner-border spinner-border-sm"></span>
                            ) : (
                                "Lưu thay đổi"
                            )}
                        </button>
                    </div>

                </form>

            </div>
        </div>
    );
}

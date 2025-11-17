import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPatient } from "@/services/patientService";
import { getAllRooms } from "@/services/roomService";
import styles from "@/assets/styles/patientForm.module.css";

export default function CreatePatient() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        patientCode: "",
        fullName: "",
        gender: "male",
        dob: "",
        address: "",
        phone: "",
        department: "",
        roomId: "",
        roomName: "",
        status: "active",
    });

    const [loading, setLoading] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [error, setError] = useState("");

    // Gọi API lấy danh sách phòng
    useEffect(() => {
        async function fetchRooms() {
            try {
                const data = await getAllRooms();
                setRooms(data);
            } catch (err) {
                console.error("Lỗi khi tải danh sách phòng:", err);
                alert("Không thể tải danh sách phòng!");
            }
        }
        fetchRooms();
    }, []);

    // Handle change input
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Handle chọn phòng
    const handleRoomSelect = (e) => {
        const roomId = e.target.value;
        const room = rooms.find((r) => r.id === Number(roomId));
        setForm((prev) => ({
            ...prev,
            roomId,
            roomName: room ? room.roomName : "",
        }));
    };

    // Validate số điện thoại Việt Nam
    const validatePhone = (phone) => {
        const phoneRegex = /^(0|\+84)(\d{9})$/;
        return phoneRegex.test(phone);
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validatePhone(form.phone)) {
            setError("Số điện thoại không hợp lệ. Vui lòng nhập dạng 0xxxxxxxxx hoặc +84xxxxxxxxx");
            return;
        }

        setError("");
        setLoading(true);

        try {
            await createPatient(form);
            alert("Tạo bệnh nhân thành công!");
            navigate("/patients");
        } catch (err) {
            console.error("Lỗi khi tạo bệnh nhân:", err);
            alert("Không thể tạo bệnh nhân. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-10">

                        {/* =================== HEADER ==================== */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                            <div className="d-flex align-items-center gap-3">
                                <span className={styles.chip}>
                                    <i className="bi bi-person-plus-fill"></i>
                                </span>
                                <h4 className={`${styles.pageTitle} mb-0`}>Thêm mới bệnh nhân</h4>
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
                            {error && (
                                <div className={styles.alert}>
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    {error}
                                </div>
                            )}

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
                                            placeholder="VD: BN001"
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
                                            onChange={handleChange}
                                            className={`form-control ${styles.formControl}`}
                                            placeholder="Nhập họ tên đầy đủ"
                                            required
                                        />
                                    </div>

                                    {/* Giới tính */}
                                    <div className="col-md-4">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Giới tính <span className="text-danger">*</span>
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
                                    <div className="col-md-4">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Ngày sinh <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            name="dob"
                                            value={form.dob}
                                            onChange={handleChange}
                                            className={`form-control ${styles.formControl}`}
                                            required
                                        />
                                    </div>

                                    {/* Số điện thoại */}
                                    <div className="col-md-4">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Số điện thoại <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={form.phone}
                                            onChange={handleChange}
                                            className={`form-control ${styles.formControl}`}
                                            placeholder="VD: 0905123456"
                                            required
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
                                            onChange={handleChange}
                                            className={`form-control ${styles.formControl}`}
                                            placeholder="Nhập địa chỉ"
                                        />
                                    </div>

                                    {/* Khoa */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Khoa / Phòng ban
                                        </label>
                                        <input
                                            type="text"
                                            name="department"
                                            value={form.department}
                                            onChange={handleChange}
                                            className={`form-control ${styles.formControl}`}
                                            placeholder="VD: Khoa nội tổng hợp"
                                        />
                                    </div>

                                    {/* Phòng */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Phòng <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            name="roomId"
                                            value={form.roomId}
                                            onChange={handleRoomSelect}
                                            className={`form-select ${styles.formSelect}`}
                                            required
                                        >
                                            <option value="">-- Chọn phòng --</option>
                                            {rooms.map((room) => (
                                                <option key={room.id} value={room.id}>
                                                    {room.roomName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Trạng thái */}
                                    <div className="col-md-6">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Trạng thái
                                        </label>
                                        <select
                                            name="status"
                                            value={form.status}
                                            onChange={handleChange}
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
                                                Lưu bệnh nhân
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
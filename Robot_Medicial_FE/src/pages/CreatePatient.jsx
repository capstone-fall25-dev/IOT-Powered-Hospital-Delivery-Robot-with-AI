import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPatient } from "@/services/patientService";
import { getAllRooms } from "@/services/roomService";
import styles from "@/assets/styles/createPatient.module.css";

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
            navigate("/patient");
        } catch (err) {
            console.error("Lỗi khi tạo bệnh nhân:", err);
            alert("Không thể tạo bệnh nhân. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className="container py-5">
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                        <span className={styles.chip}><i className="bi bi-person-plus-fill me-1"></i></span>
                        <h4 className="mb-0 fw-bold">Thêm mới bệnh nhân</h4>
                    </div>
                    <button className="btn btn-outline-secondary rounded-pill" onClick={() => navigate("/patients")}>
                        <i className="bi bi-arrow-left"></i> Quay lại
                    </button>
                </div>

                <div className={styles.glass + " p-4 p-md-5"}>
                    {error && <div className="alert alert-danger text-center">{error}</div>}

                    <form onSubmit={handleSubmit} className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label">Mã bệnh nhân</label>
                            <input type="text" name="patientCode" value={form.patientCode} onChange={handleChange} className="form-control" required />
                        </div>

                        <div className="col-md-8">
                            <label className="form-label">Họ và tên</label>
                            <input type="text" name="fullName" value={form.fullName} onChange={handleChange} className="form-control" required />
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Giới tính</label>
                            <select name="gender" value={form.gender} onChange={handleChange} className="form-select">
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                            </select>
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Ngày sinh</label>
                            <input type="date" name="dob" value={form.dob} onChange={handleChange} className="form-control" required />
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Số điện thoại</label>
                            <input type="text" name="phone" value={form.phone} onChange={handleChange} className="form-control" required placeholder="VD: 0905123456 hoặc +84905123456" />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Địa chỉ</label>
                            <input type="text" name="address" value={form.address} onChange={handleChange} className="form-control" />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Khoa / Phòng ban</label>
                            <input type="text" name="department" value={form.department} onChange={handleChange} className="form-control" />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Phòng</label>
                            <select name="roomId" value={form.roomId} onChange={handleRoomSelect} className="form-select" required>
                                <option value="">-- Chọn phòng --</option>
                                {rooms.map((room) => (
                                    <option key={room.id} value={room.id}>{room.roomName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Trạng thái</label>
                            <select name="status" value={form.status} onChange={handleChange} className="form-select">
                                <option value="active">Đang điều trị</option>
                                <option value="discharged">Đã xuất viện</option>
                            </select>
                        </div>

                        <div className="col-12 text-end mt-4">
                            <button type="button" className="btn btn-outline-secondary rounded-pill me-2" onClick={() => navigate("/patients")}>
                                Hủy
                            </button>
                            <button type="submit" className="btn btn-teal rounded-pill" disabled={loading}>
                                {loading ? "Đang lưu..." : "Lưu bệnh nhân"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

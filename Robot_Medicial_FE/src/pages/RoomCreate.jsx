import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "@/services/roomService";
import styles from "../assets/styles/roomForm.module.css";

export default function RoomCreate() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        roomName: "",
        latitude: "",
        longitude: "",
        mapId: ""
    });

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            await createRoom({
                ...form,
                latitude: parseFloat(form.latitude || 0),
                longitude: parseFloat(form.longitude || 0),
                mapId: form.mapId ? Number(form.mapId) : null
            });

            alert("Tạo phòng thành công!");
            navigate("/rooms");
        } catch (err) {
            alert("Lỗi: " + err.message);
        }
    }

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">

                {/* =================== HEADER ==================== */}
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                    <h3 className={styles.pageTitle}>
                        <i className="bi bi-plus-circle"></i>
                        Thêm phòng mới
                    </h3>

                    <button 
                        className={styles.btnBack}
                        onClick={() => navigate("/rooms")}
                    >
                        <i className="bi bi-arrow-left"></i>
                        Quay lại
                    </button>
                </div>

                {/* =================== FORM CARD ==================== */}
                <div className={styles.createCard}>
                    <form onSubmit={handleSubmit}>

                        {/* Thông tin cơ bản */}
                        <div className={styles.sectionTitle}>
                            <i className="bi bi-info-circle"></i>
                            Thông tin cơ bản
                        </div>

                        {/* Tên phòng */}
                        <div className="mb-4">
                            <label className={`form-label ${styles.formLabel}`}>
                                Tên phòng
                                <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                className={`form-control ${styles.formInput}`}
                                value={form.roomName}
                                onChange={e => setForm({ ...form, roomName: e.target.value })}
                                required
                                placeholder="Nhập tên phòng (VD: Phòng A101, ICU-02...)"
                            />
                            <div className={styles.helperText}>
                                <i className="bi bi-lightbulb me-1"></i>
                                Tên phòng nên ngắn gọn và dễ nhớ
                            </div>
                        </div>

                        {/* Vị trí */}
                        <div className={styles.sectionTitle}>
                            <i className="bi bi-geo-alt"></i>
                            Vị trí trên bản đồ
                        </div>

                        {/* Latitude - Longitude */}
                        <div className="row">
                            <div className="col-md-6 mb-4">
                                <label className={`form-label ${styles.formLabel}`}>
                                    Latitude (Vĩ độ)
                                </label>
                                <input
                                    type="text"
                                    className={`form-control ${styles.formInput}`}
                                    value={form.latitude}
                                    onChange={e => setForm({ ...form, latitude: e.target.value })}
                                    placeholder="VD: 21.028511"
                                />
                                <div className={styles.helperText}>
                                    Tọa độ vĩ độ của phòng
                                </div>
                            </div>

                            <div className="col-md-6 mb-4">
                                <label className={`form-label ${styles.formLabel}`}>
                                    Longitude (Kinh độ)
                                </label>
                                <input
                                    type="text"
                                    className={`form-control ${styles.formInput}`}
                                    value={form.longitude}
                                    onChange={e => setForm({ ...form, longitude: e.target.value })}
                                    placeholder="VD: 105.804817"
                                />
                                <div className={styles.helperText}>
                                    Tọa độ kinh độ của phòng
                                </div>
                            </div>
                        </div>

                        {/* Map ID */}
                        <div className="mb-4">
                            <label className={`form-label ${styles.formLabel}`}>
                                Map ID
                            </label>
                            <input
                                type="number"
                                className={`form-control ${styles.formInput}`}
                                value={form.mapId}
                                onChange={e => setForm({ ...form, mapId: e.target.value })}
                                placeholder="Nhập Map ID (tùy chọn)"
                            />
                            <div className={styles.helperText}>
                                <i className="bi bi-map me-1"></i>
                                ID của bản đồ mà phòng thuộc về
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                            <button 
                                type="button"
                                className={styles.btnBack}
                                onClick={() => navigate("/rooms")}
                            >
                                <i className="bi bi-x-circle me-1"></i>
                                Hủy
                            </button>
                            
                            <button 
                                type="submit"
                                className={styles.btnCreate}
                            >
                                <i className="bi bi-check-circle me-1"></i>
                                Tạo phòng
                            </button>
                        </div>

                    </form>
                </div>

            </div>
        </div>
    );
}
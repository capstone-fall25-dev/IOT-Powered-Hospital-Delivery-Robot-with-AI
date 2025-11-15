import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "@/services/roomService";

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
        <>

            {/* CSS riêng cho trang Create */}
            <style>{`
                .page-title {
                    font-weight: 800;
                    letter-spacing: -0.3px;
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }

                .create-card {
                    border-radius: 20px;
                    padding: 28px;
                    background: rgba(255,255,255,0.78);
                    border: 1px solid rgba(255,255,255,0.45);
                    backdrop-filter: blur(8px);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
                    transition: .25s;
                }

                .create-card:hover {
                    transform: translateY(-2px);
                }

                .form-label {
                    font-weight: 600;
                    color: #334155;
                }

                .medical-input {
                    border-radius: 12px !important;
                    padding: 12px 14px;
                    border: 1px solid #d1d5db;
                }

                .btn-create {
                    padding: 10px 22px;
                    border-radius: 12px;
                    font-weight: 600;
                }

                .btn-back {
                    padding: 10px 20px;
                    border-radius: 10px;
                }
            `}</style>

            <div className="container py-4 fadeIn">

                {/* HEADER */}
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <h3 className="page-title">
                        <i className="bi bi-hospital"></i> Thêm phòng mới
                    </h3>

                    <button className="btn btn-outline-secondary btn-back"
                        onClick={() => navigate("/rooms")}
                    >
                        <i className="bi bi-arrow-left"></i> Quay lại
                    </button>
                </div>

                {/* FORM */}
                <div className="create-card">

                    <form onSubmit={handleSubmit}>

                        {/* Tên phòng */}
                        <div className="mb-3">
                            <label className="form-label">Tên phòng</label>
                            <input
                                className="form-control medical-input"
                                value={form.roomName}
                                onChange={e => setForm({ ...form, roomName: e.target.value })}
                                required
                                placeholder="Nhập tên phòng (VD: A101)"
                            />
                        </div>

                        {/* Latitude - Longitude */}
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Latitude</label>
                                <input
                                    className="form-control medical-input"
                                    value={form.latitude}
                                    onChange={e => setForm({ ...form, latitude: e.target.value })}
                                    placeholder="VD: 21.028511"
                                />
                            </div>

                            <div className="col-md-6 mb-3">
                                <label className="form-label">Longitude</label>
                                <input
                                    className="form-control medical-input"
                                    value={form.longitude}
                                    onChange={e => setForm({ ...form, longitude: e.target.value })}
                                    placeholder="VD: 105.804817"
                                />
                            </div>
                        </div>

                        {/* Map ID */}
                        <div className="mb-3">
                            <label className="form-label">Map ID</label>
                            <input
                                className="form-control medical-input"
                                value={form.mapId}
                                onChange={e => setForm({ ...form, mapId: e.target.value })}
                                placeholder="Nhập Map ID (nếu có)"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="d-flex justify-content-end mt-4">
                            <button className="btn btn-primary btn-create">
                                <i className="bi bi-check-circle me-1"></i>
                                Tạo phòng
                            </button>
                        </div>

                    </form>

                </div>

            </div>
        </>
    );
}

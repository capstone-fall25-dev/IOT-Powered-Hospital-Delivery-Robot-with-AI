import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoomById, updateRoom } from "@/services/roomService";

export default function RoomEdit() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState(null);

    useEffect(() => {
        async function load() {
            try {
                const data = await getRoomById(id);
                setForm(data);
            } catch (err) {
                alert("Không thể tải phòng: " + err.message);
            }
        }
        load();
    }, [id]);

    if (!form) return <p className="text-center mt-4">Đang tải...</p>;

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            await updateRoom(id, {
                roomName: form.roomName,
                latitude: parseFloat(form.latitude || 0),
                longitude: parseFloat(form.longitude || 0),
                mapId: form.mapId ? Number(form.mapId) : null
            });

            alert("Cập nhật phòng thành công!");
            navigate(`/rooms/${id}`);
        } catch (err) {
            alert("Lỗi: " + err.message);
        }
    }

    return (
        <>

            {/* CSS riêng của trang EDIT */}
            <style>{`
                .page-title {
                    font-weight: 800;
                    letter-spacing: -0.3px;
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }

                .edit-card {
                    border-radius: 20px;
                    padding: 30px;
                    background: rgba(255,255,255,0.78);
                    border: 1px solid rgba(255,255,255,0.45);
                    backdrop-filter: blur(8px);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
                    transition: 0.25s;
                }

                .edit-card:hover {
                    transform: translateY(-2px);
                }

                .medical-input {
                    border-radius: 12px !important;
                    padding: 12px 14px;
                    border: 1px solid #d1d5db;
                }

                .btn-save {
                    padding: 10px 22px;
                    border-radius: 12px;
                    font-weight: 600;
                }

                .btn-cancel {
                    padding: 10px 20px;
                    border-radius: 12px;
                    font-weight: 600;
                }

                .form-label {
                    font-weight: 600;
                    color: #334155;
                }
            `}</style>

            <div className="container py-4 fadeIn">

                {/* HEADER */}
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <h3 className="page-title">
                        <i className="bi bi-pencil-square"></i> Chỉnh sửa phòng
                    </h3>

                    <button
                        className="btn btn-outline-secondary btn-cancel"
                        onClick={() => navigate(`/rooms/${id}`)}
                    >
                        <i className="bi bi-arrow-left"></i> Quay lại
                    </button>
                </div>

                {/* FORM */}
                <div className="edit-card">

                    <form onSubmit={handleSubmit}>

                        {/* Tên phòng */}
                        <div className="mb-3">
                            <label className="form-label">Tên phòng</label>
                            <input
                                className="form-control medical-input"
                                value={form.roomName}
                                onChange={(e) =>
                                    setForm({ ...form, roomName: e.target.value })
                                }
                                required
                                placeholder="Nhập tên phòng"
                            />
                        </div>

                        {/* Latitude – Longitude */}
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Latitude</label>
                                <input
                                    className="form-control medical-input"
                                    value={form.latitude}
                                    onChange={(e) =>
                                        setForm({ ...form, latitude: e.target.value })
                                    }
                                    placeholder="VD: 21.028511"
                                />
                            </div>

                            <div className="col-md-6 mb-3">
                                <label className="form-label">Longitude</label>
                                <input
                                    className="form-control medical-input"
                                    value={form.longitude}
                                    onChange={(e) =>
                                        setForm({ ...form, longitude: e.target.value })
                                    }
                                    placeholder="VD: 105.804817"
                                />
                            </div>
                        </div>

                        {/* MAP ID */}
                        <div className="mb-3">
                            <label className="form-label">Map ID</label>
                            <input
                                className="form-control medical-input"
                                value={form.mapId}
                                onChange={(e) =>
                                    setForm({ ...form, mapId: e.target.value })
                                }
                                placeholder="Nhập Map ID"
                            />
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="d-flex justify-content-end gap-3 mt-4">

                            <button
                                type="button"
                                className="btn btn-light btn-cancel"
                                onClick={() => navigate(`/rooms/${id}`)}
                            >
                                <i className="bi bi-x-circle me-1"></i> Hủy
                            </button>

                            <button type="submit" className="btn btn-primary btn-save">
                                <i className="bi bi-check-circle me-1"></i>
                                Lưu thay đổi
                            </button>

                        </div>

                    </form>

                </div>

            </div>
        </>
    );
}

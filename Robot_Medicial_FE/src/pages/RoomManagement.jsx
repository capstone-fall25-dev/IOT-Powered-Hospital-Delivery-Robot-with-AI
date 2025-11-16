import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRooms } from "@/services/roomService";
import styles from "../assets/styles/roomManagement.module.css";

export default function RoomFleetCards() {
    const navigate = useNavigate();

    const [rooms, setRooms] = useState([]);
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRooms() {
            try {
                setLoading(true);
                const data = await getAllRooms();
                const formatted = data.map((r) => ({
                    id: r.id,
                    name: r.roomName,
                    longitude: r.longitude,
                    latitude: r.latitude,
                    mapId: r.mapId,
                    createdAt: new Date(r.createdAt).toLocaleString("vi-VN"),
                }));
                setRooms(formatted);
            } catch (err) {
                console.error("Lỗi khi load phòng:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchRooms();
    }, []);

    const filtered = useMemo(
        () => rooms.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
        [rooms, q]
    );

    return (
        <div className={styles.page}>
            <div className="container-xl py-3 py-lg-4">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                    <h5 className={`${styles.title} mb-0`}>
                        <i className="bi bi-hospital me-2" style={{ color: 'var(--teal-dark)' }}></i>
                        Danh sách phòng bệnh
                    </h5>
                    <div className="d-flex gap-2 flex-wrap">
                        <input
                            className={`form-control ${styles.searchInput}`}
                            style={{ width: 220 }}
                            placeholder="Tìm phòng..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                        <button 
                            className={`btn ${styles.btnTeal}`} 
                            onClick={() => navigate("/rooms/create")}
                        >
                            <i className="bi bi-plus-lg me-2"></i>
                            Thêm phòng
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className={styles.noRooms}>
                        <i className="bi bi-hourglass-split me-2"></i>
                        Đang tải dữ liệu...
                    </div>
                ) : (
                    <div className="row g-3">
                        {filtered.map((r) => (
                            <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={r.id}>
                                <div
                                    className={`${styles.roomCard} p-3 h-100`}
                                    onClick={() => navigate(`/rooms/${r.id}`)}
                                >
                                    <div className="fw-bold mb-2">
                                        <i className="bi bi-door-open me-2"></i>
                                        {r.name}
                                    </div>
                                    <div className={`${styles.muted} mb-1`}>
                                        <i className="bi bi-map me-1"></i>
                                        Map ID: {r.mapId}
                                    </div>
                                    <div className={`${styles.muted} mb-1`}>
                                        <i className="bi bi-geo-alt me-1"></i>
                                        {r.latitude.toFixed(6)}, {r.longitude.toFixed(6)}
                                    </div>
                                    <div className={styles.muted}>
                                        <i className="bi bi-calendar3 me-1"></i>
                                        {r.createdAt}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && !loading && (
                            <div className="col-12">
                                <div className={styles.noRooms}>
                                    <i className="bi bi-inbox me-2" style={{ fontSize: '1.5rem' }}></i>
                                    <br />
                                    Không tìm thấy phòng phù hợp
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
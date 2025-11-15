import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRooms } from "@/services/roomService";
import styles from "../assets/styles/roomFleetCards.module.css";

export default function RoomFleetCards() {
    const navigate = useNavigate();

    const [rooms, setRooms] = useState([]);
    const [q, setQ] = useState("");

    useEffect(() => {
        async function fetchRooms() {
            try {
                const data = await getAllRooms();
                const formatted = data.map((r) => ({
                    id: r.id,
                    name: r.roomName,
                    longitude: r.longitude,
                    latitude: r.latitude,
                    mapId: r.mapId,
                    createdAt: new Date(r.createdAt).toLocaleString(),
                }));
                setRooms(formatted);
            } catch (err) {
                console.error("Lỗi khi load phòng:", err);
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
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                    <h5 className={`${styles.title} mb-0`}>Danh sách phòng bệnh</h5>
                    <div className="d-flex gap-2">
                        <input
                            className={`form-control ${styles.searchInput}`}
                            style={{ width: 220 }}
                            placeholder="Tìm phòng"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                        <button className={`btn ${styles.btnTeal}`} onClick={() => navigate("/rooms/create")}>
                            <i className="bi bi-plus-lg me-1"></i> Thêm phòng
                        </button>
                    </div>
                </div>

                <div className="row g-3">
                    {filtered.map((r) => (
                        <div className="col-12 col-sm-6 col-lg-3" key={r.id}>
                            <div
                                className={`${styles.roomCard} p-3 h-100`}
                                onClick={() => navigate(`/rooms/${r.id}`)}
                            >
                                <div className="fw-bold mb-1">{r.name}</div>
                                <div className={`${styles.muted} mb-1`}>Map ID: {r.mapId}</div>
                                <div className={`${styles.muted} mb-1`}>
                                    Vị trí: {r.latitude.toFixed(6)}, {r.longitude.toFixed(6)}
                                </div>
                                <div className={styles.muted}>Ngày tạo: {r.createdAt}</div>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className={`${styles.noRooms} col-12`}>
                            Không có phòng phù hợp.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
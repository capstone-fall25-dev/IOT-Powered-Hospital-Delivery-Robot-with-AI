import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRooms } from "@/services/roomService";

export default function RoomFleetCards() {
    const navigate = useNavigate();

    const styles = (
        <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(1200px 600px at 15% 10%,rgba(76,225,198,.18),transparent 60%),radial-gradient(900px 500px at 90% 5%,rgba(76,225,198,.12),transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 20%,#e9f3f1 60%,#e8f0ee 100%);min-height:100vh}
      .title{font-weight:900;color:#0b1432}
      .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
      .btn-teal:hover{filter:brightness(1.05)}
      .room-card{background:#0e1a2b;color:#eef7f5;border:1px solid rgba(255,255,255,.06);border-radius:16px;box-shadow:0 8px 22px rgba(2,6,23,.18);transition:transform .2s ease, box-shadow .2s ease;cursor:pointer}
      .room-card:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(2,6,23,.22)}
      .muted{color:#cfe9e5;opacity:.85}
    `}</style>
    );

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
        <div className="page">
            {styles}
            <div className="container-xl py-3 py-lg-4">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                    <h5 className="title mb-0">Danh sách phòng bệnh</h5>
                    <div className="d-flex gap-2">
                        <input
                            className="form-control"
                            style={{ width: 220 }}
                            placeholder="Tìm phòng"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                        <button className="btn btn-teal" onClick={() => navigate("/room-create")}>
                            <i className="bi bi-plus-lg me-1"></i> Thêm phòng
                        </button>
                    </div>
                </div>

                <div className="row g-3">
                    {filtered.map((r) => (
                        <div className="col-12 col-sm-6 col-lg-3" key={r.id}>
                            <div
                                className="room-card p-3 h-100"
                                onClick={() => navigate(`/room-detail/${r.id}`)}
                            >
                                <div className="fw-bold mb-1">{r.name}</div>
                                <div className="muted mb-1">Map ID: {r.mapId}</div>
                                <div className="muted mb-1">
                                    Vị trí: {r.latitude.toFixed(6)}, {r.longitude.toFixed(6)}
                                </div>
                                <div className="muted">Ngày tạo: {r.createdAt}</div>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="text-muted">Không có phòng phù hợp.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

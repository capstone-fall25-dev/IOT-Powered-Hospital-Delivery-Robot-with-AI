import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import { getRobotById } from "@/services/robotService";
import { API_CONFIG } from "@/utils/apiConfig";

export default function RobotDetail() {

    const { id } = useParams();
    const navigate = useNavigate();


    const styles = (
        <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(1200px 600px at 15% 10%,rgba(76,225,198,.18),transparent 60%),radial-gradient(900px 500px at 90% 5%,rgba(76,225,198,.12),transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 20%,#e9f3f1 60%,#e8f0ee 100%);min-height:100vh}
      .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.85);box-shadow:0 16px 48px rgba(15,23,42,.08);border-radius:24px}
      .rounded-2xl{border-radius:24px}
      .title{font-weight:900;color:#0b1432}
      .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
      .btn-teal:hover{filter:brightness(1.05)}
      .badge-soft{background:rgba(20,226,193,.18);color:#0b3e3c;border:1px solid rgba(20,226,193,.35)}
      .thumb{height:120px;object-fit:cover;border-radius:12px}
      .cover{width:88px;height:88px;border-radius:12px;object-fit:cover}
      .kv{display:grid;grid-template-columns:130px 1fr; gap:10px}
      @media (max-width: 576px){.kv{grid-template-columns:1fr}}
      .loading, .error {
        text-align: center; padding: 4rem 2rem; color: #666;
        background: #f8f9fa !important; border-radius: 8px; margin: 2rem auto; max-width: 600px;
      }
      .error { color: #dc3545 !important; background: #f8d7da !important; border: 1px solid #f5c6cb !important; }
      .spinner-border { width: 3rem; height: 3rem; }
    `}</style>
    );


    const [robot, setRobot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [power, setPower] = useState(false);


    // Status map cho consistency với FleetCards
    const statusMap = {
        transporting: "Đang vận chuyển",
        awaiting_handover: "Chờ bàn giao",
        returning_to_station: "Đang quay về",
        at_station: "Tại trạm",
        completed: "Sẵn sàng",
        charging: "Đang sạc",
        needs_attention: "Chờ bàn giao",
        offline: "Không hoạt động",
        manual_control: "Điều khiển thủ công",
    };


    // 📥 Fetch robot data on mount
    useEffect(() => {
        console.log("🔍 [RobotDetail] Starting fetch for id:", id);
        async function fetchRobot() {
            if (!id) {
                setError("Không có ID robot.");
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setError(null);
                const data = await getRobotById(Number(id));
                console.log("✅ [RobotDetail] Fetched data:", data);
                if (!data) throw new Error("API trả về rỗng");
                setRobot(data);
                setPower(data.status === "at_station" || data.status === "completed");
            } catch (err) {
                console.error("❌ [RobotDetail] Fetch error:", err);
                setError(`Không tải được: ${err.message}. Kiểm tra Network tab.`);
            } finally {
                setLoading(false);
            }
        }
        fetchRobot();
    }, [id]);

   /// adsigIl
    // 🔌 SignalR connection
    useEffect(() => {
        if (!id) return;
        console.log("🔌 [RobotDetail] Starting SignalR...");
        const conn = new signalR.HubConnectionBuilder()
            .withUrl(API_CONFIG.API_BASE1+"/hubs/robot")
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();


        conn.on("RobotPowerStatus", (data) => {
            console.log("⚡ [RobotDetail] SignalR update:", data);
            setPower(!!data.power);
            if (data.status) setRobot((r) => ({ ...r, status: data.status }));
        });


        conn.start()
            .then(() => console.log("✅ [RobotDetail] SignalR connected"))
            .catch((err) => console.error("❌ [RobotDetail] SignalR failed:", err));
        return () => conn.stop().catch(console.error);
    }, [id]);


    // 🧭 Toggle power via API (giữ fetch và URL rõ ràng như gốc)
    const togglePower = async () => {
        try {
            console.log("🔄 [RobotDetail] Toggling power...");
            const res = await fetch(API_CONFIG.API_BASE1+"/api/RobotPower/toggle", {
                method: "POST",
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            console.log("📩 [RobotDetail] Toggle response:", data);
            setPower(!power);  // Optimistic update
        } catch (err) {
            console.error("❌ [RobotDetail] Toggle error:", err);
            setError("Toggle thất bại. Kiểm tra endpoint backend.");
        }
    };


    // 🪫 Badge render
    function statusBadge(s) {
        const display = statusMap[s] || s || "Không xác định";
        const badgeClass = display.includes("Đang") || display === "Sẵn sàng" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning";
        return <span className={`badge ${badgeClass} border fs-6 px-3 py-2`}>{display}</span>;
    }


    if (loading) {
        return (
            <div className="page d-flex justify-content-center align-items-center min-vh-100 bg-light">
                <div className="loading">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                    </div>
                    <p className="mb-0">Đang tải robot ID: {id}...</p>
                </div>
            </div>
        );
    }


    if (error) {
        return (
            <div className="page bg-light min-vh-100 d-flex align-items-center justify-content-center">
                <div className="error">
                    <h4 className="mb-3">❌ Lỗi tải trang</h4>
                    <p className="mb-3">{error}</p>
                    <button className="btn btn-primary me-2" onClick={() => window.location.reload()}>Thử lại</button>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>Quay lại danh sách</button>
                </div>
            </div>
        );
    }


    if (!robot) {
        return (
            <div className="page bg-light min-vh-100 d-flex align-items-center justify-content-center">
                <div className="error">
                    <h4 className="mb-3">🤖 Robot không tồn tại</h4>
                    <p>ID {id} không tìm thấy trong hệ thống.</p>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>Quay lại</button>
                </div>
            </div>
        );
    }


    // Safe data từ DTO
    const safeTasks = robot.tasks || [];
    const activities = [
        { time: "10:30", text: `Giao thuốc cho phòng ${safeTasks[0]?.roomNumber || safeTasks[0]?.room || 305}`, state: "done" },
        { time: "09:45", text: "Nạp pin", state: "done" },
        { time: "09:20", text: "Chờ nhiệm vụ", state: "pending" },
    ];


    const gallery = [
        "https://images.unsplash.com/photo-1617087170983-3e7d82b7cef7?q=80&w=900&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1581091215367-59ab6c832c96?q=80&w=900&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1581091876519-1e7e9c8106fd?q=80&w=900&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1581093588401-16ec1f3c9233?q=80&w=900&auto=format&fit=crop",
    ];


    return (
        <div className="page">
            {styles}
            <div className="container-lg py-4">
                <div className="glass rounded-2xl p-3 p-md-4">
                    {/* Header */}
                    <div className="d-flex align-items-start gap-3">
                        <img
                            className="cover"
                            src={robot.avatar || "https://via.placeholder.com/88x88/4CE1C6/FFFFFF?text=🤖"}
                            alt={robot.name || "Robot"}
                        />
                        <div className="flex-grow-1">
                            <h4 className="mb-1 title">{robot.name || "Robot chưa tên"}</h4>
                            <div className="text-muted small">Mã: {robot.code}</div>
                            <div className="mt-1">{statusBadge(robot.status)}</div>
                        </div>


                        {/* Buttons */}
                        <div className="d-flex flex-column gap-2">
                            <button
                                className={`btn ${power ? "btn-danger" : "btn-success"} rounded-pill`}
                                onClick={togglePower}
                            >
                                {power ? (
                                    <>
                                        <i className="bi bi-power me-1"></i> Tắt robot
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-play-fill me-1"></i> Bật robot
                                    </>
                                )}
                            </button>


                            <button
                                className="btn btn-teal rounded-pill"
                                disabled={!power}
                                onClick={() => navigate(`/robot-tasks/${id}`)}
                                title={
                                    power
                                        ? "Mở giao diện điều khiển robot"
                                        : "Cần bật robot trước"
                                }
                            >
                                <i className="bi bi-controller me-1"></i> Điều khiển robot
                            </button>
                        </div>
                    </div>


                    {/* Detail + Activity */}
                    <div className="row g-4 mt-3">
                        <div className="col-lg-7">
                            <div className="kv">
                                <div className="text-muted">Loại robot</div>
                                <div className="fw-semibold">{robot.type || "Xe chở thuốc"}</div>
                                <div className="text-muted">Vị trí hiện tại</div>
                                <div className="fw-semibold">
                                    {robot.latitude && robot.longitude
                                        ? `${robot.latitude.toFixed(3)}, ${robot.longitude.toFixed(3)}`
                                        : "Khu Nội - Tầng 3"
                                    }
                                </div>
                                <div className="text-muted">Kết nối</div>
                                <div className="fw-semibold">{power ? "Online" : "Offline"}</div>
                                <div className="text-muted">Pin</div>
                                <div>
                                    <div
                                        className="progress"
                                        role="progressbar"
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                    >
                                        <div
                                            className={`progress-bar ${
                                                robot.batteryPercent < 30
                                                    ? "bg-danger"
                                                    : robot.batteryPercent < 60
                                                    ? "bg-warning"
                                                    : "bg-success"
                                            }`}
                                            style={{ width: `${robot.batteryPercent || 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                            <button className="btn btn-primary mt-3 rounded-pill">
                                <i className="bi bi-broadcast me-1"></i> Định vị nhanh
                            </button>
                        </div>


                        <div className="col-lg-5">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <h6 className="mb-0 fw-bold">Lịch sử hoạt động</h6>
                            </div>
                            <ul className="list-group">
                                {activities.map((a, i) => (
                                    <li
                                        key={i}
                                        className="list-group-item d-flex align-items-center justify-content-between"
                                    >
                                        <div>
                                            <div className="fw-semibold">{a.text}</div>
                                            <div className="text-muted small">{a.time}</div>
                                        </div>
                                        {a.state === "done" ? (
                                            <span className="badge bg-success-subtle text-success border">
                                                Hoàn thành
                                            </span>
                                        ) : (
                                            <span className="badge bg-warning-subtle text-warning border">
                                                Đang xử lý
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>


                    {/* Gallery */}
                    <div className="mt-4">
                        <h6 className="fw-bold mb-2">Hình ảnh hoạt động</h6>
                        <div className="row g-3">
                            {gallery.map((src, i) => (
                                <div className="col-6 col-md-3" key={i}>
                                    <img className="thumb w-100" src={src} alt={`img-${i}`} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
}


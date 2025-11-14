import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
export default function RobotLiveConsole() {
  const mapRef = useRef(null);
  const mapLayer = useRef(null);
  const robotMarker = useRef(null);
  const [status, setStatus] = useState("🕓 Đang kết nối...");
  const [cameraFrame, setCameraFrame] = useState(null);
  const [activeKey, setActiveKey] = useState("");
  const [logs, setLogs] = useState([
    { time: "13:42:47", text: "Hệ thống khởi động. Robot sẵn sàng.", level: "ok" },
    { time: "13:35:20", text: "AI nhận diện xử lý tình huống. Yêu cầu hỗ trợ.", level: "warn" },
  ]);
  const [mapName, setMapName] = useState("");


  // ==========================================================
  // 🔗 Kết nối Hub: RobotCamera + RobotPosition
  // ==========================================================
  useEffect(() => {
    const posConn = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5170/hubs/robotposition")
      .withAutomaticReconnect()
      .build();

    const camConn = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5170/hubs/robotcamera")
      .withAutomaticReconnect()
      .build();

    posConn.on("ReceiveMapUpdate", (map) => drawMap(map));
    posConn.on("ReceivePosition", (pos) => updateRobotPosition(pos));
    camConn.on("ReceiveCameraFrame", (frame) => {
      if (frame?.image_b64)
        setCameraFrame(`data:image/jpeg;base64,${frame.image_b64}`);
    });

    posConn.start()
      .then(() => setStatus("✅ Kết nối tới robot thành công!"))
      .catch((err) => console.error("❌ Position Hub:", err));

    camConn.start()
      .catch((err) => console.error("❌ Camera Hub:", err));

    return () => {
      posConn.stop();
      camConn.stop();
    };
  }, []);

  // ==========================================================
  // 🗺️ Vẽ bản đồ ROS2 (Fixed version)
  // ==========================================================
  function drawMap(mapData) {
    if (!window.L) return;
    const L = window.L;

    // Hỗ trợ Data_b64 (C#) & data_b64 (Python)
    const base64 =
      mapData?.Data_b64 || mapData?.data_b64 || mapData?.data || null;
    if (!base64) {
      console.warn("⚠️ Map update missing base64 data");
      return;
    }

    const res = mapData.Resolution || mapData.resolution || 0.05;
    const w = mapData.Width || mapData.width || 800;
    const h = mapData.Height || mapData.height || 800;
    const ox = mapData.Origin?.X ?? mapData.origin?.x ?? 0;
    const oy = mapData.Origin?.Y ?? mapData.origin?.y ?? 0;

    const imgSrc = `data:image/png;base64,${base64}`;

    // ROS map (origin bottom-left) → Leaflet (origin top-left)
    const bounds = [
      [oy, ox],
      [oy + h * res, ox + w * res],
    ];

    if (!mapRef.current) {
      mapRef.current = L.map("map", { crs: L.CRS.Simple, zoomControl: false });
      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
    }

    if (mapLayer.current) mapRef.current.removeLayer(mapLayer.current);

    mapLayer.current = L.imageOverlay(imgSrc, bounds, { opacity: 1.0 }).addTo(mapRef.current);
    mapRef.current.fitBounds(bounds);

    console.log(`🗺️ Map updated: ${w}×${h} (res=${res}) origin=(${ox},${oy})`);
  }

  // ==========================================================
  // 🤖 Cập nhật vị trí robot
  // ==========================================================
  function updateRobotPosition(pos) {
    if (!window.L || !mapRef.current) return;
    const L = window.L;

    const icon = L.divIcon({
      className: "robot-marker",
      html: `<div style="transform: rotate(${pos.theta}rad); font-size: 24px;">🤖</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const latlng = [pos.y, pos.x];
    if (!robotMarker.current) {
      robotMarker.current = L.marker(latlng, { icon }).addTo(mapRef.current);
    } else {
      robotMarker.current.setLatLng(latlng);
      robotMarker.current.setIcon(icon);
    }
  }

  // ==========================================================
  // 🕹️ Điều khiển robot bằng phím
  // ==========================================================
  async function sendCommand(key) {
    try {
      await fetch("http://localhost:5170/api/RobotMode/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      setLogs((prev) => [
        { time: new Date().toLocaleTimeString(), text: `Điều khiển: ${key.toUpperCase()}`, level: "ok" },
        ...prev,
      ]);
      setActiveKey(key);
      setTimeout(() => setActiveKey(""), 300);
    } catch (err) {
      console.error("❌ Lỗi gửi lệnh điều khiển:", err);
    }
  }

  useEffect(() => {
    const handleKey = (e) => {
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d", "x"].includes(key)) {
        e.preventDefault();
        sendCommand(key);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ==========================================================
  // 💾 Lưu Map
  // ==========================================================
  async function saveMap() {
    if (!mapName.trim()) {
      alert("Vui lòng nhập tên bản đồ!");
      return;
    }
    try {
      const res = await fetch("http://localhost:5170/api/RobotMode/SendMode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Mode: "save_map", MapName: mapName }),
      });
      if (res.ok) {
        setLogs((prev) => [
          { time: new Date().toLocaleTimeString(), text: `💾 Lưu bản đồ: ${mapName}`, level: "ok" },
          ...prev,
        ]);
        setMapName("");
        alert("Đã gửi lệnh lưu bản đồ!");
      } else {
        throw new Error("Lỗi API khi lưu bản đồ");
      }
    } catch (err) {
      console.error("❌ Lưu bản đồ lỗi:", err);
      alert("Không thể gửi lệnh lưu bản đồ.");
    }
  }

  // ==========================================================
  // 🧩 Giao diện
  // ==========================================================
  return (
    <div className="page">
      <style>{`
        :root{--teal:#4CE1C6;--ink:#0f172a}
        .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(1200px 600px at 15% 10%,rgba(76,225,198,.18),transparent 60%),radial-gradient(900px 500px at 90% 5%,rgba(76,225,198,.12),transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 15%,#e9f3f1 35%,#e8f0ee 100%);min-height:100vh}
        .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.85);box-shadow:0 16px 48px rgba(15,23,42,.08);border-radius:18px}
        .panel-title{font-weight:800;color:#0b1432}
        .video-box, .map-box{height:260px;border-radius:14px;background:linear-gradient(145deg,#eaf7f4,#f8fbfa);display:grid;place-items:center;color:#8aa3a0}
        .pad{display:grid;grid-template-columns:repeat(3,56px);gap:8px;justify-content:center}
        .key{height:56px;border-radius:12px;border:1px solid rgba(15,23,42,.08);display:grid;place-items:center;font-weight:800;color:#0b1432;background:#ffffff;cursor:pointer}
        .key.active{background:var(--teal);color:#052a2b;border-color:transparent}
        .log-item{border-left:4px solid transparent}
        .log-ok{border-left-color:#16a34a}
        .log-warn{border-left-color:#f59e0b}
        .log-err{border-left-color:#ef4444}
      `}</style>

      <div className="container-xxl py-3 py-lg-4">
        <div className="row g-3">
          {/* LEFT CONTROL PANEL */}
          <div className="col-lg-3">
            <div className="glass p-3 h-100">
              <div className="fw-bold">RB-001</div>
              <div className="small text-muted mb-2">
                Trạng thái: <span className="text-success fw-semibold">Đang hoạt động</span>
              </div>

              <div className="small-label fw-semibold mb-1">Chế độ Lái thủ công</div>
              <div className="pad mx-auto mt-2">
                <div></div>
                <div className={`key ${activeKey === "w" ? "active" : ""}`} onClick={() => sendCommand("w")}>W</div>
                <div></div>
                <div className={`key ${activeKey === "a" ? "active" : ""}`} onClick={() => sendCommand("a")}>A</div>
                <div className={`key ${activeKey === "s" ? "active" : ""}`} onClick={() => sendCommand("s")}>S</div>
                <div className={`key ${activeKey === "d" ? "active" : ""}`} onClick={() => sendCommand("d")}>D</div>
              </div>

              <div className="d-flex justify-content-center mt-2">
                <div className={`key ${activeKey === "x" ? "active" : ""}`} onClick={() => sendCommand("x")} style={{ width: 56 }}>X</div>
              </div>

              <div className="text-center text-muted mt-2" style={{ fontSize: ".85rem" }}>
                Nhấn hoặc bấm W/A/S/D/X để điều khiển robot
              </div>
            </div>
          </div>

          {/* CENTER: CAMERA + MAP */}
          <div className="col-lg-6">
            <div className="glass p-3 mb-3">
              <div className="d-flex justify-content-between mb-2">
                <div className="panel-title">🎥 Camera Trực Tiếp</div>
                <span className="badge bg-info text-dark">{status}</span>
              </div>
              <div className="video-box">
                {cameraFrame ? (
                  <img src={cameraFrame} alt="Camera" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "14px" }} />
                ) : (
                  "Đang chờ khung hình..."
                )}
              </div>
            </div>

            <div className="glass p-3">
              <div className="d-flex justify-content-between mb-2 align-items-center">
                <div className="panel-title mb-0">🗺️ Bản Đồ Bệnh Viện</div>
                <div className="input-group input-group-sm" style={{ maxWidth: "60%" }}>
                  <input
                    className="form-control"
                    placeholder="Tên bản đồ..."
                    value={mapName}
                    onChange={(e) => setMapName(e.target.value)}
                  />
                  <button className="btn btn-success" onClick={saveMap}>
                    💾 Lưu Map
                  </button>
                </div>
              </div>
              <div id="map" className="map-box"></div>
            </div>
          </div>

          {/* RIGHT: LOG PANEL */}
          <div className="col-lg-3">
            <div className="glass p-3 h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="panel-title mb-0">📜 Nhật ký hệ thống</div>
                <button className="btn btn-sm btn-outline-danger" onClick={() => setLogs([])}>
                  🗑 Xóa
                </button>
              </div>
              <ul className="list-group list-group-flush">
                {logs.length === 0 ? (
                  <li className="list-group-item text-center text-muted">Chưa có log.</li>
                ) : (
                  logs.map((l, i) => (
                    <li key={i} className={`list-group-item log-item ${l.level === "ok" ? "log-ok" : l.level === "warn" ? "log-warn" : "log-err"}`}>
                      <div className="small text-muted">{l.time}</div>
                      <div className="fw-semibold">{l.text}</div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

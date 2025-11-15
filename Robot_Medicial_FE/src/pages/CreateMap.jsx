import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
export default function RobotLiveConsole() {
  const mapRef = useRef(null);
  const mapLayer = useRef(null);
  const robotMarker = useRef(null);

  // ===================================
  // STATE
  // ===================================
  const [status, setStatus] = useState("Đang kết nối...");
  const [cameraFrame, setCameraFrame] = useState(null);
  const [mapName, setMapName] = useState("");
  const [logs, setLogs] = useState([]);
  const [activeKey, setActiveKey] = useState("");
  const [remoteMode, setRemoteMode] = useState(false);
  const [compartments, setCompartments] = useState([
    { id: 1, label: "Hộp 1", state: "closed" },
    { id: 2, label: "Hộp 2", state: "closed" },
  ]);


  // ===================================
  // SIGNALR HUBS
  // ===================================
  useEffect(() => {
    const posConn = new signalR.HubConnectionBuilder()
      .withUrl(API_CONFIG.API_BASE1 + "/hubs/robotposition")
      .withAutomaticReconnect()
      .build();

    const camConn = new signalR.HubConnectionBuilder()
      .withUrl(API_CONFIG.API_BASE1 + "/hubs/robotcamera")
      .withAutomaticReconnect()
      .build();

    posConn.on("ReceiveMapUpdate", (map) => drawMap(map));
    posConn.on("ReceivePosition", (pos) => updateRobotPosition(pos));
    camConn.on("ReceiveCameraFrame", (frame) => {
      if (frame?.image_b64)
        setCameraFrame(`data:image/jpeg;base64,${frame.image_b64}`);
    });

    posConn
      .start()
      .then(() => setStatus("Đã kết nối robot"))
      .catch((e) => console.error("Position Hub:", e));

    camConn.start().catch((e) => console.error("Camera Hub:", e));

    return () => {
      posConn.stop();
      camConn.stop();
    };
  }, []);

  // ===================================
  // MAP + ROBOT POSITION
  // ===================================
  function drawMap(mapData) {
    if (!window.L) return;
    const L = window.L;
    const base64 = mapData?.Data_b64 || mapData?.data_b64 || mapData?.data || null;
    if (!base64) return;

    const res = mapData.Resolution || mapData.resolution || 0.05;
    const w = mapData.Width || mapData.width || 800;
    const h = mapData.Height || mapData.height || 800;
    const ox = mapData.Origin?.X ?? mapData.origin?.x ?? 0;
    const oy = mapData.Origin?.Y ?? mapData.origin?.y ?? 0;

    const imgSrc = `data:image/png;base64,${base64}`;
    const bounds = [
      [oy, ox],
      [oy + h * res, ox + w * res],
    ];

    if (!mapRef.current) {
      mapRef.current = L.map("map", { crs: L.CRS.Simple, zoomControl: false });
      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
    }

    if (mapLayer.current) mapRef.current.removeLayer(mapLayer.current);
    mapLayer.current = L.imageOverlay(imgSrc, bounds, { opacity: 1 }).addTo(mapRef.current);
    mapRef.current.fitBounds(bounds);
  }

  function updateRobotPosition(pos) {
    if (!window.L || !mapRef.current) return;
    const L = window.L;

    const icon = L.divIcon({
      className: "robot-marker",
      html: `<div style="transform:rotate(${pos.theta}rad);font-size:22px;">🤖</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const latlng = [pos.y, pos.x];

    if (!robotMarker.current)
      robotMarker.current = L.marker(latlng, { icon }).addTo(mapRef.current);
    else {
      robotMarker.current.setLatLng(latlng);
      robotMarker.current.setIcon(icon);
    }
  }

  // ===================================
  // MANUAL CONTROL
  // ===================================
  async function sendCommand(key) {
    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      setLogs((l) => [
        { time: new Date().toLocaleTimeString(), text: `Điều khiển: ${key}`, level: "ok" },
        ...l,
      ]);
      setActiveKey(key);
      setTimeout(() => setActiveKey(""), 200);
    } catch (err) {
      console.error(err);
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
    if (remoteMode) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [remoteMode]);

  // ===================================
  // COMPARTMENT OPEN/CLOSE
  // ===================================
  async function toggleCompartment(id) {
    const comp = compartments.find((c) => c.id === id);
    const newState = comp.state === "open" ? "close" : "open";
    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotCompartmentSignal/signal",{
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compartmentId: id, action: newState }),
      });
      setCompartments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, state: newState } : c))
      );
      setLogs((l) => [
        {
          time: new Date().toLocaleTimeString(),
          text: `Hộp ${id} → ${newState === "open" ? "Mở" : "Đóng"}`,
          level: "ok",
        },
        ...l,
      ]);
    } catch (err) {
      console.error("Lỗi hộp:", err);
    }
  }

  // ===================================
  // SAVE MAP
  // ===================================
	async function saveMap() {
    if (!mapName.trim()) return alert("Nhập tên bản đồ!");
    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/SendMode",{
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Mode: "save_map", MapName: mapName }),
      });
      setLogs((l) => [
        { time: new Date().toLocaleTimeString(), text: `Lưu bản đồ: ${mapName}`, level: "ok" },
        ...l,
      ]);
      setMapName("");
      alert("Đã gửi lệnh lưu bản đồ!");
    } catch (err) {
      alert("Không thể lưu bản đồ!");
    }
  }

  // ===================================
  // UI
  // ===================================
  return (
    <div className="page">
     <style>{`
  :root{--teal:#4CE1C6;--ink:#0f172a}
  .page{font-family:Inter,system-ui; background:linear-gradient(180deg,#f6faf9,#e8f0ee);min-height:100vh;color:#0b1324;}
  .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.85);box-shadow:0 16px 48px rgba(15,23,42,.08);border-radius:18px}

  /* Điều khiển / phím */
  .key{height:48px;width:48px;border:1px solid rgba(15,23,42,.1);border-radius:12px;
      display:grid;place-items:center;font-weight:700;cursor:pointer;font-size:14px;}
  .key.active{background:var(--teal);color:#052a2b;border-color:transparent}
  .pad{display:grid;grid-template-columns:repeat(3,48px);gap:6px;justify-content:center}

  /* CAMERA */
  .video-box{
    height:260px;
    border-radius:14px;
    background:#eaf7f4;
    overflow:hidden;
  }

  /* MAP FULL WIDTH + FULL HEIGHT */
  .map-box{
    height:520px;          /* chiều cao to hơn */
    width:100%;
    border-radius:14px;
    background:#eaf7f4;
    overflow:hidden;
    padding:0;
  }
  #map{
    width:100% !important;
    height:100% !important;
    display:block;
  }

  /* LOG */
  .log-container{max-height:220px;overflow-y:auto;padding-right:6px;font-size:12px;}
  .log-container::-webkit-scrollbar{width:4px;}
  .log-container::-webkit-scrollbar-thumb{background:rgba(0,0,0,.2);border-radius:2px;}

`}</style>


      <div className="container-xxl py-3 py-lg-4">
        <div className="row g-3">
          {/* LEFT: CAMERA + MAP (10 phần) */}
          <div className="col-lg-10">
            {/* Camera */}
            <div className="glass p-3 mb-3">
              <div className="d-flex justify-content-between mb-2">
                <div className="fw-bold">Camera Trực Tiếp</div>
                <span className="badge bg-info text-dark">{status}</span>
              </div>
              <div className="video-box">
                {cameraFrame ? (
                  <img
                    src={cameraFrame}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "12px",
                    }}
                    alt="Camera feed"
                  />
                ) : (
                  <span className="text-muted">Đang chờ khung hình...</span>
                )}
              </div>
            </div>

            {/* Map */}
            <div className="glass p-3">
              <div className="d-flex justify-content-between mb-2 align-items-center">
                <div className="fw-bold">Bản đồ bệnh viện</div>
                <div className="input-group input-group-sm" style={{ maxWidth: "60%" }}>
                  <input
                    className="form-control"
                    placeholder="Tên bản đồ..."
                    value={mapName}
                    onChange={(e) => setMapName(e.target.value)}
                  />
                  <button className="btn btn-success" onClick={saveMap}>
                    Lưu
                  </button>
                </div>
              </div>
              <div className="map-box">
                <div id="map"></div>
              </div>

            </div>
          </div>

          {/* RIGHT: CONTROL + LOGS (2 phần) */}
          <div className="col-lg-2">
            <div className="glass p-3 h-100 d-flex flex-column control-panel" style={{ minHeight: "600px" }}>
              {/* CONTROL PANEL */}
              <div className="mb-3">
                <h6 className="fw-bold mb-2">Điều khiển</h6>

                <button
                  className="btn btn-primary w-100 rounded-pill mb-2"
                  onClick={() => setRemoteMode(!remoteMode)}
                >
                  {remoteMode ? "Tắt" : "Lái từ xa"}
                </button>

                {remoteMode && (
                  <>
                    <div className="pad mx-auto mb-2">
                      <div></div>
                      <div
                        className={`key ${activeKey === "w" ? "active" : ""}`}
                        onClick={() => sendCommand("w")}
                      >
                        W
                      </div>
                      <div></div>
                      <div
                        className={`key ${activeKey === "a" ? "active" : ""}`}
                        onClick={() => sendCommand("a")}
                      >
                        A
                      </div>
                      <div
                        className={`key ${activeKey === "s" ? "active" : ""}`}
                        onClick={() => sendCommand("s")}
                      >
                        S
                      </div>
                      <div
                        className={`key ${activeKey === "d" ? "active" : ""}`}
                        onClick={() => sendCommand("d")}
                      >
                        D
                      </div>
                    </div>
                    <div className="d-flex justify-content-center mb-2">
                      <div
                        className={`key ${activeKey === "x" ? "active" : ""}`}
                        onClick={() => sendCommand("x")}
                      >
                        X
                      </div>
                    </div>
                  </>
                )}

                <h6 className="fw-bold mt-2 mb-1">Hộp</h6>
                {compartments.map((c) => (
                  <div key={c.id} className="d-flex align-items-center justify-content-between mb-1">
                    <div className="fw-semibold small">{c.label}</div>
                    <button
                      className={`btn btn-sm ${c.state === "open" ? "btn-danger" : "btn-success"}`}
                      onClick={() => toggleCompartment(c.id)}
                    >
                      {c.state === "open" ? "Đóng" : "Mở"}
                    </button>
                  </div>
                ))}
              </div>

              {/* LOGS - Dưới điều khiển */}
              <div className="mt-auto border-top pt-2">
                <div className="d-flex justify-content-between mb-1 align-items-center">
                  <div className="fw-bold small">Nhật ký</div>
                  <button
                    className="btn btn-sm btn-outline-danger p-0 px-1"
                    onClick={() => setLogs([])}
                  >
                    Xóa
                  </button>
                </div>
                <div className="log-container">
                  <ul className="list-group list-group-flush">
                    {logs.length === 0 ? (
                      <li className="list-group-item text-center text-muted py-1 small">
                        Chưa có log.
                      </li>
                    ) : (
                      logs.slice(0, 15).map((l, i) => (
                        <li
                          key={i}
                          className="list-group-item py-1 px-0 small"
                        >
                          <div className="text-muted">{l.time}</div>
                          <div>{l.text}</div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
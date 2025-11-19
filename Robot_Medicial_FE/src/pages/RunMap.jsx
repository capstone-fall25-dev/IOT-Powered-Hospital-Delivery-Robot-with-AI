import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import styles from "@/assets/styles/robotLiveConsole.module.css";

export default function RobotRunMap() {
  // ===================================
  // 🗺️ MAP REFS
  // ===================================
  // Map trên: bản đồ theo destination
  const navMapRef = useRef(null);
  const navMapLayer = useRef(null);
  const destinationMarker = useRef(null);

  // Map dưới: bản đồ bệnh viện (live từ ROS2)
  const liveMapRef = useRef(null);
  const liveMapLayer = useRef(null);
  const robotMarker = useRef(null);

  // ===================================
  // 🧩 STATE
  // ===================================
  const [status, setStatus] = useState("🕓 Đang kết nối...");
  const [cameraFrame, setCameraFrame] = useState(null);
  const [mapName, setMapName] = useState("");
  const [logs, setLogs] = useState([]);
  const [activeKey, setActiveKey] = useState("");
  const [remoteMode, setRemoteMode] = useState(false);

  const [compartments, setCompartments] = useState([
    { id: 1, label: "Hộp 1", state: "closed" },
    { id: 2, label: "Hộp 2", state: "closed" },
  ]);

  const [destinations, setDestinations] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedMapName, setSelectedMapName] = useState("");

  // ===================================
  // 🔗 SIGNALR
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

    // LIVE MAP (bệnh viện)
    posConn.on("ReceiveMapUpdate", (map) => drawLiveMap(map));
    posConn.on("ReceivePosition", (pos) => updateRobotPosition(pos));

    camConn.on("ReceiveCameraFrame", (frame) => {
      if (frame?.image_b64)
        setCameraFrame(`data:image/jpeg;base64,${frame.image_b64}`);
    });

    posConn.start().then(() => setStatus("Đã kết nối robot"));
    camConn.start();

    return () => {
      posConn.stop();
      camConn.stop();
    };
  }, []);

  // ===================================
  // 📍 LOAD DESTINATIONS
  // ===================================
  useEffect(() => {
    async function fetchDestinations() {
      try {
        const res = await fetch(API_CONFIG.API_BASE1 + "/api/Destinations");
        const data = await res.json();
        setDestinations(data);
      } catch {}
    }
    fetchDestinations();
  }, []);

  // ===================================
  // LIVE MAP (ROS2)
  // ===================================
  function drawLiveMap(mapData) {
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

    if (!liveMapRef.current) {
      liveMapRef.current = L.map("live-map", {
        crs: L.CRS.Simple,
        zoomControl: false,
      });
      L.control.zoom({ position: "bottomright" }).addTo(liveMapRef.current);
    }

    if (liveMapLayer.current) liveMapRef.current.removeLayer(liveMapLayer.current);
    liveMapLayer.current = L.imageOverlay(imgSrc, bounds, { opacity: 1 }).addTo(liveMapRef.current);
    liveMapRef.current.fitBounds(bounds);
  }

  // ============================================================
  // 2) ROBOT POSITION 
  // ============================================================
  function updateRobotPosition(pos) {
    if (!window.L || !liveMapRef.current) return;
    const L = window.L;

    const icon = L.divIcon({
      className: "robot-marker",
      html: `<div style="transform:rotate(${pos.theta}rad);font-size:15px;">🤖</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const latlng = [pos.y, pos.x];

    if (!robotMarker.current)
      robotMarker.current = L.marker(latlng, { icon }).addTo(liveMapRef.current);
    else {
      robotMarker.current.setLatLng(latlng);
      robotMarker.current.setIcon(icon);
    }
  }

  // ===================================
  // NAVIGATION MAP
  // ===================================
  async function loadNavigationMapForDestination(destination) {
    if (!destination) return;
    if (!window.L) return;
    const L = window.L;

    const metaRes = await fetch(
      API_CONFIG.API_BASE1 + `/api/MapsUpload/${destination.mapId}`
    );
    const meta = await metaRes.json();

    const resolution = meta.resolution;
    const originX = meta.originX;
    const originY = meta.originY;

    setSelectedMapName(meta.mapName);

    const imgUrl = API_CONFIG.API_BASE1 + `/api/MapsUpload/${destination.mapId}/image`;

    const img = new Image();
    img.src = imgUrl;

    img.onload = () => {
      const widthMeters = img.width * resolution;
      const heightMeters = img.height * resolution;

      const bounds = L.latLngBounds(
        L.latLng(0, 0),
        L.latLng(heightMeters, widthMeters)
      );

      if (!navMapRef.current) {
        navMapRef.current = L.map("nav-map", { crs: L.CRS.Simple });
        L.control.zoom({ position: "bottomright" }).addTo(navMapRef.current);
      }

      if (navMapLayer.current) navMapRef.current.removeLayer(navMapLayer.current);
      navMapLayer.current = L.imageOverlay(imgUrl, bounds).addTo(navMapRef.current);
      navMapRef.current.fitBounds(bounds);

      // Marker 📍 tại destination (map trên)
      const localX = destination.x - originX;
      const localY = destination.y - originY;
      const latlng = [localY, localX];

      const icon = L.divIcon({
        html: `<div style="font-size:20px;">📍</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });

      if (destinationMarker.current) destinationMarker.current.setLatLng(latlng);
      else destinationMarker.current = L.marker(latlng, { icon }).addTo(navMapRef.current);
    };
  }

  // ===================================
  // CONTROL KEYS
  // ===================================
  async function sendCommand(key) {
    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      setLogs((l) => [
        { time: new Date().toLocaleTimeString(), text: `Điều khiển: ${key}` },
        ...l,
      ]);
      setActiveKey(key);
      setTimeout(() => setActiveKey(""), 200);
    } catch {}
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

  async function toggleCompartment(id) {
    const comp = compartments.find((c) => c.id === id);
    const newState = comp.state === "open" ? "close" : "open";

    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotCompartmentSignal/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compartmentId: id, action: newState }),
      });

      setCompartments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, state: newState } : c))
      );
    } catch {}
  }

  async function saveMap() {
    if (!mapName.trim()) return alert("Nhập tên bản đồ!");
    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/SendMode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Mode: "save_map", MapName: mapName }),
      });
      alert("Đã gửi lệnh lưu bản đồ!");
    } catch {}
  }

  async function startRunMap() {
    if (!selectedDestination) return alert("Chọn điểm đến!");
    if (!selectedMapName) return alert("Không có mapName!");

    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/SendMode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "run_map",
          mapName: selectedMapName,
        }),
      });
      alert("Đã gửi lệnh run_map!");
    } catch {}
  }

  async function sendRoute() {
    if (!selectedDestination) return alert("Chọn điểm đến trước!");

    const payload = {
      type: "destination_route",
      map_id: selectedDestination.mapId,
      timestamp: new Date().toISOString(),
      destinations: [
        {
          order: 1,
          id: selectedDestination.id,
          name: selectedDestination.name,
          x: selectedDestination.x,
          y: selectedDestination.y,
        },
      ],
    };

    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/Destinations/send-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      alert("📤 Route đã gửi!");
    } catch {}
  }

  function handleSelectDestination(e) {
    const id = e.target.value;
    const dest = destinations.find((d) => String(d.id) === id);
    setSelectedDestination(dest || null);
    if (dest) loadNavigationMapForDestination(dest);
  }

  // ===================================
  // UI
  // ===================================
  return (
    <div className={styles.page}>
      <div className="container-xxl py-3">
        <div className="row g-3" style={{ height: 'calc(100vh - 2rem)' }}>
          
          {/* =================== LEFT: CONTROLS =================== */}
          <div className="col-lg-3 col-xl-3">
            <div className={`${styles.glass} p-3 h-100`}>
              <div className={styles.controlSidebar}>
                
                {/* Control Section */}
                <div className="mb-3">
                  <h6 className={styles.sectionTitle}>
                    <i className="bi bi-joystick"></i>
                    Điều khiển
                  </h6>

                  <button
                    className={`${styles.btnPrimary} mt-2`}
                    onClick={() => setRemoteMode(!remoteMode)}
                  >
                    <i className={`bi ${remoteMode ? 'bi-stop-circle' : 'bi-controller'} me-1`}></i>
                    {remoteMode ? "Tắt lái từ xa" : "Lái từ xa"}
                  </button>

                  {remoteMode && (
                    <>
                      <div className={styles.pad}>
                        <div></div>
                        <div
                          className={`${styles.key} ${activeKey === "w" ? styles.keyActive : ""}`}
                          onClick={() => sendCommand("w")}
                        >
                          W
                        </div>
                        <div></div>
                        <div
                          className={`${styles.key} ${activeKey === "a" ? styles.keyActive : ""}`}
                          onClick={() => sendCommand("a")}
                        >
                          A
                        </div>
                        <div
                          className={`${styles.key} ${activeKey === "s" ? styles.keyActive : ""}`}
                          onClick={() => sendCommand("s")}
                        >
                          S
                        </div>
                        <div
                          className={`${styles.key} ${activeKey === "d" ? styles.keyActive : ""}`}
                          onClick={() => sendCommand("d")}
                        >
                          D
                        </div>
                      </div>
                      <div className="d-flex justify-content-center">
                        <div
                          className={`${styles.key} ${activeKey === "x" ? styles.keyActive : ""}`}
                          onClick={() => sendCommand("x")}
                        >
                          X
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <hr className={styles.divider} />

                {/* Compartments */}
                <div className="mb-3">
                  <h6 className={styles.sectionTitle}>
                    <i className="bi bi-box-seam"></i>
                    Hộp chứa
                  </h6>
                  <div className="mt-2">
                    {compartments.map((c) => (
                      <div key={c.id} className={styles.compartmentItem}>
                        <span className={styles.compartmentLabel}>{c.label}</span>
                        <button
                          className={c.state === "open" ? styles.btnDanger : styles.btnSuccess}
                          onClick={() => toggleCompartment(c.id)}
                        >
                          {c.state === "open" ? "Đóng" : "Mở"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <hr className={styles.divider} />

                {/* Destination Selection */}
                <div className="mb-3">
                  <h6 className={styles.sectionTitle}>
                    <i className="bi bi-geo-alt-fill"></i>
                    Điểm đến
                  </h6>

                  <select
                    className={`${styles.formSelect} mt-2`}
                    value={selectedDestination?.id || ""}
                    onChange={handleSelectDestination}
                  >
                    <option value="">— Chọn điểm đến —</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (map {d.mapId})
                      </option>
                    ))}
                  </select>

                  <button
                    className={`${styles.btnTeal} mt-2`}
                    onClick={startRunMap}
                    disabled={!selectedDestination}
                  >
                    <i className="bi bi-play-circle me-1"></i>
                    Bắt đầu chạy
                  </button>

                  <button
                    className={`${styles.btnOutlinePrimary} mt-2`}
                    onClick={sendRoute}
                    disabled={!selectedDestination}
                  >
                    <i className="bi bi-send me-1"></i>
                    Gửi vị trí muốn đến
                  </button>

                  {selectedDestination && (
                    <div className={`${styles.destinationInfo} mt-2`}>
                      <div><strong>{selectedDestination.name}</strong></div>
                      <div>Map: {selectedMapName}</div>
                      <div>X: {selectedDestination.x.toFixed(2)} | Y: {selectedDestination.y.toFixed(2)}</div>
                    </div>
                  )}
                </div>

                <hr className={styles.divider} />

                {/* Logs */}
                <div className="flex-grow-1">
                  <div className={styles.headerBar}>
                    <h6 className={styles.sectionTitle}>
                      <i className="bi bi-journal-text"></i>
                      Nhật ký
                    </h6>
                    <button
                      className={styles.btnOutlineDanger}
                      onClick={() => setLogs([])}
                    >
                      Xóa
                    </button>
                  </div>
                  <div className={styles.logsContainer}>
                    {logs.length === 0 ? (
                      <div className={styles.logsEmpty}>
                        <i className="bi bi-inbox"></i>
                        <p className="mb-0 mt-1">Chưa có log</p>
                      </div>
                    ) : (
                      logs.slice(0, 15).map((l, i) => (
                        <div key={i} className={styles.logItem}>
                          <div className={styles.logTime}>{l.time}</div>
                          <div className={styles.logText}>{l.text}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* =================== RIGHT: CAMERA + MAPS =================== */}
          <div className="col-lg-9 col-xl-9">
            <div className={styles.mainContent}>
              
              {/* Camera Section */}
              <div className={`${styles.glass} p-3`}>
                <div className={styles.headerBar}>
                  <div className={styles.sectionTitle}>
                    <i className="bi bi-camera-video-fill"></i>
                    Camera Trực Tiếp
                  </div>
                  <span className={status.includes("kết nối") ? styles.statusBadgeSuccess : styles.statusBadge}>
                    {status}
                  </span>
                </div>
                <div className={styles.cameraBox}>
                  {cameraFrame ? (
                    <img src={cameraFrame} alt="Camera feed" />
                  ) : (
                    <span className={styles.cameraPlaceholder}>
                      <i className="bi bi-camera-video" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                      Đang chờ khung hình...
                    </span>
                  )}
                </div>
              </div>

              {/* Dual Map Section */}
              <div className={`${styles.glass} p-3 flex-grow-1 d-flex flex-column`}>
                <div className={styles.headerBar}>
                  <div className={styles.sectionTitle}>
                    <i className="bi bi-map-fill"></i>
                    Bản đồ điều hướng
                  </div>
                  <div className={styles.inputGroup} style={{ maxWidth: '280px' }}>
                    <input
                      className={styles.formControl}
                      placeholder="Tên bản đồ..."
                      value={mapName}
                      onChange={(e) => setMapName(e.target.value)}
                    />
                    <button className={styles.btnSuccess} onClick={saveMap}>
                      <i className="bi bi-save"></i>
                    </button>
                  </div>
                </div>

                <div className={styles.dualMapContainer}>
                  {/* Nav Map - Destination */}
                  <div className={styles.mapBox}>
                    <div id="nav-map" style={{ width: '100%', height: '100%' }}></div>
                  </div>

                  {/* Live Map - Hospital */}
                  <div className={styles.mapBox}>
                    <div id="live-map" style={{ width: '100%', height: '100%' }}></div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
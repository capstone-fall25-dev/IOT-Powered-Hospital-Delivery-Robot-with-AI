import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import PopupWindow from "@/components/PopupWindow";
import { usePopupWindows } from "@/hooks/usePopupWindows";
import styles from "@/assets/styles/robotLiveConsole.module.css";

export default function RobotRunMap() {
  // ===================================
  // 🗺️ MAP REFS
  // ===================================
  const navMapRef = useRef(null);
  const navMapLayer = useRef(null);
  const destinationMarker = useRef(null);

  const liveMapRef = useRef(null);
  const liveMapLayer = useRef(null);
  const robotMarker = useRef(null);

  const { windows, openWindow, closeWindow, minimizeWindow, focusWindow } = usePopupWindows();

  // ===================================
  // 🧩 STATE
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
      } catch (err) {
        console.error("Error loading destinations:", err);
      }
    }
    fetchDestinations();
  }, []);

  // ============================================================
  // 1) LIVE MAP bệnh viện (ROS2)
  // ============================================================
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

    if (liveMapLayer.current)
      liveMapRef.current.removeLayer(liveMapLayer.current);

    liveMapLayer.current = L.imageOverlay(imgSrc, bounds, {
      opacity: 1,
    }).addTo(liveMapRef.current);
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

  // ============================================================
  // 3) NAVIGATION MAP theo DESTINATION
  // ============================================================
  async function loadNavigationMapForDestination(destination) {
    if (!destination) return;
    if (!window.L) return;
    const L = window.L;

    try {
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

        if (navMapLayer.current)
          navMapRef.current.removeLayer(navMapLayer.current);

        navMapLayer.current = L.imageOverlay(imgUrl, bounds).addTo(navMapRef.current);
        navMapRef.current.fitBounds(bounds);

        const localX = destination.x - originX;
        const localY = destination.y - originY;
        const latlng = [localY, localX];

        const icon = L.divIcon({
          html: `<div style="font-size:20px;">📍</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        });

        if (destinationMarker.current)
          destinationMarker.current.setLatLng(latlng);
        else
          destinationMarker.current = L.marker(latlng, { icon }).addTo(navMapRef.current);

        // Open nav map window when destination is loaded
        if (!windows.navMap.isOpen) {
          openWindow("navMap");
        }
      };
    } catch (err) {
      console.error("Error loading navigation map:", err);
    }
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
    } catch (err) {
      console.error("Control error:", err);
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

      setLogs((l) => [
        {
          time: new Date().toLocaleTimeString(),
          text: `Hộp ${id} → ${newState === "open" ? "Mở" : "Đóng"}`,
        },
        ...l,
      ]);
    } catch (err) {
      console.error("Compartment error:", err);
    }
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
      setLogs((l) => [
        { time: new Date().toLocaleTimeString(), text: `Lưu bản đồ: ${mapName}` },
        ...l,
      ]);
    } catch (err) {
      alert("Không thể lưu bản đồ!");
    }
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
      setLogs((l) => [
        { time: new Date().toLocaleTimeString(), text: `Bắt đầu chạy: ${selectedMapName}` },
        ...l,
      ]);

      // Open live map window
      if (!windows.liveMap.isOpen) {
        openWindow("liveMap");
      }
    } catch (err) {
      alert("Không thể chạy bản đồ!");
    }
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
      setLogs((l) => [
        { time: new Date().toLocaleTimeString(), text: `Gửi route: ${selectedDestination.name}` },
        ...l,
      ]);
    } catch (err) {
      alert("Không thể gửi route!");
    }
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
      <div className="container-fluid py-3">
        <div className="row g-3">
          {/* =================== LEFT: CONTROL PANEL =================== */}
          <div className="col-lg-3">
            <div className={`${styles.glass} p-3 ${styles.controlSidebar}`}>
              
              {/* CONTROL SECTION */}
              <h6 className={styles.sectionTitle}>
                <i className="bi bi-joystick"></i>
                Điều khiển
              </h6>

              <button
                className={styles.btnPrimary}
                onClick={() => setRemoteMode(!remoteMode)}
              >
                <i className={`bi ${remoteMode ? "bi-hand-thumbs-down" : "bi-hand-thumbs-up"} me-1`}></i>
                {remoteMode ? "Tắt lái từ xa" : "Lái từ xa"}
              </button>

              {remoteMode && (
                <>
                  <div className={styles.pad}>
                    <div></div>
                    <div
                      className={`${styles.key} ${activeKey === "w" ? styles.active : ""}`}
                      onClick={() => sendCommand("w")}
                    >
                      W
                    </div>
                    <div></div>
                    <div
                      className={`${styles.key} ${activeKey === "a" ? styles.active : ""}`}
                      onClick={() => sendCommand("a")}
                    >
                      A
                    </div>
                    <div
                      className={`${styles.key} ${activeKey === "s" ? styles.active : ""}`}
                      onClick={() => sendCommand("s")}
                    >
                      S
                    </div>
                    <div
                      className={`${styles.key} ${activeKey === "d" ? styles.active : ""}`}
                      onClick={() => sendCommand("d")}
                    >
                      D
                    </div>
                  </div>
                  <div className="d-flex justify-content-center mb-3">
                    <div
                      className={`${styles.key} ${activeKey === "x" ? styles.active : ""}`}
                      onClick={() => sendCommand("x")}
                    >
                      X
                    </div>
                  </div>
                </>
              )}

              <hr className={styles.divider} />

              {/* COMPARTMENTS */}
              <h6 className={styles.sectionTitle}>
                <i className="bi bi-box-seam"></i>
                Hộp chứa
              </h6>
              {compartments.map((c) => (
                <div key={c.id} className={styles.compartmentItem}>
                  <div className={styles.compartmentLabel}>{c.label}</div>
                  <button
                    className={c.state === "open" ? styles.btnDanger : styles.btnSuccess}
                    onClick={() => toggleCompartment(c.id)}
                  >
                    {c.state === "open" ? "Đóng" : "Mở"}
                  </button>
                </div>
              ))}

              <hr className={styles.divider} />

              {/* DESTINATIONS */}
              <h6 className={styles.sectionTitle}>
                <i className="bi bi-geo-alt-fill"></i>
                Điểm đến
              </h6>

              <select
                className={`${styles.formSelect} mb-2`}
                value={selectedDestination?.id || ""}
                onChange={handleSelectDestination}
              >
                <option value="">Chọn điểm đến...</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} (Map #{d.mapId})
                  </option>
                ))}
              </select>

              <button
                className={`${styles.btnTeal} mb-2`}
                onClick={startRunMap}
                disabled={!selectedDestination}
              >
                <i className="bi bi-play-circle me-1"></i>
                Bắt đầu chạy
              </button>

              <button
                className={styles.btnOutlinePrimary}
                onClick={sendRoute}
                disabled={!selectedDestination}
              >
                <i className="bi bi-send me-1"></i>
                Gửi vị trí đến
              </button>

              {selectedDestination && (
                <div className={styles.destinationInfo}>
                  <div>
                    <strong>Điểm:</strong> {selectedDestination.name}
                  </div>
                  <div>
                    <strong>Map:</strong> {selectedMapName}
                  </div>
                  <div>
                    <strong>Tọa độ:</strong> x: {selectedDestination.x.toFixed(2)}, y:{" "}
                    {selectedDestination.y.toFixed(2)}
                  </div>
                </div>
              )}

              <hr className={styles.divider} />

              {/* SAVE MAP */}
              <h6 className={styles.sectionTitle}>
                <i className="bi bi-save"></i>
                Lưu bản đồ
              </h6>
              <div className={styles.inputGroup}>
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

              <hr className={styles.divider} />

              {/* LOGS */}
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                  <i className="bi bi-journal-text"></i>
                  Nhật ký
                </h6>
                <button className={styles.btnOutlineDanger} onClick={() => setLogs([])}>
                  <i className="bi bi-trash"></i>
                </button>
              </div>

              <div className={styles.logsContainer}>
                {logs.length === 0 ? (
                  <div className={styles.logsEmpty}>
                    <i className="bi bi-inbox mb-2" style={{ fontSize: '1.5rem', display: 'block' }}></i>
                    Chưa có log
                  </div>
                ) : (
                  logs.slice(0, 20).map((l, i) => (
                    <div key={i} className={styles.logItem}>
                      <div className={styles.logTime}>{l.time}</div>
                      <div className={styles.logText}>{l.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* =================== RIGHT: MAIN AREA (No content - just popups) =================== */}
          <div className="col-lg-9">
            <div className={`${styles.glass} p-4`} style={{ minHeight: "calc(100vh - 100px)" }}>
              <div className="text-center py-5">
                <i className="bi bi-window-stack" style={{ fontSize: '4rem', color: 'var(--teal-dark)', opacity: 0.3 }}></i>
                <h5 className="mt-3 text-muted">Sử dụng các cửa sổ nổi để xem Camera và Bản đồ</h5>
                <p className="text-muted">Bạn có thể di chuyển, thay đổi kích thước và sắp xếp các cửa sổ theo ý muốn</p>
                <div className="mt-4">
                  <button className={styles.btnOutlinePrimary} onClick={() => openWindow("camera")}>
                    <i className="bi bi-camera-video me-2"></i>
                    Mở Camera
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================== POPUP WINDOWS =================== */}
      {windows.camera.isOpen && (
        <PopupWindow
          id="camera"
          title="Camera trực tiếp"
          icon="bi-camera-video"
          initialPosition={{ x: 400, y: 50 }}
          initialSize={{ width: 640, height: 480 }}
          minSize={{ width: 400, height: 300 }}
          onClose={closeWindow}
          onMinimize={minimizeWindow}
          isMinimized={windows.camera.isMinimized}
          zIndex={windows.camera.zIndex}
        >
          <div className={styles.videoContent}>
            {cameraFrame ? (
              <img src={cameraFrame} alt="Camera feed" />
            ) : (
              <div className={styles.videoPlaceholder}>
                <i className="bi bi-camera-video-off mb-2" style={{ fontSize: '2rem', display: 'block' }}></i>
                Đang chờ khung hình...
              </div>
            )}
          </div>
        </PopupWindow>
      )}

      {windows.navMap.isOpen && (
        <PopupWindow
          id="navMap"
          title="Bản đồ điểm đến"
          icon="bi-map-fill"
          initialPosition={{ x: 100, y: 50 }}
          initialSize={{ width: 700, height: 550 }}
          minSize={{ width: 500, height: 400 }}
          onClose={closeWindow}
          onMinimize={minimizeWindow}
          isMinimized={windows.navMap.isMinimized}
          zIndex={windows.navMap.zIndex}
        >
          <div className={styles.mapContent}>
            <div id="nav-map" style={{ width: "100%", height: "100%" }}></div>
          </div>
        </PopupWindow>
      )}

      {windows.liveMap.isOpen && (
        <PopupWindow
          id="liveMap"
          title="Bản đồ bệnh viện (Live)"
          icon="bi-broadcast"
          initialPosition={{ x: 820, y: 50 }}
          initialSize={{ width: 700, height: 550 }}
          minSize={{ width: 500, height: 400 }}
          onClose={closeWindow}
          onMinimize={minimizeWindow}
          isMinimized={windows.liveMap.isMinimized}
          zIndex={windows.liveMap.zIndex}
        >
          <div className={styles.mapContent}>
            <div id="live-map" style={{ width: "100%", height: "100%" }}></div>
          </div>
        </PopupWindow>
      )}

      {/* =================== TASKBAR =================== */}
      <div className={styles.taskbar}>
        <div
          className={`${styles.taskbarItem} ${
            windows.camera.isOpen && !windows.camera.isMinimized ? styles.active : ""
          }`}
          onClick={() =>
            windows.camera.isMinimized
              ? minimizeWindow("camera")
              : windows.camera.isOpen
              ? focusWindow("camera")
              : openWindow("camera")
          }
        >
          <i className="bi bi-camera-video"></i>
          <span>Camera</span>
        </div>

        <div
          className={`${styles.taskbarItem} ${
            windows.navMap.isOpen && !windows.navMap.isMinimized ? styles.active : ""
          }`}
          onClick={() =>
            windows.navMap.isMinimized
              ? minimizeWindow("navMap")
              : windows.navMap.isOpen
              ? focusWindow("navMap")
              : openWindow("navMap")
          }
        >
          <i className="bi bi-map-fill"></i>
          <span>Bản đồ đích</span>
        </div>

        <div
          className={`${styles.taskbarItem} ${
            windows.liveMap.isOpen && !windows.liveMap.isMinimized ? styles.active : ""
          }`}
          onClick={() =>
            windows.liveMap.isMinimized
              ? minimizeWindow("liveMap")
              : windows.liveMap.isOpen
              ? focusWindow("liveMap")
              : openWindow("liveMap")
          }
        >
          <i className="bi bi-broadcast"></i>
          <span>Live Map</span>
        </div>

        <div className="ms-auto">
          <span className={styles.statusBadge}>
            <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import PopupWindow from "@/components/PopupWindow";
import { usePopupWindows } from "@/hooks/usePopupWindows";
import styles from "@/assets/styles/robotLiveConsole.module.css";

export default function RobotCreateMap() {
  const mapRef = useRef(null);
  const mapLayer = useRef(null);
  const robotMarker = useRef(null);

  const { windows, openWindow, closeWindow, minimizeWindow, focusWindow } = usePopupWindows();

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
      html: `<div style="transform:rotate(${pos.theta}rad);font-size:15px;">🤖</div>`,
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
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/SendMode", {
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

      {windows.map.isOpen && (
        <PopupWindow
          id="map"
          title="Bản đồ bệnh viện"
          icon="bi-map"
          initialPosition={{ x: 400, y: 550 }}
          initialSize={{ width: 800, height: 600 }}
          minSize={{ width: 500, height: 400 }}
          onClose={closeWindow}
          onMinimize={minimizeWindow}
          isMinimized={windows.map.isMinimized}
          zIndex={windows.map.zIndex}
        >
          <div className={styles.mapContent}>
            <div id="map" style={{ width: "100%", height: "100%" }}></div>
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
            windows.map.isOpen && !windows.map.isMinimized ? styles.active : ""
          }`}
          onClick={() =>
            windows.map.isMinimized
              ? minimizeWindow("map")
              : windows.map.isOpen
              ? focusWindow("map")
              : openWindow("map")
          }
        >
          <i className="bi bi-map"></i>
          <span>Bản đồ</span>
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
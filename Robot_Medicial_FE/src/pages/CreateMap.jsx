import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import styles from "@/assets/styles/robotLiveConsole.module.css";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";

export default function RobotCreateMap() {
  const { toast, showToast } = useToast();
  const mapRef = useRef(null);
  const mapLayer = useRef(null);
  const robotMarker = useRef(null);
  const liveMapViewRef = useRef({ center: null, zoom: null });

  // ===================================
  // STATE
  // ===================================
  const [status, setStatus] = useState("🕓 Đang kết nối...");
  const [cameraFrame, setCameraFrame] = useState(null);
  const [mapName, setMapName] = useState("");
  const [logs, setLogs] = useState([]);
  const [activeKey, setActiveKey] = useState("");
  const [remoteMode, setRemoteMode] = useState(false);
  const [compartments, setCompartments] = useState([
    { id: 21, label: "Hộp 1", state: "closed" },
    { id: 22, label: "Hộp 2", state: "closed" },
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

    posConn.on("ReceiveMapUpdate", (map) => {
      console.log("[CreateMap] ReceiveMapUpdate", map);
      drawMap(map);
    });

    posConn.on("ReceivePosition", (pos) => {
      // console.log("[CreateMap] ReceivePosition", pos);
      updateRobotPosition(pos);
    });

    camConn.on("ReceiveCameraFrame", (frame) => {
      if (frame?.image_b64) {
        setCameraFrame(`data:image/jpeg;base64,${frame.image_b64}`);
      }
    });

    posConn
      .start()
      .then(() => setStatus("Đã kết nối robot"))
      .catch((e) => {
        console.error("Position Hub lỗi:", e);
        setStatus("Không kết nối được robot");
      });

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

    const base64 =
      mapData?.Data_b64 || mapData?.data_b64 || mapData?.data || null;
    if (!base64) {
      console.warn("[CreateMap] Không có Data_b64 trong mapData");
      return;
    }

    const res = mapData.Resolution || mapData.resolution || 0.05;
    const w = mapData.Width || mapData.width || 800;
    const h = mapData.Height || mapData.height || 800;
    const ox = mapData.Origin?.X ?? mapData.origin?.x ?? 0;
    const oy = mapData.Origin?.Y ?? mapData.origin?.y ?? 0;

    const imgSrc = `data:image/png;base64,${base64}`;

    // bounds của overlay (CRS.Simple -> [lat, lng] = [y, x])
    const bounds = [
      [oy, ox],
      [oy + h * res, ox + w * res],
    ];

    // =============== LẦN ĐẦU TẠO MAP ===============
    if (!mapRef.current) {
      mapRef.current = L.map("map", {
        crs: L.CRS.Simple,
        zoomControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

      // Lúc user pan/zoom thì lưu lại view
      mapRef.current.on("moveend zoomend", () => {
        if (!mapRef.current) return;
        liveMapViewRef.current = {
          center: mapRef.current.getCenter(),
          zoom: mapRef.current.getZoom(),
        };
      });

      // Overlay lần đầu + fitBounds 1 lần
      if (mapLayer.current) {
        mapRef.current.removeLayer(mapLayer.current);
      }
      mapLayer.current = L.imageOverlay(imgSrc, bounds, { opacity: 1 }).addTo(
        mapRef.current
      );

      mapRef.current.fitBounds(bounds);

      // Lưu lại view sau khi fitBounds
      liveMapViewRef.current = {
        center: mapRef.current.getCenter(),
        zoom: mapRef.current.getZoom(),
      };

      // Fix bug container chưa có size
      setTimeout(() => {
        mapRef.current && mapRef.current.invalidateSize();
      }, 100);

      return;
    }

    // =============== CÁC LẦN UPDATE SAU ===============
    // Lấy lại view đã lưu (nếu có), fallback sang view hiện tại
    const currentCenter =
      liveMapViewRef.current.center || mapRef.current.getCenter();
    const currentZoom =
      typeof liveMapViewRef.current.zoom === "number"
        ? liveMapViewRef.current.zoom
        : mapRef.current.getZoom();

    // Thay overlay nhưng KHÔNG fitBounds lại
    if (mapLayer.current) {
      mapRef.current.removeLayer(mapLayer.current);
    }
    mapLayer.current = L.imageOverlay(imgSrc, bounds, { opacity: 1 }).addTo(
      mapRef.current
    );

    // Restore lại đúng center + zoom cũ
    mapRef.current.setView(currentCenter, currentZoom, { animate: false });
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

    // ROS: x,y theo world coords (mét) → dùng trực tiếp
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
        {
          time: new Date().toLocaleTimeString(),
          text: `Điều khiển: ${key}`,
          level: "ok",
        },
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
    if (!mapName.trim()) {
      showToast("warning", "Nhập tên bản đồ!");
      return;
    }
    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/SendMode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Mode: "save_map", MapName: mapName }),
      });
      setLogs((l) => [
        {
          time: new Date().toLocaleTimeString(),
          text: `Lưu bản đồ: ${mapName}`,
          level: "ok",
        },
        ...l,
      ]);
      setMapName("");
      showToast("success", "Đã gửi lệnh lưu bản đồ!");
    } catch (err) {
      showToast("error", err.message || "Không thể lưu bản đồ!");
    }
  }

  // ===================================
  // UI
  // ===================================
  return (
    <div className={styles.page}>
      <div className="container-xxl py-3">
        <div className="row g-3" style={{ height: "calc(100vh - 2rem)" }}>
          {/* =================== LEFT: CONTROLS =================== */}
          <div className="col-lg-3 col-xl-2">
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
                    <i
                      className={`bi ${
                        remoteMode ? "bi-stop-circle" : "bi-controller"
                      } me-1`}
                    ></i>
                    {remoteMode ? "Tắt lái từ xa" : "Lái từ xa"}
                  </button>

                  {remoteMode && (
                    <>
                      <div className={styles.pad}>
                        <div></div>
                        <div
                          className={`${styles.key} ${
                            activeKey === "w" ? styles.keyActive : ""
                          }`}
                          onClick={() => sendCommand("w")}
                        >
                          W
                        </div>
                        <div></div>
                        <div
                          className={`${styles.key} ${
                            activeKey === "a" ? styles.keyActive : ""
                          }`}
                          onClick={() => sendCommand("a")}
                        >
                          A
                        </div>
                        <div
                          className={`${styles.key} ${
                            activeKey === "s" ? styles.keyActive : ""
                          }`}
                          onClick={() => sendCommand("s")}
                        >
                          S
                        </div>
                        <div
                          className={`${styles.key} ${
                            activeKey === "d" ? styles.keyActive : ""
                          }`}
                          onClick={() => sendCommand("d")}
                        >
                          D
                        </div>
                      </div>
                      <div className="d-flex justify-content-center">
                        <div
                          className={`${styles.key} ${
                            activeKey === "x" ? styles.keyActive : ""
                          }`}
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
                        <span className={styles.compartmentLabel}>
                          {c.label}
                        </span>
                        <button
                          className={
                            c.state === "open"
                              ? styles.btnDanger
                              : styles.btnSuccess
                          }
                          onClick={() => toggleCompartment(c.id)}
                        >
                          {c.state === "open" ? "Đóng" : "Mở"}
                        </button>
                      </div>
                    ))}
                  </div>
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
            </div>
          </div>

          {/* =================== RIGHT: CAMERA + MAP =================== */}
          <div className="col-lg-9 col-xl-10">
            <div className={styles.mainContent}>
              {/* Camera Section */}
              <div className={`${styles.glass} p-3`}>
                <div className={styles.headerBar}>
                  <div className={styles.sectionTitle}>
                    <i className="bi bi-camera-video-fill"></i>
                    Camera Trực Tiếp
                  </div>
                  <span
                    className={
                      status.includes("kết nối")
                        ? styles.statusBadgeSuccess
                        : styles.statusBadge
                    }
                  >
                    {status}
                  </span>
                </div>
                <div className={styles.cameraBox}>
                  {cameraFrame ? (
                    <img src={cameraFrame} alt="Camera feed" />
                  ) : (
                    <span className={styles.cameraPlaceholder}>
                      <i
                        className="bi bi-camera-video"
                        style={{
                          fontSize: "2rem",
                          display: "block",
                          marginBottom: "0.5rem",
                        }}
                      ></i>
                      Đang chờ khung hình...
                    </span>
                  )}
                </div>
              </div>

              {/* Map Section */}
              <div
                className={`${styles.glass} p-3 flex-grow-1 d-flex flex-column`}
              >
                <div className={styles.headerBar}>
                  <div className={styles.sectionTitle}>
                    <i className="bi bi-map-fill"></i>
                    Bản đồ bệnh viện (Mapping)
                  </div>
                  <div
                    className={styles.inputGroup}
                    style={{ maxWidth: "300px" }}
                  >
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
                <div className={styles.mapBox}>
                  <div
                    id="map"
                    style={{ width: "100%", height: "350px" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toast toast={toast} showToast={showToast} />
    </div>
  );
}

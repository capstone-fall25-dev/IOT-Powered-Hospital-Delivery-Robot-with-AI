import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
export default function RobotLiveConsole() {
  const mapRef = useRef(null);
  const mapLayer = useRef(null);
  const robotMarker = useRef(null);
  const destinationMarker = useRef(null);

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
  const [currentMapInfo, setCurrentMapInfo] = useState(null);

  // ===================================
  // 🧭 LOAD CSS & JS
  // ===================================
  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
    document.head.appendChild(css);

    const icons = document.createElement("link");
    icons.rel = "stylesheet";
    icons.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css";
    document.head.appendChild(icons);

    const leafletCss = document.createElement("link");
    leafletCss.rel = "stylesheet";
    leafletCss.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(leafletCss);

    const leafletJs = document.createElement("script");
    leafletJs.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    leafletJs.defer = true;
    document.body.appendChild(leafletJs);

    return () => {
      document.head.removeChild(css);
      document.head.removeChild(icons);
      document.head.removeChild(leafletCss);
      document.body.removeChild(leafletJs);
    };
  }, []);

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

    posConn.on("ReceiveMapUpdate", (map) => drawMap(map));
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

  // ============================================================
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  // 1) FIXED RENDER MAP — giống y trang ProjectMapListView
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  // ============================================================
  function drawMap(mapData) {
    if (!window.L) return;
    const L = window.L;

    const base64 = mapData?.Data_b64 || mapData?.data_b64 || mapData?.data;
    if (!base64) return;

    const resolution = mapData.Resolution || mapData.resolution;
    const originX = mapData.Origin?.X ?? mapData.origin?.x ?? 0;
    const originY = mapData.Origin?.Y ?? mapData.origin?.y ?? 0;
    const width = mapData.Width || mapData.width;
    const height = mapData.Height || mapData.height;

    setCurrentMapInfo({ originX, originY, resolution, width, height });

    const widthMeters = width * resolution;
    const heightMeters = height * resolution;

    const imgSrc = `data:image/png;base64,${base64}`;

    const bounds = L.latLngBounds(
      L.latLng(0, 0),
      L.latLng(heightMeters, widthMeters)
    );

    if (!mapRef.current) {
      mapRef.current = L.map("map", { crs: L.CRS.Simple });
      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
    }

    if (mapLayer.current) mapRef.current.removeLayer(mapLayer.current);
    mapLayer.current = L.imageOverlay(imgSrc, bounds).addTo(mapRef.current);

    mapRef.current.fitBounds(bounds);
  }

  // ============================================================
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  // 2) FIXED ROBOT POSITION (convert world → local)
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  // ============================================================
  function updateRobotPosition(pos) {
    if (!window.L || !mapRef.current || !currentMapInfo) return;

    const L = window.L;
    const { originX, originY } = currentMapInfo;

    const localX = pos.x - originX;
    const localY = pos.y - originY;

    const latlng = [localY, localX];

    const icon = L.divIcon({
      html: `<div style="transform:rotate(${pos.theta}rad);font-size:22px;">🤖</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (!robotMarker.current)
      robotMarker.current = L.marker(latlng, { icon }).addTo(mapRef.current);
    else {
      robotMarker.current.setLatLng(latlng);
      robotMarker.current.setIcon(icon);
    }
  }

  // ============================================================
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  // 3) FIXED LOAD NAVIGATION MAP + DESTINATION MARKER
  // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  // ============================================================
  async function loadNavigationMapForDestination(destination) {
    if (!destination) return;

    const L = window.L;

   const metaRes = await fetch(
      API_CONFIG.API_BASE1 + `/api/MapsUpload/${destination.mapId}`
    );

    const meta = await metaRes.json();

    const resolution = meta.resolution;
    const originX = meta.originX;
    const originY = meta.originY;

    setCurrentMapInfo({ originX, originY, resolution });
    setSelectedMapName(meta.mapName);

    
    const imgUrl =
      API_CONFIG.API_BASE1 + `/api/MapsUpload/${destination.mapId}/image`;

    const img = new Image();
    img.src = imgUrl;

    img.onload = () => {
      const widthMeters = img.width * resolution;
      const heightMeters = img.height * resolution;

      const bounds = L.latLngBounds(
        L.latLng(0, 0),
        L.latLng(heightMeters, widthMeters)
      );

      if (!mapRef.current) {
        mapRef.current = L.map("map", { crs: L.CRS.Simple });
        L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
      }

      if (mapLayer.current) mapRef.current.removeLayer(mapLayer.current);
      mapLayer.current = L.imageOverlay(imgUrl, bounds).addTo(mapRef.current);
      mapRef.current.fitBounds(bounds);

      // convert world (/map) -> local image coords
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
        destinationMarker.current = L.marker(latlng, { icon }).addTo(mapRef.current);
    };
  }

  // ===================================
  // REST CODE (GIỮ NGUYÊN 100%)
  // ===================================

  async function sendCommand(key) {
    try {
       await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/control",{
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
    } catch (err) {}
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
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotCompartmentSignal/signal",{
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
  // UI (GIỮ NGUYÊN)
  // ===================================
  return (
    <div className="page">
      <style>{`
        :root{--teal:#4CE1C6;--ink:#0f172a}
        .page{font-family:Inter,system-ui;background:linear-gradient(180deg,#f6faf9,#e8f0ee);min-height:100vh}
        .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-radius:18px;box-shadow:0 16px 48px rgba(15,23,42,.08)}
        .key{height:56px;width:56px;border:1px solid rgba(0,0,0,.15);border-radius:12px;display:grid;place-items:center;font-weight:700;cursor:pointer;}
        .key.active{background:var(--teal)}
        .pad{display:grid;grid-template-columns:repeat(3,56px);gap:8px;justify-content:center}
        .map-box,.video-box{height:260px;border-radius:14px;background:#eaf7f4;display:grid;place-items:center}
        .btn-teal{background:var(--teal)}
      `}</style>

      <div className="container-xxl py-3">
        <div className="row g-3">

          {/* LEFT CONTROL */}
          <div className="col-lg-3">
            <div className="glass p-3 h-100">
              <h6 className="fw-bold mb-3">⚙ Điều khiển</h6>

              <button
                className="btn btn-primary w-100 rounded-pill mb-3"
                onClick={() => setRemoteMode(!remoteMode)}
              >
                {remoteMode ? "Tắt Lái từ xa" : "Lái từ xa"}
              </button>

              {remoteMode && (
                <>
                  <div className="pad mb-2">
                    <div></div>
                    <div className={`key ${activeKey==="w"?"active":""}`} onClick={()=>sendCommand("w")}>W</div>
                    <div></div>

                    <div className={`key ${activeKey==="a"?"active":""}`} onClick={()=>sendCommand("a")}>A</div>
                    <div className={`key ${activeKey==="s"?"active":""}`} onClick={()=>sendCommand("s")}>S</div>
                    <div className={`key ${activeKey==="d"?"active":""}`} onClick={()=>sendCommand("d")}>D</div>
                  </div>

                  <div className="d-flex justify-content-center">
                    <div className={`key ${activeKey==="x"?"active":""}`} onClick={()=>sendCommand("x")}>X</div>
                  </div>
                </>
              )}

              <h6 className="fw-bold mt-3 mb-2">📦 Hộp chứa</h6>
              {compartments.map((c)=>(
                <div key={c.id} className="d-flex justify-content-between mb-2">
                  <span>{c.label}</span>
                  <button
                    className={`btn btn-sm ${c.state==="open"?"btn-danger":"btn-success"}`}
                    onClick={()=>toggleCompartment(c.id)}
                  >
                    {c.state==="open"?"Đóng":"Mở"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER CAM + MAP */}
          <div className="col-lg-6">
            <div className="glass p-3 mb-3">
              <div className="d-flex justify-content-between mb-2">
                <div>🎥 Camera</div>
                <span className="badge bg-info text-dark">{status}</span>
              </div>

              <div className="video-box">
                {cameraFrame ? (
                  <img src={cameraFrame} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                ) : "Đang chờ khung hình..."}
              </div>
            </div>

            <div className="glass p-3">
              <div className="d-flex justify-content-between mb-2">
                <div>🗺️ Bản đồ</div>
                <div className="input-group input-group-sm" style={{maxWidth:"60%"}}>
                  <input className="form-control" placeholder="Tên map" value={mapName} onChange={(e)=>setMapName(e.target.value)} />
                  <button className="btn btn-success" onClick={saveMap}>💾</button>
                </div>
              </div>

              <div id="map" className="map-box"></div>
            </div>
          </div>

          {/* RIGHT DEST + LOGS */}
          <div className="col-lg-3">
            <div className="glass p-3 h-100">
              <h6 className="fw-bold mb-2">📍 Điểm đến</h6>

              <select
                className="form-select form-select-sm mb-2"
                value={selectedDestination?.id || ""}
                onChange={handleSelectDestination}
              >
                <option value="">Chọn điểm...</option>
                {destinations.map((d)=>(
                  <option key={d.id} value={d.id}>
                    {d.name} (map {d.mapId})
                  </option>
                ))}
              </select>

              <button className="btn btn-sm btn-teal w-100 mb-2" onClick={startRunMap} disabled={!selectedDestination}>
                🚀 Bắt đầu chạy bản đồ 
              </button>

              <button className="btn btn-sm btn-outline-primary w-100 mb-3" onClick={sendRoute} disabled={!selectedDestination}>
                📤 Gửi Vị trí muốn đến
              </button>

              {selectedDestination && (
                <div className="small text-muted mb-3">
                  Điểm: <b>{selectedDestination.name}</b><br/>
                  Map: <b>{selectedMapName}</b><br/>
                  ROS x:{selectedDestination.x.toFixed(2)} — y:{selectedDestination.y.toFixed(2)}
                </div>
              )}

              <hr/>

              <h6 className="fw-bold mb-2">📜 Logs</h6>
              <button className="btn btn-sm btn-outline-danger mb-2" onClick={()=>setLogs([])}>
                Xóa
              </button>

              <ul className="list-group list-group-flush" style={{maxHeight:280,overflowY:"auto"}}>
                {logs.length===0 ? (
                  <li className="list-group-item text-center text-muted">Chưa có log.</li>
                ) : (
                  logs.map((l,i)=>(
                    <li key={i} className="list-group-item small">
                      <div className="text-muted">{l.time}</div>
                      {l.text}
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

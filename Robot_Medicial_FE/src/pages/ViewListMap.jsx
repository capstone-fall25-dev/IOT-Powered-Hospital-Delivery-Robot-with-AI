import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API_CONFIG } from "@/utils/apiConfig";

export default function ProjectMapListView() {
  const mapRef = useRef(null);
  const worldPosRef = useRef(null); // 🔹 Lưu toạ độ /map đã chọn
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [mapInfo, setMapInfo] = useState(null);

  const [isSelecting, setIsSelecting] = useState(false);
  const [newMarker, setNewMarker] = useState(null);
  const [pointName, setPointName] = useState("");

  const navigate = useNavigate();

  // ==========================================================
  // 🎨 CSS Glass UI
  // ==========================================================
  const styles = (
    <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(1200px 600px at 15% 10%,rgba(76,225,198,.18),transparent 60%),radial-gradient(900px 500px at 90% 5%,rgba(76,225,198,.12),transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 15%,#e9f3f1 35%,#e8f0ee 100%);min-height:100vh}
      .glass{background:rgba(255,255,255,.58);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.7);box-shadow:0 10px 30px rgba(15,23,42,.08);border-radius:24px}
      .btn-teal{background:var(--teal);color:#052a2b;font-weight:700;border:none}
      .btn-teal:hover{background:#39d7bf;color:#052a2b}
      .list-active{background:rgba(76,225,198,.2);border-color:rgba(76,225,198,.35)}
      .map-toolbar{position:absolute;right:16px;top:16px;z-index:9999;width:260px}
      .map-toolbar .btn{box-shadow:0 6px 16px rgba(15,23,42,.12)}

      #coordinates{
        position:absolute;
        left:18px;
        bottom:18px;
        z-index:9999;
        padding:6px 10px;
        background:rgba(15,23,42,0.8);
        color:#e5f7f3;
        border-radius:999px;
        font-size:12px;
        display:none;
        pointer-events:none;
        box-shadow:0 8px 20px rgba(15,23,42,.35);
      }

      .btn-outline-teal { 
      color: var(--teal); 
      border-color: rgba(76,225,198,.3) !important; 
      transition: all 0.2s ease-in-out;
    }
    .btn-outline-teal:hover { 
      background: rgba(76,225,198,.1) !important; 
      color: #052a2b !important; 
      border-color: var(--teal) !important;
      transform: translateY(-1px); /* Nâng nhẹ khi hover */
      box-shadow: 0 4px 12px rgba(76,225,198,.2) !important;
    }
    .btn-outline-teal:active { 
      transform: translateY(0); /* Trở về khi click */
    }
    `}</style>
  );

  // ==========================================================
  // 1️⃣ Load danh sách bản đồ từ API
  // ==========================================================
  useEffect(() => {
    async function fetchMaps() {
      try {
        const res = await fetch(API_CONFIG.API_BASE1 + "/api/Maps");
        const data = await res.json();
        setMaps(data);
        if (data.length > 0) setSelectedMap(data[0]);
      } catch (err) {
        console.error("❌ Lỗi tải bản đồ:", err);
      }
    }
    fetchMaps();
  }, []);

  // ==========================================================
  // 2️⃣ Load YAML info (resolution, originX, originY, …)
  // ==========================================================
  useEffect(() => {
    async function fetchMapInfo() {
      if (!selectedMap) return;
      try {
         const res = await fetch(
          API_CONFIG.API_BASE1 + `/api/MapsUpload/${selectedMap.id}`
        );
        const data = await res.json();
        console.log("ℹ️ mapInfo từ API:", data); // 🔎 check origin/resolution
        setMapInfo(data);
      } catch (err) {
        console.error("❌ Lỗi metadata:", err);
      }
    }
    fetchMapInfo();
  }, [selectedMap]);

  // =====================================================================
  // 3️⃣ Render map + logic load map & chọn điểm
  // =====================================================================
  useEffect(() => {
    if (!mapInfo || !selectedMap) return;

    // Dọn map cũ
    if (mapRef.current) {
      mapRef.current.off();
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map("map", {
      crs: L.CRS.Simple,
      minZoom: -5,
      maxZoom: 10,
      zoomControl: false,
    });

   const imageUrl = API_CONFIG.API_BASE1 + `/api/MapsUpload/${selectedMap.id}/image`;

    const res = mapInfo.resolution;
    const originX = mapInfo.originX;
    const originY = mapInfo.originY;

    console.log("🧾 Map params:", { res, originX, originY });

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const pixelWidth = img.width;
      const pixelHeight = img.height;

      const widthMeters = pixelWidth * res;
      const heightMeters = pixelHeight * res;

      // Ảnh chạy trong hệ local: (0,0) -> (heightMeters, widthMeters)
      const southWest = L.latLng(0, 0);
      const northEast = L.latLng(heightMeters, widthMeters);
      const imageBounds = L.latLngBounds(southWest, northEast);

      L.imageOverlay(imageUrl, imageBounds).addTo(map);
      map.fitBounds(imageBounds);

      L.control.zoom({ position: "bottomright" }).addTo(map);
    };

    // ==========================================================
    // 🔁 Chuyển mouse event -> toạ độ /map
    // ==========================================================
  function screenToWorld(e) {
  const containerPoint = map.mouseEventToContainerPoint(e);
  const latlng = map.containerPointToLatLng(containerPoint);
  if (!latlng || !mapInfo) return null;

  const res = mapInfo.resolution;
  const originX = mapInfo.originX;
  const originY = mapInfo.originY;

  // local trong ảnh (m)
  const localX = latlng.lng;
  const localY = latlng.lat;

  // 🎯 Offset hiệu chỉnh (từ dữ liệu bạn gửi)
  // const offsetX = 1.8200597426258849; // ~1.82 m
  // const offsetY = 0.7597526087366795; // ~0.76 m
    const offsetX = 0;
    const offsetY = 0;
  // Global trong frame /map (m) giống ROS:
  const worldX = originX + localX + offsetX;
  const worldY = originY + localY + offsetY;

  return { x: worldX, y: worldY, localX, localY };
}

    function updateCoordinateDisplay(e) {
      const div = document.getElementById("coordinates");
      if (!div) return;

      const world = screenToWorld(e);
      if (!world) {
        div.style.display = "none";
        return;
      }

      div.style.display = "inline-flex";
      div.textContent = `World: (${world.x.toFixed(2)}m, ${world.y.toFixed(
        2
      )}m)`;
    }

    function isClick(mouseDownTime, hasMouseMoved) {
      if (!mouseDownTime) return false;
      const clickDuration = Date.now() - mouseDownTime;
      return !hasMouseMoved && clickDuration < 300;
    }

    // ============================
    // 🎯 Thuật toán chọn điểm
    // ============================
    let mouseDownTime = 0;
    let hasMouseMoved = false;
    let lastX = 0;
    let lastY = 0;
    const dragThreshold = 3;

    let currentMarker = null;

    const container = map.getContainer();

    const handleMouseDown = (e) => {
      mouseDownTime = Date.now();
      hasMouseMoved = false;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const handleMouseMove = (e) => {
      if (mouseDownTime > 0) {
        const dx = Math.abs(e.clientX - lastX);
        const dy = Math.abs(e.clientY - lastY);
        if (dx > dragThreshold || dy > dragThreshold) {
          hasMouseMoved = true;
        }
      }
      lastX = e.clientX;
      lastY = e.clientY;

      updateCoordinateDisplay(e);
    };

    const handleMouseUp = (e) => {
      const clicked = isClick(mouseDownTime, hasMouseMoved);

      if (clicked && isSelecting) {
        const world = screenToWorld(e);
        if (!world) {
          console.warn("⚠️ Click ngoài vùng map");
        } else {
          if (currentMarker) {
            map.removeLayer(currentMarker);
          }

          // Marker vẽ theo local (lat = localY, lng = localX)
          const marker = L.marker([world.localY, world.localX]).addTo(map);
          currentMarker = marker;

          setNewMarker(marker);
          worldPosRef.current = { x: world.x, y: world.y }; // 🔹 lưu /map vào ref

          console.log(
            "📍 Chọn world coordinate (ROS /map):",
            world.x,
            world.y,
            "| local:",
            world.localX,
            world.localY
          );
        }
      }

      mouseDownTime = 0;
      hasMouseMoved = false;
    };

    const handleMouseLeave = () => {
      const div = document.getElementById("coordinates");
      if (div) div.style.display = "none";
      mouseDownTime = 0;
      hasMouseMoved = false;
    };

    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseLeave);

    mapRef.current = map;

    // Cleanup
    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseLeave);

      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapInfo, selectedMap, isSelecting]);

  // ==========================================================
  // 4️⃣ Toggle chế độ chọn điểm
  // ==========================================================
  function handleSelectPointMode() {
    const next = !isSelecting;
    setIsSelecting(next);

    if (next) {
      alert("🖱️ Chế độ chọn tọa độ đang bật — Click lên bản đồ để chọn điểm đến!");
    } else {
      alert("❌ Đã tắt chế độ chọn tọa độ");
    }
  }

  // ==========================================================
  // 5️⃣ Lưu điểm đến vào DB
  // ==========================================================
  async function handleSavePoint() {
    const world = worldPosRef.current;

    if (!selectedMap || !newMarker || !pointName.trim() || !world) {
      alert("⚠️ Nhập tên điểm và click chọn vị trí trên bản đồ!");
      return;
    }

    const payload = {
      name: pointName,
      mapId: selectedMap.id,
      x: world.x, // toạ độ /map
      y: world.y,
    };

    try {
      const res = await fetch( API_CONFIG.API_BASE1 + "/api/Destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Không lưu được điểm!");

      alert(
        `✅ Đã lưu "${pointName}" tại (map.x=${world.x.toFixed(
          2
        )}, map.y=${world.y.toFixed(2)})`
      );

      setPointName("");
      setIsSelecting(false);

      if (mapRef.current && newMarker) {
        mapRef.current.removeLayer(newMarker);
        setNewMarker(null);
        worldPosRef.current = null;
      }
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    }
  }

  // ==========================================================
  // 🧩 Gửi lệnh mapping
  // ==========================================================
  async function handleCreateMap() {
    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/SendMode",{
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "mapping" }),
      });

      alert("🚀 Robot bắt đầu mapping!");
      navigate("/create-map");
    } catch (err) {
      alert("❌ Lỗi mapping: " + err.message);
    }
  }

  // ==========================================================
  // 6️⃣ UI
  // ==========================================================
  return (
    <div className="page">
      {styles}

      <div className="container-fluid py-3 py-lg-4">
        <div className="container-lg">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
            <div>
              <h2 className="fw-bold mb-0">🗺️ Quản lý bản đồ ROS2</h2>
              <div className="chip mt-2">Hiển thị bản đồ và thêm điểm đến</div>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-teal" onClick={handleSelectPointMode}>
                <i className="bi bi-geo-alt me-1"></i>
                {isSelecting ? "Đang chọn điểm..." : "Chọn điểm đến"}
              </button>

              <button className="btn btn-teal" onClick={handleCreateMap}>
                <i className="bi bi-plus-circle me-1"></i> Tạo bản đồ mới
              </button>
            </div>
          </div>
        </div>

        <div className="container-fluid">
          <div className="row g-3">
            {/* Sidebar */}
            <div className="col-lg-4 col-xl-3">
              <div
                className="glass p-3 rounded-3 h-100"
                style={{ maxHeight: "78vh", overflowY: "auto" }}
              >
                <ul className="list-group list-group-flush">
                  {maps.map((m) => (
                    <li
                      key={m.id}
                      className={`list-group-item list-group-item-action px-3 py-3 mb-2 rounded-2 border-0 shadow-sm transition-all ${
                        selectedMap?.id === m.id ? "list-active bg-teal-soft shadow-md" : "hover-bg-light"
                      }`}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedMap(m)}
                    >
                      <div className="d-flex flex-column gap-2">
                        {/* Header: Icon + Title */}
                        <div className="d-flex align-items-center gap-3">
                          <div className="flex-shrink-0">
                            <i className={`bi bi-map text-teal fs-3 opacity-75`}></i>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="fw-bold mb-0 text-truncate" style={{ fontSize: "1.1em" }}>
                              {m.nameMapFE || m.mapName}
                            </h6>
                          </div>
                        </div>
                        
                        {/* Footer: ROS Label + Detail Button */}
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                          <small className="map-name-ros text-muted flex-grow-1">
                            <i className="bi bi-robot me-1"></i>
                            ROS: {m.mapName}
                          </small>
                          <button
                            className="btn btn-sm btn-outline-teal border-0 px-3 py-1 rounded-pill shadow-sm ms-auto"
                            onClick={(e) => {
                              e.stopPropagation(); // Ngăn click item
                              navigate(`/maps/${m.id}`); // Route detail, điều chỉnh nếu cần
                            }}
                            title="Xem chi tiết bản đồ"
                          >
                            <i className="bi bi-eye me-1"></i> Chi tiết
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Map */}
            <div className="col-lg-8 col-xl-9 position-relative">
              <div
                id="map"
                style={{
                  height: "78vh",
                  minHeight: 480,
                  background: "#e2f4f0",
                  borderRadius: "24px",
                  position: "relative",
                  overflow: "hidden",
                }}
              />

              <div id="coordinates">World: (...)</div>

              {isSelecting && (
                <div className="map-toolbar glass p-3 rounded-3">
                  <div className="fw-semibold mb-2">🧭 Thêm điểm đến</div>

                  <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Nhập tên điểm..."
                    value={pointName}
                    onChange={(e) => setPointName(e.target.value)}
                  />

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-teal w-100"
                      onClick={handleSavePoint}
                    >
                      <i className="bi bi-save me-1"></i> Lưu
                    </button>

                    <button
                      className="btn btn-sm btn-outline-danger w-100"
                      onClick={() => {
                        if (newMarker && mapRef.current) {
                          mapRef.current.removeLayer(newMarker);
                        }
                        setNewMarker(null);
                        worldPosRef.current = null;
                        setIsSelecting(false);
                      }}
                    >
                      <i className="bi bi-x-circle"></i> Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function ProjectMapListView() {
  const mapRef = useRef(null);
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [mapInfo, setMapInfo] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false); // ✅ Chế độ chọn điểm
  const [newMarker, setNewMarker] = useState(null); // 📍 Marker tạm
  const [pointName, setPointName] = useState(""); // 🏷️ Tên điểm đến
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
      .map-toolbar{position:absolute;right:16px;top:16px;z-index:9999;width:240px}
      .map-toolbar .btn{box-shadow:0 6px 16px rgba(15,23,42,.12)}
    `}</style>
  );

  // ==========================================================
  // 1️⃣ Lấy danh sách bản đồ từ API /api/Maps
  // ==========================================================
  useEffect(() => {
    async function fetchMaps() {
      try {
        const res = await fetch("http://localhost:5170/api/Maps");
        if (!res.ok) throw new Error("Không tải được danh sách bản đồ");
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
  // 2️⃣ Lấy metadata bản đồ
  // ==========================================================
  useEffect(() => {
    async function fetchMapInfo() {
      if (!selectedMap) return;
      try {
        const res = await fetch(`http://localhost:5170/api/MapsUpload/${selectedMap.id}`);
        if (!res.ok) throw new Error("Không tải được metadata bản đồ");
        const data = await res.json();
        setMapInfo(data);
      } catch (err) {
        console.error("❌ Lỗi metadata:", err);
      }
    }
    fetchMapInfo();
  }, [selectedMap]);

  // ==========================================================
  // 3️⃣ Hiển thị bản đồ
  // ==========================================================
  useEffect(() => {
    if (!mapInfo || !selectedMap) return;

    // Xóa map cũ (nếu có)
    if (mapRef.current) {
      mapRef.current.off();
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Tạo bản đồ mới
    const map = L.map("map", {
      crs: L.CRS.Simple,
      minZoom: -5,
      maxZoom: 5,
      zoomControl: false,
    });

    const imageUrl = `http://localhost:5170/api/MapsUpload/${selectedMap.id}/image`;
    const res = mapInfo.resolution || 0.05;
    const width = mapInfo.width || 800;
    const height = mapInfo.height || 800;
    const originX = mapInfo.originX || 0;
    const originY = mapInfo.originY || 0;

    const imageBounds = [
      [originY + height * res, originX + width * res],
      [originY, originX],
    ];

    L.imageOverlay(imageUrl, imageBounds).addTo(map);
    map.fitBounds(imageBounds);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // 📍 Sự kiện click chọn điểm
    map.on("click", (e) => {
      console.log("🖱️ Click map:", e.latlng, "isSelecting:", isSelecting);
      if (!isSelecting) return;

      // Xóa marker cũ nếu có
      if (newMarker) {
        map.removeLayer(newMarker);
      }

      const marker = L.marker(e.latlng, { title: "Điểm mới" }).addTo(map);
      setNewMarker(marker);
      console.log("📍 Đã chọn:", e.latlng);
    });

    mapRef.current = map;
  }, [mapInfo, isSelecting]);

  // ==========================================================
  // 4️⃣ Bật chế độ chọn điểm
  // ==========================================================
  function handleSelectPointMode() {
    setIsSelecting(!isSelecting);
    if (!isSelecting) alert("🖱️ Click lên bản đồ để chọn điểm đến!");
  }

  // ==========================================================
  // 5️⃣ Lưu điểm đến vào DB
  // ==========================================================
  async function handleSavePoint() {
    if (!selectedMap || !newMarker || !pointName.trim()) {
      alert("⚠️ Vui lòng nhập tên điểm và chọn vị trí trên bản đồ!");
      return;
    }

    const latlng = newMarker.getLatLng();
    const payload = {
      name: pointName.trim(),
      mapId: selectedMap.id,
      x: latlng.lng,
      y: latlng.lat,
    };

    try {
      const res = await fetch("http://localhost:5170/api/Destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Không thể lưu điểm đến!");
      alert(`✅ Đã lưu điểm đến "${pointName}"`);
      setPointName("");
      setIsSelecting(false);
      if (mapRef.current && newMarker) {
        mapRef.current.removeLayer(newMarker);
        setNewMarker(null);
      }
    } catch (err) {
      alert("❌ Lỗi lưu điểm: " + err.message);
    }
  }

  // ==========================================================
  // 🧩 Gửi lệnh mapping + chuyển sang CreateMap
  // ==========================================================
  async function handleCreateMap() {
    try {
      const res = await fetch("http://localhost:5170/api/RobotMode/SendMode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "mapping" }),
      });

      if (!res.ok) throw new Error("Không thể gửi lệnh mapping");
      alert("🚀 Robot bắt đầu mapping!");
      navigate("/create-map");
    } catch (err) {
      alert("❌ Lỗi mapping: " + err.message);
    }
  }

  // ==========================================================
  // 6️⃣ Giao diện
  // ==========================================================
  return (
    <div className="page">
      {styles}
      <div className="container-fluid py-3 py-lg-4">
        <div className="container-lg">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
            <div>
              <h2 className="mb-0 fw-bold">🗺️ Quản lý bản đồ ROS2</h2>
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
            {/* Sidebar danh sách map */}
            <div className="col-lg-4 col-xl-3">
              <div className="glass p-2 rounded-2xl h-100" style={{ maxHeight: "78vh", overflowY: "auto" }}>
                <ul className="list-group list-group-flush">
                  {maps.map((m) => (
                    <li
                      key={m.id}
                      className={`list-group-item d-flex align-items-start gap-2 ${
                        selectedMap?.id === m.id ? "list-active" : ""
                      }`}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setSelectedMap(m);
                        if (mapRef.current) {
                          mapRef.current.off();
                          mapRef.current.remove();
                          mapRef.current = null;
                        }
                      }}
                    >
                      <div
                        className="mt-1"
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: "#0ea5a5",
                        }}
                      ></div>
                      <div>
                        <div className="fw-semibold">{m.mapName}</div>
                        <div className="small text-muted">ID: {m.id}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bản đồ chính */}
            <div className="col-lg-8 col-xl-9 position-relative">
              <div
                id="map"
                className="w-100"
                style={{
                  height: "78vh",
                  minHeight: 480,
                  background: "#e2f4f0",
                  borderRadius: "24px",
                }}
              ></div>

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
                    <button className="btn btn-sm btn-teal w-100" onClick={handleSavePoint}>
                      <i className="bi bi-save me-1"></i> Lưu
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger w-100"
                      onClick={() => {
                        if (newMarker && mapRef.current) {
                          mapRef.current.removeLayer(newMarker);
                        }
                        setNewMarker(null);
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

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_CONFIG } from "@/utils/apiConfig";

export default function ProjectMapListView() {
  const mapRef = useRef(null);
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [mapInfo, setMapInfo] = useState(null);
  const navigate = useNavigate();

  // ==========================================================
  // 🧭 Load CSS/JS
  // ==========================================================
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
      [css, icons, leafletCss].forEach((el) => document.head.removeChild(el));
      document.body.removeChild(leafletJs);
    };
  }, []);

  // ==========================================================
  // 🎨 CSS theme glass
  // ==========================================================
  const styles = (
    <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(1200px 600px at 15% 10%,rgba(76,225,198,.18),transparent 60%),radial-gradient(900px 500px at 90% 5%,rgba(76,225,198,.12),transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 15%,#e9f3f1 35%,#e8f0ee 100%);min-height:100vh}
      .glass{background:rgba(255,255,255,.58);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.7);box-shadow:0 10px 30px rgba(15,23,42,.08);border-radius:24px}
      .rounded-2xl{border-radius:28px}
      .btn-teal{background:var(--teal);color:#052a2b;font-weight:700;border:none}
      .btn-teal:hover{background:#39d7bf;color:#052a2b}
      .chip{display:inline-block;padding:.25rem .6rem;border-radius:999px;background:rgba(20,226,193,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
      .list-group-item.active, .list-active{background:rgba(76,225,198,.2);border-color:rgba(76,225,198,.35)}
      .leaflet-container{border-radius:24px}
      .map-toolbar{position:absolute; right:12px; top:12px; z-index:1000}
      .map-toolbar .btn{box-shadow:0 6px 16px rgba(15,23,42,.12)}
    `}</style>
  );

  // ==========================================================
  // 1️⃣ Lấy danh sách map từ API /api/Maps
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
        console.error("❌ Lỗi tải danh sách bản đồ:", err);
      }
    }
    fetchMaps();
  }, []);

  // ==========================================================
  // 2️⃣ Khi chọn map → lấy metadata /api/MapsUpload/{id}
  // ==========================================================
  useEffect(() => {
    async function fetchMapInfo() {
      if (!selectedMap) return;
      try {
        const res = await fetch(`http://localhost:5170/api/MapsUpload/${selectedMap.id}`);
        if (!res.ok) throw new Error("Không tải được metadata map");
        const data = await res.json();
        setMapInfo(data);
      } catch (err) {
        console.error("❌ Lỗi tải metadata map:", err);
      }
    }
    fetchMapInfo();
  }, [selectedMap]);

  // ==========================================================
  // 3️⃣ Render map từ metadata
  // ==========================================================
  useEffect(() => {
    const timer = setInterval(() => {
      if (window.L && mapInfo && !mapRef.current) {
        const L = window.L;
        mapRef.current = L.map("map", {
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

        L.imageOverlay(imageUrl, imageBounds, { opacity: 1 }).addTo(mapRef.current);
        mapRef.current.fitBounds(imageBounds);
        L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
        console.log("✅ Hiển thị bản đồ:", selectedMap.mapName);
        clearInterval(timer);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [mapInfo]);

  // ==========================================================
  // 🧩 Gửi lệnh mapping + chuyển trang CreateMap
  // ==========================================================
  async function handleCreateMap() {
    try {
      const res = await fetch("http://localhost:5170/api/RobotMode/SendMode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "mapping" }),
      });

      if (!res.ok) throw new Error("Không thể gửi lệnh mapping");
      alert("🚀 Robot bắt đầu mapping! Đang chuyển sang chế độ xem bản đồ...");

      // ⏩ Sau khi gửi xong, chuyển sang trang CreateMap
      navigate("/create-map");
    } catch (err) {
      alert("❌ Lỗi khi tạo bản đồ: " + err.message);
    }
  }

  // ==========================================================
  // 🧭 Giao diện
  // ==========================================================
  return (
    <div className="page">
      {styles}

      <div className="container-fluid py-3 py-lg-4">
        <div className="container-lg">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
            <div>
              <h2 className="mb-0 fw-bold">Bản đồ ROS2 - Quản lý khu vực</h2>
              <div className="chip mt-2">Hiển thị danh sách bản đồ và điều khiển Mapping</div>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-teal" onClick={handleCreateMap}>
                <i className="bi bi-plus-circle me-1"></i> Tạo bản đồ mới
              </button>
            </div>
          </div>
        </div>

        <div className="container-fluid">
          <div className="row g-3">
            {/* Danh sách bản đồ */}
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

            {/* Bản đồ bên phải */}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

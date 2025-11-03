import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Project Map List View (React + Bootstrap + Leaflet + Hospital Map)
 * - Giao diện glass đẹp, layout 2 cột: bên trái là danh sách, bên phải hiển thị bản đồ ROS2 từ API
 * - Tự động hiển thị ảnh bản đồ (ID=2) từ backend API /api/MapsUpload/2/image
 */
export default function ProjectMapListView() {
  const mapRef = useRef(null);
  const [mapInfo, setMapInfo] = useState(null);

  // --- Load CSS/JS (Bootstrap + Leaflet + Font)
  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href =
      "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
    document.head.appendChild(css);

    const icons = document.createElement("link");
    icons.rel = "stylesheet";
    icons.href =
      "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css";
    document.head.appendChild(icons);

    const font = document.createElement("link");
    font.rel = "stylesheet";
    font.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
    document.head.appendChild(font);

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
      document.head.removeChild(font);
      document.head.removeChild(leafletCss);
      document.body.removeChild(leafletJs);
    };
  }, []);

  // --- CSS style chủ đề glass teal
  const styles = (
    <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(1200px 600px at 15% 10%,rgba(76,225,198,.18),transparent 60%),radial-gradient(900px 500px at 90% 5%,rgba(76,225,198,.12),transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 15%,#e9f3f1 35%,#e8f0ee 100%);min-height:100vh}
      .glass{background:rgba(255,255,255,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.7);box-shadow:0 10px 30px rgba(15,23,42,.08);border-radius:24px}
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

  // --- Lấy metadata map từ API (id = 2)
  useEffect(() => {
    async function fetchMap() {
      try {
        const res = await fetch("http://157.66.26.217:5000/api/MapsUpload/2");
        if (!res.ok) throw new Error("Không tải được dữ liệu bản đồ");
        const data = await res.json();
        setMapInfo(data);
      } catch (err) {
        console.error("❌ Lỗi tải map:", err);
      }
    }
    fetchMap();
  }, []);

  // --- Khi có mapInfo → hiển thị bản đồ ảnh từ API
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

        const imageUrl = `http://157.66.26.217:5000/api/MapsUpload/${mapInfo.id}/image`;

        const res = mapInfo.resolution || 0.05;
        const width = mapInfo.width || 800;
        const height = mapInfo.height || 800;
        const originX = mapInfo.originX || 0;
        const originY = mapInfo.originY || 0;

        const imageBounds = [
          [originY, originX],
          [originY + height * res, originX + width * res],
        ];

        L.imageOverlay(imageUrl, imageBounds, { opacity: 1 }).addTo(mapRef.current);
        mapRef.current.fitBounds(imageBounds);
        L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

        console.log("✅ Hiển thị bản đồ:", mapInfo.mapName);
        clearInterval(timer);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [mapInfo]);

  // --- Mock danh sách bên trái
  const [items] = useState(() => ([
    { id: 1, title: "Kho Dược Trung Tâm", type: "Kho", status: "Hoạt động" },
    { id: 2, title: "Khoa Nội A", type: "Khoa", status: "Hoạt động" },
    { id: 3, title: "Phòng Mổ 2", type: "Khu mổ", status: "Đang bảo trì" },
    { id: 4, title: "Trạm Sạc 1", type: "Trạm sạc", status: "Hoạt động" },
  ]));

  return (
    <div className="page">
      {styles}

      <div className="container-fluid py-3 py-lg-4">
        {/* Header */}
        <div className="container-lg">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
            <div>
              <h2 className="mb-0 fw-bold">Bản đồ & Danh sách khu vực</h2>
              <div className="chip mt-2">Bản đồ ROS2 + Quản lý vị trí kho/khoa/trạm sạc</div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary">
                <i className="bi bi-download me-1"></i>Xuất CSV
              </button>
              <button className="btn btn-teal">
                <i className="bi bi-geo-alt me-1"></i>Vị trí của tôi
              </button>
            </div>
          </div>
        </div>

        {/* Layout chia đôi: danh sách bên trái, map bên phải */}
        <div className="container-fluid">
          <div className="row g-3">
            {/* Danh sách bên trái */}
            <div className="col-lg-4 col-xl-3">
              <div
                className="glass p-2 rounded-2xl h-100"
                style={{ maxHeight: "78vh", overflowY: "auto" }}
              >
                <ul className="list-group list-group-flush">
                  {items.map((i) => (
                    <li
                      key={i.id}
                      className="list-group-item d-flex align-items-start gap-2"
                    >
                      <div
                        className="mt-1"
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background:
                            i.status === "Hoạt động"
                              ? "#0ea5a5"
                              : i.status === "Đang bảo trì"
                              ? "#f59e0b"
                              : "#94a3b8",
                        }}
                      ></div>
                      <div>
                        <div className="fw-semibold">{i.title}</div>
                        <div className="small text-muted">
                          {i.type} • {i.status}
                        </div>
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

              <div className="map-toolbar d-flex flex-column gap-2">
                <button
                  className="btn btn-light"
                  onClick={() => {
                    if (!window.L || !mapRef.current) return;
                    mapRef.current.fitBounds(mapRef.current.getBounds(), {
                      padding: [40, 40],
                    });
                  }}
                >
                  <i className="bi bi-arrows-fullscreen"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

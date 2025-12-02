import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API_CONFIG } from "@/utils/apiConfig";
import styles from "@/assets/styles/mapDetailView.module.css";
import mapErrorImg from "@/assets/image/map_error.jpg";

// Fix Leaflet default icons
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIcon2xPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xPng,
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
});

export default function MapDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCoords, setShowCoords] = useState(false);
  const [worldPos, setWorldPos] = useState({ x: 0, y: 0 });

  // ========================= Fetch Map =========================
  useEffect(() => {
    async function fetchMap() {
      try {
        setLoading(true);
        const res = await fetch(`${API_CONFIG.API_BASE1}/api/Maps/${id}`);
        if (!res.ok) throw new Error("Không tải được bản đồ");
        const data = await res.json();
        setMapData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMap();
  }, [id]);

  // ========================= Init Leaflet =========================
  useEffect(() => {
    if (!mapData) return;

    const container = document.getElementById("detailMap");
    if (!container) return;

    if (container._leaflet_id) container._leaflet_id = null;
    container.innerHTML = "";

    const map = L.map(container, {
      crs: L.CRS.Simple,
      minZoom: -6,
      maxZoom: 5,
      zoomControl: false
    });

    const imageUrl = `${API_CONFIG.API_BASE1}/api/Maps/${id}/image`;
    const resolution = mapData.resolution || 0.05;
    const originX = mapData.originX || 0;
    const originY = mapData.originY || 0;

    const markers = {};

    const img = new Image();
    img.onload = () => {
      const w = img.width * resolution;
      const h = img.height * resolution;
      const bounds = [[0, 0], [h, w]];

      L.imageOverlay(imageUrl, bounds).addTo(map);
      map.fitBounds(bounds);
      map.__initialBounds = bounds;
      L.control.zoom({ position: "bottomright" }).addTo(map);
// Custom Auto-Fit control
const FitControl = L.Control.extend({
  options: { position: "bottomright" },

  onAdd: function () {
    const container = L.DomUtil.create("div", "leaflet-bar custom-fit-btn");

    container.innerHTML = `<a title="Reset zoom" role="button"><i class="bi bi-aspect-ratio"></i></a>`;

    // Prevent map drag when clicking
    L.DomEvent.disableClickPropagation(container);

    container.onclick = () => {
      if (map.__initialBounds) {
        map.fitBounds(map.__initialBounds, {
          animate: true,
          duration: 0.5
        });
      }
    };

    return container;
  }
});

// Add to map
map.addControl(new FitControl());

      // Destinations
      mapData.destinations?.forEach((dest) => {
        const y = (dest.y ?? 0) - originY;
        const x = (dest.x ?? 0) - originX;

        if (isNaN(x) || isNaN(y)) return;

        const marker = L.marker([y, x], { title: dest.name }).addTo(map);
        marker.bindPopup(`
          <div style="font-family:system-ui;min-width:200px;">
            <b style="font-size:1.1em">${dest.name}</b><br/>
            <small>Khu: ${dest.area} - Tầng: ${dest.floor}</small><br/>
            <small>X: ${dest.x}, Y: ${dest.y}</small><br/>
            <strong style="color:#0d9488">${dest.taskCount} lần giao</strong>
          </div>
        `);

        markers[dest.id] = marker;
      });

       // Save markers to mapRef
        map.__markers = markers;

      // Mouse coordinates
      map.on("mousemove", (e) => {
        setWorldPos({
          x: (originX + e.latlng.lng).toFixed(3),
          y: (originY + e.latlng.lat).toFixed(3),
        });
        setShowCoords(true);
      });

      map.on("mouseout", () => setShowCoords(false));

      mapRef.current = map;
    };
img.onerror = () => {
  // Xóa map và hiển thị ảnh lỗi trực tiếp bằng CSS
  map.remove();
  container.innerHTML = `
    <div style="
      width: 100%;
      height: 100%;
      background-image: url(${mapErrorImg});
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
    </div>
  `;
};
    img.src = imageUrl;

    return () => mapRef.current?.remove();
  }, [mapData, id]);

  const [selectedDestId, setSelectedDestId] = useState(null);

function handleSelectDestination(dest) {
  if (!mapRef.current || !mapRef.current.__markers) return;

  const marker = mapRef.current.__markers[dest.id];
  if (!marker) return;

  // Reset map như lúc mới vào trang
  if (mapRef.current.__initialBounds) {
    mapRef.current.fitBounds(mapRef.current.__initialBounds, {
      animate: true,
      duration: 0.5
    });
  }

  // Chờ reset xong rồi mới pan chính xác vào marker
  setTimeout(() => {
    mapRef.current.panTo(marker.getLatLng(), {
      animate: true,
      duration: 0.5
    });
    marker.openPopup();
  }, 100);

  setSelectedDestId(dest.id);
}


  // ========================= Loading / Error =========================
  if (loading) return <div className={styles.loading}>Đang tải bản đồ...</div>;
  if (error) return <div className={styles.error}>Lỗi: {error}</div>;
  if (!mapData) return <div className={styles.error}>Không tìm thấy bản đồ</div>;

  const activeRobots =
    mapData.robots?.filter(r =>
      ["busy", "transporting", "returning"].includes(r.status?.toLowerCase())
    ).length || 0;

  // ========================= Render =========================
  return (
    <div className={styles.page}>
      <div className="container-xl py-4">

        {/* GLASS WRAPPER */}
        <div className={styles.glass}>

          {/* ========================= HEADER ========================= */}
          <div className={styles.header}>
            <div>
              <h2 className={styles.title}>
                Bản đồ: {mapData.nameMapFE || mapData.mapName}
              </h2>
              <p className={styles.subtitle}>
                ROS Map: <code>{mapData.mapName}</code> - Tạo ngày{" "}
                {new Date(mapData.createdAt).toLocaleDateString("vi-VN")}
              </p>
            </div>

            <button className={styles.btnBack} onClick={() => navigate("/maps")}>
              <i className="bi bi-arrow-left me-1"></i> Quay lại
            </button>
          </div>

          {/* ========================= STAT CARDS ========================= */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>
                {(mapData.TotalTasks ?? 0).toLocaleString()}
              </div>
              <div className={styles.statLabel}>Tổng nhiệm vụ</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statNumber}>{mapData.TasksToday ?? 0}</div>
              <div className={styles.statLabel}>Hôm nay</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statNumber}>{mapData.TasksThisWeek ?? 0}</div>
              <div className={styles.statLabel}>Tuần này</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statNumber}>{activeRobots}</div>
              <div className={styles.statLabel}>Robot đang hoạt động</div>
            </div>
          </div>

          <div className="row g-4">

            {/* ========================= MAP SECTION ========================= */}
            <div className="col-lg-8">
              <div className={styles.mapWrapper}>
                <div id="detailMap" className={styles.mapContainer}></div>

                {showCoords && (
                  <div className={styles.coordBox}>
                    ({worldPos.x}m, {worldPos.y}m)
                  </div>
                )}
              </div>
            </div>

            {/* ========================= RIGHT COLUMN ========================= */}
            <div className="col-lg-4">

              {/* ROBOTS */}
              <div className={styles.infoCard}>
                <h5>Robot đang sử dụng ({mapData.robots?.length || 0})</h5>

                {mapData.robots?.length > 0 ? (
                  <div className={styles.robotList}>
                    {mapData.robots.map((r) => (
                      <div key={r.id} className={styles.robotItem}>
                        <strong>{r.name || r.code}</strong>

                        <div className={styles.robotStatus}>
                          <span
                            className={`${styles.status} ${
                              styles[r.status?.toLowerCase()] || styles.at_station
                            }`}
                          >
                            {r.status}
                          </span>
                          <span>Pin: {r.batteryPercent}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.empty}>Chưa có robot</p>
                )}
              </div>

              {/* DESTINATIONS */}
              <div className={styles.infoCard}>
                <h5>Điểm đến ({mapData.destinations?.length || 0})</h5>

                {mapData.destinations?.length > 0 ? (
                  <div className={styles.destList}>
                    {mapData.destinations
                      .sort((a, b) => (b.taskCount || 0) - (a.taskCount || 0))
                      .map((d) => (
                        <div
  key={d.id}
  className={`${styles.destItem} ${
    selectedDestId === d.id ? styles.destItemActive : ""
  }`}
  onClick={() => handleSelectDestination(d)}
>

                          <strong>{d.name}</strong>
                          <small>
                            {d.area} - {" "}
                            <span style={{ color: "#0d9488", fontWeight: 600 }}>
                              {d.taskCount || 0} lần
                            </span>
                          </small>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className={styles.empty}>Chưa có điểm đến</p>
                )}
              </div>

            </div>
          </div>

        </div>{/* END GLASS */}
      </div>
    </div>
  );
}

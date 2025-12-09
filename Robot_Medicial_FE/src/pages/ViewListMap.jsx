import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API_CONFIG } from "@/utils/apiConfig";
import styles from "@/assets/styles/projectMapListView.module.css";
import mapErrorImg from "@/assets/image/map_error.jpg";
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIcon2xPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xPng,
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
});

export default function ProjectMapListView() {
  const { toast, showToast } = useToast();
  const mapRef = useRef(null);
  const worldPosRef = useRef(null);

  // layer chứa marker tất cả phòng
  const roomsLayerRef = useRef(null);

  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [mapInfo, setMapInfo] = useState(null);

  // danh sách phòng theo map hiện tại
  const [rooms, setRooms] = useState([]);

  const [isSelecting, setIsSelecting] = useState(false);
  const [newMarker, setNewMarker] = useState(null);
  const [pointName, setPointName] = useState("");

  // 🔹 Chọn robot khi tạo map
  const [availableRobots, setAvailableRobots] = useState([]);
  const [isRobotModalOpen, setIsRobotModalOpen] = useState(false);
  const [selectedRobotId, setSelectedRobotId] = useState(null);

  const navigate = useNavigate();

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
        console.log("ℹ️ mapInfo từ API:", data);
        setMapInfo(data);
      } catch (err) {
        console.error("❌ Lỗi metadata:", err);
      }
    }
    fetchMapInfo();
  }, [selectedMap]);

  // 2b️⃣ Load danh sách phòng theo map hiện tại
  useEffect(() => {
    async function fetchRooms() {
      if (!selectedMap) return;
      try {
        const res = await fetch(API_CONFIG.API_BASE1 + "/api/Rooms");
        const data = await res.json();

        // lọc phòng thuộc map đang chọn
        const filtered = data.filter(
          (r) => String(r.mapId) === String(selectedMap.id)
        );
        setRooms(filtered);
      } catch (err) {
        console.error("❌ Lỗi tải phòng:", err);
      }
    }
    fetchRooms();
  }, [selectedMap]);

  // =====================================================================
  // Helper: vẽ tất cả phòng lên bản đồ
  // =====================================================================
  function refreshRoomMarkers() {
    if (!mapRef.current || !mapInfo) return;

    // tạo layer group nếu chưa có
    if (!roomsLayerRef.current) {
      roomsLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    roomsLayerRef.current.clearLayers();

    rooms.forEach((room) => {
      if (room.latitude == null || room.longitude == null) return;

      const worldX = Number(room.longitude);
      const worldY = Number(room.latitude);
      if (Number.isNaN(worldX) || Number.isNaN(worldY)) return;

      const originX = mapInfo.originX;
      const originY = mapInfo.originY;

      const localX = worldX - originX;
      const localY = worldY - originY;

      const latlng = L.latLng(localY, localX);
      const marker = L.marker(latlng);

      if (room.roomName) {
        marker.bindTooltip(room.roomName, {
          permanent: true,
          direction: "top",
          offset: [0, -8],
          className: styles.roomLabel || "",
        });
      }

      roomsLayerRef.current.addLayer(marker);
    });
  }

  // =====================================================================
  // 3️⃣ Render map + logic load map & chọn điểm
  // =====================================================================
  useEffect(() => {
    if (!mapInfo || !selectedMap) return;

    // Reset container mỗi lần load map mới (xoá cả ảnh lỗi fallback)
    const containerEl = document.getElementById("map");
    if (containerEl) {
      containerEl.innerHTML = ""; // XÓA NỘI DUNG CŨ
    }

    // Dọn map cũ
    if (mapRef.current) {
      mapRef.current.off();
      mapRef.current.remove();
      mapRef.current = null;
    }

    // dọn layer phòng cũ
    if (roomsLayerRef.current) {
      roomsLayerRef.current.clearLayers();
      roomsLayerRef.current = null;
    }

    const map = L.map("map", {
      crs: L.CRS.Simple,
      minZoom: -5,
      maxZoom: 10,
      zoomControl: false,
    });

    const imageUrl =
      API_CONFIG.API_BASE1 + `/api/MapsUpload/${selectedMap.id}/image`;

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

      const southWest = L.latLng(0, 0);
      const northEast = L.latLng(heightMeters, widthMeters);
      const imageBounds = L.latLngBounds(southWest, northEast);

      L.imageOverlay(imageUrl, imageBounds).addTo(map);
      map.fitBounds(imageBounds);

      L.control.zoom({ position: "bottomright" }).addTo(map);
    };

    /* ========================= XỬ LÝ LỖI KHI TẢI ẢNH ========================= */
    img.onerror = () => {
      console.error("❌ Lỗi tải ảnh bản đồ:", imageUrl);

      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }

      const container = document.getElementById("map");
      if (container) {
        container.innerHTML = `
          <div style="
            width: 100%;
            height: 100%;
            background-image: url('${mapErrorImg}');
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            color: #64748b;
          ">
          </div>
        `;
      }
    };

    // ==========================================================
    // 🔁 Chuyển mouse event -> toạ độ /map
    // ==========================================================
    function screenToWorld(e) {
      const containerPoint = map.mouseEventToContainerPoint(e);
      const latlng = map.containerPointToLatLng(containerPoint);
      if (!latlng || !mapInfo) return null;

      const originX = mapInfo.originX;
      const originY = mapInfo.originY;

      const localX = latlng.lng;
      const localY = latlng.lat;

      const worldX = originX + localX;
      const worldY = originY + localY;

      return { x: worldX, y: worldY, localX, localY };
    }

    function updateCoordinateDisplay(e) {
      const div = document.getElementById("coordinates");
      if (!div) return;

      const world = screenToWorld(e);
      if (!world) {
        div.classList.remove(styles.show);
        return;
      }

      div.classList.add(styles.show);
      div.textContent = `World: (${world.x.toFixed(
        2
      )}m, ${world.y.toFixed(2)}m)`;
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

          const marker = L.marker([world.localY, world.localX]).addTo(map);
          currentMarker = marker;

          setNewMarker(marker);
          worldPosRef.current = { x: world.x, y: world.y };

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
      if (div) div.classList.remove(styles.show);
      mouseDownTime = 0;
      hasMouseMoved = false;
    };

    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseLeave);

    mapRef.current = map;

    // sau khi map sẵn sàng -> vẽ các phòng nếu đã load
    refreshRoomMarkers();

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

      if (roomsLayerRef.current) {
        roomsLayerRef.current.clearLayers();
        roomsLayerRef.current = null;
      }
    };
  }, [mapInfo, selectedMap, isSelecting]);

  // mỗi khi rooms hoặc mapInfo thay đổi -> vẽ lại marker phòng
  useEffect(() => {
    refreshRoomMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, mapInfo]);

  // ==========================================================
  // 4️⃣ Toggle chế độ chọn điểm
  // ==========================================================
  function handleSelectPointMode() {
    const next = !isSelecting;
    setIsSelecting(next);

    if (next) {
      showToast(
        "info",
        "🖱️ Chế độ chọn tọa độ đang bật — Click lên bản đồ để chọn điểm đến!"
      );
    } else {
      showToast("info", "❌ Đã tắt chế độ chọn tọa độ");
    }
  }

  // ==========================================================
  // 5️⃣ Lưu điểm đến vào DB
  // ==========================================================
  async function handleSavePoint() {
    const world = worldPosRef.current;

    if (!selectedMap || !newMarker || !pointName.trim() || !world) {
      showToast(
        "warning",
        "⚠️ Nhập tên điểm và click chọn vị trí trên bản đồ!"
      );
      return;
    }

    const payload = {
      name: pointName,
      mapId: selectedMap.id,
      x: world.x,
      y: world.y,
    };

    try {
      const res = await fetch(API_CONFIG.API_BASE1 + "/api/Destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Không lưu được điểm!");

      showToast(
        "success",
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
      showToast("error", "❌ Lỗi: " + (err?.message || "Không xác định"));
    }
  }

  // ==========================================================
  // 🔹 MỞ FORM CHỌN ROBOT KHI ẤN "TẠO BẢN ĐỒ MỚI"
  // ==========================================================
  async function handleOpenRobotModal() {
    setIsRobotModalOpen(true);
    setSelectedRobotId(null);

    try {
      const res = await fetch(API_CONFIG.API_BASE1 + "/api/Robots/available");
      const data = await res.json();
      const robots = data.data || data || [];
      setAvailableRobots(robots);

      if (!robots || robots.length === 0) {
        showToast(
          "warning",
          "Hiện không có robot nào đang ở trạm (at_station)."
        );
      }
    } catch (err) {
      showToast(
        "error",
        "❌ Lỗi tải danh sách robot: " + (err?.message || "Không xác định")
      );
    }
  }

  // ==========================================================
  // 🧩 XÁC NHẬN TẠO MAP SAU KHI ĐÃ CHỌN ROBOT
  // ==========================================================
  async function handleConfirmCreateMap() {
    if (!selectedRobotId) {
      showToast(
        "warning",
        "⚠️ Vui lòng chọn một robot đang ở trạm trước khi tạo bản đồ!"
      );
      return;
    }

    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/SendMode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "mapping",
          robotId: Number(selectedRobotId),
        }),
      });

      showToast("success", "🚀 Robot bắt đầu mapping!");

      setIsRobotModalOpen(false);
      // truyền robotId sang trang create-map (nếu cần dùng)
      navigate(`/create-map?robotId=${selectedRobotId}`);
    } catch (err) {
      showToast("error", "❌ Lỗi mapping: " + (err?.message || "Không xác định"));
    }
  }

  function handleCloseRobotModal() {
    setIsRobotModalOpen(false);
    setSelectedRobotId(null);
  }

  // ==========================================================
  // 6️⃣ UI
  // ==========================================================
  return (
    <div className={styles.page}>
      <div className="container-fluid py-4">
        <div className="container-xl">
          {/* =================== HEADER =================== */}
          <div className={styles.headerSection}>
            <div>
              <h2 className={styles.pageTitle}>
                <i
                  className="bi bi-map me-2"
                  style={{ color: "var(--teal-dark)" }}
                ></i>
                Bản đồ
              </h2>
              <div className={styles.subtitle}>
                <i className="bi bi-geo-alt me-1"></i>
                Hiển thị bản đồ và thêm điểm đến
              </div>
            </div>

            <div className={styles.headerActions}>
              <button
                className={styles.btnTeal}
                onClick={handleSelectPointMode}
              >
                <i className="bi bi-geo-alt me-1"></i>
                {isSelecting ? "Đang chọn điểm..." : "Chọn điểm đến"}
              </button>

              <button className={styles.btnTeal} onClick={handleOpenRobotModal}>
                <i className="bi bi-plus-circle me-1"></i>
                Tạo bản đồ mới
              </button>
            </div>
          </div>
        </div>

        <div className="container-fluid">
          <div className="row g-3">
            {/* =================== SIDEBAR =================== */}
            <div className="col-lg-4 col-xl-3">
              <div className={styles.sidebar}>
                {maps.map((m) => (
                  <div
                    key={m.id}
                    className={`${styles.mapItem} ${
                      selectedMap?.id === m.id ? styles.mapItemActive : ""
                    }`}
                    onClick={() => setSelectedMap(m)}
                  >
                    <div className={styles.mapItemHeader}>
                      <div className={styles.mapIcon}>
                        <i className="bi bi-map"></i>
                      </div>
                      <h6 className={styles.mapTitle}>
                        {m.nameMapFE || m.mapName}
                      </h6>
                    </div>

                    <div className={styles.mapItemFooter}>
                      <div className={styles.mapRosName}>
                        <i className="bi bi-robot me-1"></i>
                        ROS: {m.mapName}
                      </div>
                      <button
                        className={styles.btnOutlineTeal}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/maps/${m.id}`);
                        }}
                      >
                        <i className="bi bi-eye me-1"></i>
                        Chi tiết
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* =================== MAP =================== */}
            <div className="col-lg-8 col-xl-9 position-relative">
              <div id="map" className={styles.mapContainer} />

              <div id="coordinates" className={styles.coordinateDisplay}>
                World: (...)
              </div>

              {/* =================== TOOLBAR CHỌN ĐIỂM =================== */}
              {isSelecting && (
                <div className={styles.mapToolbar}>
                  <div className={styles.toolbarTitle}>
                    <i className="bi bi-geo-alt-fill"></i>
                    Thêm điểm đến
                  </div>

                  <input
                    type="text"
                    className={styles.toolbarInput}
                    placeholder="Nhập tên điểm..."
                    value={pointName}
                    onChange={(e) => setPointName(e.target.value)}
                  />

                  <div className={styles.toolbarActions}>
                    <button
                      className={`${styles.btnTeal} flex-fill`}
                      onClick={handleSavePoint}
                    >
                      <i className="bi bi-save me-1"></i>
                      Lưu
                    </button>

                    <button
                      className={`${styles.btnDanger} flex-fill`}
                      onClick={() => {
                        if (newMarker && mapRef.current) {
                          mapRef.current.removeLayer(newMarker);
                        }
                        setNewMarker(null);
                        worldPosRef.current = null;
                        setIsSelecting(false);
                      }}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================ MODAL CHỌN ROBOT ================ */}
      {isRobotModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "0.75rem",
              padding: "1.25rem 1.5rem",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <i className="bi bi-robot" />
                Chọn robot để tạo bản đồ
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={handleCloseRobotModal}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div
              style={{
                fontSize: "0.85rem",
                marginBottom: "0.5rem",
                color: "#4b5563",
              }}
            >
            Các robot sẵn sàng chạy
            </div>

            <div
              style={{
                maxHeight: "260px",
                overflowY: "auto",
                marginBottom: "0.75rem",
              }}
            >
              {availableRobots.length === 0 ? (
                <div
                  style={{
                    fontSize: "0.9rem",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    background: "rgba(248,250,252,1)",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  Không có robot nào đang ở trạm. Hãy kiểm tra lại trạng thái
                  robot.
                </div>
              ) : (
                availableRobots.map((r) => {
                  const isActive = selectedRobotId === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRobotId(r.id)}
                      style={{
                        padding: "0.55rem 0.75rem",
                        borderRadius: "0.5rem",
                        border: isActive
                          ? "2px solid var(--teal-dark)"
                          : "1px solid #e5e7eb",
                        background: isActive
                          ? "rgba(13,148,136,0.06)"
                          : "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.4rem",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                          }}
                        >
                          <span>{r.name || r.code || "Robot"}</span>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "999px",
                              background: "#ecfdf5",
                              color: "#15803d",
                            }}
                          >
                            #{r.id}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#6b7280",
                            marginTop: "0.1rem",
                          }}
                        >
                          Code: {r.code} • Trạng thái: {r.status} • Pin:{" "}
                          {r.battery_percent ?? r.batteryPercen ?? "--"}%
                        </div>
                      </div>
                      <div>
                        <input
                          type="radio"
                          checked={isActive}
                          onChange={() => setSelectedRobotId(r.id)}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                marginTop: "0.5rem",
              }}
            >
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={handleCloseRobotModal}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={handleConfirmCreateMap}
                disabled={!selectedRobotId || availableRobots.length === 0}
              >
                <i className="bi bi-play-fill me-1"></i>
                Bắt đầu mapping
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} showToast={showToast} />
    </div>
  );
}

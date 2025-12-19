import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API_CONFIG } from "@/utils/apiConfig";
import { getAllRooms } from "@/services/roomService";
import styles from "@/assets/styles/mapDetailView.module.css";
import mapErrorImg from "@/assets/image/map_error.jpg";

/* ========================= CẤU HÌNH ICON LEAFLET ========================= */
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIcon2xPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xPng,
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
});

/* ========================= COMPONENT CHÍNH ========================= */
export default function MapDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  /* ========================= STATE ========================= */
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCoords, setShowCoords] = useState(false);
  const [worldPos, setWorldPos] = useState({ x: 0, y: 0 });
  const [selectedDestId, setSelectedDestId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  /* ========================= FETCH DỮ LIỆU BẢN ĐỒ ========================= */
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

  /* ========================= FETCH DANH SÁCH PHÒNG THEO MAP ========================= */
  useEffect(() => {
    async function fetchRooms() {
      if (!id) return;
      try {
        setRoomsLoading(true);
        const allRooms = await getAllRooms();
        // Filter rooms theo mapId
        const mapIdNum = Number(id);
        const filteredRooms = allRooms.filter(
          (room) => room.mapId && Number(room.mapId) === mapIdNum
        );
        setRooms(filteredRooms);
      } catch (err) {
        console.error("Lỗi tải danh sách phòng:", err);
      } finally {
        setRoomsLoading(false);
      }
    }
    fetchRooms();
  }, [id]);

  /* ========================= KHỞI TẠO LEAFLET MAP ========================= */
  useEffect(() => {
    if (!mapData || !rooms) return;

    const container = document.getElementById("detailMap");
    if (!container) return;

    // Reset container nếu đã có map cũ
    if (container._leaflet_id) container._leaflet_id = null;
    container.innerHTML = "";

    // Tạo map với hệ tọa độ đơn giản
    const map = L.map(container, {
      crs: L.CRS.Simple,
      minZoom: -6,
      maxZoom: 8,
      maxNativeZoom: 1,
      zoomControl: false,
      maxBoundsViscosity: 0, // Không dính cạnh khi kéo
    });

    // Lấy thông tin từ API
    const imageUrl = API_CONFIG.API_BASE1 + `/api/MapsUpload/${id}/image`;
    const resolution = mapData.resolution || 0.05;
    const originX = mapData.originX || 0;
    const originY = mapData.originY || 0;

    const markers = {};

    /* ========================= TẢI VÀ HIỂN THỊ ẢNH BẢN ĐỒ ========================= */
    const img = new Image();
    img.onload = () => {
      const w = img.width * resolution;
      const h = img.height * resolution;
      const realBounds = [[0, 0], [h, w]];

      // Tăng vùng để cho phép kéo
      const scale = 3;
      const bigBounds = [
        [-h * scale, -w * scale],
        [h * scale, w * scale],
      ];
      map.setMaxBounds(bigBounds);

      // Hiển thị ảnh bản đồ
      L.imageOverlay(imageUrl, realBounds).addTo(map);

      // Fit vào khu ảnh thật với padding âm để bản đồ to hơn
      // Padding âm sẽ làm cho bản đồ zoom in hơn, hiển thị to hơn
      const padding = [-20, -20]; // [top/bottom, left/right] - giá trị âm để bản đồ to hơn
      map.fitBounds(realBounds, { 
        padding: padding,
        maxZoom: 8 // Giới hạn zoom tối đa để tránh quá to
      });
      map.__initialBounds = realBounds;

      // Bật các tính năng tương tác sau khi ảnh load xong
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();

      // Thêm nút zoom
      L.control.zoom({ position: "bottomright" }).addTo(map);

      /* ========================= NÚT RESET ZOOM TỰ TẠO ========================= */
      const FitControl = L.Control.extend({
        options: { position: "bottomright" },

        onAdd: function () {
          const container = L.DomUtil.create("div", "leaflet-bar custom-fit-btn");
          container.innerHTML = `<a title="Đặt lại zoom" role="button"><i class="bi bi-aspect-ratio"></i></a>`;

          // Ngăn map bị kéo khi click nút
          L.DomEvent.disableClickPropagation(container);

          container.onclick = () => {
            if (map.__initialBounds) {
              map.fitBounds(map.__initialBounds, {
                animate: true,
                duration: 0.5,
                padding: [-20, -20], // Giữ padding âm để bản đồ to hơn
                maxZoom: 8
              });
            }
          };

          return container;
        },
      });

      map.addControl(new FitControl());

      /* ========================= THÊM MARKERS CHO CÁC ĐIỂM ĐẾN ========================= */
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

      /* ========================= THÊM MARKERS CHO CÁC PHÒNG ========================= */
      // Tạo icon riêng cho phòng (màu xanh lá)
      const roomIcon = L.divIcon({
        className: 'room-marker',
        html: `<div style="
          background-color: #10b981;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <i class="bi bi-door-open" style="color: white; font-size: 12px;"></i>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
      });

      rooms.forEach((room) => {
        // Room sử dụng Longitude (x) và Latitude (y)
        const x = room.longitude ? Number(room.longitude) - originX : null;
        const y = room.latitude ? Number(room.latitude) - originY : null;

        if (x === null || y === null || isNaN(x) || isNaN(y)) return;

        const marker = L.marker([y, x], { 
          title: room.roomName,
          icon: roomIcon
        }).addTo(map);

        const patientInfo = room.patientCount > 0 
          ? `<br/><small><i class="bi bi-people"></i> ${room.patientCount} bệnh nhân</small>`
          : '';

        marker.bindPopup(`
          <div style="font-family:system-ui;min-width:200px;">
            <b style="font-size:1.1em;color:#10b981;">
              <i class="bi bi-door-open"></i> ${room.roomName || `Phòng #${room.id}`}
            </b>${patientInfo}
            <br/><small>X: ${room.longitude}, Y: ${room.latitude}</small>
          </div>
        `);

        markers[`room_${room.id}`] = marker;
      });

      // Lưu markers vào map
      map.__markers = markers;

      /* ========================= HIỂN THỊ TỌA ĐỘ CHUỘT ========================= */
      map.on("mousemove", (e) => {
        setWorldPos({
          x: (originX + e.latlng.lng).toFixed(3),
          y: (originY + e.latlng.lat).toFixed(3),
        });
        setShowCoords(true);
      });

      map.on("mouseout", () => setShowCoords(false));

      // Quan trọng: Invalidate size sau khi map được tạo để đảm bảo tính toán đúng
      // Đặc biệt khi container có kích thước lớn (100vh)
      setTimeout(() => {
        map.invalidateSize();
        // Fit lại bounds sau khi invalidate để đảm bảo markers đúng vị trí
        // Sử dụng cùng padding để giữ bản đồ to hơn
        if (map.__initialBounds) {
          map.fitBounds(map.__initialBounds, { 
            animate: false,
            padding: [-20, -20],
            maxZoom: 8
          });
        }
      }, 100);

      mapRef.current = map;
    };

    /* ========================= XỬ LÝ LỖI KHI TẢI ẢNH ========================= */
    img.onerror = () => {
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

    // Cleanup khi component unmount
    return () => mapRef.current?.remove();
  }, [mapData, id, rooms]);

  /* ========================= XỬ LÝ RESIZE CONTAINER ========================= */
  useEffect(() => {
    if (!mapRef.current) return;

    const handleResize = () => {
      if (mapRef.current) {
        // Invalidate size khi container resize để đảm bảo markers đúng vị trí
        mapRef.current.invalidateSize();
      }
    };

    // Sử dụng ResizeObserver để theo dõi container thay đổi kích thước
    const container = document.getElementById("detailMap");
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      // Debounce để tránh gọi quá nhiều lần
      clearTimeout(window.mapResizeTimeout);
      window.mapResizeTimeout = setTimeout(handleResize, 150);
    });

    resizeObserver.observe(container);

    // Cũng lắng nghe window resize
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      clearTimeout(window.mapResizeTimeout);
    };
  }, [mapData]); // Chỉ chạy khi mapData thay đổi (map đã được tạo)

  /* ========================= XỬ LÝ CHỌN ĐIỂM ĐẾN ========================= */
  function handleSelectDestination(dest) {
    if (!mapRef.current || !mapRef.current.__markers) return;

    const marker = mapRef.current.__markers[dest.id];
    if (!marker) return;

    // Reset map như lúc mới vào trang
    if (mapRef.current.__initialBounds) {
      mapRef.current.fitBounds(mapRef.current.__initialBounds, {
        animate: true,
        duration: 0.5,
        padding: [-20, -20], // Giữ padding âm để bản đồ to hơn
        maxZoom: 8
      });
    }

    // Chờ reset xong rồi mới pan chính xác vào marker
    setTimeout(() => {
      mapRef.current.panTo(marker.getLatLng(), {
        animate: true,
        duration: 0.5,
      });
      marker.openPopup();
    }, 100);

    setSelectedDestId(dest.id);
  }

  /* ========================= CHUYỂN ĐỔI TRẠNG THÁI ROBOT ========================= */
  function mapRobotStatus(status) {
    if (!status) return "Không rõ";

    switch (status.toLowerCase()) {
      case "transporting":
        return "Đang vận chuyển";

      case "awaiting_handover":
        return "Chờ bàn giao";

      case "returning_to_station":
      case "returning":
        return "Đang quay về trạm";

      case "at_station":
        return "Đang ở trạm";

      case "completed":
        return "Đã hoàn thành";

      case "charging":
        return "Đang sạc";

      case "needs_attention":
        return "Cần kiểm tra";

      case "manual_control":
        return "Điều khiển thủ công";

      case "offline":
        return "Mất kết nối";

      case "pending":
        return "Đang chờ";

      case "in_progress":
        return "Đang tiến hành";

      case "canceled":
        return "Đã hủy";

      case "failed":
        return "Thất bại";

      default:
        return status || "Không xác định";
    }
  }

  /* ========================= XỬ LÝ LOADING / ERROR ========================= */
  if (loading) return <div className={styles.loading}>Đang tải bản đồ...</div>;
  if (error) return <div className={styles.error}>Lỗi: {error}</div>;
  if (!mapData) return <div className={styles.error}>Không tìm thấy bản đồ</div>;

  // Tính số robot đang hoạt động
  function isRobotActive(status) {
    if (!status) return false;

    switch (status.toLowerCase()) {
      case "transporting":
      case "awaiting_handover":
      case "returning_to_station":
      case "manual_control":
        return true;
      default:
        return false;
    }
  }

  const activeRobots = mapData.robots?.filter(r => isRobotActive(r.status)).length || 0;

  /* ========================= RENDER GIAO DIỆN ========================= */
  return (
    <div className={styles.page}>
      <div className="container-xl py-4">
        {/* ========================= WRAPPER GLASS ========================= */}
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

            <div className="d-flex gap-2">
              <button 
                className={styles.btnBack} 
                onClick={() => navigate(`/maps/${id}/edit`)}
                title="Chỉnh sửa tên bản đồ"
              >
                <i className="bi bi-pencil me-1"></i> Chỉnh sửa
              </button>
              <button className={styles.btnBack} onClick={() => navigate("/viewlistmap")}>
                <i className="bi bi-arrow-left me-1"></i> Quay lại
              </button>
            </div>
          </div>

          {/* ========================= THỐNG KÊ CARDS ========================= */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>
                {(mapData.totalTasks ?? 0).toLocaleString()}
              </div>
              <div className={styles.statLabel}>Tổng nhiệm vụ</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statNumber}>{mapData.tasksToday ?? 0}</div>
              <div className={styles.statLabel}>Hôm nay</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statNumber}>{mapData.tasksThisWeek ?? 0}</div>
              <div className={styles.statLabel}>Tuần này</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statNumber}>{activeRobots}</div>
              <div className={styles.statLabel}>Robot đang hoạt động</div>
            </div>
          </div>

          <div className="row g-4">
            {/* ========================= PHẦN BẢN ĐỒ ========================= */}
            <div className="col-lg-8">
              <div className={styles.mapWrapper}>
                <div id="detailMap" className={styles.mapContainer}></div>

                {/* Hiển thị tọa độ khi di chuột */}
                {showCoords && (
                  <div className={styles.coordBox}>
                    Tọa độ: ({worldPos.x}m, {worldPos.y}m)
                  </div>
                )}
              </div>
            </div>

            {/* ========================= CỘT BÊN PHẢI ========================= */}
            <div className="col-lg-4">
              {/* ========================= DANH SÁCH ROBOT ========================= */}
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
                            {mapRobotStatus(r.status)}
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

              {/* ========================= DANH SÁCH ĐIỂM ĐẾN ========================= */}
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
                            {d.area} -{" "}
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

              {/* ========================= DANH SÁCH PHÒNG ========================= */}
              <div className={styles.infoCard}>
                <h5>
                  <i className="bi bi-door-open me-2"></i>
                  Phòng ({rooms.length})
                </h5>

                {roomsLoading ? (
                  <p className={styles.empty}>
                    <i className="bi bi-hourglass-split me-2"></i>
                    Đang tải...
                  </p>
                ) : rooms.length > 0 ? (
                  <div className={styles.roomList}>
                    {rooms
                      .sort((a, b) => {
                        // Sắp xếp theo tên phòng
                        const nameA = (a.roomName || "").toLowerCase();
                        const nameB = (b.roomName || "").toLowerCase();
                        return nameA.localeCompare(nameB);
                      })
                      .map((room) => (
                        <div
                          key={room.id}
                          className={styles.roomItem}
                          onClick={() => navigate(`/rooms/${room.id}`)}
                        >
                          <div>
                            <strong>
                              <i className="bi bi-door-open me-1"></i>
                              {room.roomName || `Phòng #${room.id}`}
                            </strong>
                            {room.roomType && (
                              <small>
                                <br />
                                <i className="bi bi-tag me-1"></i>
                                {room.roomType}
                              </small>
                            )}
                          </div>
                          {room.patientCount !== undefined && room.patientCount > 0 && (
                            <div className={styles.roomMeta}>
                              <span className={styles.patientCount}>
                                <i className="bi bi-people me-1"></i>
                                {room.patientCount} bệnh nhân
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className={styles.empty}>Chưa có phòng</p>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* END GLASS */}
      </div>
    </div>
  );
}
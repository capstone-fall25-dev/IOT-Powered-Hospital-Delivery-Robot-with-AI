import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

export default function CreateMap() {
  const mapRef = useRef(null);
  const robotMarker = useRef(null);
  const mapLayer = useRef(null);
  const [connection, setConnection] = useState(null);
  const [status, setStatus] = useState("🕓 Đang kết nối tới robot...");

  // ==========================================================
  // 🧭 Load CSS/JS (Bootstrap + Leaflet)
  // ==========================================================
  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href =
      "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
    document.head.appendChild(css);

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
      document.head.removeChild(leafletCss);
      document.body.removeChild(leafletJs);
    };
  }, []);

  // ==========================================================
  // ⚙️ Kết nối SignalR để nhận map update & vị trí robot
  // ==========================================================
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5170/hubs/robotposition")
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    conn.on("ReceiveMapUpdate", (map) => {
      console.log("🗺️ Map Update:", map);
      drawMap(map);
    });

    conn.on("ReceivePosition", (pos) => {
      console.log("🤖 Robot Position:", pos);
      updateRobotPosition(pos);
    });

    conn.onreconnected(() => setStatus("✅ Kết nối lại thành công!"));
    conn.onclose(() => setStatus("❌ Mất kết nối với Hub"));

    conn
      .start()
      .then(() => setStatus("✅ Đã kết nối SignalR - đang nhận dữ liệu bản đồ..."))
      .catch((err) => setStatus("❌ Lỗi SignalR: " + err.message));

    setConnection(conn);

    return () => conn.stop();
  }, []);

  // ==========================================================
  // 🗺️ Hàm vẽ map từ dữ liệu ROS2 (base64 grayscale)
  // ==========================================================
  function drawMap(mapData) {
    if (!window.L) return;

    const L = window.L;

    // Giải mã ảnh base64 PGM → PNG
    const imgSrc = `data:image/png;base64,${mapData.data_b64}`;

    const res = mapData.resolution || 0.05;
    const width = mapData.width || 800;
    const height = mapData.height || 800;
    const originX = mapData.origin?.x || 0;
    const originY = mapData.origin?.y || 0;

    const bounds = [
      [originY + height * res, originX + width * res],
      [originY, originX],
    ];

    if (!mapRef.current) {
      mapRef.current = L.map("map", {
        crs: L.CRS.Simple,
        zoomControl: false,
        minZoom: -5,
        maxZoom: 5,
      });
      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
    }

    if (mapLayer.current) mapRef.current.removeLayer(mapLayer.current);

    mapLayer.current = L.imageOverlay(imgSrc, bounds).addTo(mapRef.current);
    mapRef.current.fitBounds(bounds);
  }

  // ==========================================================
  // 🤖 Hiển thị vị trí robot (marker icon)
  // ==========================================================
  function updateRobotPosition(pos) {
    if (!window.L || !mapRef.current) return;
    const L = window.L;

    const icon = L.divIcon({
      className: "robot-marker",
      html: `<div style="transform: rotate(${pos.theta}rad); font-size: 24px;">🤖</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const latlng = [pos.y, pos.x];

    if (!robotMarker.current) {
      robotMarker.current = L.marker(latlng, { icon }).addTo(mapRef.current);
    } else {
      robotMarker.current.setLatLng(latlng);
      robotMarker.current.setIcon(icon);
    }
  }

  // ==========================================================
  // 🕹️ Điều khiển robot bằng phím A/W/S/D/X
  // ==========================================================
  useEffect(() => {
    const handleKey = async (e) => {
      const key = e.key.toLowerCase();
      if (!["w", "a", "s", "d", "x"].includes(key)) return;

      try {
        await fetch("http://localhost:5170/api/RobotMode/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        console.log(`🕹️ Gửi lệnh: ${key}`);
      } catch (err) {
        console.error("❌ Lỗi khi gửi lệnh điều khiển:", err);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ==========================================================
  // 🧩 Giao diện
  // ==========================================================
  return (
    <div
      className="page"
      style={{
        fontFamily: "Inter, sans-serif",
        background: "#e6f4f1",
        minHeight: "100vh",
      }}
    >
      <div className="container-fluid py-3">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h3 className="fw-bold mb-0">🗺️ Create Map (Live Mapping)</h3>
          <span className="badge bg-info text-dark px-3 py-2">{status}</span>
        </div>

        <div className="position-relative">
          <div
            id="map"
            className="rounded-3 shadow-sm"
            style={{
              width: "100%",
              height: "78vh",
              background: "#d9ebe7",
            }}
          ></div>

          {/* Hướng dẫn phím */}
          <div
            className="position-absolute top-0 end-0 m-3 p-3 bg-white shadow rounded-3"
            style={{ fontSize: 14 }}
          >
            <div className="fw-bold mb-1">🕹️ Điều khiển robot</div>
            <div>W: Tiến</div>
            <div>S: Dừng</div>
            <div>A: Rẽ trái</div>
            <div>D: Rẽ phải</div>
            <div>X: Lùi</div>
          </div>
        </div>
      </div>

      {/* CSS robot marker */}
      <style>{`
        .robot-marker {
          transition: transform 0.2s ease;
        }
      `}</style>
    </div>
  );
}

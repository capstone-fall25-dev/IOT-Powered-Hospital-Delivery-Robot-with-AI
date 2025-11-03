import { useEffect, useRef, useState } from "react";

export default function ViewListMap() {
  const mapRef = useRef(null);

  // State chứa map từ API
  const [mapInfo, setMapInfo] = useState(null);

  // ✅ Lấy dữ liệu map (ID = 2)
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

  // ✅ Khi mapInfo có dữ liệu → render ảnh bản đồ
  useEffect(() => {
    const i = setInterval(() => {
      if (window.L && mapInfo && !mapRef.current) {
        const L = window.L;
        mapRef.current = L.map("map", {
          crs: L.CRS.Simple,
          minZoom: -5,
          maxZoom: 5,
          zoomControl: false,
        });

        // Giải mã ảnh base64
        const imageUrl = `data:image/png;base64,${mapInfo.imageData}`;
        // Nếu width/height null → tạm lấy theo tỉ lệ map ROS2
        const width = 10; // mét giả định (có thể thay)
        const height = 10;
        const res = mapInfo.resolution || 0.05;

        // ✅ Tính bounds theo resolution
        const imageBounds = [
          [0, 0],
          [height * res * 20, width * res * 20], // nhân đôi để mở rộng hiển thị
        ];

        // Hiển thị ảnh map
        L.imageOverlay(imageUrl, imageBounds).addTo(mapRef.current);
        mapRef.current.fitBounds(imageBounds);

        // Thêm control zoom
        L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

        console.log("✅ Bản đồ đã tải:", mapInfo.mapName);
      }
    }, 100);
    return () => clearInterval(i);
  }, [mapInfo]);

  // ✅ Nạp CSS/JS của Leaflet
  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);

    const leafletJs = document.createElement("script");
    leafletJs.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    leafletJs.defer = true;
    document.body.appendChild(leafletJs);

    return () => {
      document.head.removeChild(css);
      document.body.removeChild(leafletJs);
    };
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <h3 className="p-2 text-center">🗺️ Bản đồ từ API MapUpload (ID=2)</h3>
      {!mapInfo && <p className="text-center text-muted">Đang tải bản đồ...</p>}
      <div id="map" style={{ height: "90vh", background: "#eaf4f3" }}></div>
    </div>
  );
}

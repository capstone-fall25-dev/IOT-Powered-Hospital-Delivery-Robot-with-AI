import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API_CONFIG } from "@/utils/apiConfig";
import styles from "@/assets/styles/projectMapListView.module.css";

import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIcon2xPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

import { createRoom, updateRoom } from "@/services/roomService";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";

// Fix icon path Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xPng,
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
});

export default function DestinationByMapView() {
  const { toast, showToast } = useToast();
  // ================== MAP STATE ==================
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // picking cho ĐIỂM ĐẾN
  const isPickingRef = useRef(false);

  // picking cho PHÒNG
  const roomPickingRef = useRef(false);

  // Layer chứa tất cả marker phòng
  const roomsLayerRef = useRef(null);

  // Layer chứa tất cả marker điểm đến
  const destinationsLayerRef = useRef(null);

  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [mapInfo, setMapInfo] = useState(null);

  // ===== ĐIỂM ĐẾN =====
  const [destinations, setDestinations] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);

  // form edit / create cho điểm đến
  const [mode, setMode] = useState("view"); // "view" | "edit" | "create"
  const [isPicking, setIsPicking] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPos, setFormPos] = useState({ x: null, y: null });

  // Thêm state chung để track selection mode
const [selectionMode, setSelectionMode] = useState(null); // "destination" | "room" 

  // ===== PHÒNG =====
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [roomMode, setRoomMode] = useState("view"); // "view" | "edit" | "create"
  const [roomIsPicking, setRoomIsPicking] = useState(false);
  const [roomForm, setRoomForm] = useState({
    roomName: "",
    latitude: "",
    longitude: "",
  });

  // ================== HELPER: WORLD <-> LEAFLET ==================
  function latLngToWorld(lat, lng) {
    if (!mapInfo) return null;
    return {
      x: lng + mapInfo.originX,
      y: lat + mapInfo.originY,
    };
  }

  function worldToLatLng(worldX, worldY) {
    if (!mapInfo) return null;
    const localX = worldX - mapInfo.originX;
    const localY = worldY - mapInfo.originY;
    return L.latLng(localY, localX);
  }

  function placeMarkerAtLocal(localX, localY) {
    if (!mapRef.current) return;
    const latlng = L.latLng(localY, localX);

    if (!markerRef.current) {
      markerRef.current = L.marker(latlng).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng(latlng);
    }

    mapRef.current.panTo(latlng);
  }

  function placeMarkerAtWorld(worldX, worldY) {
  const latlng = worldToLatLng(worldX, worldY);
  if (!latlng || !mapRef.current) return;

  const redDotIcon = L.divIcon({ /* ... */ });

  if (!markerRef.current) {
    markerRef.current = L.marker(latlng, { icon: redDotIcon }).addTo(mapRef.current);
  } else {
    markerRef.current.setLatLng(latlng);
  }

  // ✅ Pan nhẹ nhàng, không thay đổi zoom
  mapRef.current.panBy([0, 0], { 
    duration: 0.5, // animate mượt
    easeLinearity: 0.25 
  });
}


  async function reloadRoomsForSelectedMap() {
    if (!selectedMap) return;
    try {
      const res = await fetch(API_CONFIG.API_BASE1 + "/api/Rooms");
      const data = await res.json();

      const filtered = data.filter(
        (r) => Number(r.mapId) === Number(selectedMap.id)
      );

      setRooms(filtered);
      setSelectedRoom(null);
      setRoomMode("view");
      setRoomIsPicking(false);
      roomPickingRef.current = false;
      setRoomForm({
        roomName: "",
        latitude: "",
        longitude: "",
      });
    } catch (err) {
      console.error("❌ Lỗi tải danh sách phòng:", err);
    }
  }
// Sửa useEffect inject CSS
useEffect(() => {
  const styleId = "destination-map-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.15); opacity: 0.85; }
        100% { transform: scale(1); opacity: 1; }
      }
      
      /* Tooltip được chọn - nền trắng, viền màu */
      .selected-tooltip {
        background-color: #fff !important;
        border: 2px solid #e74c3c !important;
        color: #c0392b !important;
        font-weight: 600 !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
      }
      .selected-tooltip::before {
        border-top-color: #e74c3c !important;
      }
      
      /* Tooltip phòng được chọn */
      .selected-room-tooltip {
        background-color: #fff !important;
        border: 2px solid #2980b9 !important;
        color: #2980b9 !important;
        font-weight: 600 !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
      }
      .selected-room-tooltip::before {
        border-top-color: #2980b9 !important;
      }
    `;
    document.head.appendChild(style);
  }
}, []);


  // ================== LOAD MAP LIST ==================
  useEffect(() => {
    async function fetchMaps() {
      try {
        const res = await fetch(API_CONFIG.API_BASE1 + "/api/Maps");
        const data = await res.json();
        setMaps(data || []);
        if (data && data.length > 0) setSelectedMap(data[0]);
      } catch (err) {
        console.error("❌ Lỗi tải danh sách bản đồ:", err);
      }
    }
    fetchMaps();
  }, []);

  // ================== LOAD MAP INFO + DESTINATIONS + ROOMS ==================
  useEffect(() => {
    if (!selectedMap) return;

    async function fetchMapInfo() {
      try {
        const res = await fetch(
          API_CONFIG.API_BASE1 + `/api/MapsUpload/${selectedMap.id}`
        );

        if (!res.ok) {
          console.warn("MapUpload chưa tồn tại cho map", selectedMap.id);
          setMapInfo(null);
          return;
        }

        const data = await res.json();
        setMapInfo(data);
      } catch (err) {
        console.error("❌ Lỗi tải metadata bản đồ:", err);
        setMapInfo(null);
      }
    }

    async function fetchDestinationsByMap() {
      try {
        const res = await fetch(
          API_CONFIG.API_BASE1 + `/api/Destinations/by-map/${selectedMap.id}`
        );
        const data = await res.json();
        setDestinations(data || []);
        setSelectedDestination(null);
        setMode("view");
        setFormName("");
        setFormPos({ x: null, y: null });
      } catch (err) {
        console.error("❌ Lỗi tải điểm đến:", err);
      }
    }

    fetchMapInfo();
    fetchDestinationsByMap();
    reloadRoomsForSelectedMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMap]);

  // ================== INIT & RENDER MAP ==================
  useEffect(() => {
    if (!mapInfo || !selectedMap) return;

    // dọn map cũ
    if (mapRef.current) {
      mapRef.current.off();
      mapRef.current.remove();
      mapRef.current = null;
    }

    if (markerRef.current) {
      markerRef.current.remove?.();
      markerRef.current = null;
    }

    const map = L.map("destination-map", {
      crs: L.CRS.Simple,
      minZoom: -5,
      maxZoom: 10,
      zoomControl: false,
    });

    const imageUrl =
      API_CONFIG.API_BASE1 + `/api/MapsUpload/${selectedMap.id}/image`;

    const res = mapInfo.resolution;
    const img = new Image();

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

    img.onerror = () => {
      console.error("Không load được ảnh bản đồ:", imageUrl);
    };

    img.src = imageUrl;

    mapRef.current = map;

    // layer chứa marker phòng
    roomsLayerRef.current = L.layerGroup().addTo(map);

    // layer chứa marker điểm đến
    destinationsLayerRef.current = L.layerGroup().addTo(map);

    const coordDiv = document.getElementById("dest-coordinates");
    if (coordDiv) {
      coordDiv.textContent = "World: (...)";
    }

    function handleMouseMove(e) {
      if (!coordDiv) return;
      const world = latLngToWorld(e.latlng.lat, e.latlng.lng);
      if (!world) return;
      coordDiv.textContent = `World: X = ${world.x.toFixed(
        2
      )}, Y = ${world.y.toFixed(2)}`;
    }

    function handleClick(e) {
      const world = latLngToWorld(e.latlng.lat, e.latlng.lng);
      if (!world) return;

      // Đang chọn vị trí cho ĐIỂM ĐẾN
      if (isPickingRef.current) {
        setFormPos({ x: world.x, y: world.y });
        isPickingRef.current = false;
        setIsPicking(false);
        return;
      }

      // Đang chọn vị trí cho PHÒNG
      if (roomPickingRef.current) {
        setRoomForm((prev) => ({
          ...prev,
          longitude: world.x.toFixed(6),
          latitude: world.y.toFixed(6),
        }));
        roomPickingRef.current = false;
        setRoomIsPicking(false);
      }
    }

    map.on("mousemove", handleMouseMove);
    map.on("click", handleClick);

    return () => {
      map.off("mousemove", handleMouseMove);
      map.off("click", handleClick);
      map.remove();
      mapRef.current = null;

      if (markerRef.current) {
        markerRef.current.remove?.();
        markerRef.current = null;
      }

      roomsLayerRef.current = null;
      destinationsLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInfo, selectedMap]);

  // khi formPos (điểm đến) thay đổi -> cập nhật marker
  useEffect(() => {
    if (!mapRef.current || !mapInfo) return;
    if (formPos.x == null || formPos.y == null) return;
    placeMarkerAtWorld(formPos.x, formPos.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formPos.x, formPos.y, mapInfo]);

 // Khi danh sách phòng thay đổi -> vẽ lại toàn bộ marker phòng
useEffect(() => {
  if (!mapRef.current || !mapInfo || !roomsLayerRef.current) return;

  const layer = roomsLayerRef.current;
  layer.clearLayers();

  rooms.forEach((room) => {
    if (
      room.latitude == null ||
      room.longitude == null ||
      room.latitude === "" ||
      room.longitude === ""
    )
      return;

    const worldX = Number(room.longitude);
    const worldY = Number(room.latitude);
    const latlng = worldToLatLng(worldX, worldY);
    if (!latlng) return;

    const label =
      room.roomName || room.name || `Phòng ${room.id ?? "không tên"}`;
    const isSelected = selectedRoom?.id === room.id;

    let marker;
    if (isSelected) {
      // Icon nổi bật cho phòng được chọn - giữ nguyên marker xanh nhưng to hơn
      const selectedRoomIcon = L.divIcon({
        html: `<div style="
          position: relative;
        ">
          <div style="
            width: 0;
            height: 0;
            border-left: 12px solid transparent;
            border-right: 12px solid transparent;
            border-top: 20px solid #2980b9;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          "></div>
          <div style="
            position: absolute;
            top: 2px;
            left: 50%;
            transform: translateX(-50%);
            width: 8px;
            height: 8px;
            background: #fff;
            border-radius: 50%;
          "></div>
        </div>`,
        iconSize: [24, 20],
        iconAnchor: [12, 20],
        className: "",
      });
      marker = L.marker(latlng, { icon: selectedRoomIcon });
    } else {
      marker = L.marker(latlng);
    }

    marker.bindTooltip(label, {
      permanent: true,
      direction: "top",
      offset: L.point(0, isSelected ? -12 : -10),
      opacity: 1,
      className: isSelected ? "selected-room-tooltip" : "",
    });

    marker.addTo(layer);
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [rooms, mapInfo, selectedRoom]);


// Khi danh sách điểm đến thay đổi -> vẽ lại toàn bộ marker điểm đến (chấm đỏ)
useEffect(() => {
  if (!mapRef.current || !mapInfo || !destinationsLayerRef.current) return;

  const layer = destinationsLayerRef.current;
  layer.clearLayers();

  destinations.forEach((dest) => {
    if (dest.x == null || dest.y == null) return;

    const latlng = worldToLatLng(dest.x, dest.y);
    if (!latlng) return;

    const label = dest.name || `Điểm ${dest.id ?? "không tên"}`;
    const isSelected = selectedDestination?.id === dest.id;

    // Icon chấm đỏ - nổi bật khi được chọn
    const redDotIcon = L.divIcon({
      html: `<div style="
        width: ${isSelected ? "18px" : "14px"};
        height: ${isSelected ? "18px" : "14px"};
        background-color: ${isSelected ? "#c0392b" : "#e74c3c"};
        border: ${isSelected ? "3px solid #fff" : "2px solid #c0392b"};
        border-radius: 50%;
        box-shadow: ${isSelected ? "0 0 0 2px #c0392b, 0 4px 8px rgba(0,0,0,0.3)" : "0 2px 4px rgba(0,0,0,0.3)"};
      "></div>`,
      iconSize: [isSelected ? 18 : 14, isSelected ? 18 : 14],
      iconAnchor: [isSelected ? 9 : 7, isSelected ? 9 : 7],
      className: "",
    });

    const marker = L.marker(latlng, { icon: redDotIcon });

    marker.bindTooltip(label, {
      permanent: true,
      direction: "top",
      offset: L.point(0, isSelected ? -12 : -10),
      opacity: 1,
      className: isSelected ? "selected-tooltip" : "",
    });

    marker.addTo(layer);

    // if (isSelected) {
    //   mapRef.current.panTo(latlng);
    // }
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [destinations, mapInfo, selectedDestination]);


  // // khi chọn phòng -> pan tới phòng đó
  // useEffect(() => {
  //   if (!selectedRoom || !mapInfo || !mapRef.current) return;

  //   const worldX = Number(selectedRoom.longitude);
  //   const worldY = Number(selectedRoom.latitude);
  //   const latlng = worldToLatLng(worldX, worldY);
  //   if (!latlng) return;

  //   mapRef.current.panTo(latlng);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [selectedRoom, mapInfo]);

  // ================== HANDLERS: MAP / DESTINATION ==================
  function handleChangeMap(e) {
    const id = Number(e.target.value);
    const m = maps.find((x) => x.id === id) || null;
    setSelectedMap(m);
  }

  // Sửa các handler select để deselect bên kia
function handleSelectDestinationRow(dest) {
  setSelectedDestination(dest);
  setSelectedRoom(null);
  setSelectionMode("destination");
  setMode("view");
  setFormName(dest.name);
  setFormPos({ x: dest.x, y: dest.y });
  // Không gọi placeMarkerAtWorld nữa
}

  function startEditSelected() {
  if (!selectedDestination) {
    showToast("warning", "Chọn một điểm đến trước!");
    return;
  }
  setSelectedRoom(null); // Clear room selection
  setSelectionMode("destination");
  setMode("edit");
  setFormName(selectedDestination.name);
  setFormPos({ x: selectedDestination.x, y: selectedDestination.y });
}

  function startCreateNew() {
  if (!selectedMap) {
    showToast("warning", "Chưa chọn bản đồ!");
    return;
  }
  setSelectedRoom(null); // Clear room selection
  setSelectionMode("destination");
  setMode("create");
  setSelectedDestination(null);
  setFormName("");
  setFormPos({ x: null, y: null });

  if (markerRef.current && mapRef.current) {
    mapRef.current.removeLayer(markerRef.current);
    markerRef.current = null;
  }
}

  function handlePickOnMap() {
  if (!mapInfo || !selectedMap) {
    showToast("warning", "Chưa có bản đồ để chọn!");
    return;
  }
  // Tắt picking phòng
  roomPickingRef.current = false;
  setRoomIsPicking(false);
  
  // Clear room selection khi pick destination
  setSelectedRoom(null);

  isPickingRef.current = true;
  setIsPicking(true);
  setSelectionMode("destination");
  showToast("info", "🖱️ Click lên bản đồ để chọn vị trí cho điểm dừng.");
}

  function handleCancelEdit() {
  setMode("view");
  setIsPicking(false);
  isPickingRef.current = false;
  setFormName("");
  setFormPos({ x: null, y: null });
  setSelectedDestination(null); // Clear selection
  setSelectionMode(null);

  if (markerRef.current && mapRef.current) {
    mapRef.current.removeLayer(markerRef.current);
    markerRef.current = null;
  }
}

  async function handleSaveDestination() {
    if (!selectedMap) {
      showToast("warning", "Chưa chọn bản đồ!");
      return;
    }
    if (!formName.trim() || formPos.x == null || formPos.y == null) {
      showToast("warning", "Nhập tên điểm và chọn vị trí trên bản đồ!");
      return;
    }

    const payload = {
      name: formName.trim(),
      mapId: selectedMap.id,
      x: formPos.x,
      y: formPos.y,
    };

    try {
      if (mode === "edit" && selectedDestination) {
        const res = await fetch(
          API_CONFIG.API_BASE1 + `/api/Destinations/${selectedDestination.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          let errBody = {};
          try {
            errBody = await res.json();
          } catch (_) {}
          throw new Error(errBody.message || "Không thể cập nhật điểm đến.");
        }

        const updated = await res.json();

        setDestinations((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d))
        );
        setSelectedDestination(updated);
        showToast("success", "✅ Đã cập nhật điểm đến!");
      } else if (mode === "create") {
        const res = await fetch(API_CONFIG.API_BASE1 + "/api/Destinations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let errBody = {};
          try {
            errBody = await res.json();
          } catch (_) {}
          throw new Error(errBody.message || "Không thể tạo điểm đến.");
        }

        const created = await res.json();
        setDestinations((prev) => [...prev, created]);
        setSelectedDestination(created);
        showToast("success", "✅ Đã tạo điểm đến mới!");

        setMode("view");
      }

      // Xóa marker tạm sau khi lưu
      if (markerRef.current && mapRef.current) {
        mapRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    } catch (err) {
      const msg = err && err.message ? err.message : "Lỗi không xác định.";
      showToast("error", "❌ Lỗi: " + msg);
    }
  }

  // ================== HANDLERS: ROOMS ==================
  function handleSelectRoom(room) {
  setSelectedRoom(room);
  setSelectedDestination(null); // Deselect destination
  setSelectionMode("room");
  setRoomMode("view");
  setRoomForm({
    roomName: room.roomName || "",
    latitude:
      room.latitude !== null && room.latitude !== undefined
        ? String(room.latitude)
        : "",
    longitude:
      room.longitude !== null && room.longitude !== undefined
        ? String(room.longitude)
        : "",
  });
}

  function startEditSelectedRoom() {
  if (!selectedRoom) {
    showToast("warning", "Chọn một phòng trước!");
    return;
  }
  setSelectedDestination(null); // Clear destination selection
  setSelectionMode("room");
  setRoomMode("edit");
  setRoomForm({
    roomName: selectedRoom.roomName || "",
    latitude:
      selectedRoom.latitude !== null && selectedRoom.latitude !== undefined
        ? String(selectedRoom.latitude)
        : "",
    longitude:
      selectedRoom.longitude !== null && selectedRoom.longitude !== undefined
        ? String(selectedRoom.longitude)
        : "",
  });
}
 function startCreateNewRoom() {
  if (!selectedMap) {
    showToast("warning", "Chưa chọn bản đồ!");
    return;
  }
  setSelectedDestination(null); // Clear destination selection
  setSelectionMode("room");
  setRoomMode("create");
  setSelectedRoom(null);
  setRoomForm({
    roomName: "",
    latitude: "",
    longitude: "",
  });
}

 function handleRoomPickOnMap() {
  if (!mapInfo || !selectedMap) {
    showToast("warning", "Chưa có bản đồ để chọn!");
    return;
  }
  
  // Tắt picking destination
  isPickingRef.current = false;
  setIsPicking(false);
  
  // Clear destination selection khi pick room
  setSelectedDestination(null);

  roomPickingRef.current = true;
  setRoomIsPicking(true);
  setSelectionMode("room");
  showToast("info", "🖱️ Click lên bản đồ để chọn vị trí cho PHÒNG.");
}

 function handleCancelRoomEdit() {
  setRoomMode("view");
  setRoomIsPicking(false);
  roomPickingRef.current = false;
  setRoomForm({
    roomName: "",
    latitude: "",
    longitude: "",
  });
  setSelectedRoom(null); // Clear selection
  setSelectionMode(null);
}

  async function handleSaveRoom() {
    if (!selectedMap) {
      showToast("warning", "Chưa chọn bản đồ!");
      return;
    }
    if (
      !roomForm.roomName.trim() ||
      !roomForm.latitude.trim() ||
      !roomForm.longitude.trim()
    ) {
      showToast("warning", "Nhập tên phòng và chọn toạ độ!");
      return;
    }

    const payload = {
      roomName: roomForm.roomName.trim(),
      latitude: parseFloat(roomForm.latitude),
      longitude: parseFloat(roomForm.longitude),
      mapId: selectedMap.id,
    };

    try {
      if (roomMode === "edit" && selectedRoom) {
        await updateRoom(selectedRoom.id, payload);
        await reloadRoomsForSelectedMap();
        showToast("success", "✅ Đã cập nhật phòng!");
      } else if (roomMode === "create") {
        await createRoom(payload);
        await reloadRoomsForSelectedMap();
        showToast("success", "✅ Đã tạo phòng mới!");
      }

      setRoomMode("view");
      setRoomIsPicking(false);
      roomPickingRef.current = false;
    } catch (err) {
      const msg = err && err.message ? err.message : "Lỗi không xác định.";
      showToast("error", "❌ Lỗi: " + msg);
    }
  }

  // ================== UI ==================
  return (
    <div className={styles.page}>
      <div className="container-fluid py-4">
        <div className="container-xl">
          {/* HEADER */}
          <div className={styles.headerSection}>
            <div>
              <h2 className={styles.pageTitle}>
                <i
                  className="bi bi-geo-alt-fill me-2"
                  style={{ color: "var(--teal-dark)" }}
                ></i>
                Điểm đến theo bản đồ
              </h2>
              <div className={styles.subtitle}>
                <i className="bi bi-map me-1"></i>
                Chọn bản đồ, xem và chỉnh sửa các điểm đến / phòng.
              </div>
            </div>
          </div>
        </div>

        <div className="container-fluid">
          <div className="row g-3">
            {/* ============== SIDEBAR ============== */}
            <div className="col-lg-4 col-xl-3">
              <div className={styles.sidebar}>
                {/* Chọn bản đồ */}
                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      marginBottom: "0.25rem",
                      display: "block",
                    }}
                  >
                    Chọn bản đồ
                  </label>
                  <select
                    className="form-select"
                    value={selectedMap?.id || ""}
                    onChange={handleChangeMap}
                  >
                    {maps.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nameMapFE || m.mapName}
                      </option>
                    ))}
                  </select>
                </div>
               {selectionMode && (
                <div style={{
                  padding: "0.5rem",
                  background: selectionMode === "destination" ? "rgba(231,76,60,0.1)" : "rgba(41,128,185,0.1)",
                  borderRadius: "0.5rem",
                  marginBottom: "1rem",
                  border: `2px solid ${selectionMode === "destination" ? "#e74c3c" : "#2980b9"}`
                }}>
                  <small style={{ fontWeight: 600, color: selectionMode === "destination" ? "#e74c3c" : "#2980b9" }}>
                    <i className={`bi bi-${selectionMode === "destination" ? "geo-alt-fill" : "door-open-fill"} me-1`}></i>
                    Đang chọn: {selectionMode === "destination" ? "Điểm đến" : "Phòng"}
                  </small>
                </div>
              )}

                {/* Danh sách điểm đến */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "var(--teal-dark)",
                    }}
                  >
                    Danh sách điểm đến
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      opacity: 0.7,
                    }}
                  >
                    {destinations.length} điểm
                  </span>
                </div>

                {destinations.length === 0 && (
                  <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                    Chưa có điểm đến nào trên bản đồ này.
                  </div>
                )}

                {destinations.map((d) => (
                  <div
                    key={d.id}
                    className={`${styles.mapItem} ${
                      selectedDestination?.id === d.id
                        ? styles.mapItemActive
                        : ""
                    }`}
                    onClick={() => handleSelectDestinationRow(d)}
                  >
                    <div className={styles.mapItemHeader}>
                      <div className={styles.mapIcon}>
                        <i className="bi bi-geo-alt-fill"></i>
                      </div>
                      <h6 className={styles.mapTitle}>{d.name}</h6>
                    </div>
                    <div className={styles.mapItemFooter}>
                      <div className={styles.mapRosName}>
                        X: {d.x?.toFixed(2)} • Y: {d.y?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Actions cho điểm đến */}
                <div
                  style={{
                    marginTop: "1rem",
                    marginBottom: "0.75rem",
                    display: "flex",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    className={styles.btnTeal}
                    style={{ flex: 1 }}
                    onClick={startEditSelected}
                    disabled={!selectedDestination}
                  >
                    <i className="bi bi-pencil-square me-1"></i>
                    Sửa điểm đã chọn
                  </button>
                  <button
                    className={styles.btnTeal}
                    style={{ flex: 1 }}
                    onClick={startCreateNew}
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    Thêm điểm mới
                  </button>
                </div>

                {/* ================== PHÒNG ================== */}
                <hr style={{ margin: "1rem 0" }} />

                {/* Danh sách phòng */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "var(--teal-dark)",
                    }}
                  >
                    Danh sách phòng
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      opacity: 0.7,
                    }}
                  >
                    {rooms.length} phòng
                  </span>
                </div>

                {rooms.length === 0 && (
                  <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                    Chưa có phòng nào gán cho bản đồ này.
                  </div>
                )}

                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className={`${styles.mapItem} ${
                      selectedRoom?.id === r.id ? styles.mapItemActive : ""
                    }`}
                    onClick={() => handleSelectRoom(r)}
                  >
                    <div className={styles.mapItemHeader}>
                      <div className={styles.mapIcon}>
                        <i className="bi bi-door-open-fill"></i>
                      </div>
                      <h6 className={styles.mapTitle}>{r.roomName}</h6>
                    </div>
                    <div className={styles.mapItemFooter}>
                      <div className={styles.mapRosName}>
                        Lat:{" "}
                        {r.latitude != null
                          ? Number(r.latitude).toFixed(2)
                          : "--"}{" "}
                        • Lng:{" "}
                        {r.longitude != null
                          ? Number(r.longitude).toFixed(2)
                          : "--"}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Actions cho phòng */}
                <div
                  style={{
                    marginTop: "1rem",
                    display: "flex",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    className={styles.btnTeal}
                    style={{ flex: 1 }}
                    onClick={startEditSelectedRoom}
                    disabled={!selectedRoom}
                  >
                    <i className="bi bi-pencil-square me-1"></i>
                    Sửa phòng đã chọn
                  </button>
                  <button
                    className={styles.btnTeal}
                    style={{ flex: 1 }}
                    onClick={startCreateNewRoom}
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    Thêm phòng
                  </button>
                </div>

                {/* Form tạo / sửa phòng ngay dưới 2 nút */}
                {(roomMode === "edit" || roomMode === "create") && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      padding: "0.75rem",
                      borderRadius: "0.75rem",
                      border: "1px dashed rgba(0,0,0,0.08)",
                      background: "rgba(0,0,0,0.02)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        marginBottom: "0.5rem",
                        color: "var(--teal-dark)",
                      }}
                    >
                      <i className="bi bi-door-open-fill me-1"></i>
                      {roomMode === "edit"
                        ? "Chỉnh sửa phòng"
                        : "Thêm phòng mới"}
                    </div>

                    <div className="mb-2">
                      <label
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 500,
                          marginBottom: "0.25rem",
                        }}
                      >
                        Tên phòng
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={roomForm.roomName}
                        onChange={(e) =>
                          setRoomForm((prev) => ({
                            ...prev,
                            roomName: e.target.value,
                          }))
                        }
                        placeholder="Nhập tên phòng (VD: Phòng 101...)"
                      />
                    </div>

                   <div className="mb-2">
              <label
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  marginBottom: "0.25rem",
                }}
              >
                Tọa độ (World / Lat-Long)
              </label>

              <div
                style={{
                  fontSize: "0.85rem",
                  marginTop: "0.25rem",
                  opacity: 0.8,
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.4rem",
                  background: "rgba(0,0,0,0.02)",
                  border: "1px dashed rgba(0,0,0,0.06)",
                }}
              >
                {roomForm.latitude && roomForm.longitude ? (
                  <>
                    X = {parseFloat(roomForm.longitude).toFixed(2)}, Y ={" "}
                    {parseFloat(roomForm.latitude).toFixed(2)}
                  </>
                ) : (
                  <>Chưa chọn (bấm <strong>"Chọn vị trí trên bản đồ"</strong> rồi click lên bản đồ)</>
                )}
              </div>
            </div>


                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.5rem",
                                    marginTop: "0.5rem",
                                  }}
                                >
                                  <button
                                    type="button"
                                    className={styles.btnTeal}
                                    style={{ flex: 1 }}
                                    onClick={handleRoomPickOnMap}
                                    disabled={roomIsPicking}
                                  >
                                    <i className="bi bi-cursor-fill me-1"></i>
                                    {roomIsPicking
                                      ? "Đang chọn..."
                                      : "Chọn vị trí trên bản đồ"}
                                  </button>
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.5rem",
                                    marginTop: "0.5rem",
                                  }}
                                >
                                  <button
                                    type="button"
                                    className={styles.btnTeal}
                                    style={{ flex: 1 }}
                                    onClick={handleSaveRoom}
                                  >
                                    <i className="bi bi-save me-1"></i>
                                    {roomMode === "edit" ? "Lưu phòng" : "Tạo phòng"}
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.btnDanger}
                                    style={{ flex: 1 }}
                                    onClick={handleCancelRoomEdit}
                                  >
                                    <i className="bi bi-x-circle me-1"></i>
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
            </div>

            {/* ============== MAP + TOOLBAR ============== */}
            <div className="col-lg-8 col-xl-9 position-relative">
              <div id="destination-map" className={styles.mapContainer}></div>

              <div id="dest-coordinates" className={styles.coordinateDisplay}>
                World: (...)
              </div>

              {(mode === "edit" || mode === "create") && (
                <div className={styles.mapToolbar}>
                  <div className={styles.toolbarTitle}>
                    <i className="bi bi-geo-alt-fill"></i>
                    {mode === "edit"
                      ? "Sửa điểm đến"
                      : "Thêm điểm dừng mới trên bản đồ"}
                  </div>

                  <input
                    type="text"
                    className={styles.toolbarInput}
                    placeholder="Nhập tên điểm..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />

                  <div
                    style={{
                      fontSize: "0.85rem",
                      marginBottom: "0.5rem",
                      opacity: 0.8,
                    }}
                  >
                    Toạ độ:{" "}
                    {formPos.x != null && formPos.y != null
                      ? `X = ${formPos.x.toFixed(2)}, Y = ${formPos.y.toFixed(
                          2
                        )}`
                      : "Chưa chọn (click 'Chọn vị trí trên bản đồ')"}
                  </div>

                  <div className={styles.toolbarActions}>
                    <button
                      className={`${styles.btnTeal} flex-fill`}
                      onClick={handlePickOnMap}
                      disabled={isPicking}
                    >
                      <i className="bi bi-cursor-fill me-1"></i>
                      {isPicking ? "Đang chọn..." : "Chọn vị trí trên bản đồ"}
                    </button>

                    <button
                      className={`${styles.btnTeal} flex-fill`}
                      onClick={handleSaveDestination}
                    >
                      <i className="bi bi-save me-1"></i>
                      {mode === "edit" ? "Lưu cập nhật" : "Lưu điểm mới"}
                    </button>

                    <button
                      className={`${styles.btnDanger} flex-fill`}
                      onClick={handleCancelEdit}
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
      <Toast toast={toast} showToast={showToast} />
    </div>
  );
}

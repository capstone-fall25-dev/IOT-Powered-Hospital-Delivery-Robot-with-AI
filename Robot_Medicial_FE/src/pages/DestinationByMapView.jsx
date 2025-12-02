import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API_CONFIG } from "@/utils/apiConfig";
import styles from "@/assets/styles/projectMapListView.module.css";

import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIcon2xPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

// Fix icon path Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xPng,
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
});

export default function DestinationByMapView() {
  // ================== MAP STATE ==================
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const isPickingRef = useRef(false);

  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [mapInfo, setMapInfo] = useState(null);

  const [destinations, setDestinations] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);

  // form edit / create
  const [mode, setMode] = useState("view"); // "view" | "edit" | "create"
  const [isPicking, setIsPicking] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPos, setFormPos] = useState({ x: null, y: null });

  // ================== LOAD MAP LIST ==================
  useEffect(() => {
    async function fetchMaps() {
      try {
        const res = await fetch(API_CONFIG.API_BASE1 + "/api/Maps");
        const data = await res.json();
        setMaps(data);
        if (data.length > 0) setSelectedMap(data[0]);
      } catch (err) {
        console.error("❌ Lỗi tải danh sách bản đồ:", err);
      }
    }
    fetchMaps();
  }, []);

  // ================== LOAD MAP INFO (YAML) + DESTINATIONS ==================
  useEffect(() => {
    if (!selectedMap) return;

   async function fetchMapInfo() {
  try {
    const res = await fetch(
      API_CONFIG.API_BASE1 + `/api/MapsUpload/${selectedMap.id}`
    );

    if (!res.ok) {
      console.warn("MapUpload chưa tồn tại cho map", selectedMap.id);
      setMapInfo(null); // để effect phía trên dọn map và không vẽ gì
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
        setDestinations(data);
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
  }, [selectedMap]);

  // ================== INIT & RENDER MAP ==================
 useEffect(() => {
  if (!mapInfo || !selectedMap) return;

  // Dọn map cũ
  if (mapRef.current) {
    mapRef.current.off();
    mapRef.current.remove();
    mapRef.current = null;
  }

  // ❗ RẤT QUAN TRỌNG: dọn luôn marker cũ
  if (markerRef.current) {
    markerRef.current.remove?.(); // phòng trường hợp marker đã nằm trên map
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
  const originX = mapInfo.originX;
  const originY = mapInfo.originY;

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
    // optional: show toast/alert ở đây
  };

  img.src = imageUrl;

  // ... phần còn lại giữ nguyên (latLngToWorld, các event, vv.)

  mapRef.current = map;

  return () => {
    map.off();
    map.remove();
    mapRef.current = null;

    // dọn luôn marker khi unmount
    if (markerRef.current) {
      markerRef.current.remove?.();
      markerRef.current = null;
    }
  };
}, [mapInfo, selectedMap]);


  // ================== HELPER: đặt marker ==================
  function placeMarkerAtLocal(localX, localY) {
  if (!mapRef.current) return;
  const latlng = [localY, localX];

  if (!markerRef.current) {
    // lần đầu trên map mới → tạo marker mới và addTo(map hiện tại)
    markerRef.current = L.marker(latlng).addTo(mapRef.current);
  } else {
    // các lần sau chỉ update vị trí
    markerRef.current.setLatLng(latlng);
  }

  mapRef.current.panTo(latlng);
}


  function placeMarkerAtWorld(worldX, worldY) {
    if (!mapInfo) return;
    const localX = worldX - mapInfo.originX;
    const localY = worldY - mapInfo.originY;
    placeMarkerAtLocal(localX, localY);
  }

  // khi formPos thay đổi & map đã sẵn sàng -> cập nhật marker
  useEffect(() => {
    if (!mapRef.current || !mapInfo) return;
    if (formPos.x == null || formPos.y == null) return;
    placeMarkerAtWorld(formPos.x, formPos.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formPos.x, formPos.y, mapInfo]);

  // ================== HANDLERS ==================
  function handleChangeMap(e) {
    const id = Number(e.target.value);
    const m = maps.find((x) => x.id === id) || null;
    setSelectedMap(m);
  }

  function handleSelectDestinationRow(dest) {
    setSelectedDestination(dest);
    setMode("view");
    setFormName(dest.name);
    setFormPos({ x: dest.x, y: dest.y });

    if (dest.x != null && dest.y != null) {
      placeMarkerAtWorld(dest.x, dest.y);
    }
  }

  function startEditSelected() {
    if (!selectedDestination) {
      alert("Chọn một điểm đến trước!");
      return;
    }
    setMode("edit");
    setFormName(selectedDestination.name);
    setFormPos({ x: selectedDestination.x, y: selectedDestination.y });
  }

  function startCreateNew() {
    if (!selectedMap) {
      alert("Chưa chọn bản đồ!");
      return;
    }
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
      alert("Chưa có bản đồ để chọn!");
      return;
    }
    isPickingRef.current = true;
    setIsPicking(true);
    alert("🖱️ Click lên bản đồ để chọn vị trí cho điểm dừng.");
  }

  function handleCancelEdit() {
    setMode("view");
    setIsPicking(false);
    isPickingRef.current = false;
    setFormName("");
    setFormPos({ x: null, y: null });
  }

  // ================== API SAVE / UPDATE ==================
  async function handleSaveDestination() {
    if (!selectedMap) {
      alert("Chưa chọn bản đồ!");
      return;
    }
    if (!formName.trim() || formPos.x == null || formPos.y == null) {
      alert("Nhập tên điểm và chọn vị trí trên bản đồ!");
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
        alert("✅ Đã cập nhật điểm đến!");
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
        alert("✅ Đã tạo điểm đến mới!");

        setMode("view");
      }
    } catch (err) {
      const msg = err && err.message ? err.message : "Lỗi không xác định.";
      alert("❌ Lỗi: " + msg);
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
                Chọn bản đồ, xem và chỉnh sửa các điểm đến.
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
                      selectedDestination?.id === d.id ? styles.mapItemActive : ""
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

                {/* Actions */}
                <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
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
              </div>
            </div>

            {/* ============== MAP + TOOLBAR ============== */}
            <div className="col-lg-8 col-xl-9 position-relative">
              <div
                id="destination-map"
                className={styles.mapContainer}
              ></div>

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
    </div>
  );
}

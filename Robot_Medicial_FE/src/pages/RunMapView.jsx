// src/pages/RunMapView.jsx
// ⭐ View-only version: Chỉ hiển thị Camera + Maps (không có sidebar controls)
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import styles from "@/assets/styles/robotLiveConsole.module.css";
import mapError from "@/assets/image/map_error.jpg";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";

export default function RunMapView() {
    const [searchParams] = useSearchParams();
    const { toast, showToast } = useToast();

    // ===================================
    // MAP REFS
    // ===================================
    const navMapRef = useRef(null);
    const navMapLayer = useRef(null);
    const destinationMarker = useRef(null);
    const navRoomsLayerRef = useRef(null);

    const liveMapRef = useRef(null);
    const liveMapLayer = useRef(null);
    const robotMarker = useRef(null);
    const liveMapViewRef = useRef({ center: null, zoom: null });

    // ===================================
    // STATE
    // ===================================
    const [status, setStatus] = useState("Đang kết nối...");
    const [cameraFrame, setCameraFrame] = useState(null);

    const [destinations, setDestinations] = useState([]);
    const [selectedDestination, setSelectedDestination] = useState(null);
    const [selectedMapName, setSelectedMapName] = useState("");

    const [navProgress, setNavProgress] = useState({
        percent: 0,
        robotCode: "",
        pointName: "",
    });

    // ===================================
    // LOAD DESTINATIONS
    // ===================================
    useEffect(() => {
        async function fetchDestinations() {
            try {
                const res = await fetch(API_CONFIG.API_BASE1 + "/api/Destinations");
                const data = await res.json();
                setDestinations(data);
                
                // Ưu tiên 1: Lấy destinationId từ URL params
                const destinationIdParam = searchParams.get('destinationId');
                
                if (destinationIdParam && data && data.length > 0) {
                    const dest = data.find(d => String(d.id) === String(destinationIdParam));
                    if (dest) {
                        setSelectedDestination(dest);
                        loadNavigationMapForDestination(dest);
                        return;
                    }
                }
                
                // Ưu tiên 2: Lấy từ localStorage (sync với RunMap)
                try {
                    const storedDestinationId = localStorage.getItem('runMap_selectedDestinationId');
                    if (storedDestinationId && data && data.length > 0) {
                        const dest = data.find(d => String(d.id) === String(storedDestinationId));
                        if (dest) {
                            setSelectedDestination(dest);
                            loadNavigationMapForDestination(dest);
                            return;
                        }
                    }
                } catch (lsErr) {
                    console.warn("Không đọc được localStorage:", lsErr);
                }
                
                // Fallback: Dùng destination đầu tiên
                if (data && data.length > 0) {
                    setSelectedDestination(data[0]);
                    loadNavigationMapForDestination(data[0]);
                }
            } catch {
                // ignore
            }
        }
        fetchDestinations();
    }, [searchParams]);
    
    // ===================================
    // SYNC DESTINATION FROM RunMap (localStorage)
    // ===================================
    useEffect(() => {
        // Listen for localStorage changes (cross-tab sync)
        const handleStorageChange = (e) => {
            if (e.key === 'runMap_selectedDestinationId' && e.newValue && destinations.length > 0) {
                const dest = destinations.find(d => String(d.id) === String(e.newValue));
                if (dest && (!selectedDestination || String(selectedDestination.id) !== String(e.newValue))) {
                    setSelectedDestination(dest);
                    loadNavigationMapForDestination(dest);
                }
            }
        };
        
        // Listen for custom event (same-tab sync)
        const handleDestinationChange = () => {
            try {
                const storedId = localStorage.getItem('runMap_selectedDestinationId');
                if (storedId && destinations.length > 0) {
                    const dest = destinations.find(d => String(d.id) === String(storedId));
                    if (dest && (!selectedDestination || String(selectedDestination.id) !== String(storedId))) {
                        setSelectedDestination(dest);
                        loadNavigationMapForDestination(dest);
                    }
                }
            } catch (err) {
                console.warn("Error syncing destination:", err);
            }
        };
        
        // Poll localStorage mỗi 500ms để sync (cho cùng tab - storage event chỉ hoạt động cross-tab)
        const interval = setInterval(() => {
            try {
                const storedId = localStorage.getItem('runMap_selectedDestinationId');
                if (storedId && destinations.length > 0) {
                    const dest = destinations.find(d => String(d.id) === String(storedId));
                    if (dest && (!selectedDestination || String(selectedDestination.id) !== String(storedId))) {
                        setSelectedDestination(dest);
                        loadNavigationMapForDestination(dest);
                    }
                }
            } catch (err) {
                // ignore
            }
        }, 500);
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('runMap_destinationChanged', handleDestinationChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('runMap_destinationChanged', handleDestinationChange);
            clearInterval(interval);
        };
    }, [destinations, selectedDestination]);

    // ===================================
    // SIGNALR: POSITION + CAMERA
    // ===================================
    useEffect(() => {
        const posConn = new signalR.HubConnectionBuilder()
            .withUrl(API_CONFIG.API_BASE1 + "/hubs/robotposition")
            .withAutomaticReconnect()
            .build();

        const camConn = new signalR.HubConnectionBuilder()
            .withUrl(API_CONFIG.API_BASE1 + "/hubs/robotcamera")
            .withAutomaticReconnect()
            .build();

        posConn.on("ReceiveMapUpdate", (map) => drawLiveMap(map));
        posConn.on("ReceivePosition", (pos) => updateRobotPosition(pos));

        posConn.on("ReceiveNavigationProgress", (msg) => {
            try {
                const raw = msg?.text || msg?.Text || "";
                if (!raw || typeof raw !== "string") return;

                const parts = raw.split("|");
                const robotCode = parts[0] || "";
                const percentStr = parts[1] || "0";
                const pointName = parts[2] || "";

                let percent = parseFloat(percentStr);
                if (Number.isNaN(percent) || !Number.isFinite(percent)) percent = 0;
                percent = Math.min(100, Math.max(0, percent));

                setNavProgress({
                    percent,
                    robotCode,
                    pointName,
                });
            } catch (err) {
                console.error("Parse ReceiveNavigationProgress error:", err);
            }
        });

        camConn.on("ReceiveCameraFrame", (frame) => {
            if (frame?.image_b64)
                setCameraFrame(`data:image/jpeg;base64,${frame.image_b64}`);
        });

        posConn
            .start()
            .then(() => setStatus("Đã kết nối robot"))
            .catch(() => setStatus("Không kết nối được robot"));

        camConn.start().catch(() => {});

        return () => {
            posConn.stop();
            camConn.stop();
        };
    }, []);

    // ===================================
    // LIVE MAP
    // ===================================
    function drawLiveMap(mapData) {
        if (!window.L) return;
        const L = window.L;

        const base64 = mapData?.Data_b64 || mapData?.data_b64 || mapData?.data || null;
        if (!base64) return;

        const res = mapData.Resolution || mapData.resolution || 0.05;
        const w = mapData.Width || mapData.width || 800;
        const h = mapData.Height || mapData.height || 800;
        const ox = mapData.Origin?.X ?? mapData.origin?.x ?? 0;
        const oy = mapData.Origin?.Y ?? mapData.origin?.y ?? 0;

        const imgSrc = `data:image/png;base64,${base64}`;
        const bounds = [[oy, ox], [oy + h * res, ox + w * res]];

        if (!liveMapRef.current) {
            liveMapRef.current = L.map("live-map", {
                crs: L.CRS.Simple,
                zoomControl: false,
            });
            L.control.zoom({ position: "bottomright" }).addTo(liveMapRef.current);

            liveMapRef.current.on("moveend zoomend", () => {
                if (!liveMapRef.current) return;
                liveMapViewRef.current = {
                    center: liveMapRef.current.getCenter(),
                    zoom: liveMapRef.current.getZoom(),
                };
            });

            if (liveMapLayer.current) {
                liveMapRef.current.removeLayer(liveMapLayer.current);
            }
            liveMapLayer.current = L.imageOverlay(imgSrc, bounds, { opacity: 1 }).addTo(
                liveMapRef.current
            );
            liveMapRef.current.fitBounds(bounds);
            return;
        }

        const currentCenter =
            liveMapViewRef.current.center || liveMapRef.current.getCenter();
        const currentZoom =
            typeof liveMapViewRef.current.zoom === "number"
                ? liveMapViewRef.current.zoom
                : liveMapRef.current.getZoom();

        if (liveMapLayer.current) {
            liveMapRef.current.removeLayer(liveMapLayer.current);
        }
        liveMapLayer.current = L.imageOverlay(imgSrc, bounds, { opacity: 1 }).addTo(
            liveMapRef.current
        );

        liveMapRef.current.setView(currentCenter, currentZoom, { animate: false });
    }

    // ===================================
    // ROBOT POSITION
    // ===================================
    function updateRobotPosition(pos) {
        if (!window.L || !liveMapRef.current) return;
        const L = window.L;

        const icon = L.divIcon({
            className: "robot-marker",
            html: `<div style="transform:rotate(${pos.theta}rad);font-size:15px;">🤖</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });

        const latlng = [pos.y, pos.x];

        if (!robotMarker.current)
            robotMarker.current = L.marker(latlng, { icon }).addTo(liveMapRef.current);
        else {
            robotMarker.current.setLatLng(latlng);
            robotMarker.current.setIcon(icon);
        }
    }

    // ===================================
    // NAVIGATION MAP
    // ===================================
    async function loadNavigationMapForDestination(destination) {
        if (!destination) return;
        if (!window.L) return;
        const L = window.L;

        let meta;
        try {
            const metaRes = await fetch(
                API_CONFIG.API_BASE1 + `/api/MapsUpload/${destination.mapId}`
            );
            meta = await metaRes.json();
        } catch (err) {
            console.error("Không lấy được metadata bản đồ:", err);
            return;
        }

        let resolution = Number(
            meta?.resolution ?? meta?.Resolution ?? meta?.mapResolution ?? 0.05
        );
        if (!Number.isFinite(resolution) || resolution <= 0) {
            resolution = 0.05;
        }

        let originX = Number(meta?.originX ?? meta?.OriginX ?? meta?.origin?.x ?? 0);
        if (!Number.isFinite(originX)) originX = 0;

        let originY = Number(meta?.originY ?? meta?.OriginY ?? meta?.origin?.y ?? 0);
        if (!Number.isFinite(originY)) originY = 0;

        setSelectedMapName(meta?.mapName || meta?.name || "");

        // Load rooms cho map này
        let roomsForMap = [];
        try {
            const roomsRes = await fetch(API_CONFIG.API_BASE1 + "/api/Rooms");
            const allRooms = await roomsRes.json();
            roomsForMap = (allRooms || []).filter(
                (r) => Number(r.mapId) === Number(destination.mapId)
            );
        } catch (err) {
            console.error("Không lấy được danh sách phòng:", err);
        }

        const imgUrl = `${API_CONFIG.API_BASE1}/api/MapsUpload/${destination.mapId}/image`;
        const img = new Image();

        img.onload = () => {
            const widthMeters = img.width * resolution;
            const heightMeters = img.height * resolution;
            const bounds = [[0, 0], [heightMeters, widthMeters]];

            if (!navMapRef.current) {
                navMapRef.current = L.map("nav-map", {
                    crs: L.CRS.Simple,
                    zoomControl: true,
                });
                L.control.zoom({ position: "bottomright" }).addTo(navMapRef.current);
            }

            if (navMapLayer.current) navMapRef.current.removeLayer(navMapLayer.current);
            navMapLayer.current = L.imageOverlay(imgUrl, bounds).addTo(navMapRef.current);
            navMapRef.current.fitBounds(bounds);

            // Vẽ destination marker (điểm đến đã chọn)
            const destX = destination.x ?? destination.X ?? destination.posX ?? destination.world_x ?? 0;
            const destY = destination.y ?? destination.Y ?? destination.posY ?? destination.world_y ?? 0;

            const destLocalX = Number(destX) - originX;
            const destLocalY = Number(destY) - originY;

            if (Number.isFinite(destLocalX) && Number.isFinite(destLocalY)) {
                const destLatLng = [destLocalY, destLocalX];

                const destIcon = L.divIcon({
                    html: `<div style="font-size:20px;">📍</div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 24],
                });

                if (destinationMarker.current) {
                    destinationMarker.current.setLatLng(destLatLng);
                    destinationMarker.current.setIcon(destIcon);
                } else {
                    destinationMarker.current = L.marker(destLatLng, {
                        icon: destIcon,
                    }).addTo(navMapRef.current);
                }
            }

            // Vẽ room markers
            if (!navRoomsLayerRef.current) {
                navRoomsLayerRef.current = L.layerGroup().addTo(navMapRef.current);
            } else {
                navRoomsLayerRef.current.clearLayers();
            }

            const roomIcon = L.divIcon({
                className: "",
                html: `
                    <div style="
                        width: 24px;
                        height: 24px;
                        border-radius: 999px;
                        background: #0d6efd;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 0 0 2px rgba(255,255,255,0.9);
                    ">
                        <i class="bi bi-hospital-fill" style="font-size: 14px; color: #ffffff;"></i>
                    </div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 24],
            });

            roomsForMap.forEach((room) => {
                if (
                    room.latitude == null ||
                    room.longitude == null ||
                    room.latitude === "" ||
                    room.longitude === ""
                )
                    return;

                const worldX = Number(room.longitude);
                const worldY = Number(room.latitude);
                if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return;

                const localX = worldX - originX;
                const localY = worldY - originY;
                if (!Number.isFinite(localX) || !Number.isFinite(localY)) return;

                const latlng = L.latLng(localY, localX);

                const label = room.roomName || room.name || `Phòng ${room.id ?? "không tên"}`;

                const marker = L.marker(latlng, { icon: roomIcon });

                marker.bindTooltip(label, {
                    permanent: true,
                    direction: "top",
                    offset: L.point(0, -10),
                    opacity: 0.9,
                });

                marker.addTo(navRoomsLayerRef.current);
            });
        };

        img.onerror = (err) => {
            console.error("Không tải được ảnh bản đồ:", err);
        };

        img.src = imgUrl;
    }


    return (
        <div style={{ 
            height: "100vh", 
            width: "100vw", 
            overflow: "hidden", 
            margin: 0, 
            padding: 0,
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
        }}>
            <Toast toast={toast} showToast={showToast} />
            <div className="container-fluid p-3" style={{ height: "100%", overflow: "hidden", margin: 0, padding: "0.75rem" }}>
                <div className={styles.mainContent} style={{ height: "100%", gap: "0.75rem" }}>
                    {/* Camera - 40% height */}
                    <div className={`${styles.glass} p-3 d-flex flex-column`} style={{ flex: "0 0 40%", minHeight: 0 }}>
                        <div className={styles.headerBar}>
                            <div className={styles.sectionTitle}>
                                <i className="bi bi-camera-video-fill"></i>
                                Camera Trực Tiếp
                            </div>
                            <span className={status.includes("kết nối") ? styles.statusBadgeSuccess : styles.statusBadge}>
                                {status}
                            </span>
                        </div>

                        <div className={styles.cameraBox} style={{ flex: 1, minHeight: 0 }}>
                            {cameraFrame ? (
                                <img src={cameraFrame} alt="Camera feed" />
                            ) : (
                                <span className={styles.cameraPlaceholder}>
                                    <i className="bi bi-camera-video" style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}></i>
                                    Đang chờ khung hình...
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Dual Map - 60% height */}
                    <div className={`${styles.glass} p-3 flex-grow-1 d-flex flex-column`} style={{ flex: "0 0 60%", minHeight: 0 }}>
                        <div className={styles.headerBar}>
                            <div className={styles.sectionTitle}>
                                <i className="bi bi-map-fill"></i>
                                Bản đồ điều hướng
                            </div>
                            {selectedMapName && (
                                <span style={{ 
                                    fontSize: "0.9rem", 
                                    fontWeight: 500, 
                                    color: "#0b1324",
                                    opacity: 0.8
                                }}>
                                    {selectedMapName}
                                </span>
                            )}
                        </div>

                        <div className={styles.dualMapContainer}>
                            {/* Nav Map - Destination */}
                            <div className={styles.mapBoxWrapper}>
                                <div className={styles.mapLabel}>
                                    <i className="bi bi-geo-alt-fill"></i>
                                    Điểm đến
                                </div>
                                <div className={styles.mapBox}>
                                    <div id="nav-map" style={{ width: "100%", height: "100%" }}></div>
                                </div>
                            </div>

                            {/* Live Map - Hospital */}
                            <div className={styles.mapBoxWrapper}>
                                <div className={styles.mapLabel}>
                                    <i className="bi bi-broadcast"></i>
                                    Bệnh viện Live
                                </div>
                                <div className={styles.mapBox}>
                                    <div id="live-map" style={{ width: "100%", height: "100%" }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

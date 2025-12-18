// src/pages/RunTaskView.jsx
// ⭐ View-only version: Chỉ hiển thị Camera + Maps (không có sidebar controls)
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import { getAllRooms } from "@/services/roomService";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";
import styles from "@/assets/styles/robotLiveConsole.module.css";
import mapErrorImage from "@/assets/image/map_error.jpg";

export default function RunTaskView() {
    const { taskId } = useParams();
    const { toast, showToast } = useToast();

    // ===================================
    // MAP REFS
    // ===================================
    const navMapRef = useRef(null);
    const navMapLayer = useRef(null);
    const destinationMarker = useRef(null);
    const roomMarkersRef = useRef(null);

    const liveMapRef = useRef(null);
    const liveMapLayer = useRef(null);
    const robotMarker = useRef(null);

    // ===================================
    // STATE
    // ===================================
    const [status, setStatus] = useState("Đang kết nối...");
    const [cameraFrame, setCameraFrame] = useState(null);

    // Task data
    const [taskInfo, setTaskInfo] = useState(null);
    const [stops, setStops] = useState([]);
    const [selectedStop, setSelectedStop] = useState(null);
    const [selectedMapName, setSelectedMapName] = useState("");
    const [rooms, setRooms] = useState([]);

    // Tiến độ nhiệm vụ robot
    const [navProgress, setNavProgress] = useState({
        percent: 0,
        robotCode: "",
        pointName: "",
    });

    // ===================================
    // LOAD TASK INFO
    // ===================================
    useEffect(() => {
        async function loadTask() {
            try {
                const res = await fetch(`${API_CONFIG.API_BASE1}/api/Tasks/${taskId}/run-info`);
                const data = await res.json();
                setTaskInfo(data);
                setSelectedMapName(data.nameMapFE || data.mapName);
                setStops(data.stops || []);

                // Load rooms theo mapId
                let filteredRooms = [];
                if (data.mapId) {
                    try {
                        const allRooms = await getAllRooms();
                        const mapIdNum = Number(data.mapId);
                        filteredRooms = (allRooms || []).filter(
                            (r) => Number(r.mapId) === mapIdNum
                        );
                        setRooms(filteredRooms);
                    } catch (roomErr) {
                        console.error("Không lấy được danh sách phòng:", roomErr);
                    }
                }

                if (data.stops?.length > 0) {
                    const first = data.stops[0];
                    setSelectedStop(first);
                    loadNavigationMap(data.mapId, data.stops, first, filteredRooms);
                }
            } catch (err) {
                console.error("Lỗi load task:", err);
                setStatus("Không tải được nhiệm vụ");
                showToast("error", err.message || "Không thể tải thông tin nhiệm vụ!");
            }
        }
        loadTask();
    }, [taskId]);

    // Khi đổi điểm dừng hoặc rooms thay đổi
    useEffect(() => {
        if (taskInfo && selectedStop) {
            loadNavigationMap(taskInfo.mapId, taskInfo.stops, selectedStop, rooms);
        }
    }, [selectedStop, taskInfo, rooms]);

    // ===================================
    // NAVIGATION MAP + MARKERS
    // ===================================
    async function loadNavigationMap(mapId, stops, highlightStop, rooms = []) {
        if (!window.L || !mapId) return;
        const L = window.L;

        // Helper để vẽ map_error.jpg
        function showFallbackMap(resolution = 0.05) {
            const mapErrorUrl =
                typeof mapErrorImage === "string"
                    ? mapErrorImage
                    : mapErrorImage?.src || mapErrorImage?.default || "";

            if (!mapErrorUrl) {
                console.error("Không tìm được đường dẫn ảnh map_error.jpg");
                return;
            }

            const fallbackImg = new Image();
            fallbackImg.onload = () => {
                const widthMeters = fallbackImg.width * resolution;
                const heightMeters = fallbackImg.height * resolution;
                const bounds = [[0, 0], [heightMeters, widthMeters]];

                if (!navMapRef.current) {
                    navMapRef.current = L.map("nav-map", {
                        crs: L.CRS.Simple,
                        zoomControl: true,
                    });
                    L.control.zoom({ position: "bottomright" }).addTo(navMapRef.current);
                }

                if (navMapLayer.current)
                    navMapRef.current.removeLayer(navMapLayer.current);
                navMapLayer.current = L.imageOverlay(mapErrorUrl, bounds).addTo(
                    navMapRef.current
                );
                navMapRef.current.fitBounds(bounds);

                if (window.navMapMarkers) window.navMapMarkers.clearLayers();
                if (roomMarkersRef.current) {
                    navMapRef.current.removeLayer(roomMarkersRef.current);
                    roomMarkersRef.current = null;
                }
                if (destinationMarker.current) {
                    navMapRef.current.removeLayer(destinationMarker.current);
                    destinationMarker.current = null;
                }
            };

            fallbackImg.onerror = (fallbackErr) => {
                console.error("Không tải được ảnh map_error.jpg:", fallbackErr);
            };

            fallbackImg.src = mapErrorUrl;
        }

        try {
            const metaRes = await fetch(`${API_CONFIG.API_BASE1}/api/MapsUpload/${mapId}`);
            const meta = await metaRes.json();

            const resolution = meta.resolution || 0.05;
            const originX = meta.originX || 0;
            const originY = meta.originY || 0;
            const imgUrl = `${API_CONFIG.API_BASE}/MapsUpload/${mapId}/image`;

            const img = new Image();

            img.onload = () => {
                const widthMeters = img.width * resolution;
                const heightMeters = img.height * resolution;

                if (!Number.isFinite(widthMeters) || !Number.isFinite(heightMeters)) {
                    console.error("Kích thước bản đồ không hợp lệ, dùng map_error.jpg");
                    showFallbackMap(resolution);
                    return;
                }

                const bounds = [[0, 0], [heightMeters, widthMeters]];

                if (!navMapRef.current) {
                    navMapRef.current = L.map("nav-map", {
                        crs: L.CRS.Simple,
                        zoomControl: true,
                    });
                    L.control.zoom({ position: "bottomright" }).addTo(navMapRef.current);
                }

                if (navMapLayer.current) navMapRef.current.removeLayer(navMapLayer.current);
                navMapLayer.current = L.imageOverlay(imgUrl, bounds).addTo(
                    navMapRef.current
                );
                navMapRef.current.fitBounds(bounds);

                if (window.navMapMarkers) window.navMapMarkers.clearLayers();
                else window.navMapMarkers = L.layerGroup().addTo(navMapRef.current);

                if (roomMarkersRef.current) {
                    navMapRef.current.removeLayer(roomMarkersRef.current);
                }
                roomMarkersRef.current = L.layerGroup().addTo(navMapRef.current);

                // Vẽ các phòng trên map
                if (rooms && rooms.length > 0) {
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

                        marker.addTo(roomMarkersRef.current);
                    });
                }

                // Vẽ tất cả điểm dừng
                stops.forEach((stop, idx) => {
                    const localX = stop.x - originX;
                    const localY = stop.y - originY;
                    const latlng = [localY, localX];

                    const isSelected = highlightStop && stop.order === highlightStop.order;

                    const icon = L.divIcon({
                        className: "custom-stop-marker",
                        html: `
                            <div style="
                                width: ${isSelected ? "44px" : "36px"};
                                height: ${isSelected ? "44px" : "36px"};
                                background: ${isSelected ? "#e74c3c" : "#27ae60"};
                                color: white;
                                border: 3px solid white;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: bold;
                                font-size: ${isSelected ? "18px" : "16px"};
                                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            ">
                                ${idx + 1}
                            </div>
                        `,
                        iconSize: [isSelected ? 44 : 36, isSelected ? 44 : 36],
                        iconAnchor: [isSelected ? 22 : 18, isSelected ? 22 : 18],
                    });

                    L.marker(latlng, { icon, zIndexOffset: isSelected ? 1000 : 500 }).addTo(
                        window.navMapMarkers
                    );
                });

                // Điểm đang chọn
                if (highlightStop) {
                    const localX = highlightStop.x - originX;
                    const localY = highlightStop.y - originY;
                    const latlng = [localY, localX];

                    const selectedIcon = L.divIcon({
                        className: "selected-destination-marker",
                        html: `
                            <div style="
                                text-align: center;
                                font-weight: bold;
                                font-size: 16px;
                                color: #2c3e50;
                                background: white;
                                padding: 6px 10px;
                                border-radius: 6px;
                                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                                white-space: nowrap;
                                margin-bottom: 8px;
                            ">
                                ${highlightStop.name}
                            </div>
                        `,
                        iconSize: [120, 80],
                        iconAnchor: [60, 78],
                    });

                    if (destinationMarker.current) {
                        destinationMarker.current.setLatLng(latlng).setIcon(selectedIcon);
                    } else {
                        destinationMarker.current = L.marker(latlng, {
                            icon: selectedIcon,
                            zIndexOffset: 2000,
                        }).addTo(navMapRef.current);
                    }
                }
            };

            img.onerror = (err) => {
                console.error("Không tải được ảnh bản đồ, dùng map_error.jpg:", err);
                showFallbackMap(resolution);
            };

            img.src = imgUrl;
        } catch (err) {
            console.error("Lỗi load nav map:", err);
            showFallbackMap(0.05);
        }
    }

    // ===================================
    // SIGNALR: POSITION + CAMERA
    // ===================================
    useEffect(() => {
        let isMounted = true;
        let posConn = null;
        let camConn = null;

        const initConnections = async () => {
            posConn = new signalR.HubConnectionBuilder()
                .withUrl(API_CONFIG.API_BASE1 + "/hubs/robotposition")
                .withAutomaticReconnect()
                .build();

            camConn = new signalR.HubConnectionBuilder()
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

            try {
                await posConn.start();
                if (isMounted) {
                    setStatus("Đã kết nối robot");
                    console.log("✅ Position Hub connected");
                }
            } catch (err) {
                if (isMounted) {
                    console.error("❌ Position Hub connection error:", err);
                    setStatus("Lỗi kết nối robot");
                }
            }

            try {
                await camConn.start();
                if (isMounted) {
                    console.log("✅ Camera Hub connected");
                }
            } catch (err) {
                if (isMounted) {
                    console.error("❌ Camera Hub connection error:", err);
                }
            }
        };

        initConnections();

        return () => {
            isMounted = false;
            if (posConn) {
                posConn.stop().catch(() => {});
            }
            if (camConn) {
                camConn.stop().catch(() => {});
            }
        };
    }, []);

    // ===================================
    // LIVE MAP
    // ===================================
    function drawLiveMap(mapData) {
        if (!window.L) return;
        const L = window.L;

        const base64 = mapData?.Data_b64 || mapData?.data_b64 || mapData?.data;
        if (!base64) return;

        const res = mapData.Resolution || mapData.resolution || 0.05;
        const w = mapData.Width || mapData.width || 800;
        const h = mapData.Height || mapData.height || 800;
        const ox = mapData.Origin?.X ?? mapData.origin?.x ?? 0;
        const oy = mapData.Origin?.Y ?? mapData.origin?.y ?? 0;

        const imgSrc = `data:image/png;base64,${base64}`;
        const bounds = [[oy, ox], [oy + h * res, ox + w * res]];

        if (!liveMapRef.current) {
            liveMapRef.current = L.map("live-map", { crs: L.CRS.Simple, zoomControl: false });
            L.control.zoom({ position: "bottomright" }).addTo(liveMapRef.current);
        }

        if (liveMapLayer.current) liveMapRef.current.removeLayer(liveMapLayer.current);
        liveMapLayer.current = L.imageOverlay(imgSrc, bounds).addTo(liveMapRef.current);
        liveMapRef.current.fitBounds(bounds);
    }

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
                            <div className={styles.sectionTitle}>Camera Trực Tiếp</div>
                            <span className={status.includes("kết nối") ? styles.statusBadgeSuccess : styles.statusBadge}>
                                {status}
                            </span>
                        </div>
                        <div className={styles.cameraBox} style={{ flex: 1, minHeight: 0 }}>
                            {cameraFrame ? (
                                <img src={cameraFrame} alt="Camera" />
                            ) : (
                                <div className={styles.cameraPlaceholder}>
                                    <i className="bi bi-camera-video" style={{ fontSize: "2rem" }}></i>
                                    <div>Đang chờ khung hình...</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dual Map - 60% height */}
                    <div className={`${styles.glass} p-3 flex-grow-1 d-flex flex-column`} style={{ flex: "0 0 60%", minHeight: 0 }}>
                        <div className={styles.headerBar}>
                            <div className={styles.sectionTitle}>Bản đồ điều hướng</div>
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
                            <div className={styles.mapBoxWrapper}>
                                <div className={styles.mapLabel}>Điểm dừng nhiệm vụ</div>
                                <div className={styles.mapBox}>
                                    <div id="nav-map" style={{ width: "100%", height: "100%" }}></div>
                                </div>
                            </div>

                            <div className={styles.mapBoxWrapper}>
                                <div className={styles.mapLabel}>Bệnh viện (Live)</div>
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

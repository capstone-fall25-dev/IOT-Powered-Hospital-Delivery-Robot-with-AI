import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import { updateStopStatus } from "@/services/taskService";
import { getAllRooms } from "@/services/roomService";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";
import styles from "@/assets/styles/robotLiveConsole.module.css";
import mapErrorImage from "@/assets/image/map_error.jpg";

export default function RunTask() {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const { toast, showToast } = useToast();

    // ===================================
    // STATUS MAPPING (Tiếng Việt)
    // ===================================
    const statusMap = {
        pending: "Chờ xử lý",
        in_progress: "Đang xử lý",
        awaiting_handover: "Chờ bàn giao",
        delivered: "Đã giao",
        skipped: "Bỏ qua",
        failed: "Thất bại",
    };

    function getStatusText(status) {
        if (!status) return "";
        return statusMap[status.toLowerCase()] || "Không xác định";
    }

    // Collapsible sections state
    const [collapsedSections, setCollapsedSections] = useState({
        control: false,      // Mở mặc định
        compartments: true,   // Đóng mặc định
        audio: true,         // Đóng mặc định
        logs: true,          // Đóng mặc định
    });

    const toggleSection = (section) => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // ===================================
    // MAP REFS
    // ===================================
  const navMapRef = useRef(null);
  const navMapLayer = useRef(null);
  const destinationMarker = useRef(null);
  const roomMarkersRef = useRef(null); // Layer group cho room markers

    const liveMapRef = useRef(null);
    const liveMapLayer = useRef(null);
    const robotMarker = useRef(null);

    // ===================================
    // STATE
    // ===================================
    const [status, setStatus] = useState("Đang kết nối...");
    const [cameraFrame, setCameraFrame] = useState(null);
    const [mapNameInput, setMapNameInput] = useState("");
    const [logs, setLogs] = useState([]);
    const [activeKey, setActiveKey] = useState("");
    const [remoteMode, setRemoteMode] = useState(false);

    const [compartments, setCompartments] = useState([
        { id: 93, label: "Hộp 1", state: "closed" },
        { id: 94, label: "Hộp 2", state: "closed" },
    ]);

    // Task data
    const [taskInfo, setTaskInfo] = useState(null);
    const [stops, setStops] = useState([]);
    const [selectedStop, setSelectedStop] = useState(null);
    const [selectedMapName, setSelectedMapName] = useState("");
    const [rooms, setRooms] = useState([]); // Danh sách rooms trên bản đồ

    // Trạng thái điểm dừng đang chọn (để cập nhật status)
    const [selectedStopStatus, setSelectedStopStatus] = useState("");

    // Modal xác nhận hoàn thành task
    const [showCompleteModal, setShowCompleteModal] = useState(false);

    // Tiến độ nhiệm vụ robot
    const [navProgress, setNavProgress] = useState({
        percent: 0,
        robotCode: "",
        pointName: "",
    });

    // Text tiếng Việt để robot đọc
    const [ttsTextCustom, setTtsTextCustom] = useState("");

    // ===================================
    // AUDIO – WebRTC
    // ===================================
    const [isCallActive, setIsCallActive] = useState(false);
    const [webRtcStatus, setWebRtcStatus] = useState("Cuộc gọi WebRTC đang tắt.");
    const pcRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const webRtcSignalConnRef = useRef(null);

    // Mic cũ (SendChunk)
    const [isWebMicOn, setIsWebMicOn] = useState(false);
    const [webMicStatus, setWebMicStatus] = useState("Mic web đang tắt.");
    const [robotMicConnected, setRobotMicConnected] = useState(false);
    const [robotMicStatus, setRobotMicStatus] = useState("Robot mic chưa kết nối.");

    const webAudioContextRef = useRef(null);
    const webScriptNodeRef = useRef(null);
    const webMediaStreamRef = useRef(null);
    const webSourceNodeRef = useRef(null);

    const robotAudioContextRef = useRef(null);
    const robotAudioConnRef = useRef(null);
    const robotPlaybackTimeRef = useRef(0);
    const robotGainNodeRef = useRef(null);

    // ===================================
    // LOAD TASK INFO
    // ===================================
    useEffect(() => {
        async function loadTask() {
            try {
                const res = await fetch(`${API_CONFIG.API_BASE}/Tasks/${taskId}/run-info`);
                const data = await res.json();
                setTaskInfo(data);
                setSelectedMapName(data.nameMapFE || data.mapName);
                setStops(data.stops || []);

                // Load rooms theo mapId (giống RunMap)
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
                    setSelectedStopStatus(first.assignmentStatus || "");
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
            setSelectedStopStatus(selectedStop.assignmentStatus || "");
        }
    }, [selectedStop, taskInfo, rooms]);

// ===================================
// NAVIGATION MAP + MARKERS
// ===================================
async function loadNavigationMap(mapId, stops, highlightStop, rooms = []) {
  if (!window.L || !mapId) return;
  const L = window.L;

  // 🔁 helper dùng chung để vẽ map_error.jpg
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

      // Thay overlay thành ảnh lỗi
      if (navMapLayer.current)
        navMapRef.current.removeLayer(navMapLayer.current);
      navMapLayer.current = L.imageOverlay(mapErrorUrl, bounds).addTo(
        navMapRef.current
      );
      navMapRef.current.fitBounds(bounds);

      // Xoá marker, vì map lỗi không có toạ độ thật
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
    const metaRes = await fetch(`${API_CONFIG.API_BASE}/MapsUpload/${mapId}`);
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

      // Xóa hết marker cũ
      if (window.navMapMarkers) window.navMapMarkers.clearLayers();
      else window.navMapMarkers = L.layerGroup().addTo(navMapRef.current);

      // Xóa room markers cũ
      if (roomMarkersRef.current) {
        navMapRef.current.removeLayer(roomMarkersRef.current);
      }
      roomMarkersRef.current = L.layerGroup().addTo(navMapRef.current);

      // === VẼ CÁC PHÒNG TRÊN MAP ===
      if (rooms && rooms.length > 0) {
        const roomIcon = L.divIcon({
          className: "",
          html: `
            <div
              style="
                width: 24px;
                height: 24px;
                border-radius: 999px;
                background: #0d6efd;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 0 2px rgba(255,255,255,0.9);
              "
            >
              <i
                class="bi bi-hospital-fill"
                style="font-size: 14px; color: #ffffff;"
              ></i>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        });

        rooms.forEach((room) => {
          // Dùng latitude/longitude như RunMap
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

          const label =
            room.roomName || room.name || `Phòng ${room.id ?? "không tên"}`;

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

      // === VẼ TẤT CẢ ĐIỂM DỪNG ===
      stops.forEach((stop, idx) => {
        const localX = stop.x - originX;
        const localY = stop.y - originY;
        const latlng = [localY, localX];

        const isSelected =
          highlightStop && stop.order === highlightStop.order;

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

      // === ĐIỂM ĐANG CHỌN: Dấu pin lớn + tên đơn giản ===
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
            <div style="font-size: 42px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
              
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
            
            // Tiến độ nhiệm vụ từ backend
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

            // Start connections với error handling
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
            // Cleanup: stop connections an toàn
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

  // ⭐ NÚT VỀ TRẠM
async function sendReturnToStation() {
    const payload = {
        mapId: taskInfo?.mapId || selectedStop?.mapId || 0,
        destinations: [
            {
                id: 0,
                name: "Station",
                x: 0.0,
                y: 0.0
            }
        ]
    };

    try {
        const response = await fetch(
            `${API_CONFIG.API_BASE}/Destinations/send-route`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }
        );

        if (!response.ok) {
            throw new Error("API error");
        }

        // TTS thông báo
        try {
            await fetch(API_CONFIG.API_BASE1 + "/api/TTS", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: "Robot đang quay về trạm sạc" }),
            });
        } catch (ttsErr) {
            console.error("TTS error:", ttsErr);
        }

        showToast("success", "🏠 Robot đang quay về trạm!");
    } catch (err) {
        console.error("Lỗi gửi lệnh về trạm:", err);
        showToast("error", "Không thể gửi lệnh về trạm!");
    }
}

// ⭐ NÚT DỪNG KHẨN CẤP
async function sendEmergencyStop() {
    try {
        const response = await fetch(
            `${API_CONFIG.API_BASE}/Destinations/emergency-stop`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            }
        );

        if (!response.ok) {
            throw new Error("API error");
        }

        // TTS thông báo
        try {
            await fetch(API_CONFIG.API_BASE1 + "/api/TTS", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: "Dừng khẩn cấp đã được kích hoạt" }),
            });
        } catch (ttsErr) {
            console.error("TTS error:", ttsErr);
        }

        showToast("success", "🛑 Đã gửi lệnh dừng khẩn cấp!");

        // Reset tiến độ về 0
        setNavProgress({
            percent: 0,
            robotCode: "",
            pointName: "Đã dừng",
        });
    } catch (err) {
        console.error("Lỗi gửi lệnh dừng khẩn cấp:", err);
        showToast("error", "Không thể gửi lệnh dừng khẩn cấp!");
    }
}


  function updateRobotPosition(pos) {
    if (!window.L || !liveMapRef.current) return;
    const L = window.L;

    const icon = L.divIcon({
      className: "robot-marker",
      html: `<div style="transform:rotate(${pos.theta}rad);font-size:15px;">Robot</div>`,
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
  // CONTROL + COMPARTMENT + SAVE MAP
  // ===================================
  async function sendCommand(key) {
    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      setLogs((l) => [{ time: new Date().toLocaleTimeString(), text: `Điều khiển: ${key}` }, ...l]);
      setActiveKey(key);
      setTimeout(() => setActiveKey(""), 200);
    } catch {}
  }

  useEffect(() => {
    const handleKey = (e) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "x"].includes(k)) {
        e.preventDefault();
        sendCommand(k);
      }
    };
    if (remoteMode) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [remoteMode]);

  async function toggleCompartment(id) {
    const newState = compartments.find(c => c.id === id).state === "open" ? "close" : "open";
    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotCompartmentSignal/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compartmentId: id, action: newState }),
      });
      setCompartments(prev => prev.map(c => c.id === id ? { ...c, state: newState } : c));
    } catch {}
  }

    async function saveMap() {
        if (!mapNameInput.trim()) {
            showToast("warning", "Vui lòng nhập tên bản đồ!");
            return;
        }
        try {
            await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/SendMode", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ Mode: "save_map", MapName: mapNameInput }),
            });
            showToast("success", "Đã gửi lệnh lưu bản đồ!");
        } catch (err) {
            console.error("Lỗi lưu bản đồ:", err);
            showToast("error", err.message || "Không thể gửi lệnh lưu bản đồ!");
        }
    }

    async function startRunMap() {
        if (!selectedStop) {
            showToast("warning", "Vui lòng chọn điểm dừng trước!");
            return;
        }
        if (!selectedMapName) {
            showToast("warning", "Không có tên bản đồ!");
            return;
        }

        try {
            // Bước 1: Kích hoạt task trên server → chuyển status + robot
            const startRes = await fetch(`${API_CONFIG.API_BASE}/Tasks/${taskId}/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!startRes.ok) {
              const text = await startRes.text();
              let message = "Không thể bắt đầu nhiệm vụ";

              try {
                  const json = JSON.parse(text);
                  message =
                      json.message ||
                      json.Message ||
                      json.error ||
                      json.Error ||
                      json.title ||
                      message;
              } catch {
                  if (text) message = text;
              }

              throw new Error(message);
          }

            // 1️⃣ Gửi mode run_map cho robot
            await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/SendMode", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "run_map", mapName: selectedMapName }),
            });

            // 2️⃣ Gửi câu thông báo cho robot đọc
            const ttsText = `Robot bắt đầu chạy trên bản đồ ${selectedMapName}, đang đi đến điểm dừng số ${selectedStop.order}: ${selectedStop.name}`;

            try {
                await fetch(API_CONFIG.API_BASE1 + "/api/TTS", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: ttsText }),
                });
            } catch (ttsErr) {
                console.error("Gửi TTS lỗi:", ttsErr);
            }

            showToast("success", "Đã gửi lệnh bắt đầu chạy!");
        } catch (err) {
            console.error("Lỗi bắt đầu chạy:", err);
            showToast("error", err.message || "Không thể gửi lệnh bắt đầu chạy!");
        }
    }


    // Gửi text tiếng Việt tuỳ ý cho robot đọc
    async function sendCustomTts() {
        const text = ttsTextCustom.trim();
        if (!text) {
            showToast("warning", "Vui lòng nhập nội dung để robot đọc.");
            return;
        }

        try {
            await fetch(API_CONFIG.API_BASE1 + "/api/TTS", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
            showToast("success", "Đã gửi nội dung cho robot đọc.");
        } catch (err) {
            console.error("Gửi TTS tuỳ chỉnh lỗi:", err);
            showToast("error", err.message || "Không thể gửi nội dung cho robot đọc.");
        }
    }


    async function sendRoute() {
        if (!selectedStop) {
            showToast("warning", "Vui lòng chọn điểm dừng trước!");
            return;
        }
        const payload = {
            type: "destination_route",
            map_id: taskInfo.mapId,
            timestamp: new Date().toISOString(),
            destinations: [{
                order: selectedStop.order,
                id: selectedStop.destinationId,
                name: selectedStop.name,
                x: selectedStop.x,
                y: selectedStop.y,
            }],
        };
        try {
            await fetch(`${API_CONFIG.API_BASE}/Destinations/send-route`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            showToast("success", "Đã gửi vị trí điểm đến!");
        } catch (err) {
            console.error("Lỗi gửi route:", err);
            showToast("error", err.message || "Không thể gửi vị trí điểm đến!");
        }
    }
    // ===================================
    // UPDATE STOP STATUS (CONFIRM)
    // ===================================
    async function handleUpdateSelectedStopStatus() {
        if (!selectedStop) {
            showToast("warning", "Vui lòng chọn điểm dừng trước!");
            return;
        }
        if (selectedStop.assignmentStatus === "delivered") {
            showToast("warning", "Điểm dừng đã giao rồi — không thể cập nhật thêm.");
            return;
        }
        if (!selectedStop.stopId) {
            console.error("Không có stopId trong selectedStop:", selectedStop);
            showToast("error", "Không tìm thấy ID của điểm dừng!");
            return;
        }
        if (!selectedStopStatus) {
            showToast("warning", "Vui lòng chọn trạng thái điểm dừng!");
            return;
        }

        try {
            await updateStopStatus(taskId, selectedStop.stopId, selectedStopStatus);
            showToast("success", "Cập nhật trạng thái điểm dừng thành công!");

            // Reload lại run-info để sync trạng thái mới
            const res = await fetch(`${API_CONFIG.API_BASE}/Tasks/${taskId}/run-info`);
            const data = await res.json();
            setTaskInfo(data);
            setStops(data.stops || []);

            // Tìm lại stop vừa cập nhật
            const updated = data.stops?.find(s => s.stopId === selectedStop.stopId);

            if (!updated) return;

            // === (1) Nếu stop chưa delivered -> giữ nguyên
            if (updated.assignmentStatus !== "delivered") {
                setSelectedStop(updated);
                setSelectedStopStatus(updated.assignmentStatus || "");
                return;
            }

            // === (2) Nếu stop đã delivered → AUTO NEXT STOP
            const currentIndex = data.stops.findIndex(s => s.stopId === updated.stopId);
            const isLastStop = currentIndex === data.stops.length - 1;

            if (!isLastStop) {
                const nextStop = data.stops[currentIndex + 1];
                setSelectedStop(nextStop);
                setSelectedStopStatus(nextStop.assignmentStatus || "");
                showToast("info", `Điểm dừng #${updated.order} đã giao — chuyển sang điểm #${nextStop.order}`);
                return;
            }

            // === (3) Nếu là stop cuối và delivered → Hiển thị nút hoàn thành
            // Không tự động complete, để user xác nhận
            showToast("info", "Tất cả điểm dừng đã giao — Vui lòng xác nhận hoàn thành nhiệm vụ!");
        } catch (err) {
            console.error("Lỗi cập nhật trạng thái điểm dừng:", err);
            showToast("error", err.message || "Lỗi khi cập nhật điểm dừng");
        }
    }

    // Kiểm tra xem tất cả stops đã hoàn thành chưa (delivered, skipped, hoặc failed)
    function areAllStopsFinished() {
        if (!stops || stops.length === 0) return false;
        return stops.every(stop => {
            const status = stop.assignmentStatus?.toLowerCase();
            return status === "delivered" || status === "skipped" || status === "failed";
        });
    }

    // Hiển thị modal xác nhận hoàn thành
    function handleShowCompleteModal() {
        if (areAllStopsFinished()) {
            setShowCompleteModal(true);
        } else {
            showToast("warning", "Vẫn còn điểm dừng chưa hoàn thành!");
        }
    }

    // Xác nhận hoàn thành task
    async function handleConfirmComplete() {
        try {
            const response = await fetch(`${API_CONFIG.API_BASE}/tasks/${taskId}/complete`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Không thể hoàn thành nhiệm vụ!");
            }

            showToast("success", "Nhiệm vụ đã hoàn thành!");
            setShowCompleteModal(false);
            
            // Navigate về trang list task sau 1 giây
            setTimeout(() => {
                navigate("/dashboard");
            }, 1000);
        } catch (err) {
            console.error("Lỗi hoàn thành nhiệm vụ:", err);
            showToast("error", err.message || "Không thể hoàn thành nhiệm vụ!");
        }
    }

    // Phân loại stops: đã hoàn thành và chưa hoàn thành
    function getStopsByStatus() {
        const completed = stops.filter(stop => {
            const status = stop.assignmentStatus?.toLowerCase();
            return status === "delivered";
        });
        
        const notCompleted = stops.filter(stop => {
            const status = stop.assignmentStatus?.toLowerCase();
            return status !== "delivered" && status !== "skipped" && status !== "failed";
        });

        const skippedOrFailed = stops.filter(stop => {
            const status = stop.assignmentStatus?.toLowerCase();
            return status === "skipped" || status === "failed";
        });

        return { completed, notCompleted, skippedOrFailed };
    }

  // ===================================
  // MIC WEB → ROBOT (SendChunk)
  // ===================================
  function floatTo16BitPCM(float32Array) {
    const out = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  async function startWebMic() {
    if (isWebMicOn) return;
    try {
      setWebMicStatus("Đang xin quyền micro...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      webMediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      await ctx.resume();
      webAudioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      webSourceNodeRef.current = source;

      const scriptNode = ctx.createScriptProcessor(2048, 1, 1);
      webScriptNodeRef.current = scriptNode;

      scriptNode.onaudioprocess = (e) => {
        const chunk = e.inputBuffer.getChannelData(0);
        const pcm16 = floatTo16BitPCM(chunk);
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);

        fetch(`${API_CONFIG.API_BASE1}/api/RobotAudio/SendChunk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Audio_b64: btoa(binary),
            SampleRate: 48000,
            Channels: 1,
            StreamId: "mic_main",
            Timestamp: Date.now(),
          }),
        }).catch(() => {});
      };

      source.connect(scriptNode);
      scriptNode.connect(ctx.destination);

      setIsWebMicOn(true);
      setWebMicStatus("Mic web đang bật...");
    } catch (err) {
      setWebMicStatus("Không thể bật mic.");
    }
  }

  function stopWebMic() {
    [webScriptNodeRef, webSourceNodeRef, webAudioContextRef, webMediaStreamRef].forEach(ref => {
      if (ref.current) {
        if (ref.current.disconnect) ref.current.disconnect();
        if (ref.current.close) ref.current.close();
        if (ref.current.getTracks) ref.current.getTracks().forEach(t => t.stop());
        ref.current = null;
      }
    });
    setIsWebMicOn(false);
    setWebMicStatus("Mic web đang tắt.");
  }

  // ===================================
  // ROBOT MIC → WEB
  // ===================================
  function base64Pcm16ToFloat32(b64) {
    const bin = atob(b64);
    const out = new Float32Array(bin.length / 2);
    for (let i = 0; i < out.length; i++) {
      let v = (bin.charCodeAt(i * 2 + 1) << 8) | bin.charCodeAt(i * 2);
      if (v >= 0x8000) v -= 0x10000;
      out[i] = v / 0x8000;
    }
    return out;
  }

  function scheduleRobotAudio(float32Data, sampleRate = 48000) {
    const ctx = robotAudioContextRef.current;
    const gain = robotGainNodeRef.current;
    if (!ctx || !gain) return;

    const buffer = ctx.createBuffer(1, float32Data.length, sampleRate);
    buffer.getChannelData(0).set(float32Data);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);

    if (robotPlaybackTimeRef.current < ctx.currentTime + 0.05) robotPlaybackTimeRef.current = ctx.currentTime + 0.1;
    source.start(robotPlaybackTimeRef.current);
    robotPlaybackTimeRef.current += buffer.duration;
  }

    async function connectRobotMic() {
        if (robotMicConnected) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        robotAudioContextRef.current = ctx;

        const gain = ctx.createGain();
        gain.gain.value = 0.8;
        gain.connect(ctx.destination);
        robotGainNodeRef.current = gain;
        robotPlaybackTimeRef.current = ctx.currentTime + 0.1;

        const conn = new signalR.HubConnectionBuilder()
            .withUrl(`${API_CONFIG.API_BASE1}/hubs/robotaudio`)
            .withAutomaticReconnect()
            .build();

        conn.on("ReceiveRobotMicChunk", (data) => {
            const b64 = data.Audio_b64 || data.audio_b64;
            if (b64) scheduleRobotAudio(base64Pcm16ToFloat32(b64), data.SampleRate);
        });

        try {
            await conn.start();
            robotAudioConnRef.current = conn;
            setRobotMicConnected(true);
            setRobotMicStatus("Đã kết nối Robot Mic.");
            console.log("✅ Robot Mic Hub connected");
        } catch (err) {
            console.error("❌ Robot Mic Hub connection error:", err);
            setRobotMicStatus("Lỗi kết nối Robot Mic.");
            // Cleanup nếu start thất bại
            if (robotAudioContextRef.current) {
                robotAudioContextRef.current.close();
                robotAudioContextRef.current = null;
            }
        }
    }

    async function disconnectRobotMic() {
        if (robotAudioConnRef.current) {
            try {
                await robotAudioConnRef.current.stop();
            } catch (err) {
                console.error("Error stopping robot mic connection:", err);
            }
        }
        if (robotAudioContextRef.current) {
            robotAudioContextRef.current.close();
        }
        robotAudioConnRef.current = null;
        robotAudioContextRef.current = null;
        robotPlaybackTimeRef.current = 0;
        setRobotMicConnected(false);
        setRobotMicStatus("Robot mic đã tắt.");
    }

    // ===================================
    // WebRTC CALL
    // ===================================
    useEffect(() => {
        let isMounted = true;
        let conn = null;

        const initConnection = async () => {
            conn = new signalR.HubConnectionBuilder()
                .withUrl(API_CONFIG.API_BASE1 + "/hubs/robotaudio")
                .withAutomaticReconnect()
                .build();

            conn.on("ReceiveAnswer", async (sdp) => {
                if (!pcRef.current) return;
                await pcRef.current.setRemoteDescription({ type: "answer", sdp });
                if (isMounted) {
                    setWebRtcStatus("Đã nhận ANSWER từ robot.");
                }
            });

            conn.on("ReceiveIceCandidate", async (candJson) => {
                if (!pcRef.current) return;
                const cand = JSON.parse(candJson);
                await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
            });

            // Start connection với error handling
            try {
                await conn.start();
                if (isMounted) {
                    setWebRtcStatus("Hub WebRTC đã kết nối.");
                    console.log("✅ WebRTC Hub connected");
                    webRtcSignalConnRef.current = conn;
                }
            } catch (err) {
                if (isMounted) {
                    console.error("❌ WebRTC Hub connection error:", err);
                    setWebRtcStatus("Lỗi kết nối Hub WebRTC.");
                }
            }
        };

        initConnection();

        return () => {
            isMounted = false;
            // Cleanup: stop connection an toàn
            if (conn) {
                conn.stop().catch(() => {});
            }
            if (webRtcSignalConnRef.current === conn) {
                webRtcSignalConnRef.current = null;
            }
        };
    }, []);

    async function startWebRtcCall() {
        if (isCallActive) return;
        const conn = webRtcSignalConnRef.current;
        if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
            showToast("warning", "Hub chưa sẵn sàng");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;

            const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
            stream.getTracks().forEach(t => pc.addTrack(t, stream));

            pc.ontrack = (e) => remoteAudioRef.current && (remoteAudioRef.current.srcObject = e.streams[0]);
            pc.onicecandidate = (e) => e.candidate && conn.invoke("SendIceCandidate", JSON.stringify(e.candidate.toJSON()));
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === "connected") setWebRtcStatus("Đã kết nối WebRTC với robot.");
                if (pc.connectionState === "failed") setWebRtcStatus("Kết nối WebRTC thất bại.");
            };

            pcRef.current = pc;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await conn.invoke("SendOfferToRobot", offer.sdp);

            setIsCallActive(true);
            setWebRtcStatus("Đã gửi OFFER...");

            startWebMic();
            connectRobotMic();
        } catch (err) {
            console.error("Lỗi WebRTC:", err);
            showToast("error", `Lỗi WebRTC: ${err.message}`);
            stopWebRtcCall();
        }
    }

  function stopWebRtcCall() {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    stopWebMic();
    disconnectRobotMic();

    setIsCallActive(false);
    setWebRtcStatus("Cuộc gọi WebRTC đang tắt.");
  }

  function toggleWebRtcCall() {
    isCallActive ? stopWebRtcCall() : startWebRtcCall();
  }

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      stopWebRtcCall();
      stopWebMic();
      disconnectRobotMic();
    };
  }, []);

    // ===================================
    // RENDER
    // ===================================
    if (!taskInfo || stops.length === 0) {
        return (
            <div className={styles.page}>
                <div className="p-4 text-center">
                    <div className="spinner-border text-primary mb-3"></div>
                    <p className="text-muted">Đang tải nhiệm vụ ID: {taskId}...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <Toast toast={toast} showToast={showToast} />
      <div className="container-xxl py-3">
        <div className="row g-3" style={{ height: "calc(100vh - 2rem)" }}>
          {/* LEFT: CONTROLS */}
          <div className="col-lg-3 col-xl-3">
            <div className={`${styles.glass} p-2 h-100`}>
              <div className={styles.controlSidebar}>

                {/* Điều khiển - Collapsible */}
                <div className={styles.collapsibleSection}>
                  <div 
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('control')}
                    style={{ cursor: 'pointer' }}
                  >
                    <h6 className={styles.sectionTitle}>
                      <i className={`bi bi-chevron-${collapsedSections.control ? 'down' : 'up'} me-1`}></i>
                      Điều khiển
                    </h6>
                  </div>
                  {!collapsedSections.control && (
                    <div className={styles.sectionContent}>
                  <button className={`${styles.btnPrimary} mt-2`} onClick={() => setRemoteMode(!remoteMode)}>
                    <i className={`bi ${remoteMode ? "bi-stop-circle" : "bi-controller"} me-1`}></i>
                    {remoteMode ? "Tắt lái từ xa" : "Lái từ xa"}
                  </button>

                  {remoteMode && (
                    <>
                      <div className={styles.pad}>
                        <div></div>
                        <div className={`${styles.key} ${activeKey === "w" ? styles.keyActive : ""}`} onClick={() => sendCommand("w")}>W</div>
                        <div></div>
                        <div className={`${styles.key} ${activeKey === "a" ? styles.keyActive : ""}`} onClick={() => sendCommand("a")}>A</div>
                        <div className={`${styles.key} ${activeKey === "s" ? styles.keyActive : ""}`} onClick={() => sendCommand("s")}>S</div>
                        <div className={`${styles.key} ${activeKey === "d" ? styles.keyActive : ""}`} onClick={() => sendCommand("d")}>D</div>
                      </div>
                      <div className="d-flex justify-content-center">
                        <div className={`${styles.key} ${activeKey === "x" ? styles.keyActive : ""}`} onClick={() => sendCommand("x")}>X</div>
                      </div>
                    </>
                  )}
                    </div>
                  )}
                </div>

                {/* Hộp chứa - Collapsible */}
                <div className={styles.collapsibleSection}>
                  <div 
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('compartments')}
                    style={{ cursor: 'pointer' }}
                  >
                    <h6 className={styles.sectionTitle}>
                      <i className={`bi bi-chevron-${collapsedSections.compartments ? 'down' : 'up'} me-1`}></i>
                      Hộp chứa
                    </h6>
                  </div>
                  {!collapsedSections.compartments && (
                    <div className={styles.sectionContent}>
                    {compartments.map(c => (
                      <div key={c.id} className={styles.compartmentItem}>
                        <span className={styles.compartmentLabel}>{c.label}</span>
                        <button className={c.state === "open" ? styles.btnDanger : styles.btnSuccess} onClick={() => toggleCompartment(c.id)}>
                          {c.state === "open" ? "Đóng" : "Mở"}
                        </button>
                      </div>
                    ))}
                    </div>
                  )}
                </div>

                {/* Âm thanh WebRTC - Collapsible */}
                <div className={styles.collapsibleSection}>
                  <div 
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('audio')}
                    style={{ cursor: 'pointer' }}
                  >
                    <h6 className={styles.sectionTitle}>
                      <i className={`bi bi-chevron-${collapsedSections.audio ? 'down' : 'up'} me-1`}></i>
                      Âm thanh (WebRTC)
                    </h6>
                  </div>
                  {!collapsedSections.audio && (
                    <div className={styles.sectionContent}>
                      <div className="d-flex flex-column gap-2">
                    <button className={isCallActive ? styles.btnDanger : styles.btnSuccess} onClick={toggleWebRtcCall}>
                      <i className="bi bi-telephone-fill me-1"></i>
                      {isCallActive ? "Tắt cuộc gọi WebRTC" : "Bật cuộc gọi WebRTC"}
                    </button>
                  
                    <small style={{ opacity: 0.8 }}>
                      {webRtcStatus}<br />
                      {webMicStatus}<br />
                      {robotMicStatus}
                    </small>
                        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Điểm dừng nhiệm vụ - QUAN TRỌNG, luôn hiển thị */}
                <div className={styles.collapsibleSection}>
                  <h6 className={styles.sectionTitle}>Điểm dừng nhiệm vụ</h6>
                  <div className={styles.sectionContent}>
                    <select
                        className={`${styles.formSelect} mt-1`}
                        value={selectedStop?.stopId || ""}
                        onChange={(e) => setSelectedStop(stops.find(s => s.stopId === Number(e.target.value)))}
                    >
                        {stops.map(s => (
                            <option key={s.stopId} value={s.stopId}>
                                {s.order}. {s.name}
                            </option>
                        ))}
                    </select>

                    {/* ⭐ Tiến độ nhiệm vụ */}
                    <div
                        style={{
                            marginTop: "8px",
                            marginBottom: "4px",
                            padding: "5px 6px",
                            borderRadius: "6px",
                            background: "linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02))",
                            fontSize: "0.8rem",
                        }}
                    >
                    <div
                      style={{
                        marginBottom: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Tiến độ nhiệm vụ:</span>
                      <span>
                        {navProgress.robotCode || "Robot ?"} •{" "}
                        {navProgress.percent.toFixed(1)}%
                      </span>
                    </div>

                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        borderRadius: "999px",
                        background: "rgba(0,0,0,0.08)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${navProgress.percent}%`,
                          height: "100%",
                          borderRadius: "999px",
                          background:
                            "linear-gradient(90deg, #0d6efd, #20c997)",
                          transition: "width 0.2s ease-out",
                        }}
                      ></div>
                    </div>

                    <div style={{ marginTop: "4px", opacity: 0.8 }}>
                      Đi đến:{" "}
                      {navProgress.pointName ||
                        "Chưa nhận được điểm từ robot"}
                    </div>
                  </div>

                    {/* ⭐ Text tiếng Việt cho robot đọc */}
                    <div
                        style={{
                            marginTop: "6px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                        }}
                    >
                        <textarea
                            className={styles.formControl}
                            rows={2}
                            placeholder="Nhập câu tiếng Việt để robot đọc..."
                            value={ttsTextCustom}
                            onChange={(e) => setTtsTextCustom(e.target.value)}
                            style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
                        />
                        <button
                            type="button"
                            className={styles.btnPrimary}
                            onClick={sendCustomTts}
                            style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}
                        >
                            <i className="bi bi-megaphone-fill me-1"></i>
                            Gửi cho robot đọc
                        </button>
                    </div>

                    <button
                        className={`${styles.btnTeal} mt-1 w-100`}
                        onClick={startRunMap}
                        style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}
                    >
                        Bắt đầu chạy
                    </button>

                    <button 
                        className={`${styles.btnOutlinePrimary} mt-1 w-100`} 
                        onClick={sendRoute}
                        style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}
                    >
                        Gửi vị trí muốn đến
                    </button>

                    {/* ⭐ NÚT VỀ TRẠM */}
                    <button
                        className={`${styles.btnSuccess} mt-1 w-100`}
                        onClick={sendReturnToStation}
                        style={{
                            fontSize: "0.85rem",
                            padding: "0.5rem 0.75rem",
                            background: "linear-gradient(135deg, #28a745, #20c997)",
                            border: "none",
                        }}
                    >
                        <i className="bi bi-house-fill me-1"></i>
                        Về trạm
                    </button>

                    {/* ⭐ NÚT DỪNG KHẨN CẤP */}
                    <button
                        className={`${styles.btnDanger} mt-1 w-100`}
                        onClick={sendEmergencyStop}
                        style={{
                            fontSize: "0.85rem",
                            padding: "0.5rem 0.75rem",
                            background: "linear-gradient(135deg, #dc3545, #c82333)",
                            border: "none",
                        }}
                    >
                        <i className="bi bi-stop-circle-fill me-1"></i>
                        Dừng khẩn cấp
                    </button>

                    {/* ⭐ NÚT HOÀN THÀNH - Chỉ hiển thị khi tất cả stops đã finished */}
                    {areAllStopsFinished() && (
                        <button
                            className={`${styles.btnSuccess} mt-2 w-100`}
                            onClick={handleShowCompleteModal}
                            style={{
                                fontSize: "0.9rem",
                                padding: "0.6rem 0.75rem",
                                background: "linear-gradient(135deg, #28a745, #20c997)",
                                border: "none",
                                fontWeight: "bold",
                            }}
                        >
                            <i className="bi bi-check-circle-fill me-1"></i>
                            Hoàn thành
                        </button>
                    )}

                    {selectedStop && (
                        <div className={`${styles.destinationInfo} mt-1`} style={{ padding: "0.5rem", fontSize: "0.75rem" }}>
                            <div><strong>{selectedStop.name}</strong></div>
                            <div>Map: {selectedMapName}</div>
                            <div>X: {selectedStop.x.toFixed(2)} | Y: {selectedStop.y.toFixed(2)}</div>
                            {selectedStop.assignmentStatus && (
                                <div className="mt-1">
                                    <small>
                                        Trạng thái:{" "}
                                        <span
                                            style={{
                                                padding: "2px 6px",
                                                borderRadius: "4px",
                                                background: selectedStop.assignmentStatus === "delivered" ? "#2ecc71" : "#bdc3c7",
                                                color: "white",
                                                fontWeight: "bold",
                                                fontSize: "0.7rem"
                                            }}
                                        >
                                            {getStatusText(selectedStop.assignmentStatus)}
                                        </span>
                                    </small>
                                </div>
                            )}
                        </div>
                    )}
                  </div>
                </div>

                {/* Xác nhận trạng thái điểm dừng - QUAN TRỌNG, luôn hiển thị */}
                <div className={styles.collapsibleSection}>
                    <h6 className={styles.sectionTitle}>Xác nhận trạng thái điểm dừng</h6>
                    <div className={styles.sectionContent}>
                        <div className="d-flex gap-2 mt-1">
                            <select
                                className={styles.formSelect}
                                value={selectedStopStatus}
                                onChange={(e) => setSelectedStopStatus(e.target.value)}
                                style={{ flex: 1, fontSize: "0.85rem", padding: "0.4rem 0.6rem" }}
                                disabled={selectedStop?.assignmentStatus === "delivered"}
                            >
                                <option value="">-- Chọn trạng thái --</option>
                                <option value="pending">Chờ xử lý</option>
                                <option value="in_progress">Đang xử lý</option>
                                <option value="awaiting_handover">Chờ bàn giao</option>
                                <option value="delivered">Đã giao</option>
                                <option value="skipped">Bỏ qua</option>
                                <option value="failed">Thất bại</option>
                            </select>

                            <button
                                className={styles.btnSuccess}
                                onClick={handleUpdateSelectedStopStatus}
                                disabled={selectedStop?.assignmentStatus === "delivered"}
                                style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
                            >
                                Cập nhật
                            </button>
                        </div>
                    </div>
                </div>

                {/* Logs - Collapsible */}
                <div className={`${styles.collapsibleSection} flex-grow-1`}>
                  <div 
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('logs')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.headerBar}>
                      <h6 className={styles.sectionTitle}>
                        <i className={`bi bi-chevron-${collapsedSections.logs ? 'down' : 'up'} me-1`}></i>
                        Nhật ký
                      </h6>
                      <button 
                        className={styles.btnOutlineDanger} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setLogs([]);
                        }}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                  {!collapsedSections.logs && (
                    <div className={styles.sectionContent}>
                        <div className={styles.logsContainer}>
                            {logs.length === 0 ? (
                                <div className={styles.logsEmpty}>Chưa có log</div>
                            ) : (
                                logs.slice(0, 15).map((l, i) => (
                                    <div key={i} className={styles.logItem}>
                                        <div className={styles.logTime}>{l.time}</div>
                                        <div className={styles.logText}>{l.text}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT: CAMERA + MAPS */}
          <div className="col-lg-9 col-xl-9">
            <div className={styles.mainContent}>

              {/* Camera */}
              <div className={`${styles.glass} p-3`}>
                <div className={styles.headerBar}>
                  <div className={styles.sectionTitle}>Camera Trực Tiếp</div>
                  <span className={status.includes("kết nối") ? styles.statusBadgeSuccess : styles.statusBadge}>{status}</span>
                </div>
                <div className={styles.cameraBox}>
                  {cameraFrame ? <img src={cameraFrame} alt="Camera" /> : (
                    <div className={styles.cameraPlaceholder}>
                      <i className="bi bi-camera-video" style={{ fontSize: "2rem" }}></i>
                      <div>Đang chờ khung hình...</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dual Map + Save Map */}
              <div className={`${styles.glass} p-3 flex-grow-1 d-flex flex-column`}>
                <div className={styles.headerBar}>
                  <div className={styles.sectionTitle}>Bản đồ điều hướng</div>
                  <div className={styles.inputGroup} style={{ maxWidth: "280px" }}>
                    <input
                      className={styles.formControl}
                      placeholder="Tên bản đồ..."
                      value={mapNameInput}
                      onChange={(e) => setMapNameInput(e.target.value)}
                    />
                    <button className={styles.btnSuccess} onClick={saveMap}>Lưu</button>
                  </div>
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
      </div>

      {/* MODAL XÁC NHẬN HOÀN THÀNH NHIỆM VỤ */}
      {showCompleteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowCompleteModal(false)}
        >
          <div
            className={styles.glass}
            style={{
              width: "90%",
              maxWidth: "600px",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "2rem",
              borderRadius: "10px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h4 style={{ margin: 0, color: "var(--teal-dark)" }}>
                <i className="bi bi-check-circle-fill me-2"></i>
                Xác nhận hoàn thành nhiệm vụ
              </h4>
              <button
                className="btn-close"
                onClick={() => setShowCompleteModal(false)}
                aria-label="Close"
              ></button>
            </div>

            <p className="text-muted mb-4">
              Vui lòng kiểm tra danh sách điểm dừng trước khi xác nhận hoàn thành:
            </p>

            {(() => {
              const { completed, notCompleted, skippedOrFailed } = getStopsByStatus();
              return (
                <>
                  {/* Điểm dừng đã hoàn thành */}
                  {completed.length > 0 && (
                    <div className="mb-4">
                      <h6 className="text-success mb-2">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        Đã hoàn thành ({completed.length})
                      </h6>
                      <div className="list-group">
                        {completed.map((stop) => (
                          <div
                            key={stop.stopId}
                            className="list-group-item d-flex align-items-center"
                            style={{
                              backgroundColor: "#d4edda",
                              border: "1px solid #c3e6cb",
                            }}
                          >
                            <i className="bi bi-check-circle-fill text-success me-2" style={{ fontSize: "1.2rem" }}></i>
                            <div className="flex-grow-1">
                              <strong>Điểm dừng #{stop.order}</strong>
                              <div className="text-muted small">{stop.name}</div>
                            </div>
                            <span className="badge bg-success">Đã giao</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Điểm dừng bị bỏ qua hoặc thất bại */}
                  {skippedOrFailed.length > 0 && (
                    <div className="mb-4">
                      <h6 className="text-warning mb-2">
                        <i className="bi bi-exclamation-triangle-fill me-1"></i>
                        Bỏ qua / Thất bại ({skippedOrFailed.length})
                      </h6>
                      <div className="list-group">
                        {skippedOrFailed.map((stop) => (
                          <div
                            key={stop.stopId}
                            className="list-group-item d-flex align-items-center"
                            style={{
                              backgroundColor: "#fff3cd",
                              border: "1px solid #ffeaa7",
                            }}
                          >
                            <i className="bi bi-x-circle-fill text-warning me-2" style={{ fontSize: "1.2rem" }}></i>
                            <div className="flex-grow-1">
                              <strong>Điểm dừng #{stop.order}</strong>
                              <div className="text-muted small">{stop.name}</div>
                            </div>
                            <span className="badge bg-warning text-dark">
                              {getStatusText(stop.assignmentStatus)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Điểm dừng chưa hoàn thành */}
                  {notCompleted.length > 0 && (
                    <div className="mb-4">
                      <h6 className="text-danger mb-2">
                        <i className="bi bi-x-circle-fill me-1"></i>
                        Chưa hoàn thành ({notCompleted.length})
                      </h6>
                      <div className="list-group">
                        {notCompleted.map((stop) => (
                          <div
                            key={stop.stopId}
                            className="list-group-item d-flex align-items-center"
                            style={{
                              backgroundColor: "#f8d7da",
                              border: "1px solid #f5c6cb",
                            }}
                          >
                            <i className="bi bi-x-circle-fill text-danger me-2" style={{ fontSize: "1.2rem" }}></i>
                            <div className="flex-grow-1">
                              <strong>Điểm dừng #{stop.order}</strong>
                              <div className="text-muted small">{stop.name}</div>
                            </div>
                            <span className="badge bg-danger">
                              {getStatusText(stop.assignmentStatus)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thông báo nếu có điểm dừng chưa hoàn thành */}
                  {notCompleted.length > 0 && (
                    <div className="alert alert-warning mb-4">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      <strong>Lưu ý:</strong> Vẫn còn {notCompleted.length} điểm dừng chưa hoàn thành. 
                      Bạn có chắc muốn hoàn thành nhiệm vụ?
                    </div>
                  )}

                  {/* Nút xác nhận */}
                  <div className="d-flex gap-2 justify-content-end">
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setShowCompleteModal(false)}
                      style={{ borderRadius: "5px" }}
                    >
                      Hủy
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={handleConfirmComplete}
                      style={{ borderRadius: "5px" }}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Xác nhận hoàn thành
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

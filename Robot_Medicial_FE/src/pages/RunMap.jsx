import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import styles from "@/assets/styles/robotLiveConsole.module.css";
import mapError from "@/assets/image/map_error.jpg";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";

export default function RobotRunMap() {
  const { toast, showToast } = useToast();
  
  // ===================================
  // 🗺️ MAP REFS
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
  // 🧩 STATE
  // ===================================
  const [status, setStatus] = useState("🕓 Đang kết nối...");
  const [cameraFrame, setCameraFrame] = useState(null);
  const [mapName, setMapName] = useState("");
  const [logs, setLogs] = useState([]);
  const [activeKey, setActiveKey] = useState("");
  const [remoteMode, setRemoteMode] = useState(false);

  const [compartments, setCompartments] = useState([
    { id: 93, label: "Hộp 1", state: "closed" },
    { id: 94, label: "Hộp 2", state: "closed" },
  ]);

  const [destinations, setDestinations] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedMapName, setSelectedMapName] = useState("");

  const [navProgress, setNavProgress] = useState({
    percent: 0,
    robotCode: "",
    pointName: "",
  });

  const [ttsTextCustom, setTtsTextCustom] = useState("");

  // ⭐ THÊM MỚI: State cho Alerts
  const [alerts, setAlerts] = useState([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [showAlertPanel, setShowAlertPanel] = useState(false);

  // ===================================
  // 🔊 AUDIO STATE – WebRTC CALL
  // ===================================
  const [isCallActive, setIsCallActive] = useState(false);
  const [webRtcStatus, setWebRtcStatus] = useState("Cuộc gọi WebRTC đang tắt.");

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const webRtcSignalConnRef = useRef(null);

  // ===================================
  // 🔊 AUDIO STATE – Mic Web ↔ Robot (kiểu cũ)
  // ===================================
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
  // 🔗 SIGNALR (position + camera)
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
        if (!raw || typeof raw !== "string") {
          return;
        }

        const parts = raw.split("|");
        const robotCode = parts[0] || "";
        const percentStr = parts[1] || "0";
        const pointName = parts[2] || "";

        let percent = parseFloat(percentStr);
        if (Number.isNaN(percent) || !Number.isFinite(percent)) {
          percent = 0;
        }
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
  // 🔗 SIGNALR (WebRTC signaling)
  // ===================================
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(API_CONFIG.API_BASE1 + "/hubs/robotaudio")
      .withAutomaticReconnect()
      .build();

    conn.on("ReceiveAnswer", async (sdp) => {
      console.log("[WebRTC] ReceiveAnswer");
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const answer = new RTCSessionDescription({ type: "answer", sdp });
        await pc.setRemoteDescription(answer);
        setWebRtcStatus("Đã nhận ANSWER từ robot, cuộc gọi đang hoạt động.");
      } catch (err) {
        console.error("SetRemoteDescription(answer) error:", err);
      }
    });

    conn.on("ReceiveIceCandidate", async (candidateJson) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const cand = JSON.parse(candidateJson);
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.error("addIceCandidate error:", err);
      }
    });

    conn
      .start()
      .then(() => {
        console.log("[WebRTC] SignalR robotaudio connected");
        setWebRtcStatus("Hub WebRTC đã kết nối, sẵn sàng gọi.");
      })
      .catch((e) => {
        console.error("SignalR robotaudio error:", e);
        setWebRtcStatus("Không kết nối được hub WebRTC.");
      });

    webRtcSignalConnRef.current = conn;

    return () => {
      conn.stop();
    };
  }, []);

  // ===================================
  // ⭐ SIGNALR (AlertHub - MỚI)
  // ===================================
  useEffect(() => {
    const alertConn = new signalR.HubConnectionBuilder()
      .withUrl(API_CONFIG.API_BASE1 + "/hubs/alert")
      .withAutomaticReconnect()
      .build();

    alertConn.on("ReceiveAlert", (alert) => {
      console.log("🚨 New alert received:", alert);
      
      setAlerts((prev) => [alert, ...prev]);
      setUnreadAlertCount((prev) => prev + 1);
      
      const severity = alert.severity?.toLowerCase() || "medium";
      const toastType = 
        severity === "high" ? "error" : 
        severity === "medium" ? "warning" : 
        "info";
      
      showToast(toastType, `🚨 ${alert.message}`);
      
      if (severity === "high") {
        setShowAlertPanel(true);
      }
    });

    alertConn
      .start()
      .then(() => {
        console.log("✅ AlertHub connected");
        loadExistingAlerts();
      })
      .catch((err) => {
        console.error("❌ AlertHub connection error:", err);
      });

    return () => {
      alertConn.stop();
    };
  }, []);

  // cleanup audio khi unmount
  useEffect(() => {
    return () => {
      stopWebRtcCall();
      stopWebMic();
      disconnectRobotMic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===================================
  // 📍 LOAD DESTINATIONS
  // ===================================
  useEffect(() => {
    async function fetchDestinations() {
      try {
        const res = await fetch(API_CONFIG.API_BASE1 + "/api/Destinations");
        const data = await res.json();
        setDestinations(data);
      } catch {
        // ignore
      }
    }
    fetchDestinations();
  }, []);

  // ===================================
  // LIVE MAP (ROS2)
  // ===================================
  function drawLiveMap(mapData) {
    if (!window.L) return;
    const L = window.L;

    const base64 =
      mapData?.Data_b64 || mapData?.data_b64 || mapData?.data || null;
    if (!base64) return;

    const res = mapData.Resolution || mapData.resolution || 0.05;
    const w = mapData.Width || mapData.width || 800;
    const h = mapData.Height || mapData.height || 800;
    const ox = mapData.Origin?.X ?? mapData.origin?.x ?? 0;
    const oy = mapData.Origin?.Y ?? mapData.origin?.y ?? 0;

    const imgSrc = `data:image/png;base64,${base64}`;

    const bounds = [
      [oy, ox],
      [oy + h * res, ox + w * res],
    ];

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

      liveMapViewRef.current = {
        center: liveMapRef.current.getCenter(),
        zoom: liveMapRef.current.getZoom(),
      };

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

  // ============================================================
  // 🧭 ROBOT POSITION
  // ============================================================
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
  // NAVIGATION MAP (map trên)
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

    let originX = Number(
      meta?.originX ?? meta?.OriginX ?? meta?.origin?.x ?? 0
    );
    if (!Number.isFinite(originX)) originX = 0;

    let originY = Number(
      meta?.originY ?? meta?.OriginY ?? meta?.origin?.y ?? 0
    );
    if (!Number.isFinite(originY)) originY = 0;

    setSelectedMapName(meta?.mapName || meta?.name || "");

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

    const primaryImgUrl =
      API_CONFIG.API_BASE1 + `/api/MapsUpload/${destination.mapId}/image`;

    const img = new Image();
    let triedFallback = false;

    img.onload = () => {
      const widthMeters = img.width * resolution;
      const heightMeters = img.height * resolution;

      if (!Number.isFinite(widthMeters) || !Number.isFinite(heightMeters)) {
        if (!triedFallback) {
          triedFallback = true;
          console.warn(
            "Kích thước bản đồ không hợp lệ, dùng ảnh map_error.jpg",
            { widthMeters, heightMeters }
          );
          img.src = mapError;
          return;
        }

        console.error("Kích thước ảnh map_error.jpg cũng không hợp lệ.");
        return;
      }

      const bounds = L.latLngBounds(
        L.latLng(0, 0),
        L.latLng(heightMeters, widthMeters)
      );

      if (!navMapRef.current) {
        navMapRef.current = L.map("nav-map", { crs: L.CRS.Simple });
        L.control.zoom({ position: "bottomright" }).addTo(navMapRef.current);
      }

      if (navMapLayer.current) navMapRef.current.removeLayer(navMapLayer.current);
      navMapLayer.current = L.imageOverlay(img.src, bounds).addTo(navMapRef.current);
      navMapRef.current.fitBounds(bounds);

      const destX =
        destination.x ??
        destination.X ??
        destination.posX ??
        destination.world_x ??
        0;
      const destY =
        destination.y ??
        destination.Y ??
        destination.posY ??
        destination.world_y ??
        0;

      const destLocalX = Number(destX) - originX;
      const destLocalY = Number(destY) - originY;

      if (!Number.isFinite(destLocalX) || !Number.isFinite(destLocalY)) {
        console.error("Toạ độ điểm đến không hợp lệ:", {
          destX,
          destY,
          originX,
          originY,
        });
      } else {
        const destLatLng = [destLocalY, destLocalX];

        const destIcon = L.divIcon({
          html: `<div style="font-size:20px;">📍</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        });

        if (destinationMarker.current)
          destinationMarker.current.setLatLng(destLatLng);
        else
          destinationMarker.current = L.marker(destLatLng, {
            icon: destIcon,
          }).addTo(navMapRef.current);
      }

      if (!navRoomsLayerRef.current) {
        navRoomsLayerRef.current = L.layerGroup().addTo(navMapRef.current);
      } else {
        navRoomsLayerRef.current.clearLayers();
      }

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

        const label =
          room.roomName || room.name || `Phòng ${room.id ?? "không tên"}`;

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
      if (!triedFallback) {
        triedFallback = true;
        console.warn(
          "Không tải được ảnh bản đồ, chuyển sang ảnh map_error.jpg",
          err
        );
        img.src = mapError;
        return;
      }

      console.error("Không tải được ảnh fallback map_error.jpg:", err);
    };

    img.src = primaryImgUrl;
  }

  async function sendEmergencyStop() {
    try {
      const response = await fetch(
        API_CONFIG.API_BASE1 + "/api/Destinations/emergency-stop",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("API error");
      }

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
      
      setNavProgress({
        percent: 0,
        robotCode: "",
        pointName: "Đã dừng",
      });
    } catch (err) {
      console.error(err);
      showToast("error", "Không thể gửi lệnh dừng khẩn cấp!");
    }
  }

  // ===================================
  // CONTROL KEYS
  // ===================================
  async function sendCommand(key) {
    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      setLogs((l) => [
        { time: new Date().toLocaleTimeString(), text: `Điều khiển: ${key}` },
        ...l,
      ]);
      setActiveKey(key);
      setTimeout(() => setActiveKey(""), 200);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const handleKey = (e) => {
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d", "x"].includes(key)) {
        e.preventDefault();
        sendCommand(key);
      }
    };
    if (remoteMode) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteMode]);

  async function toggleCompartment(id) {
    const comp = compartments.find((c) => c.id === id);
    const newState = comp.state === "open" ? "close" : "open";

    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotCompartmentSignal/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compartmentId: id, action: newState }),
      });

      setCompartments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, state: newState } : c))
      );
    } catch {
      // ignore
    }
  }

  async function saveMap() {
    if (!mapName.trim()) {
      showToast("warning", "Nhập tên bản đồ!");
      return;
    }
    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/SendMode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Mode: "save_map", MapName: mapName }),
      });
      showToast("success", "Đã gửi lệnh lưu bản đồ!");
    } catch (err) {
      showToast("error", err.message || "Không thể lưu bản đồ!");
    }
  }

  async function startRunMap() {
    if (!selectedDestination) {
      showToast("warning", "Chọn điểm đến!");
      return;
    }
    if (!selectedMapName) {
      showToast("warning", "Không có mapName!");
      return;
    }

    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/RobotMode/SendMode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "run_map",
          mapName: selectedMapName,
        }),
      });

      const ttsText = `Robot bắt đầu chạy trên ${selectedMapName} đang đi đến điểm ${selectedDestination.name}`;

      try {
        await fetch(API_CONFIG.API_BASE1 + "/api/TTS", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: ttsText }),
        });
      } catch (ttsErr) {
        console.error("Gửi TTS lỗi:", ttsErr);
      }

      showToast("success", "Đã gửi lệnh run_map!");
    } catch (err) {
      showToast("error", err.message || "Không thể gửi lệnh run_map!");
    }
  }

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
      showToast("error", err.message || "Không gửi được nội dung cho robot đọc.");
    }
  }

  async function sendRoute() {
    if (!selectedDestination) {
      showToast("warning", "Chọn điểm đến trước!");
      return;
    }

    const payload = {
      type: "destination_route",
      map_id: selectedDestination.mapId,
      timestamp: new Date().toISOString(),
      destinations: [
        {
          order: 1,
          id: selectedDestination.id,
          name: selectedDestination.name,
          x: selectedDestination.x,
          y: selectedDestination.y,
        },
      ],
    };

    try {
      await fetch(API_CONFIG.API_BASE1 + "/api/Destinations/send-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      showToast("success", "📤 Route đã gửi!");
    } catch (err) {
      showToast("error", err.message || "Không thể gửi route!");
    }
  }

  async function sendReturnToStation() {
    const payload = {
      mapId: selectedDestination.mapId,
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
      const response = await fetch(API_CONFIG.API_BASE1 + "/api/Destinations/send-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error("API error");
      }
      
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
      console.error(err);
      showToast("error", "Không thể gửi lệnh về trạm!");
    }
  }

  function handleSelectDestination(e) {
    const id = e.target.value;
    const dest = destinations.find((d) => String(d.id) === id);
    setSelectedDestination(dest || null);
    if (dest) {
      loadNavigationMapForDestination(dest);
      // Lưu vào localStorage để sync với RunMapView
      try {
        localStorage.setItem('runMap_selectedDestinationId', String(dest.id));
        // Dispatch event để sync cùng tab
        window.dispatchEvent(new Event('runMap_destinationChanged'));
      } catch (err) {
        console.warn("Không lưu được localStorage:", err);
      }
    }
  }

  // ===================================
  // ⭐ ALERT FUNCTIONS (MỚI)
  // ===================================
  async function loadExistingAlerts() {
  try {
    const res = await fetch(API_CONFIG.API_BASE1 + "/api/Alerts");
    const data = await res.json();
    
    // Chỉ lấy alerts có status = "open"
    const activeAlerts = (data || [])
      .filter((a) => a.status?.toLowerCase() === "open")
      .slice(0, 20);
    
    setAlerts(activeAlerts);
    setUnreadAlertCount(activeAlerts.length);
  } catch (err) {
    console.error("Failed to load alerts:", err);
  }
}


  async function markAlertAsResolved(alertId) {
  try {
    // ⭐ Lấy thông tin alert đầy đủ
    const alertToResolve = alerts.find((a) => a.id === alertId);
    if (!alertToResolve) {
      console.error("Alert không tồn tại:", alertId);
      return;
    }
     const resolvedAt = new Date().toISOString();

    // ⭐ Gọi API PUT với ĐẦY ĐỦ thông tin
    const response = await fetch(
      API_CONFIG.API_BASE1 + `/api/Alerts/${alertId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robotId: alertToResolve.robotId,
          message: alertToResolve.message,
          status: "resolved", // ⭐ Đổi status thành resolved
          severity: alertToResolve.severity,
          category: alertToResolve.category,
          prescriptionItemId: alertToResolve.prescriptionItemId || null,
           resolvedAt: resolvedAt,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("API trả về lỗi: " + response.status);
    }

    // ⭐ Xóa khỏi danh sách hiển thị ngay lập tức
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    
    // ⭐ Giảm unread count
    setUnreadAlertCount((prev) => Math.max(0, prev - 1));
    
    // ⭐ Hiển thị toast thành công
    showToast("success", "✅ Đã đánh dấu đã xử lý");
    
    console.log("✅ Alert resolved successfully:", alertId);
  } catch (err) {
    console.error("❌ Failed to update alert:", err);
    showToast("error", "Không thể cập nhật alert: " + err.message);
  }
}


  // async function deleteAlert(alertId) {
  //   setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  //   showToast("success", "🗑️ Đã xóa alert");
  // }

  function getSeverityIcon(severity) {
    switch (severity?.toLowerCase()) {
      case "high":
        return { icon: "bi-exclamation-triangle-fill", color: "#dc3545" };
      case "medium":
        return { icon: "bi-exclamation-circle-fill", color: "#ffc107" };
      case "low":
        return { icon: "bi-info-circle-fill", color: "#0dcaf0" };
      default:
        return { icon: "bi-bell-fill", color: "#6c757d" };
    }
  }

  function formatTime(dateString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
    } catch {
      return "";
    }
  }

  // =========================================================
  // MIC WEB → ROBOT (kiểu cũ, SendChunk)
  // =========================================================
  function floatTo16BitPCM(float32Array) {
    const len = float32Array.length;
    const out = new Int16Array(len);
    for (let i = 0; i < len; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  async function startWebMic() {
    if (isWebMicOn) return;

    try {
      setWebMicStatus("Đang xin quyền micro...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      webMediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      await audioCtx.resume();

      webAudioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      webSourceNodeRef.current = source;

      const scriptNode = audioCtx.createScriptProcessor(2048, 1, 1);
      webScriptNodeRef.current = scriptNode;

      scriptNode.onaudioprocess = (event) => {
        const chunk = event.inputBuffer.getChannelData(0);
        const pcm16 = floatTo16BitPCM(chunk);
        const bytes = new Uint8Array(pcm16.buffer);

        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }

        const payload = {
          Audio_b64: btoa(binary),
          SampleRate: 48000,
          Channels: 1,
          StreamId: "mic_main",
          Timestamp: Date.now(),
        };

        fetch(`${API_CONFIG.API_BASE1}/api/RobotAudio/SendChunk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => {});
      };

      source.connect(scriptNode);
      scriptNode.connect(audioCtx.destination);

      setIsWebMicOn(true);
      setWebMicStatus("Mic web đang bật...");
    } catch (err) {
      console.error(err);
      setWebMicStatus("Không thể bật mic.");
    }
  }

  function stopWebMic() {
    const scriptNode = webScriptNodeRef.current;
    if (scriptNode) {
      scriptNode.disconnect();
      scriptNode.onaudioprocess = null;
      webScriptNodeRef.current = null;
    }

    const source = webSourceNodeRef.current;
    if (source) {
      source.disconnect();
      webSourceNodeRef.current = null;
    }

    const audioCtx = webAudioContextRef.current;
    if (audioCtx) {
      audioCtx.close();
      webAudioContextRef.current = null;
    }

    const stream = webMediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      webMediaStreamRef.current = null;
    }

    setIsWebMicOn(false);
    setWebMicStatus("Mic web đang tắt.");
  }

  // =========================================================
  // ROBOT MIC → WEB (kiểu cũ, ReceiveRobotMicChunk)
  // =========================================================
  function base64Pcm16ToFloat32(b64) {
    const bin = atob(b64);
    const len = bin.length / 2;
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      let lo = bin.charCodeAt(i * 2);
      let hi = bin.charCodeAt(i * 2 + 1);
      let v = (hi << 8) | lo;
      if (v >= 0x8000) v -= 0x10000;
      out[i] = v / 0x8000;
    }
    return out;
  }

  function scheduleRobotAudio(float32Data, sampleRate) {
    const audioCtx = robotAudioContextRef.current;
    const gainNode = robotGainNodeRef.current;
    if (!audioCtx || !gainNode) return;

    const sr = sampleRate || 48000;
    const buffer = audioCtx.createBuffer(1, float32Data.length, sr);
    buffer.getChannelData(0).set(float32Data);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);

    if (robotPlaybackTimeRef.current < audioCtx.currentTime + 0.05) {
      robotPlaybackTimeRef.current = audioCtx.currentTime + 0.1;
    }

    const start = robotPlaybackTimeRef.current;
    source.start(start);

    robotPlaybackTimeRef.current = start + buffer.duration;
  }

  async function connectRobotMic() {
    if (robotMicConnected) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    robotAudioContextRef.current = audioCtx;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.8;
    gainNode.connect(audioCtx.destination);
    robotGainNodeRef.current = gainNode;

    robotPlaybackTimeRef.current = audioCtx.currentTime + 0.1;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_CONFIG.API_BASE1}/hubs/robotaudio`)
      .withAutomaticReconnect()
      .build();

    conn.on("ReceiveRobotMicChunk", (data) => {
      const b64 = data.Audio_b64 || data.audio_b64;
      if (!b64) return;
      const floatData = base64Pcm16ToFloat32(b64);
      const sr = data.SampleRate || 48000;
      scheduleRobotAudio(floatData, sr);
    });

    await conn.start().catch(() => {});

    robotAudioConnRef.current = conn;
    setRobotMicConnected(true);
    setRobotMicStatus("Đã kết nối Robot Mic.");
  }

  async function disconnectRobotMic() {
    const conn = robotAudioConnRef.current;
    if (conn) {
      try {
        await conn.stop();
      } catch {}
      robotAudioConnRef.current = null;
    }

    const audioCtx = robotAudioContextRef.current;
    if (audioCtx) {
      audioCtx.close();
      robotAudioContextRef.current = null;
    }

    robotPlaybackTimeRef.current = 0;
    setRobotMicConnected(false);
    setRobotMicStatus("Robot mic đã tắt.");
  }

  // ===================================
  // 🔊 WebRTC AUDIO: START/STOP
  // ===================================
  async function startWebRtcCall() {
    if (isCallActive) return;

    const conn = webRtcSignalConnRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
      showToast("warning", "Hub WebRTC chưa sẵn sàng.");
      return;
    }

    try {
      setWebRtcStatus("Đang xin quyền micro (WebRTC)...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        console.log("[WebRTC] ontrack", event.streams);
        const [remoteStream] = event.streams;
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candJson = JSON.stringify(event.candidate.toJSON());
          conn.invoke("SendIceCandidate", candJson).catch(console.error);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setWebRtcStatus("Đã kết nối WebRTC với robot.");
        } else if (pc.connectionState === "failed") {
          setWebRtcStatus("Kết nối WebRTC bị lỗi.");
        }
      };

      pcRef.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await conn.invoke("SendOfferToRobot", offer.sdp);
      setIsCallActive(true);
      setWebRtcStatus("Đã gửi OFFER, chờ ANSWER từ robot...");

      startWebMic();
      connectRobotMic();
    } catch (err) {
      console.error("startWebRtcCall error:", err);
      setWebRtcStatus("Không thể bắt đầu WebRTC call.");
      showToast("error", "Không thể bắt đầu WebRTC: " + err.message);
      stopWebRtcCall();
    }
  }

  function stopWebRtcCall() {
    const pc = pcRef.current;
    if (pc) {
      try {
        pc.getSenders().forEach((s) => {
          if (s.track) s.track.stop();
        });
        pc.close();
      } catch (err) {
        console.error("close pc error:", err);
      }
      pcRef.current = null;
    }

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    if (isWebMicOn) {
      stopWebMic();
    }
    if (robotMicConnected) {
      disconnectRobotMic();
    }

    setIsCallActive(false);
    setWebRtcStatus("Cuộc gọi WebRTC đang tắt.");
  }

  function toggleWebRtcCall() {
    if (isCallActive) stopWebRtcCall();
    else startWebRtcCall();
  }

  // ===================================
  // UI
  // ===================================
  return (
    <div className={styles.page}>
      <div className="container-xxl py-3">
        <div className="row g-3" style={{ height: "calc(100vh - 2rem)" }}>
          {/* =================== LEFT: CONTROLS =================== */}
          <div className="col-lg-3 col-xl-3">
            <div className={`${styles.glass} p-3 h-100`}>
              <div className={styles.controlSidebar}>
                {/* Control Section */}
                <div className="mb-3">
                  <h6 className={styles.sectionTitle}>
                    <i className="bi bi-joystick"></i>
                    Điều khiển
                  </h6>

                  <button
                    className={`${styles.btnPrimary} mt-2`}
                    onClick={() => setRemoteMode(!remoteMode)}
                  >
                    <i
                      className={`bi ${
                        remoteMode ? "bi-stop-circle" : "bi-controller"
                      } me-1`}
                    ></i>
                    {remoteMode ? "Tắt lái từ xa" : "Lái từ xa"}
                  </button>

                  {remoteMode && (
                    <>
                      <div className={styles.pad}>
                        <div></div>
                        <div
                          className={`${styles.key} ${
                            activeKey === "w" ? styles.keyActive : ""
                          }`}
                          onClick={() => sendCommand("w")}
                        >
                          W
                        </div>
                        <div></div>
                        <div
                          className={`${styles.key} ${
                            activeKey === "a" ? styles.keyActive : ""
                          }`}
                          onClick={() => sendCommand("a")}
                        >
                          A
                        </div>
                        <div
                          className={`${styles.key} ${
                            activeKey === "s" ? styles.keyActive : ""
                          }`}
                          onClick={() => sendCommand("s")}
                        >
                          S
                        </div>
                        <div
                          className={`${styles.key} ${
                            activeKey === "d" ? styles.keyActive : ""
                          }`}
                          onClick={() => sendCommand("d")}
                        >
                          D
                        </div>
                      </div>
                      <div className="d-flex justify-content-center">
                        <div
                          className={`${styles.key} ${
                            activeKey === "x" ? styles.keyActive : ""
                          }`}
                          onClick={() => sendCommand("x")}
                        >
                          X
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <hr className={styles.divider} />

                {/* Compartments */}
                <div className="mb-3">
                  <h6 className={styles.sectionTitle}>
                    <i className="bi bi-box-seam"></i>
                    Hộp chứa
                  </h6>
                  <div className="mt-2">
                    {compartments.map((c) => (
                      <div key={c.id} className={styles.compartmentItem}>
                        <span className={styles.compartmentLabel}>{c.label}</span>
                        <button
                          className={
                            c.state === "open" ? styles.btnDanger : styles.btnSuccess
                          }
                          onClick={() => toggleCompartment(c.id)}
                        >
                          {c.state === "open" ? "Đóng" : "Mở"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <hr className={styles.divider} />

                {/* Audio Controls */}
                <div className="mb-3">
                  <h6 className={styles.sectionTitle}>
                    <i className="bi bi-mic-fill"></i>
                    Âm thanh (WebRTC)
                  </h6>
                  <div className="mt-2 d-flex flex-column gap-2">
                    <button
                      className={isCallActive ? styles.btnDanger : styles.btnSuccess}
                      onClick={toggleWebRtcCall}
                    >
                      <i className="bi bi-telephone-fill me-1"></i>
                      {isCallActive ? "Tắt cuộc gọi WebRTC" : "Bật cuộc gọi WebRTC"}
                    </button>

                    <small style={{ marginTop: "4px", opacity: 0.8 }}>
                      {webRtcStatus}
                      <br />
                      {webMicStatus}
                      <br />
                      {robotMicStatus}
                    </small>

                    <audio
                      ref={remoteAudioRef}
                      autoPlay
                      playsInline
                      style={{ display: "none" }}
                    />
                  </div>
                </div>

                <hr className={styles.divider} />

                {/* Destination Selection */}
                <div className="mb-3">
                  <h6 className={styles.sectionTitle}>
                    <i className="bi bi-geo-alt-fill"></i>
                    Điểm đến
                  </h6>

                  <select
                    className={`${styles.formSelect} mt-2`}
                    value={selectedDestination?.id || ""}
                    onChange={handleSelectDestination}
                  >
                    <option value="">— Chọn điểm đến —</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (map {d.mapId})
                      </option>
                    ))}
                  </select>

                  {/* Progress Bar */}
                  <div
                    style={{
                      marginTop: "10px",
                      marginBottom: "6px",
                      padding: "6px 8px",
                      borderRadius: "8px",
                      background:
                        "linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02))",
                      fontSize: "0.85rem",
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
                      <span style={{ fontWeight: 600 }}>Tiến độ nhiệm vụ</span>
                      <span>
                        {navProgress.robotCode
                          ? `Robot ${navProgress.robotCode}: ${navProgress.percent.toFixed(
                              1
                            )}%`
                          : "—"}
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
                          background: "linear-gradient(90deg, #0d6efd, #20c997)",
                          transition: "width 0.2s ease-out",
                        }}
                      ></div>
                    </div>
                    <div style={{ marginTop: "4px", opacity: 0.8 }}>
                      Điểm đến:{" "}
                      {navProgress.pointName || "Chưa nhận được điểm từ robot"}
                    </div>
                  </div>

                  {/* TTS Custom */}
                  <div
                    style={{
                      marginTop: "8px",
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
                    />
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={sendCustomTts}
                    >
                      <i className="bi bi-megaphone-fill me-1"></i>
                      Gửi cho robot đọc
                    </button>
                  </div>

                  <button
                    className={`${styles.btnTeal} mt-2`}
                    onClick={startRunMap}
                    disabled={!selectedDestination}
                  >
                    <i className="bi bi-play-circle me-1"></i>
                    Bắt đầu chạy
                  </button>

                  <button
                    className={`${styles.btnWarning} mt-2`}
                    onClick={sendReturnToStation}
                    style={{
                      background: "linear-gradient(135deg, #ff9800, #ff5722)",
                      border: "none",
                      width: "100%",
                      display: "block",
                    }}
                  >
                    <i className="bi bi-house-fill me-1"></i>
                    Về trạm
                  </button>

                  <button
                    className={`${styles.btnOutlinePrimary} mt-2`}
                    onClick={sendRoute}
                    disabled={!selectedDestination}
                  >
                    <i className="bi bi-send me-1"></i>
                    Gửi vị trí muốn đến
                  </button>

                  <button
                    className={`${styles.btnDanger} mt-2`}
                    onClick={sendEmergencyStop}
                    style={{
                      background: "linear-gradient(135deg, #dc3545, #c82333)",
                      border: "none",
                      width: "100%",
                    }}
                  >
                    <i className="bi bi-stop-circle-fill me-1"></i>
                    Dừng khẩn cấp
                  </button>

                  {selectedDestination && (
                    <div className={`${styles.destinationInfo} mt-2`}>
                      <div>
                        <strong>{selectedDestination.name}</strong>
                      </div>
                      <div>Map: {selectedMapName}</div>
                      <div>
                        X:{" "}
                        {typeof selectedDestination.x === "number"
                          ? selectedDestination.x.toFixed(2)
                          : selectedDestination.x ?? "?"}
                        {" | "}
                        Y:{" "}
                        {typeof selectedDestination.y === "number"
                          ? selectedDestination.y.toFixed(2)
                          : selectedDestination.y ?? "?"}
                      </div>
                    </div>
                  )}
                </div>

                <hr className={styles.divider} />

                {/* Logs */}
                <div className="flex-grow-1">
                  <div className={styles.headerBar}>
                    <h6 className={styles.sectionTitle}>
                      <i className="bi bi-journal-text"></i>
                      Nhật ký
                    </h6>
                    <button
                      className={styles.btnOutlineDanger}
                      onClick={() => setLogs([])}
                    >
                      Xóa
                    </button>
                  </div>

                  <div className={styles.logsContainer}>
                    {logs.length === 0 ? (
                      <div className={styles.logsEmpty}>
                        <i className="bi bi-inbox"></i>
                        <p className="mb-0 mt-1">Chưa có log</p>
                      </div>
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
              </div>
            </div>
          </div>

          {/* =================== RIGHT: CAMERA & MAPS =================== */}
          <div className="col-lg-9 col-xl-9">
            <div className={styles.mainContent}>
              {/* Camera Section */}
              <div className={`${styles.glass} p-3`}>
                <div className={styles.headerBar}>
                  <div className={styles.sectionTitle}>
                    <i className="bi bi-camera-video-fill"></i>
                    Camera Trực Tiếp
                  </div>
                  <span
                    className={
                      status.includes("kết nối")
                        ? styles.statusBadgeSuccess
                        : styles.statusBadge
                    }
                  >
                    {status}
                  </span>
                </div>

                <div className={styles.cameraBox}>
                  {cameraFrame ? (
                    <img src={cameraFrame} alt="Camera feed" />
                  ) : (
                    <span className={styles.cameraPlaceholder}>
                      <i
                        className="bi bi-camera-video"
                        style={{
                          fontSize: "2rem",
                          display: "block",
                          marginBottom: "0.5rem",
                        }}
                      ></i>
                      Đang chờ khung hình...
                    </span>
                  )}
                </div>
              </div>

              {/* Dual Map Section */}
              <div className={`${styles.glass} p-3 flex-grow-1 d-flex flex-column`}>
                <div className={styles.headerBar}>
                  <div className={styles.sectionTitle}>
                    <i className="bi bi-map-fill"></i>
                    Bản đồ điều hướng
                  </div>

                  {/* <div className={styles.inputGroup} style={{ maxWidth: "280px" }}>
                    <input
                      className={styles.formControl}
                      placeholder="Tên bản đồ..."
                      value={mapName}
                      onChange={(e) => setMapName(e.target.value)}
                    />
                    <button className={styles.btnSuccess} onClick={saveMap}>
                      <i className="bi bi-save"></i>
                    </button>
                  </div> */}
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
      </div>

      {/* ⭐ Alert Floating Button */}
      <button 
        className={styles.alertFloatingBtn} 
        onClick={() => setShowAlertPanel(!showAlertPanel)}
      >
        <i className="bi bi-bell-fill"></i>
        {unreadAlertCount > 0 && (
          <span className={styles.alertBadge}>{unreadAlertCount}</span>
        )}
      </button>

     {/* ⭐ Alert Panel */}
{showAlertPanel && (
  <div className={styles.alertOverlay}>
    <div className={styles.alertPanel}>
      {/* Header */}
      <div className={styles.alertHeader}>
        <h5 className={styles.alertTitle}>
          <i className="bi bi-bell-fill me-2"></i>
          Cảnh báo hệ thống
        </h5>
        <button 
          className={styles.alertCloseBtn} 
          onClick={() => setShowAlertPanel(false)}
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      {/* Alert List */}
      <div className={styles.alertList}>
        {alerts.length === 0 ? (
          <div className={styles.alertEmpty}>
            <i className="bi bi-inbox" style={{ fontSize: "3rem", opacity: 0.3 }}></i>
            <p>Không có cảnh báo</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const { icon, color } = getSeverityIcon(alert.severity);

            return (
              <div key={alert.id} className={styles.alertItem}>
                {/* ⭐ Checkbox để đánh dấu resolved */}
                <div className={styles.alertCheckbox}>
                  <input
                    type="checkbox"
                    id={`alert-${alert.id}`}
                    onChange={() => markAlertAsResolved(alert.id)}
                    title="Đánh dấu đã xử lý"
                  />
                </div>

                {/* Icon severity */}
                <div className={styles.alertIcon} style={{ color }}>
                  <i className={`bi ${icon}`}></i>
                </div>

                {/* Nội dung alert */}
                <div className={styles.alertContent}>
                  <div className={styles.alertItemHeader}>
                    <span className={styles.alertCategory}>
                      {alert.category || "Hệ thống"}
                    </span>
                    <span className={styles.alertTime}>
                      {formatTime(alert.createdAt)}
                    </span>
                  </div>
                  
                  <p className={styles.alertMessage}>{alert.message}</p>

                  {alert.robotId && (
                    <div className={styles.alertRobotInfo}>
                      <i className="bi bi-robot me-1"></i>
                      Robot #{alert.robotId}
                    </div>
                  )}

                  <span
                    className={styles.alertSeverityBadge}
                    style={{ backgroundColor: color }}
                  >
                    {alert.severity || "medium"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  </div>
)}


      <Toast toast={toast} showToast={showToast} />
    </div>
  );
}

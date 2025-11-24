import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import styles from "@/assets/styles/robotLiveConsole.module.css";

export default function RunTask() {
  const { taskId } = useParams();

  // ===================================
  // MAP REFS
  // ===================================
  const navMapRef = useRef(null);
  const navMapLayer = useRef(null);

  const liveMapRef = useRef(null);
  const liveMapLayer = useRef(null);
  const robotMarker = useRef(null);

  // ===================================
  // STATE
  // ===================================
  const [status, setStatus] = useState("🕓 Đang kết nối...");
  const [cameraFrame, setCameraFrame] = useState(null);
  const [runInfo, setRunInfo] = useState(null);

  const [logs, setLogs] = useState([]);
  const [activeKey, setActiveKey] = useState("");

  // Compartments
  const [compartments, setCompartments] = useState([
    { id: 1, label: "Hộp 1", state: "closed" },
    { id: 2, label: "Hộp 2", state: "closed" },
  ]);

  // Mic states
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

  const [remoteMode, setRemoteMode] = useState(false);

  // =========================================================
  // LOAD RUN-INFO
  // =========================================================
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_CONFIG.API_BASE}/Tasks/${taskId}/run-info`);
        const data = await res.json();
        setRunInfo(data);

        if (data.mapId) loadNavigationMap(data.mapId, data.stops);
      } catch (err) {
        console.error("❌ Lỗi load run-info:", err);
      }
    }

    load();
  }, [taskId]);

  // =========================================================
  // LOAD NAVIGATION MAP (THEO TASK)
  // =========================================================
  async function loadNavigationMap(mapId, stops) {
    if (!window.L) return;
    const L = window.L;

    const metaRes = await fetch(`${API_CONFIG.API_BASE}/MapsUpload/${mapId}`);
    const meta = await metaRes.json();
    const imgUrl = `${API_CONFIG.API_BASE}/MapsUpload/${mapId}/image`;

    const img = new Image();
    img.src = imgUrl;

    img.onload = () => {
      const res = meta.resolution;

      const bounds = [
        [0, 0],
        [img.height * res, img.width * res],
      ];

      if (!navMapRef.current) {
        navMapRef.current = L.map("nav-map", { crs: L.CRS.Simple });
        L.control.zoom({ position: "bottomright" }).addTo(navMapRef.current);
      }

      if (navMapLayer.current)
        navMapRef.current.removeLayer(navMapLayer.current);

      navMapLayer.current = L.imageOverlay(imgUrl, bounds).addTo(navMapRef.current);
      navMapRef.current.fitBounds(bounds);

      stops.forEach((s, idx) => {
        const icon = L.divIcon({
          html: `<div style="font-size:20px;color:red">${idx + 1}</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        L.marker([s.y, s.x], { icon }).addTo(navMapRef.current);
      });
    };
  }

  // =========================================================
  // SIGNALR — POSITION + CAMERA
  // =========================================================
  useEffect(() => {
    const posConn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_CONFIG.API_BASE1}/hubs/robotposition`)
      .withAutomaticReconnect()
      .build();

    const camConn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_CONFIG.API_BASE1}/hubs/robotcamera`)
      .withAutomaticReconnect()
      .build();

    posConn.on("ReceiveMapUpdate", (map) => drawLiveMap(map));
    posConn.on("ReceivePosition", (pos) => updateRobotPosition(pos));

    camConn.on("ReceiveCameraFrame", (frame) => {
      if (frame?.image_b64)
        setCameraFrame(`data:image/jpeg;base64,${frame.image_b64}`);
    });

    posConn.start().then(() => setStatus("Đã kết nối robot"));
    camConn.start();

    return () => {
      posConn.stop();
      camConn.stop();
    };
  }, []);

  function drawLiveMap(mapData) {
    if (!window.L) return;
    const L = window.L;

    const base64 = mapData.Data_b64;
    if (!base64) return;

    const res = mapData.Resolution;
    const w = mapData.Width;
    const h = mapData.Height;
    const ox = mapData.Origin.X;
    const oy = mapData.Origin.Y;

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
    }

    if (liveMapLayer.current)
      liveMapRef.current.removeLayer(liveMapLayer.current);

    liveMapLayer.current = L.imageOverlay(imgSrc, bounds).addTo(liveMapRef.current);
    liveMapRef.current.fitBounds(bounds);
  }

  function updateRobotPosition(pos) {
    if (!window.L || !liveMapRef.current) return;
    const L = window.L;

    const icon = L.divIcon({
      html: `<div style="transform:rotate(${pos.theta}rad);font-size:20px;">🤖</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const latlng = [pos.y, pos.x];

    if (!robotMarker.current)
      robotMarker.current = L.marker(latlng, { icon }).addTo(liveMapRef.current);
    else
      robotMarker.current.setLatLng(latlng);
  }

  // =========================================================
  // CONTROL (WASD)
  // =========================================================
  async function sendCommand(key) {
    try {
      await fetch(`${API_CONFIG.API_BASE1}/api/RobotMode/control`, {
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
    } catch {}
  }

  // key listener
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

  // =========================================================
  // COMPARTMENTS
  // =========================================================
  async function toggleCompartment(id) {
    const comp = compartments.find((c) => c.id === id);
    const newState = comp.state === "open" ? "close" : "open";

    try {
      await fetch(`${API_CONFIG.API_BASE1}/api/RobotCompartmentSignal/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compartmentId: id, action: newState }),
      });

      setCompartments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, state: newState } : c))
      );
    } catch {}
  }

  // =========================================================
  // MIC WEB → ROBOT
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
        });
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
    }

    const source = webSourceNodeRef.current;
    if (source) source.disconnect();

    const audioCtx = webAudioContextRef.current;
    if (audioCtx) audioCtx.close();

    const stream = webMediaStreamRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());

    setIsWebMicOn(false);
    setWebMicStatus("Mic web đang tắt.");
  }

  function toggleWebMic() {
    isWebMicOn ? stopWebMic() : startWebMic();
  }

  // =========================================================
  // ROBOT MIC → WEB
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

    await conn.start();

    robotAudioConnRef.current = conn;
    setRobotMicConnected(true);
    setRobotMicStatus("Đã kết nối Robot Mic.");
  }

  async function disconnectRobotMic() {
    const conn = robotAudioConnRef.current;
    if (conn) await conn.stop();

    const audioCtx = robotAudioContextRef.current;
    if (audioCtx) audioCtx.close();

    robotPlaybackTimeRef.current = 0;
    setRobotMicConnected(false);
    setRobotMicStatus("Robot mic đã tắt.");
  }

  function toggleRobotMic() {
    robotMicConnected ? disconnectRobotMic() : connectRobotMic();
  }

  // =========================================================
  // UI
  // =========================================================

  if (!runInfo)
    return <div className="p-4">Đang tải dữ liệu nhiệm vụ...</div>;

  return (
    <div className={styles.page}>
      <div className="container-xxl py-3">
        <div className="row g-3" style={{ height: "calc(100vh - 2rem)" }}>
          
          {/* ================================= LEFT PANEL ================================= */}
          <div className="col-lg-3 col-xl-3">
            <div className={`${styles.glass} p-3 h-100`}>
              <div className={styles.controlSidebar}>

                {/* CONTROL */}
                <div className="mb-3">
                  <h6 className={styles.sectionTitle}>
                    <i className="bi bi-joystick"></i> Điều khiển
                  </h6>

                  <button
                    className={`${styles.btnPrimary} mt-2`}
                    onClick={() => setRemoteMode(!remoteMode)}
                  >
                    <i className={`bi ${remoteMode ? "bi-stop-circle" : "bi-controller"} me-1`}></i>
                    {remoteMode ? "Tắt lái từ xa" : "Lái từ xa"}
                  </button>

                  {remoteMode && (
                    <>
                      <div className={styles.pad}>
                        <div></div>
                        <div
                          className={`${styles.key} ${activeKey === "w" ? styles.keyActive : ""}`}
                          onClick={() => sendCommand("w")}
                        >
                          W
                        </div>
                        <div></div>

                        <div
                          className={`${styles.key} ${activeKey === "a" ? styles.keyActive : ""}`}
                          onClick={() => sendCommand("a")}
                        >
                          A
                        </div>

                        <div
                          className={`${styles.key} ${activeKey === "s" ? styles.keyActive : ""}`}
                          onClick={() => sendCommand("s")}
                        >
                          S
                        </div>

                        <div
                          className={`${styles.key} ${activeKey === "d" ? styles.keyActive : ""}`}
                          onClick={() => sendCommand("d")}
                        >
                          D
                        </div>
                      </div>

                      <div className="d-flex justify-content-center">
                        <div
                          className={`${styles.key} ${activeKey === "x" ? styles.keyActive : ""}`}
                          onClick={() => sendCommand("x")}
                        >
                          X
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <hr className={styles.divider} />

                {/* COMPARTMENTS */}
                <div className="mb-3">
                  <h6 className={styles.sectionTitle}>
                    <i className="bi bi-box-seam"></i> Hộp chứa
                  </h6>

                  {compartments.map((c) => (
                    <div key={c.id} className={styles.compartmentItem}>
                      <span className={styles.compartmentLabel}>{c.label}</span>
                      <button
                        className={c.state === "open" ? styles.btnDanger : styles.btnSuccess}
                        onClick={() => toggleCompartment(c.id)}
                      >
                        {c.state === "open" ? "Đóng" : "Mở"}
                      </button>
                    </div>
                  ))}
                </div>

                <hr className={styles.divider} />

                {/* AUDIO */}
                <div className="mb-3">
                  <h6 className={styles.sectionTitle}>
                    <i className="bi bi-mic-fill"></i> Âm thanh
                  </h6>

                  <button
                    className={isWebMicOn ? styles.btnDanger : styles.btnSuccess}
                    onClick={toggleWebMic}
                  >
                    {isWebMicOn ? "Tắt Mic Web → Robot" : "Bật Mic Web → Robot"}
                  </button>

                  <button
                    className={robotMicConnected ? styles.btnDanger : styles.btnOutlinePrimary}
                    onClick={toggleRobotMic}
                    style={{ marginTop: "8px" }}
                  >
                    {robotMicConnected ? "Tắt Robot Mic → Web" : "Bật Robot Mic → Web"}
                  </button>

                  <div style={{ marginTop: "8px" }}>
                    <small>{webMicStatus}</small><br />
                    <small>{robotMicStatus}</small>
                  </div>
                </div>

                <hr className={styles.divider} />

                {/* ================== TASK DESTINATIONS ================== */}
                <div className="mb-3">
                  <h6 className={styles.sectionTitle}>
                    <i className="bi bi-geo-alt-fill"></i> Điểm dừng nhiệm vụ
                  </h6>

                  {runInfo.stops.map((s, i) => (
                    <div key={i} className={styles.destinationInfo}>
                      <strong>{i + 1}. {s.name}</strong>
                      <div>X: {s.x} | Y: {s.y}</div>
                    </div>
                  ))}
                </div>

                <hr className={styles.divider} />

                {/* Logs */}
                <div className="flex-grow-1">
                  <div className={styles.headerBar}>
                    <h6 className={styles.sectionTitle}>
                      <i className="bi bi-journal-text"></i> Nhật ký
                    </h6>
                    <button className={styles.btnOutlineDanger} onClick={() => setLogs([])}>
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

          {/* ================================= RIGHT PANEL ================================= */}
          <div className="col-lg-9 col-xl-9">
            <div className={styles.mainContent}>

              {/* CAMERA */}
              <div className={`${styles.glass} p-3`}>
                <div className={styles.headerBar}>
                  <h6 className={styles.sectionTitle}>
                    <i className="bi bi-camera-video-fill"></i> Camera Trực Tiếp
                  </h6>

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
                    <img src={cameraFrame} alt="Robot Camera" />
                  ) : (
                    <span className={styles.cameraPlaceholder}>
                      <i className="bi bi-camera-video" style={{ fontSize: "2rem" }}></i>
                      <div>Đang chờ khung hình…</div>
                    </span>
                  )}
                </div>
              </div>

              {/* MAPS */}
              <div className={`${styles.glass} p-3 flex-grow-1 d-flex flex-column`}>
                <div className={styles.headerBar}>
                  <h6 className={styles.sectionTitle}>
                    <i className="bi bi-map-fill"></i> Bản đồ điều hướng (Theo nhiệm vụ)
                  </h6>
                </div>

                <div className={styles.dualMapContainer}>

                  <div className={styles.mapBoxWrapper}>
                    <div className={styles.mapLabel}>Điểm dừng</div>
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
    </div>
  );
}

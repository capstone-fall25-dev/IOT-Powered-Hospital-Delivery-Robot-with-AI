import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import styles from "@/assets/styles/robotDetail.module.css";
import { getRobotById } from "@/services/robotService";
import { API_CONFIG } from "@/utils/apiConfig";


export default function RobotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();


  const [robot, setRobot] = useState(null);
  const [loading, setLoading] = useState(true);


  // Power toggle pending
  const [pendingToggle, setPendingToggle] = useState(false);
  const powerAckTimerRef = useRef(null);


  // Voice toggle state
  const [voice, setVoice] = useState(1); // 1 = VITS (Nam), 2 = Piper (Nữ)
  const [pendingVoice, setPendingVoice] = useState(false);
  const voiceAckTimerRef = useRef(null);


  // 2 connections
  const robotConnRef = useRef(null);
  const ttsConnRef = useRef(null);


  // ============================
  // Load robot info
  // ============================
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getRobotById(id);
        if (!mounted) return;


        // ✅ Suy luận power: khác offline = bật, offline = tắt
        const power = (data?.status || "").toLowerCase() !== "offline";
        setRobot({ ...data, power });


        // Nếu BE có lưu voice trong robot profile, có thể setVoice(data.voice || 1)
        setVoice(1);
        // eslint-disable-next-line no-console
        console.log("Robot loaded:", data);
      } catch (err) {
        console.error("Failed to load robot:", err);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);


  // ============================
  // SignalR realtime (2 hubs)
  // ============================
  useEffect(() => {
    // hub 1: robot (power/status)
    const robotConnection = new signalR.HubConnectionBuilder()
      .withUrl(API_CONFIG.API_BASE1 + "/hubs/robot")
      .withAutomaticReconnect()
      .build();


    robotConnRef.current = robotConnection;


    robotConnection.on("RobotPowerStatus", (data) => {
      // Payload gợi ý: { robotCode, power: bool, status, ... }
      if (!robot || !data || data.robotCode !== robot.code) return;


      // ✅ Ground truth từ server: khác offline = bật
      const statusLower = (data.status || "").toLowerCase();
      const isPowered = statusLower !== "offline";
      
      setRobot((prev) => ({
        ...prev,
        power: isPowered,
        status: data.status || (isPowered ? "at_station" : "offline"),
        connectivity: isPowered ? "Online" : "Offline",
      }));


      setPendingToggle(false);
      if (powerAckTimerRef.current) {
        window.clearTimeout(powerAckTimerRef.current);
        powerAckTimerRef.current = null;
      }
    });


    // hub 2: tts (voice change)
    const ttsConnection = new signalR.HubConnectionBuilder()
      .withUrl(API_CONFIG.API_BASE1 + "/hubs/ttsHub")
      .withAutomaticReconnect()
      .build();


    ttsConnRef.current = ttsConnection;


    ttsConnection.on("VoiceStatus", (payload) => {
      // Payload: { robotCode, voice, ok, message }
      if (!robot) return;
      if (payload?.robotCode && payload.robotCode !== robot.code) return;


      if (voiceAckTimerRef.current) {
        window.clearTimeout(voiceAckTimerRef.current);
        voiceAckTimerRef.current = null;
      }
      setPendingVoice(false);


      if (payload?.ok) {
        setVoice(Number(payload.voice) === 2 ? 2 : 1);
      } else {
        alert("Đổi giọng thất bại: " + (payload?.message || "unknown"));
      }
    });


    Promise.all([robotConnection.start(), ttsConnection.start()])
      .then(() => console.log("SignalR connected (robot + tts)"))
      .catch((err) => console.error("SignalR error:", err));


    return () => {
      if (powerAckTimerRef.current) {
        window.clearTimeout(powerAckTimerRef.current);
        powerAckTimerRef.current = null;
      }
      if (voiceAckTimerRef.current) {
        window.clearTimeout(voiceAckTimerRef.current);
        voiceAckTimerRef.current = null;
      }
      robotConnection.stop();
      ttsConnection.stop();
      robotConnRef.current = null;
      ttsConnRef.current = null;
    };
    // Re-subscribe khi đổi robot code
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robot?.code]);


  // ============================
  // Toggle power (send then wait for ACK)
  // ============================
  const togglePower = useCallback(async () => {
    if (!robot || pendingToggle) return;


    try {
      setPendingToggle(true);


      const res = await fetch(API_CONFIG.API_BASE1 + "/api/RobotPower/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robotCode: robot.code }),
      });


      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPendingToggle(false);
        alert("Gửi lệnh thất bại: " + (err?.error || res.statusText));
        return;
      }


      // Chờ ROS2 ack qua SignalR (timeout 10s)
      if (powerAckTimerRef.current) window.clearTimeout(powerAckTimerRef.current);
      powerAckTimerRef.current = window.setTimeout(() => {
        setPendingToggle(false);
        alert("Không nhận được phản hồi từ robot. Trạng thái không thay đổi.");
      }, 10000);
    } catch (err) {
      console.error("Toggle error:", err);
      setPendingToggle(false);
      alert("Lỗi gửi lệnh bật/tắt: " + (err?.message || "unknown"));
    }
  }, [robot, pendingToggle]);


  // ============================
  // Toggle voice (send then wait for ACK)
  // ============================
  const toggleVoice = useCallback(async () => {
    if (!robot || !robot.power || pendingVoice) return;


    const next = voice === 1 ? 2 : 1;
    try {
      setPendingVoice(true);
      const res = await fetch(API_CONFIG.API_BASE1 + "/api/TTS/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice: next,           // 1 = VITS (Nam), 2 = Piper (Nữ)
          robotCode: robot.code, // để ROS chỉ đổi đúng robot
        }),
      });


      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPendingVoice(false);
        alert("Đổi giọng thất bại: " + (err?.error || res.statusText));
        return;
      }


      // Chờ ACK VoiceStatus từ ROS qua TTS Hub (timeout 20s)
      if (voiceAckTimerRef.current) window.clearTimeout(voiceAckTimerRef.current);
      voiceAckTimerRef.current = window.setTimeout(() => {
        setPendingVoice(false);
        alert("Không nhận được phản hồi đổi giọng từ robot.");
      }, 20000);
    } catch (e) {
      console.error("Voice toggle error:", e);
      setPendingVoice(false);
      alert("Lỗi gọi API đổi giọng");
    }
  }, [voice, robot, pendingVoice]);


  // ============================
  // UI helpers
  // ============================
  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    const badges = {
      in_progress: { text: "Đang hoạt động", class: styles.badgeActive },
      at_station: { text: "Tại trạm", class: styles.badgeStation },
      pending: { text: "Chờ nhiệm vụ", class: styles.badgePending },
      offline: { text: "Không kết nối", class: styles.badgeOffline },
    };
    const badge = badges[s] || badges["offline"];
    return <span className={badge.class}>{badge.text}</span>;
  };


  const getBatteryClass = (percent) => {
    const p = Number(percent) || 0;
    if (p < 30) return styles.progressDanger;
    if (p < 60) return styles.progressWarning;
    return styles.progressSuccess;
  };


  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className="spinner-border text-primary"></div>
          <p className={styles.loadingText}>Đang tải thông tin robot...</p>
        </div>
      </div>
    );
  }


  if (!robot) {
    return (
      <div className={styles.page}>
        <div className="container-xl py-4">
          <div className={styles.emptyState}>
            <i className="bi bi-exclamation-triangle" style={{ fontSize: "3rem" }}></i>
            <p>Không tìm thấy robot</p>
            <button className={styles.btnTeal} onClick={() => navigate("/team")}>
              Quay lại danh sách
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className={styles.page}>
      <div className="container-xl py-4">
        {/* Back Button */}
        <div className="mb-3">
          <button className={styles.btnPrimary} onClick={() => navigate("/team")}>
            <i className="bi bi-arrow-left me-1"></i>
            Quay lại
          </button>
        </div>


        <div className={`${styles.glass} p-4 p-md-5`}>
          {/* =================== HEADER =================== */}
          <div className={styles.headerSection}>
            <div className={styles.robotAvatar}>
              <i className="bi bi-robot"></i>
              <br />
              {robot.code}
            </div>


            <div className={styles.robotInfo}>
              <h4 className={styles.robotTitle}>{robot.name}</h4>
              <div className={styles.robotCode}>
                <i className="bi bi-upc-scan me-1"></i>
                Mã: {robot.code}
              </div>
              <div>{getStatusBadge(robot.status)}</div>
            </div>


            <div className={styles.robotActions}>
              {/* Power */}
              <button
                className={robot.power ? styles.btnPowerOff : styles.btnPowerOn}
                onClick={togglePower}
                disabled={pendingToggle}
                title={pendingToggle ? "Đang chờ phản hồi từ robot..." : ""}
              >
                <i className="bi bi-power me-1"></i>
                {pendingToggle ? "Đang chờ robot..." : robot.power ? "Tắt robot" : "Bật robot"}
              </button>


              {/* Voice toggle (chỉ dùng khi robot bật) */}
              <button
                className={styles.btnTeal}
                disabled={!robot.power || pendingVoice}
                onClick={toggleVoice}
                title={!robot.power ? "Chỉ dùng khi robot đang bật" : ""}
              >
                <i className="bi bi-megaphone me-1"></i>
                {pendingVoice ? "Đang đổi giọng..." : `Đổi giọng (${voice === 1 ? "Nam" : "Nữ"})`}
              </button>


              {/* Control */}
              <button
                className={styles.btnTeal}
                disabled={!robot.power || pendingToggle}
                onClick={() => navigate("/run-map")}
              >
                <i className="bi bi-joystick me-1"></i>
                Điều khiển
              </button>
            </div>
          </div>


          <button
            className={styles.btnTeal}
            onClick={() => navigate(`/robot-edit/${robot.id}`)}
          >
            <i className="bi bi-pencil-square me-1"></i>
            Cấu Hình
          </button>


          {/* =================== DETAIL + TASKS =================== */}
          <div className="row g-4 mt-3">
            {/* Thông tin chi tiết */}
            <div className="col-lg-7">
              <h6 className={styles.sectionTitle}>
                <i className="bi bi-info-circle-fill"></i>
                Thông tin chi tiết
              </h6>


              <div className={styles.infoGrid}>
                <div className={styles.infoLabel}>
                  <i className="bi bi-tag me-1"></i>
                  Loại robot
                </div>
                <div className={styles.infoValue}>Xe chở thuốc</div>


                <div className={styles.infoLabel}>
                  <i className="bi bi-geo-alt me-1"></i>
                  Vị trí hiện tại
                </div>
                <div className={styles.infoValue}>
                  {robot.latitude && robot.longitude
                    ? `(${Number(robot.latitude).toFixed(4)}, ${Number(robot.longitude).toFixed(4)})`
                    : "Tại trạm sạc"}
                </div>


                <div className={styles.infoLabel}>
                  <i className="bi bi-wifi me-1"></i>
                  Kết nối
                </div>
                <div className={styles.infoValue}>
                  {robot.power ? (
                    <span className="text-success">
                      <i className="bi bi-circle-fill me-1" style={{ fontSize: "0.5rem" }}></i>
                      Online
                    </span>
                  ) : (
                    <span className="text-danger">
                      <i className="bi bi-circle-fill me-1" style={{ fontSize: "0.5rem" }}></i>
                      Offline
                    </span>
                  )}
                </div>


                <div className={styles.infoLabel}>
                  <i className="bi bi-battery-charging me-1"></i>
                  Pin
                </div>
                <div className={styles.infoValue}>
                  <div className={styles.progressContainer}>
                    <div
                      className={`${styles.progressBar} ${getBatteryClass(robot.batteryPercent)}`}
                      style={{ width: `${Number(robot.batteryPercent)}%` }}
                    />
                  </div>
                  <small>{Number(robot.batteryPercent)}%</small>
                </div>
              </div>


              <button className={styles.btnPrimary + " mt-4"}>
                <i className="bi bi-geo-alt-fill me-1"></i>
                Định vị nhanh
              </button>
            </div>


            {/* Danh sách nhiệm vụ hiện tại */}
            <div className="col-lg-5">
              <h6 className={styles.sectionTitle}>
                <i className="bi bi-list-task"></i>
                Nhiệm vụ hiện tại
              </h6>


              {robot.tasks && robot.tasks.length > 0 ? (
                robot.tasks
                  .filter((t) => t.status === "in_progress" || t.status === "pending")
                  .slice(0, 5)
                  .map((task) => (
                    <div key={task.id} className={styles.taskCard}>
                      <div className={styles.taskHeader}>
                        <div className={styles.taskTitle}>
                          <i className="bi bi-clipboard-check me-1"></i>
                          Nhiệm vụ #{task.id}
                        </div>
                        {getStatusBadge(task.status)}
                      </div>


                      <div className={styles.taskMeta}>
                        <i className="bi bi-geo me-1"></i>
                        {task.stops && task.stops.length > 0
                          ? `${task.stops.length} điểm dừng`
                          : "Chưa có điểm dừng"}
                      </div>


                      {task.stops && task.stops.length > 0 && (
                        <ol className={styles.taskStops}>
                          {task.stops.map((stop) => (
                            <li key={stop.seqNo}>
                              <strong>{stop.destinationName}</strong>
                              {stop.patientName && <> - {stop.patientName}</>}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ))
              ) : (
                <div className={styles.emptyState}>
                  <i
                    className="bi bi-inbox"
                    style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}
                  ></i>
                  Chưa có nhiệm vụ nào
                </div>
              )}
            </div>
          </div>


          {/* =================== GALLERY =================== */}
          <div className="mt-4">
            <h6 className={styles.sectionTitle}>
              <i className="bi bi-images"></i>
              Hình ảnh hoạt động
            </h6>
            <div className={styles.galleryGrid}>
              {[1, 2, 3, 4].map((i) => (
                <img
                  key={i}
                  className={styles.galleryThumb}
                  src={`https://picsum.photos/400/300?random=${Number(robot.id) + i}`}
                  alt={`Hoạt động ${i}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

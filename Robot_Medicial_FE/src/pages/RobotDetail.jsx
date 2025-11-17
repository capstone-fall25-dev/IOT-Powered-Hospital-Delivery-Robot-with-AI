import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import styles from "@/assets/styles/robotDetail.module.css";
import { getRobotById } from "@/services/robotService"; 
import { API_CONFIG } from "@/utils/apiConfig";
export default function RobotDetail() {
  const { id } = useParams(); // Lấy id từ URL: /robot/1
  const [robot, setRobot] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================
  // LẤY DỮ LIỆU ROBOT TỪ API
  // ============================
  useEffect(() => {
    const fetchRobot = async () => {
      try {
        const data = await getRobotById(id);
        setRobot(data);
        console.log("Robot loaded:", data);
      } catch (err) {
        console.error("Failed to load robot:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRobot();
  }, [id]);

  // ============================
  // SignalR Realtime Power Status
  // ============================
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(API_CONFIG.API_BASE1+"/hubs/robot")
      .withAutomaticReconnect()
      .build();

    conn.on("RobotPowerStatus", (data) => {
      console.log("SignalR Power Update:", data);
      setRobot((prev) => ({
        ...prev,
        power: data.power,
        status: data.power ? "Đang hoạt động" : "Tạm dừng",
        connectivity: data.power ? "Online" : "Offline",
      }));
    });

    conn.start().catch((err) => console.error("SignalR error:", err));

    return () => conn.stop();
  }, []);

  // ============================
  // Toggle Power
  // ============================
  const togglePower = useCallback(async () => {
    try {
      const res = await fetch(API_CONFIG.API_BASE1+"/api/RobotPower/toggle", {
        method: "POST",
      });
      const data = await res.json();
      setRobot((prev) => ({
        ...prev,
        power: data.power,
        status: data.power ? "Đang hoạt động" : "Tạm dừng",
        connectivity: data.power ? "Online" : "Offline",
      }));
    } catch (err) {
      console.error("Toggle error:", err);
    }
  }, []);

  // ============================
  // Badge Status
  // ============================
  const getStatusBadge = (status) => {
    const map = {
      "in_progress": { text: "Đang hoạt động", color: "bg-success-subtle text-success" },
      "at_station": { text: "Tại trạm", color: "bg-info-subtle text-info" },
      "pending": { text: "Chờ nhiệm vụ", color: "bg-warning-subtle text-warning" },
    };
    const item = map[status] || { text: "Không kết nối", color: "bg-secondary-subtle text-secondary" };
    return <span className={`badge ${item.color} border`}>{item.text}</span>;
  };

  if (loading) return <div className="text-center py-5">Đang tải robot...</div>;
  if (!robot) return <div className="text-center py-5 text-danger">Không tìm thấy robot</div>;

  return (
    <div className={styles.page}>
      <div className="container-lg py-4">
        <div className={`${styles.glass} ${styles.rounded2xl} p-3 p-md-4`}>
          {/* HEADER */}
          <div className="d-flex align-items-start gap-3">
            <div className={`${styles.cover} bg-primary text-white d-flex align-items-center justify-content-center fw-bold`}>
              {robot.code}
            </div>
            <div className="flex-grow-1">
              <h4 className={`mb-1 ${styles.title}`}>{robot.name}</h4>
              <div className="text-muted small">Mã: {robot.code}</div>
              <div className="mt-1">{getStatusBadge(robot.status)}</div>
            </div>

            <div className="d-flex flex-column gap-2">
              <button
                className={`btn ${robot.power ? "btn-danger" : "btn-success"} rounded-pill`}
                onClick={togglePower}
              >
                {robot.power ? (
                  <>Tắt robot</>
                ) : (
                  <>Bật robot</>
                )}
              </button>

              <button
                className={`btn ${styles.btnTeal} rounded-pill`}
                disabled={!robot.power}
              >
                Điều khiển robot
              </button>
            </div>
          </div>

          {/* DETAIL + TASKS */}
          <div className="row g-4 mt-3">
            {/* Thông tin chi tiết */}
            <div className="col-lg-7">
              <div className={styles.kv}>
                <div className="text-muted">Loại robot</div>
                <div className="fw-semibold">Xe chở thuốc</div>

                <div className="text-muted">Vị trí hiện tại</div>
                <div className="fw-semibold">
                  {robot.latitude && robot.longitude
                    ? `(${robot.latitude.toFixed(4)}, ${robot.longitude.toFixed(4)})`
                    : "Tại trạm sạc"}
                </div>

                <div className="text-muted">Kết nối</div>
                <div className="fw-semibold">
                  {robot.power ? "Online" : "Offline"}
                </div>

                <div className="text-muted">Pin</div>
                <div>
                  <div className="progress" style={{ height: "8px" }}>
                    <div
                      className={`progress-bar ${
                        robot.batteryPercent < 30 ? "bg-danger" : robot.batteryPercent < 60 ? "bg-warning" : "bg-success"
                      }`}
                      style={{ width: `${robot.batteryPercent}%` }}
                    ></div>
                  </div>
                  <small className="text-muted">{robot.batteryPercent}%</small>
                </div>
              </div>

              <button className="btn btn-primary mt-3 rounded-pill">
                Định vị nhanh
              </button>
            </div>

            {/* Danh sách nhiệm vụ hiện tại */}
            <div className="col-lg-5">
              <h6 className="fw-bold mb-3">Nhiệm vụ hiện tại</h6>
              <div className="list-group">
                {robot.tasks
                  .filter(t => t.status === "in_progress" || t.status === "pending")
                  .slice(0, 5)
                  .map((task) => (
                    <div key={task.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="fw-semibold">Nhiệm vụ #{task.id}</div>
                          <small className="text-muted">
                            {task.stops.length > 0
                              ? `${task.stops.length} điểm dừng`
                              : "Chưa có điểm dừng"}
                          </small>
                        </div>
                        {getStatusBadge(task.status)}
                      </div>

                      {task.stops.length > 0 && (
                        <ol className="mt-2 mb-0 ps-3 small">
                          {task.stops.map((stop) => (
                            <li key={stop.seqNo}>
                              {stop.destinationName}
                              {stop.patientName && ` - ${stop.patientName}`}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Gallery */}
          <div className="mt-4">
            <h6 className="fw-bold mb-2">Hình ảnh hoạt động</h6>
            <div className="row g-3">
              {[1, 2, 3, 4].map((i) => (
                <div className="col-6 col-md-3" key={i}>
                  <img
                    className={`${styles.thumb} w-100`}
                    src={`https://picsum.photos/400/300?random=${robot.id + i}`}
                    alt={`Hoạt động ${i}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
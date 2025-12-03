import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRobots } from "@/services/robotService";
import { getAllTasks } from "@/services/taskService";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import styles from "@/assets/styles/robotDashboard.module.css";
import useToast from "@/hooks/useToast";

/* ========================= COMPONENT CHÍNH ========================= */
export default function RobotTaskDashboard() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  /* ========================= STATE ========================= */
  const [robots, setRobots] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage, setTasksPerPage] = useState(5);
  const [tick, setTick] = useState(0);

  /* ========================= MAPPING TRẠNG THÁI ========================= */
  const statusMap = {
    transporting: "Đang vận chuyển",
    awaiting_handover: "Chờ bàn giao",
    returning_to_station: "Trở về trạm",
    at_station: "Tại trạm",
    completed: "Hoàn thành",
    charging: "Đang sạc",
    needs_attention: "Cần hỗ trợ",
    manual_control: "Điều khiển thủ công",
    offline: "Ngoại tuyến",
    pending: "Đang chờ",
    canceled: "Đã hủy",
    in_progress: "Đang tiến hành",
  };

  /* ========================= KẾT NỐI SIGNALR REALTIME ========================= */
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_CONFIG.API_BASE1}/hubs/task`, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .build();

    const refresh = () => fetchTasks();

    // Lắng nghe các sự kiện từ SignalR
    connection.on("TaskCreated", refresh);
    connection.on("TaskUpdated", refresh);
    connection.on("TaskStarted", () => {
      showToast("success", "Có nhiệm vụ đã được kích hoạt!");
      refresh();
    });
    connection.on("TaskCanceled", (data) => {
      showToast("error", `Nhiệm vụ #${data.taskId} bị hủy!\nLý do: ${data.reason}`, 6000);
      refresh();
    });

    // Kết nối SignalR
    connection
      .start()
      .then(() => console.log("SignalR TaskHub connected!"))
      .catch((err) => console.error("SignalR Error:", err));

    // Cleanup khi component unmount
    return () => connection.stop();
  }, []);

  /* ========================= TẢI DANH SÁCH ROBOT ========================= */
  useEffect(() => {
    async function fetchRobots() {
      try {
        const data = await getAllRobots();
        const formatted = data.map((r) => ({
          id: r.code,
          name: r.name,
          dest: r.tasks?.[0]?.destination || "N/A",
          progress: r.progressOverallPct,
          status: statusMap[r.status] || r.status,
        }));
        setRobots(formatted);
      } catch (err) {
        console.error("Lỗi khi load robots:", err);
      }
    }
    fetchRobots();
  }, []);

  /* ========================= TẢI DANH SÁCH NHIỆM VỤ ========================= */
  useEffect(() => {
    async function fetchTasks() {
      try {
        const data = await getAllTasks();

        // Hiển thị tất cả nhiệm vụ (không lọc theo status)
        const formatted = data.map((t) => {
          const patientCount = t.patients?.length || 0;
          const firstPatient = t.patients?.[0]?.patientName || "—";
          const medicineSummary =
            t.patients?.map((p) => p.medicineSummary).join("; ") || "—";

          return {
            id: t.id,
            robotName: t.robotName,
            assignedBy: t.assignedBy,
            status: statusMap[t.status] || t.status,
            createdAt: new Date(t.createdAt).toLocaleString("vi-VN"),
            scheduledStartAt: t.scheduledStartAt
              ? new Date(t.scheduledStartAt).toLocaleString("vi-VN")
              : "—",
            startedAt: t.startedAt,  
            scheduledStartAtRaw: t.scheduledStartAt,
            totalStops: t.totalStops,
            firstDestination: t.firstDestination || "—",
            patientCount,
            firstPatient,
            medicineSummary,
            priority:
              t.priority === 2
                ? "Khẩn cấp"
                : t.priority === 1
                ? "Cao"
                : "Thường",
          };
        });

        setTasks(formatted);
      } catch (err) {
        console.error("Lỗi khi load tasks:", err);
      }
    }
    fetchTasks();
  }, []);

  /* ========================= BỘ ĐẾM THỜI GIAN THỰC ========================= */
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ========================= TÍNH THỜI GIAN ĐÊM NGƯỢC ========================= */
  function getCountdownInfo(task) {
    if (!task.scheduledStartAtRaw) {
        return { text: "—", className: "", note: null };
    }

    const now = new Date();
    const scheduled = new Date(task.scheduledStartAtRaw);

    // Nếu task ĐÃ CHẠY (in_progress hoặc hơn) → kiểm tra có chạy sớm không
    if ((task.status === "Đang tiến hành" || task.status === "Hoàn thành") && task.startedAt) {
        if (task.startedAt) {
        const started = new Date(task.startedAt);
        const diffMs = scheduled.getTime() - started.getTime();

        if (diffMs > 1000) { // chạy sớm > 1 giây
            const diffMin = Math.floor(diffMs / 60000);
            const diffSec = Math.floor((diffMs % 60000) / 1000);

            const note = diffMin >= 1
            ? `Khởi động sớm ${diffMin} phút ${diffSec} giây trước giờ dự kiến`
            : `Khởi động sớm ${diffSec} giây trước giờ dự kiến`;

            return {
            text: "Đã khởi hành",
            className: styles.countdownStarted,
            note: note,
            };
        }
        }
    }

    // Chưa chạy → đếm ngược bình thường
    const diffMs = scheduled.getTime() - now.getTime();

    if (diffMs <= 0) {
        return { text: "Quá giờ", className: styles.countdownOverdue, note: null };
    }

    const diffMin = Math.floor(diffMs / 60000);
    const diffSec = Math.floor((diffMs % 60000) / 1000);

    if (diffMin === 0)
        return { text: `${diffSec}s`, className: styles.countdownSoon, note: null };
    if (diffMin < 60)
        return { text: `${diffMin}p ${diffSec}s`, className: styles.countdownNormal, note: null };

    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return { text: `${hours}h ${mins}p`, className: styles.countdownFar, note: null };
  }

  /* ========================= PHÂN TRANG ========================= */
  const totalPages = Math.max(1, Math.ceil(tasks.length / tasksPerPage));

  const displayedTasks = tasks.slice(
    (currentPage - 1) * tasksPerPage,
    currentPage * tasksPerPage
  );

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  /* ========================= LẤY CLASS CHO TRẠNG THÁI ========================= */
  const getStatusBadgeClass = (status) => {
    if (status === "Đang chờ") return styles.badgePending;
    if (status === "Đang tiến hành") return styles.badgeInProgress;
    if (status === "Hoàn thành") return styles.badgeCompleted;
    if (status === "Đã hủy") return styles.badgeCanceled;
    return styles.badgePending;
  };

  /* ========================= LẤY CLASS CHO ĐỘ ƯU TIÊN ========================= */
  const getPriorityBadgeClass = (priority) => {
    if (priority === "Khẩn cấp") return styles.badgeEmergency;
    if (priority === "Cao") return styles.badgeHigh;
    return styles.badgeNormal;
  };

  /* ========================= LẤY CLASS CHO THỜI GIAN HẸN ========================= */
  const getScheduleClass = (scheduledStartAt) => {
    if (!scheduledStartAt || scheduledStartAt === "—") return "";

    const now = new Date();
    const start = new Date(scheduledStartAt);
    const diffMs = start - now;
    const diffMin = diffMs / 1000 / 60;

    if (diffMin <= 0) return styles.scheduleTimeOverdue;
    if (diffMin <= 1) return styles.scheduleTimeSoon;
    return styles.scheduleTimeUpcoming;
  };

  /* ========================= DỮ LIỆU KPI ========================= */
  const kpiData = [
    { label: "Tổng số robot", value: robots.length, icon: "robot" },
    {
      label: statusMap.transporting,
      value: robots.filter((r) => r.status === statusMap.transporting).length,
      icon: "truck",
    },
    {
      label: statusMap.awaiting_handover,
      value: robots.filter((r) => r.status === statusMap.awaiting_handover)
        .length,
      icon: "hourglass-split",
    },
    {
      label: statusMap.returning_to_station,
      value: robots.filter((r) => r.status === statusMap.returning_to_station)
        .length,
      icon: "arrow-return-left",
    },
    {
      label: statusMap.at_station,
      value: robots.filter((r) => r.status === statusMap.at_station).length,
      icon: "house",
    },
    {
      label: statusMap.completed,
      value: robots.filter((r) => r.status === statusMap.completed).length,
      icon: "check2-circle",
    },
    {
      label: statusMap.charging,
      value: robots.filter((r) => r.status === statusMap.charging).length,
      icon: "battery-half",
    },
    {
      label: statusMap.needs_attention,
      value: robots.filter((r) => r.status === statusMap.needs_attention)
        .length,
      icon: "exclamation-triangle",
    },
    {
      label: statusMap.manual_control,
      value: robots.filter((r) => r.status === statusMap.manual_control).length,
      icon: "hand-index",
    },
    {
      label: statusMap.offline,
      value: robots.filter((r) => r.status === statusMap.offline).length,
      icon: "slash-circle",
    },
  ];

  /* ========================= RENDER GIAO DIỆN ========================= */
  return (
    <div className={styles.page}>
        {/* === TOAST NOTIFICATIONS === */}
        <div className={`${styles.toastContainer} ${toast.show ? styles.show : ""}`}>
            <div className={`${styles.toast} ${styles[toast.type]}`}>
                <div className={styles.toastIcon}>
                    {toast.type === "success" && <i className="bi bi-check-lg"></i>}
                    {toast.type === "error" && <i className="bi bi-x-lg"></i>}
                    {toast.type === "warning" && <i className="bi bi-exclamation-lg"></i>}
                    {toast.type === "info" && <i className="bi bi-info-lg"></i>}
                </div>

                <div className={styles.toastMessage}>{toast.message}</div>

                <button
                    className={styles.toastClose}
                    onClick={() => showToast("", "")}
                >
                    ×
                </button>
            </div>
        </div>

      <div className="container-xl py-4">
        {/* ========================= TRẠNG THÁI HIỆN TẠI ========================= */}
        <h5 className={styles.sectionTitle}>
          <i
            className="bi bi-speedometer2 me-2"
            style={{ color: "var(--teal-dark)" }}
          ></i>
          Trạng Thái Hiện Tại
        </h5>

        <div className="row g-3 mb-4">
          {kpiData.map((k, i) => (
            <div className="col-6 col-md-4 col-xl-2" key={i}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <i className={`bi bi-${k.icon}`}></i>
                </div>
                <div>
                  <div className={styles.kpiLabel}>{k.label}</div>
                  <h4 className={styles.kpiValue}>{k.value}</h4>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ========================= BẢNG TIẾN TRÌNH NHIỆM VỤ ========================= */}
        <div className={`${styles.glass} p-3 p-md-4`}>
          {/* Header bảng */}
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <h5 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
              <i
                className="bi bi-list-task me-2"
                style={{ color: "var(--teal-dark)" }}
              ></i>
              Tiến Trình Nhiệm Vụ
            </h5>

            {/* Nút điều khiển */}
            <div className="d-flex gap-2 flex-wrap align-items-center">
              {/* Dropdown chọn số bản ghi trên trang */}
              <select
                className="form-select"
                style={{ width: "150px" }}
                value={tasksPerPage}
                onChange={(e) => {
                  setTasksPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5 / trang</option>
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
              </select>

              {/* Nút thêm nhiệm vụ */}
              <button
                className={styles.btnTeal}
                onClick={() => navigate("/addtasks")}
              >
                <i className="bi bi-plus-lg me-1"></i>
                Thêm Nhiệm Vụ
              </button>

              {/* Nút lịch sử hoạt động */}
              <button
                className={styles.btnTeal}
                onClick={() => navigate("/history-mission")}
              >
                <i className="bi bi-clock-history me-1"></i>
                Lịch sử hoạt động
              </button>
            </div>
          </div>

          {/* Bảng dữ liệu */}
          <div className="table-responsive">
            <table className={`table ${styles.table} align-middle mb-0`}>
              <thead>
                <tr>
                  <th>Nhiệm vụ</th>
                  <th>Người giao</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Đếm ngược</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {displayedTasks.map((t) => {
                  const scheduleClass = getScheduleClass(t.scheduledStartAtRaw);
                  const countdownInfo = getCountdownInfo(t);

                  return (
                    <tr key={t.id}>
                      {/* Cột nhiệm vụ */}
                      <td>
                        <div className={styles.taskTitle}>
                          #{t.id} — {t.robotName}
                        </div>

                        <div className={styles.taskInfo}>
                          <span className={scheduleClass}>
                            <i className="bi bi-clock me-1"></i>
                            Bắt đầu: {t.scheduledStartAt}
                          </span>
                        </div>

                        <div className={styles.taskInfo}>
                          <strong>Điểm dừng:</strong> {t.firstDestination}
                          {t.totalStops > 1 && <> (+{t.totalStops - 1})</>}
                        </div>

                        <div className={styles.taskInfo}>
                          <strong>Bệnh nhân:</strong> {t.firstPatient}
                          {t.patientCount > 1 && (
                            <> (và {t.patientCount - 1} bệnh nhân khác)</>
                          )}
                        </div>

                        <div className={styles.taskInfo}>
                          <strong>Ghi chú:</strong> {t.medicineSummary}
                        </div>
                      </td>

                      {/* Cột người giao */}
                      <td className="fw-semibold">{t.assignedBy}</td>

                      {/* Cột trạng thái */}
                      <td>
                        <span className={getStatusBadgeClass(t.status)}>
                          {t.status}
                        </span>
                      </td>

                      {/* Cột độ ưu tiên (ẩn) */}
                      <td hidden>
                        <span className={getPriorityBadgeClass(t.priority)}>
                          {t.priority}
                        </span>
                      </td>

                      {/* Cột ngày tạo */}
                      <td>{t.createdAt}</td>

                      {/* Cột đếm ngược */}
                      <td className="fw-semibold">
                            {countdownInfo.note ? (
                            <div className={styles.tooltipWrapper}>
                                <span className={countdownInfo.className}>
                                {countdownInfo.text}
                                </span>
                                <div className={styles.tooltip}>
                                {countdownInfo.note}
                                </div>
                            </div>
                            ) : (
                            <span className={countdownInfo.className}>
                                {countdownInfo.text}
                            </span>
                            )}
                      </td>

                      {/* Cột thao tác */}
                      <td>
                        <div className="d-flex gap-1 justify-content-end">
                          {t.status !== "Đã hủy" && t.status !== "Hoàn thành" && (
                            <button
                              className={styles.btnSecondary}
                              onClick={() => navigate(`/run-task/${t.id}`)}
                              title="Theo dõi"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                          )}  
                          <button
                            className={styles.btnView}
                            onClick={() => navigate(`/task-detail/${t.id}`)}
                            title="Xem thêm"
                          >
                            <i className="bi bi-info-circle"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ========================= PHÂN TRANG ========================= */}
          <div className="d-flex justify-content-center mt-4">
            <nav>
              <ul className={`pagination ${styles.pagination} mb-0`}>
                {/* Nút Previous */}
                <li
                  className={`${styles.pageItem} ${
                    currentPage === 1 ? "disabled" : ""
                  }`}
                >
                  <button
                    className={styles.pageLink}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                </li>

                {/* Các số trang */}
                {[...Array(totalPages)].map((_, i) => (
                  <li
                    key={i}
                    className={`${styles.pageItem} ${
                      currentPage === i + 1 ? "active" : ""
                    }`}
                  >
                    <button
                      className={styles.pageLink}
                      onClick={() => handlePageChange(i + 1)}
                    >
                      {i + 1}
                    </button>
                  </li>
                ))}

                {/* Nút Next */}
                <li
                  className={`${styles.pageItem} ${
                    currentPage === totalPages ? "disabled" : ""
                  }`}
                >
                  <button
                    className={styles.pageLink}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
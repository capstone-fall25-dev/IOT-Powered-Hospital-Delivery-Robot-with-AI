import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRobots } from "@/services/robotService";
import { getAllTasks, cancelTask } from "@/services/taskService";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";
import styles from "@/assets/styles/robotDashboard.module.css";

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
  
  // Modal hủy task
  const [cancelModal, setCancelModal] = useState({
    show: false,
    taskId: null,
    reason: "",
    loading: false,
  });

  /* ========================= MAPPING TRẠNG THÁI ========================= */
  const statusMap = {
    transporting: "Đang chạy",
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

  /* ========================= TẢI DANH SÁCH ROBOT ========================= */
  const fetchRobots = async () => {
    try {
      const data = await getAllRobots();
      const formatted = data.map((r) => ({
        id: r.code,
        name: r.name,
        dest: r.tasks?.[0]?.destination || "Không có",
        progress: r.progressOverallPct,
        status: statusMap[r.status] || "Không xác định",
      }));
      setRobots(formatted);
    } catch (err) {
      console.error("Lỗi khi load robots:", err);
    }
  };

  useEffect(() => {
    fetchRobots();
  }, []);

  /* ========================= KẾT NỐI SIGNALR REALTIME ========================= */
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_CONFIG.API_BASE1}/hubs/task`, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .build();

    const refresh = () => {
      fetchTasks();
      fetchRobots(); // Refresh robots khi có task update
    };

    // Lắng nghe các sự kiện từ SignalR
    connection.on("ConnectedToTaskHub", (data) => {
      console.log("✅ TaskHub:", data.message);
    });
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

  /* ========================= TẢI DANH SÁCH NHIỆM VỤ ========================= */
  useEffect(() => {
    async function fetchTasks() {
      try {
        const data = await getAllTasks();

        // Hiển thị tất cả nhiệm vụ (không lọc theo status)
        const formatted = data.map((t) => {
          const patientCount = t.patients?.length || 0;
          const firstPatient = t.patients?.[0]?.patientName || "—";
          
          // Lấy ItemDesc hoặc CustomName từ patient đầu tiên
          const firstPatientData = t.patients?.[0];
          const displayText = firstPatientData?.itemDesc || firstPatientData?.customName || "—";

          // Hiển thị status với số lượng stops đã hoàn thành (nếu task đã completed)
          let statusDisplay = statusMap[t.status] || "Không xác định";
          if (t.status === "completed" && t.completedStops !== undefined && t.totalStops > 0) {
            statusDisplay = `Hoàn thành (${t.completedStops}/${t.totalStops})`;
          }

          return {
            id: t.id,
            robotName: t.robotName,
            assignedBy: t.assignedBy,
            status: statusDisplay,
            statusRaw: t.status, // Giữ status gốc để kiểm tra
            createdAt: new Date(t.createdAt).toLocaleString("vi-VN"),
            scheduledStartAt: t.scheduledStartAt
              ? new Date(t.scheduledStartAt).toLocaleString("vi-VN")
              : "—",
            startedAt: t.startedAt,  
            scheduledStartAtRaw: t.scheduledStartAt,
            totalStops: t.totalStops,
            completedStops: t.completedStops || 0, // Số stops đã delivered
            firstDestination: t.firstDestination || "—",
            patientCount,
            firstPatient,
            displayText, // ItemDesc hoặc CustomName
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

  /* ========================= TÍNH THỜI GIAN ĐẾM NGƯỢC ========================= */
  function getCountdownInfo(task) {
    if (!task.scheduledStartAtRaw) {
      return { text: "—", className: "", note: null };
    }

    // ❗ Nếu task đã hoàn thành (completed) → không hiển thị "Quá giờ"
    if (task.statusRaw === "completed") {
      return { text: "Đã hoàn thành", className: styles.countdownStarted, note: null };
    }

    const now = new Date();
    const scheduled = new Date(task.scheduledStartAtRaw);

    // Nếu task ĐÃ CHẠY (in_progress hoặc hơn) → kiểm tra có chạy sớm không
    if ((task.status === "Đang tiến hành" || task.status === "Hoàn thành") && task.startedAt) {
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
  const getStatusBadgeClass = (status, statusRaw) => {
    // Check statusRaw trước để chính xác hơn
    if (statusRaw === "completed") return styles.badgeCompleted;
    if (statusRaw === "canceled") return styles.badgeCanceled;
    if (statusRaw === "in_progress") return styles.badgeInProgress;
    if (statusRaw === "pending") return styles.badgePending;
    
    // Fallback: check status đã format (có thể có "Hoàn thành (1/1)")
    if (status && status.startsWith("Hoàn thành")) return styles.badgeCompleted;
    if (status === "Đang chờ") return styles.badgePending;
    if (status === "Đang tiến hành") return styles.badgeInProgress;
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
  const getScheduleClass = (scheduledStartAt, taskStatusRaw) => {
    if (!scheduledStartAt || scheduledStartAt === "—") return "";

    // ❗ Nếu task đã hoàn thành (completed) → hiển thị màu xanh lá
    if (taskStatusRaw === "completed") {
      return styles.scheduleTimeCompleted; // Màu xanh lá cho task đã hoàn thành
    }

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
    { label: "Tổng số Robot", value: robots.length, icon: "robot" },
    {
      label: statusMap.in_progress,
      value: tasks.filter((t) => t.statusRaw === "in_progress").length,
      icon: "truck",
    },
    {
      label: statusMap.awaiting_handover,
      value: tasks.filter((t) => t.statusRaw === "in_progress").length,
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
      value: tasks.filter((t) => t.statusRaw === "completed").length,
      icon: "check2-circle",
    },
    {
      label: statusMap.canceled,
      value: tasks.filter((t) => t.statusRaw === "canceled").length,
      icon: "x-circle",
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
  ];

  /* ========================= RENDER GIAO DIỆN ========================= */
  return (
    <div className={styles.page}>
      <Toast toast={toast} showToast={showToast} />

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
                  const scheduleClass = getScheduleClass(t.scheduledStartAtRaw, t.statusRaw);
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
                          <strong>Ghi chú:</strong> {t.displayText}
                        </div>
                      </td>

                      {/* Cột người giao */}
                      <td className="fw-semibold">{t.assignedBy}</td>

                      {/* Cột trạng thái */}
                      <td>
                        <span className={getStatusBadgeClass(t.status, t.statusRaw)}>
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
                          {/* Nút hủy - chỉ hiển thị khi task chưa bắt đầu (pending) và chưa hoàn thành */}
                          {t.statusRaw && t.statusRaw !== "completed" && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setCancelModal({ show: true, taskId: t.id, reason: "", loading: false })}
                              title="Hủy nhiệm vụ"
                              style={{ borderRadius: "5px" }}
                            >
                              <i className="bi bi-x-circle"></i>
                            </button>
                          )}
                          
                          {/* Nút theo dõi - không hiển thị khi task đã hủy hoặc đã hoàn thành */}
                          {t.statusRaw !== "canceled" && t.statusRaw !== "completed" && (
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

      {/* MODAL XÁC NHẬN HỦY TASK */}
      {cancelModal.show && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Xác nhận hủy nhiệm vụ #{cancelModal.taskId}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setCancelModal({ show: false, taskId: null, reason: "", loading: false })}
                  disabled={cancelModal.loading}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>Lưu ý:</strong> Khi hủy nhiệm vụ, tất cả các ngăn chứa sẽ được giải phóng và robot sẽ về trạm. 
                  Nhiệm vụ sẽ được lưu với trạng thái "canceled".
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    <strong>Lý do hủy <span className="text-danger">*</span></strong>
                  </label>
                  
                  {/* Gợi ý lý do hủy */}
                  <div className="mb-2">
                    <small className="text-muted d-block mb-2">
                      <i className="bi bi-lightbulb me-1"></i>
                      Gợi ý lý do hủy (click để chọn):
                    </small>
                    <div className="d-flex flex-wrap gap-2">
                      {[
                        "Robot gặp sự cố kỹ thuật",
                        "Bệnh nhân đã xuất viện",
                        "Thay đổi kế hoạch điều trị",
                        "Robot cần bảo trì",
                        "Hủy theo yêu cầu bác sĩ",
                        "Lỗi hệ thống",
                        "Khẩn cấp khác",
                      ].map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() =>
                            setCancelModal((prev) => ({ ...prev, reason: suggestion }))
                          }
                          disabled={cancelModal.loading}
                          style={{ fontSize: "0.85rem", borderRadius: "20px" }}
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Nhập lý do hủy nhiệm vụ hoặc chọn từ gợi ý bên trên..."
                    value={cancelModal.reason}
                    onChange={(e) =>
                      setCancelModal((prev) => ({ ...prev, reason: e.target.value }))
                    }
                    disabled={cancelModal.loading}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCancelModal({ show: false, taskId: null, reason: "", loading: false })}
                  disabled={cancelModal.loading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={async () => {
                    if (!cancelModal.reason.trim()) {
                      showToast("warning", "Vui lòng nhập lý do hủy nhiệm vụ.");
                      return;
                    }

                    setCancelModal((prev) => ({ ...prev, loading: true }));

                    try {
                      await cancelTask(cancelModal.taskId, cancelModal.reason.trim());
                      
                      // Refresh danh sách task
                      const data = await getAllTasks();
                      const formatted = data.map((t) => {
                        const patientCount = t.patients?.length || 0;
                        const firstPatient = t.patients?.[0]?.patientName || "—";
                        
                        // Lấy ItemDesc hoặc CustomName từ patient đầu tiên
                        const firstPatientData = t.patients?.[0];
                        const displayText = firstPatientData?.itemDesc || firstPatientData?.customName || "—";

                        return {
                          id: t.id,
                          robotName: t.robotName,
                          assignedBy: t.assignedBy,
                          status: statusMap[t.status] || "Không xác định",
                          statusRaw: t.status,
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
                          displayText, // ItemDesc hoặc CustomName
                          priority:
                            t.priority === 2
                              ? "Khẩn cấp"
                              : t.priority === 1
                              ? "Cao"
                              : "Thường",
                        };
                      });
                      setTasks(formatted);

                      // Đóng modal
                      setCancelModal({ show: false, taskId: null, reason: "", loading: false });
                      showToast("success", "Đã hủy nhiệm vụ thành công!");
                    } catch (err) {
                      console.error("Error cancel task:", err);
                      showToast("error", err.message);
                      setCancelModal((prev) => ({ ...prev, loading: false }));
                    }
                  }}
                  disabled={cancelModal.loading || !cancelModal.reason.trim()}
                >
                  {cancelModal.loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      ></span>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-x-circle me-2"></i>
                      Xác nhận hủy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
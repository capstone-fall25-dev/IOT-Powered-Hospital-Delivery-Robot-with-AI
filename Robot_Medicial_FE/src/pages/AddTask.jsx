// src/pages/AddTask.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createTask, checkRobotPendingTask } from "@/services/taskService";
import { getAllMaps } from "@/services/mapService";
import { getAllPatients } from "@/services/patientService";
import { getDestinationsByMap } from "@/services/destinationService";
import {
  getUnlockedCompartments,
  getCompartmentsByRobotAndCategory,
  getAllCategories as getAllCompartmentCategories,
} from "@/services/robotCompartmentService";
import { getRobotsByMap } from "@/services/robotService";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";
import styles from "@/assets/styles/taskForm.module.css";
import successSound from "@/sounds/success.mp3";

export default function AddTask() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  // ============================================================
  // DATETIME HELPERS
  // ============================================================
  function getMinDateTime() {
    const now = new Date();
    
    now.setMinutes(now.getMinutes() + 5);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const HH = String(now.getHours()).padStart(2, "0");
    const MM = String(now.getMinutes()).padStart(2, "0");
    
    return `${yyyy}-${mm}-${dd}T${HH}:${MM}`;
  }

  const realtimeEnabled = useRef(true);
  const connectionRef = useRef(null);

  // ============================================================
  // STATE
  // ============================================================
  const [maps, setMaps] = useState([]);
  const [robots, setRobots] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [patients, setPatients] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    mapId: "",
    robotId: "",
    priority: 0,
    scheduledStartAt: getMinDateTime(),
    taskStops: [],
  });

  const [baseCompartments, setBaseCompartments] = useState([]);
  const [showFloatingAddButton, setShowFloatingAddButton] = useState(false);

  // Số điểm dừng tối đa = tổng số ngăn chứa của robot (từ robot data)
  // Lấy từ robots array vì mỗi robot có compartments array
  const selectedRobot = robots.find(r => r.id === Number(form.robotId));
  const MAX_STOPS = selectedRobot?.compartments?.length || 0;

  const canAddStop = form.robotId;
  
  // ============================================================
  // VALIDATION: Kiểm tra điều kiện để bắt đầu nhiệm vụ
  // ============================================================
  const canStart = (() => {
    // Phải chọn bản đồ và robot
    if (!form.mapId || !form.robotId) return false;
    
    // Phải có ít nhất 1 điểm dừng
    if (form.taskStops.length === 0) return false;
    
    // Kiểm tra từng điểm dừng
    for (const stop of form.taskStops) {
      // Phải có đầy đủ: điểm đến, bệnh nhân, loại ngăn, ngăn chứa
      if (!stop.destinationId || !stop.patientId || !stop.categoryId || !stop.compartmentId) {
        return false;
      }
      
      // Nếu category là thuốc → phải nhập customName và xác nhận (tick)
      if (isMedicineCategory(stop.categoryId) && (!stop.customName || !stop.confirmedCustomName)) {
        return false;
      }
    }
    
    return true;
  })();


  // ============================================================
  // SIGNALR
  // ============================================================
  useEffect(() => {
    let isMounted = true;
    if (connectionRef.current) return;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(API_CONFIG.API_BASE1 + "/hubs/task", {
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    conn.on("TaskCreated", (task) => {
      if (isMounted) {
        showToast("info", `Nhiệm vụ mới được tạo #${task.id}`);
      }
    });

    conn.on("ConnectedToTaskHub", (m) => {
      console.log("🔗 Xác nhận từ server:", m);
    });

    conn.onreconnecting(() => console.log("🔄 SignalR đang kết nối lại..."));
    conn.onreconnected(() => console.log("✅ SignalR đã kết nối lại"));
    conn.onclose(() => console.log("🔌 SignalR đã ngắt kết nối"));

    connectionRef.current = conn;

    const startConnection = async () => {
      if (!isMounted) return;
      try {
        await conn.start();
        if (isMounted) console.log("✅ SignalR đã kết nối");
      } catch (err) {
        console.error("❌ Lỗi kết nối SignalR:", err);
        if (isMounted) {
          setTimeout(startConnection, 5000);
        }
      }
    };

    startConnection();

    return () => {
      isMounted = false;
      if (connectionRef.current) {
        connectionRef.current
          .stop()
          .then(() => console.log("🔌 SignalR đã dừng"))
          .catch((err) => console.error("⚠️ Lỗi khi dừng SignalR:", err));
        connectionRef.current = null;
      }
    };
  }, []);

  // ============================================================
  // LOAD INIT DATA (MAPS + PATIENTS + COMPARTMENT CATEGORIES)
  // ============================================================
  useEffect(() => {
    async function load() {
      try {
        const [mapsRes, patientsRes, categoriesRes] = await Promise.all([
          getAllMaps(),
          // Lấy tất cả bệnh nhân (khi chọn đơn thuốc sẽ tự động approve)
          getAllPatients(),
          // Danh mục loại ngăn của robot
          getAllCompartmentCategories(),
        ]);

        setMaps(mapsRes || []);
        setPatients(patientsRes || []);
        setCategories(categoriesRes || []);
      } catch (err) {
        console.error("Lỗi tải dữ liệu khởi tạo:", err);
        showToast("error", err.message);
      }
    }
    load();
  }, []);

  // ============================================================
  // REALTIME CLOCK (update mỗi 1 giây) – nếu user chưa chỉnh tay
  // ============================================================
  useEffect(() => {
    const interval = setInterval(() => {
      if (!realtimeEnabled.current) return;

      setForm((f) => ({
        ...f,
        scheduledStartAt: getMinDateTime(),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // SCROLL DETECTION - Hiển thị nút floating khi scroll xuống
  // ============================================================
  useEffect(() => {
    const handleScroll = () => {
      const addButtonElement = document.querySelector(`.${styles.btnAddStop}`);
      if (addButtonElement) {
        const rect = addButtonElement.getBoundingClientRect();
        // Nếu nút gốc đã scroll ra khỏi viewport (ở trên) → hiển thị nút floating
        setShowFloatingAddButton(rect.top < -50);
      } else {
        // Nếu không tìm thấy nút gốc (chưa render) → ẩn nút floating
        setShowFloatingAddButton(false);
      }

    };

    // Kiểm tra ngay khi component mount và khi taskStops thay đổi
    handleScroll();
    
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [form.taskStops.length]);

  // ============================================================
  // MAP SELECTION
  //  - Reset robot, stops, compartments
  //  - Lấy destinations theo map
  //  - Lấy robots theo map (và lọc robot at_station)
  // ============================================================
  async function handleSelectMap(mapId) {
    setForm((f) => ({
      ...f,
      mapId,
      robotId: "",
      taskStops: [],
    }));
    setBaseCompartments([]);
    setDestinations([]);
    setRobots([]);

    if (!mapId) return;

    try {
      // 1. Điểm đến theo map
      const dests = await getDestinationsByMap(mapId);
      setDestinations(dests || []);

      // 2. Robot theo map
      const robotsByMap = await getRobotsByMap(mapId);
      const atStation = (robotsByMap || []).filter(
        (r) => r.status === "at_station"
      );
      setRobots(atStation);
    } catch (err) {
      console.error("Lỗi khi chọn bản đồ:", err);
      showToast("error", err.message);
    }
  }

  // ============================================================
  // ROBOT SELECTION
  //  - Reset stops
  //  - Kiểm tra robot có task pending không
  //  - Load danh sách ngăn khoang base cho robot
  // ============================================================
  async function handleSelectRobot(robotId) {
    setForm((f) => ({
      ...f,
      robotId,
      taskStops: [],
    }));

    if (!robotId) {
      setBaseCompartments([]);
      return;
    }

    try {
      // Kiểm tra robot có task pending không
      const hasPending = await checkRobotPendingTask(robotId);
      if (hasPending) {
        // Tìm tên robot để hiển thị trong thông báo
        const selectedRobot = robots.find(r => r.id === Number(robotId));
        const robotName = selectedRobot ? `${selectedRobot.name} (${selectedRobot.code})` : `Robot ID ${robotId}`;
        
        showToast("error", 
          `Robot ${robotName} đã được assign cho một nhiệm vụ khác đang ở trạng thái pending. ` +
          "Vui lòng chọn robot khác hoặc đợi nhiệm vụ hiện tại hoàn thành/hủy."
        );
        
        // Reset robot selection
        setForm((f) => ({
          ...f,
          robotId: "",
        }));
        setBaseCompartments([]);
        return;
      }

      // Nếu robot không có task pending, load compartments
      const data = await getUnlockedCompartments(robotId);
      setBaseCompartments(data || []);
    } catch (err) {
      console.error("Lỗi khi chọn robot:", err);
      showToast("error", err.message);
      
      // Reset robot selection nếu có lỗi
      setForm((f) => ({
        ...f,
        robotId: "",
      }));
      setBaseCompartments([]);
    }
  }

  // ============================================================
  // SELECTED COMPARTMENTS (prevent duplicates)
  // ============================================================
  const selectedCompartments = form.taskStops
    .map((s) => Number(s.compartmentId))
    .filter((id) => id > 0);

  // ============================================================
  // SELECTED PATIENTS (prevent duplicates)
  // ============================================================
  const selectedPatients = form.taskStops
    .map((s) => Number(s.patientId))
    .filter((id) => id > 0);

  // ============================================================
  // ADD STOP
  // ============================================================
  function addStop() {
    if (!form.robotId) {
      showToast("warning", "Vui lòng chọn robot trước khi thêm điểm dừng.");
      return;
    }

    if (MAX_STOPS === 0) {
      showToast("warning", "Robot này không có ngăn chứa nào.");
      return;
    }

    if (form.taskStops.length >= MAX_STOPS) {
      const selectedRobot = robots.find(r => r.id === Number(form.robotId));
      const robotName = selectedRobot ? `${selectedRobot.name} (${selectedRobot.code})` : `Robot ID ${form.robotId}`;
      showToast("warning", `Robot ${robotName} có ${MAX_STOPS} ngăn chứa. Chỉ được tối đa ${MAX_STOPS} điểm dừng.`);
      return;
    }

    const nextSeq = form.taskStops.length + 1;

    setForm((f) => ({
      ...f,
      taskStops: [
        ...f.taskStops,
        {
          seqNo: nextSeq,
          destinationId: "",
          patientId: "",
          categoryId: "",
          compartmentId: "",
          filteredCompartments: [],
          customName: "",
          confirmedCustomName: false, // Đã tick xác nhận customName chưa
          itemDesc: "",
        },
      ],
    }));
  }

  // ============================================================
  // REMOVE STOP
  // ============================================================
  function removeStop(idx) {
    setForm((f) => {
      const newStops = f.taskStops.filter((_, i) => i !== idx);

      return {
        ...f,
        taskStops: newStops.map((s, i) => ({
          ...s,
          seqNo: i + 1,
        })),
      };
    });
  }

  // ============================================================
  // HELPER: Kiểm tra category có liên quan đến thuốc không
  // ============================================================
  function isMedicineCategory(categoryId) {
    if (!categoryId) return false;
    const category = categories.find((c) => c.id === Number(categoryId));
    if (!category || !category.name) return false;
    
    const categoryName = category.name.toLowerCase().trim();
    const medicineKeywords = ["thuốc", "medicine", "drug", "medication", "dược phẩm", "pharmaceutical"];
    
    return medicineKeywords.some((keyword) => categoryName.includes(keyword));
  }


  // ============================================================
  // UPDATE STOP
  //  - Đặc biệt xử lý khi đổi Category → lọc compartment theo robot+category
  //  - Reset customName và confirmedCustomName khi đổi category (nếu không phải thuốc)
  // ============================================================
  async function updateStop(idx, key, value) {
    const clone = [...form.taskStops];
    clone[idx][key] = value;

    if (key === "categoryId") {
      clone[idx].compartmentId = "";
      // Reset customName và confirmedCustomName khi đổi category
      if (!isMedicineCategory(value)) {
        clone[idx].customName = "";
        clone[idx].confirmedCustomName = false;
      }

      if (value) {
        try {
          let comps = await getCompartmentsByRobotAndCategory(
            form.robotId,
            value
          );

          // Loại bỏ compartment đã bị chọn ở stop khác
          comps = (comps || []).filter(
            (c) => !selectedCompartments.includes(c.id)
          );

          clone[idx].filteredCompartments = comps;
        } catch (err) {
          console.error("Lỗi tải ngăn chứa theo loại:", err);
          clone[idx].filteredCompartments = [];
        }
      } else {
        clone[idx].filteredCompartments = [];
      }
    }

    setForm((f) => ({ ...f, taskStops: clone }));
  }

  // ============================================================
  // PATIENT SELECTION
  //  - Không cần load prescriptions nữa, chỉ cần update patientId
  // ============================================================
  function handleSelectPatient(patientId, idx) {
    updateStop(idx, "patientId", patientId);
  }

  // ============================================================
  // CONFIRM CUSTOM NAME (Tick button)
  //  - Xác nhận customName đã nhập đúng
  // ============================================================
  function handleConfirmCustomName(idx) {
    const stop = form.taskStops[idx];
    if (!stop.customName || stop.customName.trim() === "") {
      showToast("warning", "Vui lòng nhập mã đơn thuốc trước khi xác nhận.");
      return;
    }
    
    updateStop(idx, "confirmedCustomName", true);
    showToast("success", "Đã xác nhận mã đơn thuốc.");
  }

  // ============================================================
  // UNCONFIRM CUSTOM NAME (Uncheck)
  //  - Bỏ xác nhận customName
  // ============================================================
  function handleUnconfirmCustomName(idx) {
    updateStop(idx, "confirmedCustomName", false);
  }

  // ============================================================
  // SUBMIT
  //  - Validate đầy đủ thông tin trước khi tạo task
  // ============================================================
  async function startMission() {
    // Validate bản đồ
    if (!form.mapId) {
      showToast("warning", "Vui lòng chọn bản đồ.");
      return;
    }

    // Validate robot
    if (!form.robotId) {
      showToast("warning", "Vui lòng chọn robot.");
      return;
    }

    // Validate có điểm dừng
    if (form.taskStops.length === 0) {
      showToast("warning", "Vui lòng thêm ít nhất một điểm dừng.");
      return;
    }

    // Validate từng điểm dừng
    for (let i = 0; i < form.taskStops.length; i++) {
      const stop = form.taskStops[i];
      const stopNumber = i + 1;

      if (!stop.destinationId) {
        showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng chọn điểm đến.`);
        return;
      }

      if (!stop.patientId) {
        showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng chọn bệnh nhân.`);
        return;
      }

      if (!stop.categoryId) {
        showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng chọn loại ngăn.`);
        return;
      }

      if (!stop.compartmentId) {
        showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng chọn ngăn chứa.`);
        return;
      }

      // Nếu category là thuốc → phải nhập customName và xác nhận (tick)
      if (isMedicineCategory(stop.categoryId)) {
        if (!stop.customName || stop.customName.trim() === "") {
          showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng nhập mã đơn thuốc.`);
          return;
        }
        if (!stop.confirmedCustomName) {
          showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng xác nhận mã đơn thuốc (tick).`);
          return;
        }
      }
    }

    // Validate thời gian bắt đầu
    let selected;
    try {
      const now = new Date();
      // datetime-local input trả về local time (không có timezone)
      // Parse như local time
      selected = new Date(form.scheduledStartAt);

      // Backend yêu cầu scheduledStartAt > DateTime.Now.AddMinutes(1)
      // Vì có thể có delay network và timezone conversion, thêm buffer 2 phút
      const minRequiredTime = new Date(now.getTime() + 2 * 60 * 1000);

      if (selected <= minRequiredTime) {
        showToast("warning", "Thời gian bắt đầu phải lớn hơn thời gian hiện tại ít nhất 2 phút.");
        return;
      }
    } catch (err) {
      showToast("error", "Thời gian bắt đầu không hợp lệ.");
      return;
    }

    // Tất cả validation đã pass → tạo task
    try {
      // Format datetime với timezone offset để backend parse đúng
      // Lấy timezone offset (phút), Vietnam là UTC+7 = -420 phút
      const timezoneOffset = selected.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
      const offsetMinutes = Math.abs(timezoneOffset) % 60;
      const offsetSign = timezoneOffset <= 0 ? '+' : '-';
      const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
      
      // Format datetime với timezone offset
      const year = selected.getFullYear();
      const month = String(selected.getMonth() + 1).padStart(2, "0");
      const day = String(selected.getDate()).padStart(2, "0");
      const hours = String(selected.getHours()).padStart(2, "0");
      const minutes = String(selected.getMinutes()).padStart(2, "0");
      const seconds = String(selected.getSeconds()).padStart(2, "0");
      const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`;
      
      const payload = {
        mapId: Number(form.mapId),
        robotId: Number(form.robotId),
        priority: Number(form.priority),
        scheduledStartAt: localTimeString,

        stops: form.taskStops.map((s) => {
          const stopPayload = {
            seqNo: s.seqNo,
            destinationId: Number(s.destinationId),
            patientId: Number(s.patientId),
            compartmentId: Number(s.compartmentId),
            categoryId: Number(s.categoryId),
            customName: s.customName ?? "",
            itemDesc: s.itemDesc ?? "",
          };
          
          // Nếu category là thuốc và có customName (mã đơn thuốc) → gửi prescriptionCode
          if (isMedicineCategory(s.categoryId) && s.customName && s.customName.trim() !== "") {
            stopPayload.prescriptionCode = s.customName.trim();
          }
          
          return stopPayload;
        }),
      };

      await createTask(payload);

      // Play sound
      const audio = new Audio(successSound);
      audio.play().catch(() => {});

      showToast("success", "Tạo nhiệm vụ thành công!");

      // Tự động chuyển về trang list task sau 1 giây để user thấy toast
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (err) {
      console.error("Lỗi tạo nhiệm vụ:", err);
      showToast("error", err.message);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      <Toast toast={toast} showToast={showToast} />
    <div className={styles.page}>
      <div className="container-xl py-4">
        <div className="row justify-content-center">
          <div className="col-lg-11 col-xl-10">
            {/* HEADER */}
            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <span className={styles.chip}>
                  <i className="bi bi-plus-circle-fill"></i>
                </span>
                <h4 className={`${styles.pageTitle} mb-0`}>
                  Tạo nhiệm vụ mới
                </h4>
              </div>

              <button
                className="btn btn-outline-secondary"
                style={{ borderRadius: "5px", padding: "0.5rem 1.2rem" }}
                onClick={() => navigate("/dashboard")}
              >
                <i className="bi bi-arrow-left me-1"></i>
                Quay lại
              </button>
            </div>

            {/* FORM */}
            <div className={`${styles.glass} p-4 p-md-5`}>
              {/* MAP + ROBOT + DATETIME */}
              <div className="row g-4 mb-4">
                <div className="col-md-4">
                  <label className={`form-label ${styles.formLabel}`}>
                    Chọn bản đồ <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${styles.formSelect}`}
                    value={form.mapId}
                    onChange={(e) => handleSelectMap(e.target.value)}
                  >
                    <option value="">— Chọn bản đồ —</option>
                    {maps.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nameMapFE || m.mapName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className={`form-label ${styles.formLabel}`}>
                    Chọn robot <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${styles.formSelect}`}
                    value={form.robotId}
                    onChange={(e) => handleSelectRobot(e.target.value)}
                    disabled={!form.mapId}
                  >
                    <option value="">
                      {form.mapId ? "— Chọn robot —" : "Chọn bản đồ trước"}
                    </option>

                    {robots.map((r) => {
                      const hasCompartments =
                        r.compartments && r.compartments.length > 0;

                      return (
                        <option
                          key={r.id}
                          value={hasCompartments ? r.id : ""}
                          disabled={!hasCompartments}
                          title={
                            hasCompartments
                              ? ""
                              : "Robot không có khoang chứa"
                          }
                        >
                          {r.name}({r.code})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className={`form-label ${styles.formLabel}`}>
                    Thời gian bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    className={`form-control ${styles.formControl}`}
                    value={form.scheduledStartAt}
                    min={getMinDateTime()}
                    onChange={(e) => {
                      realtimeEnabled.current = false;
                      setForm((f) => ({
                        ...f,
                        scheduledStartAt: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              {/* PRIORITY (HIDDEN) */}
              <div className="row g-4 mb-4" hidden>
                <div className="col-md-6">
                  <label className={`form-label ${styles.formLabel}`}>
                    Độ ưu tiên
                  </label>
                  <select
                    className={`form-select ${styles.formSelect}`}
                    value={form.priority}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        priority: Number(e.target.value),
                      }))
                    }
                  >
                    <option value={0}>0 - Bình thường</option>
                    <option value={1}>1 - Khẩn cấp</option>
                    <option value={2}>2 - Nguy cấp</option>
                  </select>
                </div>
              </div>

              <hr className={styles.divider} />

              {/* ADD STOP */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  {form.robotId && MAX_STOPS > 0 && (
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      Robot có <strong>{MAX_STOPS}</strong> ngăn chứa
                      {form.taskStops.length > 0 && (
                        <span className="ms-2">
                          (Đã thêm: {form.taskStops.length}/{MAX_STOPS})
                        </span>
                      )}
                    </small>
                  )}
                </div>
                <button
                  className={styles.btnAddStop}
                  onClick={addStop}
                  disabled={!canAddStop || form.taskStops.length >= MAX_STOPS}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Thêm điểm dừng
                </button>
              </div>

              {/* STOP LIST */}
              {form.taskStops.map((s, idx) => (
                <div className={styles.stopCard} key={idx}>
                  <button
                    className={styles.btnRemove}
                    onClick={() => removeStop(idx)}
                    title="Xóa điểm dừng"
                  >
                    ×
                  </button>

                  <div className={styles.stopHeader}>
                    <div className={styles.stopNumber}>{s.seqNo}</div>
                    <div className={styles.stopTitle}>
                      Điểm dừng #{s.seqNo}
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className={`form-label ${styles.formLabel}`}>
                        Điểm đến <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${styles.formSelect}`}
                        value={s.destinationId}
                        onChange={(e) =>
                          updateStop(idx, "destinationId", e.target.value)
                        }
                      >
                        <option value="">— Chọn điểm đến —</option>
                        {destinations.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className={`form-label ${styles.formLabel}`}>
                        Bệnh nhân <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${styles.formSelect}`}
                        value={s.patientId}
                        onChange={(e) =>
                          handleSelectPatient(e.target.value, idx)
                        }
                      >
                        <option value="">— Chọn bệnh nhân —</option>
                        {patients.map((p) => {
                          const isSelected = selectedPatients.includes(Number(p.id));
                          const isCurrentStop = Number(s.patientId) === Number(p.id);
                          const isDisabled = isSelected && !isCurrentStop;
                          
                          return (
                            <option
                              key={p.id}
                              value={p.id}
                              disabled={isDisabled}
                            >
                              {p.fullName} ({p.patientCode})
                              {isDisabled && " - Đã được chọn"}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className={`form-label ${styles.formLabel}`}>
                        Loại ngăn <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${styles.formSelect}`}
                        value={s.categoryId}
                        onChange={(e) =>
                          updateStop(idx, "categoryId", e.target.value)
                        }
                      >
                        <option value="">— Chọn loại —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className={`form-label ${styles.formLabel}`}>
                        Ngăn chứa <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${styles.formSelect}`}
                        value={s.compartmentId}
                        disabled={!s.categoryId}
                        onChange={(e) =>
                          updateStop(idx, "compartmentId", e.target.value)
                        }
                      >
                        <option value="">
                          {s.categoryId
                            ? "— Chọn ngăn —"
                            : "Chọn loại ngăn trước"}
                        </option>
                        {(s.filteredCompartments || []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.compartmentCode}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Mô tả vật phẩm và Mã đơn thuốc - chỉ hiển thị khi category là thuốc */}
                  {isMedicineCategory(s.categoryId) && (
                    <div className="row g-3 mt-3">
                      {/* Mô tả vật phẩm - bên trái */}
                      <div className="col-md-6">
                        <label className={`form-label ${styles.formLabel}`}>
                          Mô tả vật phẩm (tùy chọn)
                        </label>
                        <input
                          type="text"
                          className={`form-control ${styles.formControl}`}
                          placeholder="VD: 2 túi dịch truyền..."
                          value={s.itemDesc}
                          onChange={(e) =>
                            updateStop(idx, "itemDesc", e.target.value)
                          }
                        />
                      </div>

                      {/* Mã đơn thuốc - bên phải */}
                      <div className="col-md-6">
                        <label className={`form-label ${styles.formLabel}`}>
                          Mã đơn thuốc <span className="text-danger">*</span>
                        </label>
                        <div className="d-flex gap-2 align-items-start">
                          <input
                            type="text"
                            className={`form-control ${styles.formControl}`}
                            placeholder="Nhập mã đơn thuốc..."
                            value={s.customName}
                            onChange={(e) => {
                              updateStop(idx, "customName", e.target.value);
                              // Tự động bỏ tick khi user sửa text
                              if (s.confirmedCustomName) {
                                updateStop(idx, "confirmedCustomName", false);
                              }
                            }}
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            className={`btn ${
                              s.confirmedCustomName
                                ? "btn-success"
                                : "btn-outline-secondary"
                            }`}
                            onClick={() => {
                              if (s.confirmedCustomName) {
                                handleUnconfirmCustomName(idx);
                              } else {
                                handleConfirmCustomName(idx);
                              }
                            }}
                            disabled={!s.customName || s.customName.trim() === ""}
                            style={{
                              minWidth: "50px",
                              height: "46px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title={
                              s.confirmedCustomName
                                ? "Bỏ xác nhận"
                                : "Xác nhận mã đơn thuốc"
                            }
                          >
                            {s.confirmedCustomName ? (
                              <i className="bi bi-check-circle-fill"></i>
                            ) : (
                              <i className="bi bi-check-circle"></i>
                            )}
                          </button>
                        </div>
                        {s.confirmedCustomName && (
                          <div className="alert alert-success mt-2 mb-0">
                            <i className="bi bi-check-circle me-2"></i>
                            Đã xác nhận mã đơn thuốc: <strong>{s.customName}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mô tả vật phẩm cho trường hợp không phải thuốc */}
                  {!isMedicineCategory(s.categoryId) && (
                    <div className="col-6 mt-3">
                      <label className={`form-label ${styles.formLabel}`}>
                        Mô tả vật phẩm (tùy chọn)
                      </label>
                      <input
                        type="text"
                        className={`form-control ${styles.formControl}`}
                        placeholder="VD: 2 túi dịch truyền..."
                        value={s.itemDesc}
                        onChange={(e) =>
                          updateStop(idx, "itemDesc", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* SUBMIT */}
              <button
                className={`${styles.btnTeal} w-100 mt-4`}
                disabled={!canStart}
                onClick={startMission}
              >
                <i className="bi bi-rocket-takeoff me-2"></i>
                Bắt đầu nhiệm vụ
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* FLOATING ADD STOP BUTTON - Hiển thị khi scroll xuống */}
      {showFloatingAddButton && (
        <button
          className={styles.btnAddStopFloating}
          onClick={addStop}
          disabled={!canAddStop || form.taskStops.length >= MAX_STOPS}
          title={form.taskStops.length >= MAX_STOPS ? `Đã đạt tối đa ${MAX_STOPS} điểm dừng` : "Thêm điểm dừng"}
        >
          <i className="bi bi-plus-circle"></i>
        </button>
      )}

    </div>
    </>
  );
}
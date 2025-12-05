// src/pages/AddTask.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createTask } from "@/services/taskService";
import { getAllMaps } from "@/services/mapService";
import { getAllPatients } from "@/services/patientService";
import { getDestinationsByMap } from "@/services/destinationService";
import {
  getUnlockedCompartments,
  getCompartmentsByRobotAndCategory,
  getAllCategories as getAllCompartmentCategories,
} from "@/services/robotCompartmentService";
import { getAllPrescriptions, approvePrescriptionByCode, updatePrescription } from "@/services/prescriptionServices";
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
    // +3 phút để đảm bảo lớn hơn DateTime.Now.AddMinutes(1) ở backend (giờ Việt Nam)
    // (tránh lỗi do timezone hoặc độ trễ network)
    now.setMinutes(now.getMinutes() + 3);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const HH = String(now.getHours()).padStart(2, "0");
    const MM = String(now.getMinutes()).padStart(2, "0");
    const SS = String(now.getSeconds()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}`;
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
  const [unselectPrescriptionModal, setUnselectPrescriptionModal] = useState({
    show: false,
    prescriptionCode: "",
    prescriptionId: null,
    originalStatus: "",
    stopIndex: -1,
    loading: false,
  });

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
      
      // Nếu category là thuốc → phải chọn đơn thuốc
      if (isMedicineCategory(stop.categoryId) && !stop.prescriptionCode) {
        return false;
      }
    }
    
    return true;
  })();

  // ============================================================
  // PRESCRIPTION STATUS MAP (chuyển status sang tiếng Việt)
  // ============================================================
  const prescriptionStatusMap = {
    pending: "Đang chờ",
    approved: "Đã duyệt",
    dispensed: "Đã phát",
    canceled: "Đã hủy",
  };

  function getPrescriptionStatusText(status) {
    if (!status) return "";
    return prescriptionStatusMap[status.toLowerCase()] || "Không xác định";
  }

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
      const data = await getUnlockedCompartments(robotId);
      setBaseCompartments(data || []);
    } catch (err) {
      console.error("Lỗi tải ngăn chứa mở khóa:", err);
      showToast("error", err.message);
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
          prescriptionPreview: null,
          prescriptionList: [], // Danh sách đơn thuốc để chọn
          prescriptionCode: "", // Mã đơn thuốc đã chọn và xác nhận
          customName: "",
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
  //  - Nếu category là thuốc và đã chọn patient → load prescriptions
  // ============================================================
  async function updateStop(idx, key, value) {
    const clone = [...form.taskStops];
    clone[idx][key] = value;

    if (key === "categoryId") {
      clone[idx].compartmentId = "";
      clone[idx].prescriptionList = [];
      clone[idx].prescriptionCode = "";
      clone[idx].prescriptionPreview = null;

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

          // Nếu category là thuốc và đã chọn patient → load prescriptions
          if (isMedicineCategory(value) && clone[idx].patientId) {
            await loadPrescriptionsForPatient(clone[idx].patientId, idx, clone);
          }
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
  // LOAD PRESCRIPTIONS FOR PATIENT
  //  - Load tất cả (pending, dispensed, approved) trừ canceled
  //  - Lưu originalStatus để có thể restore sau này
  //  - Giữ nguyên originalStatus cũ nếu đã có (không ghi đè khi reload)
  // ============================================================
  async function loadPrescriptionsForPatient(patientId, idx, stopsClone) {
    if (!patientId) return;

    try {
      // Load tất cả prescriptions (không filter status) rồi filter ở frontend
      const allPrescriptions = await getAllPrescriptions({ patientId });
      
      // Lấy danh sách cũ để giữ nguyên originalStatus
      const oldPrescriptionList = stopsClone[idx].prescriptionList || [];
      const oldStatusMap = new Map();
      oldPrescriptionList.forEach((p) => {
        if (p.originalStatus) {
          oldStatusMap.set(p.id, p.originalStatus);
        }
      });
      
      // Lọc ra các đơn không bị canceled và lưu originalStatus
      const validPrescriptions = (allPrescriptions || [])
        .filter((p) => p.status?.toLowerCase() !== "canceled")
        .map((p) => {
          // Nếu đã có originalStatus cũ → giữ nguyên, nếu chưa → lưu status hiện tại
          const savedOriginalStatus = oldStatusMap.get(p.id);
          return {
            ...p,
            originalStatus: savedOriginalStatus || p.status, // Giữ nguyên originalStatus cũ hoặc lưu status hiện tại
          };
        });

      stopsClone[idx].prescriptionList = validPrescriptions;
    } catch (err) {
      console.error("Lỗi tải đơn thuốc:", err);
      stopsClone[idx].prescriptionList = [];
    }
  }

  // ============================================================
  // PATIENT → LOAD PRESCRIPTIONS
  //  - Nếu category là thuốc → load tất cả (pending, dispensed, approved) trừ canceled
  //  - Nếu không phải thuốc → không load đơn thuốc
  // ============================================================
  async function handleSelectPatient(patientId, idx) {
    const stop = form.taskStops[idx];
    updateStop(idx, "patientId", patientId);

    if (!patientId) {
      updateStop(idx, "prescriptionPreview", null);
      updateStop(idx, "prescriptionList", []);
      updateStop(idx, "prescriptionCode", "");
      return;
    }

    // Chỉ load prescriptions nếu category là thuốc
    if (isMedicineCategory(stop.categoryId)) {
      const clone = [...form.taskStops];
      await loadPrescriptionsForPatient(patientId, idx, clone);
      setForm((f) => ({ ...f, taskStops: clone }));
    } else {
      // Không phải thuốc → không load đơn thuốc
      updateStop(idx, "prescriptionPreview", null);
      updateStop(idx, "prescriptionList", []);
      updateStop(idx, "prescriptionCode", "");
    }
  }

  // ============================================================
  // CLICK VÀO MÃ ĐƠN THUỐC
  //  - Nếu chưa chọn → TỰ ĐỘNG APPROVE
  //  - Nếu đã chọn → Hiển thị modal xác nhận bỏ chọn
  // ============================================================
  async function handleSelectPrescription(prescriptionCode, idx) {
    if (!prescriptionCode) {
      updateStop(idx, "prescriptionCode", "");
      updateStop(idx, "prescriptionPreview", null);
      return;
    }

    const stop = form.taskStops[idx];
    
    // Nếu đơn thuốc này đã được chọn → hiển thị modal xác nhận bỏ chọn
    if (stop.prescriptionCode === prescriptionCode) {
      const prescription = stop.prescriptionList.find(
        (p) => p.prescriptionCode === prescriptionCode
      );
      
      if (prescription) {
        setUnselectPrescriptionModal({
          show: true,
          prescriptionCode: prescriptionCode,
          prescriptionId: prescription.id,
          originalStatus: prescription.originalStatus || prescription.status,
          stopIndex: idx,
          loading: false,
        });
      }
      return;
    }

    // Nếu chưa chọn → approve như bình thường
    try {
      // Gọi API approve prescription
      const approved = await approvePrescriptionByCode(prescriptionCode);
      
      // Cập nhật state
      updateStop(idx, "prescriptionCode", prescriptionCode);
      updateStop(idx, "prescriptionPreview", approved);

      // Hiển thị toast thông báo
      showToast("success", `Đã chọn và xác nhận đơn thuốc: ${prescriptionCode}`);

      // Cập nhật lại danh sách prescriptions (status đã đổi thành approved)
      if (stop.patientId) {
        const clone = [...form.taskStops];
        await loadPrescriptionsForPatient(stop.patientId, idx, clone);
        setForm((f) => ({ ...f, taskStops: clone }));
      }
    } catch (err) {
      console.error("Lỗi xác nhận đơn thuốc:", err);
      showToast("error", err.message);
    }
  }

  // ============================================================
  // BỎ CHỌN ĐƠN THUỐC - Trả lại status ban đầu
  // ============================================================
  async function handleUnselectPrescription() {
    const { prescriptionId, originalStatus, stopIndex, prescriptionCode } = unselectPrescriptionModal;

    if (!prescriptionId || !originalStatus) {
      setUnselectPrescriptionModal({ ...unselectPrescriptionModal, show: false });
      return;
    }

    setUnselectPrescriptionModal((prev) => ({ ...prev, loading: true }));

    try {
      // Gọi API update prescription với status ban đầu
      await updatePrescription(prescriptionId, { status: originalStatus });

      // Cập nhật state - bỏ chọn đơn thuốc
      updateStop(stopIndex, "prescriptionCode", "");
      updateStop(stopIndex, "prescriptionPreview", null);

      // Cập nhật lại danh sách prescriptions
      const stop = form.taskStops[stopIndex];
      if (stop.patientId) {
        const clone = [...form.taskStops];
        await loadPrescriptionsForPatient(stop.patientId, stopIndex, clone);
        setForm((f) => ({ ...f, taskStops: clone }));
      }

      showToast("success", `Đã bỏ chọn đơn thuốc: ${prescriptionCode}`);
      setUnselectPrescriptionModal({ show: false, prescriptionCode: "", prescriptionId: null, originalStatus: "", stopIndex: -1, loading: false });
    } catch (err) {
      console.error("Lỗi bỏ chọn đơn thuốc:", err);
      showToast("error", err.message);
      setUnselectPrescriptionModal((prev) => ({ ...prev, loading: false }));
    }
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

      // Nếu category là thuốc → phải chọn đơn thuốc
      if (isMedicineCategory(stop.categoryId) && !stop.prescriptionCode) {
        showToast("warning", `Điểm dừng #${stopNumber}: Vui lòng chọn đơn thuốc.`);
        return;
      }
    }

    // Validate thời gian bắt đầu
    let selected;
    try {
      const now = new Date();
      selected = new Date(form.scheduledStartAt);

      if (selected <= now) {
        showToast("warning", "Thời gian bắt đầu phải lớn hơn thời gian hiện tại.");
        return;
      }
    } catch (err) {
      showToast("error", "Thời gian bắt đầu không hợp lệ.");
      return;
    }

    // Tất cả validation đã pass → tạo task
    try {
      const payload = {
        mapId: Number(form.mapId),
        robotId: Number(form.robotId),
        priority: Number(form.priority),
        scheduledStartAt: selected.toISOString(),

        stops: form.taskStops.map((s) => ({
          seqNo: s.seqNo,
          destinationId: Number(s.destinationId),
          patientId: Number(s.patientId),
          compartmentId: Number(s.compartmentId),
          categoryId: Number(s.categoryId),
          prescriptionCode: s.prescriptionCode || null, // Gửi prescriptionCode nếu có
          customName: s.customName ?? "",
          itemDesc: s.itemDesc ?? "",
        })),
      };

      await createTask(payload);

      // Play sound
      const audio = new Audio(successSound);
      audio.play().catch(() => {});

      showToast("success", "Tạo nhiệm vụ thành công!");

      // RESET FORM & BẬT lại realtime clock
      realtimeEnabled.current = true;

      setForm({
        mapId: "",
        robotId: "",
        priority: 1,
        scheduledStartAt: getMinDateTime(),
        taskStops: [],
      });

      setDestinations([]);
      setBaseCompartments([]);
      setRobots([]);
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
                        {m.mapName}
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
              <div className="text-end mb-4">
                <button
                  className={styles.btnAddStop}
                  onClick={addStop}
                  disabled={!canAddStop}
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

                    <div className="col-md-4">
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

                    <div className="col-md-4">
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

                    <div className="col-md-4">
                      <label className={`form-label ${styles.formLabel}`}>
                        Ghi chú riêng
                      </label>
                      <input
                        type="text"
                        className={`form-control ${styles.formControl}`}
                        placeholder="VD: Giao ngay..."
                        value={s.customName}
                        onChange={(e) =>
                          updateStop(idx, "customName", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* Hiển thị danh sách đơn thuốc nếu category là thuốc */}
                  {isMedicineCategory(s.categoryId) && s.patientId && (
                    <div className="col-12 mt-3">
                      <label className={`form-label ${styles.formLabel}`}>
                        Chọn đơn thuốc <span className="text-danger">*</span>
                      </label>
                      {s.prescriptionList && s.prescriptionList.length > 0 ? (
                        <>
                          <div className="d-flex flex-wrap gap-2 mb-2">
                            {s.prescriptionList.map((pres) => (
                              <button
                                key={pres.id}
                                type="button"
                                className={`btn ${
                                  s.prescriptionCode === pres.prescriptionCode
                                    ? "btn-success"
                                    : "btn-outline-primary"
                                }`}
                                onClick={() => handleSelectPrescription(pres.prescriptionCode, idx)}
                                style={{ borderRadius: "5px" }}
                              >
                                <i className="bi bi-file-medical me-1"></i>
                                {pres.prescriptionCode}
                                {pres.status && (
                                  <span className={`badge ms-2 ${
                                    pres.status === "approved" ? "bg-success" :
                                    pres.status === "pending" ? "bg-warning" :
                                    pres.status === "dispensed" ? "bg-info" : "bg-secondary"
                                  }`}>
                                    {getPrescriptionStatusText(pres.status)}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="alert alert-warning mb-0">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          Bệnh nhân này chưa có đơn thuốc nào (hoặc tất cả đơn đã bị hủy).
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hiển thị chi tiết đơn thuốc đã chọn (nếu có) hidden -- sẽ phát triển sau này */}
                  {s.prescriptionPreview && s.prescriptionCode && (
                    <div className="col-12 mt-3" hidden>
                      <div className={styles.rxBox}>
                        <h6 className={styles.rxTitle}>
                          <i className="bi bi-file-medical"></i>
                          Đơn thuốc: {s.prescriptionPreview.prescriptionCode}
                        </h6>

                        {s.prescriptionPreview.items && s.prescriptionPreview.items.map((item) => (
                          <div key={item.id} className={styles.rxItem}>
                            <div className={styles.rxMedicineName}>
                              {item.medicineName}
                            </div>
                            <div className={styles.rxInfo}>
                              <strong>Số lượng:</strong> {item.quantity}
                            </div>
                            <div className={styles.rxInfo}>
                              <strong>Liều dùng:</strong> {item.dosage}
                            </div>
                            <div className={styles.rxInfo}>
                              <strong>Hướng dẫn:</strong> {item.instructions}
                            </div>
                          </div>
                        ))}

                        <div className="mt-3">
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
                      </div>
                    </div>
                  )}

                  {/* Mô tả vật phẩm cho trường hợp không phải thuốc */}
                  {!isMedicineCategory(s.categoryId) && (
                    <div className="col-12 mt-3">
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
          disabled={!canAddStop}
          title="Thêm điểm dừng"
        >
          <i className="bi bi-plus-circle"></i>
        </button>
      )}

      {/* MODAL XÁC NHẬN BỎ CHỌN ĐƠN THUỐC */}
      {unselectPrescriptionModal.show && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                  Xác nhận bỏ chọn đơn thuốc
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setUnselectPrescriptionModal({ ...unselectPrescriptionModal, show: false })}
                  disabled={unselectPrescriptionModal.loading}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Bạn có chắc chắn muốn bỏ chọn đơn thuốc <strong>{unselectPrescriptionModal.prescriptionCode}</strong>?
                </p>
                <p className="text-muted mb-0">
                  Đơn thuốc sẽ được trả về trạng thái ban đầu: <strong>{getPrescriptionStatusText(unselectPrescriptionModal.originalStatus)}</strong>
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setUnselectPrescriptionModal({ ...unselectPrescriptionModal, show: false })}
                  disabled={unselectPrescriptionModal.loading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleUnselectPrescription}
                  disabled={unselectPrescriptionModal.loading}
                >
                  {unselectPrescriptionModal.loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-x-circle me-2"></i>
                      Xác nhận bỏ chọn
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
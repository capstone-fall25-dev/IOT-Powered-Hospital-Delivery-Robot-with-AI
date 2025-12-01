// src/pages/AddTask.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { createTask } from "@/services/taskService";
import { getAllMaps } from "@/services/mapService";
import { getPatientsWithApprovedPrescription } from "@/services/patientService";
import { getDestinationsByMap } from "@/services/destinationService";
import {
  getUnlockedCompartments,
  getCompartmentsByRobotAndCategory,
  getAllCategories as getAllCompartmentCategories,
} from "@/services/robotCompartmentService";
import { getAllPrescriptions } from "@/services/prescriptionServices";
import { getRobotsByMap } from "@/services/robotService";

import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import styles from "@/assets/styles/taskForm.module.css";
import successSound from "@/sounds/success.mp3";

export default function AddTask() {
  const navigate = useNavigate();

  // ============================================================
  // DATETIME HELPERS
  // ============================================================
  function getMinDateTime() {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // +1 phút
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

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [baseCompartments, setBaseCompartments] = useState([]);

  const canAddStop = form.robotId;
  const canStart = form.robotId && form.taskStops.length > 0;

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
        setMessage(`📡 Nhiệm vụ mới được tạo #${task.id}`);
        setMessageType("info");
      }
    });

    conn.on("ConnectedToTaskHub", (m) => {
      console.log("🔗 Server confirmed:", m);
    });

    conn.onreconnecting(() => console.log("🔄 SignalR đang kết nối lại..."));
    conn.onreconnected(() => console.log("✅ SignalR đã kết nối lại"));
    conn.onclose(() => console.log("🔌 SignalR đã ngắt kết nối"));

    connectionRef.current = conn;

    const startConnection = async () => {
      if (!isMounted) return;
      try {
        await conn.start();
        if (isMounted) console.log("✅ SignalR Connected");
      } catch (err) {
        console.error("❌ SignalR Connect Error:", err);
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
          .then(() => console.log("🔌 SignalR stopped gracefully"))
          .catch((err) => console.error("⚠️ Error stopping SignalR:", err));
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
          // CHỈ lấy bệnh nhân có đơn thuốc được duyệt
          getPatientsWithApprovedPrescription(),
          // Danh mục loại ngăn của robot
          getAllCompartmentCategories(),
        ]);

        setMaps(mapsRes || []);
        setPatients(patientsRes || []);
        setCategories(categoriesRes || []);
      } catch (err) {
        console.error("Load init data error:", err);
        setMessage("Không thể tải dữ liệu khởi tạo.");
        setMessageType("error");
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
      console.error("Error when select map:", err);
      setMessage("Không thể tải điểm đến / robot cho bản đồ này.");
      setMessageType("error");
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
      console.error("Error load unlocked compartments:", err);
      setMessage("Không thể tải danh sách ngăn chứa của robot.");
      setMessageType("error");
    }
  }

  // ============================================================
  // SELECTED COMPARTMENTS (prevent duplicates)
  // ============================================================
  const selectedCompartments = form.taskStops
    .map((s) => Number(s.compartmentId))
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
  // UPDATE STOP
  //  - Đặc biệt xử lý khi đổi Category → lọc compartment theo robot+category
  // ============================================================
  async function updateStop(idx, key, value) {
    const clone = [...form.taskStops];
    clone[idx][key] = value;

    if (key === "categoryId") {
      clone[idx].compartmentId = "";

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
          console.error("Error load compartments by category:", err);
          clone[idx].filteredCompartments = [];
        }
      } else {
        clone[idx].filteredCompartments = [];
      }
    }

    setForm((f) => ({ ...f, taskStops: clone }));
  }

  // ============================================================
  // PATIENT → LOAD LAST APPROVED PRESCRIPTION (preview)
  // back-end vẫn kiểm tra lại nên FE chỉ hỗ trợ hiển thị
  // ============================================================
  async function handleSelectPatient(patientId, idx) {
    updateStop(idx, "patientId", patientId);

    if (!patientId) {
      updateStop(idx, "prescriptionPreview", null);
      return;
    }

    try {
      const list = await getAllPrescriptions({
        patientId,
        status: "approved",
      });

      if (!list || list.length === 0) {
        updateStop(idx, "prescriptionPreview", null);
        return;
      }

      const latest = list.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )[0];

      updateStop(idx, "prescriptionPreview", latest);
    } catch (err) {
      console.error("Error load prescriptions:", err);
      updateStop(idx, "prescriptionPreview", null);
    }
  }

  // ============================================================
  // SUBMIT
  //  - Validate thời gian bắt đầu PHẢI LÀ TƯƠNG LAI
  // ============================================================
  async function startMission() {
    try {
      const now = new Date();
      const selected = new Date(form.scheduledStartAt);

      // BẮT BUỘC phải lớn hơn hiện tại
      if (selected <= now) {
        setMessage("⏰ Thời gian bắt đầu phải lớn hơn thời gian hiện tại.");
        setMessageType("error");
        return;
      }

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
          customName: s.customName ?? "",
          itemDesc: s.itemDesc ?? "",
        })),
      };

      await createTask(payload);

      // Play sound
      const audio = new Audio(successSound);
      audio.play().catch(() => {});

      setMessage("🎉 Tạo nhiệm vụ thành công!");
      setMessageType("success");

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
      console.error("Create task error:", err);
      setMessage(`❌ Lỗi: ${err.message || "Không thể tạo nhiệm vụ"}`);
      setMessageType("error");
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
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
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} ({p.patientCode})
                          </option>
                        ))}
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

                  {s.prescriptionPreview && (
                    <div className={styles.rxBox}>
                      <h6 className={styles.rxTitle}>
                        <i className="bi bi-file-medical"></i>
                        Đơn thuốc: {s.prescriptionPreview.prescriptionCode}
                      </h6>

                      {s.prescriptionPreview.items.map((item) => (
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

              {message && (
                <div
                  className={`${styles.message} ${
                    messageType === "success"
                      ? styles.messageSuccess
                      : messageType === "error"
                      ? styles.messageError
                      : ""
                  }`}
                >
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
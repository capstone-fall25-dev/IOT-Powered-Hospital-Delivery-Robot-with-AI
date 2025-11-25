import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createTask } from "@/services/taskService";
import { getAllMaps, getMapById } from "@/services/mapService";
import { getAllPatients } from "@/services/patientService";
import {
    getUnlockedCompartments,
    getCompartmentsByRobotAndCategory,
    getAllCategories,
} from "@/services/robotCompartmentService";
import { getAllPrescriptions } from "@/services/prescriptionServices";
import { getAvailableRobots } from "@/services/robotService";
import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "@/utils/apiConfig";
import styles from "@/assets/styles/taskForm.module.css";

export default function AddTask() {
    const navigate = useNavigate();

    // ============================================================
    // DATETIME HELPERS
    // ============================================================
    function getMinDateTime() {
        const now = new Date();

        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const HH = String(now.getHours()).padStart(2, "0");
        const MM = String(now.getMinutes()).padStart(2, "0");
        const SS = String(now.getSeconds()).padStart(2, "0");

        return `${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}`;
    }

    const realtimeEnabled = useRef(true);
    const connectionRef = useRef(null); // Lưu connection để tránh tạo nhiều lần

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
        priority: 1,
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
        let isMounted = true; // Track component mounted state
        
        // Nếu đã có connection, không tạo mới
        if (connectionRef.current) return;

        const conn = new signalR.HubConnectionBuilder()
            .withUrl(API_CONFIG.API_BASE1 + "/hubs/task", {
                transport: signalR.HttpTransportType.WebSockets,
                skipNegotiation: true,
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        // Register event handlers BEFORE starting connection
        conn.on("TaskCreated", (task) => {
            if (isMounted) {
                setMessage(`📡 Nhiệm vụ mới được tạo #${task.id}`);
                setMessageType("info");
            }
        });

        // Handle server's connection confirmation event
        conn.on("ConnectedToTaskHub", (message) => {
            console.log("🔗 Server confirmed:", message);
        });

        conn.onreconnecting(() => {
            console.log("🔄 SignalR đang kết nối lại...");
        });

        conn.onreconnected(() => {
            console.log("✅ SignalR đã kết nối lại");
        });

        conn.onclose(() => {
            console.log("🔌 SignalR đã ngắt kết nối");
        });

        connectionRef.current = conn;

        // Start connection
        const startConnection = async () => {
            if (!isMounted) return; // Don't start if unmounted

            try {
                await conn.start();
                if (isMounted) {
                    console.log("✅ SignalR Connected");
                }
            } catch (err) {
                console.error("❌ SignalR Connect Error:", err);
                // Retry sau 5 giây nếu component vẫn mounted
                if (isMounted) {
                    setTimeout(startConnection, 5000);
                }
            }
        };

        startConnection();

        // Cleanup
        return () => {
            isMounted = false; // Mark as unmounted
            
            if (connectionRef.current) {
                connectionRef.current.stop()
                    .then(() => console.log("🔌 SignalR stopped gracefully"))
                    .catch(err => console.error("⚠️ Error stopping SignalR:", err));
                connectionRef.current = null;
            }
        };
    }, []); // Empty dependency array - chỉ chạy 1 lần

    // ============================================================
    // LOAD DATA
    // ============================================================
    useEffect(() => {
        async function load() {
            setMaps(await getAllMaps());
            setPatients(await getAllPatients());
            const robotsRes = await getAvailableRobots();
             setRobots(robotsRes.data); 
            setCategories(await getAllCategories());
        }
        load();
    }, []);

    // ============================================================
    // REALTIME CLOCK (update mỗi 1 giây)
    // ============================================================
    useEffect(() => {
        const interval = setInterval(() => {
            if (!realtimeEnabled.current) return; // user đã chỉnh tay → không realtime nữa

            setForm((f) => ({
                ...f,
                scheduledStartAt: getMinDateTime(),
            }));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // ============================================================
    // MAP SELECTION
    // ============================================================
    async function handleSelectMap(mapId) {
        setForm((f) => ({ ...f, mapId }));

        if (!mapId) return setDestinations([]);

        const mapDetail = await getMapById(mapId);
        setDestinations(
            mapDetail.destinations ||
            mapDetail.destinasions ||
            mapDetail.Destinations ||
            []
        );
    }

    // ============================================================
    // ROBOT SELECTION
    // ============================================================
    async function handleSelectRobot(robotId) {
        setForm((f) => ({
            ...f,
            robotId,
            taskStops: [],
        }));

        if (!robotId) return setBaseCompartments([]);

        const data = await getUnlockedCompartments(robotId);
        setBaseCompartments(data);
    }

    // ============================================================
    // SELECTED COMPARTMENTS (prevent duplicates)
    // ============================================================
    const selectedCompartments = form.taskStops
        .map(s => Number(s.compartmentId))
        .filter(id => id > 0);

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
    // ============================================================
    async function updateStop(idx, key, value) {
        const clone = [...form.taskStops];
        clone[idx][key] = value;

        if (key === "categoryId") {
            clone[idx].compartmentId = "";

            if (value) {
                let comps = await getCompartmentsByRobotAndCategory(
                    form.robotId,
                    value
                );

                comps = comps.filter(c => !selectedCompartments.includes(c.id));

                clone[idx].filteredCompartments = comps;
            } else {
                clone[idx].filteredCompartments = [];
            }
        }

        setForm((f) => ({ ...f, taskStops: clone }));
    }

    // ============================================================
    // PATIENT → LOAD LAST PRESCRIPTION
    // ============================================================
    async function handleSelectPatient(patientId, idx) {
        updateStop(idx, "patientId", patientId);

        if (!patientId) return updateStop(idx, "prescriptionPreview", null);

        const list = await getAllPrescriptions(patientId, "approved");

        if (list.length === 0) return updateStop(idx, "prescriptionPreview", null);

        const latest = list.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )[0];

        updateStop(idx, "prescriptionPreview", latest);
    }

    // ============================================================
    // SUBMIT
    // ============================================================
    async function startMission() {
        try {
            const now = new Date();
            const selected = new Date(form.scheduledStartAt);

            // Nếu thời gian đã trễ → tự cập nhật
            if (selected < now) {
                const newTime = getMinDateTime();
                realtimeEnabled.current = true;

                setForm(f => ({
                    ...f,
                    scheduledStartAt: newTime,
                }));

                form.scheduledStartAt = newTime;
            }

            const payload = {
                mapId: Number(form.mapId),
                robotId: Number(form.robotId),
                priority: Number(form.priority),
                scheduledStartAt: new Date(form.scheduledStartAt).toISOString(),

                stops: form.taskStops.map(s => ({
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

            setMessage("🎉 Tạo nhiệm vụ thành công!");
            setMessageType("success");

            // RESET FORM và bật lại realtime
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

        } catch (err) {
            setMessage(`❌ Lỗi: ${err.response?.data || err.message}`);
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
                                <h4 className={`${styles.pageTitle} mb-0`}>Tạo nhiệm vụ mới</h4>
                            </div>

                            <button 
                                className="btn btn-outline-secondary"
                                style={{ borderRadius: '5px', padding: '0.5rem 1.2rem' }}
                                onClick={() => navigate("/dashboard")}
                            >
                                <i className="bi bi-arrow-left me-1"></i>
                                Quay lại
                            </button>
                        </div>

                        {/* FORM */}
                        <div className={`${styles.glass} p-4 p-md-5`}>

                            {/* MAP + ROBOT */}
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
                                                #{m.id} • {m.mapName}
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
                                    >
                                        <option value="">— Chọn robot —</option>
                                        {robots.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                #{r.id} • {r.name} 🔋 {r.batteryPercent}%
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* REALTIME DATETIME */}
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
                                            realtimeEnabled.current = false; // chỉ tắt realtime khi người dùng thay đổi giá trị
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
                                        <div className={styles.stopTitle}>Điểm dừng #{s.seqNo}</div>
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
                                                        {p.fullName}
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

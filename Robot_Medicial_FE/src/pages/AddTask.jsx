// ===================== IMPORTS =====================
import { useEffect, useState } from "react";
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
import styles from "../assets/styles/addTask.module.css";

export default function AddTask() {
    // ===================== STATE =====================
    const [maps, setMaps] = useState([]);
    const [robots, setRobots] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [patients, setPatients] = useState([]);
    const [categories, setCategories] = useState([]);

    const [form, setForm] = useState({
        mapId: "",
        robotId: "",
        priority: 1,
        scheduledStartAt: new Date().toISOString().slice(0, 16),
        taskStops: [],
    });

    const [message, setMessage] = useState("");
    const [baseCompartments, setBaseCompartments] = useState([]);

    const canAddStop = form.robotId;
    const canStart = form.robotId && form.taskStops.length > 0;

    // ===================== SIGNALR =====================
    useEffect(() => {
        const conn = new signalR.HubConnectionBuilder()
            .withUrl("http://localhost:5170/hubs/task", {
                transport: signalR.HttpTransportType.WebSockets,
                skipNegotiation: true,
            })
            .withAutomaticReconnect()
            .build();

        conn.start()
            .then(() => console.log("SignalR Connected"))
            .catch((err) => console.error("SignalR Connect Error:", err));

        conn.on("TaskCreated", (task) => {
            setMessage(`📡 Nhiệm vụ mới được tạo #${task.id}`);
        });

        return () => conn.stop();
    }, []);

    // ===================== LOAD DATA =====================
    useEffect(() => {
        async function load() {
            setMaps(await getAllMaps());
            setPatients(await getAllPatients());
            setRobots(await getAvailableRobots());
            setCategories(await getAllCategories());
        }
        load();
    }, []);

    // ===================== MAP SELECT =====================
    async function handleSelectMap(mapId) {
        setForm((f) => ({ ...f, mapId }));

        if (!mapId) {
            setDestinations([]);
            return;
        }

        const mapDetail = await getMapById(mapId);
        setDestinations(
            mapDetail.destinations ||
            mapDetail.destinasions ||
            mapDetail.Destinations ||
            []
        );
    }

    // ===================== ROBOT SELECT =====================
    async function handleSelectRobot(robotId) {
        setForm((f) => ({
            ...f,
            robotId,
            taskStops: [], // reset stop khi đổi robot
        }));

        if (!robotId) {
            setBaseCompartments([]);
            return;
        }

        // lấy tất cả compartment unlocked của robot
        const data = await getUnlockedCompartments(robotId);
        setBaseCompartments(data);
    }

    // ===================== STOP HANDLERS =====================
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
                    prescriptionPreview: null,
                    customName: "",
                    itemDesc: "" 
                },
            ],
        }));
    }

    function removeStop(idx) {
        setForm((f) => ({
            ...f,
            taskStops: f.taskStops.filter((_, i) => i !== idx),
        }));
    }

    async function updateStop(idx, key, value) {
        const clone = [...form.taskStops];
        clone[idx][key] = value;

        // Nếu đổi category → load lại compartment theo API
        if (key === "categoryId") {
            clone[idx].compartmentId = "";

            if (value) {
                const comps = await getCompartmentsByRobotAndCategory(
                    form.robotId,
                    value
                );
                clone[idx].filteredCompartments = comps;
            } else {
                clone[idx].filteredCompartments = [];
            }
        }

        setForm((f) => ({ ...f, taskStops: clone }));
    }

    // ===================== PRESCRIPTION PREVIEW =====================
    async function handleSelectPatient(patientId, idx) {
        updateStop(idx, "patientId", patientId);

        if (!patientId) {
            updateStop(idx, "prescriptionPreview", null);
            return;
        }

        const list = await getAllPrescriptions(patientId, "approved");

        if (list.length === 0) {
            updateStop(idx, "prescriptionPreview", null);
            return;
        }

        const latest = list.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )[0];

        updateStop(idx, "prescriptionPreview", latest);
    }

    // ===================== SUBMIT =====================
    async function startMission() {
        try {
            const payload = {
                mapId: Number(form.mapId),
                robotId: Number(form.robotId),
                priority: Number(form.priority),
                scheduledStartAt: new Date(form.scheduledStartAt).toISOString(),
                stops: form.taskStops.map((s) => ({
                    seqNo: s.seqNo,
                    destinationId: Number(s.destinationId),
                    patientId: Number(s.patientId),
                    compartmentId: Number(s.compartmentId),
                    categoryId: Number(s.categoryId),
                    customName: s.customName ?? "",
                    itemDesc: s.itemDesc ?? "" 
                })),
            };

            await createTask(payload);
            setMessage("🎉 Tạo nhiệm vụ thành công!");
            setForm((f) => ({ ...f, taskStops: [] }));
        } catch (err) {
            setMessage(`❌ Lỗi: ${err.response?.data || err.message}`);
        }
    }

    // ===================== RENDER =====================
    return (
        <div className={styles.page}>
            <div className="container-lg py-4">
                <h4 className={`${styles.title} mb-3`}>Tạo nhiệm vụ mới</h4>

                <div className={`${styles.glass} p-4`}>

                    {/* MAP + ROBOT */}
                    <div className="row mb-3">
                        <div className="col-md-6 mb-3">
                            <label className={`${styles.sectionLabel} form-label`}>Chọn map</label>
                            <select
                                className="form-select"
                                value={form.mapId}
                                onChange={(e) => handleSelectMap(e.target.value)}
                            >
                                <option value="">— chọn map —</option>
                                {maps.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.id} • {m.mapName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className={`${styles.sectionLabel} form-label`}>Chọn robot</label>
                            <select
                                className="form-select"
                                value={form.robotId}
                                onChange={(e) => handleSelectRobot(e.target.value)}
                            >
                                <option value="">— chọn robot —</option>
                                {robots.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.id} • {r.name} (Pin {r.batteryPercent}%)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* PRIORITY + TIME */}
                    <div className="row mb-3">
                        <div className="col-md-6 mb-3">
                            <label className={`${styles.sectionLabel} form-label`}>Độ ưu tiên</label>
                            <select
                                className="form-select"
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

                        <div className="col-md-6 mb-3">
                            <label className={`${styles.sectionLabel} form-label`}>Thời gian bắt đầu</label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                value={form.scheduledStartAt}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        scheduledStartAt: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <div className="text-end mb-3">
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={addStop}
                            disabled={!canAddStop}
                        >
                            + Thêm điểm dừng
                        </button>
                    </div>

                    {/* STOP LIST */}
                    {form.taskStops.map((s, idx) => (
                        <div className={`${styles.stopCard} mb-3`} key={idx}>
                            <button
                                className={styles.btnCloseCircle}
                                onClick={() => removeStop(idx)}
                            >
                                ×
                            </button>

                            <div className="row g-3">

                                {/* ORDER */}
                                <div className="col-md-2">
                                    <label className={`${styles.sectionLabel} form-label`}>Thứ tự</label>
                                    <input className="form-control" value={s.seqNo} disabled />
                                </div>

                                {/* DEST */}
                                <div className="col-md-5">
                                    <label className={`${styles.sectionLabel} form-label`}>Điểm đến</label>
                                    <select
                                        className="form-select"
                                        value={s.destinationId}
                                        onChange={(e) =>
                                            updateStop(idx, "destinationId", e.target.value)
                                        }
                                    >
                                        <option value="">— chọn điểm đến —</option>
                                        {destinations.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* PATIENT */}
                                <div className="col-md-5">
                                    <label className={`${styles.sectionLabel} form-label`}>Bệnh nhân</label>
                                    <select
                                        className="form-select"
                                        value={s.patientId}
                                        onChange={(e) =>
                                            handleSelectPatient(e.target.value, idx)
                                        }
                                    >
                                        <option value="">— chọn bệnh nhân —</option>
                                        {patients.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.fullName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* CATEGORY */}
                                <div className="col-md-4">
                                    <label className={`${styles.sectionLabel} form-label`}>Loại ngăn</label>
                                    <select
                                        className="form-select"
                                        value={s.categoryId}
                                        onChange={(e) =>
                                            updateStop(idx, "categoryId", e.target.value)
                                        }
                                    >
                                        <option value="">— chọn loại —</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* COMPARTMENT — disable until category selected */}
                                <div className="col-md-4">
                                    <label className={`${styles.sectionLabel} form-label`}>Ngăn chứa</label>
                                    <select
                                        className="form-select"
                                        value={s.compartmentId}
                                        disabled={!s.categoryId}
                                        onChange={(e) =>
                                            updateStop(idx, "compartmentId", e.target.value)
                                        }
                                    >
                                        <option value="">
                                            {s.categoryId
                                                ? "— chọn ngăn —"
                                                : "Chọn loại ngăn trước —"}
                                        </option>

                                        {(s.filteredCompartments || []).map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.compartmentCode}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* CUSTOM TEXT */}
                                <div className="col-md-4">
                                    <label className={`${styles.sectionLabel} form-label`}>Ghi chú riêng</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="VD: Giao ngay – bệnh nhân..."
                                        value={s.customName}
                                        onChange={(e) =>
                                            updateStop(idx, "customName", e.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            {/* PRESCRIPTION */}
                            {s.prescriptionPreview && (
                                <div className={`${styles.rxBox} mt-3`}>
                                    <h6 className="fw-bold">
                                        📄 Đơn thuốc: {s.prescriptionPreview.prescriptionCode}
                                    </h6>

                                    {s.prescriptionPreview.items.map((item) => (
                                        <div key={item.id} className="mb-2">
                                            <b>{item.medicineName}</b>
                                            <div>Số lượng: {item.quantity}</div>
                                            <div>Liều dùng: {item.dosage}</div>
                                            <div>Hướng dẫn: {item.instructions}</div>
                                            <hr />
                                        </div>
                                    ))}

                                    {/* 👇 NEW: ItemDesc input placed in prescription box */}
                                    <div className="mt-3">
                                        <label className={`${styles.sectionLabel} form-label`}>Mô tả vật phẩm (tùy chọn)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="VD: 2 túi dịch truyền + 1 ống tiêm..."
                                            value={s.itemDesc}
                                            onChange={(e) => updateStop(idx, "itemDesc", e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    <button
                        className={`btn ${styles.btnTeal} w-100 mt-3 py-2`}
                        disabled={!canStart}
                        onClick={startMission}
                    >
                        Bắt đầu nhiệm vụ
                    </button>

                    {message && (
                        <div className="mt-3 text-center fw-bold">{message}</div>
                    )}
                </div>
            </div>
        </div>
    );
}